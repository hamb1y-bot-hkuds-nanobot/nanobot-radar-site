import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nanobot-radar.example',
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
});
