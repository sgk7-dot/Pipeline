'use strict';

const http = require('http');

// Minimal request handler, exported so tests can exercise it
// without binding to a port.
function handler(req, res) {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello from the CI/CD sample app' }));
}

function createServer() {
  return http.createServer(handler);
}

module.exports = { handler, createServer };
