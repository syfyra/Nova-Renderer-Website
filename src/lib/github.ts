// Build-time GitHub data: stars and the latest release.
//
// Fetched once per build. If the API cannot be reached (offline build, rate
// limit) the committed fallback is used, so a build never fails and the page
// never shifts on load.

import { LATEST_RELEASE_URL, REPO, VERSION } from './site';

export interface GitHubData {
  stars: number | null;
  version: string;
  releaseUrl: string;
  /** Direct link to the installer, when the release lists one. */
  installerUrl: string | null;
  installerName: string;
  installerSize: string | null;
  publishedAt: string | null;
  live: boolean;
}

const FALLBACK: GitHubData = {
  stars: null,
  version: VERSION,
  releaseUrl: LATEST_RELEASE_URL,
  installerUrl: null,
  installerName: `NovaSetup-${VERSION}.exe`,
  installerSize: null,
  publishedAt: null,
  live: false,
};

async function get(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'nova-website-build' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

let cached: Promise<GitHubData> | undefined;

export function getGitHub(): Promise<GitHubData> {
  cached ??= (async () => {
    if (process.env.NOVA_OFFLINE) return FALLBACK;
    const [repo, release] = await Promise.all([
      get(`https://api.github.com/repos/${REPO}`),
      get(`https://api.github.com/repos/${REPO}/releases/latest`),
    ]);
    if (!repo && !release) return FALLBACK;
    const exe = release?.assets?.find((a: any) => /^NovaSetup-.*\.exe$/i.test(a.name));
    return {
      stars: typeof repo?.stargazers_count === 'number' ? repo.stargazers_count : null,
      version: release?.tag_name ? String(release.tag_name).replace(/^v/, '') : FALLBACK.version,
      releaseUrl: release?.html_url ?? FALLBACK.releaseUrl,
      installerUrl: exe?.browser_download_url ?? null,
      installerName: exe?.name ?? FALLBACK.installerName,
      installerSize: exe?.size ? `${(exe.size / 1048576).toFixed(1)} MB` : null,
      publishedAt: release?.published_at ?? null,
      live: true,
    };
  })();
  return cached;
}
