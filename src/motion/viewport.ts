// The interactive viewport: the wordmark lit by a light the visitor can move,
// path traced live. After every edit the picture comes back the way Nova's
// viewport does it: one pixel per 4x4 block, then per 2x2, then every pixel,
// then samples accumulate. The proxy passes are held longer than a renderer
// would hold them, so they can be seen.
//
// Returns false when WebGL 2 is not available (the 2D illustration is used).

import { gsap, ScrollTrigger, reduced } from './core';
import { PathTracer, type Vec3 } from './tracer/tracer';
import { scene } from './tracer/scene';

const OX = scene.o.x;
const PLANE_Z = 0.56;

export function initViewport(): boolean {
  const root = document.querySelector<HTMLElement>('[data-proxy]');
  if (!root) return true;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-proxy-live]');
  const stageEl = root.querySelector<HTMLElement>('[data-proxy-stage]');
  const button = root.querySelector<HTMLButtonElement>('[data-proxy-edit]');
  const hint = root.querySelector<HTMLElement>('[data-proxy-hint]');
  if (!canvas || !stageEl || !PathTracer.supported()) return false;

  let tracer: PathTracer;
  try {
    tracer = new PathTracer(canvas, { maxSpp: 384, maxPixels: 420_000 });
  } catch (error) {
    console.warn('Nova: the live viewport is unavailable, using the 2D illustration.', error);
    return false;
  }
  if (tracer.slow) {
    tracer.dispose();
    return false;
  }
  root.setAttribute('data-live', '');

  tracer.camera = { pos: [OX + 0.62, 0.66, 3.9], target: [OX + 0.22, 0.5, 0], fov: 26, aperture: 0, focus: 3.9 };
  tracer.light.pos = [OX, 0.5, PLANE_Z];
  tracer.light.radius = 0.07;
  tracer.light.color = [11, 2.0, 0.36];
  // A dim key, so the moving light does the talking.
  tracer.key.color = [4.2, 4.0, 3.75];
  tracer.exposure = 1.3;

  const label = (text: string) => (stageEl.textContent = text);
  const perFrame = Math.max(1, Math.min(4, Math.floor(tracer.headroom)));

  // ---- proxy passes
  type Phase = 'four' | 'two' | 'full';
  let phase: Phase = 'full';
  let until = 0;
  let dragging = false;
  const HOLD = reduced ? 0 : 150;

  const edited = () => {
    phase = 'four';
    tracer.block = 4;
    tracer.reset();
    until = performance.now() + HOLD;
    label('4×4 proxy pass');
  };

  let onScreen = false;
  new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting), { rootMargin: '10% 0px' }).observe(root);

  gsap.ticker.add(() => {
    if (!onScreen || document.hidden) return;
    const now = performance.now();
    if (phase === 'four') {
      tracer.render(1);
      if (!dragging && !moving && now >= until) {
        phase = 'two';
        tracer.block = 2;
        until = now + HOLD;
        label('2×2 proxy pass');
      }
    } else if (phase === 'two') {
      tracer.render(1);
      if (now >= until) {
        phase = 'full';
        tracer.block = 1;
      }
    } else if (tracer.render(perFrame)) {
      label(`${tracer.spp} spp`);
    }
  });

  const fit = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w > 1 && h > 1) tracer.resize(w, h);
  };
  fit();
  new ResizeObserver(fit).observe(canvas);

  // ---- moving the light
  const clampLight = (p: Vec3): Vec3 => [
    Math.min(OX + 2.0, Math.max(OX - 1.5, p[0])),
    Math.min(1.4, Math.max(0.12, p[1])),
    PLANE_Z,
  ];
  const setLight = (p: Vec3) => {
    tracer.light.pos = clampLight(p);
    edited();
  };
  const fromPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const ray = tracer.ray((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    const t = (PLANE_Z - ray.origin[2]) / ray.dir[2];
    setLight([ray.origin[0] + ray.dir[0] * t, ray.origin[1] + ray.dir[1] * t, PLANE_Z]);
  };
  const used = () => hint?.setAttribute('data-used', '');

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    tween?.kill();
    moving = false;
    canvas.setPointerCapture(e.pointerId);
    used();
    fromPointer(e);
  });
  canvas.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  const release = () => {
    if (!dragging) return;
    dragging = false;
    until = performance.now() + HOLD;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.2 : 0.07;
    const p = tracer.light.pos;
    if (e.key === 'ArrowLeft') setLight([p[0] - step, p[1], PLANE_Z]);
    else if (e.key === 'ArrowRight') setLight([p[0] + step, p[1], PLANE_Z]);
    else if (e.key === 'ArrowUp') setLight([p[0], p[1] + step, PLANE_Z]);
    else if (e.key === 'ArrowDown') setLight([p[0], p[1] - step, PLANE_Z]);
    else return;
    used();
    e.preventDefault();
  });

  // The button sends the light to the next of a few places.
  const places: [number, number][] = [
    [OX, 0.5],
    [OX - 0.78, 0.92],
    [OX + 1.05, 0.36],
    [OX + 0.3, 1.18],
    [OX - 1.0, 0.3],
  ];
  let place = 0;
  let moving = false;
  let tween: gsap.core.Tween | undefined;
  button?.addEventListener('click', () => {
    place = (place + 1) % places.length;
    const [x, y] = places[place];
    used();
    if (reduced) return setLight([x, y, PLANE_Z]);
    const from = { x: tracer.light.pos[0], y: tracer.light.pos[1] };
    tween?.kill();
    moving = true;
    tween = gsap.to(from, {
      x,
      y,
      duration: 0.7,
      ease: 'power2.inOut',
      onUpdate: () => setLight([from.x, from.y, PLANE_Z]),
      onComplete: () => {
        moving = false;
        until = performance.now() + HOLD;
      },
    });
  });

  // Show the passes once when the viewport first comes into view.
  if (!reduced) ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: edited });
  return true;
}
