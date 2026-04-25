// Sound.jsx — WebAudio synthesizer for game sfx
// Exposes: sfx (methods: shake, open, call, win, lose, tap, blessed)

(function() {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
      } catch (e) { enabled = false; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.3, decay = 0.5, slide = 0, delay = 0 }) {
    if (!enabled) return;
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq + slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * decay);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur);
  }

  function noise({ dur = 0.2, vol = 0.25, filterFreq = 2000, delay = 0 }) {
    if (!enabled) return;
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + delay;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t0);
  }

  const sfx = {
    setEnabled(v) { enabled = v; },
    tap() { tone({ freq: 520, type: 'triangle', dur: 0.06, vol: 0.15, decay: 0.8 }); },
    // Shake: rattling loop
    shakeLoop: null,
    startShake() {
      if (this.shakeLoop) return;
      this.shakeLoop = setInterval(() => {
        noise({ dur: 0.08, vol: 0.22, filterFreq: 1400 + Math.random() * 2000 });
      }, 100);
    },
    stopShake() {
      if (this.shakeLoop) { clearInterval(this.shakeLoop); this.shakeLoop = null; }
    },
    // Reveal: woosh + clatter
    open() {
      tone({ freq: 700, type: 'sine', dur: 0.4, vol: 0.18, slide: -400, decay: 0.7 });
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          noise({ dur: 0.06, vol: 0.3, filterFreq: 1200 + Math.random() * 1800, delay: i * 0.05 });
        }
      }, 200);
    },
    // Call a number
    call() {
      tone({ freq: 660, type: 'triangle', dur: 0.1, vol: 0.2, decay: 0.6 });
      setTimeout(() => tone({ freq: 880, type: 'triangle', dur: 0.12, vol: 0.18, decay: 0.6 }), 90);
    },
    // Challenge (開)
    challenge() {
      tone({ freq: 330, type: 'sawtooth', dur: 0.18, vol: 0.2, slide: 220, decay: 0.6 });
    },
    // Win — rising triad
    win() {
      [523, 659, 784, 1047].forEach((f, i) => {
        tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.22, decay: 0.7, delay: i * 0.1 });
      });
    },
    // Lose — descending
    lose() {
      [440, 330, 220].forEach((f, i) => {
        tone({ freq: f, type: 'sawtooth', dur: 0.28, vol: 0.2, decay: 0.7, delay: i * 0.15 });
      });
    },
    // Blessed sparkle
    blessed() {
      [880, 1320, 1760].forEach((f, i) => {
        tone({ freq: f, type: 'sine', dur: 0.16, vol: 0.16, decay: 0.7, delay: i * 0.06 });
      });
    },
  };

  window.sfx = sfx;
})();
