import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: { host: true, allowedHosts: true, strictPort: false },
  test: { include: ['tests/**/*.test.ts'] }
});
