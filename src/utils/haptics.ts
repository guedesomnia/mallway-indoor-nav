// Utilitário de Feedback Tátil (Haptic Feedback / Vibração Nativa)
// Suportado em smartphones Android e navegadores mobile com Vibration API

export const haptics = {
  // Toque suave (seleção de botão, chip ou aba)
  light: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }
  },

  // Toque médio (toggle de câmera, áudio, rota)
  medium: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // ignore
      }
    }
  },

  // Sucesso (QR Code validado, chegada ao destino)
  success: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 90]);
      } catch {
        // ignore
      }
    }
  },

  // Alerta de manobra (próxima curva iminente)
  turn: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {
        // ignore
      }
    }
  },

  // Pulso de passo detectado (odômetro)
  step: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }
  }
};
