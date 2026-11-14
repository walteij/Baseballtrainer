import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const staticRoot = new URL('../static/', import.meta.url);

async function expectPngSize(path: string, sizes: string) {
  const image = await readFile(new URL(path.replace(/^\//, ''), staticRoot));
  expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(`${image.readUInt32BE(16)}x${image.readUInt32BE(20)}`).toBe(sizes);
}

describe('PWA installation assets', () => {
  it('resolves ordinary and maskable manifest icons with their declared PNG dimensions', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', staticRoot), 'utf8'));
    for (const purpose of ['any', 'maskable']) {
      const icons = manifest.icons.filter((icon: { purpose: string }) => icon.purpose === purpose);
      expect(icons.map((icon: { sizes: string }) => icon.sizes).sort()).toEqual(['192x192', '512x512']);
      for (const icon of icons) await expectPngSize(icon.src, icon.sizes);
    }
  });

  it('resolves the shell favicons and Apple home-screen icon instead of the deleted SVG', async () => {
    const html = await readFile(new URL('../src/app.html', import.meta.url), 'utf8');
    const links = [...html.matchAll(/<link rel="(icon|apple-touch-icon)" href="%sveltekit.assets%([^"]+)"[^>]*sizes="([^"]+)"/g)];
    expect(links.filter(link => link[1] === 'apple-touch-icon')).toHaveLength(1);
    expect(links.filter(link => link[1] === 'icon')).toHaveLength(2);
    for (const link of links) await expectPngSize(link[2], link[3]);
    expect(html).not.toContain('icons/icon.svg');
  });
});
