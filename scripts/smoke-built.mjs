import 'dotenv/config';
import { spawn } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { setTimeout as pause } from 'node:timers/promises';
const port = 4001;
const server = spawn(process.execPath, ['dist-server/server/index.js'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    SERVE_WEB: 'true',
    APP_ORIGIN: 'https://opsboard.local.test',
  },
  stdio: 'pipe',
});
server.stderr.on('data', (data) => process.stderr.write(data));
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      ready = (await fetch(base + '/api/health')).ok;
    } catch {}
    if (ready) break;
    await pause(100);
  }
  assert(ready, 'Compiled server must become ready.');
  const deepRoute = await fetch(base + '/tasks');
  assert.equal(deepRoute.status, 200);
  assert.match(await deepRoute.text(), /\/assets\/index-/);
  const denied = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@opsboard.app', password: 'OpsBoardDemo!2026' }),
  });
  assert.equal(denied.status, 403, 'Production writes require Origin.');
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://opsboard.local.test' },
    body: JSON.stringify({ email: 'demo@opsboard.app', password: 'OpsBoardDemo!2026' }),
  });
  assert.equal(login.status, 200);
  const sessionCookie = login.headers
    .getSetCookie()
    .find((c) => /^opsboard_session=[a-f0-9]{64};/.test(c));
  assert(sessionCookie);
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /Secure/);
  assert.match(sessionCookie, /SameSite=Lax/);
  const cookie = sessionCookie.split(';')[0];
  const me = await fetch(base + '/api/auth/me', { headers: { Cookie: cookie } });
  assert.equal(me.status, 200);
  assert.equal(me.headers.get('cache-control'), 'no-store');
  const logout = await fetch(base + '/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: 'https://opsboard.local.test' },
  });
  assert.equal(logout.status, 204);
  assert.equal((await fetch(base + '/api/auth/me', { headers: { Cookie: cookie } })).status, 401);
  console.log(
    'Compiled server smoke check passed: deep routes, production Origin enforcement, secure cookies, no-store, session revocation.',
  );
} finally {
  server.kill();
}
