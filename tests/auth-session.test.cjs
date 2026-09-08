const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ session = null, refresh, fetch }) {
  let cookie = 'meraki_token=old';
  let logouts = 0;
  const redirects = [];
  const source = ts.transpileModule(fs.readFileSync('src/services/api.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const context = {
    exports, process: { env: { NODE_ENV: 'test' } }, FormData,
    document: { get cookie() { return cookie; }, set cookie(value) { cookie = value; } },
    window: { location: { assign: (url) => redirects.push(url) } },
    fetch,
    require(name) {
      if (name === '@/lib/constants') return { API_BASE_URL: 'https://api.test', API_ENDPOINTS: {} };
      if (name === '@/lib/debug') return { debugBackend() {} };
      if (name === '@/lib/supabase') return { supabase: { auth: {
        getSession: async () => ({ data: { session }, error: null }),
        refreshSession: refresh,
      } } };
      if (name === '@/store/userStore') return { useUserStore: { getState: () => ({ logout() { logouts++; } }) } };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(source, context);
  return { api: exports.apiClient, redirects, logouts: () => logouts };
}
const response = (status) => new Response(JSON.stringify(status === 200 ? { ok: true } : { detail: 'Invalid or expired token' }), { status });

test('uses the renewed Supabase token before sending a request', async () => {
  const app = setup({ session: { access_token: 'fresh' }, fetch: async (_, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fresh');
    return response(200);
  } });
  assert.equal((await app.api.request('/sessions')).success, true);
});

test('concurrent 401s share renewal and retry with the new token', async () => {
  let refreshes = 0;
  const app = setup({ refresh: async () => {
    refreshes++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return { data: { session: { access_token: 'fresh' } }, error: null };
  }, fetch: async (_, options) => response(options.headers.Authorization === 'Bearer fresh' ? 200 : 401) });
  const results = await Promise.all([app.api.request('/one'), app.api.request('/two')]);
  assert.ok(results.every(result => result.success));
  assert.equal(refreshes, 1);
  assert.equal(app.logouts(), 0);
});

test('invalid refresh credentials show the expiry sign-in page once', async () => {
  const app = setup({ refresh: async () => ({ data: { session: null }, error: { name: 'AuthApiError', status: 400 } }), fetch: async () => response(401) });
  const result = await app.api.request('/sessions');
  assert.equal(result.error.code, '401');
  assert.equal(app.logouts(), 1);
  assert.deepEqual(app.redirects, ['/auth/login?reason=session-expired']);
});

test('a rejected refreshed token does not cause an infinite retry loop', async () => {
  let requests = 0;
  const app = setup({ refresh: async () => ({ data: { session: { access_token: 'fresh' } }, error: null }), fetch: async () => { requests++; return response(401); } });
  await app.api.request('/sessions');
  assert.equal(requests, 2);
  assert.equal(app.logouts(), 1);
});

test('temporary refresh network failures keep the user signed in', async () => {
  const app = setup({ refresh: async () => ({ data: { session: null }, error: { name: 'AuthRetryableFetchError', status: 503 } }), fetch: async () => response(401) });
  assert.equal((await app.api.request('/sessions')).error.code, 'NETWORK_ERROR');
  assert.equal(app.logouts(), 0);
  assert.equal(app.redirects.length, 0);
});

test('failed public login requests do not renew or expire an existing session', async () => {
  const app = setup({ refresh: async () => { throw new Error('Must not refresh'); }, fetch: async () => response(401) });
  assert.equal((await app.api.request('/auth/login', { skipAuth: true })).error.code, '401');
  assert.equal(app.logouts(), 0);
});

function socketSetup(refresh) {
  const sockets = [];
  const reconnects = [];
  let authErrors = 0;
  let token = 'old';
  class Socket {
    static CLOSED = 3;
    constructor(url) { this.url = url; sockets.push(this); }
  }
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/services/websocket.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, WebSocket: Socket, console,
    setTimeout: (callback) => reconnects.push(callback),
    require(name) {
      if (name === '@/lib/constants') return { WS_URL: 'wss://api.test' };
      if (name === '@/services/api') return { refreshAccessToken: async () => {
        const renewed = await refresh();
        if (renewed) token = renewed;
        return renewed;
      } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  exports.MerakiWebSocket.getOrCreate({
    sessionId: 'test', getToken: () => token, onMessage() {}, onAuthError: () => authErrors++,
  });
  return { sockets, reconnects, authErrors: () => authErrors };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('WebSocket reconnects with a renewed token after authentication rejection', async () => {
  const app = socketSetup(async () => 'fresh');
  app.sockets[0].onclose({ code: 4001 });
  await flush();
  assert.equal(app.sockets.length, 2);
  assert.match(app.sockets[1].url, /token=fresh$/);
  assert.equal(app.authErrors(), 0);
  app.sockets[1].onclose({ code: 4001 });
  await flush();
  assert.equal(app.authErrors(), 1);
  assert.equal(app.sockets.length, 2);
});

test('WebSocket renewal failure signals expiry', async () => {
  const app = socketSetup(async () => null);
  app.sockets[0].onclose({ code: 4001 });
  await flush();
  assert.equal(app.authErrors(), 1);
});

test('WebSocket network failures schedule reconnection without signing out', async () => {
  const app = socketSetup(async () => { throw new Error('offline'); });
  app.sockets[0].onclose({ code: 4001 });
  await flush();
  assert.equal(app.authErrors(), 0);
  assert.equal(app.reconnects.length, 1);
});
