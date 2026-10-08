const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createApplication } = require('../server.cjs');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
    });
    req.on('error', reject); req.end(options.body);
  });
}
async function removeTestDirectory(dir) {
  assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
  assert.match(path.basename(dir), /^fornalha-(auth|https)-/);
  await fs.rm(dir, { recursive: true, force: true });
}

test('acesso privado: configuração, sessão, limites, saída e persistência', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fornalha-auth-'));
  let clock = Date.now();
  const origin = 'http://127.0.0.1:3000';
  const { server, setupToken } = await createApplication({ dataDir: dir, origin, now: () => clock });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await removeTestDirectory(dir); });
  const base = `http://127.0.0.1:${server.address().port}`;
  function call(url, { method = 'GET', password, cookie, token, requestOrigin = origin, host = '127.0.0.1:3000' } = {}) {
    return fetch(base + url, { method, redirect: 'manual', headers: { Host: host, Origin: requestOrigin, ...(password !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(token ? { 'X-Setup-Token': token } : {}) }, ...(password !== undefined ? { body: JSON.stringify({ password }) } : {}) });
  }
  const password = 'Senha apenas de teste 2026!';
  let response = await call('/gestor'); assert.equal(response.status, 303); assert.equal(response.headers.get('location'), '/acesso');
  for (const url of ['/pages/gestor.html', '/data/admin.json', '/server.cjs', '/.git/config']) assert.equal((await call(url)).status, 404);
  assert.equal((await call('/', { host: 'outro-site.example' })).status, 400);
  const driver = await (await call('/')).text(); assert.doesNotMatch(driver, /managerTab|Painel do gestor|switchView/);
  assert.equal((await call('/api/setup', { method: 'POST', password, token: 'incorreto' })).status, 403);
  assert.equal((await call('/api/setup', { method: 'POST', password, token: setupToken, requestOrigin: 'https://outro-site.example' })).status, 403);
  assert.equal((await call('/api/setup', { method: 'POST', password: 'curta', token: setupToken })).status, 400);
  response = await call('/api/setup', { method: 'POST', password, token: setupToken }); assert.equal(response.status, 201);
  const header = response.headers.get('set-cookie'); assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/);
  const cookie = header.split(';')[0];
  const saved = await fs.readFile(path.join(dir, 'admin.json'), 'utf8'); assert.ok(!saved.includes(password)); assert.equal(JSON.parse(saved).hash.length, 128);
  assert.equal((await call('/gestor', { cookie })).status, 200);
  assert.equal((await call('/api/setup', { method: 'POST', password, token: setupToken })).status, 403);
  assert.equal((await call('/api/logout', { method: 'POST', cookie, requestOrigin: 'https://outro-site.example' })).status, 403);
  assert.equal((await call('/api/logout', { method: 'POST', cookie })).status, 200);
  assert.equal((await call('/gestor', { cookie })).status, 303);
  for (let i = 0; i < 5; i++) assert.equal((await call('/api/login', { method: 'POST', password: 'senha errada' })).status, 401);
  assert.equal((await call('/api/login', { method: 'POST', password })).status, 429);
  clock += 16 * 60 * 1000;
  response = await call('/api/login', { method: 'POST', password }); assert.equal(response.status, 200);
  const freshCookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/session', { cookie: freshCookie })).status, 200);
  clock += 8 * 60 * 60 * 1000 + 1;
  assert.equal((await call('/api/session', { cookie: freshCookie })).status, 401);
  const restarted = await createApplication({ dataDir: dir, origin }); assert.equal(restarted.setupToken, null);
});

test('configuração expira e cookie recebe Secure em origem HTTPS', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fornalha-https-'));
  let clock = 0;
  const { server, setupToken } = await createApplication({ dataDir: dir, origin: 'https://frota.example', now: () => clock });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await removeTestDirectory(dir); });
  const url = `http://127.0.0.1:${server.address().port}`;
  clock = 30 * 60 * 1000;
  let response = await fetch(url + '/api/setup', { method: 'POST', headers: { Host: 'frota.example', Origin: 'https://frota.example', 'Content-Type': 'application/json', 'X-Setup-Token': setupToken }, body: JSON.stringify({ password: 'Senha longa para teste!' }) });
  assert.equal(response.status, 403);
  response = await fetch(url + '/api/logout', { method: 'POST', headers: { Host: 'frota.example', Origin: 'https://frota.example' } });
  assert.match(response.headers.get('set-cookie'), /; Secure/);
});
