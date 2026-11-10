// The scene of the live illustrations: the Nova wordmark as solid letters on a
// floor, with the dot of the O as a light.
//
// The geometry comes from the same paths as the 2D wordmark. N, V and A are
// decomposed into convex prisms (a ray clips against their edge planes), the
// O is an elliptic ring, the dot a sphere. One unit is the cap height.

import wm from '../../components/brand/wordmark.json';

type P = [number, number];

function polygons(d: string): P[][] {
  return d
    .split('Z')
    .map((part) => (part.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number))
    .filter((n) => n.length >= 6)
    .map((n) => {
      const pts: P[] = [];
      for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
      return pts;
    });
}

const nPts = polygons(wm.N)[0];
const vPts = polygons(wm.V)[0];
const [aPts, aCounter] = polygons(wm.A);

const TOP = nPts[0][1];
const BASE = nPts[9][1];
const CAP = BASE - TOP;

/** Logo units to world: x centred, y up from the baseline, cap height 1. */
const world = ([x, y]: P): P => [(x - wm.w / 2) / CAP, (BASE - y) / CAP];
const at = (a: P, b: P, y: number): P => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];

// ---- convex pieces, in logo units
const N: P[][] = [
  [nPts[0], [nPts[8][0], TOP], nPts[8], nPts[9]],
  [[nPts[3][0], TOP], nPts[4], nPts[5], [nPts[3][0], BASE]],
  [[nPts[8][0], TOP], nPts[1], nPts[2], [nPts[2][0], BASE], nPts[6], nPts[7]],
];
const V: P[][] = [
  [vPts[0], vPts[1], vPts[2], vPts[6]],
  [vPts[2], vPts[3], vPts[4], vPts[5]],
  [vPts[2], vPts[5], vPts[6]],
];
const barTop = aCounter[1][1];
const barBottom = aPts[4][1];
const L = (y: number) => at(aPts[0], aPts[7], y);
const R = (y: number) => at(aPts[1], aPts[2], y);
const A: P[][] = [
  [aPts[0], aPts[1], aCounter[0]],
  [aPts[0], aCounter[0], aCounter[2], L(barTop)],
  [aPts[1], R(barTop), aCounter[1], aCounter[0]],
  [L(barTop), R(barTop), R(barBottom), L(barBottom)],
  [L(barBottom), aPts[5], aPts[6], aPts[7]],
  [aPts[4], R(barBottom), aPts[2], aPts[3]],
];

interface Prism {
  first: number;
  count: number;
}

const edges: [number, number, number][] = [];
const prisms: Prism[] = [];
const letters: [number, number, number, number][] = [];

for (const letter of [N, V, A]) {
  const firstPrism = prisms.length;
  let xmin = Infinity;
  let xmax = -Infinity;
  for (const piece of letter) {
    const pts = piece.map(world);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const first = edges.length;
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      let nx = b[1] - a[1];
      let ny = a[0] - b[0];
      const len = Math.hypot(nx, ny);
      nx /= len;
      ny /= len;
      // Outward: away from the centroid.
      if (nx * (cx - a[0]) + ny * (cy - a[1]) > 0) {
        nx = -nx;
        ny = -ny;
      }
      edges.push([nx, ny, nx * a[0] + ny * a[1]]);
      xmin = Math.min(xmin, a[0]);
      xmax = Math.max(xmax, a[0]);
    });
    prisms.push({ first, count: pts.length });
  }
  letters.push([xmin, xmax, firstPrism, prisms.length - firstPrism]);
}

const oCentre = world([wm.dot.cx, wm.dot.cy]);
// Semi-axes of the O's outer contour and counter, from the logo.
const outer: P = [239.3 / CAP, 258.14 / CAP];
const inner: P = [117.8 / CAP, 152.8 / CAP];

export const scene = {
  /** Half the depth of the letters. */
  halfDepth: 0.19,
  width: wm.w / CAP,
  o: { x: oCentre[0], y: oCentre[1], outer, inner },
  dot: { x: oCentre[0], y: oCentre[1], z: 0, r: wm.dot.r / CAP },
};

const f = (n: number) => {
  const s = n.toFixed(6);
  return s.includes('.') ? s : `${s}.0`;
};

/** GLSL constants describing the letters. */
export const sceneGLSL = `
const float HD = ${f(scene.halfDepth)};
const vec3 EDGE[${edges.length}] = vec3[${edges.length}](
  ${edges.map((e) => `vec3(${f(e[0])}, ${f(e[1])}, ${f(e[2])})`).join(',\n  ')}
);
const ivec2 PRISM[${prisms.length}] = ivec2[${prisms.length}](
  ${prisms.map((p) => `ivec2(${p.first}, ${p.count})`).join(', ')}
);
const vec4 LETTER[3] = vec4[3](
  ${letters.map((l) => `vec4(${f(l[0])}, ${f(l[1])}, ${f(l[2])}, ${f(l[3])})`).join(',\n  ')}
);
const vec2 OC = vec2(${f(oCentre[0])}, ${f(oCentre[1])});
const vec2 OA = vec2(${f(outer[0])}, ${f(outer[1])});
const vec2 OI = vec2(${f(inner[0])}, ${f(inner[1])});
`;
