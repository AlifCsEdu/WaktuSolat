import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from './node_modules/@sveltejs/vite-plugin-svelte/src/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    files: {
      assets: 'public'
    }
  }
};

export default config;
