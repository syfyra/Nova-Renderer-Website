# Nova website: implementation plan

A product website for [Nova](https://github.com/syfyra/Nova-Renderer), the path tracer for Houdini Solaris.
This is the plan the site started from, kept as written.

> **Status.** The site is built and published. Against this plan, the colours are a warm ramp, panels are solid
> instead of glass, and decorative glows are gone; the README describes the current design and motion.

Source of truth: `syfyra/Nova-Renderer` at tag `v0.1.0` (commit `4ce13bd`), read in full for this plan:
`README.md`, `docs/reference.md`, `docs/benchmarks.md`, `docs/bug-audit-2026-11.md`, `docs/design/M10.md`,
`docs/design/M11.md`, `tools/installer/README.md`, the installer UI and the logo.

---

## 1. What the repository says (and what the site may claim)

### 1.1 The product in one paragraph

Nova is a physically based path tracer that plugs into Solaris as a Hydra render delegate (`hdNova`). Houdini
sees two renderers: **Nova** (CPU: Embree 4, wavefront path tracer, SIMD shading VM) and **Nova XPU** (NVIDIA GPU:
CUDA wavefront kernels, OptiX 9). Both run the same code with the same random numbers, so their images match up to
floating-point rounding. Nova reads Karma's scenes, materials, lights, render settings and AOVs, and every feature
is measured against Karma CPU or an analytic value. MIT licensed. Version 0.1.0.

### 1.2 Hard facts the site must state plainly

| Fact | Value | Source |
|---|---|---|
| Version | 0.1.0 | README |
| Platform | Windows x64 only | README |
| Host | Houdini 22.0 only (built against USD of 22.0.466) | README |
| CPU | AVX2 required | README |
| GPU for Nova XPU | NVIDIA RTX 50 series only (Blackwell); everything else renders on the CPU | README |
| Licence | MIT | LICENSE |
| Tests | about 690 automated tests | README |
| Affiliation | independent; not affiliated with or endorsed by SideFX or NVIDIA | README |

### 1.3 Claims ledger (the only numbers allowed on the site)

Every figure appears with its conditions. Benchmark machine: Ryzen 7 9800X3D (16 threads), GeForce RTX 5080,
Windows 11; `nova_cli`, 960x540, 64 spp, the Karma reference scenes, unless noted.

| Claim | Exact wording limits | Source |
|---|---|---|
| CPU and GPU render the same image | reference scenes within 1 % in every pixel; exception `mtl_textured` (texture filtering differs) | benchmarks M10 |
| Nova XPU speed | 4.3-7.7x the 16-thread CPU on surfaces at 64 spp including setup; 9-16x per sample; volumes and heavy layered materials about 4x; setup about 0.3 s | benchmarks M10 |
| CPU throughput | 20-38 Mrays/s on the reference scenes | benchmarks M10 |
| IPR latency (CPU) | first image 23-94 ms after an edit, 980 000 triangles, 1280x720 | benchmarks M7 |
| IPR latency (XPU) | about 7 ms per pass after an edit, 4.2M triangles, 640x360 | benchmarks M10 |
| Adaptive sampling | 3.25x at equal error on a glass scene; about even on uniformly noisy scenes | benchmarks M7 |
| OptiX denoiser | 2.5 ms at 960x540, 8 ms at 1080p, 31 ms at 4K on the RTX 5080; error 8-15x lower at 16 spp | benchmarks M7 |
| Volumes vs Karma CPU | 2.3-4.2x faster on one pyro sim at equal accuracy; matches Karma within 0.1-1.8 % | benchmarks M8, reference |
| Hair/SSS/many-lights scene vs Karma CPU | 21.9 s vs 102.0 s (4.7x), one scene, 1280x720, 128 spp | benchmarks M9 |
| Subsurface | matches Karma's 47 calibration scenes within 0.7 % | reference M9 |
| Light tree | 100x less variance than power selection on a street of 2000 lights | reference M9 |
| MaterialX coverage | 740 of 746 MaterialX 1.39 node definitions; Standard Surface, OpenPBR 1.1, UsdPreviewSurface, any pbrlib graph | reference M3/M4 |
| Karma nodes | all twelve visible Karma LOPs; 35 of 55 `kma_*` shading nodes | README, reference M4 |
| LPE cost | none for beauty only; 6-13 % for Karma's standard set | benchmarks M6 |
| Cryptomatte | manifests match Karma's entry for entry | reference M6 |
| Reproducible | same scene, same image, run to run and across CPU/GPU | README |

### 1.4 What the site must not say

- No Linux or macOS, no other Houdini versions, no GPUs outside the RTX 50 series.
- No "faster than Karma" as a general statement. Only the two measured cases above, always "Karma CPU", always
  with scene and machine. There is no Karma XPU comparison anywhere in the repository.
- "XPU" here means GPU with CPU fallback. It does **not** mean CPU and GPU together. Not yet: hybrid rendering,
  multiple GPUs, demand-loaded textures, denoiser on GPU memory.
- On the GPU, VEX materials render as grey stand-ins and shading ray queries (`kma_ao`, curvature, rounded edges)
  use default values. The Texture Baker bakes on the CPU.
- No studio logos, testimonials, "used in production" or "industry standard". Nova is at 0.1.0.
- "Matches Karma" always means "within measured, documented differences", linking to the documentation.

### 1.5 Limitations section (shown on the site, not hidden)

An honest "Not yet" list is part of the product's character (the repository documents every difference). Content:
hybrid CPU+GPU, multi-GPU, demand-loaded textures; VEX materials and shading ray queries on the GPU; Karma Hair
coat and fur medulla; `sss_traceset`; IES profiles; VEX AOV exports; `holdout;` LPE prefix; Karma's
lattice-deformation velocity blur; `volumefilter` other than box. Source: "Not yet" lines in `docs/reference.md`.

### 1.6 Two gaps found in the repository

1. **There are no showcase renders.** The only images are test references of 128-200 pixels (EXR) and one research
   contact sheet. The cinematic direction depends entirely on new renders, which must come from Nova itself on a
   Windows/Houdini 22 machine. This is the critical path of the project (section 7).
2. **Download path is unconfirmed.** The README describes building `NovaSetup-0.1.0.exe` from source; whether a
   built installer is attached to the `v0.1.0` GitHub release could not be checked from here. The download
   experience (section 3, "Get started") has two variants depending on this.

---

## 2. Creative direction

### 2.1 Idea

**"Light, resolved."** A path tracer's defining visual is an image converging out of noise. The site uses that as
its one motif: things resolve. Images arrive as Nova produces them (coarse proxy pass, noisy low samples, converged
frame), numbers count up to their measured value, text settles into place. The motif is true to the product: the
4x4 then 2x2 proxy passes are how Nova's viewport actually behaves after an edit.

The second idea is **the mark**. Nova's logo is a heavy black "O" with a small orange dot at its centre, glowing
slightly: a light source inside an aperture. The dot is the only saturated colour on the site.

### 2.2 Visual language

- **Colour.** Near-black stage, not pure black. Off-white text. One accent, used sparingly (the dot, a focus ring,
  one data highlight per chart). The palette comes from the existing brand (logo and installer):

  | Token | Value | Use |
  |---|---|---|
  | `--ink` | `#0a0a0a` | page background |
  | `--stage` | `#111110` | raised surfaces |
  | `--line` | `rgba(249,247,243,0.10)` | hairlines |
  | `--paper` | `#f9f7f3` | primary text |
  | `--muted` | `#8d8a84` | secondary text (check 4.5:1 on `--ink`) |
  | `--nova` | `#fe4819` | the accent |

  No gradients as decoration. The only gradients are physical: the logo's glow and vignettes that keep text
  readable over renders.
- **Glass.** Used in three places only: the navigation bar once scrolled, the comparison slider's handle and
  labels, and the download panel. `backdrop-filter: blur(20px) saturate(1.4)` over a 6 % white fill and a 1 px
  hairline. Never on cards in a grid.
- **Typography.** Apple's SF Pro cannot be licensed for the web. Use **Inter Variable** with its display optical
  size, tight tracking (-0.03em) at large sizes, weights 500-600 for headlines and 400 for body; **JetBrains Mono**
  for measured values, commands and attribute names (`nova:samples`). If a licence budget exists, Söhne is the
  upgrade. Headline scale: `clamp(2.75rem, 7vw, 6.5rem)`. Body 17-19 px, 60-70 characters per line.
- **Layout.** A 12-column grid, max width 1440 px for text, renders full-bleed. Sections are tall and hold one
  idea each. Vertical rhythm of 160-240 px between sections on desktop.
- **Imagery.** Renders are the hero, always labelled with what they are: renderer (Nova or Nova XPU), samples,
  resolution, time, hardware. Captions in mono, small, like a camera's metadata. This is both the aesthetic and
  the honesty mechanism.
- **Data.** Benchmarks as thin horizontal bars and large numerals, no chart chrome. Every number has a footnote
  marker that leads to conditions, in the manner of Apple's footnotes.

### 2.3 What to avoid

Three-card feature grids, icon-plus-blurb rows, purple or blue gradients, glowing borders, particle backgrounds,
floating 3D blobs, pricing-table layouts, badges-and-shields rows, "Trusted by" strips, emoji.

### 2.4 Voice

Short declarative sentences. Technical nouns, measured verbs. "Renders Karma scenes the way Karma does." Numbers
with conditions. No superlatives that the repository cannot back.

---

## 3. Information architecture

Four routes. The home page carries the launch; the others are quiet and useful.

```
/                 The product page (long scroll)
/benchmarks       Every measurement, with method and machine
/docs             Get started, compatibility, settings, limitations (links out to the repository for depth)
/download         Install, requirements, build from source
```

Global: a thin fixed navigation (mark, Overview, Benchmarks, Docs, GitHub, **Download** button), a footer with
licence, third-party notices and the trademark disclaimer from the README.

### 3.1 Home page, section by section

| # | Section | Message | Content (source) | Treatment |
|---|---|---|---|---|
| 0 | **Hero** | "Nova. A path tracer for Houdini Solaris." CPU and NVIDIA GPU. | README tagline; version, Houdini 22.0, Windows, MIT as one quiet line | Full-viewport render that resolves from noise. Two actions: Download, View on GitHub |
| 1 | **Statement** | One sentence: it renders Karma scenes the way Karma does | README intro | Large type on black, word-by-word reveal |
| 2 | **Two renderers, one image** | Nova (CPU) and Nova XPU (GPU) run the same code with the same random numbers | README, reference M10 | Pinned comparison: the same frame from both devices under a draggable divider, then a difference image that is almost black. Caption: "within 1 % in every pixel on the reference scenes" |
| 3 | **Nova XPU** | CUDA wavefront kernels, OptiX 9; 9-16x per sample | benchmarks M10 | Large numeral, bars per scene, GPU and requirements stated beside it. "Falls back to the CPU and says so" |
| 4 | **CPU** | Embree 4, wavefront integrator, SIMD shading VM; runs on any AVX2 machine | README, benchmarks | Quiet technical section: three short columns of prose, one throughput figure |
| 5 | **Speaks Karma** | Twelve Karma LOPs, Karma's render settings, lights, AOV names. Existing setups render as they are | README highlights, M11 | Pinned: a Solaris screenshot, the renderer menu switches Karma → Nova, the image stays. Then Nova against Karma CPU under the comparison slider, with the measured difference |
| 6 | **Materials** | MaterialX 1.39, OpenPBR, Standard Surface, Karma Material Builder, Principled Shader, VEX through a CVEX bridge | reference M3-M5 | Horizontal pinned gallery of material studies, one per system, each captioned with its shader |
| 7 | **Light, volumes, hair, skin** | Light tree, UsdLux, physical sky and atmosphere; VDB and Pyro with unbiased tracking ("no step rate to tune"); Chiang hair; random-walk SSS | reference M8, M9, M11 | Four full-bleed scenes with seamless transitions between them (clip-path), one caption and one measured fact each |
| 8 | **Output** | LPEs in Karma's dialect, utility AOVs, Cryptomatte with Karma-identical manifests, multi-part and deep EXR | reference M6 | Pinned: the beauty separates into its light-path components as a stack of layers in perspective, then closes again. They sum to the beauty, which the animation shows literally |
| 9 | **Interactive** | Proxy passes, 23-94 ms to first image, OptiX denoiser, adaptive sampling | benchmarks M7 | A screen recording of the viewport during edits; latency table as a short list |
| 10 | **Measured** | "Every feature is measured against Karma CPU or an analytic value." About 690 tests. Deterministic | README status | Four numerals (690 tests, 47 SSS calibration scenes within 0.7 %, 740 of 746 MaterialX nodes, 12 Karma LOPs), link to /benchmarks |
| 11 | **Not yet** | The honest list | section 1.5 | Plain two-column list, muted, no animation beyond a fade |
| 12 | **Get started** | Requirements, install, the first render | README quick start | Glass panel: requirement checklist, primary download action, the two `husk` commands in a copyable block, "Build from source" link |
| 13 | **Open source** | MIT, on GitHub | repository | Live star count and latest release (build-time), link to design notes and the bug audit |

### 3.2 /benchmarks

The tables of `docs/benchmarks.md` curated into four groups (CPU vs XPU, interactivity, sampling and denoising,
Nova vs Karma CPU), each with the machine, command and method beside it, plus the repository's own caveats
(for example that Karma's default step rate renders absorbing emitters 6-10 % bright). Data lives in typed JSON
(section 5.3) so the home page and this page cannot disagree.

### 3.3 /docs

Version 1 is a compact, well-set set of pages written from `docs/reference.md`: Install, Use in Solaris, husk and
`nova_cli`, Render settings (the settings table), Per-object properties, Compatibility with Karma, Limitations.
Each page links to its source on GitHub. The milestone design notes stay in the repository and are linked.
A later phase can render the repository's Markdown directly at build time.

### 3.4 /download

Requirements as a checklist (Windows x64, Houdini 22.0, AVX2; for XPU an RTX 50 series card and a current driver).
Variant A, if the release carries the installer: one primary button resolved from the latest GitHub release at
build time, with version, size and checksum, and a note on what the installer does (per user, no administrator
rights, registers with Houdini 22.0, uninstaller in Apps & features). Variant B, if it does not: "Build from
source" as the primary path with the four CMake commands and prerequisites. Non-Windows visitors see the
requirements first, not a dead button.

---

## 4. Motion design

### 4.1 Principles

- One easing family: `expo.out` for entrances, `power2.inOut` for scrubbed transitions. Durations 0.6-1.2 s.
- Scroll drives position, never speed-reading: pinned sections last 1.5-2.5 viewport heights, no longer.
- Motion explains something or it is removed. Three pinned sections on the home page, not ten.
- Everything works without motion: `prefers-reduced-motion` gets the final states and simple fades.

### 4.2 Signature moments

1. **Ignition (page load).** Black. The orange dot appears, its glow breathes once, the "O" draws around it, the
   wordmark sets. The dot then expands as a circular mask into the hero render. About 1.8 s, skipped on repeat
   visits within a session.
2. **Resolve (hero).** The hero render is a sequence of real Nova frames at 1, 4, 16, 64, 256 and 4096 samples.
   It crossfades through them as the headline settles. Captioned live in mono: "16 spp", "64 spp", ending on the
   real render time. No simulated noise; the frames come from the renderer.
3. **Same image (section 2).** Pinned. A vertical divider sweeps across CPU | XPU; the user can drag it. On
   further scroll both halves merge into the amplified difference image, then return. Labels sit in glass chips.
4. **Renderer switch (section 5).** A captured Solaris viewport. The renderer menu opens, "Nova" is chosen, the
   viewport re-renders with the proxy passes (4x4 blocks, 2x2, full), then the comparison slider against Karma CPU
   slides in.
5. **Layers (section 8).** The beauty tilts into perspective and separates along z into its components (direct
   diffuse, indirect diffuse, reflection, refraction, emission, a Cryptomatte), each labelled with its light path
   expression in mono. Scrubbed; it reassembles into the beauty.
6. **Scene transitions (section 7).** Each full-bleed scene is revealed by the next one's clip-path growing from
   the lower edge while the outgoing image drifts up at 0.85 of scroll speed. No fades to black.
7. **Counting numerals.** Measured values count up once when they enter, with tabular figures so nothing shifts.
   Bars draw left to right, the XPU bar last and in the accent.

### 4.3 Micro-interactions

- Buttons: a 2 px lift and a hairline that brightens; the primary button's dot glows on hover.
- Links in text: underline draws from the left in 200 ms.
- Code blocks: copy button turns into a check for 1.2 s; the copied command is announced to screen readers.
- Navigation: transparent over the hero, becomes glass after 80 px, hides on scroll down and returns on scroll up.
- Comparison slider: magnetic handle within 24 px, keyboard arrows move it by 2 %, labels fade as the divider
  passes them.
- Render captions: hovering a render reveals its full metadata line.
- Cursor: unchanged. No custom cursor.

### 4.4 Text reveals

GSAP SplitText by line for headlines (masked rise of 110 %, 60 ms stagger), by word for the statement in
section 1 (opacity 0.15 → 1, scrubbed). Body copy only fades. Splits are reverted on resize and are hidden from
assistive technology with the original text kept in an `aria-label`.

---

## 5. Technical architecture

### 5.1 Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Astro 5**, TypeScript, static output | A content site with islands of interaction: ships almost no JavaScript by default, good image pipeline, Markdown/MDX for docs |
| Styling | Plain CSS with custom properties and CSS layers, scoped per component | A bespoke design system is small; utility frameworks pull the look towards templates |
| Animation | **GSAP 3** with ScrollTrigger, SplitText, Flip (all free since 2025) | Requested; best pinning and scrubbing |
| Smooth scroll | **Lenis**, synchronised with ScrollTrigger; off for touch devices and reduced motion | Smooth scrubbing without hijacking native scroll |
| Interactive islands | Vanilla TypeScript custom elements (`<nova-compare>`, `<nova-resolve>`) | No UI framework needed for five widgets |
| Images | `astro:assets` → AVIF with WebP fallback, responsive `srcset`, blurred placeholders | Renders are large; this is where the performance budget is won |
| Video | AV1 and H.264 MP4, muted, `playsinline`, poster frames, loaded on approach | Viewport captures and turntables |
| Frame sequences | Canvas with preloaded WebP frames for the hero resolve and the layer separation | Exact scrubbing; video scrubbing stutters |
| Docs | Astro content collections with MDX | Typed front matter, source links |
| GitHub data | Build-time fetch of stars and latest release from the GitHub API, cached JSON fallback committed | No client rate limits, no layout shift, works offline |
| Hosting | **Cloudflare Pages** (or GitHub Pages) with preview deployments per pull request | Static, free, global; large media served from the same CDN |
| Quality gates | ESLint, Prettier, `astro check`, Playwright smoke and visual tests, Lighthouse CI, axe | CI on every pull request |
| Analytics | None by default; Plausible if wanted | No cookie banner |

Decision revised (2026-11-10): the first version had no WebGL, on the grounds that real renders are more
convincing than a real-time imitation. With only hero shots available, the page had no pictures at all, so a small
WebGL 2 path tracer now renders the wordmark live as the hero, the interactive viewport and the layer stack. It is
labelled as an illustration wherever it appears, and real renders replace or join it as they arrive.

### 5.2 Repository structure

```
/
  astro.config.ts
  package.json
  public/                    favicons, og image, fonts (self-hosted, subset)
  src/
    assets/
      renders/               masters as 16-bit PNG or high-quality JPEG, one folder per shot
      sequences/             hero-resolve/, aov-layers/
      video/                 viewport captures
      brand/                 mark.svg, wordmark.svg
    content/
      docs/                  *.mdx
      claims.ts              the claims ledger: id, value, conditions, source path and line
      benchmarks.json        typed data transcribed from docs/benchmarks.md
      limitations.ts
      renders.ts             metadata per render: renderer, spp, resolution, time, hardware
    styles/
      tokens.css  base.css  typography.css  utilities.css
    motion/
      gsap.ts                plugin registration, defaults, matchMedia contexts
      lenis.ts
      reveal.ts              data-reveal attribute driver (lines, words, fade)
      pin.ts                 helpers for pinned timelines
    components/
      layout/     Nav.astro  Footer.astro  Section.astro  Footnotes.astro
      primitives/ Button.astro  GlassPanel.astro  Eyebrow.astro  Numeral.astro  CodeBlock.astro
                  RenderFigure.astro  Caption.astro  Claim.astro
      media/      CompareSlider.astro  ResolveSequence.astro  LayerStack.astro  ScrubVideo.astro
      data/       BenchBars.astro  LatencyList.astro  SpecTable.astro  RequirementList.astro
      sections/   Hero.astro  Statement.astro  SameImage.astro  Xpu.astro  Cpu.astro  Karma.astro
                  Materials.astro  Worlds.astro  Output.astro  Interactive.astro  Measured.astro
                  NotYet.astro  GetStarted.astro  OpenSource.astro
    pages/
      index.astro  benchmarks.astro  download.astro  docs/[...slug].astro  404.astro
    lib/
      github.ts              build-time stars and release
      format.ts
  tests/                     Playwright
  docs/PLAN.md               this file
```

### 5.3 Accuracy by construction

- **`claims.ts`** holds every number on the site with its conditions and a pointer to the file and line in
  Nova-Renderer at a pinned tag. Sections render numbers only through `<Claim id="...">`, which also emits the
  footnote. A number cannot appear without a source.
- **`benchmarks.json`** is transcribed once from `docs/benchmarks.md` and reviewed against it. A small script
  checks the pinned tag against the repository's latest tag in CI and flags the site as stale when Nova moves on.
- **`renders.ts`** requires renderer, samples, resolution, render time and hardware for every image. A render
  without metadata fails the build. Images not made with Nova are not allowed in showcase slots.
- Trademark line and third-party notices are copied from the README into the footer.

### 5.4 Performance and accessibility budgets

- LCP under 2.0 s on a fast connection, under 3.0 s on 4G; the hero poster is a single AVIF under 250 KB, the
  sequence loads after first paint.
- JavaScript under 90 KB gzipped on the home page (GSAP with three plugins and Lenis is about 45 KB).
- CLS 0: every media element has explicit dimensions.
- Media below the fold loads on approach (IntersectionObserver, 1.5 viewports ahead).
- WCAG 2.1 AA: contrast, full keyboard operation of the slider and navigation, visible focus, reduced motion,
  text alternatives that describe each render, no information carried by animation alone.
- Mobile is designed, not degraded: pinned sections become stacked sequences, the comparison slider stays (it
  works well with touch), frame sequences are replaced by three-step crossfades.

---

## 6. Component notes

| Component | Behaviour |
|---|---|
| `CompareSlider` | Two images of equal size, divider on pointer and keyboard, `role="slider"`, optional third "difference" layer, labels in glass chips. Used for CPU/XPU, Nova/Karma CPU, noisy/denoised |
| `ResolveSequence` | Canvas that plays a list of frames by time or by scroll progress; exposes the current sample count to its caption |
| `LayerStack` | Named image layers in a 3D-transformed container; a single GSAP timeline separates and reassembles them |
| `RenderFigure` | Responsive picture, caption from `renders.ts`, optional parallax of at most 6 % |
| `Numeral` + `Claim` | Tabular numerals that count up once; footnote marker; conditions in `title` and in the footnotes |
| `BenchBars` | Horizontal bars from `benchmarks.json`, values in mono, one accent bar, real `<table>` underneath for screen readers |
| `CodeBlock` | Mono, copy button, no syntax theme beyond two tones |
| `GlassPanel` | The single glass surface, with a solid fallback where `backdrop-filter` is unsupported |
| `RequirementList` | The compatibility checklist, reused on home, download and docs |

---

## 7. Assets required

All showcase media must be rendered by Nova. None exists in the repository today.

### 7.1 Render shot list

Masters at 3840x1600 or 3840x2160, EXR kept, delivered as 16-bit PNG. Record renderer, samples, time and hardware
for each.

| # | Shot | Used in | Notes |
|---|---|---|---|
| R1 | **Hero**: one striking scene that shows glass, metal and soft light (a product-style still life or an interior) | Hero | Also needed at 1, 4, 16, 64, 256 samples and converged, same seed, for the resolve sequence |
| R2 | The same frame on Nova and Nova XPU, plus an amplified difference image | Same image | Avoid heavy texture minification or state the known texture-filter difference |
| R3 | A Karma scene rendered in Karma CPU and in Nova, unchanged | Speaks Karma | State samples and the measured difference |
| R4 | Material studies: OpenPBR, Standard Surface, a Karma Material Builder material, Principled Shader, a VEX builder material (CPU) | Materials | One object, one light rig, five materials |
| R5 | Many lights: a night street or interior with hundreds of lights | Worlds | The light tree's case |
| R6 | Pyro: smoke and fire with the Karma Pyro Material | Worlds | A still and, ideally, a 4-6 s sequence |
| R7 | Hair or fur close-up | Worlds | Karma Hair on the Chiang model |
| R8 | Skin, wax or marble with subsurface scattering | Worlds | |
| R9 | Physical sky and atmosphere exterior | Worlds | Karma Physical Sky and Sky Atmosphere |
| R10 | AOV set of R1: Karma's standard LPE components, depth, normals, Cryptomatte preview | Output | Layers must sum to the beauty |
| R11 | Noisy at 16 spp and denoised | Interactive | |
| R12 | Displacement close-up | Materials, optional | |

Scenes must be the author's own or openly licensed assets with attribution; the licence of each asset is recorded
in `renders.ts`.

### 7.2 Captures

- Solaris viewport, 1440p, 60 fps: choosing Nova in the renderer menu; a light edit, a material edit and a camera
  move showing the proxy passes; the Denoise toggle; Nova (Setup) from the TAB menu.
- The installer's three pages (already designed, light theme) for /download.

### 7.3 Brand

- The mark exists (`NOVA_logo.svg`, the "O" with the dot). The full **wordmark is not in the repository** and is
  needed as SVG, or it is redrawn from the mark's geometry.
- Favicon set, social image (1200x630) built from the hero.
- Font files: Inter Variable and JetBrains Mono, self-hosted, subset to Latin.

### 7.4 Data and copy

- `benchmarks.json` and `claims.ts` transcribed from the repository.
- Copy deck for all sections (drafted in phase 1, reviewed against the claims ledger).
- Docs pages adapted from `docs/reference.md`.

### 7.5 Until the renders exist

Development uses neutral grey placeholders of the right aspect ratio, labelled with the shot number. No stock
imagery, no AI-generated images and no renders from other engines stand in for Nova, even temporarily on a
public URL.

---

## 8. Implementation phases

| Phase | Scope | Result | Depends on |
|---|---|---|---|
| **0. Foundations** | Astro project, tooling, CI, deployment with previews; tokens, type scale, grid; fonts; `claims.ts`, `benchmarks.json`, `limitations.ts` transcribed and reviewed | Empty but deployed site; verified content data | Hosting decision |
| **1. Static page** | Primitives and layout components; all fourteen home sections with final copy and placeholders; responsive; footnotes; navigation and footer | A complete, readable, motionless home page | Phase 0 |
| **2. Core widgets** | `CompareSlider`, `ResolveSequence`, `LayerStack`, `BenchBars`, `Numeral`, `CodeBlock`; keyboard and touch support; unit and Playwright tests | Interactive page without choreography | Phase 1 |
| **3. Motion** | GSAP and Lenis setup, reveal system, the seven signature moments, micro-interactions, reduced-motion and mobile variants | The launch experience with placeholders | Phase 2 |
| **4. Secondary routes** | /benchmarks, /download (both variants), /docs pages, 404, GitHub build-time data | Complete site structure | Phase 1 |
| **5. Asset integration** | Renders and captures in place, image pipeline tuned, sequences encoded, captions filled, social image | Real content everywhere | Section 7 deliveries |
| **6. Polish and QA** | Performance budget, accessibility audit, cross-browser (Chrome, Safari, Firefox, iOS, Android), copy review against the ledger, visual regression baselines | Release candidate | Phases 3-5 |
| **7. Launch** | Domain, redirects, metadata, sitemap, link from the Nova README | Public site | Phase 6 |

Phases 0 to 4 need no renders and can start at once. Phase 5 is gated by the shot list; R1 and R2 alone are enough
for a credible first public version, with the remaining scenes added as they are rendered.

Rough effort for one experienced developer: phases 0-1 one week, phases 2-3 two weeks, phase 4 one week,
phases 5-6 one week after assets arrive.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Renders arrive late or are not strong enough | Build with placeholders; launch with fewer, better images; the hero carries the page |
| Motion hurts performance on mid-range laptops | Budgets in CI; only transforms and opacity animate; sequences on canvas; pinned sections limited to three |
| The site drifts from the renderer as Nova evolves | Claims ledger pinned to a tag; CI check against the latest tag; version shown in the hero |
| Reading as overclaiming against Karma | Comparisons only as measured, "Karma CPU" always named, the "Not yet" section, the trademark disclaimer |
| Narrow hardware support disappoints visitors | Requirements beside every download action, not behind it |

---

## 10. Decisions

Taken on 2026-11-10.

1. **Renders:** only hero shots exist for now. The site therefore works without pictures: every slot is optional,
   empty slots are left out of production builds, and the sections adapt (`src/content/renders.ts`).
2. **Download:** the installer `NovaSetup-0.1.0.exe` is attached to the `v0.1.0` GitHub release. The download
   buttons resolve it from the GitHub API at build time and fall back to the releases page.
3. **Hosting:** decided after the build. The site is fully static and base-path aware, so every free static host
   remains an option.
4. **Typeface:** free resources only: Inter and JetBrains Mono, self-hosted.
5. **Logo:** supplied as an image; the wordmark was redrawn as vector paths from it
   (`src/components/brand/wordmark.json`).

6. **Live illustrations:** a WebGL 2 path tracer renders the wordmark as a 3D scene for the hero (with a scroll
   flight through the O), the interactive viewport and the layer stack. It falls back to the 2D versions without a
   usable GPU. See the README, "Live illustrations".

Status: phases 0 to 4 are implemented, and the site is published on GitHub Pages from `main`. Phase 5 (assets)
waits for renders; the README says how to add them.
