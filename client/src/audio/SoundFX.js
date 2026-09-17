// Sintetizador procedural de efeitos sonoros e trilha sonora via Web Audio API
class SoundFXManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bpm = 128;
    this.step = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
      this.bgmPlaying = false;
    }
    return this.muted;
  }

  // Disparo laser do jogador
  laser(frequency = 880) {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  // Laser duplo / pesado
  heavyLaser() {
    if (this.muted) return;
    this.laser(1100);
    setTimeout(() => this.laser(750), 30);
  }

  // Efeito de Impacto dos Tiros no Inimigo / Blindagem (Hit Sound com variação sutil)
  hit(isCritical = false) {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Estalo de impacto (High-pass noise click)
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(isCritical ? 3200 : 2400 + Math.random() * 400, now);
    nFilter.Q.value = 3;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(isCritical ? 0.22 : 0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start();

    // 2. Punch tonal curto (Plasma impact thump)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = isCritical ? 'sawtooth' : 'triangle';
    const baseFreq = isCritical ? 440 : 280 + Math.random() * 60;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

    oscGain.gain.setValueAtTime(isCritical ? 0.2 : 0.12, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.06);
  }

  // Deflexão de tiro no Escudo
  shieldHit() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.15);
  }

  // Explosão cinematográfica encorpada com Sub-Bass Punch e Ruído Filtrado
  explosion(isBoss = false, isLarge = false) {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = isBoss ? 1.1 : (isLarge ? 0.6 : 0.38);

    // 1. Ruído da detonação
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBoss ? 600 : (isLarge ? 750 : 950), now);
    filter.frequency.exponentialRampToValueAtTime(25, now + duration);

    const gain = ctx.createGain();
    const vol = isBoss ? 0.45 : (isLarge ? 0.32 : 0.22);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    // 2. Sub-Bass Kick Punch (Impacto grave no peito)
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(isBoss ? 160 : 130, now);
    kick.frequency.exponentialRampToValueAtTime(28, now + (isBoss ? 0.45 : 0.22));

    kickGain.gain.setValueAtTime(isBoss ? 0.5 : (isLarge ? 0.35 : 0.25), now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + (isBoss ? 0.45 : 0.22));

    kick.connect(kickGain);
    kickGain.connect(ctx.destination);
    kick.start();
    kick.stop(now + (isBoss ? 0.45 : 0.22));
  }

  // Alarme épico de Chefe (WARNING)
  bossWarning() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (this.muted) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(760, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }, i * 320);
    }
  }

  // Aviso sonoro de mira telegrafada (Laser Lock / Beep de Mira)
  telegraphWarning() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  // Coleta de Cápsula / Pill
  pillPickup() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }, idx * 40);
    });
  }

  // Super Poder: Raio Orbital SOL
  solBeam() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;

    // Riser inicial
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.6);

    // Explosão massiva após 0.5s
    setTimeout(() => this.explosion(true), 500);
  }

  // Som de compra / moedas caindo no Pix
  coinSuccess() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const notes = [987.77, 1318.51]; // B5, E6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }, idx * 90);
    });
  }

  // Inicia trilha sonora procedural Synthwave/Cyberpunk no fundo
  startBGM() {
    if (this.bgmPlaying || this.muted) return;
    this.init();
    this.bgmPlaying = true;
    const interval = (60 / this.bpm) * 1000 / 4; // 16th notes

    // Linha de baixo estilo Synthwave anos 80 em escala Menor (A, F, G, E)
    const bassNotes = [
      110, 110, 220, 110, 110, 110, 220, 110,
      87.31, 87.31, 174.61, 87.31, 87.31, 87.31, 174.61, 87.31,
      98, 98, 196, 98, 98, 98, 196, 98,
      82.41, 82.41, 164.81, 82.41, 82.41, 82.41, 164.81, 82.41
    ];

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.bgmPlaying) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const note = bassNotes[this.step % bassNotes.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + Math.sin(this.step * 0.2) * 200, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      // Hi-hat a cada 2 passos
      if (this.step % 2 === 1) {
        this.playHiHat();
      }

      this.step++;
    }, interval);
  }

  playHiHat() {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmPlaying = false;
  }
}

export const SoundFX = new SoundFXManager();
