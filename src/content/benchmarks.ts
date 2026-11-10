// Benchmark data, transcribed from docs/benchmarks.md of syfyra/Nova-Renderer
// at v0.1.0. Do not edit numbers here without changing them there first.

export interface XpuRow {
  scene: string;
  what: string;
  /** nova_cli, 960x540, 64 spp, the faster of two runs; XPU includes setup. */
  cpuS: number;
  cpuMrays: number;
  xpuS: number;
  xpuMrays: number;
  endToEnd: number;
  /** Time per sample without setup. */
  cpuMs: number;
  xpuMs: number;
  perSample: number;
  setupS: number;
  kind: 'surface' | 'volume' | 'layered';
}

export const xpu: XpuRow[] = [
  { scene: 'cornell_rect', what: 'Cornell box, rect light', cpuS: 5.42, cpuMrays: 22.3, xpuS: 0.75, xpuMrays: 176, endToEnd: 7.2, cpuMs: 84.7, xpuMs: 7.35, perSample: 11.5, setupS: 0.27, kind: 'surface' },
  { scene: 'mtl_spheres', what: 'Layered material spheres', cpuS: 2.19, cpuMrays: 23.8, xpuS: 0.45, xpuMrays: 147, endToEnd: 4.9, cpuMs: 34.2, xpuMs: 2.24, perSample: 15.3, setupS: 0.26, kind: 'surface' },
  { scene: 'mtl_glass', what: 'Glass', cpuS: 2.79, cpuMrays: 22.0, xpuS: 0.59, xpuMrays: 116, endToEnd: 4.8, cpuMs: 43.7, xpuMs: 4.65, perSample: 9.4, setupS: 0.29, kind: 'surface' },
  { scene: 'mtl_textured', what: 'Textured materials', cpuS: 3.78, cpuMrays: 21.9, xpuS: 0.61, xpuMrays: 177, endToEnd: 6.2, cpuMs: 59.0, xpuMs: 3.75, perSample: 15.7, setupS: 0.36, kind: 'surface' },
  { scene: 'dome_sky', what: 'Textured dome light', cpuS: 3.13, cpuMrays: 29.2, xpuS: 0.67, xpuMrays: 165, endToEnd: 4.6, cpuMs: 48.8, xpuMs: 5.26, perSample: 9.3, setupS: 0.33, kind: 'surface' },
  { scene: 'instancer', what: 'Point instancer', cpuS: 5.27, cpuMrays: 21.2, xpuS: 0.68, xpuMrays: 178, endToEnd: 7.7, cpuMs: 82.3, xpuMs: 6.18, perSample: 13.3, setupS: 0.35, kind: 'surface' },
  { scene: 'implicit_spheres', what: 'Implicit spheres', cpuS: 3.75, cpuMrays: 24.9, xpuS: 0.67, xpuMrays: 170, endToEnd: 5.6, cpuMs: 58.5, xpuMs: 5.25, perSample: 11.1, setupS: 0.33, kind: 'surface' },
  { scene: 'motion_blur', what: 'Transform and deformation blur', cpuS: 2.3, cpuMrays: 38.1, xpuS: 0.53, xpuMrays: 175, endToEnd: 4.3, cpuMs: 36.0, xpuMs: 3.97, perSample: 9.1, setupS: 0.33, kind: 'surface' },
  { scene: 'limits_caustics', what: 'Ray limits and caustics', cpuS: 4.82, cpuMrays: 28.3, xpuS: 0.85, xpuMrays: 142, endToEnd: 5.7, cpuMs: 75.3, xpuMs: 8.47, perSample: 8.9, setupS: 0.3, kind: 'surface' },
  { scene: 'pyro_bare', what: 'Pyro volume, no material', cpuS: 1.35, cpuMrays: 32.7, xpuS: 0.7, xpuMrays: 67, endToEnd: 1.9, cpuMs: 21.0, xpuMs: 5.27, perSample: 4.0, setupS: 0.42, kind: 'volume' },
  { scene: 'furnace_materials', what: 'Many layered materials', cpuS: 2.53, cpuMrays: 20.7, xpuS: 0.93, xpuMrays: 63, endToEnd: 2.7, cpuMs: 39.5, xpuMs: 9.62, perSample: 4.1, setupS: 0.32, kind: 'layered' },
];

/** The scenes shown on the home page: the best, the typical and the worst case. */
export const xpuHome = ['mtl_textured', 'instancer', 'cornell_rect', 'mtl_glass', 'pyro_bare'];

export interface IprRow {
  edit: string;
  total: string;
  ms: number; // upper bound, for the bar
  sync: string;
  restart: string;
  first: string;
}

/** CPU, 1280x720, 980 000 triangles with 20 000 instances, median of six edits. */
export const ipr: IprRow[] = [
  { edit: 'Camera move', total: '23 ms', ms: 23, sync: '0.7', restart: '4.4', first: '18.3' },
  { edit: 'Light transform', total: '24 ms', ms: 24, sync: '1.7', restart: '1.9', first: '20.1' },
  { edit: 'Light intensity', total: '25 ms', ms: 25, sync: '1.5', restart: '1.9', first: '21.6' },
  { edit: 'Material value', total: '29 ms', ms: 29, sync: '1.9', restart: '1.9', first: '24.7' },
  { edit: 'Add or remove a prim', total: '36 ms', ms: 36, sync: '1.6', restart: '2.4', first: '31.7' },
  { edit: 'Object transform, 1M triangles', total: '40 ms', ms: 40, sync: '6.6', restart: '2.3', first: '31.4' },
  { edit: 'Visibility, cube', total: '48 ms', ms: 48, sync: '2.2', restart: '2.1', first: '43.5' },
  { edit: 'Object transform, cube', total: '50 ms', ms: 50, sync: '1.6', restart: '2.0', first: '45.9' },
  { edit: 'Instancer: one position', total: '55 ms', ms: 55, sync: '2.7', restart: '9.7', first: '42.5' },
  { edit: 'Deform points, 1M triangles', total: '89–94 ms', ms: 94, sync: '20–26', restart: '27–42', first: '26–44' },
];

export const iprHome = ['Camera move', 'Light intensity', 'Material value', 'Object transform, 1M triangles', 'Deform points, 1M triangles'];

export const adaptive = [
  { scene: 'mtl_glass', uniform: '1.49 s', oracle: '0.46 s', relmse: '6.1e-4', speedup: '3.25×', gate: '≥ 2×' },
  { scene: 'cornell_rect', uniform: '0.55 s', oracle: '0.52 s', relmse: '1.4e-3', speedup: '1.06×', gate: '≥ 0.85×' },
  { scene: 'dome_sky', uniform: '0.17 s', oracle: '0.18 s', relmse: '4.8e-4', speedup: '0.97×', gate: '≥ 1× (10 ms short, within the runs’ noise)' },
];

export const denoise = [
  { scene: 'cornell_rect', noisy: '1.34e-2', denoised: '8.85e-4', factor: '15× lower' },
  { scene: 'mtl_glass', noisy: '1.39e-2', denoised: '1.79e-3', factor: '7.8× lower' },
  { scene: 'dome_sky', noisy: '2.05e-3', denoised: '2.59e-4', factor: '7.9× lower' },
];

export const denoiseTime = [
  { res: '960×540', ms: 2.5 },
  { res: '1920×1080', ms: 8 },
  { res: '3840×2160', ms: 31 },
];

export const pyro = [
  { scene: 'pyro_bare', what: 'No material, volume limit 0', nova: 4.54, karma: 12.9, factor: '2.8×', note: '' },
  { scene: 'pyro_bare_vl4', what: 'No material, volume limit 4', nova: 4.74, karma: 19.84, factor: '4.2×', note: '' },
  { scene: 'pyro_fire', what: 'Karma Pyro Material, fire on', nova: 46.98, karma: 107.59, factor: '2.3×', note: 'Karma at step rate 4' },
];

export const lpe = [
  { scene: 'cornell_rect', s0: '6.00 s', s1: '6.11 s (+1.9 %)', s20: '6.35 s (+5.9 %)', s74: '6.49 s (+8.2 %)' },
  { scene: 'mtl_spheres', s0: '2.43 s', s1: '2.56 s (+5.7 %)', s20: '2.75 s (+13.2 %)', s74: '2.83 s (+16.8 %)' },
  { scene: 'mtl_glass', s0: '2.99 s', s1: '3.05 s (+2.1 %)', s20: '3.27 s (+9.5 %)', s74: '3.34 s (+11.7 %)' },
];
