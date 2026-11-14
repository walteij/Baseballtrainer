import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}

const root = new URL('../build/', import.meta.url);
const paths = await files(fileURLToPath(root));
const htmlIds = new Set();
const scriptIds = new Set();
for (const path of paths) {
  if (!path.endsWith('.html') && !path.endsWith('.js')) continue;
  const source = await readFile(path, 'utf8');
  const pattern = path.endsWith('.html')
    ? /\b(__sveltekit_\w+)\s*=/g
    : /globalThis\.(__sveltekit_\w+)\.data\b/g;
  const ids = path.endsWith('.html') ? htmlIds : scriptIds;
  for (const match of source.matchAll(pattern)) ids.add(match[1]);
}
if (htmlIds.size !== 1 || scriptIds.size !== 1 || [...htmlIds][0] !== [...scriptIds][0]) {
  throw new Error(`Mixed SvelteKit build: HTML=${[...htmlIds]}, JavaScript=${[...scriptIds]}. Run frontend checks/tests and production build sequentially.`);
}
console.log('Verified matching SvelteKit HTML and JavaScript build identifiers.');
