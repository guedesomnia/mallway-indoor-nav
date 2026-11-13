import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, History, Loader2, Rocket, Ruler, X, XCircle } from 'lucide-react';
import { adminApi, type Issue, type ValidationReport, type VersionRow } from '../api/admin';
import { ApiError } from '../api/http';
import type { BuildingMap, FloorLevel } from '../types/map';
import { calibrateFloor, computeScale, pixelDistance } from '../utils/calibration';

interface PublishPanelProps {
  mall: BuildingMap;
  saveNow: () => Promise<boolean>;
  getRev: (id: string) => number;
  onMapChange: (map: BuildingMap) => void;
  onLiveVersionChange: (version: number) => void;
  onClose: () => void;
}

function ScaleCalibration({ floor, map, onApply }: { floor: FloorLevel; map: BuildingMap; onApply: (mpp: number) => void }) {
  const nodes = map.nodes.filter((n) => n.floorId === floor.id);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [meters, setMeters] = useState('');
  const a = nodes.find((n) => n.id === aId);
  const b = nodes.find((n) => n.id === bId);
  const check = computeScale(a, b, Number(meters.replace(',', '.')));
  const label = (id: string, text: string | undefined) => `${text || id}`;

  return (
    <div className="mt-2 rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
      <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
        <Ruler size={13} className="text-emerald-400" />
        Calibrar escala de <strong>{floor.name}</strong>: escolha dois pontos do mapa cuja distância real você conhece (planta cotada ou trena).
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[['A', aId, setAId], ['B', bId, setBId]].map(([name, value, setter]) => (
          <select
            key={name as string}
            value={value as string}
            onChange={(e) => (setter as (v: string) => void)(e.target.value)}
            aria-label={`Ponto ${name as string}`}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-white"
          >
            <option value="">Ponto {name as string}…</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>{label(n.id, n.label)}</option>
            ))}
          </select>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={meters}
          onChange={(e) => setMeters(e.target.value)}
          placeholder="Distância real (m)"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-white"
        />
        <button
          disabled={!check.ok}
          onClick={() => check.ok && onApply(check.metersPerPixel)}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-bold"
        >
          Aplicar escala
        </button>
      </div>
      {a && b && (
        <p className="text-[10px] text-slate-500">
          Distância no mapa: {Math.round(pixelDistance(a, b))} px
          {check.ok ? ` → ${check.metersPerPixel.toFixed(4)} m/px` : ''}
        </p>
      )}
      {!check.ok && meters && a && b && <p className="text-[11px] text-amber-300">{check.reason}</p>}
    </div>
  );
}

function IssueList({ issues, tone }: { issues: Issue[]; tone: 'error' | 'warning' }) {
  if (!issues.length) return null;
  const Icon = tone === 'error' ? XCircle : AlertTriangle;
  const color = tone === 'error' ? 'text-red-300 border-red-800/60 bg-red-950/40' : 'text-amber-200 border-amber-800/50 bg-amber-950/30';
  return (
    <ul className="space-y-1.5">
      {issues.map((i, idx) => (
        <li key={`${i.code}-${idx}`} className={`flex gap-2 text-[11px] leading-snug border rounded-lg px-2.5 py-2 ${color}`}>
          <Icon size={14} className="shrink-0 mt-0.5" />
          <span>{i.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function PublishPanel({ mall, saveNow, getRev, onMapChange, onLiveVersionChange, onClose }: PublishPanelProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [busy, setBusy] = useState<'validating' | 'publishing' | 'rollback' | null>('validating');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const revalidate = useCallback(async () => {
    setBusy('validating');
    setError(null);
    try {
      if (!(await saveNow())) {
        setError('O rascunho ainda não foi salvo (conflito com outra pessoa ou falha de conexão). Resolva isso antes de publicar.');
        return;
      }
      setReport(await adminApi.validate(mall.id));
      setVersions(await adminApi.versions(mall.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível validar o mapa.');
    } finally {
      setBusy(null);
    }
  }, [mall.id, saveNow]);

  useEffect(() => {
    void revalidate();
    // roda uma vez ao abrir; revalidações seguintes são manuais
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = async () => {
    setBusy('publishing');
    setError(null);
    try {
      const res = await adminApi.publish(mall.id, getRev(mall.id), note.trim() || undefined);
      setDone(res.version);
      onLiveVersionChange(res.version);
      setVersions(await adminApi.versions(mall.id));
      setNote('');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION_FAILED') setReport(e.detail.report as ValidationReport);
      setError(e instanceof ApiError ? e.message : 'Falha ao publicar.');
    } finally {
      setBusy(null);
    }
  };

  const rollback = async (v: VersionRow) => {
    if (!confirm(`Voltar o app dos entregadores para a versão ${v.version}? A versão atual deixa de ser a ativa (continua no histórico).`)) return;
    setBusy('rollback');
    setError(null);
    try {
      const res = await adminApi.rollback(mall.id, v.version);
      onLiveVersionChange(res.liveVersion);
      setVersions(await adminApi.versions(mall.id));
      setDone(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao voltar a versão.');
    } finally {
      setBusy(null);
    }
  };

  const uncalibrated = (report?.errors ?? []).filter((e) => e.code === 'FLOOR_SCALE_UNCALIBRATED' && e.ref?.type === 'floor');
  const otherErrors = (report?.errors ?? []).filter((e) => e.code !== 'FLOOR_SCALE_UNCALIBRATED');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div role="dialog" aria-label="Publicar mapa" className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 space-y-4 text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-black text-base flex items-center gap-2"><Rocket size={18} className="text-emerald-400" /> Publicar {mall.name}</h2>
            <p className="text-xs text-slate-400">O app dos entregadores só enxerga o mapa depois de publicado e validado.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400"><X size={18} /></button>
        </div>

        {busy === 'validating' && (
          <p className="text-xs text-slate-300 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Salvando e simulando todas as rotas…</p>
        )}
        {error && <p role="alert" className="text-xs text-red-200 bg-red-950/50 border border-red-800/60 rounded-xl px-3 py-2">{error}</p>}
        {done !== null && (
          <p role="status" className="text-xs text-emerald-200 bg-emerald-950/50 border border-emerald-700/60 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle2 size={14} /> Versão {done} publicada. Os entregadores já recebem este mapa.
          </p>
        )}

        {report && (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-sm font-bold ${report.ok ? 'text-emerald-300' : 'text-red-300'}`}>
              {report.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {report.ok ? 'Pronto para publicar' : `${report.errors.length} problema(s) impedem a publicação`}
            </div>
            <p className="text-[11px] text-slate-500">
              {report.stats.routes_checked ?? 0} rotas simuladas • {report.stats.units ?? 0} lojas • maior rota de entregador {report.stats.longest_courier_route_m ?? 0} m
            </p>

            {uncalibrated.map((e) => {
              const floor = mall.floors.find((f) => f.id === e.ref?.id);
              return (
                <div key={e.ref?.id}>
                  <IssueList issues={[e]} tone="error" />
                  {floor && (
                    <ScaleCalibration
                      floor={floor}
                      map={mall}
                      onApply={(mpp) => {
                        onMapChange(calibrateFloor(mall, floor.id, mpp));
                        setReport(null);
                        setTimeout(() => void revalidate(), 0);
                      }}
                    />
                  )}
                </div>
              );
            })}
            <IssueList issues={otherErrors} tone="error" />
            {report.warnings.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-amber-300 font-semibold">{report.warnings.length} aviso(s) — não bloqueiam</summary>
                <div className="mt-2"><IssueList issues={report.warnings} tone="warning" /></div>
              </details>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Nota da versão (opcional): o que mudou?"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button onClick={() => void revalidate()} disabled={busy !== null} className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold disabled:opacity-50">Revalidar</button>
              <button
                onClick={publish}
                disabled={!report.ok || busy !== null}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black flex items-center gap-1.5"
              >
                {busy === 'publishing' ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Publicar
              </button>
            </div>
          </div>
        )}

        {versions.length > 0 && (
          <div className="border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2"><History size={14} /> Histórico de versões</h3>
            <ul className="space-y-1.5">
              {versions.map((v) => (
                <li key={v.version} className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px]">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-200">
                      Versão {v.version} {v.isLive && <span className="ml-1 text-emerald-300">● no ar</span>}
                    </p>
                    <p className="text-slate-500 truncate">
                      {v.publishedAt ? new Date(v.publishedAt).toLocaleString('pt-BR') : ''} • {v.publishedBy ?? '—'}{v.note ? ` • ${v.note}` : ''}
                    </p>
                  </div>
                  {!v.isLive && (
                    <button onClick={() => void rollback(v)} disabled={busy !== null} className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold disabled:opacity-50">
                      Voltar para esta
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
