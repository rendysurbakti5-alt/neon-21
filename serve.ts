// serve.ts — a tiny static server for trying the game locally.
// Serves this directory's game/ folder at http://localhost:8080 with the
// content types a browser needs for HTML and ES modules; nothing else.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameDir = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const rel = normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^[/\\]+/, '');
  try {
    const body = await readFile(join(gameDir, rel));
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(8080, () => {
  console.log('Neon 21 at http://localhost:8080');
});
