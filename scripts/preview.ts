import path from 'node:path';

/** Serves the production build in dist/ (SPA fallback to index.html). */
const root = path.join(import.meta.dir, '..', 'dist');

const server = Bun.serve({
  async fetch(req) {
    const {pathname} = new URL(req.url);
    const file = Bun.file(path.join(root, path.normalize(pathname)));
    if (pathname !== '/' && (await file.exists())) return new Response(file);
    return new Response(Bun.file(path.join(root, 'index.html')));
  },
});

console.log(`Preview running at ${server.url}`);
