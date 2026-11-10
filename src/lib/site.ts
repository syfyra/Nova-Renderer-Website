// Site-wide constants and the base-path-aware link helper.

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix an internal path with the configured base path. External URLs pass through. */
export function href(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('#') || path.startsWith('mailto:')) return path;
  const [p, hash = ''] = path.split('#');
  let clean = p.startsWith('/') ? p : `/${p}`;
  if (!/\.[a-z0-9]+$/i.test(clean) && !clean.endsWith('/')) clean += '/';
  return `${base}${clean}${hash ? `#${hash}` : ''}`;
}

export const REPO = 'syfyra/Nova-Renderer';
export const REPO_URL = `https://github.com/${REPO}`;
/** The tag every claim on this site was checked against. */
export const SOURCE_TAG = 'v0.1.0';
export const VERSION = '0.1.0';

/** A link into the Nova repository, pinned to the tag the site was written against.
 *  A path that ends in a slash is a directory. */
export function source(path: string, anchor?: string): string {
  const dir = path.endsWith('/');
  return `${REPO_URL}/${dir ? 'tree' : 'blob'}/${SOURCE_TAG}/${path.replace(/\/$/, '')}${anchor ? `#${anchor}` : ''}`;
}

export const RELEASES_URL = `${REPO_URL}/releases`;
export const LATEST_RELEASE_URL = `${REPO_URL}/releases/latest`;

export const SITE = {
  name: 'Nova',
  title: 'Nova — Production path tracing for Houdini Solaris',
  description:
    'Nova is a physically based path tracer for Houdini Solaris, on the CPU and on NVIDIA GPUs. A Hydra render delegate that renders Karma scenes the way Karma does. MIT licensed.',
};

export const NAV = [
  { label: 'Overview', path: '/' },
  { label: 'Benchmarks', path: '/benchmarks' },
  { label: 'Docs', path: '/docs' },
];
