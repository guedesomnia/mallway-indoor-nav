import { useSyncExternalStore } from 'react';
import { API_BASE, api, bindTokenProvider } from './http';

export interface SessionUser {
  id: number;
  email: string;
  role: 'master' | 'mall_admin';
  mallId: string | null;
}

export interface SessionState {
  status: 'unknown' | 'anon' | 'authed';
  user: SessionUser | null;
}

interface TokenOut {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const RT_KEY = 'mallway:rt';

let state: SessionState = { status: 'unknown', user: null };
let access: string | null = null;
const listeners = new Set<() => void>();

function set(next: SessionState): void {
  state = next;
  listeners.forEach((l) => l());
}

function readRt(): string | null {
  try {
    return localStorage.getItem(RT_KEY);
  } catch {
    return null;
  }
}

function writeRt(v: string | null): void {
  try {
    if (v) localStorage.setItem(RT_KEY, v);
    else localStorage.removeItem(RT_KEY);
  } catch {
    /* modo privado: a sessão dura só até recarregar a página */
  }
}

function applyTokens(t: TokenOut): void {
  access = t.accessToken;
  writeRt(t.refreshToken);
  set({ status: 'authed', user: t.user });
}

let refreshing: Promise<boolean> | null = null;

/** Renovação com chamada única: várias requisições que expiram juntas não disparam várias renovações. */
async function refresh(): Promise<boolean> {
  const rt = readRt();
  if (!rt) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      applyTokens((await res.json()) as TokenOut);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function authLost(): void {
  access = null;
  writeRt(null);
  set({ status: 'anon', user: null });
}

bindTokenProvider({ getAccess: () => access, refresh, onAuthLost: authLost });

export async function restoreSession(): Promise<void> {
  if (state.status !== 'unknown') return;
  if (!(await refresh())) set({ status: 'anon', user: null });
}

export async function login(email: string, password: string): Promise<void> {
  applyTokens(await api<TokenOut>('/auth/login', { method: 'POST', body: { email, password }, auth: false }));
}

export function logout(): void {
  authLost();
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
