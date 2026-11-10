// A small Monte Carlo accumulator for the site's two illustrations: the mark
// that resolves out of noise in the hero, and the proxy-pass demonstration.
//
// It estimates a known target image the way a path tracer estimates a pixel:
// every sample is the target times a random weight with mean 1 (mostly zero,
// sometimes large), and the picture is the running mean. The noise therefore
// falls with the square root of the sample count, as it does in a renderer.
// It is an illustration of convergence, not a renderer and not Nova's output.

export interface Target {
  w: number;
  h: number;
  /** Linear RGB, three floats per pixel. */
  rgb: Float32Array;
  /** Probability that a sample of this pixel is non-zero (lower = noisier). */
  p: Float32Array;
}

const LUT = new Uint8ClampedArray(1025);
for (let i = 0; i <= 1024; i++) LUT[i] = Math.round(255 * Math.pow(i / 1024, 1 / 2.2));

export function srgbToLinear(v: number): number {
  return Math.pow(v / 255, 2.2);
}

export class Accumulator {
  readonly ctx: CanvasRenderingContext2D;
  private image: ImageData;
  private mean: Float32Array;
  private count: Uint16Array;
  private active: Uint32Array;
  private state = 0x9e3779b9;
  /** Samples per pixel taken at full resolution. */
  spp = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private target: Target,
  ) {
    canvas.width = target.w;
    canvas.height = target.h;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.image = this.ctx.createImageData(target.w, target.h);
    this.mean = new Float32Array(target.w * target.h);
    this.count = new Uint16Array(target.w * target.h);
    this.active = this.findActive();
  }

  private findActive(): Uint32Array {
    const { rgb, w, h } = this.target;
    const list: number[] = [];
    for (let i = 0; i < w * h; i++) {
      if (rgb[i * 3] + rgb[i * 3 + 1] + rgb[i * 3 + 2] > 2e-4) list.push(i);
    }
    return Uint32Array.from(list);
  }

  setTarget(target: Target) {
    this.target = target;
    this.active = this.findActive();
  }

  reset(seed = 1) {
    this.mean.fill(0);
    this.count.fill(0);
    this.spp = 0;
    this.state = (seed * 0x9e3779b9) >>> 0 || 1;
  }

  /** One sample for every `block`-th pixel in x and y (block 1: every pixel). */
  sample(block = 1) {
    const { p, w } = this.target;
    const { mean, count, active } = this;
    let s = this.state;
    for (let k = 0; k < active.length; k++) {
      const i = active[k];
      if (block > 1) {
        const x = i % w;
        const y = (i - x) / w;
        if (x % block || y % block) continue;
      }
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      const u = (s >>> 0) / 4294967296;
      const pi = p[i];
      const m = u < pi ? 1 / pi : 0;
      const n = count[i];
      mean[i] = (mean[i] * n + m) / (n + 1);
      count[i] = n + 1;
    }
    this.state = s;
    if (block === 1) this.spp += 1;
  }

  /** Double the sample count. The mean of the new batch of `spp` samples is
   *  drawn from its normal approximation, which is exact enough from 16 on. */
  double() {
    const { p } = this.target;
    const { mean, count, active } = this;
    const n = this.spp;
    let s = this.state;
    for (let k = 0; k < active.length; k++) {
      const i = active[k];
      let z = -2;
      for (let j = 0; j < 4; j++) {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        z += (s >>> 0) / 4294967296;
      }
      z *= 1.7320508;
      const pi = p[i];
      const batch = Math.max(0, 1 + z * Math.sqrt((1 - pi) / (pi * n)));
      mean[i] = (mean[i] + batch) * 0.5;
      count[i] = Math.min(65535, count[i] * 2);
    }
    this.state = s;
    this.spp = n * 2;
  }

  /** Draw the current estimate. With block > 1 each block shows the one pixel
   *  that has been sampled in it, as a proxy pass does. */
  draw(block = 1) {
    const { rgb, w, h } = this.target;
    const { mean, active } = this;
    const data = this.image.data;
    if (block === 1) {
      data.fill(0);
      for (let k = 0; k < active.length; k++) {
        const i = active[k];
        const m = mean[i];
        if (m <= 0) continue;
        const o = i * 4;
        const t = i * 3;
        data[o] = LUT[Math.min(1024, (rgb[t] * m * 1024) | 0)];
        data[o + 1] = LUT[Math.min(1024, (rgb[t + 1] * m * 1024) | 0)];
        data[o + 2] = LUT[Math.min(1024, (rgb[t + 2] * m * 1024) | 0)];
        data[o + 3] = 255;
      }
    } else {
      for (let y = 0; y < h; y++) {
        const by = y - (y % block);
        for (let x = 0; x < w; x++) {
          const src = by * w + (x - (x % block));
          const m = mean[src];
          const o = (y * w + x) * 4;
          const t = src * 3;
          data[o] = LUT[Math.min(1024, (rgb[t] * m * 1024) | 0)];
          data[o + 1] = LUT[Math.min(1024, (rgb[t + 1] * m * 1024) | 0)];
          data[o + 2] = LUT[Math.min(1024, (rgb[t + 2] * m * 1024) | 0)];
          data[o + 3] = m > 0 ? 255 : 0;
        }
      }
    }
    this.ctx.putImageData(this.image, 0, 0);
  }
}

/** Build a target from whatever `paint` draws on a black canvas. */
export function targetFromCanvas(
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
  probability: (luminance: number) => number,
): Target {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  paint(ctx);
  const px = ctx.getImageData(0, 0, w, h).data;
  const rgb = new Float32Array(w * h * 3);
  const p = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = srgbToLinear(px[i * 4]);
    const g = srgbToLinear(px[i * 4 + 1]);
    const b = srgbToLinear(px[i * 4 + 2]);
    rgb[i * 3] = r;
    rgb[i * 3 + 1] = g;
    rgb[i * 3 + 2] = b;
    p[i] = probability(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  return { w, h, rgb, p };
}
