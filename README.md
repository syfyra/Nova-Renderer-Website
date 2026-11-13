# Nova website

The product website of [Nova](https://github.com/syfyra/Nova-Renderer), a path tracer for Houdini Solaris.

A static site built with [Astro](https://astro.build), GSAP and Lenis. The plan it follows is in
[`docs/PLAN.md`](docs/PLAN.md).

## Develop

Requires Node 22.

```sh
npm install
npm run dev        # http://localhost:4321, empty render slots are shown as labelled frames
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

Empty slots appear as labelled frames in `npm run dev` and are left out of `npm run build`, so the site can be
published before every render exists. Sections adapt: comparison sliders disappear, the materials gallery becomes a
grid, the full-height scenes become compact blocks. `NOVA_SHOW_PENDING=1 npm run build` keeps the frames.

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
    layout/           navigation, footer, footnotes, chapter rail
    media/            render frames, comparison slider
    data/             benchmark bars, requirements
    primitives/       code block, footnote marker
    sections/         the home page, section by section
  content/            claims, benchmarks, limitations, render registry, docs navigation
  layouts/            Base and Docs
  lib/                site constants, GitHub build-time data
  motion/             GSAP and Lenis: core.ts (all pages), home.ts (home page)
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

## Motion

- `prefers-reduced-motion` disables all choreography: no pinned sequences, no flight. The content is simply
  visible, and the live hero appears once it is calm.
- Three sequences are pinned on wide screens: the hero, the materials gallery when it has pictures, and
  "Light and matter". On small screens they are ordinary blocks.
- Under the pointer: primary actions lean towards it and their dot sends out one ring, panels are lit where the
  pointer is, lists marked `data-focus` keep the row under the pointer lit, and a row of the output list picks its
  passes out of the layer stack.
- `components/layout/ChapterRail.astro` is a thread at the left edge of wide screens: one mark per chapter, the
  logo's dot on the chapter in view.

## Design

- **Colour.** A warm neutral ramp (`--ink`, `--stage`, `--stage-2`, `--stage-3`, `--paper`, `--paper-dim`,
  `--muted`, `--faint` in `src/styles/global.css`) and one accent, the orange of the logo's dot.
- **Surfaces.** Panels are solid, one step above the stage, with a hairline. There is no glass and no blur.
- **Light.** The only glows are light sources of the story: the logo's dot, the light in the hero, and the light
  that wanders through "Light and matter". Buttons, bars and markers are flat.
- **Type.** Inter in weights 400 and 500, JetBrains Mono for labels and values, in sentence case.

## Licence

MIT. Nova's logo and name belong to the Nova project. Fonts: Inter and JetBrains Mono, both under the SIL Open Font
License, self-hosted through Fontsource.
