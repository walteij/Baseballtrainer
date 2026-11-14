import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const key of ['VITE_ENTRA_TENANT_ID', 'VITE_ENTRA_PWA_CLIENT_ID', 'VITE_ENTRA_API_CLIENT_ID']) {
      if (!guid.test(env[key] ?? '')) throw new Error(`Missing or invalid ${key}; configure Microsoft sign-in before building.`);
    }
    if (!URL.canParse(env.VITE_API_BASE_URL ?? '')) throw new Error('Missing or invalid VITE_API_BASE_URL.');
    const api = new URL(env.VITE_API_BASE_URL);
    if ((api.protocol !== 'https:' && !(api.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(api.hostname))) ||
        api.username || api.password || api.search || api.hash) {
      throw new Error('VITE_API_BASE_URL must use HTTPS (HTTP only for localhost), without credentials, query or fragment.');
    }
  }
  return {
    plugins: [tailwindcss(), sveltekit()],
    resolve: mode === 'test' ? { conditions: ['browser'] } : undefined,
    server: { host: true, allowedHosts: true, strictPort: false },
    test: { include: ['tests/**/*.test.ts'] }
  };
});
