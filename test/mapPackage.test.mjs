import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createLoader } from './helpers/ts-loader.mjs';

// Armazenamento e rede falsos: o cache offline é o que salva o entregador no corredor sem sinal.
class FakeStorage {
  constructor() { this.m = new Map(); this.quota = Infinity; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if ([...this.m.values()].join('').length + v.length > this.quota) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  key(i) { return [...this.m.keys()][i]; }
  get length() { return this.m.size; }
}

const load = createLoader({ './http': { API_BASE: '' } });
const { loadPublishedMap, purgeLegacyStorage, isValidMallId, getLastMallId, MapUnavailableError } = load('src/api/mapPackage.ts');

const pkg = (mallId, extra = {}) => ({
  schemaVersion: 1, mallId, version: 3, publishedAt: '2026-11-01T00:00:00Z', contentHash: 'x'.repeat(64),
  map: { id: mallId, name: mallId, floors: [], units: [], nodes: [], edges: [] }, ...extra,
});
const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });

let storage;
beforeEach(() => {
  storage = new FakeStorage();
  globalThis.localStorage = storage;
  // Object.keys(localStorage) precisa enxergar as chaves
  globalThis.localStorage = new Proxy(storage, { ownKeys: () => [...storage.m.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
});

test('baixa da rede e guarda cópia para uso offline', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  const r = await loadPublishedMap('shop-a');
  assert.equal(r.source, 'network');
  assert.equal(r.version, 3);
  assert.equal(getLastMallId(), 'shop-a');
});

test('sem rede usa a cópia do MESMO shopping', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  await loadPublishedMap('shop-a');
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const r = await loadPublishedMap('shop-a');
  assert.equal(r.source, 'cache');
});

test('nunca usa cópia de outro shopping', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  await loadPublishedMap('shop-a');
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(() => loadPublishedMap('shop-b'), (e) => e.reason === 'offline');
});

test('404 não cai no cache (shopping despublicado)', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  await loadPublishedMap('shop-a');
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(() => loadPublishedMap('shop-a'), (e) => e.reason === 'not_found');
});

test('erro 500 do servidor usa o cache', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  await loadPublishedMap('shop-a');
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  assert.equal((await loadPublishedMap('shop-a')).source, 'cache');
});

test('portal cativo (HTML com status 200) cai no cache em vez de quebrar', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  await loadPublishedMap('shop-a');
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } });
  assert.equal((await loadPublishedMap('shop-a')).source, 'cache');
});

test('rede pendurada: estoura o tempo e usa o cache', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  await loadPublishedMap('shop-a');
  globalThis.fetch = (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError'))));
  const t0 = Date.now();
  const r = await loadPublishedMap('shop-a', 80);
  assert.equal(r.source, 'cache');
  assert.ok(Date.now() - t0 < 1500);
});

test('pacote de versão de schema mais nova pede atualização do app', async () => {
  globalThis.fetch = ok(pkg('shop-a', { schemaVersion: 99 }));
  await assert.rejects(() => loadPublishedMap('shop-a'), (e) => e.reason === 'outdated_app');
});

test('pacote com schema antigo/inválido no cache é descartado', async () => {
  storage.setItem('mallway:pkg:v1:shop-a', JSON.stringify({ fetchedAt: 1, pkg: pkg('shop-a', { schemaVersion: 0 }) }));
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(() => loadPublishedMap('shop-a'), (e) => e.reason === 'offline');
  storage.setItem('mallway:pkg:v1:shop-a', '{lixo');
  await assert.rejects(() => loadPublishedMap('shop-a'), (e) => e.reason === 'offline');
});

test('pacote cujo mallId não bate com o pedido é recusado', async () => {
  globalThis.fetch = ok(pkg('shop-b'));
  await assert.rejects(() => loadPublishedMap('shop-a'), (e) => e.reason === 'invalid');
});

test('id de shopping malicioso nunca vira URL', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; };
  for (const bad of ['../etc/passwd', 'a/b', 'A-B', '', 'x', 'a'.repeat(60), 'ok?x=1', '..%2f..']) {
    await assert.rejects(() => loadPublishedMap(bad), (e) => e instanceof MapUnavailableError && e.reason === 'bad_id', bad);
    assert.equal(isValidMallId(bad), false, bad);
  }
  assert.equal(called, false);
});

test('cota do armazenamento cheia não derruba o carregamento', async () => {
  globalThis.fetch = ok(pkg('shop-a'));
  storage.quota = 10;
  const r = await loadPublishedMap('shop-a');
  assert.equal(r.source, 'network');
});

test('limpeza do localStorage do protótipo remove só as chaves antigas', () => {
  storage.setItem('indoor_all_shoppings_v4', '[]');
  storage.setItem('active_shopping_id_v4', 'x');
  storage.setItem('active_system_mode_v3', 'master');
  storage.setItem('mallway:pkg:v1:shop-a', '{}');
  storage.setItem('indoor_waze_voice_muted', 'true');
  purgeLegacyStorage();
  assert.deepEqual([...storage.m.keys()].sort(), ['indoor_waze_voice_muted', 'mallway:pkg:v1:shop-a']);
});
