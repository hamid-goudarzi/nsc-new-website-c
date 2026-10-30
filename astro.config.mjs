import { defineConfig } from 'astro/config';

// Static site. Pages keep their existing addresses (about.html, projects/kingston-road-sewer-separation.html).
export default defineConfig({
  site: 'https://www.neilsmithconstruction.com',
  output: 'static',
  build: { format: 'preserve', assets: 'assets/_astro' },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
});
