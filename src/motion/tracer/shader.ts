// GLSL for the live illustrations: a small unidirectional path tracer with
// next-event estimation, written for WebGL 2.
//
// It is a teaching-sized renderer for one scene (the wordmark, a floor, two
// lights). It shares ideas with Nova (progressive accumulation, per-type
// components, a clamp on indirect light) but none of its code.

import { sceneGLSL } from './scene';

export const VERT = `#version 300 es
out vec2 vUv;
void main() {
  // One triangle that covers the viewport.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const TRACE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

#define PI 3.14159265359
#define EPS 2e-4
#define INF 1e9
${sceneGLSL}
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform uint uSeed;
uniform float uBlend;
uniform vec3 uCamPos, uCamRight, uCamUp, uCamFwd;
uniform float uTanFov, uAperture, uFocus;
uniform vec3 uLightPos;
uniform float uLightRad;
uniform vec3 uLightCol;   // radiance used to light the scene
uniform vec3 uLightVis;   // radiance shown where the light itself is seen
uniform vec3 uKeyPos, uKeyU, uKeyV, uKeyCol;
uniform int uPass, uBounces, uSpp;
uniform float uClamp;
out vec4 outColor;

// ---------------------------------------------------------------- sampling
uint rng;
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float rnd() { rng = pcg(rng); return float(rng) * (1.0 / 4294967296.0); }

mat3 basis(vec3 n) {
  vec3 a = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t = normalize(cross(a, n));
  return mat3(t, cross(n, t), n);
}
vec3 cosineDir(vec3 n) {
  float u = rnd(), v = rnd();
  float r = sqrt(u), phi = 2.0 * PI * v;
  return basis(n) * vec3(r * cos(phi), r * sin(phi), sqrt(max(0.0, 1.0 - u)));
}
vec3 sphereDir() {
  float z = 1.0 - 2.0 * rnd(), phi = 2.0 * PI * rnd();
  float r = sqrt(max(0.0, 1.0 - z * z));
  return vec3(r * cos(phi), r * sin(phi), z);
}

// ---------------------------------------------------------------- geometry
// obj: 0 floor, 1 N, 2 O, 3 V, 4 A, 5 the dot, 6 the key light
struct Hit { float t; vec3 n; int obj; };

float safeInv(float x) { return abs(x) < 1e-8 ? (x < 0.0 ? -1e8 : 1e8) : 1.0 / x; }

void hitLetters(vec3 ro, vec3 rd, inout Hit h) {
  float iz = safeInv(rd.z);
  float za = (-HD - ro.z) * iz, zb = (HD - ro.z) * iz;
  float tz0 = min(za, zb), tz1 = max(za, zb);
  if (tz1 < EPS || tz0 > h.t) return;
  vec3 nz = vec3(0.0, 0.0, rd.z > 0.0 ? -1.0 : 1.0);
  float ix = safeInv(rd.x);
  for (int L = 0; L < 3; L++) {
    vec4 lt = LETTER[L];
    float xa = (lt.x - ro.x) * ix, xb = (lt.y - ro.x) * ix;
    float s = max(tz0, min(xa, xb)), e = min(tz1, max(xa, xb));
    if (s > e || e < EPS || s > h.t) continue;
    int p0 = int(lt.z), p1 = p0 + int(lt.w);
    for (int p = p0; p < p1; p++) {
      float t0 = tz0, t1 = tz1;
      vec3 n = nz;
      bool ok = true;
      ivec2 pr = PRISM[p];
      for (int k = pr.x; k < pr.x + pr.y; k++) {
        vec3 E = EDGE[k];
        float d = dot(E.xy, rd.xy);
        float o = E.z - dot(E.xy, ro.xy);
        if (abs(d) < 1e-9) {
          if (o < 0.0) { ok = false; break; }
        } else {
          float t = o / d;
          if (d < 0.0) { if (t > t0) { t0 = t; n = vec3(E.xy, 0.0); } }
          else t1 = min(t1, t);
        }
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 > EPS && t0 < h.t) { h.t = t0; h.n = n; h.obj = L == 0 ? 1 : L + 2; }
    }
  }
}

// Ray against an elliptic cylinder along z. inv = 1 / semi-axes.
bool cyl(vec2 o, vec2 d, vec2 inv, out float t0, out float t1) {
  o *= inv; d *= inv;
  float A = dot(d, d), B = dot(o, d), C = dot(o, o) - 1.0;
  if (A < 1e-12) { t0 = -INF; t1 = INF; return C < 0.0; }
  float h = B * B - A * C;
  if (h < 0.0) return false;
  h = sqrt(h);
  t0 = (-B - h) / A; t1 = (-B + h) / A;
  return true;
}

// The O: an elliptic disc of depth 2 HD with an elliptic hole.
void hitRing(vec3 ro, vec3 rd, inout Hit h) {
  vec2 o = ro.xy - OC;
  float iz = safeInv(rd.z);
  float za = (-HD - ro.z) * iz, zb = (HD - ro.z) * iz;
  float tz0 = min(za, zb), tz1 = max(za, zb);
  float a0, a1;
  if (!cyl(o, rd.xy, 1.0 / OA, a0, a1)) return;
  float s = max(tz0, a0), e = min(tz1, a1);
  if (s >= e || e < EPS || s > h.t) return;
  float b0, b1;
  bool hole = cyl(o, rd.xy, 1.0 / OI, b0, b1);
  bool startsInHole = hole && b0 < s && b1 > s;
  float t = INF;
  vec3 n = vec3(0.0);
  if (!startsInHole && s > EPS) {
    t = s;
    n = tz0 > a0 ? vec3(0.0, 0.0, rd.z > 0.0 ? -1.0 : 1.0)
                 : normalize(vec3((o + rd.xy * a0) / (OA * OA), 0.0));
  } else if (hole && b1 > max(s, EPS) && b1 < e) {
    t = b1;
    n = -normalize(vec3((o + rd.xy * b1) / (OI * OI), 0.0));
  }
  if (t < h.t) { h.t = t; h.n = n; h.obj = 2; }
}

bool occluded(vec3 ro, vec3 rd, float tmax) {
  Hit h = Hit(tmax, vec3(0.0), -1);
  hitLetters(ro, rd, h);
  if (h.obj >= 0) return true;
  hitRing(ro, rd, h);
  return h.obj >= 0;
}

float hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd), q = dot(oc, oc) - r * r;
  float d = b * b - q;
  if (d < 0.0) return -1.0;
  d = sqrt(d);
  float t = -b - d;
  return t > EPS ? t : -b + d;
}

Hit scene(vec3 ro, vec3 rd) {
  Hit h = Hit(INF, vec3(0.0), -1);
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y;
    if (t > EPS) { h.t = t; h.n = vec3(0.0, 1.0, 0.0); h.obj = 0; }
  }
  hitLetters(ro, rd, h);
  hitRing(ro, rd, h);
  float ts = hitSphere(ro, rd, uLightPos, uLightRad);
  if (ts > EPS && ts < h.t) { h.t = ts; h.n = normalize(ro + rd * ts - uLightPos); h.obj = 5; }
  // The key light: a one-sided rectangle.
  vec3 kn = normalize(cross(uKeyU, uKeyV));
  float kd = dot(kn, rd);
  if (kd < 0.0) {
    float t = dot(uKeyPos - ro, kn) / kd;
    if (t > EPS && t < h.t) {
      vec3 q = ro + rd * t - uKeyPos;
      if (abs(dot(q, uKeyU)) < dot(uKeyU, uKeyU) && abs(dot(q, uKeyV)) < dot(uKeyV, uKeyV)) {
        h.t = t; h.n = kn; h.obj = 6;
      }
    }
  }
  return h;
}

// ------------------------------------------------------------------ lights
// Direct light on a diffuse point: both lights, one shadow ray each.
// The key light is linked to the letters only, so the floor stays black glass.
vec3 direct(vec3 p, vec3 n, bool keyLit) {
  vec3 sum = vec3(0.0);
  vec3 o = p + n * EPS * 4.0;

  // The dot: a sphere, sampled over the cone it subtends.
  vec3 w = uLightPos - p;
  float d2 = dot(w, w);
  float r2 = uLightRad * uLightRad;
  if (d2 > r2 * 1.0001) {
    float d = sqrt(d2);
    w /= d;
    float cosMax = sqrt(max(0.0, 1.0 - r2 / d2));
    float cosT = 1.0 - rnd() * (1.0 - cosMax);
    float sinT = sqrt(max(0.0, 1.0 - cosT * cosT));
    float phi = 2.0 * PI * rnd();
    vec3 dir = basis(w) * vec3(sinT * cos(phi), sinT * sin(phi), cosT);
    float ndl = dot(n, dir);
    if (ndl > 0.0) {
      float tl = hitSphere(o, dir, uLightPos, uLightRad);
      if (tl > 0.0 && !occluded(o, dir, tl - EPS)) sum += uLightCol * ndl * 2.0 * (1.0 - cosMax);
    }
  }

  if (!keyLit) return sum;

  // The key: a rectangle, sampled by area.
  vec3 q = uKeyPos + (2.0 * rnd() - 1.0) * uKeyU + (2.0 * rnd() - 1.0) * uKeyV;
  vec3 dir = q - p;
  float dist2 = dot(dir, dir);
  float dist = sqrt(dist2);
  dir /= dist;
  vec3 kn = normalize(cross(uKeyU, uKeyV));
  float ndl = dot(n, dir), ldl = -dot(kn, dir);
  if (ndl > 0.0 && ldl > 0.0) {
    float area = 4.0 * length(uKeyU) * length(uKeyV);
    if (!occluded(o, dir, dist - EPS)) sum += uKeyCol * ndl * ldl * area / (dist2 * PI);
  }
  return sum;
}

// ------------------------------------------------------------------- paths
// uPass: 0 beauty, 1 direct diffuse, 2 indirect diffuse, 3 direct glossy,
// 4 indirect glossy, 5 visible lights, 6 normals, 7 depth, 8 object ids.
bool wanted(int cls, bool isDirect) {
  if (uPass == 0) return true;
  if (uPass == 1) return cls == 1 && isDirect;
  if (uPass == 2) return cls == 1 && !isDirect;
  if (uPass == 3) return cls == 2 && isDirect;
  if (uPass == 4) return cls == 2 && !isDirect;
  return false;
}

vec3 idColor(int obj) {
  if (obj == 1) return vec3(0.96, 0.78, 0.30);
  if (obj == 2) return vec3(0.99, 0.28, 0.10);
  if (obj == 3) return vec3(0.36, 0.72, 0.86);
  if (obj == 4) return vec3(0.74, 0.52, 0.92);
  if (obj == 5) return vec3(1.0);
  if (obj == 0) return vec3(0.16, 0.17, 0.19);
  return vec3(0.0);
}

vec3 radiance(vec3 ro, vec3 rd) {
  vec3 L = vec3(0.0), T = vec3(1.0);
  bool sharp = true;  // the last bounce was specular (or this is the camera ray)
  int cls = 0;        // class of the first scattering event: 1 diffuse, 2 glossy
  for (int b = 0; b <= uBounces; b++) {
    Hit h = scene(ro, rd);
    if (h.obj < 0) {
      if (b == 0 && uPass >= 6) return vec3(0.0);
      break;
    }
    if (b == 0 && uPass >= 6) {
      if (uPass == 6) return h.n * 0.5 + 0.5;
      if (uPass == 7) return vec3(exp(-0.22 * h.t) * 1.6);
      return idColor(h.obj);
    }
    if (h.obj >= 5) {
      // Lights are found by the shadow rays; a hit counts only after a
      // specular bounce or straight from the camera.
      if (sharp) {
        vec3 e = h.obj == 5 ? uLightVis : uKeyCol;
        if (b == 0) { if (uPass == 0 || uPass == 5) L += e; }
        else if (wanted(cls, b == 1)) L += min(T * e, vec3(b > 1 ? uClamp : INF));
      }
      break;
    }

    vec3 p = ro + rd * h.t;
    vec3 n = h.n;
    bool isFloor = h.obj == 0;
    vec3 albedo = isFloor ? vec3(0.16) : vec3(0.86, 0.84, 0.80);
    float rough = isFloor ? 0.11 : 0.5;
    float f0 = isFloor ? 0.045 : 0.04;
    float c = clamp(dot(-rd, n), 0.0, 1.0);
    float F = f0 + (1.0 - f0) * pow(1.0 - c, 5.0);
    if (isFloor) F *= 0.46;  // a satin floor: the reflection stays below the object

    if (rnd() < F) {
      // Glossy reflection: the mirror direction, spread by the roughness.
      if (b == 0) cls = 2;
      rd = normalize(reflect(rd, n) + rough * rough * sphereDir());
      if (dot(rd, n) <= 0.0) break;
      sharp = true;
    } else {
      if (b == 0) cls = 1;
      T *= albedo;
      if (wanted(cls, b == 0)) L += min(T * direct(p, n, !isFloor), vec3(b > 0 ? uClamp : INF));
      rd = cosineDir(n);
      sharp = false;
    }
    ro = p + n * EPS * 4.0;

    if (b >= 2) {
      float q = clamp(max(T.r, max(T.g, T.b)), 0.05, 1.0);
      if (rnd() > q) break;
      T /= q;
    }
  }
  return L;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  rng = pcg(uint(px.x) + pcg(uint(px.y) + pcg(uSeed)));
  vec3 sum = vec3(0.0);
  float aspect = uRes.x / uRes.y;
  for (int s = 0; s < uSpp; s++) {
    vec2 jitter = vec2(rnd(), rnd());
    vec2 ndc = ((gl_FragCoord.xy - 0.5 + jitter) / uRes) * 2.0 - 1.0;
    vec3 rd = normalize(uCamFwd + ndc.x * aspect * uTanFov * uCamRight + ndc.y * uTanFov * uCamUp);
    vec3 ro = uCamPos;
    if (uAperture > 0.0 && uPass < 6) {
      // Thin lens.
      vec3 focus = ro + rd * (uFocus / dot(rd, uCamFwd));
      float a = 2.0 * PI * rnd(), r = uAperture * sqrt(rnd());
      ro += (uCamRight * cos(a) + uCamUp * sin(a)) * r;
      rd = normalize(focus - ro);
    }
    vec3 c = radiance(ro, rd);
    if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
    sum += c;
  }
  sum /= float(uSpp);
  vec3 prev = texelFetch(uPrev, px, 0).rgb;
  outColor = vec4(mix(prev, sum, uBlend), 1.0);
}`;

export const DISPLAY = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uUvScale;
uniform float uExposure;
uniform float uRaw;      // 1: utility passes are shown as they are
uniform vec3 uLift;      // the page's background, so black meets it seamlessly
uniform vec4 uGlare;     // xy: light on screen (0..1), z: radius, w: strength
uniform vec3 uGlareCol;
uniform float uAspect;
uniform float uFade;     // 0..1, multiplies the picture (fade to the page)
in vec2 vUv;
out vec4 outColor;

vec3 filmic(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec3 c = texture(uTex, vUv * uUvScale).rgb;
  if (uRaw < 0.5) {
    // The veiling glare of the logo's dot: a soft halo around the light.
    vec2 d = (vUv - uGlare.xy) * vec2(uAspect, 1.0);
    float r = length(d) / max(uGlare.z, 1e-4);
    c += uGlareCol * uGlare.w * (exp(-r * r * 2.2) * 0.55 + 0.45 / (1.0 + r * r * 6.0));
    c = filmic(c * uExposure);
    c = pow(c, vec3(1.0 / 2.2));
  } else {
    c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  }
  c *= uFade;
  c = uLift + (1.0 - uLift) * c;
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(c, 1.0);
}`;
