// The claims ledger.
//
// Every measured value on the site appears here with its conditions and a
// link to the place in the Nova repository it was taken from (pinned to the
// tag in src/lib/site.ts). Pages print numbers through <Fn id="..."/>, which
// renders the footnote marker; <Footnotes/> prints the conditions.
//
// When Nova's documentation changes, update this file first.

import { source } from '../lib/site';

export const MACHINE = {
  cpu: 'Ryzen 7 9800X3D (8 cores, 16 threads)',
  gpu: 'GeForce RTX 5080 (driver 617.42, CUDA 12.9, OptiX 9.1)',
  os: 'Windows 11',
  build: 'MSVC 14.44 Release build, Embree 4.4.1 (static, AVX2)',
};

export interface Claim {
  /** The conditions under which the number holds. Shown as the footnote. */
  note: string;
  /** Where the number comes from. */
  src: { label: string; url: string };
}

const bench = (anchor: string, label = 'docs/benchmarks.md') => ({
  label,
  url: source('docs/benchmarks.md', anchor),
});
const ref = (label = 'docs/reference.md') => ({ label, url: source('docs/reference.md', 'features-by-milestone') });
const readme = { label: 'README.md', url: source('README.md') };

export const claims = {
  'same-image': {
    note: 'Nova XPU against Nova on the CPU, nova_cli at 960×540 and 64 samples per pixel on the Karma reference scenes: every pixel agrees within 1 %. The exception is mtl_textured, where 80.5 % of the pixels do (hardware trilinear texture filtering against OpenImageIO’s stochastic filtering). GeForce RTX 5080 and Ryzen 7 9800X3D.',
    src: bench('m10-2026-11-04-nova-xpu'),
  },
  'xpu-per-sample': {
    note: 'Time per sample at 960×540 without setup, GeForce RTX 5080 against all 16 threads of a Ryzen 7 9800X3D: 8.9–15.7× on nine surface scenes, 4.0× on a volume and 4.1× on heavy layered materials.',
    src: bench('m10-2026-11-04-nova-xpu'),
  },
  'xpu-end-to-end': {
    note: 'nova_cli at 960×540 and 64 samples per pixel, GPU setup (device context, OptiX pipelines, scene upload: 0.26–0.42 s) included: 4.3–7.7× on surface scenes, 1.9× on a bare pyro volume, 2.7× on heavy layered materials. GeForce RTX 5080 against a Ryzen 7 9800X3D.',
    src: bench('m10-2026-11-04-nova-xpu'),
  },
  'xpu-ipr': {
    note: 'Nova XPU on a scene of 4.2 million triangles at 640×360, GeForce RTX 5080: the first pass takes 183 ms, a pass after an edit of a light, a material or a transform 7 ms, a pass alone 2 ms.',
    src: bench('m10-2026-11-04-nova-xpu'),
  },
  'cpu-rays': {
    note: 'nova_cli at 960×540 and 64 samples per pixel on eleven reference scenes: 20.7–38.1 million rays per second on a Ryzen 7 9800X3D with all 16 threads. “Rays” counts every ray Embree traces: camera, continuation and shadow rays.',
    src: bench('m10-2026-11-04-nova-xpu'),
  },
  'shading-edit': {
    note: 'A structural edit recompiles one material in about 0.1 ms (translation and compile of a Standard Surface with three textures: 0.09 ms). Value edits do not recompile.',
    src: bench('m3-2026-10-13-final'),
  },
  ipr: {
    note: 'Time from the USD edit to the first new image, the median of six edits, on the CPU at 1280×720 on a scene of 980 000 triangles with 20 000 instances. Ryzen 7 9800X3D.',
    src: bench('m7-2026-10-14-per-ray-speed-ipr-adaptive-sampling-denoising'),
  },
  denoise: {
    note: 'Time of one OptiX denoise on a GeForce RTX 5080. The first call in a process adds the OptiX context, about 0.1–0.3 s. At 16 samples per pixel the error (relMSE against a converged image) falls 7.8–15× on three reference scenes.',
    src: bench('m7-2026-10-14-per-ray-speed-ipr-adaptive-sampling-denoising'),
  },
  adaptive: {
    note: 'Variance oracle against uniform sampling at equal error (relMSE against Nova’s own converged image): 3.25× on mtl_glass, 1.06× on cornell_rect, 0.97× on dome_sky.',
    src: bench('m7-2026-10-14-per-ray-speed-ipr-adaptive-sampling-denoising'),
  },
  'light-tree': {
    note: 'Variance against light selection by power alone, on a street scene of 2000 lights.',
    src: ref(),
  },
  pyro: {
    note: 'One pyro simulation at 400×600 and 256 samples per pixel for both renderers, husk wall time including about 1.5 s of startup, against Karma CPU (path traced, uniform sampling): 2.8× and 4.2× without a material (volume limit 0 and 4), 2.3× with the Karma Pyro Material and fire against Karma at step rate 4. At Karma’s default step rate of 0.25 Karma is faster (14.8 s against 47.0 s) and renders absorbing emitters 6–10 % bright. Ryzen 7 9800X3D.',
    src: bench('m8-2026-11-03-volumes'),
  },
  'volumes-match': {
    note: 'Calibration cubes, furnaces, single scattering, modifiers, volume lights and a pyro simulation against Karma CPU. One documented difference: smoke lit by a volume light at volume limit 0 renders 4.5 % darker than in Karma.',
    src: ref(),
  },
  sss: {
    note: 'Random-walk subsurface scattering with Karma’s parameterization, against Karma’s 47 calibration scenes.',
    src: ref(),
  },
  'm9-scene': {
    note: '600 hair fibres with Karma Hair, a subsurface sphere, 40 sphere lights and an emissive quad treated as a light, at 1280×720 and 128 samples per pixel for both renderers, husk wall time: Nova 21.9 s, Karma CPU 102.0 s. One scene on a Ryzen 7 9800X3D; not a general statement about either renderer.',
    src: bench('m9-2026-11-04-hair-sss-light-tree-emissive-mesh-lights'),
  },
  'lpe-cost': {
    note: 'cornell_rect, mtl_spheres and mtl_glass at 960×540 and 64 samples per pixel: Karma’s standard set (the beauty and 19 render vars) adds 5.9–13.2 % to the render time. With the beauty only, no light-path-expression code runs.',
    src: bench('m6-2026-10-13-cost-of-light-path-expressions'),
  },
  materialx: {
    note: '740 of the 746 MaterialX 1.39 node definitions with a numeric output run through Nova’s shading compiler and VM.',
    src: ref(),
  },
  kma: {
    note: '35 of the 55 kma_* shading nodes of the Karma Material Builder.',
    src: ref(),
  },
  tests: {
    note: 'About 690 automated tests: unit tests, husk and command-line renders, statistical comparisons against Karma references, and isolated Houdini sessions.',
    src: readme,
  },
  audit: {
    note: 'A bug audit after milestone M10 fixed 71 verified defects across the renderer, Hydra, the bridges and the installer.',
    src: { label: 'docs/bug-audit-2026-11.md', url: source('docs/bug-audit-2026-11.md') },
  },
} satisfies Record<string, Claim>;

export type ClaimId = keyof typeof claims;
