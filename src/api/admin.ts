import type { BuildingMap } from '../types/map';
import { api } from './http';

export interface MallSummary {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  liveVersion: number | null;
  draftRev: number;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  unitCount: number;
}

export interface DraftPayload {
  rev: number;
  map: BuildingMap;
  updatedAt: string | null;
  updatedBy: string | null;
  liveVersion: number | null;
  status: string;
}

export interface Issue {
  code: string;
  message: string;
  ref?: { type: 'floor' | 'unit' | 'node' | 'edge' | 'connector'; id: string };
}

export interface ValidationReport {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  stats: Record<string, number>;
}

export interface VersionRow {
  version: number;
  publishedAt: string | null;
  publishedBy: string | null;
  note: string | null;
  contentHash: string;
  isLive: boolean;
}

export const adminApi = {
  listMalls: () => api<MallSummary[]>('/api/malls'),
  createMall: (id: string, name: string, address?: string) =>
    api<MallSummary>('/api/malls', { method: 'POST', body: { id, name, address } }),
  getDraft: (id: string) => api<DraftPayload>(`/api/malls/${id}/draft`),
  saveDraft: (id: string, baseRev: number, map: BuildingMap) =>
    api<{ rev: number; updatedAt: string | null }>(`/api/malls/${id}/draft`, { method: 'PUT', body: { baseRev, map } }),
  validate: (id: string) => api<ValidationReport & { rev: number }>(`/api/malls/${id}/validate`, { method: 'POST' }),
  publish: (id: string, baseRev: number, note?: string) =>
    api<{ version: number; warnings: Issue[]; stats: Record<string, number> }>(`/api/malls/${id}/publish`, {
      method: 'POST',
      body: { baseRev, note: note || null },
    }),
  versions: (id: string) => api<VersionRow[]>(`/api/malls/${id}/versions`),
  rollback: (id: string, version: number) => api<{ liveVersion: number }>(`/api/malls/${id}/rollback/${version}`, { method: 'POST' }),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<{ url: string; width: number; height: number; bytes: number }>(`/api/malls/${id}/images`, { method: 'POST', form });
  },
};

export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base.length >= 3 ? base : `shopping-${Math.random().toString(36).slice(2, 7)}`;
}
