const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { openStore, dateKey } = require('./inspections.cjs');
const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const SESSION_MS = 8 * 60 * 60 * 1000;
const LIMIT_MS = 15 * 60 * 1000;

async function createApplication({ dataDir = path.join(ROOT, 'data'), origin = 'http://127.0.0.1:3000', now = Date.now } = {}) {
  const allowedOrigin = new URL(origin).origin;
  const secure = allowedOrigin.startsWith('https:');
  const credentialFile = path.join(dataDir, 'admin.json');
  let credentials = null;
  try {
    credentials = JSON.parse(await fs.readFile(credentialFile, 'utf8'));
    if (credentials.version !== 1 || !/^[a-f0-9]{32}$/.test(credentials.salt) || !/^[a-f0-9]{128}$/.test(credentials.hash)) throw new Error('Cadastro de acesso inválido.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(dataDir, { recursive:true, mode:0o700 });
  const store = openStore(dataDir);
  let setupToken = credentials ? null : crypto.randomBytes(32).toString('hex');
  const setupExpires = now() + 30 * 60 * 1000;
  const sessions = new Map();
  const attempts = new Map();
  let busy = false;
  const tokenHash = value => crypto.createHash('sha256').update(value).digest('hex');
  const cookie = (value, age) => `fornalha_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  function session(req) {
    const value = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('fornalha_session='))?.slice(17);
    if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
    const key = tokenHash(value);
    const expires = sessions.get(key);
    if (!expires || expires <= now()) { sessions.delete(key); return null; }
    return key;
  }
  function signIn(res) {
    for (const [key, expires] of sessions) if (expires <= now()) sessions.delete(key);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(tokenHash(token), now() + SESSION_MS);
    res.setHeader('Set-Cookie', cookie(token, SESSION_MS / 1000));
  }
  async function body(req, maxBytes = 4096) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw Object.assign(new Error('Formato inválido.'), { status: 415 });
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) throw Object.assign(new Error('Dados excedem o limite.'), { status: 413 });
    }
    try { return JSON.parse(raw); } catch { throw Object.assign(new Error('Dados inválidos.'), { status: 400 }); }
  }
  async function serve(res, file, type = 'text/html; charset=utf-8') {
    const content = await fs.readFile(path.join(ROOT, file));
    res.writeHead(200, { 'Content-Type': type }); res.end(content);
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      if (req.headers.host !== new URL(allowedOrigin).host) return json(res, 400, { message: 'Endereço não autorizado.' });
      const url = new URL(req.url, allowedOrigin);
      if (req.method === 'POST') {
        if (req.headers.origin !== allowedOrigin) return json(res, 403, { message: 'Origem não autorizada.' });
        if (url.pathname === '/api/catalog') {
          if(!session(req))return json(res,401,{message:'Entre no painel para alterar cadastros.'});
          return json(res,200,store.saveCatalog(await body(req)));
        }
        if (url.pathname === '/api/inspections') {
          const receipt = store.save(await body(req, 32768), now());
          return json(res, receipt.duplicate ? 200 : 201, receipt);
        }
        if (url.pathname === '/api/logout') {
          const key = session(req); if (key) sessions.delete(key);
          res.setHeader('Set-Cookie', cookie('', 0)); return json(res, 200, { ok: true });
        }
        if (!['/api/login', '/api/setup'].includes(url.pathname)) return json(res, 404, { message: 'Não encontrado.' });
        if (busy) return json(res, 429, { message: 'Aguarde um instante e tente novamente.' });
        const ip = req.socket.remoteAddress;
        for (const [key, attempt] of attempts) if (attempt.until <= now()) attempts.delete(key);
        const attempt = attempts.get(ip);
        if (attempt && attempt.count >= 5) {
          res.setHeader('Retry-After', String(Math.ceil((attempt.until - now()) / 1000)));
          return json(res, 429, { message: 'Muitas tentativas. Aguarde 15 minutos.' });
        }
        busy = true;
        try {
          const payload = await body(req);
          const password = payload?.password;
          if (typeof password !== 'string' || password.length > 256 || !password.length) return json(res, 400, { message: 'Informe uma senha válida.' });
          if (url.pathname === '/api/setup') {
            const supplied = req.headers['x-setup-token'];
            if (credentials || !setupToken || now() >= setupExpires || typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(setupToken))) return json(res, 403, { message: 'Configuração indisponível ou link expirado.' });
            if (password.length < 12) return json(res, 400, { message: 'Use pelo menos 12 caracteres.' });
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = (await scrypt(password, salt, 64)).toString('hex');
            const next = { version: 1, salt, hash };
            await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
            await fs.writeFile(credentialFile, JSON.stringify(next), { flag: 'wx', mode: 0o600 });
            credentials = next; setupToken = null; signIn(res);
            return json(res, 201, { ok: true });
          }
          if (!credentials) return json(res, 409, { message: 'O acesso do gestor ainda precisa ser configurado no servidor.' });
          const actual = await scrypt(password, credentials.salt, 64);
          if (!crypto.timingSafeEqual(actual, Buffer.from(credentials.hash, 'hex'))) {
            attempts.set(ip, { count: (attempt?.count || 0) + 1, until: attempt?.until || now() + LIMIT_MS });
            return json(res, 401, { message: 'Senha incorreta. Tente novamente.' });
          }
          attempts.delete(ip); signIn(res); return json(res, 200, { ok: true });
        } finally { busy = false; }
      }
      if (req.method !== 'GET') return json(res, 405, { message: 'Método não permitido.' });
      if (url.pathname === '/api/inspections') {
        if (!session(req)) return json(res, 401, { message:'Entre no painel para consultar as vistorias.' });
        const start=url.searchParams.get('start')||url.searchParams.get('date')||dateKey(now());
        return json(res, 200, store.list(start,url.searchParams.get('end')||start));
      }
      if(url.pathname==='/api/catalog')return json(res,200,store.catalog());
      if(url.pathname==='/api/catalog/admin'){
        if(!session(req))return json(res,401,{message:'Entre no painel para consultar cadastros.'});
        return json(res,200,store.catalog(true));
      }
      if (url.pathname === '/api/session') return json(res, session(req) ? 200 : 401, { authenticated: !!session(req) });
      if (['/gestor','/cadastros'].includes(url.pathname)) {
        if (!session(req)) { res.writeHead(303, { Location: '/acesso' }); return res.end(); }
        return await serve(res, url.pathname==='/cadastros'?'pages/cadastros.html':'pages/gestor.html');
      }
      const routes = {
        '/': ['index.html'], '/index.html': ['index.html'], '/celular.html': ['celular.html'],
        '/outbox.js': ['outbox.js', 'text/javascript; charset=utf-8'], '/driver.js': ['driver.js', 'text/javascript; charset=utf-8'],
        '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'],
        '/acesso': ['pages/acesso.html'], '/acesso.js': ['pages/acesso.js', 'text/javascript; charset=utf-8'],
        '/gestor.js': ['pages/gestor.js', 'text/javascript; charset=utf-8'], '/gestor.css': ['pages/gestor.css', 'text/css; charset=utf-8']
        ,'/cadastros.js':['pages/cadastros.js','text/javascript; charset=utf-8']
      };
      if (routes[url.pathname]) return await serve(res, ...routes[url.pathname]);
      return json(res, 404, { message: 'Não encontrado.' });
    } catch (error) { if (!res.headersSent) json(res, error.status || 500, { message: error.status ? error.message : 'Não foi possível concluir. Tente novamente.' }); else res.end(); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('close', () => store.close());
  return { server, setupToken, store };
}

if (require.main === module) {
  const host = process.env.FROTA_HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3000);
  const origin = process.env.FROTA_ORIGIN || `http://127.0.0.1:${port}`;
  if (!['127.0.0.1', '::1'].includes(host) && !origin.startsWith('https://')) throw new Error('Acesso externo exige FROTA_ORIGIN com HTTPS e proxy configurado.');
  createApplication({ origin }).then(({ server, setupToken }) => {
    server.listen(port, host, () => {
      console.log(`Motoristas: ${origin}/\nGestor: ${origin}/gestor`);
      if (setupToken) console.log(`Configure sua senha neste link local (válido por 30 minutos):\n${origin}/acesso#configurar=${setupToken}`);
    });
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createApplication };
