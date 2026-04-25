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

const BACKENDS = [
    { hostname: 'seekingalpha-alb-822910622.ap-southeast-1.elb.amazonaws.com', port: 80 },
    { hostname: '47.250.212.10', port: 80 },
];

function tryProxy(req, res, body, index) {
    if (index >= BACKENDS.length) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('502 — All backends unreachable');
        return;
    }

    const backend = BACKENDS[index];
    const options = {
        hostname: backend.hostname,
        port:     backend.port,
        path:     req.url,
        method:   req.method,
        headers:  Object.assign({}, req.headers, {
            host:             backend.hostname,
            'content-length': Buffer.byteLength(body),
        }),
        timeout: 8000,
    };

    const proxyReq = http.request(options, function (proxyRes) {
        if (proxyRes.statusCode >= 400 && index + 1 < BACKENDS.length) {
            console.log('Backend ' + backend.hostname + ' returned ' + proxyRes.statusCode + ', trying next…');
            proxyRes.resume();
            tryProxy(req, res, body, index + 1);
            return;
        }
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('timeout', function () {
        proxyReq.destroy();
    });

    proxyReq.on('error', function () {
        console.log('Backend ' + backend.hostname + ' failed, trying next…');
        tryProxy(req, res, body, index + 1);
    });

    proxyReq.write(body);
    proxyReq.end();
}

function proxyRequest(req, res) {
    let body = Buffer.alloc(0);
    req.on('data', function (chunk) { body = Buffer.concat([body, chunk]); });
    req.on('end', function () { tryProxy(req, res, body, 0); });
}

const server = http.createServer(function (req, res) {
    /* Strip query strings and decode URI */
    const urlPath = decodeURIComponent(req.url.split('?')[0]);

    /* Proxy /api/* to backend */
    if (urlPath.startsWith('/api/')) {
        proxyRequest(req, res);
        return;
    }

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