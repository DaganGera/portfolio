import * as THREE from 'three';

/*
  The entry screen: the name grown by a cellular automaton.

  Every cell sees only its eight neighbours. A dead cell inside the letterforms
  comes alive when a neighbour is alive; one seed is planted first and a few more
  nucleate as it goes. Cells age from green to pink to pale, a few die at random
  and are replaced, and the cursor tears a wound that the neighbours grow back
  over. Nothing is drawn as text: the letters only say where growth may hold.
*/

interface Line {
  text: string;
  stretch: CanvasFontStretch;
}

const LINES: Line[] = [
  { text: 'Marcben James', stretch: 'condensed' },
  { text: 'Samuel', stretch: 'extra-expanded' },
];
const FAMILY = "'Anybody Variable', sans-serif";
const GAP = 0.1; // space between the lines, as a share of the first line's height

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const SIM = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uState;
  uniform sampler2D uMask;
  uniform vec2 uGrid;
  uniform float uTick;
  uniform float uNucleate;
  uniform vec2 uSeed;
  uniform vec3 uMouse; // cell x, cell y, wound radius in cells

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float live(vec2 o) { return step(0.3, texture2D(uState, vUv + o / uGrid).r); }

  void main() {
    vec2 s = texture2D(uState, vUv).rg;
    float alive = s.r;
    float age = s.g;
    float inside = step(0.5, texture2D(uMask, vUv).r);
    vec2 cell = floor(vUv * uGrid);

    float n = live(vec2(1.0, 0.0)) + live(vec2(-1.0, 0.0)) + live(vec2(0.0, 1.0)) + live(vec2(0.0, -1.0));
    n += 0.5 * (live(vec2(1.0, 1.0)) + live(vec2(-1.0, 1.0)) + live(vec2(1.0, -1.0)) + live(vec2(-1.0, -1.0)));

    float r1 = hash(cell + uTick * vec2(0.37, 0.91));
    float r2 = hash(cell.yx + uTick * vec2(0.53, 0.19) + 7.0);
    float r3 = hash(cell + uTick * vec2(0.11, 0.73) + 19.0);

    if (inside > 0.5) {
      if (alive <= 0.0) {
        if (r1 < n * 0.075 || r2 < uNucleate) alive = 0.08;
      } else {
        alive = min(1.0, alive + 0.055);
        if (alive >= 1.0 && age > 0.6 && r3 < 0.0011) { alive = 0.0; age = 0.0; }
      }
    } else {
      alive = max(0.0, alive - 0.08);
    }
    if (distance(cell, uSeed) < 0.9) alive = max(alive, 0.08);
    if (distance(cell, uMouse.xy) < uMouse.z) { alive = 0.0; age = 0.0; }
    age = alive > 0.0 ? min(1.0, age + 0.0022) : 0.0;
    gl_FragColor = vec4(alive, age, 0.0, 1.0);
  }
`;

const SHOW = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uState;
  uniform vec2 uGrid;
  uniform float uPx; // one screen pixel, in cells
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec3 uGround;
  uniform vec3 uDot;
  uniform vec3 uYoung;
  uniform vec3 uMid;
  uniform vec3 uOld;

  void main() {
    vec2 g = vUv * uGrid;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 s = texture2D(uState, (cell + 0.5) / uGrid).rg;
    float alive = s.r;
    float age = s.g;

    // the empty medium: a field of faint dots that swell near the cursor
    float near = smoothstep(16.0, 0.0, distance(cell, uMouse));
    float ripple = sin(cell.x * 0.19 + cell.y * 0.23 - uTime * 1.1) * 0.5 + 0.5;
    float dr = 0.055 + 0.02 * ripple + 0.09 * near;
    float dotMask = smoothstep(dr + uPx, dr - uPx, length(f));
    vec3 col = mix(uGround, uDot, dotMask * (0.55 + 0.45 * near));

    // a living cell: a rounded square that swells as it grows in
    float breathe = sin(cell.x * 0.31 - cell.y * 0.27 + uTime * 1.7) * 0.5 + 0.5;
    float half_ = alive * (0.405 + 0.03 * breathe);
    float rad = min(0.13, half_);
    vec2 q = abs(f) - (half_ - rad);
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
    float cm = step(0.01, alive) * smoothstep(uPx, -uPx, sd);
    // each cell settles to its own shade, so the grown name is never one flat colour
    float own = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 settled = mix(uOld, uMid, own * own * 0.55);
    vec3 cc = mix(uYoung, uMid, smoothstep(0.0, 0.35, age));
    cc = mix(cc, settled, smoothstep(0.35, 0.95, age));
    col = mix(col, cc, cm);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export class GateGrowth {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private sim: THREE.ShaderMaterial;
  private show: THREE.ShaderMaterial;
  private a?: THREE.WebGLRenderTarget;
  private b?: THREE.WebGLRenderTarget;
  private mask?: THREE.CanvasTexture;
  private grid = new THREE.Vector2(1, 1);
  private cell = 8;
  private tickN = 0;
  private mouse = new THREE.Vector2(-999, -999);
  private wound = 0;
  private onMove: (e: PointerEvent) => void;
  private onResize: () => void;
  private resizeTimer = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private gate: HTMLElement,
    private spacer: HTMLElement,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.sim = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uMask: { value: null },
        uGrid: { value: this.grid },
        uTick: { value: 0 },
        uNucleate: { value: 0 },
        uSeed: { value: new THREE.Vector2(-9, -9) },
        uMouse: { value: new THREE.Vector3(-999, -999, 0) },
      },
      vertexShader: VERT,
      fragmentShader: SIM,
      depthTest: false,
      depthWrite: false,
    });
    this.show = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uGrid: { value: this.grid },
        uPx: { value: 0.1 },
        uTime: { value: 0 },
        uMouse: { value: this.mouse },
        uGround: { value: new THREE.Color('#4A1237') },
        uDot: { value: new THREE.Color('#7C3562') },
        uYoung: { value: new THREE.Color('#C6D63A') },
        uMid: { value: new THREE.Color('#EE7FB6') },
        uOld: { value: new THREE.Color('#F5DFEC') },
      },
      vertexShader: VERT,
      fragmentShader: SHOW,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.show);
    this.scene.add(this.quad);

    this.onMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / this.cell;
      const y = (r.height - (e.clientY - r.top)) / this.cell;
      const moved = Math.hypot(x - this.mouse.x, y - this.mouse.y);
      this.mouse.set(x, y);
      // only a moving cursor cuts; hold still and the tissue closes under it
      if (moved < 60) this.wound = Math.min(5.5, this.wound + moved * 0.9);
    };
    this.onResize = () => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.layout(), 160);
    };
    gate.addEventListener('pointermove', this.onMove);
    window.addEventListener('resize', this.onResize);
    this.layout();
  }

  /* measure the name, size the grid, and start growth again from one seed */
  layout() {
    const vw = this.gate.clientWidth;
    const vh = this.gate.clientHeight;
    this.cell = Math.max(5, Math.min(10, Math.round(vw / 235)));
    const cols = Math.ceil(vw / this.cell);
    const rows = Math.ceil(vh / this.cell);

    // fit both lines to one width; the short word runs wide and the long one narrow
    const probe = document.createElement('canvas').getContext('2d')!;
    const W = Math.min(vw * 0.8, vh * 1.45, 1560);
    const fonts = LINES.map((l) => {
      probe.font = `900 100px ${FAMILY}`;
      probe.fontStretch = l.stretch;
      const m = probe.measureText(l.text);
      const fs = (100 * W) / m.width;
      const k = fs / 100;
      return { ...l, fs, up: m.actualBoundingBoxAscent * k, down: m.actualBoundingBoxDescent * k, left: m.actualBoundingBoxLeft * k };
    });
    const gap = fonts[0].up * GAP;
    const H = fonts.reduce((s, f) => s + f.up + f.down, 0) + gap * (fonts.length - 1);
    this.spacer.style.width = `${W}px`;
    this.spacer.style.height = `${H}px`;
    const box = this.spacer.getBoundingClientRect();
    const host = this.gate.getBoundingClientRect();

    const mc = document.createElement('canvas');
    mc.width = cols;
    mc.height = rows;
    const x = mc.getContext('2d')!;
    x.fillStyle = '#000';
    x.fillRect(0, 0, cols, rows);
    x.scale(1 / this.cell, 1 / this.cell);
    x.fillStyle = '#fff';
    x.textBaseline = 'alphabetic';
    let y = box.top - host.top;
    for (const f of fonts) {
      x.font = `900 ${f.fs}px ${FAMILY}`;
      x.fontStretch = f.stretch;
      y += f.up;
      x.fillText(f.text, box.left - host.left + f.left, y);
      y += f.down + gap;
    }

    // plant the first cell in the letter nearest the middle of the name
    const data = x.getImageData(0, 0, cols, rows).data;
    const cx = Math.round((box.left - host.left + W / 2) / this.cell);
    const cy = Math.round((box.top - host.top + H / 2) / this.cell);
    let best = Infinity;
    let sx = cx;
    let sy = cy;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (data[(j * cols + i) * 4] > 200) {
          const d = (i - cx) ** 2 + (j - cy) ** 2;
          if (d < best) {
            best = d;
            sx = i;
            sy = j;
          }
        }
      }
    }

    this.mask?.dispose();
    this.mask = new THREE.CanvasTexture(mc);
    this.mask.minFilter = this.mask.magFilter = THREE.NearestFilter;
    this.mask.generateMipmaps = false;

    this.a?.dispose();
    this.b?.dispose();
    const opts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
    };
    this.a = new THREE.WebGLRenderTarget(cols, rows, opts);
    this.b = new THREE.WebGLRenderTarget(cols, rows, opts);
    this.renderer.setClearColor(0x000000, 1);
    for (const rt of [this.a, this.b]) {
      this.renderer.setRenderTarget(rt);
      this.renderer.clear();
    }
    this.renderer.setRenderTarget(null);

    this.grid.set(cols, rows);
    this.sim.uniforms.uMask.value = this.mask;
    this.sim.uniforms.uSeed.value.set(sx, rows - 1 - sy);
    this.tickN = 0;

    const dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(cols * this.cell, rows * this.cell, false);
    this.canvas.style.width = `${cols * this.cell}px`;
    this.canvas.style.height = `${rows * this.cell}px`;
    this.show.uniforms.uPx.value = 0.75 / (this.cell * dpr);
  }

  step(n: number) {
    if (!this.a || !this.b) return;
    let a: THREE.WebGLRenderTarget = this.a;
    let b: THREE.WebGLRenderTarget = this.b;
    const u = this.sim.uniforms;
    this.quad.material = this.sim;
    for (let i = 0; i < n; i++) {
      this.tickN++;
      u.uState.value = a.texture;
      u.uTick.value = this.tickN % 4096;
      // one seed for the first moments, then a few more take hold on their own
      u.uNucleate.value = this.tickN < 100 ? 0 : 0.000014;
      if (this.tickN > 6) u.uSeed.value.set(-9, -9);
      u.uMouse.value.set(this.mouse.x, this.mouse.y, this.wound);
      this.renderer.setRenderTarget(b);
      this.renderer.render(this.scene, this.cam);
      const s: THREE.WebGLRenderTarget = a;
      a = b;
      b = s;
    }
    this.a = a;
    this.b = b;
    this.renderer.setRenderTarget(null);
    this.quad.material = this.show;
  }

  tick(t: number, dt: number) {
    this.wound *= Math.exp(-7 * Math.min(dt, 0.05));
    this.step(2);
    this.show.uniforms.uState.value = this.a!.texture;
    this.show.uniforms.uTime.value = t;
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.gate.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('resize', this.onResize);
    window.clearTimeout(this.resizeTimer);
    this.a?.dispose();
    this.b?.dispose();
    this.mask?.dispose();
    this.sim.dispose();
    this.show.dispose();
    this.quad.geometry.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
