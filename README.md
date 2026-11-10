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
    layout/           navigation, footer, footnotes
    media/            render frames, comparison slider
    data/             benchmark bars, requirements
    primitives/       code block, footnote marker
    sections/         the home page, section by section
  content/            claims, benchmarks, limitations, render registry, docs navigation
  layouts/            Base and Docs
  lib/                site constants, GitHub build-time data
  motion/             GSAP and Lenis: core.ts (all pages), home.ts (home page), accumulate.ts (the noise illustrations)
  pages/
  styles/global.css   tokens and shared styles
```

## Motion

- `prefers-reduced-motion` disables all choreography; the content is then simply visible.
- The hero's "resolve" and the proxy-pass demonstration are illustrations drawn in the browser by a small Monte Carlo
  accumulator (`src/motion/accumulate.ts`). They are labelled as such and are not Nova renders.

## Licence

MIT. Nova's logo and name belong to the Nova project. Fonts: Inter and JetBrains Mono, both under the SIL Open Font
License, self-hosted through Fontsource.
