#!/usr/bin/env node
// Minimal static server for landing page accessibility audits.

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'services', 'landing', 'public');
const port = process.env.LANDING_PORT || 5190;

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
      ext === '.svg' ? 'image/svg+xml' :
      ext === '.png' ? 'image/png' :
      'text/plain'
    );
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`[serve-landing] Listening on http://localhost:${port}`);
});
