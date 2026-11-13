// Motion of the home page: the hero, the layer stack and the viewport.
// Everything else on the page stands still.

import { gsap, ScrollTrigger, SplitText, reduced } from './core';
import { Accumulator, targetFromCanvas } from './accumulate';
import { initHeroStage } from './hero-stage';
import { initViewport } from './viewport';
import { initAov } from './aov';
import wm from '../components/brand/wordmark.json';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Where the dot sits inside the wordmark, as fractions of its box.
const DOT_X = wm.dot.cx / wm.w;
const DOT_Y = wm.dot.cy / wm.h;
const COUNTER_W = 235.6 / wm.w;
const COUNTER_H = 305.6 / wm.h;

function paintWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const s = width / wm.w;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#f9f7f3';
  for (const d of [wm.N, wm.O, wm.V, wm.A]) ctx.fill(new Path2D(d), 'evenodd');
  const g = ctx.createRadialGradient(wm.dot.cx, wm.dot.cy, 0, wm.dot.cx, wm.dot.cy, wm.dot.glow);
  g.addColorStop(0, 'rgba(254,72,25,0.5)');
  g.addColorStop(0.34, 'rgba(254,72,25,0.42)');
  g.addColorStop(0.43, 'rgba(254,72,25,0.26)');
  g.addColorStop(0.57, 'rgba(254,72,25,0.12)');
  g.addColorStop(0.76, 'rgba(254,72,25,0.04)');
  g.addColorStop(1, 'rgba(254,72,25,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(wm.dot.cx, wm.dot.cy, wm.dot.glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fe4819';
  ctx.beginPath();
  ctx.arc(wm.dot.cx, wm.dot.cy, wm.dot.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Offset of `el` inside `root`, from layout (transforms are ignored). */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

// ------------------------------------------------------------------------ hero
function initHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero || reduced) return;

  const pin = hero.querySelector<HTMLElement>('[data-hero-pin]')!;
  const wordmark = hero.querySelector<HTMLElement>('[data-hero-wm]')!;
  const svg = wordmark.querySelector<SVGSVGElement>('svg')!;
  const letters = svg.querySelectorAll('.wm-letter');
  const dot = svg.querySelector('.wm-dot')!;
  const glow = svg.querySelector('.wm-glow')!;
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-canvas]')!;
  const rule = hero.querySelector<HTMLElement>('[data-hero-rule]')!;
  const copy = hero.querySelector<HTMLElement>('[data-hero-copy]')!;
  const lines = hero.querySelectorAll<HTMLElement>('[data-hero-line]');
  const meta = hero.querySelector<HTMLElement>('[data-hero-meta]')!;
  const sppEl = hero.querySelector<HTMLElement>('[data-hero-spp]')!;
  const statement = hero.querySelector<HTMLElement>('[data-hero-statement]')!;
  const statementText = hero.querySelector<HTMLElement>('[data-hero-words]')!;
  const render = hero.querySelector<HTMLElement>('[data-hero-render]');
  const scrim = render?.querySelector<HTMLElement>('.hero__scrim');

  const origin = `${DOT_X * 100}% ${DOT_Y * 100}%`;
  const svgOrigin = `${wm.dot.cx} ${wm.dot.cy}`;
  gsap.set(wordmark, { transformOrigin: origin });

  // ---- intro: the mark resolves out of noise
  const showAll = () => {
    gsap.set([wordmark, rule, meta, ...lines], { autoAlpha: 1, y: 0, scaleX: 1 });
    gsap.set(canvas, { autoAlpha: 0 });
  };

  const intro = () => {
    const seen = sessionStorage.getItem('nova-intro') === '1';
    if (window.scrollY > 40) return showAll();

    gsap.set(wordmark, { autoAlpha: 0 });
    gsap.set(rule, { autoAlpha: 1, scaleX: 0 });
    gsap.set(lines, { autoAlpha: 0, y: 18 });
    gsap.set(meta, { autoAlpha: 0 });

    const tl = gsap.timeline();
    const settle = (at: string | number) => {
      tl.to(rule, { scaleX: 1, duration: 1.4 }, at)
        .to(lines, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, '<0.12')
        .to(meta, { autoAlpha: 1, duration: 1.2 }, '<0.2');
    };

    if (seen) {
      tl.to(wordmark, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' }, 0.05);
      settle(0.25);
      return;
    }

    // Half-resolution estimate of the wordmark, placed exactly over the SVG.
    const W = pin.clientWidth;
    const H = pin.clientHeight;
    const k = Math.min(0.6, Math.sqrt(380000 / (W * H)));
    const box = offsetWithin(wordmark, pin);
    const target = targetFromCanvas(
      Math.round(W * k),
      Math.round(H * k),
      (ctx) => paintWordmark(ctx, box.x * k, box.y * k, box.w * k),
      (lum) => 0.07 + 0.3 * Math.min(1, lum * 1.4),
    );
    const acc = new Accumulator(canvas, target);
    acc.reset(7);
    const show = () => {
      acc.draw();
      sppEl.textContent = String(acc.spp);
    };

    gsap.set(canvas, { autoAlpha: 1 });
    gsap.set(meta, { autoAlpha: 1 });
    gsap.set(meta.querySelectorAll('.hero__facts, .hero__cue'), { autoAlpha: 0 });

    // 1, 2, 4, 8, 16 samples are drawn one by one; from there the count doubles.
    let t = 0.15;
    const literal = [1, 1, 2, 4, 8];
    literal.forEach((n) => {
      tl.call(
        () => {
          for (let i = 0; i < n; i++) acc.sample();
          show();
        },
        undefined,
        t,
      );
      t += 0.15;
    });
    for (let i = 0; i < 8; i++) {
      tl.call(
        () => {
          acc.double();
          show();
        },
        undefined,
        t,
      );
      t += 0.105;
    }
    tl.to(canvas, { autoAlpha: 0, duration: 0.8, ease: 'power2.inOut' }, t)
      .to(wordmark, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, t)
      .to(meta.querySelectorAll('.hero__facts, .hero__cue'), { autoAlpha: 1, duration: 1.2 }, t + 0.3);
    settle(t + 0.1);
    tl.call(() => sessionStorage.setItem('nova-intro', '1'));
  };

  // ---- scroll: through the O, towards the light, into the statement
  const words = SplitText.create(statementText, { type: 'words', aria: 'auto' }).words;
  gsap.set(statement, { visibility: 'visible', autoAlpha: 0 });
  gsap.set(words, { opacity: 0.1 });

  const geo = { S: 10, dx: 0, dy: 0, r0: 20, g0: 60, rEnd: 5, gEnd: 150 };
  const measure = () => {
    const W = pin.clientWidth;
    const H = pin.clientHeight;
    const box = offsetWithin(wordmark, pin);
    // Far enough that the counter of the O covers the viewport.
    geo.S = Math.max(W / (COUNTER_W * box.w), H / (COUNTER_H * box.h)) * 1.25;
    // The dot travels to the centre, above the statement.
    geo.dx = W / 2 - (box.x + box.w * DOT_X);
    geo.dy = H * (W < 760 ? 0.2 : 0.24) - (box.y + box.h * DOT_Y);
    geo.r0 = (wm.dot.r / wm.w) * box.w;
    geo.g0 = (wm.dot.glow / wm.w) * box.w;
    geo.rEnd = Math.max(4, Math.min(W, H) * 0.007);
    geo.gEnd = Math.min(W, H) * 0.22;
  };
  measure();

  const zoom = { t: 0 };
  const applyZoom = () => {
    const t = zoom.t;
    const s = 1 + (geo.S - 1) * t * t * t;
    const m = smooth(t);
    gsap.set(wordmark, { scale: s, x: geo.dx * m, y: geo.dy * m });
    gsap.set(dot, { scale: lerp(geo.r0, geo.rEnd, m) / (geo.r0 * s), svgOrigin });
    gsap.set(glow, { scale: lerp(geo.g0, geo.gEnd, m) / (geo.g0 * s), svgOrigin, opacity: lerp(1, 0.6, m) });
    gsap.set(letters, { opacity: 1 - clamp01((t - 0.45) / 0.3) });
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => `+=${window.innerHeight * 2.2}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onRefresh: () => {
        measure();
        applyZoom();
      },
    },
  });

  tl.to([copy, rule], { autoAlpha: 0, y: -24, duration: 1, ease: 'power2.in' }, 0)
    .to(meta, { opacity: 0, duration: 0.8 }, 0)
    .to(zoom, { t: 1, duration: 4.6, onUpdate: applyZoom }, 0);

  if (render) {
    const at = () => `${(pin.clientWidth / 2 / pin.clientWidth) * 100}% ${(pin.clientWidth < 760 ? 0.2 : 0.24) * 100}%`;
    tl.fromTo(
      render,
      { clipPath: () => `circle(0% at ${at()})` },
      { clipPath: () => `circle(150% at ${at()})`, duration: 2.2, ease: 'power2.inOut' },
      3.2,
    )
      .to([dot, glow], { opacity: 0, duration: 0.8 }, 3.4)
      .to(scrim!, { opacity: 1, duration: 1.2 }, 4.6);
  }

  tl.fromTo(statement, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 4.2)
    .to(words, { opacity: 1, duration: 0.5, stagger: { each: 4 / words.length } }, 4.5)
    .to({}, { duration: 0.6 });

  intro();
}

// ----------------------------------------------------------------------- stack
// The beauty tilts into perspective and separates into its passes.
function initStack() {
  const stack = document.querySelector<HTMLElement>('[data-stack]');
  if (!stack || reduced) return;
  gsap.fromTo(
    stack,
    { '--k': 0 },
    { '--k': 1, ease: 'power2.inOut', scrollTrigger: { trigger: stack, start: 'top 78%', end: 'center 48%', scrub: 0.8 } },
  );
}

// ----------------------------------------------------------------------- proxy
// An illustration of proxy passes: 4x4 blocks, 2x2 blocks, every pixel, then
// accumulation. The picture is the mark, lit by a light that can be moved.
function initProxy() {
  const root = document.querySelector<HTMLElement>('[data-proxy]');
  if (!root) return;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-proxy-canvas]')!;
  const stageEl = root.querySelector<HTMLElement>('[data-proxy-stage]')!;
  const button = root.querySelector<HTMLButtonElement>('[data-proxy-edit]')!;
  const W = 480;
  const H = 300;

  // Coverage of the O, fitted into the picture.
  const mask = (() => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    const s = (H * 0.74) / wm.h;
    ctx.translate(W / 2 - wm.dot.cx * s, H / 2 - wm.dot.cy * s);
    ctx.scale(s, s);
    ctx.fillStyle = '#fff';
    ctx.fill(new Path2D(wm.O), 'evenodd');
    const px = ctx.getImageData(0, 0, W, H).data;
    const m = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) m[i] = px[i * 4 + 3] / 255;
    return m;
  })();

  const lights = [
    [0.5, 0.5],
    [0.4, 0.36],
    [0.62, 0.6],
    [0.5, 0.26],
    [0.3, 0.62],
  ];
  let current = 0;
  let seed = 3;

  const build = (lx: number, ly: number) => {
    const rgb = new Float32Array(W * H * 3);
    const p = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const d2 = (x - lx) * (x - lx) + (y - ly) * (y - ly);
        const f = 1 / (1 + d2 / (58 * 58));
        const ring = mask[i];
        const lit = 0.03 + 0.97 * f;
        const haze = 0.3 * f * Math.sqrt(f) * (1 - ring);
        let r = ring * 0.95 * lit + haze * 0.99;
        let g = ring * 0.93 * lit + haze * 0.062;
        let b = ring * 0.89 * lit + haze * 0.006;
        let prob = 0.09 + 0.28 * ring;
        if (d2 < 49) {
          r = 0.99;
          g = 0.062;
          b = 0.006;
          prob = 0.7;
        }
        rgb[i * 3] = r;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = b;
        p[i] = prob;
      }
    }
    return { w: W, h: H, rgb, p };
  };

  const acc = new Accumulator(canvas, build(W * lights[0][0], H * lights[0][1]));
  const label = (text: string) => (stageEl.textContent = text);
  const spp = () => label(`${acc.spp} spp`);

  const converge = () => {
    acc.reset(seed++);
    for (let i = 0; i < 16; i++) acc.sample();
    for (let i = 0; i < 6; i++) acc.double();
    acc.draw();
    spp();
  };

  let tl: gsap.core.Timeline | undefined;
  const run = () => {
    tl?.kill();
    const [fx, fy] = lights[current];
    acc.setTarget(build(W * fx, H * fy));
    if (reduced) return converge();
    acc.reset(seed++);
    tl = gsap.timeline();
    tl.call(() => {
      acc.sample(4);
      acc.draw(4);
      label('4×4 proxy pass');
    })
      .call(
        () => {
          acc.sample(2);
          acc.draw(2);
          label('2×2 proxy pass');
        },
        undefined,
        0.42,
      )
      .call(
        () => {
          acc.sample();
          acc.draw();
          spp();
        },
        undefined,
        0.84,
      );
    let t = 1.2;
    [1, 2, 4, 8].forEach((n) => {
      tl!.call(
        () => {
          for (let i = 0; i < n; i++) acc.sample();
          acc.draw();
          spp();
        },
        undefined,
        t,
      );
      t += 0.17;
    });
    for (let i = 0; i < 6; i++) {
      tl.call(
        () => {
          acc.double();
          acc.draw();
          spp();
        },
        undefined,
        t,
      );
      t += 0.15;
    }
  };

  button.addEventListener('click', () => {
    current = (current + 1) % lights.length;
    run();
  });

  converge();
  if (!reduced) ScrollTrigger.create({ trigger: root, start: 'top 65%', once: true, onEnter: run });
}

// ----------------------------------------------------------------------- karma
// The twelve Karma LOPs come on one after another while the list scrolls
// through the view, and the count above them follows.
function initKarma() {
  const root = document.querySelector<HTMLElement>('[data-karma]');
  if (!root || reduced) return;
  const items = [...root.querySelectorAll<HTMLElement>('[data-karma-item]')];
  const count = root.querySelector<HTMLElement>('[data-karma-n]');
  let lit = -1;
  const set = (n: number) => {
    if (n === lit) return;
    lit = n;
    items.forEach((el, i) => el.toggleAttribute('data-lit', i < n));
    if (count) count.textContent = String(n);
  };
  set(0);
  ScrollTrigger.create({
    trigger: root,
    start: 'clamp(top 80%)',
    end: 'clamp(bottom 64%)',
    onUpdate: (self) => set(Math.round(self.progress * items.length)),
    onRefresh: (self) => set(Math.round(self.progress * items.length)),
  });
}

// --------------------------------------------------------------------- devices
// The two renderers move towards each other until the equals sign stands
// between them: two devices, one image.
function initDevices() {
  const pair = document.querySelector<HTMLElement>('[data-devices]');
  if (!pair || reduced) return;
  const part = (name: string) => pair.querySelector<HTMLElement>(`[data-device="${name}"]`);
  const stacked = window.matchMedia('(max-width: 760px)').matches;
  const from = stacked ? { cpu: { y: -24 }, gpu: { y: 24 } } : { cpu: { xPercent: -10 }, gpu: { xPercent: 10 } };
  gsap
    .timeline({
      defaults: { ease: 'power2.out', duration: 1 },
      scrollTrigger: { trigger: pair, start: 'clamp(top 92%)', end: 'clamp(top 48%)', scrub: 0.6 },
    })
    .from(part('cpu'), { ...from.cpu, opacity: 0 }, 0)
    .from(part('gpu'), { ...from.gpu, opacity: 0 }, 0)
    .from(part('equals'), { scale: 0, opacity: 0, duration: 0.4 }, 0.7);
}

// ---------------------------------------------------------------------- passes
// A row of the output list under the pointer picks its passes out of the stack.
function initPassRows() {
  const stack = document.querySelector<HTMLElement>('[data-stack]');
  if (!stack) return;
  const layers = [...stack.querySelectorAll<HTMLElement>('[data-stack-layer]')];
  document.querySelectorAll<HTMLElement>('[data-pass-row]').forEach((row) => {
    const names = (row.dataset.passRow ?? '').split(' ');
    const pick = (on: boolean) => {
      stack.toggleAttribute('data-pick', on);
      layers.forEach((l) => l.toggleAttribute('data-on', on && names.includes(l.dataset.stackLayer ?? '')));
    };
    row.addEventListener('pointerenter', () => pick(true));
    row.addEventListener('pointerleave', () => pick(false));
  });
}

// ------------------------------------------------------------------------ rail
// The chapter rail appears after the hero and leaves before the footer; the
// dot sits on the chapter that holds the middle of the view.
function initRail() {
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  if (!rail) return;
  const links = [...rail.querySelectorAll<HTMLAnchorElement>('[data-rail-link]')];
  const sections = links
    .map((a) => document.getElementById(a.dataset.railLink ?? ''))
    .filter((s): s is HTMLElement => Boolean(s));
  if (!sections.length) return;
  const current = (id: string) =>
    links.forEach((a) => (a.dataset.railLink === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  sections.forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => self.isActive && current(section.id),
    });
  });
  ScrollTrigger.create({
    trigger: sections[0],
    start: 'top 60%',
    endTrigger: sections[sections.length - 1],
    end: 'bottom 40%',
    onToggle: (self) => rail.toggleAttribute('data-on', self.isActive),
  });
}

// ------------------------------------------------------------------------ boot
function boot() {
  // The hero is path traced live where WebGL 2 allows it, and 2D otherwise.
  if (!initHeroStage()) initHero();
  initKarma();
  initDevices();
  initStack();
  initPassRows();
  initAov();
  // The viewport is live where WebGL 2 allows it; otherwise the 2D illustration runs.
  if (!initViewport()) initProxy();
  initRail();
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

// Wait for the fonts: lines and words must be split on final metrics.
const start = () => (document.fonts?.ready ?? Promise.resolve()).then(boot);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
