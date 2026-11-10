import { defineConfig } from 'astro/config';

// The site is fully static. SITE_URL and BASE_PATH are optional so the same
// build works on any static host (a root domain or a sub-path such as
// GitHub Pages' /<repo>/).
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  build: { assets: 'assets' },
  markdown: {
    shikiConfig: { theme: 'github-dark-default', wrap: false },
  },
  devToolbar: { enabled: false },
});
