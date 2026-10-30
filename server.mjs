import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml' };
const files = new Set(['/index.html', '/styles.css', '/app.js', '/scoring.mjs']);

createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  if (pathname === '/') pathname = '/index.html';
  if (!files.has(pathname)) { response.writeHead(404).end('Not found'); return; }
  const file = join(root, pathname.slice(1));
  try {
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8` });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Ukur berjalan di http://localhost:${port}`));
