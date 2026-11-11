# Nova website

The product website of [Nova](https://github.com/syfyra/Nova-Renderer), a path tracer for Houdini Solaris.

A static site built with [Astro](https://astro.build) and GSAP. The plan it started from is in
[`docs/PLAN.md`](docs/PLAN.md); the design it has now is described under [Design](#design).

## Develop

Requires Node 22.

```sh
npm install
npm run dev        # http://localhost:4321, empty render slots are shown as empty frames
npm run build      # writes the static site to dist/
npm run preview    # serves dist/
npm run check      # type check
```

## Pages

| Route | Source |
|---|---|
| `/` | `src/pages/index.astro`, one component per section in `src/components/sections/` |
| `/benchmarks/` | `src/pages/benchmarks.astro` |
| `/download/` | `src/pages/download.astro` |
| `/docs/…` | Markdown in `src/pages/docs/`, sidebar in `src/content/docs-nav.ts` |

## Adding renders

Every picture slot is listed in `src/content/renders.ts` with the shot it expects.

1. Put the image in `src/assets/renders/`, named after the slot id: `hero.jpg`, `same-cpu.png`, `world-volumes.avif`
   and so on. AVIF, WebP, JPEG and PNG work; large masters are fine, the build makes the responsive sizes.
2. In `src/content/renders.ts`, fill in the slot's metadata. `renderer` is required: an image without it fails the
   build, because every picture on the site says what made it. Add `samples`, `resolution`, `time` and `hardware`
   where known; they become the caption.

Only images rendered by Nova belong in these slots (and Karma CPU in the two Karma comparison slots).

Empty slots appear as plain frames of the right size in `npm run dev` (the expected shot is in the tooltip) and are
left out of `npm run build`, so the site can be published before every render exists. Sections adapt: comparison
sliders disappear, and the material cards and the rows of "Light and matter" stand without a picture.
`NOVA_SHOW_PENDING=1 npm run build` keeps the frames.

## Accuracy

Nova's repository is the source of truth. The site was written against the tag in `src/lib/site.ts` (`SOURCE_TAG`).

- `src/content/claims.ts` is the claims ledger: every measured value with its conditions and its source. The home
  page prints numbers with `<Fn id="…"/>`, which fails the build for a claim that is not in the ledger.
- `src/content/benchmarks.ts` is transcribed from Nova's `docs/benchmarks.md`.
- `src/content/limitations.ts` and `src/pages/docs/limitations.md` list what Nova does not do.

When Nova changes, update these files first, then the copy.

## Build options

All optional, set as environment variables at build time.

| Variable | Effect |
|---|---|
| `SITE_URL` | The public URL, for canonical links and the social image, e.g. `https://example.com` |
| `BASE_PATH` | A sub-path the site is served from, e.g. `/Nova-Renderer-Website/` for GitHub Pages project sites |
| `NOVA_SHOW_PENDING` | `1` shows empty render slots in a build, `0` hides them in development |
| `NOVA_OFFLINE` | `1` skips the GitHub API at build time |

At build time the site asks the GitHub API for the star count and the latest release. If a release carries
`NovaSetup-*.exe`, the download buttons link to it directly; otherwise, or when the API cannot be reached, they link
to the releases page.

## Hosting

`dist/` is plain HTML, CSS and JavaScript with no server component, so any static host serves it: GitHub Pages,
Cloudflare Pages, Netlify, Vercel and others, all on their free tiers. All internal links respect `BASE_PATH`.

### GitHub Pages

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main`, and can be started by hand
from the Actions tab.

One-time setup: in the repository, open **Settings > Pages** and set **Source** to **GitHub Actions**. On a free
GitHub account, Pages needs the repository to be public.

The site is then served at `https://<owner>.github.io/<repository>/`. The workflow reads the address from the Pages
settings, so a custom domain set there is used without changing any file.

## Structure

```
src/
  assets/renders/     showcase images, one per slot
  components/
    brand/            the wordmark, redrawn as paths from the logo
    layout/           navigation, footer, footnotes
    media/            render frames, comparison slider
    data/             benchmark bars, requirements
    primitives/       code block, footnote marker, icon
    sections/         the home page, section by section
  content/            claims, benchmarks, limitations, render registry, docs navigation
  layouts/            Base and Docs
  lib/                site constants, GitHub build-time data
  motion/             GSAP: core.ts (all pages), home.ts (home page)
    tracer/           the live path tracer: scene.ts (geometry), shader.ts (GLSL), tracer.ts (accumulation)
    hero-stage.ts     the live hero and its flight
    viewport.ts       the interactive viewport
    aov.ts            the live passes of the layer stack
    accumulate.ts     the 2D fallback illustrations
  pages/
  styles/global.css   tokens and shared styles
```

## Live illustrations

Until real renders fill the slots, the site's pictures are made in the visitor's browser by a small path tracer
(`src/motion/tracer/`, WebGL 2). It renders one scene: the Nova wordmark as solid letters on a black floor, with the
dot of the O as a light. The letters come from the same paths as the 2D wordmark.

It is used in three places, each labelled on the page as an illustration and not as Nova's output:

- **The hero** (`hero-stage.ts`): the wordmark resolves out of noise; scrolling flies the camera through the O into
  the opening statement.
- **The viewport** (`viewport.ts`): the visitor moves the light, and the picture returns in 4×4 and 2×2 proxy passes
  before it accumulates, which is how Nova's viewport behaves after an edit. The passes are held longer than a renderer
  would hold them, and the page says so.
- **The layer stack** (`aov.ts`): the scene rendered into Karma's component names. The five light components sum to
  the beauty.

The tracer shares ideas with Nova (progressive accumulation, components per path type, a clamp on indirect light)
and none of its code. It makes no statement about Nova's speed or image quality, and nothing on the site presents
its output as a Nova render.

Behaviour to know:

- It measures the GPU first and sizes the picture so a frame takes about 9 ms. It stops rendering once the sample
  target is reached, when its section is off screen, and when the tab is hidden.
- Without WebGL 2, or on a machine that can only render in software, the 2D versions run instead: the wordmark
  resolves through a Monte Carlo accumulator (`accumulate.ts`) and the page zooms through the O in two dimensions.
- `?rtpx=<pixels>` in the address forces the number of pixels traced per frame. It is a testing aid.

## Design

The page is a dark stage with one light. Everything in `src/styles/global.css` follows from that.

- **Colour.** One warm neutral ramp: `--bg`, `--surface`, `--raised` for surfaces, `--text`, `--text-2`, `--text-3`
  for the three text roles, hairlines as the text colour at 8 % and 14 %. Depth comes from the surface steps, not
  from shadows.
- **The accent.** `--accent` is the orange of the logo's dot. It appears as a flat dot on the one action that
  matters in a view, as the Nova XPU series in a chart, and in the wordmark. Nothing else is orange, and there are
  no gradients between hues, glows, coloured shadows or glass. The glow inside the logo itself is part of the mark.
- **Type.** Inter in weights 400 and 500, JetBrains Mono for values, names and captions. Sentence case throughout,
  no uppercase labels, negative tracking on display sizes only. Headlines, labels and buttons end without a
  period.
- **Spacing and shape.** A 4 px grid. Two sections meet with `--section` between them. Corner radius follows size:
  `--r-s` for chips, `--r-m` for controls, `--r-l` for cards, `--r-xl` for panels.
- **Icons.** One set, [Lucide](https://lucide.dev) (ISC), as inline paths in `components/primitives/Icon.astro`:
  16 px, stroke 1.5.

## Motion

Motion explains something or it is absent. There are no scroll reveals: content is simply there.

- The hero is the only pinned sequence: the wordmark resolves, and scrolling flies the camera through the O into
  the opening statement.
- The layer stack of "Output" opens with the scroll position, to show that the passes are parts of one image.
- Comparison sliders make one short sweep on first sight. Hover and press states take 160 ms.
- One easing curve everywhere: `--ease` in CSS, `power4.out` in GSAP. Nothing loops.
- `prefers-reduced-motion` turns all of it off: no pin, no flight. The live hero appears once it is calm.

## Licence

MIT. Nova's logo and name belong to the Nova project. Fonts: Inter and JetBrains Mono, both under the SIL Open Font
License, self-hosted through Fontsource. Icons: Lucide, ISC License.
