// The render registry.
//
// Every showcase slot on the site is listed here. To fill a slot, drop an
// image named after the slot id into src/assets/renders/ (avif, webp, jpg or
// png) and complete its metadata below. A slot without an image renders as a
// labelled frame in development and is left out of production builds; an image
// without a `renderer` fails the build, because every picture on this site
// says what made it.
//
// Only images rendered by Nova (or, in the two comparison slots, by Karma CPU)
// belong here.

import type { ImageMetadata } from 'astro';

export interface RenderSlot {
  /** Shot number of the brief (docs/PLAN.md, section 7.1). */
  shot: string;
  title: string;
  /** What the picture should show. Printed in the empty frame. */
  brief: string;
  /** Text alternative once the image exists. */
  alt?: string;
  renderer?: 'Nova' | 'Nova XPU' | 'Karma CPU';
  samples?: string;
  resolution?: string;
  time?: string;
  hardware?: string;
  credit?: string;
}

export const slots = {
  hero: {
    shot: 'R1',
    title: 'Hero',
    brief: 'One frame that shows glass, metal and soft light.',
  },
  'same-cpu': {
    shot: 'R2',
    title: 'Nova, CPU',
    brief: 'One frame rendered with Nova on the CPU.',
  },
  'same-xpu': {
    shot: 'R2',
    title: 'Nova XPU',
    brief: 'The same frame rendered with Nova XPU.',
  },
  'karma-karma': {
    shot: 'R3',
    title: 'Karma CPU',
    brief: 'A Karma scene rendered in Karma CPU.',
  },
  'karma-nova': {
    shot: 'R3',
    title: 'Nova',
    brief: 'The same scene, unchanged, rendered in Nova.',
  },
  'mat-materialx': { shot: 'R4', title: 'MaterialX', brief: 'An OpenPBR or Standard Surface material study.' },
  'mat-kma': { shot: 'R4', title: 'Karma Material Builder', brief: 'A material built from kma_* nodes.' },
  'mat-principled': { shot: 'R4', title: 'Principled Shader', brief: 'Houdini’s Principled Shader.' },
  'mat-vex': { shot: 'R4', title: 'VEX Material Builder', brief: 'A VEX material through the CVEX bridge.' },
  'mat-displacement': { shot: 'R12', title: 'Displacement', brief: 'A displacement close-up.' },
  'world-lights': { shot: 'R5', title: 'Many lights', brief: 'A night scene with hundreds of lights.' },
  'world-volumes': { shot: 'R6', title: 'Volumes', brief: 'Smoke and fire with the Karma Pyro Material.' },
  'world-hair': { shot: 'R7', title: 'Hair', brief: 'A hair or fur close-up.' },
  'world-sss': { shot: 'R8', title: 'Subsurface', brief: 'Skin, wax or marble.' },
  'world-sky': { shot: 'R9', title: 'Sky', brief: 'An exterior under the physical sky.' },
  'denoise-noisy': { shot: 'R11', title: '16 samples', brief: 'A frame at 16 samples per pixel.' },
  'denoise-clean': { shot: 'R11', title: 'Denoised', brief: 'The same frame, denoised with OptiX.' },
} satisfies Record<string, RenderSlot>;

export type SlotId = keyof typeof slots;

const files = import.meta.glob<ImageMetadata>('../assets/renders/*.{avif,webp,jpg,jpeg,png}', {
  eager: true,
  import: 'default',
});

const byId = new Map<string, ImageMetadata>();
for (const [path, image] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  byId.set(id, image);
}

export function getRender(id: SlotId): { meta: RenderSlot; image?: ImageMetadata } {
  const meta: RenderSlot = slots[id];
  const image = byId.get(id);
  if (image && !meta.renderer) {
    throw new Error(
      `src/assets/renders/${id}.* exists but src/content/renders.ts does not say which renderer made it. ` +
        `Set "renderer" (and samples, resolution, time, hardware where known) for the "${id}" slot.`,
    );
  }
  return { meta, image };
}

export function hasRender(id: SlotId): boolean {
  return byId.has(id);
}

/** Empty slots are shown as labelled frames while developing (`npm run dev`)
 *  and are left out of production builds, so the site can be published before
 *  every render exists. NOVA_SHOW_PENDING=1 or =0 overrides either way. */
export const SHOW_PENDING = process.env.NOVA_SHOW_PENDING
  ? process.env.NOVA_SHOW_PENDING !== '0'
  : import.meta.env.DEV;

/** Whether a slot produces anything on the page. */
export function slotVisible(...ids: SlotId[]): boolean {
  return SHOW_PENDING || ids.every((id) => byId.has(id));
}

/** "Nova XPU · 256 spp · 3840×1600 · 41 s · RTX 5080" */
export function captionOf(meta: RenderSlot): string {
  return [meta.renderer, meta.samples, meta.resolution, meta.time, meta.hardware].filter(Boolean).join(' · ');
}
