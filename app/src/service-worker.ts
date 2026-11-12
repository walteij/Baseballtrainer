/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `honkbal-${version}`;
const assets = [...build, ...files, '/', '/200.html'];

worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});
worker.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('honkbal-') && key !== cacheName).map((key) => caches.delete(key)))));
});
worker.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== worker.location.origin ||
      request.headers.has('authorization') || url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).catch(async () => {
    if (request.mode === 'navigate') return (await caches.match('/200.html')) ?? Response.error();
    return Response.error();
  })));
});
