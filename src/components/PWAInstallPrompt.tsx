import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, X, Check } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
  });
  const [showIOSTip, setShowIOSTip] = useState<boolean>(false);

  useEffect(() => {
    // Verifica se já está rodando em modo PWA standalone (instalado)
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    setIsStandalone(Boolean(checkStandalone));

    // Detecta se é iOS (iPhone, iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Evento do Android / Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  // Não exibe se não houver prompt nem for iOS em tela mobile
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    haptics.medium();
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSTip(true);
    }
  };

  const handleDismiss = () => {
    haptics.light();
    setIsDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* Banner Compacto Flutuante de Instalação Mobile */}
      <aside aria-label="Instalação do Aplicativo" className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-50 bg-slate-950/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl text-white animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
            <Smartphone size={20} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white flex items-center gap-1.5 leading-snug">
              <span>Instalar MallWay no Celular</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded">
                PWA
              </span>
            </p>
            <p className="text-[11px] text-slate-300 leading-tight truncate">
              {isIOS 
                ? 'Navegue em tela cheia nativa sem barra do Safari' 
                : 'Acesse instantaneamente sem usar a Play Store'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              {isIOS ? <Share size={12} /> : <Download size={12} />}
              <span>{isIOS ? 'Como' : 'Instalar'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Fechar aviso"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal / Sheet explicativo para iOS Safari */}
      {showIOSTip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg"></span>
                <p className="font-bold text-sm">Instalar no iPhone (Safari)</p>
              </div>
              <button 
                onClick={() => setShowIOSTip(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5 flex items-center gap-1.5">
                    Toque no botão Compartilhar <Share size={13} className="text-blue-400" />
                  </p>
                  <p className="text-[11px] text-slate-400">Localizado na barra inferior do Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5">
                    Selecione &quot;Adicionar à Tela de Início&quot;
                  </p>
                  <p className="text-[11px] text-slate-400">Role para baixo no menu do Safari e toque nessa opção.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <div className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  3
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5">
                    Toque em &quot;Adicionar&quot; no topo
                  </p>
                  <p className="text-[11px] text-slate-400">O ícone do MallWay aparecerá direto na sua tela inicial, abrindo sem barras!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSTip(false);
                setIsDismissed(true);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl text-white transition-all shadow-md shadow-emerald-600/20"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
