// Utilitário de Efeitos Sonoros & Orientação por Voz em Tempo Real (TTS) Estilo Waze / Google Maps

class AudioNavigationEngine {
  private audioCtx: AudioContext | null = null;
  private isVoiceMuted: boolean = false;
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;

  constructor() {
    const savedMute = localStorage.getItem('indoor_waze_voice_muted');
    if (savedMute) {
      this.isVoiceMuted = savedMute === 'true';
    }
  }

  // Inicializa o AudioContext com clique do usuário (requisito dos navegadores)
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Alterna áudio ligado/desligado
  public toggleMute(): boolean {
    this.isVoiceMuted = !this.isVoiceMuted;
    localStorage.setItem('indoor_waze_voice_muted', String(this.isVoiceMuted));
    if (this.isVoiceMuted) {
      this.cancelSpeech();
    } else {
      this.playChime('turn');
      this.speak('Instruções por voz ativadas');
    }
    return this.isVoiceMuted;
  }

  public isMuted(): boolean {
    return this.isVoiceMuted;
  }

  // =========================================================================
  // 1. SINTETIZADOR DE SONS HARMÔNICOS VIA WEB AUDIO API (100% NATIVO)
  // =========================================================================
  public playChime(type: 'turn' | 'arrival' | 'step' | 'ping') {
    if (this.isVoiceMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'turn') {
        // Duas notas harmônicas suaves para anunciar manobra (Fá -> Dó)
        this.playTone(ctx, 349.23, now, 0.12, 0.15, 'sine');
        this.playTone(ctx, 523.25, now + 0.12, 0.22, 0.2, 'sine');
      } else if (type === 'arrival') {
        // Acorde triunfal estilo Waze / Conquista (Dó -> Mi -> Sol -> Dó agudo)
        this.playTone(ctx, 523.25, now, 0.12, 0.2, 'triangle');
        this.playTone(ctx, 659.25, now + 0.1, 0.12, 0.2, 'triangle');
        this.playTone(ctx, 783.99, now + 0.2, 0.15, 0.25, 'triangle');
        this.playTone(ctx, 1046.50, now + 0.32, 0.45, 0.3, 'sine');
      } else if (type === 'step') {
        // Bip sutil de passo (1200Hz, 30ms)
        this.playTone(ctx, 1200, now, 0.03, 0.04, 'sine');
      } else if (type === 'ping') {
        // Alerta de proximidade
        this.playTone(ctx, 880, now, 0.08, 0.12, 'sine');
      }
    } catch (e) {
      console.warn('Erro ao reproduzir som de navegação:', e);
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    maxGain: number,
    type: OscillatorType = 'sine'
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // =========================================================================
  // 2. SINTETIZADOR DE VOZ WEB SPEECH API (PORTUGUÊS DO BRASIL)
  // =========================================================================
  public speak(text: string, force = false) {
    if (this.isVoiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const cleanText = this.formatTextForSpeech(text);
    const now = Date.now();

    // Evita repetir a mesma frase em menos de 4 segundos
    if (!force && cleanText === this.lastSpokenText && (now - this.lastSpokenTime) < 4000) {
      return;
    }

    this.lastSpokenText = cleanText;
    this.lastSpokenTime = now;

    try {
      window.speechSynthesis.cancel(); // Interrompe fala anterior se ainda estiver falando

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05; // Velocidade agradável e dinâmica
      utterance.pitch = 1.02; // Tom amigável

      // Busca voz em português do Brasil preferencial
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang === 'pt-BR' || v.lang === 'pt_BR') || 
                      voices.find(v => v.lang.startsWith('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Erro na síntese de voz:', err);
    }
  }

  public cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  // Normaliza abreviações comuns para que a voz soe fluida e humana
  private formatTextForSpeech(text: string): string {
    return text
      .replace(/(\d+)\s*m\b/gi, '$1 metros')
      .replace(/(\d+)\s*min\b/gi, '$1 minutos')
      .replace(/\bPiso\s*L1\b/gi, 'Piso L um')
      .replace(/\bPiso\s*L2\b/gi, 'Piso L dois')
      .replace(/\bMc\b/gi, 'Méqui')
      .replace(/\bLoja\s*(\d+)/gi, 'Loja $1')
      .replace(/\bQR\s*Code\b/gi, 'qui ére code')
      .replace(/~/g, 'aproximadamente ');
  }
}

export const audioNav = new AudioNavigationEngine();
