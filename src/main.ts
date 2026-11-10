import '@fontsource-variable/anybody/wdth.css';
import '@fontsource-variable/brygada-1918/wght.css';
import '@fontsource-variable/brygada-1918/wght-italic.css';
import 'lenis/dist/lenis.css';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { flagships, more, offHours, person, record, worlds, type Flagship, type WorldKey } from './content';
import { Sound } from './audio';
import { Stage, type StageMode } from './gl/stage';
import { GateGrowth } from './gl/gate';

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s)!;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   Page content, built from content.ts
   ------------------------------------------------------------ */

const main = $('#main');
const titles = $('#titles');

function titleBlock(id: string, lines: string[], hero = false) {
  return `<div class="title${hero ? ' is-hero' : ''}" data-title="${id}">${lines
    .map((l) => `<span class="t-line">${l}</span>`)
    .join('')}</div>`;
}

titles.innerHTML =
  titleBlock('hero', person.name, true) +
  flagships.map((f) => titleBlock(f.id, f.title)).join('') +
  titleBlock('contact', ['Say hello']);

function chapter(f: Flagship, first: boolean) {
  return `
  <section class="chapter" id="${f.id}" data-world="${f.world}" data-mode="${f.specimen === 'none' ? 'away' : f.specimen}" data-title="${f.id}" data-progress="${f.specimen}">
    ${first ? '<span id="work"></span>' : ''}
    <div class="chapter-pin">
      <div class="chapter-copy">
        <h2 class="sr">${f.title.join(' ')}</h2>
        <p class="chapter-what">${f.what}</p>
        <p class="chapter-claim">${f.claim}</p>
        ${f.status ? `<p class="chapter-status">${f.status}</p>` : ''}
        <div class="chapter-actions">
          <button class="btn" type="button" data-sheet="${f.id}">Read how it works</button>
          ${f.links.map((l) => `<a class="link" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('')}
        </div>
      </div>
      <dl class="chapter-stats">
        ${f.stats
          .map((s) => `<div class="stat"><dt class="stat-value">${s.value}</dt><dd class="stat-label" style="margin-left:0">${s.label}</dd></div>`)
          .join('')}
      </dl>
    </div>
  </section>`;
}

main.innerHTML = `
  <section class="hero" id="top" data-world="scale" data-mode="cluster" data-title="hero">
    <div class="hero-pin">
      <h1 class="sr">${person.name.join(' ')}</h1>
      <p class="hero-intro">${person.intro}</p>
      <p class="hero-meta">${person.study}. ${person.where}.</p>
      <p class="hero-cue">Scroll. ${flagships.length} specimens follow.</p>
    </div>
  </section>

  ${flagships.map((f, i) => chapter(f, i === 0)).join('')}

  <section class="plain" id="more" data-world="scale" data-mode="away">
    <h2 class="plain-head">More work</h2>
    <div class="rows">
      ${more
        .map((m) => {
          const inner = `
            <span class="row-name">${m.name}</span>
            <span class="row-line">${m.line}${m.note ? ` <span class="row-note">${m.note}.</span>` : ''}</span>
            <span class="row-stack">${m.stack}</span>`;
          return m.href
            ? `<a class="row" href="${m.href}" target="_blank" rel="noopener">${inner}</a>`
            : `<div class="row">${inner}</div>`;
        })
        .join('')}
    </div>
  </section>

  <section class="plain" id="record" data-world="scale" data-mode="away">
    <h2 class="plain-head">Record</h2>
    <div class="record-grid">
      <div>
        <div class="record-block">
          <h3>Work</h3>
          ${record.work
            .map(
              (j) => `
            <div class="job">
              <div class="job-top"><span class="job-role">${j.role}</span><span class="job-when">${j.when}</span></div>
              <div class="job-place">${j.place}</div>
              <p class="job-line">${j.line}</p>
            </div>`,
            )
            .join('')}
        </div>
        <div class="record-block">
          <h3>Paper</h3>
          <p class="paper">${record.paper}</p>
        </div>
      </div>
      <div>
        <div class="record-block">
          <h3>Study</h3>
          <div class="job">
            <div class="job-role">${record.study.place}</div>
            <p class="job-line">${record.study.line}</p>
          </div>
        </div>
        <div class="record-block">
          <h3>Honours</h3>
          <ul>${record.honours.map((h) => `<li>${h}</li>`).join('')}</ul>
        </div>
        <div class="record-block">
          <h3>Certificates</h3>
          <ul>${record.certificates.map((h) => `<li>${h}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  </section>

  <section class="plain" id="off-hours" data-world="scale" data-mode="away">
    <h2 class="plain-head">Off hours</h2>
    <div class="off-grid">
      ${offHours
        .map(
          (o) => `
        <div class="off">
          <h3>${o.name}</h3>
          <p>${o.line}</p>
          <a class="link" href="${o.href}" target="_blank" rel="noopener">${o.cta}</a>
        </div>`,
        )
        .join('')}
    </div>
  </section>

  <section class="contact" id="contact" data-world="sprout" data-mode="outro" data-title="contact">
    <div class="contact-grid">
      <div>
        <h2 class="sr">Contact</h2>
        <p class="contact-lead">I am looking for machine learning and data science roles, and for research groups working on vision with little data.</p>
        <a class="contact-mail" href="mailto:${person.email}">${person.email}</a>
      </div>
      <span></span>
      <div class="contact-list">
        <a class="btn" href="${person.resume}" download>Download resume</a>
        <a class="link" href="tel:${person.phone.replace(/\s/g, '')}">${person.phone}</a>
        <a class="link" href="${person.github}" target="_blank" rel="noopener">GitHub, ${person.githubHandle}</a>
        <a class="link" href="${person.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
      </div>
    </div>
    <p class="contact-foot">${person.where}. Every object on this site is drawn by code, and every sound is synthesised in your browser.</p>
  </section>
`;

/* ------------------------------------------------------------
   Giant titles: every line is stretched along the width axis of the
   typeface until it spans the page, so short words run wide and long
   words run narrow.
   ------------------------------------------------------------ */

interface Fitted {
  el: HTMLElement;
  wdth: number;
}
const fitted = new Map<string, Fitted[]>();

function fitLine(el: HTMLElement, W: number, fs: number): { wdth: number; fs: number } {
  el.style.fontSize = `${fs}px`;
  const at = (w: number) => {
    el.style.setProperty('--wdth', String(w));
    return el.offsetWidth;
  };
  const w50 = at(50);
  if (W <= w50) return { wdth: 50, fs: (fs * W) / w50 };
  const w150 = at(150);
  if (W >= w150) return { wdth: 150, fs: (fs * W) / w150 };
  let lo = 50;
  let hi = 150;
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) < W) lo = mid;
    else hi = mid;
  }
  return { wdth: (lo + hi) / 2, fs };
}

function fitTitles() {
  const vh = window.innerHeight;
  titles.querySelectorAll<HTMLElement>('.title').forEach((block) => {
    const id = block.dataset.title!;
    const lines = [...block.querySelectorAll<HTMLElement>('.t-line')];
    const hero = block.classList.contains('is-hero');
    const cap = vh * (hero ? 0.7 : 0.36);
    const fs0 = hero ? cap / (lines.length * 0.82) : vh * (lines.length > 1 ? 0.23 : 0.31);
    let W = block.clientWidth;
    const prevVis = block.style.visibility;
    block.style.visibility = 'hidden';
    block.classList.add('is-on');
    let out: { wdth: number; fs: number }[] = [];
    for (let pass = 0; pass < 2; pass++) {
      out = lines.map((l) => fitLine(l, W, fs0));
      const total = out.reduce((s, o) => s + o.fs * 0.82, 0);
      if (total <= cap) break;
      W *= cap / total;
    }
    const live = block.dataset.live === '1';
    lines.forEach((l, i) => {
      l.style.fontSize = `${out[i].fs}px`;
      l.style.setProperty('--wdth', String(live ? out[i].wdth : 50));
    });
    if (!live) block.classList.remove('is-on');
    block.style.visibility = prevVis;
    fitted.set(
      id,
      lines.map((el, i) => ({ el, wdth: out[i].wdth })),
    );
  });
}

let liveTitle = '';
function showTitle(id: string) {
  if (id === liveTitle) return;
  liveTitle = id;
  titles.querySelectorAll<HTMLElement>('.title').forEach((block) => {
    const lines = fitted.get(block.dataset.title!) ?? [];
    const els = lines.map((l) => l.el);
    if (block.dataset.title === id) {
      block.dataset.live = '1';
      block.classList.add('is-on');
      if (reduced) {
        lines.forEach((l) => l.el.style.setProperty('--wdth', String(l.wdth)));
        gsap.set(els, { opacity: 1 });
        return;
      }
      gsap.killTweensOf(els);
      gsap.fromTo(
        els,
        { '--wdth': 50, opacity: 0 },
        {
          '--wdth': (i: number) => lines[i].wdth,
          opacity: 1,
          duration: 1.5,
          ease: 'expo.out',
          stagger: 0.09,
          delay: 0.3,
        },
      );
    } else if (block.dataset.live === '1') {
      block.dataset.live = '0';
      gsap.killTweensOf(els);
      gsap.to(els, {
        '--wdth': 50,
        opacity: 0,
        duration: reduced ? 0 : 0.4,
        ease: 'power2.in',
        onComplete: () => {
          if (block.dataset.live !== '1') block.classList.remove('is-on');
        },
      });
    }
  });
}

/* ------------------------------------------------------------
   Colour worlds and the flood between them
   ------------------------------------------------------------ */

const ground = $('#ground');
const floodEl = $('#flood');
const themeMeta = $<HTMLMetaElement>('meta[name="theme-color"]');
const sound = new Sound();
let stage: Stage | undefined;
let world: WorldKey = 'scale';
let floodTween: gsap.core.Tween | undefined;
let pendingGround = worlds.scale.ground;
let entered = false;

function setWorld(key: WorldKey, quiet = false) {
  if (key === world) return;
  world = key;
  const w = worlds[key];
  const s = document.documentElement.style;
  s.setProperty('--ground', w.ground);
  s.setProperty('--ink', w.ink);
  s.setProperty('--accent', w.accent);
  s.setProperty('--soft', w.soft);
  themeMeta.content = w.ground;
  stage?.setWorld(w);
  sound.setWorld(key);

  // finish any flood still in flight, then start the new one
  floodTween?.kill();
  ground.style.background = pendingGround;
  pendingGround = w.ground;
  floodEl.style.background = w.ground;
  if (reduced || quiet) {
    ground.style.background = w.ground;
    floodEl.style.clipPath = 'circle(0% at 50% 55%)';
    return;
  }
  if (entered) sound.flood();
  floodTween = gsap.fromTo(
    floodEl,
    { clipPath: 'circle(0% at 50% 55%)' },
    {
      clipPath: 'circle(125% at 50% 55%)',
      duration: 1.25,
      ease: 'expo.inOut',
      onComplete: () => {
        ground.style.background = w.ground;
        floodEl.style.clipPath = 'circle(0% at 50% 55%)';
      },
    },
  );
}

/* ------------------------------------------------------------
   Scroll
   ------------------------------------------------------------ */

let lenis: Lenis | undefined;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  lenis.stop();
}

function activate(section: HTMLElement) {
  document.querySelectorAll('.is-active').forEach((el) => el !== section && el.classList.remove('is-active'));
  section.classList.add('is-active');
  document.body.classList.toggle('is-plain', section.classList.contains('plain'));
  setWorld(section.dataset.world as WorldKey);
  if (stage) stage.mode = section.dataset.mode as StageMode;
  showTitle(section.dataset.title ?? '');
  if (section.dataset.mode !== 'drive') sound.spinStop();
}

function wireScroll() {
  document.querySelectorAll<HTMLElement>('#main > section').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => self.isActive && entered && activate(section),
    });
    // once a pinned screen lets go, its text fades instead of riding up over the title
    const pin = section.querySelector<HTMLElement>('.hero-pin, .chapter-pin');
    if (pin && !reduced) {
      gsap.to(pin, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'bottom bottom', end: 'bottom 62%', scrub: true },
      });
    }
    const key = section.dataset.progress;
    if (key && key !== 'none') {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (stage) stage.progress[key] = self.progress;
        },
      });
    }
  });
}

document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector<HTMLElement>(a.getAttribute('href')!);
  if (!target) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(target, { duration: 1.6 });
  else target.scrollIntoView();
});

/* ------------------------------------------------------------
   Details sheet
   ------------------------------------------------------------ */

const sheet = $('#sheet');
const sheetBody = $('#sheet-body');
let sheetOpener: HTMLElement | null = null;

function openSheet(id: string, opener: HTMLElement) {
  const f = flagships.find((x) => x.id === id);
  if (!f) return;
  sheetOpener = opener;
  sheetBody.innerHTML = `
    <h2 class="sheet-title">${f.title.join(' ')}</h2>
    <p class="sheet-what">${f.what}</p>
    ${f.details.map((d) => `<p class="sheet-p">${d}</p>`).join('')}
    ${f.figures
      .map((g) => `<figure class="sheet-fig"><img src="${g.src}" alt="" loading="lazy" /><figcaption>${g.caption}</figcaption></figure>`)
      .join('')}
    <div class="sheet-links">${f.links.map((l) => `<a class="link" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('')}</div>`;
  sheet.scrollTop = 0;
  sheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-open');
  lenis?.stop();
  $('#sheet-close').focus({ preventScroll: true });
}
function closeSheet() {
  if (!document.body.classList.contains('sheet-open')) return;
  document.body.classList.remove('sheet-open');
  sheet.setAttribute('aria-hidden', 'true');
  lenis?.start();
  sheetOpener?.focus({ preventScroll: true });
}
sheet.setAttribute('data-lenis-prevent', '');
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sheet]');
  if (b) openSheet(b.dataset.sheet!, b);
});
$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet-veil').addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSheet());

/* ------------------------------------------------------------
   Sound
   ------------------------------------------------------------ */

const soundBtn = $<HTMLButtonElement>('#sound');
function paintSound() {
  soundBtn.textContent = sound.on ? 'Sound on' : 'Sound off';
  soundBtn.setAttribute('aria-pressed', String(sound.on));
}
soundBtn.addEventListener('click', async () => {
  if (sound.on) sound.setOn(false);
  else await sound.start();
  paintSound();
});
document.addEventListener(
  'pointerenter',
  (e) => {
    const t = e.target as HTMLElement;
    if (t.matches?.('a, button')) sound.tick();
  },
  true,
);
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('a, button')) sound.press();
});

/* ------------------------------------------------------------
   Start
   ------------------------------------------------------------ */

const gate = $('#gate');
const enterSound = $<HTMLButtonElement>('#enter-sound');
const enterQuiet = $<HTMLButtonElement>('#enter-quiet');
enterSound.disabled = enterQuiet.disabled = true;
document.body.classList.add('locked');

let growth: GateGrowth | undefined;

async function boot() {
  await Promise.all([
    document.fonts.load("900 40px 'Anybody Variable'"),
    document.fonts.load("700 40px 'Anybody Variable'"),
    document.fonts.load("italic 500 40px 'Brygada 1918 Variable'"),
    document.fonts.load("400 20px 'Brygada 1918 Variable'"),
  ]);
  fitTitles();

  // the entry screen grows the name from one cell; without WebGL or with reduced motion it stays as plain type
  if (reduced) gate.classList.remove('gate-live');
  else {
    try {
      growth = new GateGrowth($<HTMLCanvasElement>('#gate-canvas'), gate, $('.gate-name'));
    } catch (err) {
      gate.classList.remove('gate-live');
      growth = undefined;
      console.warn('entry animation unavailable', err);
    }
  }

  try {
    stage = new Stage($<HTMLCanvasElement>('#gl'));
    stage.mode = 'away';
    stage.setWorld(worlds.scale);
    stage.onEvent = (name, data) => {
      if (name === 'lock') sound.lock(data);
      else if (name === 'plop') sound.plop();
      else if (name === 'crackle') sound.crackle(data);
      else if (name === 'seek') sound.seek();
      else if (name === 'spin') sound.spin(stage!.mode === 'drive' ? (data ?? 0) : 0);
    };
  } catch (err) {
    // no WebGL: the page still works as type and colour
    console.warn('3D stage unavailable', err);
  }

  if (import.meta.env.DEV && growth) {
    const g = growth;
    (window as unknown as Record<string, unknown>).__grow = (n = 200) => {
      g.step(n);
      g.tick(performance.now() / 1000, 1 / 60);
    };
  }
  if (import.meta.env.DEV && stage) {
    // dev only: run the stage forward without waiting for frames
    const s = stage;
    (window as unknown as Record<string, unknown>).__settle = (n = 300) => {
      let t = performance.now() / 1000;
      for (let i = 0; i < n; i++) s.tick((t += 1 / 60), 1 / 60);
    };
  }

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    lenis?.raf(time * 1000);
    growth?.tick(time, deltaMs / 1000);
    if (stage) {
      stage.scrollSpeed = (lenis?.velocity ?? 0) * 60;
      stage.tick(time, deltaMs / 1000);
    }
  });

  wireScroll();
  let rt = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(() => {
      fitTitles();
      ScrollTrigger.refresh();
    }, 150);
  });

  $('#gate-load').textContent = '';
  enterSound.disabled = enterQuiet.disabled = false;
  enterSound.focus({ preventScroll: true });
}

async function enter(withSound: boolean) {
  if (entered) return;
  if (withSound) {
    try {
      await sound.start();
    } catch {
      /* audio blocked: carry on in silence */
    }
  }
  paintSound();
  entered = true;
  document.body.classList.remove('locked');
  lenis?.start();
  window.scrollTo(0, 0);
  ScrollTrigger.refresh();

  const first = document.querySelector<HTMLElement>('#top')!;
  const done = () => {
    gate.style.display = 'none';
    growth?.dispose();
    growth = undefined;
  };
  if (reduced) done();
  else gsap.to(gate, { clipPath: 'circle(0% at 50% 50%)', duration: 1.2, ease: 'expo.inOut', onComplete: done });
  if (withSound) sound.flood();
  window.setTimeout(() => activate(first), reduced ? 0 : 350);
}

enterSound.addEventListener('click', () => enter(true));
enterQuiet.addEventListener('click', () => enter(false));

boot();
