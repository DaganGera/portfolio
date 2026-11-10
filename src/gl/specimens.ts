import * as THREE from 'three';

/*
  The four objects on stage. Each is built from code: geometry, painted canvas
  textures and, for the dish, a small simulation. None of them loads a file.

  A specimen gets:
    p  its chapter's scroll progress, 0 to 1
    w  how much it is "on stage", 0 to 1
*/

export interface SpecimenCtx {
  renderer: THREE.WebGLRenderer;
  emit: (name: string, data?: number) => void;
  scrollSpeed: () => number;
}

export interface Specimen {
  group: THREE.Group;
  update: (dt: number, t: number, p: number, w: number) => void;
}

/* ---------- small helpers ---------- */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(
  w: number,
  h: number,
  draw: (x: CanvasRenderingContext2D, w: number, h: number) => void,
  srgb = true,
) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/* ============================================================
   1. Steel plate, heat-tinted, with three surface defects
   ============================================================ */

const PLATE_DEFECTS = [
  { name: 'scratches', u: 0.27, v: 0.64, w: 0.3, h: 0.26, conf: '0.97' },
  { name: 'pitted surface', u: 0.71, v: 0.68, w: 0.22, h: 0.26, conf: '0.94' },
  { name: 'inclusion', u: 0.55, v: 0.27, w: 0.3, h: 0.22, conf: '0.91' },
];

function paintPlate(x: CanvasRenderingContext2D, w: number, h: number, mode: 'color' | 'bump') {
  const r = rng(7);
  const color = mode === 'color';
  x.fillStyle = color ? '#9aa1a8' : '#808080';
  x.fillRect(0, 0, w, h);

  if (color) {
    // oxide colours spreading from the heated corner
    const g = x.createRadialGradient(w * 0.96, h * 0.04, 0, w * 0.96, h * 0.04, w * 1.02);
    g.addColorStop(0.0, '#a9c3d9');
    g.addColorStop(0.13, '#3f6fc0');
    g.addColorStop(0.27, '#3a3f9e');
    g.addColorStop(0.4, '#7a3f96');
    g.addColorStop(0.52, '#b0603a');
    g.addColorStop(0.65, '#e3b454');
    g.addColorStop(0.8, '#e4d49a');
    g.addColorStop(1.0, '#a3a9ae');
    x.globalAlpha = 0.92;
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.globalAlpha = 1;
  }

  // brushed grain
  for (let i = 0; i < 9000; i++) {
    const px = r() * w;
    const py = r() * h;
    const len = 30 + r() * 180;
    const light = r() > 0.5;
    x.strokeStyle = light
      ? `rgba(255,255,255,${color ? 0.05 : 0.07})`
      : `rgba(0,0,0,${color ? 0.06 : 0.07})`;
    x.lineWidth = 0.6 + r() * 1.2;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + len, py + (r() - 0.5) * 2);
    x.stroke();
  }

  const at = (d: (typeof PLATE_DEFECTS)[number]) => ({ cx: d.u * w, cy: (1 - d.v) * h, dw: d.w * w, dh: d.h * h });

  // scratches: bright grooves with a dark lip
  {
    const { cx, cy, dw, dh } = at(PLATE_DEFECTS[0]);
    for (let i = 0; i < 7; i++) {
      const ox = (r() - 0.5) * dw * 0.6;
      const oy = (r() - 0.5) * dh * 0.3;
      const x0 = cx + ox - dw * 0.3;
      const y0 = cy + oy + dh * 0.32;
      const x1 = cx + ox + dw * 0.28;
      const y1 = cy + oy - dh * 0.34;
      x.lineCap = 'round';
      x.strokeStyle = color ? 'rgba(20,24,34,0.55)' : 'rgba(30,30,30,0.9)';
      x.lineWidth = 3.4 + r() * 2;
      x.beginPath();
      x.moveTo(x0 + 2, y0 + 2);
      x.lineTo(x1 + 2, y1 + 2);
      x.stroke();
      x.strokeStyle = color ? 'rgba(244,248,252,0.9)' : 'rgba(70,70,70,0.9)';
      x.lineWidth = 1.4 + r() * 1.4;
      x.beginPath();
      x.moveTo(x0, y0);
      x.lineTo(x1, y1);
      x.stroke();
    }
  }
  // pitted surface: a cluster of small craters
  {
    const { cx, cy, dw, dh } = at(PLATE_DEFECTS[1]);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.pow(r(), 0.7);
      const px = cx + Math.cos(a) * d * dw * 0.42;
      const py = cy + Math.sin(a) * d * dh * 0.42;
      const rad = 1.5 + r() * 5.5;
      x.fillStyle = color ? 'rgba(18,16,22,0.78)' : 'rgba(20,20,20,0.95)';
      x.beginPath();
      x.arc(px, py, rad, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = color ? 'rgba(255,255,255,0.35)' : 'rgba(190,190,190,0.6)';
      x.lineWidth = 1;
      x.beginPath();
      x.arc(px, py, rad + 0.8, Math.PI * 0.9, Math.PI * 1.8);
      x.stroke();
    }
  }
  // inclusions: dark streaks rolled into the surface
  {
    const { cx, cy, dw, dh } = at(PLATE_DEFECTS[2]);
    for (let i = 0; i < 6; i++) {
      const px = cx + (r() - 0.5) * dw * 0.6;
      const py = cy + (r() - 0.5) * dh * 0.6;
      x.fillStyle = color ? 'rgba(14,12,16,0.82)' : 'rgba(40,40,40,0.9)';
      x.beginPath();
      x.ellipse(px, py, 18 + r() * 46, 2.5 + r() * 4.5, (r() - 0.5) * 0.12, 0, Math.PI * 2);
      x.fill();
    }
  }
}

function labelTexture(text: string, conf: string) {
  return canvasTex(640, 112, (x, w, h) => {
    x.fillStyle = '#EDCB6B';
    x.beginPath();
    x.roundRect(0, 0, w, h, 18);
    x.fill();
    x.fillStyle = '#1D3657';
    x.textBaseline = 'middle';
    x.font = "700 52px 'Anybody Variable', sans-serif";
    x.fillText(text, 30, h / 2 + 3);
    x.textAlign = 'right';
    x.font = "italic 500 50px 'Brygada 1918 Variable', serif";
    x.fillText(conf, w - 30, h / 2 + 3);
  });
}

export function buildPlate(ctx: SpecimenCtx): Specimen {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const W = 3.5;
  const H = 2.3;
  const D = 0.13;
  const geo = new THREE.ExtrudeGeometry(roundedRect(W, H, 0.07), {
    depth: D,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.center();
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
  }
  uv.needsUpdate = true;

  const map = canvasTex(1400, 920, (x, w, h) => paintPlate(x, w, h, 'color'));
  const bump = canvasTex(1400, 920, (x, w, h) => paintPlate(x, w, h, 'bump'), false);
  const mat = new THREE.MeshPhysicalMaterial({
    map,
    bumpMap: bump,
    bumpScale: 2.2,
    metalness: 1,
    roughness: 0.36,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.25,
  });
  inner.add(new THREE.Mesh(geo, mat));

  // the inspection box
  const z = D / 2 + 0.05;
  const boxMat = new THREE.MeshBasicMaterial({ color: '#EDCB6B', toneMapped: false });
  const box = new THREE.Group();
  const bars: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), boxMat);
    bars.push(m);
    box.add(m);
  }
  box.position.z = z;
  inner.add(box);

  const labels = PLATE_DEFECTS.map((d) => labelTexture(d.name, d.conf));
  const labelMat = new THREE.MeshBasicMaterial({ map: labels[0], transparent: true, toneMapped: false });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.2), labelMat);
  label.position.z = z + 0.01;
  inner.add(label);

  const cur = { x: 0, y: 0, w: 0.8, h: 0.6 };
  let idx = -1;
  const T = 0.022;

  return {
    group,
    update(dt, t, p, w) {
      const i = Math.min(2, Math.floor(p * 3));
      if (i !== idx) {
        idx = i;
        labelMat.map = labels[i];
        labelMat.needsUpdate = true;
        if (w > 0.5) ctx.emit('lock', i);
      }
      const d = PLATE_DEFECTS[i];
      // while idle in the hero, let the box wander slowly between defects
      const tx = (d.u - 0.5) * W;
      const ty = (d.v - 0.5) * H;
      cur.x = damp(cur.x, tx, 5, dt);
      cur.y = damp(cur.y, ty, 5, dt);
      cur.w = damp(cur.w, d.w * W, 5, dt);
      cur.h = damp(cur.h, d.h * H, 5, dt);
      const pulse = 1 + Math.sin(t * 5) * 0.012;
      const bw = cur.w * pulse;
      const bh = cur.h * pulse;
      box.position.x = cur.x;
      box.position.y = cur.y;
      bars[0].position.set(0, bh / 2, 0);
      bars[0].scale.set(bw + T, T, 1);
      bars[1].position.set(0, -bh / 2, 0);
      bars[1].scale.set(bw + T, T, 1);
      bars[2].position.set(-bw / 2, 0, 0);
      bars[2].scale.set(T, bh, 1);
      bars[3].position.set(bw / 2, 0, 0);
      bars[3].scale.set(T, bh, 1);
      label.position.x = cur.x - bw / 2 + 1.15 / 2 - T / 2;
      label.position.y = cur.y + bh / 2 + 0.13;
      label.visible = w > 0.6;

      inner.rotation.y = Math.sin(t * 0.35) * 0.12 + (p - 0.5) * -0.7 * w;
      inner.rotation.x = Math.sin(t * 0.27 + 1) * 0.05;
    },
  };
}

/* ============================================================
   2. Culture dish, with a reaction-diffusion colony growing in it
   ============================================================ */

class GrayScott {
  size = 256;
  a: THREE.WebGLRenderTarget;
  b: THREE.WebGLRenderTarget;
  scene = new THREE.Scene();
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  mat: THREE.ShaderMaterial;

  constructor(private renderer: THREE.WebGLRenderer) {
    const opts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
    };
    this.a = new THREE.WebGLRenderTarget(this.size, this.size, opts);
    this.b = new THREE.WebGLRenderTarget(this.size, this.size, opts);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uTexel: { value: new THREE.Vector2(1 / this.size, 1 / this.size) },
        uF: { value: 0.0367 },
        uK: { value: 0.0649 },
        uSeed: { value: new THREE.Vector3(-1, -1, 0) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uState;
        uniform vec2 uTexel;
        uniform float uF;
        uniform float uK;
        uniform vec3 uSeed;
        void main() {
          vec2 c = texture2D(uState, vUv).rg;
          vec2 l = -c;
          l += 0.2 * texture2D(uState, vUv + vec2(uTexel.x, 0.0)).rg;
          l += 0.2 * texture2D(uState, vUv - vec2(uTexel.x, 0.0)).rg;
          l += 0.2 * texture2D(uState, vUv + vec2(0.0, uTexel.y)).rg;
          l += 0.2 * texture2D(uState, vUv - vec2(0.0, uTexel.y)).rg;
          l += 0.05 * texture2D(uState, vUv + uTexel).rg;
          l += 0.05 * texture2D(uState, vUv - uTexel).rg;
          l += 0.05 * texture2D(uState, vUv + vec2(uTexel.x, -uTexel.y)).rg;
          l += 0.05 * texture2D(uState, vUv + vec2(-uTexel.x, uTexel.y)).rg;
          float abb = c.r * c.g * c.g;
          // the rule drifts a little from the centre outward, for variety
          float r = distance(vUv, vec2(0.5));
          float f = uF + r * 0.002;
          vec2 n = c + vec2(1.0 * l.r - abb + f * (1.0 - c.r), 0.5 * l.g + abb - (uK + f) * c.g);
          if (r > 0.468) n = vec2(1.0, 0.0);
          if (distance(vUv, uSeed.xy) < uSeed.z) n.g = 0.9;
          gl_FragColor = vec4(clamp(n, 0.0, 1.0), 0.0, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
    this.reset();
  }

  reset() {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    const col = new THREE.Color();
    r.getClearColor(col);
    const alpha = r.getClearAlpha();
    r.setClearColor(new THREE.Color(1, 0, 0), 1);
    for (const rt of [this.a, this.b]) {
      r.setRenderTarget(rt);
      r.clear();
    }
    r.setClearColor(col, alpha);
    r.setRenderTarget(prev);
  }

  step(n: number, f: number, k: number, seed?: THREE.Vector3) {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    this.mat.uniforms.uF.value = f;
    this.mat.uniforms.uK.value = k;
    for (let i = 0; i < n; i++) {
      this.mat.uniforms.uState.value = this.a.texture;
      this.mat.uniforms.uSeed.value.copy(i === 0 && seed ? seed : NO_SEED);
      r.setRenderTarget(this.b);
      r.render(this.scene, this.cam);
      const s = this.a;
      this.a = this.b;
      this.b = s;
    }
    r.setRenderTarget(prev);
  }
}
const NO_SEED = new THREE.Vector3(-1, -1, 0);

export function buildDish(ctx: SpecimenCtx): Specimen {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const R = 1.55;
  const H = 0.36;
  const TH = 0.05;

  // agar surface, driven by the simulation
  const sim = new GrayScott(ctx.renderer);
  const agarMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: sim.a.texture },
      uTexel: { value: new THREE.Vector2(1 / sim.size, 1 / sim.size) },
      uAgar: { value: new THREE.Color('#F7E4A4') },
      uColony: { value: new THREE.Color('#0E5A53') },
      uRim: { value: new THREE.Color('#FBF1C9') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform sampler2D uState;
      uniform vec2 uTexel;
      uniform vec3 uAgar;
      uniform vec3 uColony;
      uniform vec3 uRim;
      void main() {
        float b = texture2D(uState, vUv).g;
        float bx = texture2D(uState, vUv + vec2(uTexel.x * 1.5, 0.0)).g - texture2D(uState, vUv - vec2(uTexel.x * 1.5, 0.0)).g;
        float by = texture2D(uState, vUv + vec2(0.0, uTexel.y * 1.5)).g - texture2D(uState, vUv - vec2(0.0, uTexel.y * 1.5)).g;
        float m = smoothstep(0.1, 0.26, b);
        float rim = smoothstep(0.05, 0.13, b) * (1.0 - smoothstep(0.18, 0.32, b));
        vec3 n = normalize(vec3(-bx * 7.0, -by * 7.0, 1.0));
        float spec = pow(max(dot(n, normalize(vec3(0.35, 0.55, 0.75))), 0.0), 26.0);
        vec3 col = mix(uAgar, uColony, m);
        col = mix(col, uRim, rim * 0.75);
        col += spec * 0.45 * m;
        float r = distance(vUv, vec2(0.5));
        col *= 1.0 - smoothstep(0.38, 0.5, r) * 0.22;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const agar = new THREE.Mesh(new THREE.CircleGeometry(R - TH - 0.005, 96), agarMat);
  agar.rotation.x = -Math.PI / 2;
  agar.position.y = TH + 0.07;
  inner.add(agar);

  // glass: a lathe-turned wall and base
  const prof = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(R - 0.03, 0),
    new THREE.Vector2(R, 0.03),
    new THREE.Vector2(R, H),
    new THREE.Vector2(R - TH, H),
    new THREE.Vector2(R - TH, TH),
    new THREE.Vector2(0, TH),
  ];
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.2,
    roughness: 0.02,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glassMat);
  glass.renderOrder = 2;
  inner.add(glass);
  // a bright lip so the rim reads against any background
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(R - TH / 2, TH / 2, 10, 96),
    new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.55,
      roughness: 0.02,
      clearcoat: 1,
      envMapIntensity: 2.4,
    }),
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = H;
  lip.renderOrder = 3;
  inner.add(lip);

  inner.position.y = -H / 2;

  const r = rng(11);
  const CORAL_F = 0.0545;
  const CORAL_K = 0.062;
  const seed = new THREE.Vector3();
  const sow = (spread: number) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * spread;
    return seed.set(0.5 + Math.cos(a) * d, 0.5 + Math.sin(a) * d, 0.014 + r() * 0.012);
  };
  // in the still life the dish holds a colony that has already grown
  for (let i = 0; i < 16; i++) sim.step(6, CORAL_F, CORAL_K, sow(0.36));
  sim.step(2600, CORAL_F, CORAL_K);
  agarMat.uniforms.uState.value = sim.a.texture;

  let sowing = 0;
  let wasSolo = false;
  let plopAt = 0;
  let frame = 0;

  return {
    group,
    update(dt, t, p, w) {
      inner.rotation.y = t * 0.12;
      if (w < 0.02) return;
      const solo = w > 0.6;
      if (solo && !wasSolo) {
        // on arrival: wipe the dish and start again from a few cells
        sim.reset();
        sowing = 9;
      }
      wasSolo = solo;
      frame++;
      let s: THREE.Vector3 | undefined;
      if (sowing > 0 && frame % 5 === 0) {
        s = sow(0.2);
        sowing--;
        ctx.emit('plop');
      }
      // growth never quite settles: the rule drifts, and scrolling pushes it toward finer structure
      const f = CORAL_F - 0.004 * p + Math.sin(t * 0.21) * 0.0012;
      if (solo) sim.step(14, f, CORAL_K, s);
      else if (frame % 3 === 0) sim.step(2, f, CORAL_K);
      agarMat.uniforms.uState.value = sim.a.texture;
      if (solo && t > plopAt) {
        ctx.emit('plop');
        plopAt = t + 0.6 + r() * 1.8;
      }
    },
  };
}

/* ============================================================
   3. Red onion, halved, its layers pulled apart into a graph
   ============================================================ */

function onionProfile() {
  const ctrl = [
    [0.0, -0.9],
    [0.38, -0.87],
    [0.82, -0.6],
    [1.0, -0.14],
    [0.95, 0.28],
    [0.64, 0.7],
    [0.28, 1.0],
    [0.13, 1.25],
    [0.085, 1.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pts = new THREE.SplineCurve(ctrl).getPoints(44);
  pts[0].x = 0;
  return pts;
}

function skinTexture(i: number, n: number) {
  const pale = i / (n - 1);
  return canvasTex(512, 512, (x, w, h) => {
    const r = rng(31 + i);
    const base = new THREE.Color('#7A1F55').lerp(new THREE.Color('#EBD0E0'), pale * 0.42);
    x.fillStyle = `#${base.getHexString()}`;
    x.fillRect(0, 0, w, h);
    // veins run from root to neck
    for (let k = 0; k < 260; k++) {
      const px = r() * w;
      const c = new THREE.Color(r() > 0.5 ? '#B4508A' : '#4E0F36').lerp(new THREE.Color('#F4E3EC'), pale * 0.4);
      x.strokeStyle = `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${0.18 + r() * 0.3})`;
      x.lineWidth = 0.6 + r() * 2.6;
      x.beginPath();
      x.moveTo(px, 0);
      x.bezierCurveTo(px + (r() - 0.5) * 14, h * 0.33, px + (r() - 0.5) * 14, h * 0.66, px + (r() - 0.5) * 8, h);
      x.stroke();
    }
    // dry copper neck at the top (v = 1 is the top of the canvas)
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, i === 0 ? 'rgba(196,128,70,0.95)' : 'rgba(240,222,210,0.8)');
    g.addColorStop(0.2, 'rgba(196,128,70,0)');
    g.addColorStop(0.9, 'rgba(250,236,244,0)');
    g.addColorStop(1, 'rgba(250,236,244,0.85)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  });
}

export function buildOnion(ctx: SpecimenCtx): Specimen {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const P = onionProfile();
  const N = 6;
  const STEP = 0.135;
  const THICK = 0.085;
  const shells: THREE.Group[] = [];

  const fleshMat = new THREE.MeshPhysicalMaterial({
    color: '#F8ECF3',
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    sheen: 0.6,
    sheenColor: new THREE.Color('#E6A8CB'),
  });
  const edgeRingMat = new THREE.MeshBasicMaterial({ color: '#8E2A60', side: THREE.DoubleSide });
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: '#E3B4CF',
    roughness: 0.4,
    clearcoat: 0.4,
    side: THREE.BackSide,
  });

  for (let i = 0; i < N; i++) {
    const so = 1 - i * STEP;
    const si = so - THICK;
    const core = i === N - 1;
    const shell = new THREE.Group();

    const outerPts = P.map((v) => v.clone().multiplyScalar(so));
    const outer = new THREE.Mesh(
      new THREE.LatheGeometry(outerPts, 56, 0, Math.PI),
      new THREE.MeshPhysicalMaterial({
        map: skinTexture(i, N),
        roughness: i === 0 ? 0.42 : 0.3,
        clearcoat: i === 0 ? 0.5 : 0.8,
        clearcoatRoughness: 0.28,
        sheen: 0.5,
        sheenColor: new THREE.Color('#F2A6D0'),
        side: THREE.DoubleSide,
      }),
    );
    shell.add(outer);

    // the cut face: a flat band between this layer's outer and inner wall
    const face = new THREE.Shape();
    face.moveTo(outerPts[0].x, outerPts[0].y);
    for (let k = 1; k < outerPts.length; k++) face.lineTo(outerPts[k].x, outerPts[k].y);
    for (let k = outerPts.length - 1; k >= 1; k--) face.lineTo(-outerPts[k].x, outerPts[k].y);
    face.closePath();
    if (!core) {
      const innerPts = P.map((v) => v.clone().multiplyScalar(si));
      const hole = new THREE.Path();
      hole.moveTo(innerPts[0].x, innerPts[0].y);
      for (let k = 1; k < innerPts.length; k++) hole.lineTo(innerPts[k].x, innerPts[k].y);
      for (let k = innerPts.length - 1; k >= 1; k--) hole.lineTo(-innerPts[k].x, innerPts[k].y);
      hole.closePath();
      face.holes.push(hole);
      shell.add(new THREE.Mesh(new THREE.LatheGeometry(innerPts, 56, 0, Math.PI), innerMat));
    }
    const cap = new THREE.Mesh(new THREE.ShapeGeometry(face, 8), fleshMat);
    cap.rotation.y = -Math.PI / 2;
    cap.material.side = THREE.DoubleSide;
    shell.add(cap);

    // the purple membrane, seen edge-on where the knife went through
    const rimPts = P.map((v) => v.clone().multiplyScalar(so - 0.022));
    const rim = new THREE.Shape();
    rim.moveTo(outerPts[0].x, outerPts[0].y);
    for (let k = 1; k < outerPts.length; k++) rim.lineTo(outerPts[k].x, outerPts[k].y);
    for (let k = outerPts.length - 1; k >= 1; k--) rim.lineTo(-outerPts[k].x, outerPts[k].y);
    rim.closePath();
    const rimHole = new THREE.Path();
    rimHole.moveTo(rimPts[0].x, rimPts[0].y);
    for (let k = 1; k < rimPts.length; k++) rimHole.lineTo(rimPts[k].x, rimPts[k].y);
    for (let k = rimPts.length - 1; k >= 1; k--) rimHole.lineTo(-rimPts[k].x, rimPts[k].y);
    rimHole.closePath();
    rim.holes.push(rimHole);
    const rimMesh = new THREE.Mesh(new THREE.ShapeGeometry(rim, 8), edgeRingMat);
    rimMesh.rotation.y = -Math.PI / 2;
    rimMesh.position.x = -0.004;
    shell.add(rimMesh);

    inner.add(shell);
    shells.push(shell);
  }

  // the region graph: photo, object, parts and suspicious spots
  const nodeMat = new THREE.MeshBasicMaterial({ color: '#C6D63A', toneMapped: false });
  const edgeMat = new THREE.MeshBasicMaterial({ color: '#C6D63A', toneMapped: false, transparent: true, opacity: 0.85 });
  const nodeGeo = new THREE.SphereGeometry(0.055, 16, 12);
  const NODES: { shell: number; at: THREE.Vector3 }[] = [
    { shell: 0, at: new THREE.Vector3(-0.02, 0.86, 0.3) },
    { shell: 1, at: new THREE.Vector3(-0.02, -0.25, -0.82) },
    { shell: 2, at: new THREE.Vector3(-0.02, 0.2, 0.66) },
    { shell: 3, at: new THREE.Vector3(-0.02, -0.4, 0.42) },
    { shell: 4, at: new THREE.Vector3(-0.02, 0.18, -0.4) },
    { shell: 5, at: new THREE.Vector3(-0.02, -0.05, 0.04) },
  ];
  const EDGES = [
    [0, 2],
    [0, 4],
    [1, 4],
    [1, 3],
    [2, 3],
    [2, 5],
    [3, 5],
    [4, 5],
    [1, 5],
  ];
  const nodes = NODES.map((n) => {
    const m = new THREE.Mesh(nodeGeo, nodeMat);
    m.position.copy(n.at);
    shells[n.shell].add(m);
    return m;
  });
  const edgeGeo = new THREE.CylinderGeometry(0.009, 0.009, 1, 6);
  edgeGeo.translate(0, 0.5, 0);
  const edges = EDGES.map(() => {
    const m = new THREE.Mesh(edgeGeo, edgeMat);
    inner.add(m);
    return m;
  });

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  let lastP = 0;
  inner.position.y = -0.25;

  return {
    group,
    update(dt, t, p, w) {
      const open = THREE.MathUtils.smoothstep(p, 0.05, 0.7) * w;
      for (let i = 0; i < N; i++) {
        shells[i].position.x = -i * 0.5 * open;
        shells[i].rotation.y = Math.sin(t * 0.5 + i) * 0.03 * open;
      }
      inner.rotation.y = Math.sin(t * 0.3) * 0.1 + open * 0.2;
      const g = THREE.MathUtils.smoothstep(p, 0.3, 0.85) * w;
      for (const n of nodes) n.scale.setScalar(Math.max(0.001, THREE.MathUtils.smoothstep(g, 0, 0.4)));
      edges.forEach((e, i) => {
        const [ia, ib] = EDGES[i];
        inner.worldToLocal(nodes[ia].getWorldPosition(a));
        inner.worldToLocal(nodes[ib].getWorldPosition(b));
        dir.subVectors(b, a);
        const len = dir.length();
        const grow = THREE.MathUtils.smoothstep(g, 0.25 + i * 0.05, 0.6 + i * 0.045);
        e.position.copy(a);
        e.quaternion.setFromUnitVectors(up, dir.normalize());
        e.scale.set(1, Math.max(0.0001, len * grow), 1);
        e.visible = grow > 0.001;
      });
      if (w > 0.6 && Math.abs(p - lastP) > 0.012) {
        ctx.emit('crackle', Math.min(1, Math.abs(p - lastP) * 30));
        lastP = p;
      }
    },
  };
}

/* ============================================================
   4. Hard drive, lid off
   ============================================================ */

export function buildDrive(ctx: SpecimenCtx): Specimen {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const body = new THREE.MeshPhysicalMaterial({ color: '#20262a', metalness: 0.9, roughness: 0.5, clearcoat: 0.2 });
  const alu = new THREE.MeshPhysicalMaterial({ color: '#c9d0d4', metalness: 1, roughness: 0.28 });

  // chassis: a tray with a raised wall
  const CW = 3.5;
  const CD = 2.55;
  const tray = new THREE.ExtrudeGeometry(roundedRect(CW, CD, 0.14), {
    depth: 0.16,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 2,
    curveSegments: 8,
  });
  tray.rotateX(-Math.PI / 2);
  const trayMesh = new THREE.Mesh(tray, body);
  trayMesh.position.y = -0.2;
  inner.add(trayMesh);

  const wallShape = roundedRect(CW, CD, 0.14);
  const wallHole = roundedRect(CW - 0.2, CD - 0.2, 0.08);
  wallShape.holes.push(new THREE.Path(wallHole.getPoints(8)));
  const wall = new THREE.ExtrudeGeometry(wallShape, { depth: 0.3, bevelEnabled: false, curveSegments: 8 });
  wall.rotateX(-Math.PI / 2);
  const wallMesh = new THREE.Mesh(wall, body);
  wallMesh.position.y = -0.04;
  inner.add(wallMesh);

  // green board peeking out underneath
  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(CW * 0.6, 0.03, CD * 0.5),
    new THREE.MeshPhysicalMaterial({ color: '#0F6B4E', roughness: 0.5, clearcoat: 0.7 }),
  );
  pcb.position.set(0.5, -0.24, 0.62);
  inner.add(pcb);

  // platters
  const CX = -0.48;
  const PR = 1.08;
  const streaks = canvasTex(
    512,
    8,
    (x, w, h) => {
      const r = rng(5);
      x.fillStyle = 'rgb(0,22,0)';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const g = 10 + r() * 70;
        x.fillStyle = `rgba(0,${g | 0},0,${0.3 + r() * 0.5})`;
        x.fillRect(r() * w, 0, 2 + r() * 22, h);
      }
    },
    false,
  );
  streaks.wrapS = THREE.RepeatWrapping;
  const platterMat = new THREE.MeshPhysicalMaterial({
    color: '#c3ccd3',
    metalness: 1,
    roughness: 1,
    roughnessMap: streaks,
    iridescence: 0.22,
    iridescenceIOR: 1.9,
    iridescenceThicknessMinimum: 180,
    iridescenceThicknessMaximum: 520,
    envMapIntensity: 1.7,
  });
  const disc = [
    new THREE.Vector2(0.3, 0),
    new THREE.Vector2(PR, 0),
    new THREE.Vector2(PR, 0.03),
    new THREE.Vector2(0.3, 0.03),
    new THREE.Vector2(0.3, 0),
  ];
  const spin = new THREE.Group();
  spin.position.set(CX, 0, 0);
  inner.add(spin);
  for (const y of [0.0, 0.11]) {
    const m = new THREE.Mesh(new THREE.LatheGeometry(disc, 128), platterMat);
    m.position.y = y;
    spin.add(m);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.2, 48), alu);
  hub.position.y = 0.08;
  spin.add(hub);
  const dark = new THREE.MeshStandardMaterial({ color: '#15191b', metalness: 0.6, roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 12), dark);
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.2, 0.185, Math.sin(a) * 0.2);
    spin.add(s);
  }
  // the band the model says is wearing out
  const wearMat = new THREE.MeshBasicMaterial({
    color: '#F0A23B',
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const wear = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.82, 64, 1, 0, 1.35), wearMat);
  wear.rotation.x = -Math.PI / 2;
  wear.position.y = 0.143;
  spin.add(wear);

  // actuator arm
  const PX = 1.17;
  const PZ = 0.78;
  const L = 1.36;
  const armShape = new THREE.Shape();
  armShape.moveTo(0.17, -0.2);
  armShape.lineTo(0.42, -0.16);
  armShape.lineTo(0.42, 0.16);
  armShape.lineTo(0.17, 0.2);
  armShape.lineTo(-L, 0.035);
  armShape.lineTo(-L, -0.035);
  armShape.closePath();
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: 0.035, bevelEnabled: false });
  armGeo.rotateX(-Math.PI / 2);
  const arm = new THREE.Group();
  arm.add(new THREE.Mesh(armGeo, alu));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.08), dark);
  head.position.set(-L + 0.03, 0.0, 0);
  arm.add(head);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 32), alu);
  pivot.position.y = -0.03;
  arm.add(pivot);
  arm.position.set(PX, 0.175, PZ);
  inner.add(arm);

  // corner screws
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), alu);
    s.position.set(sx * (CW / 2 - 0.09), 0.265, sz * (CD / 2 - 0.09));
    inner.add(s);
  }

  const BASE = -THREE.MathUtils.degToRad(25.5);
  const A0 = THREE.MathUtils.degToRad(9);
  const A1 = THREE.MathUtils.degToRad(34);
  const r = rng(3);
  let target = 0.5;
  let cur = 0.5;
  let nextSeek = 0;
  let omega = 2;

  return {
    group,
    update(dt, t, p, w) {
      const want = 2.4 + Math.min(40, Math.abs(ctx.scrollSpeed()) * 0.012) * w;
      omega = damp(omega, want, 2.5, dt);
      spin.rotation.y -= omega * dt;
      wearMat.opacity = 0.55 + Math.sin(t * 4) * 0.35;
      if (t > nextSeek) {
        // as you scroll, the head settles on the worn band
        target = w > 0.6 && p > 0.6 ? 0.56 + (r() - 0.5) * 0.08 : r();
        nextSeek = t + 0.35 + r() * 1.3;
        if (w > 0.6) ctx.emit('seek');
      }
      cur = damp(cur, target, 16, dt);
      arm.rotation.y = BASE + THREE.MathUtils.lerp(A0, A1, cur);
      if (w > 0.05) ctx.emit('spin', omega * w);
      inner.rotation.y = Math.sin(t * 0.25) * 0.12 + (p - 0.5) * 0.5 * w;
    },
  };
}
