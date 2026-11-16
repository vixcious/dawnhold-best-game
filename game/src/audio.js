// DAWNHOLD — synthesized sound: every effect is generated with WebAudio,
// no audio files, no network. The context is created lazily on the first
// user gesture; every call is guarded so a suspended or missing context
// never throws, including in headless screenshot runs.

/** Create the audio engine. Call ensure() from a user gesture. */
export function createAudio() {
  const engine = {
    ctx: null,
    master: null,
    muted: false,
    lastPlay: {},
  };

  /** Create/resume the context. Safe to call often; does nothing headless. */
  function ensure() {
    try {
      if (typeof window === 'undefined') return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!engine.ctx) {
        engine.ctx = new AC();
        engine.master = engine.ctx.createGain();
        engine.master.gain.value = 0.5;
        engine.master.connect(engine.ctx.destination);
      }
      if (engine.ctx.state === 'suspended') {
        const p = engine.ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (err) {
      // No audio on this platform: the game stays silent.
    }
  }

  /** Mute or unmute the engine. The flag lives on the engine itself so
   *  every play() call honors it, including throttled ones. */
  function setMuted(m) {
    engine.muted = !!m;
  }

  /** Whether the engine is currently muted. */
  function isMuted() {
    return engine.muted;
  }

  /** A short oscillator blip with a pitch slide and an envelope. */
  function tone(freq, freqEnd, dur, type, gain, delay = 0) {
    if (!engine.ctx || engine.muted) return;
    try {
      const t0 = engine.ctx.currentTime + delay;
      const osc = engine.ctx.createOscillator();
      const g = engine.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(engine.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (err) {
      // A failed blip must never break the frame.
    }
  }

  /** Filtered noise: thuds, bursts, and shimmer. */
  function noise(dur, gain, filterFreq, delay = 0) {
    if (!engine.ctx || engine.muted) return;
    try {
      const t0 = engine.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(engine.ctx.sampleRate * dur));
      const buffer = engine.ctx.createBuffer(1, len, engine.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = engine.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = engine.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const g = engine.ctx.createGain();
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(engine.master);
      src.start(t0);
    } catch (err) {
      // Silence on failure.
    }
  }

  /** Rate-limit a sound so machine-gun towers don't clip the mix. */
  function throttled(name, minGap) {
    const now = performance.now();
    if (now - (engine.lastPlay[name] || 0) < minGap) return false;
    engine.lastPlay[name] = now;
    return true;
  }

  /** Play a named effect. Unknown names are ignored. */
  function play(name) {
    if (!engine.ctx || engine.muted) return;
    switch (name) {
      case 'shoot':
        if (throttled('shoot', 70)) tone(880, 420, 0.07, 'square', 0.05);
        break;
      case 'sniper':
        tone(1400, 180, 0.22, 'sawtooth', 0.09);
        break;
      case 'mortar':
        if (throttled('mortar', 120)) {
          tone(160, 60, 0.18, 'sine', 0.16);
          noise(0.16, 0.1, 500);
        }
        break;
      case 'chain':
        if (throttled('chain', 110)) {
          tone(1900, 900, 0.09, 'sawtooth', 0.05);
          noise(0.08, 0.05, 4000);
        }
        break;
      case 'hit':
        if (throttled('hit', 90)) tone(300, 140, 0.06, 'triangle', 0.06);
        break;
      case 'kill':
        if (throttled('kill', 80)) tone(520, 940, 0.09, 'sine', 0.07);
        break;
      case 'leak':
        tone(120, 40, 0.35, 'sine', 0.22);
        noise(0.25, 0.14, 300);
        break;
      case 'wave':
        tone(392, 392, 0.1, 'triangle', 0.1);
        tone(523, 523, 0.1, 'triangle', 0.1, 0.1);
        tone(659, 659, 0.16, 'triangle', 0.12, 0.2);
        break;
      case 'boss':
        tone(90, 55, 0.6, 'sawtooth', 0.16);
        tone(135, 82, 0.6, 'sawtooth', 0.1, 0.05);
        noise(0.5, 0.08, 240);
        break;
      case 'phase':
        tone(180, 90, 0.3, 'sawtooth', 0.13);
        tone(270, 135, 0.3, 'square', 0.06, 0.06);
        break;
      case 'place':
        tone(220, 330, 0.09, 'triangle', 0.12);
        break;
      case 'upgrade':
        tone(523, 523, 0.08, 'sine', 0.1);
        tone(784, 784, 0.12, 'sine', 0.1, 0.07);
        break;
      case 'sell':
        tone(660, 330, 0.1, 'sine', 0.08);
        break;
      case 'click':
        tone(700, 500, 0.05, 'sine', 0.06);
        break;
      case 'draft':
        tone(466, 466, 0.1, 'sine', 0.1);
        tone(622, 622, 0.1, 'sine', 0.1, 0.09);
        tone(932, 932, 0.14, 'sine', 0.1, 0.18);
        break;
      case 'nova':
        tone(220, 1600, 0.4, 'sawtooth', 0.12);
        noise(0.35, 0.12, 3000);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.12, i * 0.13));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.94, 0.22, 'triangle', 0.12, i * 0.15));
        break;
      default:
        break;
    }
  }

  return { ensure, play, tone, noise, setMuted, isMuted, engine };
}
