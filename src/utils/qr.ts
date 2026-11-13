import type { BuildingMap } from '../types/map';
import { listEntrances } from './mapRules';

export type QrResult =
  | { kind: 'entrance'; entranceId: string; entranceName: string }
  | { kind: 'other-mall'; mallId: string; entranceId: string | null; url: string }
  | { kind: 'invalid'; reason: string };

const INVALID_FOREIGN = 'Esse QR Code não é uma placa do Mallway.';

/**
 * Interpreta o conteúdo de um QR/código digitado. Regras de segurança:
 *  - URLs só valem se forem do mesmo site do app (um adesivo malicioso sobre a placa não pode redirecionar o entregador);
 *  - código desconhecido é recusado — nunca se assume "a primeira entrada".
 */
export function parseQrPayload(raw: string, map: BuildingMap, origin: string): QrResult {
  const text = raw.trim();
  if (!text || text.length > 600) return { kind: 'invalid', reason: INVALID_FOREIGN };

  const entrances = listEntrances(map);

  if (/^https?:\/\//i.test(text)) {
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      return { kind: 'invalid', reason: INVALID_FOREIGN };
    }
    if (url.origin !== origin) return { kind: 'invalid', reason: INVALID_FOREIGN };
    const mall = url.searchParams.get('mall');
    const entrance = url.searchParams.get('entrance');
    if (!mall) return { kind: 'invalid', reason: INVALID_FOREIGN };
    if (mall !== map.id) return { kind: 'other-mall', mallId: mall, entranceId: entrance, url: url.toString() };
    const hit = entrances.find((e) => e.id === entrance);
    if (!hit) return { kind: 'invalid', reason: 'Esta placa não existe mais neste shopping. Escolha a entrada na lista.' };
    return { kind: 'entrance', entranceId: hit.id, entranceName: hit.label || hit.id };
  }

  // Código digitado à mão: id exato da entrada (sem diferenciar maiúsculas), nunca correspondência parcial.
  const hit = entrances.find((e) => e.id.toLowerCase() === text.toLowerCase());
  if (hit) return { kind: 'entrance', entranceId: hit.id, entranceName: hit.label || hit.id };
  return { kind: 'invalid', reason: 'Código não reconhecido neste shopping. Confira a placa ou escolha na lista.' };
}

export function buildPlateUrl(origin: string, mallId: string, entranceId: string): string {
  const u = new URL(origin);
  u.searchParams.set('mall', mallId);
  u.searchParams.set('entrance', entranceId);
  return u.toString();
}
