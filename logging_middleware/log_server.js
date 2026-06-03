const http = require('http');

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        console.log('[LOG RECEIVED]', JSON.stringify(json));
      } catch (err) {
        console.log('[LOG RECEIVED] (raw)', body);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => console.log(`Log server listening on http://localhost:${PORT}/log`));

