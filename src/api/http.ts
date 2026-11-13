export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: Record<string, unknown>;

  constructor(status: number, code: string, message: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

type TokenProvider = {
  getAccess: () => string | null;
  refresh: () => Promise<boolean>;
  onAuthLost: () => void;
};

let tokens: TokenProvider | null = null;
export function bindTokenProvider(p: TokenProvider): void {
  tokens = p;
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  signal?: AbortSignal;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* corpo vazio ou não-JSON */
  }
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const d = detail as Record<string, unknown>;
    return new ApiError(res.status, String(d.code ?? 'ERROR'), String(d.message ?? `Erro ${res.status}`), d);
  }
  if (Array.isArray(detail)) {
    return new ApiError(res.status, 'VALIDATION', 'Dados inválidos', { errors: detail });
  }
  return new ApiError(res.status, 'ERROR', `Erro ${res.status}`);
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true, signal } = opts;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = auth ? tokens?.getAccess() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  };

  let res: Response;
  try {
    res = await send();
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', 'Sem conexão com o servidor. Verifique a internet e tente de novo.');
  }

  if (res.status === 401 && auth && tokens) {
    // Token de acesso expirou: renova uma vez e repete. Se a renovação falhar, a sessão acabou.
    if (await tokens.refresh()) {
      try {
        res = await send();
      } catch {
        throw new ApiError(0, 'NETWORK', 'Sem conexão com o servidor. Verifique a internet e tente de novo.');
      }
    }
    if (res.status === 401) {
      tokens.onAuthLost();
      throw await parseError(res);
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
