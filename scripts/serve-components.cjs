#!/usr/bin/env node
// Minimal static server for component accessibility audits.

const http = require('http');
const fs = require('fs');
const path = require('path');

const distRoot = path.join(__dirname, '..', 'dist', 'components');
const publicRoot = path.join(__dirname, '..', 'services', 'dashboard', 'public', 'components');
const root = fs.existsSync(distRoot) ? distRoot : publicRoot;
const port = process.env.A11Y_PORT || 5178;

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(root, urlPath.replace(/\?.*$/, ''));
  if (!filePath.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    const ext = path.extname(filePath).toLowerCase();
    const type = (
      ext === '.html' ? 'text/html' :
      ext === '.css' ? 'text/css' :
      ext === '.js' ? 'application/javascript' :
      'text/plain'
    );
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`[serve-components] Listening on http://localhost:${port}`);
});
