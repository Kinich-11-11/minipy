// tiny CORS static server: _serve_cors.cjs [port]
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = 'C:/Personal/个人/编程/scratch/ai/minipython';
const port = Number(process.argv[2] || 8123);
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/octet-stream',
    });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('serving ' + root + ' on http://127.0.0.1:' + port));
