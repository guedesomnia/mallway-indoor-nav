import type { BuildingMap, MapPackage } from '../types/map';
import { API_BASE } from './http';

export const SUPPORTED_SCHEMA = 1;
const CACHE_PREFIX = 'mallway:pkg:v1:';
const LAST_MALL_KEY = 'mallway:lastMall';
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export interface LoadedMap {
  map: BuildingMap;
  version: number;
  publishedAt: string;
  fetchedAt: number;
  source: 'network' | 'cache';
}

export type MapUnavailableReason = 'bad_id' | 'not_found' | 'offline' | 'outdated_app' | 'invalid';

export class MapUnavailableError extends Error {
  readonly reason: MapUnavailableReason;
  constructor(reason: MapUnavailableReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

export function isValidMallId(id: string): boolean {
  return SLUG_RE.test(id);
}

export function getLastMallId(): string | null {
  try {
    const v = localStorage.getItem(LAST_MALL_KEY);
    return v && isValidMallId(v) ? v : null;
  } catch {
    return null;
  }
}

function isPackage(v: unknown, mallId: string): v is MapPackage {
  const p = v as MapPackage | null;
  return (
    !!p &&
    typeof p === 'object' &&
    p.mallId === mallId &&
    typeof p.version === 'number' &&
    !!p.map &&
    Array.isArray(p.map.floors) &&
    Array.isArray(p.map.units) &&
    Array.isArray(p.map.nodes) &&
    Array.isArray(p.map.edges)
  );
}

function readCache(mallId: string): { pkg: MapPackage; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + mallId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fetchedAt: number; pkg: MapPackage };
    // Pacote de schema incompatível é descartado: melhor sem mapa do que app quebrado.
    if (parsed.pkg?.schemaVersion !== SUPPORTED_SCHEMA || !isPackage(parsed.pkg, mallId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(mallId: string, pkg: MapPackage, fetchedAt: number): void {
  const payload = JSON.stringify({ fetchedAt, pkg });
  try {
    localStorage.setItem(CACHE_PREFIX + mallId, payload);
  } catch {
    // Cota cheia (vários shoppings em cache): libera os outros e tenta de novo uma vez.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_PREFIX + mallId)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(CACHE_PREFIX + mallId, payload);
    } catch {
      /* sem cache offline neste aparelho; o app continua funcionando online */
    }
  }
  try {
    localStorage.setItem(LAST_MALL_KEY, mallId);
  } catch {
    /* ignore */
  }
}

/**
 * Baixa o mapa publicado. Sem rede (ou rede lenta demais) usa o último mapa baixado DO MESMO shopping.
 * Nunca usa cache de outro shopping, e 404 não cai no cache (o shopping pode ter sido despublicado).
 */
export async function loadPublishedMap(mallId: string, timeoutMs = 8000): Promise<LoadedMap> {
  if (!isValidMallId(mallId)) throw new MapUnavailableError('bad_id', 'Link de shopping inválido.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/p/${mallId}/latest.json`, { cache: 'no-cache', signal: ctrl.signal });
    if (res.status === 404) throw new MapUnavailableError('not_found', 'Este shopping ainda não está disponível no Mallway.');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pkg: unknown = await res.json();
    if (typeof (pkg as MapPackage)?.schemaVersion === 'number' && (pkg as MapPackage).schemaVersion > SUPPORTED_SCHEMA) {
      throw new MapUnavailableError('outdated_app', 'Há uma versão mais nova do app. Feche e abra de novo para atualizar.');
    }
    if ((pkg as MapPackage)?.schemaVersion !== SUPPORTED_SCHEMA || !isPackage(pkg, mallId)) {
      throw new MapUnavailableError('invalid', 'O mapa deste shopping está em formato inesperado.');
    }
    const fetchedAt = Date.now();
    writeCache(mallId, pkg, fetchedAt);
    return { map: pkg.map, version: pkg.version, publishedAt: pkg.publishedAt, fetchedAt, source: 'network' };
  } catch (e) {
    if (e instanceof MapUnavailableError) throw e;
    const cached = readCache(mallId);
    if (cached) {
      return { map: cached.pkg.map, version: cached.pkg.version, publishedAt: cached.pkg.publishedAt, fetchedAt: cached.fetchedAt, source: 'cache' };
    }
    throw new MapUnavailableError('offline', 'Sem internet e este shopping ainda não foi baixado neste aparelho. Conecte-se uma vez para baixar o mapa.');
  } finally {
    clearTimeout(timer);
  }
}

/** Remove chaves do protótipo (mapas inteiros no localStorage). Sem isso, usuários antigos carregariam mapa velho para sempre. */
export function purgeLegacyStorage(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => /^(indoor_all_shoppings|active_shopping_id|active_system_mode)_v\d+$/.test(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
