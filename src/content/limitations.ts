// What Nova 0.1.0 does not do. Taken from the "Not yet" lines of
// docs/reference.md, the README's requirements and the release notes.

export const limitations = [
  {
    title: 'Platform',
    items: [
      'Windows x64 only',
      'Houdini 22.0 only',
      'Nova XPU runs on the NVIDIA RTX 50 series only. Other GPUs render on the CPU.',
    ],
  },
  {
    title: 'Nova XPU',
    items: [
      'CPU and GPU rendering together',
      'Multiple GPUs',
      'Demand-loaded textures',
      'VEX materials: they render as grey stand-ins, with a warning',
      'Ray queries from shading (ambient occlusion, distance, curvature, rounded edges): they return their default values',
      'Texture baking: Nova XPU bakes on the CPU',
    ],
  },
  {
    title: 'Shading and lights',
    items: [
      'Karma Hair coat, fur medulla and the second R lobe (they warn)',
      'sss_traceset',
      'IES profiles',
      'Room maps',
      'VEX AOV exports, and fake caustics through VEX materials',
      'The holdout; prefix of light path expressions (black, with a warning)',
    ],
  },
  {
    title: 'Volumes',
    items: [
      'Karma’s lattice-deformation velocity blur (renders as lookup offset)',
      'volumefilter other than a box of width 1 (warns)',
    ],
  },
];
