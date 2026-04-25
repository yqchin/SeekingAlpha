/* ─── SALaterPay — server.js ─────────────────────────────────────────── */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;

const MIME = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
};

const server = http.createServer(function (req, res) {
    /* Strip query strings and decode URI */
    const urlPath = decodeURIComponent(req.url.split('?')[0]);

    /* Redirect root → main page */
    if (urlPath === '/') {
        res.writeHead(302, { Location: '/html/index.html' });
        res.end();
        return;
    }

    const filePath = path.join(__dirname, urlPath);
    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, function (err, data) {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 — File not found: ' + urlPath);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 — Internal server error');
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
});

server.listen(PORT, function () {
    console.log('Server running at http://localhost:' + PORT + '/');
});