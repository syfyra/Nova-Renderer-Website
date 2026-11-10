// The hero on the live stage: the wordmark as an object, path traced in the
// browser. It resolves out of noise on arrival; scrolling flies the camera
// through the O, past its light, into the dark where the statement is lit
// word by word.
//
// Returns false when WebGL 2 (with float render targets) is not available, so
// the caller can fall back to the 2D hero.

import { gsap, SplitText, reduced } from './core';
import { PathTracer } from './tracer/tracer';
import { scene } from './tracer/scene';

const OX = scene.o.x;
const FOV = 24;

/** Camera keys along the flight (position, target, field of view) and where
 *  the wordmark's baseline sits in the opening frame, from the top (0..1). */
function flight(aspect: number): { keys: number[][]; base: number } {
  const tanV = Math.tan((FOV * Math.PI) / 360);
  // How much of the frame's width the wordmark takes, and how far above the
  // centre it sits, so the copy has room below its reflection.
  const fill = aspect >= 1.25 ? 0.62 : aspect >= 0.8 ? 0.8 : 0.9;
  const lift = aspect >= 1.25 ? 0.12 : 0.2;
  const d = scene.width / fill / (2 * tanV * aspect);
  const visible = 2 * d * tanV;
  const ty = 0.5 - lift * visible;
  return {
    base: 0.5 + ty / visible,
    keys: [
      [0, ty + d * 0.03, d, 0, ty, 0, FOV],
      [OX * 0.5, 0.56, 3.3, OX, 0.5, 0, 27],
      [OX, 0.6, 1.3, OX, 0.52, 0, 34],
      // Through the counter of the O, above the dot.
      [OX, 0.705, 0.3, OX, 0.69, -1, 40],
      [OX, 0.705, -0.7, OX, 0.62, -3, 40],
    ],
  };
}

/** Catmull-Rom through the keys, t in 0..1. */
function along(keys: number[][], t: number): number[] {
  const n = keys.length - 1;
  const x = Math.min(0.9999, Math.max(0, t)) * n;
  const i = Math.floor(x);
  const u = x - i;
  const p0 = keys[Math.max(0, i - 1)];
  const p1 = keys[i];
  const p2 = keys[i + 1];
  const p3 = keys[Math.min(n, i + 2)];
  return p1.map((_, k) => {
    const a = p0[k];
    const b = p1[k];
    const c = p2[k];
    const d = p3[k];
    return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
  });
}

export function initHeroStage(): boolean {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return true;
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-stage]');
  if (!canvas || !PathTracer.supported()) return false;

  let tracer: PathTracer;
  try {
    tracer = new PathTracer(canvas, { maxSpp: 640, maxPixels: 1_300_000 });
  } catch (error) {
    console.warn('Nova: the live stage is unavailable, using the 2D hero.', error);
    return false;
  }
  if (tracer.slow) {
    // No usable GPU: the 2D hero is the better picture.
    tracer.dispose();
    return false;
  }
  hero.classList.add('hero--stage');

  const pin = hero.querySelector<HTMLElement>('[data-hero-pin]')!;
  const copy = hero.querySelector<HTMLElement>('[data-hero-copy]')!;
  const lines = hero.querySelectorAll<HTMLElement>('[data-hero-line]');
  const meta = hero.querySelector<HTMLElement>('[data-hero-meta]')!;
  const sppEl = hero.querySelector<HTMLElement>('[data-hero-spp]')!;
  const live = hero.querySelector<HTMLElement>('[data-hero-live]');
  const ember = hero.querySelector<HTMLElement>('[data-hero-ember]')!;
  const shade = hero.querySelector<HTMLElement>('.hero__shade');
  const statement = hero.querySelector<HTMLElement>('[data-hero-statement]')!;
  const statementText = hero.querySelector<HTMLElement>('[data-hero-words]')!;
  if (live) live.hidden = false;

  // ---- camera
  let keys = flight(1.6).keys;
  const fly = { p: 0 };
  let lastP = 0;
  const applyFly = () => {
    const k = along(keys, fly.p);
    const c = tracer.camera;
    c.pos = [k[0], Math.max(0.08, k[1]), k[2]];
    c.target = [k[3], k[4], k[5]];
    c.fov = k[6];
    // Like a camera's meter: the exposure comes down as the light gets close.
    const near = Math.min(1, Math.max(0, (fly.p - 0.4) / 0.38));
    tracer.exposure = 1.25 - 0.8 * near * near * (3 - 2 * near);
    // The picture dissolves into the page as the camera leaves the O.
    const out = Math.min(1, Math.max(0, (fly.p - 0.86) / 0.14));
    tracer.fade = 1 - out * out * (3 - 2 * out);
    canvas.style.visibility = fly.p >= 0.999 ? 'hidden' : 'visible';
    // A jump (an anchor link, a very slow frame) is a cut: start afresh, so
    // nothing of the old view lingers in the new one.
    if (Math.abs(fly.p - lastP) > 0.06) tracer.reset();
    else tracer.touch();
    lastP = fly.p;
  };

  const fit = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    tracer.resize(w, h);
    const f = flight(w / h);
    keys = f.keys;
    // The page lays out the copy and the fade of the reflection from here.
    hero.style.setProperty('--base-px', `${Math.round(f.base * h)}px`);
    applyFly();
    tracer.reset();
  };
  fit();
  new ResizeObserver(fit).observe(canvas);

  // ---- render loop: only while the hero is on screen and not converged
  let onScreen = true;
  new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting)).observe(pin);
  const perFrame = Math.max(1, Math.min(4, Math.floor(tracer.headroom)));
  let shown = !reduced;
  gsap.ticker.add(() => {
    if (!onScreen || document.hidden || fly.p >= 0.999) return;
    if (!tracer.render(perFrame)) return;
    sppEl.textContent = String(Math.min(tracer.spp, 9999)).padStart(4, '0');
    if (!shown && tracer.spp >= 48) {
      // Reduced motion: the picture appears once it is calm.
      shown = true;
      canvas.style.opacity = '1';
    }
  });

  if (reduced) {
    canvas.style.opacity = '0';
    return true;
  }

  // ---- arrival: the picture resolves, then the copy settles
  gsap.set(lines, { autoAlpha: 0, y: 18 });
  gsap.set(meta, { autoAlpha: 0 });
  if (window.scrollY > 40) {
    gsap.set([...lines, meta], { autoAlpha: 1, y: 0 });
  } else {
    gsap
      .timeline()
      .fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0)
      .to(meta, { autoAlpha: 1, duration: 1.2 }, 0.2)
      .to(lines, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.9);
  }

  // ---- scroll: the flight and the statement
  const words = SplitText.create(statementText, { type: 'words', aria: 'auto' }).words;
  gsap.set(statement, { visibility: 'visible', autoAlpha: 0 });
  gsap.set(words, { opacity: 0.1 });
  gsap.set(ember, { autoAlpha: 0, scale: 0.5 });

  gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => `+=${window.innerHeight * 2.8}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    })
    .to(copy, { autoAlpha: 0, y: -24, duration: 0.7, ease: 'power2.in' }, 0)
    .to(meta.querySelectorAll('.hero__facts, .hero__cue'), { opacity: 0, duration: 0.7 }, 0)
    .to(fly, { p: 1, duration: 6, ease: 'power1.inOut', onUpdate: applyFly }, 0)
    // The fade over the reflection belongs to the opening frame only.
    .to(shade, { autoAlpha: 0, duration: 1.1 }, 0.1)
    .to(meta, { opacity: 0, duration: 0.6 }, 4.9)
    .to(ember, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'power2.out' }, 5.3)
    .fromTo(statement, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 5.5)
    .to(words, { opacity: 1, duration: 0.5, stagger: { each: 3.6 / words.length } }, 5.8)
    .to({}, { duration: 0.6 });

  return true;
}
