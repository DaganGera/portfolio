import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildDish, buildDrive, buildOnion, buildPlate, type Specimen } from './specimens';
import type { SpecimenKey, World } from '../content';

interface Pose {
  p: THREE.Vector3;
  q: THREE.Quaternion;
  s: number;
}
const pose = (x: number, y: number, z: number, rx: number, ry: number, rz: number, s: number): Pose => ({
  p: new THREE.Vector3(x, y, z),
  q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
  s,
});

interface Actor {
  spec: Specimen;
  cluster: Pose; // in the still life on the first and last screens
  solo: Pose; // alone on stage in its own chapter
  outro: Pose; // lined up across the last screen
  w: number; // 0 away, 1 on stage
  phase: number;
  shadow: THREE.Mesh;
  shadowSize: [number, number];
}

/* 'cluster' shows all four together, 'away' clears the stage, anything else is one specimen alone */
export type StageMode = 'cluster' | 'outro' | 'away' | Exclude<SpecimenKey, 'none'>;

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  root = new THREE.Group();
  actors: Partial<Record<Exclude<SpecimenKey, 'none'>, Actor>> = {};
  mode: StageMode = 'cluster';
  progress: Record<string, number> = {};
  scrollSpeed = 0;
  onEvent: (name: string, data?: number) => void = () => {};

  private mouse = new THREE.Vector2();
  private mouseT = new THREE.Vector2();
  private rim = new THREE.DirectionalLight('#8E2A60', 3);
  private hemi = new THREE.HemisphereLight('#EDE3EA', '#BFA5B6', 0.9);
  private rimT = new THREE.Color('#8E2A60');
  private skyT = new THREE.Color('#EDE3EA');
  private fit = 1;
  private aspect = 1;
  private tmpP = new THREE.Vector3();
  private clusterShift = new THREE.Vector3();
  private shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    this.scene.environmentIntensity = 0.58;

    this.camera.position.set(0, 0, 12);
    this.scene.add(this.root);

    const key = new THREE.DirectionalLight('#fff4e6', 1.9);
    key.position.set(3.5, 5, 6);
    this.scene.add(key);
    this.rim.position.set(-5, 2.5, -3);
    this.scene.add(this.rim);
    this.scene.add(this.hemi);

    const ctx = {
      renderer: this.renderer,
      emit: (n: string, d?: number) => this.onEvent(n, d),
      scrollSpeed: () => this.scrollSpeed,
    };

    this.add(
      'plate',
      buildPlate(ctx),
      pose(-4.0, 0.1, -0.4, -0.2, 0.5, -0.16, 0.7),
      pose(0, 0.0, 0, -0.32, 0.3, 0.04, 1.15),
      pose(-3.7, 0.25, -0.2, -0.25, 0.45, -0.1, 0.6),
      [3.9, 2.7],
    );
    this.add(
      'dish',
      buildDish(ctx),
      pose(-0.2, -1.9, 1.2, 0.95, 0, 0.1, 0.72),
      pose(0, -0.15, 0, 0.98, 0, 0, 1.22),
      pose(-1.2, -0.15, 0.6, 0.95, 0, 0.08, 0.6),
      [3.6, 2.5],
    );
    this.add(
      'onion',
      buildOnion(ctx),
      pose(3.35, -1.45, 1.0, 0.08, Math.PI / 2 - 0.75, 0.1, 0.92),
      pose(0.75, -0.1, 0, 0.12, Math.PI / 2 - 0.5, 0, 1.2),
      pose(1.25, 0.1, 0.6, 0.08, Math.PI / 2 - 0.7, 0.08, 0.7),
      [2.6, 3.0],
    );
    this.add(
      'drive',
      buildDrive(ctx),
      pose(4.25, 2.0, -0.8, 0.95, -0.45, 0.22, 0.62),
      pose(0, -0.1, 0, 0.92, -0.3, 0, 1.12),
      pose(3.75, 0.45, -0.2, 0.95, -0.4, 0.18, 0.56),
      [4.0, 2.8],
    );

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.mouseT.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    });
  }

  private add(key: Exclude<SpecimenKey, 'none'>, spec: Specimen, cluster: Pose, solo: Pose, outro: Pose, shadowSize: [number, number]) {
    // a soft shadow on the page behind each specimen, so it sits in the layout instead of floating over it
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, opacity: 0.3, depthWrite: false, color: '#1a0614', toneMapped: false }),
    );
    shadow.renderOrder = -1;
    this.root.add(shadow);
    const actor: Actor = { spec, cluster, solo, outro, w: 0, phase: Object.keys(this.actors).length * 1.7, shadow, shadowSize };
    this.actors[key] = actor;
    spec.group.position.copy(cluster.p);
    spec.group.quaternion.copy(cluster.q);
    spec.group.scale.setScalar(cluster.s);
    this.root.add(spec.group);
  }

  setWorld(w: World) {
    this.rimT.set(w.accent);
    this.skyT.set(w.ground);
  }

  /* where the cluster sits: centred on the first screen, pushed right on the last */
  setClusterShift(x: number, y: number) {
    this.clusterShift.set(x, y, 0);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.aspect = w / h;
    this.fit = Math.min(1, this.aspect / 1.65);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  tick(t: number, dt: number) {
    dt = Math.min(dt, 0.05);
    const k = 1 - Math.exp(-3.2 * dt);
    this.mouse.lerp(this.mouseT, 1 - Math.exp(-4 * dt));
    this.root.rotation.y = this.mouse.x * 0.1;
    this.root.rotation.x = this.mouse.y * 0.06;
    this.rim.color.lerp(this.rimT, k);
    this.hemi.color.lerp(this.skyT, k);
    this.hemi.groundColor.lerp(this.skyT, k);

    for (const [key, a] of Object.entries(this.actors)) {
      const g = a.spec.group;
      const solo = this.mode === key;
      const outro = this.mode === 'outro';
      const cluster = this.mode === 'cluster' || outro;
      const rest = outro ? a.outro : a.cluster;
      let scale: number;
      if (solo) {
        this.tmpP.copy(a.solo.p);
        this.tmpP.x *= this.fit;
        if (this.fit < 0.75) this.tmpP.y += 0.9;
        g.quaternion.slerp(a.solo.q, k);
        scale = a.solo.s * THREE.MathUtils.lerp(0.36, 1, this.fit);
      } else if (cluster) {
        this.tmpP.copy(rest.p);
        this.tmpP.x *= Math.min(1, this.aspect / 1.78);
        if (this.fit < 0.6) {
          // tall screens: gather everything into the band between the name and the text
          this.tmpP.y = outro ? (a.phase % 3.4 < 1.7 ? 1.0 : 0.1) : this.tmpP.y * 0.42 - 0.15;
        }
        this.tmpP.add(this.clusterShift);
        g.quaternion.slerp(rest.q, k);
        scale = rest.s * THREE.MathUtils.lerp(0.5, 1, this.fit);
      } else {
        // leave the way it came, well past the edge of the frame
        this.tmpP.copy(a.cluster.p).setZ(0).normalize().multiplyScalar(11 * Math.max(1, this.aspect / 1.4));
        this.tmpP.z = -2;
        g.quaternion.slerp(a.cluster.q, k * 0.5);
        scale = a.cluster.s * 0.8;
      }
      this.tmpP.y += Math.sin(t * 0.7 + a.phase) * 0.07;
      g.position.lerp(this.tmpP, k);
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, scale, k));
      a.w = THREE.MathUtils.lerp(a.w, solo ? 1 : cluster ? 0.25 : 0, k);
      g.visible = solo || cluster || g.position.length() < 9.5;
      a.shadow.visible = g.visible;
      a.shadow.position.set(g.position.x + 0.35 * g.scale.x, g.position.y - 0.55 * g.scale.x, g.position.z - 1.6);
      a.shadow.scale.set(a.shadowSize[0] * g.scale.x, a.shadowSize[1] * g.scale.x, 1);
      if (g.visible) a.spec.update(dt, t, solo ? (this.progress[key] ?? 0) : 0, a.w);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
