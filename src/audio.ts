import type { WorldKey } from './content';

/*
  All sound is synthesised in the browser: no audio files.

  - a slow four-voice chord that changes with each colour world
  - soft bell notes picked from that chord, at irregular intervals
  - a rush of filtered noise when the colour floods
  - one small sound per specimen: a ping when the inspection box locks,
    drips in the dish, dry crackle as the onion opens, a motor and head
    clicks for the drive
*/

const CHORDS: Record<WorldKey, number[]> = {
  scale: [73.42, 110.0, 185.0, 329.63], // D A F# E
  temper: [61.74, 92.5, 146.83, 277.18], // B F# D C#
  agar: [98.0, 146.83, 246.94, 440.0], // G D B A
  skin: [69.3, 103.83, 164.81, 246.94], // C# G# E B
  mask: [82.41, 123.47, 196.0, 293.66], // E B G D
  sprout: [110.0, 164.81, 277.18, 493.88], // A E C# B
};

export class Sound {
  on = false;
  private ctx?: AudioContext;
  private master!: GainNode;
  private wet!: GainNode;
  private voices: { a: OscillatorNode; b: OscillatorNode; g: GainNode }[] = [];
  private chord: number[] = CHORDS.scale;
  private motor?: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode };
  private bellTimer = 0;
  private noise?: AudioBuffer;
  private lastTick = 0;

  /* must be called from a click */
  async start() {
    if (this.ctx) {
      await this.ctx.resume();
      this.setOn(true);
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    // reverb from a burst of decaying noise
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.5;
    this.wet.connect(verb);
    verb.connect(this.master);

    const nlen = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

    // the chord
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    lp.Q.value = 0.4;
    lp.connect(this.master);
    lp.connect(this.wet);
    this.chord.forEach((f, i) => {
      const g = ctx.createGain();
      g.gain.value = 0.0;
      g.connect(lp);
      const a = ctx.createOscillator();
      a.type = 'sine';
      a.frequency.value = f;
      const b = ctx.createOscillator();
      b.type = 'triangle';
      b.frequency.value = f * 1.004;
      const bg = ctx.createGain();
      bg.gain.value = 0.35;
      a.connect(g);
      b.connect(bg).connect(g);
      // each voice swells and fades on its own slow cycle
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.045 + i * 0.027;
      const depth = ctx.createGain();
      depth.gain.value = 0.022;
      lfo.connect(depth).connect(g.gain);
      g.gain.setTargetAtTime(i === 0 ? 0.075 : 0.045 - i * 0.006, ctx.currentTime, 2.5);
      a.start();
      b.start();
      lfo.start();
      this.voices.push({ a, b, g });
    });

    // drive motor, silent until the drive is on stage
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start();
    this.motor = { osc, gain, filter };

    this.setOn(true);
    this.scheduleBell();
  }

  setOn(v: boolean) {
    this.on = v;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(v ? 0.85 : 0, this.ctx.currentTime, 0.25);
    try {
      localStorage.setItem('sound', v ? '1' : '0');
    } catch {
      /* private window: nothing to remember */
    }
  }

  setWorld(k: WorldKey) {
    this.chord = CHORDS[k];
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.voices.forEach((v, i) => {
      v.a.frequency.setTargetAtTime(this.chord[i], now, 0.9);
      v.b.frequency.setTargetAtTime(this.chord[i] * 1.004, now, 0.9);
    });
  }

  private scheduleBell() {
    window.clearTimeout(this.bellTimer);
    this.bellTimer = window.setTimeout(
      () => {
        if (this.on && !document.hidden) {
          const f = this.chord[1 + Math.floor(Math.random() * 3)] * (Math.random() > 0.5 ? 4 : 2);
          this.bell(f, 0.05, 3.5);
        }
        this.scheduleBell();
      },
      2200 + Math.random() * 4200,
    );
  }

  private bell(freq: number, vol: number, dur: number, dry = 0.3) {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const m = ctx.createOscillator();
    m.frequency.value = freq * 2.76;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * 1.2, now);
    mg.gain.exponentialRampToValueAtTime(1, now + dur * 0.4);
    m.connect(mg).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g);
    const d = ctx.createGain();
    d.gain.value = dry;
    g.connect(d).connect(this.master);
    g.connect(this.wet);
    o.start(now);
    m.start(now);
    o.stop(now + dur + 0.05);
    m.stop(now + dur + 0.05);
  }

  private burst(opts: { from: number; to: number; dur: number; vol: number; q?: number; type?: BiquadFilterType; wet?: number }) {
    const ctx = this.ctx;
    if (!ctx || !this.on || !this.noise) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.Q.value = opts.q ?? 0.8;
    f.frequency.setValueAtTime(opts.from, now);
    f.frequency.exponentialRampToValueAtTime(opts.to, now + opts.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(opts.vol, now + opts.dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
    src.connect(f).connect(g).connect(this.master);
    if (opts.wet) {
      const w = ctx.createGain();
      w.gain.value = opts.wet;
      g.connect(w).connect(this.wet);
    }
    src.start(now, Math.random());
    src.stop(now + opts.dur + 0.05);
  }

  /* the colour flood */
  flood() {
    this.burst({ from: 180, to: 2600, dur: 1.15, vol: 0.16, q: 0.7, wet: 0.5 });
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(92, now);
    o.frequency.exponentialRampToValueAtTime(38, now + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.28, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + 0.8);
    window.setTimeout(() => this.bell(this.chord[2] * 2, 0.09, 4.5), 420);
  }

  /* hover and click on anything interactive */
  tick() {
    const now = performance.now();
    if (now - this.lastTick < 60) return;
    this.lastTick = now;
    this.bell(this.chord[3] * 4, 0.022, 0.18, 0.9);
  }
  press() {
    this.bell(this.chord[1] * 2, 0.07, 0.5, 0.8);
  }

  /* specimen sounds */
  lock(i = 0) {
    this.bell(this.chord[3] * [2, 2.5, 3][i % 3], 0.06, 1.4, 0.5);
    this.burst({ from: 5200, to: 5000, dur: 0.05, vol: 0.05, q: 6 });
  }
  plop() {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const now = ctx.currentTime;
    const f = 380 + Math.random() * 520;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * 2.1, now + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.wet);
    o.start(now);
    o.stop(now + 0.16);
  }
  crackle(amount = 0.5) {
    for (let i = 0; i < 3; i++) {
      window.setTimeout(
        () => this.burst({ from: 2400 + Math.random() * 3000, to: 1800, dur: 0.03 + Math.random() * 0.04, vol: 0.05 * amount + 0.015, q: 3 }),
        i * (12 + Math.random() * 30),
      );
    }
  }
  seek() {
    this.burst({ from: 3200, to: 900, dur: 0.035, vol: 0.06, q: 4 });
  }
  spin(omega: number) {
    const m = this.motor;
    if (!m || !this.ctx) return;
    const now = this.ctx.currentTime;
    m.osc.frequency.setTargetAtTime(46 + omega * 9, now, 0.12);
    m.filter.frequency.setTargetAtTime(260 + omega * 60, now, 0.12);
    m.gain.gain.setTargetAtTime(Math.min(0.05, omega * 0.006), now, 0.15);
  }
  spinStop() {
    if (this.motor && this.ctx) this.motor.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }
}
