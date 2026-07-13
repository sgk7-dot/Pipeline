'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createServer } = require('../app');

// Spin up the server on an ephemeral port, make a request, assert, close.
function request(server, path) {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const { port } = server.address();
      http
        .get(`http://127.0.0.1:${port}${path}`, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode, body });
          });
        })
        .on('error', reject);
    });
  });
}

test('GET / returns a greeting', async () => {
  const res = await request(createServer(), '/');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(JSON.parse(res.body), {
    message: 'Hello from the CI/CD sample app',
  });
});

test('GET /health returns ok', async () => {
  const res = await request(createServer(), '/health');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(JSON.parse(res.body), { status: 'ok' });
});
