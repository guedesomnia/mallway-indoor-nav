import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, type MallSummary } from '../api/admin';
import { ApiError } from '../api/http';
import type { BuildingMap } from '../types/map';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error';

export interface CatalogEntry {
  map: BuildingMap;
  rev: number;
  liveVersion: number | null;
  updatedBy: string | null;
}

export interface ConflictInfo {
  updatedBy: string | null;
  message: string;
}

const AUTOSAVE_MS = 1500;
const RETRY_MS = 6000;

/**
 * Catálogo de rascunhos do admin. O servidor é a fonte da verdade; cada salvamento envia a revisão que este
 * navegador viu (baseRev). Se outra pessoa salvou antes, o servidor responde 409 e NADA é sobrescrito:
 * o estado vira 'conflict' e o usuário decide entre recarregar ou baixar a própria cópia.
 *
 * `entriesRef` é a fonte da verdade síncrona (usada pelo autosave); `entries` apenas espelha para renderização.
 */
export function useAdminCatalog(enabled: boolean) {
  const [summaries, setSummaries] = useState<MallSummary[]>([]);
  const [entries, setEntries] = useState<Record<string, CatalogEntry>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const entriesRef = useRef<Record<string, CatalogEntry>>({});
  const dirtyIds = useRef(new Set<string>());
  const conflictIds = useRef(new Set<string>());
  const savingRef = useRef(false);
  const failedRef = useRef(false);
  const timer = useRef<number | null>(null);

  const commit = useCallback((next: Record<string, CatalogEntry>) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await adminApi.listMalls();
      const drafts = await Promise.all(list.map((m) => adminApi.getDraft(m.id)));
      const next: Record<string, CatalogEntry> = {};
      list.forEach((m, i) => {
        next[m.id] = { map: drafts[i].map, rev: drafts[i].rev, liveVersion: drafts[i].liveVersion, updatedBy: drafts[i].updatedBy };
      });
      if (timer.current) window.clearTimeout(timer.current);
      dirtyIds.current.clear();
      conflictIds.current.clear();
      failedRef.current = false;
      commit(next);
      setSummaries(list);
      setConflict(null);
      setSaveError(null);
      setSaveState('idle');
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Não foi possível carregar os shoppings.');
    } finally {
      setLoading(false);
    }
  }, [commit]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const schedule = useCallback((delay: number, run: () => void) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(run, delay);
  }, []);

  const flush = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    let retry = false;
    try {
      for (const id of [...dirtyIds.current]) {
        if (conflictIds.current.has(id)) continue;
        const entry = entriesRef.current[id];
        if (!entry) {
          dirtyIds.current.delete(id);
          continue;
        }
        const sentMap = entry.map;
        try {
          const res = await adminApi.saveDraft(id, entry.rev, sentMap);
          const current = entriesRef.current[id];
          if (current) commit({ ...entriesRef.current, [id]: { ...current, rev: res.rev } });
          // Só considera salvo se ninguém editou durante o envio.
          if (entriesRef.current[id]?.map === sentMap) dirtyIds.current.delete(id);
          failedRef.current = false;
        } catch (e) {
          if (e instanceof ApiError && e.status === 409 && e.code === 'DRAFT_CONFLICT') {
            conflictIds.current.add(id);
            setConflict({ updatedBy: (e.detail.updatedBy as string | null) ?? null, message: e.message });
            setSaveState('conflict');
            return;
          }
          failedRef.current = true;
          retry = true;
          setSaveError(e instanceof ApiError ? e.message : 'Falha ao salvar.');
          setSaveState('error');
          return;
        }
      }
      setSaveError(null);
      setSaveState(dirtyIds.current.size ? 'dirty' : 'saved');
    } finally {
      savingRef.current = false;
      if (dirtyIds.current.size && conflictIds.current.size === 0) {
        schedule(retry ? RETRY_MS : AUTOSAVE_MS, () => void flush());
      }
    }
  }, [commit, schedule]);

  const updateMap = useCallback(
    (map: BuildingMap) => {
      const current = entriesRef.current[map.id];
      if (!current) return;
      commit({ ...entriesRef.current, [map.id]: { ...current, map } });
      dirtyIds.current.add(map.id);
      if (conflictIds.current.size === 0) setSaveState('dirty');
      schedule(AUTOSAVE_MS, () => void flush());
    },
    [commit, flush, schedule],
  );

  /** Garante que tudo o que está na tela já está no servidor (usado antes de validar/publicar). */
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timer.current) window.clearTimeout(timer.current);
    while (savingRef.current) await new Promise((r) => setTimeout(r, 50));
    if (dirtyIds.current.size) await flush();
    return dirtyIds.current.size === 0 && conflictIds.current.size === 0;
  }, [flush]);

  const getRev = useCallback((id: string) => entriesRef.current[id]?.rev ?? 0, []);

  const refreshSummaries = useCallback(async () => {
    setSummaries(await adminApi.listMalls());
  }, []);

  const addMall = useCallback(
    (summary: MallSummary, entry: CatalogEntry) => {
      setSummaries((prev) => [...prev, summary].sort((a, b) => a.name.localeCompare(b.name)));
      commit({ ...entriesRef.current, [summary.id]: entry });
    },
    [commit],
  );

  const setLiveVersion = useCallback(
    (id: string, liveVersion: number | null) => {
      const current = entriesRef.current[id];
      if (current) commit({ ...entriesRef.current, [id]: { ...current, liveVersion } });
    },
    [commit],
  );

  // Impede fechar a aba com alterações ainda não gravadas.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirtyIds.current.size || savingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return {
    summaries,
    entries,
    loading,
    loadError,
    saveState,
    saveError,
    conflict,
    maps: Object.values(entries).map((e) => e.map),
    load,
    updateMap,
    saveNow,
    getRev,
    refreshSummaries,
    addMall,
    setLiveVersion,
  };
}
