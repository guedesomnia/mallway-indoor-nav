import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Download, Loader2, LogOut, Rocket, Smartphone } from 'lucide-react';
import { ClientApp } from './ClientApp';
import { LoginScreen, MapErrorScreen, NoMallScreen, Splash } from './components/StateScreens';
import { adminApi, slugify, type MallSummary } from './api/admin';
import { ApiError } from './api/http';
import {
  getLastMallId,
  loadPublishedMap,
  MapUnavailableError,
  purgeLegacyStorage,
  type LoadedMap,
} from './api/mapPackage';
import { logout, restoreSession, useSession } from './api/session';
import { useAdminCatalog, type SaveState } from './state/useAdminCatalog';
import type { BuildingMap } from './types/map';

// Código da equipe (editor, gráficos, publicação) só é baixado por quem faz login: o entregador baixa um app bem menor.
const AdminPanel = lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const MasterTeamDashboard = lazy(() => import('./components/MasterTeamDashboard').then((m) => ({ default: m.MasterTeamDashboard })));
const PublishPanel = lazy(() => import('./components/PublishPanel').then((m) => ({ default: m.PublishPanel })));

export type AppSystemMode = 'master' | 'mall_admin' | 'client_app';

function initialMode(): AppSystemMode {
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get('mode');
  if (urlMode === 'master' || urlMode === 'mall_admin' || urlMode === 'client_app') return urlMode;
  // Celular, ou qualquer link vindo de placa (QR), abre direto o app de navegação.
  if (window.innerWidth < 768 || params.get('mall') || params.get('entrance') || params.get('qr') || params.get('app')) {
    return 'client_app';
  }
  return 'master';
}

const SAVE_LABEL: Record<SaveState, { text: string; tone: string }> = {
  idle: { text: 'Sincronizado com o servidor', tone: 'text-slate-400' },
  dirty: { text: 'Alterações ainda não salvas…', tone: 'text-amber-300' },
  saving: { text: 'Salvando…', tone: 'text-slate-300' },
  saved: { text: 'Salvo no servidor', tone: 'text-emerald-300' },
  conflict: { text: 'Conflito: recarregue o mapa', tone: 'text-red-300' },
  error: { text: 'Falha ao salvar', tone: 'text-red-300' },
};

function downloadJson(map: BuildingMap): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${map.id}-minha-versao.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function App() {
  const session = useSession();
  const [systemMode, setSystemMode] = useState<AppSystemMode>(initialMode);
  const [adminMallId, setAdminMallId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('mall'));
  const [clientMallId, setClientMallId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('mall') ?? getLastMallId(),
  );
  const [previewDraft, setPreviewDraft] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  type ClientState = { status: 'loading' } | { status: 'ready'; loaded: LoadedMap } | { status: 'error'; error: MapUnavailableError };
  // O resultado guarda a chave (shopping + tentativa) que o gerou: chave diferente = ainda carregando.
  const [clientResult, setClientResult] = useState<{ key: string; value: ClientState } | null>(null);

  useEffect(() => {
    purgeLegacyStorage();
    void restoreSession();
  }, []);

  const isStaff = session.status === 'authed';
  // Quem administra um único shopping nunca vê o console da rede inteira.
  const mode: AppSystemMode = session.user?.role === 'mall_admin' && systemMode === 'master' ? 'mall_admin' : systemMode;
  const catalog = useAdminCatalog(isStaff && (mode !== 'client_app' || previewDraft));

  const activeAdminId =
    (adminMallId && catalog.entries[adminMallId] ? adminMallId : null) ??
    (session.user?.mallId && catalog.entries[session.user.mallId] ? session.user.mallId : null) ??
    catalog.maps[0]?.id ??
    null;
  const adminMap = activeAdminId ? catalog.entries[activeAdminId]?.map : undefined;

  // ---- App do cliente: mapa publicado (ou rascunho, só na pré-visualização da equipe) ----
  const draftPreviewMap = previewDraft && clientMallId ? catalog.entries[clientMallId]?.map : undefined;
  const clientKey = `${clientMallId ?? ''}:${reloadKey}`;
  useEffect(() => {
    if (mode !== 'client_app' || previewDraft || !clientMallId) return;
    let alive = true;
    loadPublishedMap(clientMallId)
      .then((loaded) => alive && setClientResult({ key: clientKey, value: { status: 'ready', loaded } }))
      .catch((e: unknown) => {
        if (!alive) return;
        const error = e instanceof MapUnavailableError ? e : new MapUnavailableError('offline', 'Não foi possível carregar o mapa.');
        setClientResult({ key: clientKey, value: { status: 'error', error } });
      });
    return () => {
      alive = false;
    };
  }, [mode, previewDraft, clientMallId, clientKey]);
  const clientState: ClientState = clientResult?.key === clientKey ? clientResult.value : { status: 'loading' };

  const openClient = useCallback((mallId: string) => {
    setClientMallId(mallId);
    setPreviewDraft(true);
    setSystemMode('client_app');
  }, []);

  const goAdmin = useCallback((next: AppSystemMode) => {
    setPreviewDraft(false);
    setSystemMode(next);
  }, []);

  const handleCreate = async (draft: BuildingMap, image: File | null): Promise<string | null> => {
    const base = slugify(draft.name);
    let slug = base;
    let created: MallSummary | null = null;
    for (let i = 0; i < 4 && !created; i++) {
      try {
        created = await adminApi.createMall(slug, draft.name, draft.address);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'MALL_EXISTS') {
          slug = `${base}-${i + 2}`.slice(0, 50);
          continue;
        }
        return e instanceof ApiError ? e.message : 'Falha ao criar o shopping.';
      }
    }
    if (!created) return 'Já existe um shopping com nome muito parecido. Use outro nome.';
    try {
      const rev0 = (await adminApi.getDraft(slug)).rev;
      let floors = draft.floors;
      if (image) {
        const up = await adminApi.uploadImage(slug, image);
        const scale = 1000 / Math.max(up.width, up.height);
        floors = floors.map((f, i) =>
          i === 0 ? { ...f, backgroundImage: up.url, width: Math.round(up.width * scale), height: Math.round(up.height * scale) } : f,
        );
      }
      const map: BuildingMap = { ...draft, id: slug, floors };
      const res = await adminApi.saveDraft(slug, rev0, map);
      catalog.addMall(created, { map, rev: res.rev, liveVersion: null, updatedBy: session.user?.email ?? null });
      setAdminMallId(slug);
      goAdmin('mall_admin');
      return null;
    } catch (e) {
      void catalog.load();
      return `O shopping foi criado, mas a planta não pôde ser salva (${e instanceof ApiError ? e.message : 'erro de conexão'}). Abra-o na lista e envie a planta de novo.`;
    }
  };

  // ================= CLIENTE =================
  if (mode === 'client_app') {
    const staffLogin = () => goAdmin('master');
    if (previewDraft) {
      if (catalog.loading || !draftPreviewMap) return <Splash label="Carregando rascunho…" />;
      return (
        <ClientApp
          key={draftPreviewMap.id}
          shoppings={catalog.maps}
          activeShopping={draftPreviewMap}
          mapInfo={{ source: 'draft', version: 0, fetchedAt: 0 }}
          isStaff={isStaff}
          onSwitchShopping={(id) => setClientMallId(id)}
          onOpenAdmin={() => {
            setAdminMallId(draftPreviewMap.id);
            goAdmin('mall_admin');
          }}
          onOpenMaster={() => goAdmin('master')}
          onOtherMall={(url) => window.location.assign(url)}
        />
      );
    }
    if (!clientMallId) return <NoMallScreen onStaffLogin={staffLogin} />;
    if (clientState.status === 'loading') return <Splash label="Baixando o mapa do shopping…" />;
    if (clientState.status === 'error') {
      return (
        <MapErrorScreen
          reason={clientState.error.reason}
          message={clientState.error.message}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      );
    }
    const { loaded } = clientState;
    return (
      <ClientApp
        key={loaded.map.id}
        shoppings={[loaded.map]}
        activeShopping={loaded.map}
        mapInfo={{ source: loaded.source, version: loaded.version, fetchedAt: loaded.fetchedAt }}
        isStaff={isStaff}
        onSwitchShopping={() => undefined}
        onOpenAdmin={() => {
          setAdminMallId(loaded.map.id);
          goAdmin('mall_admin');
        }}
        onOpenMaster={() => goAdmin('master')}
        onOtherMall={(url) => window.location.assign(url)}
      />
    );
  }

  // ================= EQUIPE / ADMIN DO SHOPPING =================
  if (session.status === 'unknown') return <Splash label="Verificando sessão…" />;
  if (!isStaff) return <LoginScreen onBackToApp={clientMallId ? () => goAdmin('client_app') : undefined} />;
  if (catalog.loading && catalog.maps.length === 0) return <Splash label="Carregando shoppings…" />;
  if (catalog.loadError) {
    return (
      <MapErrorScreen reason="offline" message={catalog.loadError} onRetry={() => void catalog.load()} />
    );
  }

  const saveInfo = SAVE_LABEL[catalog.saveState];
  const userBar = (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-semibold flex items-center gap-1.5 ${saveInfo.tone}`} aria-live="polite">
        {catalog.saveState === 'saving' && <Loader2 size={12} className="animate-spin" />}
        {catalog.saveState === 'saved' && <CheckCircle2 size={12} />}
        {(catalog.saveState === 'conflict' || catalog.saveState === 'error') && <AlertTriangle size={12} />}
        {catalog.saveState === 'error' && catalog.saveError ? catalog.saveError : saveInfo.text}
      </span>
      <span className="hidden md:inline text-[11px] text-slate-500">{session.user?.email}</span>
      <button
        onClick={logout}
        title="Sair"
        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
      >
        <LogOut size={14} />
      </button>
    </div>
  );

  const conflictBanner = catalog.conflict && (
    <div role="alert" className="bg-red-950 border-b border-red-800 text-red-100 text-xs px-6 py-2.5 flex flex-wrap items-center gap-3">
      <AlertTriangle size={14} className="shrink-0" />
      <span className="flex-1 min-w-[16rem]">
        {catalog.conflict.updatedBy ?? 'Outra pessoa'} salvou alterações neste mapa antes de você. As suas últimas alterações
        <strong> não foram gravadas</strong> e nada foi sobrescrito.
      </span>
      {adminMap && (
        <button onClick={() => downloadJson(adminMap)} className="px-3 py-1.5 rounded-lg bg-red-900 hover:bg-red-800 font-bold flex items-center gap-1.5">
          <Download size={12} /> Baixar minha versão
        </button>
      )}
      <button onClick={() => void catalog.load()} className="px-3 py-1.5 rounded-lg bg-white text-red-900 font-bold">
        Recarregar do servidor
      </button>
    </div>
  );

  if (mode === 'master') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm tracking-tight">MallWay Pro</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Console da rede
                </span>
              </div>
              <p className="text-slate-400 text-xs">Shoppings, mapas e publicações</p>
            </div>
          </div>
          {userBar}
        </header>
        {conflictBanner}
        <main className="flex-1">
          <Suspense fallback={<Splash label="Carregando painel…" />}>
          <MasterTeamDashboard
            shoppings={catalog.maps}
            liveVersions={Object.fromEntries(catalog.maps.map((m) => [m.id, catalog.entries[m.id]?.liveVersion ?? null]))}
            onSelectShoppingForAdmin={(id) => {
              setAdminMallId(id);
              goAdmin('mall_admin');
            }}
            onSelectShoppingForApp={openClient}
            onCreateShopping={handleCreate}
          />
          </Suspense>
        </main>
      </div>
    );
  }

  if (!adminMap || !activeAdminId) {
    return (
      <MapErrorScreen
        reason="not_found"
        message={session.user?.role === 'master' ? 'Nenhum shopping cadastrado ainda.' : 'Sua conta ainda não está ligada a nenhum shopping. Fale com a equipe do Mallway.'}
        onRetry={() => void catalog.load()}
      />
    );
  }

  const entry = catalog.entries[activeAdminId];
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between z-30 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {session.user?.role === 'master' && (
            <button
              onClick={() => goAdmin('master')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Console da rede</span>
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-400">Editando:</span>
            {catalog.maps.length > 1 ? (
              <select
                value={activeAdminId}
                onChange={(e) => setAdminMallId(e.target.value)}
                className="bg-slate-900 text-white font-bold text-xs rounded-lg px-2.5 py-1 border border-slate-700 outline-none focus:border-emerald-500"
              >
                {catalog.maps.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-white font-bold text-xs truncate">{adminMap.name}</span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${entry?.liveVersion ? 'text-emerald-300 border-emerald-700 bg-emerald-950/50' : 'text-slate-400 border-slate-700'}`}>
              {entry?.liveVersion ? `No ar: versão ${entry.liveVersion}` : 'Nunca publicado'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openClient(activeAdminId)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
            title="Ver o rascunho como o entregador verá (não publicado)"
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Pré-visualizar</span>
          </button>
          <button
            onClick={() => setPublishOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Rocket size={14} />
            <span>Validar e publicar</span>
          </button>
          {userBar}
        </div>
      </div>
      {conflictBanner}

      <Suspense fallback={<Splash label="Carregando editor…" />}>
      <div className="flex-1">
        <AdminPanel
          key={activeAdminId}
          buildingMap={adminMap}
          onUpdateMap={catalog.updateMap}
          onResetMap={() => {
            if (confirm('Descartar as alterações não salvas e recarregar o mapa do servidor?')) void catalog.load();
          }}
          onBackToMaster={() => goAdmin(session.user?.role === 'master' ? 'master' : 'mall_admin')}
          onOpenClientApp={() => openClient(activeAdminId)}
        />
      </div>
      </Suspense>

      {publishOpen && (
        <Suspense fallback={null}>
        <PublishPanel
          mall={adminMap}
          saveNow={catalog.saveNow}
          getRev={catalog.getRev}
          onMapChange={catalog.updateMap}
          onLiveVersionChange={(v) => {
            catalog.setLiveVersion(activeAdminId, v);
            void catalog.refreshSummaries();
          }}
          onClose={() => setPublishOpen(false)}
        />
        </Suspense>
      )}
    </div>
  );
}

export default App;

