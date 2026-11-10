// The layer stack shows real passes: the scene of the hero, path traced live
// into each of Karma's component names. The five light components sum to the
// beauty. The passes are rendered once, shortly before the stack scrolls in.

import { gsap } from './core';
import { PASS, PathTracer } from './tracer/tracer';
import { scene } from './tracer/scene';

const BY_NAME: Record<string, number> = {
  beauty: PASS.beauty,
  directdiffuse: PASS.directDiffuse,
  indirectdiffuse: PASS.indirectDiffuse,
  directglossy: PASS.directGlossy,
  indirectglossy: PASS.indirectGlossy,
  visiblelights: PASS.visibleLights,
  normals: PASS.normals,
  ids: PASS.ids,
};

export function initAov() {
  const stack = document.querySelector<HTMLElement>('[data-stack]');
  if (!stack) return;
  const layers = [...stack.querySelectorAll<HTMLCanvasElement>('canvas[data-aov]')];
  if (!layers.length || !PathTracer.supported()) return;

  const run = () => {
    let tracer: PathTracer;
    try {
      tracer = new PathTracer(document.createElement('canvas'), { maxSpp: 128, maxPixels: 130_000 });
    } catch {
      return;
    }
    if (tracer.slow) return tracer.dispose();
    const w = layers[0].width;
    const h = layers[0].height;
    tracer.resize(w, h, 1);
    // The hero's framing, a little tighter.
    const tanV = Math.tan((24 * Math.PI) / 360);
    const d = scene.width / 0.8 / (2 * tanV * (w / h));
    const ty = 0.5 - 0.1 * 2 * d * tanV;
    tracer.camera = { pos: [0, ty + d * 0.03, d], target: [0, ty, 0], fov: 24, aperture: 0, focus: d };
    stack.setAttribute('data-live', '');

    let i = 0;
    const begin = () => {
      const name = layers[i].dataset.aov ?? 'beauty';
      tracer.pass = BY_NAME[name] ?? PASS.beauty;
      // Utility passes have no noise; a few samples are enough for the edges.
      tracer.maxSpp = tracer.pass >= PASS.normals ? 16 : 128;
      tracer.reset();
    };
    begin();
    const tick = () => {
      if (document.hidden) return;
      if (tracer.render(4)) return;
      // This pass is done: copy it to its layer and start the next.
      tracer.refresh();
      const ctx = layers[i].getContext('2d');
      ctx?.drawImage(tracer.canvas, 0, 0, layers[i].width, layers[i].height);
      layers[i].setAttribute('data-ready', '');
      i++;
      if (i < layers.length) return begin();
      gsap.ticker.remove(tick);
      tracer.dispose();
    };
    gsap.ticker.add(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      run();
    },
    { rootMargin: '120% 0px' },
  );
  io.observe(stack);
}
