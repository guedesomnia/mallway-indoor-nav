import { useState } from 'react';
import { Building2, Loader2, LogIn, MapPinOff, QrCode, WifiOff } from 'lucide-react';
import { ApiError } from '../api/http';
import { login } from '../api/session';
import type { MapUnavailableReason } from '../api/mapPackage';

const shell = 'min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100';

export function Splash({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={shell} role="status">
      <div className="flex items-center gap-3 text-slate-300">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}

export function NoMallScreen({ onStaffLogin }: { onStaffLogin: () => void }) {
  return (
    <div className={shell}>
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
          <QrCode size={28} />
        </div>
        <h1 className="text-xl font-black">Escaneie a placa do shopping</h1>
        <p className="text-sm text-slate-400">
          Aponte a câmera do celular para o QR Code da placa na entrada ou na cancela. O mapa abre automaticamente.
        </p>
        <button onClick={onStaffLogin} className="text-xs text-slate-500 hover:text-slate-300 underline">
          Acesso da equipe
        </button>
      </div>
    </div>
  );
}

export function MapErrorScreen({ reason, message, onRetry }: { reason: MapUnavailableReason; message: string; onRetry: () => void }) {
  const Icon = reason === 'offline' ? WifiOff : MapPinOff;
  const canRetry = reason === 'offline' || reason === 'outdated_app' || reason === 'invalid';
  return (
    <div className={shell}>
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
          <Icon size={28} />
        </div>
        <h1 className="text-xl font-black">{reason === 'offline' ? 'Sem conexão' : 'Mapa indisponível'}</h1>
        <p className="text-sm text-slate-400">{message}</p>
        {canRetry && (
          <button onClick={onRetry} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">
            Tentar de novo
          </button>
        )}
      </div>
    </div>
  );
}

const LOGIN_MESSAGES: Record<string, string> = {
  BAD_CREDENTIALS: 'E-mail ou senha incorretos.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  NETWORK: 'Sem conexão com o servidor. Verifique a internet.',
};

export function LoginScreen({ onBackToApp }: { onBackToApp?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'ERROR';
      setError(LOGIN_MESSAGES[code] ?? 'Não foi possível entrar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={shell}>
      <form onSubmit={submit} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-7 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-400 flex items-center justify-center">
            <Building2 className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-black text-white leading-tight">MallWay Pro</h1>
            <p className="text-xs text-slate-400">Acesso da equipe e dos shoppings</p>
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-300">
          E-mail
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-300">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </label>

        {error && (
          <p role="alert" className="text-xs text-red-300 bg-red-950/50 border border-red-800/60 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          Entrar
        </button>
        {onBackToApp && (
          <button type="button" onClick={onBackToApp} className="w-full text-xs text-slate-500 hover:text-slate-300">
            Voltar ao app de navegação
          </button>
        )}
      </form>
    </div>
  );
}
