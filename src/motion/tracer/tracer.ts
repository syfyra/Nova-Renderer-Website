// A progressive path tracer on a canvas (WebGL 2).
//
// render() draws one frame: it adds samples to a floating-point accumulation
// buffer and shows the tone-mapped result. While the scene changes the buffer
// is blended instead of averaged, so motion stays responsive and the picture
// then converges from what is already on screen. Rendering stops by itself
// once the sample target is reached.

import { DISPLAY, TRACE, VERT } from './shader';
import { scene } from './scene';

export type Vec3 = [number, number, number];

export interface Camera {
  pos: Vec3;
  target: Vec3;
  /** Vertical field of view in degrees. */
  fov: number;
  aperture: number;
  focus: number;
}

export interface TracerOptions {
  /** Upper bound of pixels traced per frame; lowered on slow GPUs. */
  maxPixels?: number;
  /** Samples per pixel after which rendering stops. */
  maxSpp?: number;
  bounces?: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Passes the tracer can output (see TRACE). */
export const PASS = {
  beauty: 0,
  directDiffuse: 1,
  indirectDiffuse: 2,
  directGlossy: 3,
  indirectGlossy: 4,
  visibleLights: 5,
  normals: 6,
  depth: 7,
  ids: 8,
} as const;

const debug = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export class PathTracer {
  readonly gl: WebGL2RenderingContext;
  private trace: WebGLProgram;
  private display: WebGLProgram;
  private uT: Record<string, WebGLUniformLocation | null> = {};
  private uD: Record<string, WebGLUniformLocation | null> = {};
  private tex: WebGLTexture[] = [];
  private fbo: WebGLFramebuffer[] = [];
  private cur = 0;
  private frameIndex = 1;
  private restart = true;
  private settle = 0;
  private lastBlock = 1;
  private pixelBudget: number;
  /** How many times over the pixel budget the GPU could go: > 1 on fast GPUs. */
  headroom = 1;
  /** The GPU cannot trace a useful picture at an interactive rate (software rendering, for example). */
  slow = false;

  /** Render size in pixels. */
  width = 0;
  height = 0;
  /** Samples accumulated at full resolution. */
  spp = 0;
  maxSpp: number;
  bounces: number;
  /** Proxy block size: 1 renders every pixel, 2 and 4 one pixel per block. */
  block = 1;
  pass: number = PASS.beauty;
  exposure = 1.25;
  fade = 1;
  /** Strength of the halo around the dot. */
  glare = 1;

  camera: Camera = { pos: [0, 0.4, 7], target: [0, 0.3, 0], fov: 24, aperture: 0, focus: 7 };
  light = {
    pos: [scene.dot.x, scene.dot.y, scene.dot.z] as Vec3,
    radius: scene.dot.r,
    /** Radiance that lights the scene. */
    color: [13, 2.4, 0.42] as Vec3,
    /** Radiance of the dot where it is seen directly. */
    visible: [1.5, 0.05, 0.006] as Vec3,
  };
  // A large soft light in front of the wordmark and a little above it: it
  // faces the letters, grazes the floor and throws long shadows behind them.
  key = {
    pos: [0.6, 2.0, 6.5] as Vec3,
    u: [2.4, 0, 0] as Vec3,
    v: [0, -0.97, 0.224] as Vec3,
    color: [11.5, 11.0, 10.3] as Vec3,
  };

  static supported(): boolean {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      return !!gl && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    } catch {
      return false;
    }
  }

  constructor(
    readonly canvas: HTMLCanvasElement,
    opts: TracerOptions = {},
  ) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('WebGL 2 is not available');
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) {
      throw new Error('Floating-point render targets are not available');
    }
    this.gl = gl;
    this.maxSpp = opts.maxSpp ?? 512;
    this.bounces = opts.bounces ?? 4;
    this.trace = this.program(VERT, TRACE);
    this.display = this.program(VERT, DISPLAY);
    for (const n of [
      'uPrev', 'uRes', 'uSeed', 'uBlend', 'uCamPos', 'uCamRight', 'uCamUp', 'uCamFwd', 'uTanFov', 'uAperture',
      'uFocus', 'uLightPos', 'uLightRad', 'uLightCol', 'uLightVis', 'uKeyPos', 'uKeyU', 'uKeyV', 'uKeyCol',
      'uPass', 'uBounces', 'uSpp', 'uClamp',
    ]) this.uT[n] = gl.getUniformLocation(this.trace, n);
    for (const n of ['uTex', 'uUvScale', 'uExposure', 'uRaw', 'uLift', 'uGlare', 'uGlareCol', 'uAspect', 'uFade']) {
      this.uD[n] = gl.getUniformLocation(this.display, n);
    }
    gl.bindVertexArray(gl.createVertexArray());
    const forced = Number(debug.get('rtpx'));
    this.pixelBudget = forced > 0 ? forced : this.measure(opts.maxPixels ?? 900_000);
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const make = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(`Shader: ${gl.getShaderInfoLog(s)}`);
      }
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Program: ${gl.getProgramInfoLog(p)}`);
    return p;
  }

  private allocate(w: number, h: number) {
    const gl = this.gl;
    this.tex.forEach((t) => gl.deleteTexture(t));
    this.fbo.forEach((f) => gl.deleteFramebuffer(f));
    this.tex = [];
    this.fbo = [];
    for (let i = 0; i < 2; i++) {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      this.tex.push(t);
      this.fbo.push(f);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.reset();
  }

  /** Time a few small frames and derive how many pixels fit into a frame. */
  private measure(maxPixels: number): number {
    const gl = this.gl;
    this.allocate(192, 108);
    const px = new Uint8Array(4);
    // Reading a pixel back waits for the GPU, which makes the timing honest.
    const sync = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    };
    this.step(1, 1);
    this.present();
    sync();
    const t0 = performance.now();
    for (let i = 0; i < 3; i++) this.step(1, 1);
    this.present();
    sync();
    const ms = Math.max(0.05, (performance.now() - t0) / 3);
    // Aim for about 9 ms of tracing per frame.
    const budget = ((192 * 108) / ms) * 9;
    this.headroom = budget / maxPixels;
    this.slow = budget < 45_000;
    this.reset();
    return Math.max(70_000, Math.min(maxPixels, budget));
  }

  /** Fit the render size to the canvas' CSS size within the pixel budget. */
  resize(cssWidth: number, cssHeight: number, dpr = Math.min(window.devicePixelRatio || 1, 1.5)) {
    if (cssWidth < 2 || cssHeight < 2) return;
    let w = cssWidth * dpr;
    let h = cssHeight * dpr;
    const k = Math.sqrt(Math.min(1, this.pixelBudget / (w * h)));
    w = Math.max(16, Math.round((w * k) / 4) * 4);
    h = Math.max(16, Math.round((h * k) / 4) * 4);
    if (w !== this.width || h !== this.height) this.allocate(w, h);
  }

  /** Start again from nothing (a cut). */
  reset() {
    this.restart = true;
    this.spp = 0;
  }

  /** The scene changed: keep the picture but stop averaging for a moment. */
  touch() {
    this.settle = 2;
    this.spp = Math.min(this.spp, 1);
  }

  get converged() {
    return this.spp >= this.maxSpp && this.settle === 0 && !this.restart;
  }

  /** Where a world point lands on screen (0..1, origin bottom left), or null behind the camera. */
  project(p: Vec3): { x: number; y: number; z: number } | null {
    const c = this.camera;
    const fwd = norm(sub(c.target, c.pos));
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    const v = sub(p, c.pos);
    const z = dot(v, fwd);
    if (z <= 1e-4) return null;
    const t = Math.tan((c.fov * Math.PI) / 360);
    const aspect = this.width / this.height;
    return { x: 0.5 + dot(v, right) / (z * t * aspect) / 2, y: 0.5 + dot(v, up) / (z * t) / 2, z };
  }

  /** The world-space ray through a point of the canvas (0..1, origin bottom left). */
  ray(x: number, y: number): { origin: Vec3; dir: Vec3 } {
    const c = this.camera;
    const fwd = norm(sub(c.target, c.pos));
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    const t = Math.tan((c.fov * Math.PI) / 360);
    const aspect = this.width / this.height;
    const nx = (x * 2 - 1) * aspect * t;
    const ny = (y * 2 - 1) * t;
    return {
      origin: c.pos,
      dir: norm([fwd[0] + nx * right[0] + ny * up[0], fwd[1] + nx * right[1] + ny * up[1], fwd[2] + nx * right[2] + ny * up[2]]),
    };
  }

  /** Trace `samples` per pixel into the accumulation buffer. */
  private step(samples: number, blend: number) {
    const gl = this.gl;
    const c = this.camera;
    const u = this.uT;
    const block = this.block;
    const vw = Math.max(1, Math.ceil(this.width / block));
    const vh = Math.max(1, Math.ceil(this.height / block));
    const fwd = norm(sub(c.target, c.pos));
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);

    gl.useProgram(this.trace);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[1 - this.cur]);
    gl.viewport(0, 0, vw, vh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
    gl.uniform1i(u.uPrev, 0);
    gl.uniform2f(u.uRes, vw, vh);
    gl.uniform1ui(u.uSeed, this.frameIndex++);
    gl.uniform1f(u.uBlend, blend);
    gl.uniform3fv(u.uCamPos, c.pos);
    gl.uniform3fv(u.uCamRight, right);
    gl.uniform3fv(u.uCamUp, up);
    gl.uniform3fv(u.uCamFwd, fwd);
    gl.uniform1f(u.uTanFov, Math.tan((c.fov * Math.PI) / 360));
    gl.uniform1f(u.uAperture, c.aperture);
    gl.uniform1f(u.uFocus, c.focus);
    gl.uniform3fv(u.uLightPos, this.light.pos);
    gl.uniform1f(u.uLightRad, this.light.radius);
    gl.uniform3fv(u.uLightCol, this.light.color);
    gl.uniform3fv(u.uLightVis, this.light.visible);
    gl.uniform3fv(u.uKeyPos, this.key.pos);
    gl.uniform3fv(u.uKeyU, this.key.u);
    gl.uniform3fv(u.uKeyV, this.key.v);
    gl.uniform3fv(u.uKeyCol, this.key.color);
    gl.uniform1i(u.uPass, this.pass);
    gl.uniform1i(u.uBounces, this.bounces);
    gl.uniform1i(u.uSpp, samples);
    gl.uniform1f(u.uClamp, 8);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.cur = 1 - this.cur;
  }

  private present() {
    const gl = this.gl;
    const u = this.uD;
    const block = this.block;
    const vw = Math.ceil(this.width / block);
    const vh = Math.ceil(this.height / block);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.display);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
    const filter = block > 1 ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uUvScale, vw / this.width, vh / this.height);
    gl.uniform1f(u.uExposure, this.exposure);
    gl.uniform1f(u.uRaw, this.pass >= PASS.normals ? 1 : 0);
    // The page background (--bg), so the stage has no edge.
    gl.uniform3f(u.uLift, 16 / 255, 15 / 255, 13 / 255);
    gl.uniform1f(u.uAspect, this.width / this.height);
    gl.uniform1f(u.uFade, this.fade);
    const showGlare = this.pass === PASS.beauty || this.pass === PASS.visibleLights;
    const s = showGlare ? this.project(this.light.pos) : null;
    if (s && this.glare > 0) {
      // The halo scales with the dot's size on screen.
      const radius = (this.light.radius / (s.z * Math.tan((this.camera.fov * Math.PI) / 360))) * 1.9;
      // Up close the halo would wash out the frame, so it thins as it grows.
      gl.uniform4f(u.uGlare, s.x, s.y, radius, this.glare * Math.min(1, 0.02 / (radius * radius)));
    } else {
      gl.uniform4f(u.uGlare, 0, 0, 1, 0);
    }
    gl.uniform3f(u.uGlareCol, 0.3, 0.02, 0.003);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Render one frame. Returns false when there was nothing left to do. */
  render(samples = 1): boolean {
    if (!this.width) return false;
    if (this.block !== this.lastBlock) {
      this.restart = true;
      this.lastBlock = this.block;
    }
    if (this.converged) return false;
    if (this.restart) {
      this.step(samples, 1);
      this.restart = false;
      this.spp = this.block === 1 ? samples : 0;
    } else if (this.settle > 0) {
      // In motion: an exponential blend keeps the picture responsive.
      this.step(samples, 0.4);
      this.settle--;
      this.spp = 1;
    } else {
      const n = Math.max(this.spp, 1);
      this.step(samples, samples / (n + samples));
      this.spp = n + samples;
    }
    this.present();
    return true;
  }

  /** Redraw the current buffer (after exposure or fade changed). */
  refresh() {
    if (this.width) this.present();
  }

  dispose() {
    const gl = this.gl;
    this.tex.forEach((t) => gl.deleteTexture(t));
    this.fbo.forEach((f) => gl.deleteFramebuffer(f));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
