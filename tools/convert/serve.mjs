/* Throwaway static server so headless Chrome can load the OG wrappers.
   file: is blocked in the automation context. Zero dependencies. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/* The directory to serve. Required — this used to hardcode one machine's
   scratchpad path.
     node tools/convert/serve.mjs <rootDir> [port] */
const ROOT = process.argv[2];
if (!ROOT) { console.error('usage: node serve.mjs <rootDir> [port]'); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  // path.join yields backslashes on Windows; ROOT is written with forward
  // slashes. Compare normalised, or every request 403s.
  const file = path.resolve(ROOT, rel);
  const norm = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
  if (!norm(file).startsWith(norm(ROOT))) { res.writeHead(403).end('outside root'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found: ' + rel); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(Number(process.argv[3]) || 8099, '127.0.0.1', () => console.log('serving ' + ROOT + ' on http://127.0.0.1:8099'));
