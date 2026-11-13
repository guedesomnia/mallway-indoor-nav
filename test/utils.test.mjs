import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLoader } from './helpers/ts-loader.mjs';

const load = createLoader();
const { parseQrPayload, buildPlateUrl } = load('src/utils/qr.ts');
const { listEntrances, resolveUnitDoorNode } = load('src/utils/mapRules.ts');
const { computeScale, calibrateFloor } = load('src/utils/calibration.ts');
const { calculateIndoorRoute, routeDistancesFrom } = load('src/utils/pathfinding.ts');

const ORIGIN = 'https://mallway.example';

function map() {
  return {
    id: 'shop-a',
    name: 'Shop A',
    floors: [
      { id: 'f1', name: 'T', shortName: 'T', elevation: 0, width: 500, height: 400 },
      { id: 'f2', name: 'L1', shortName: 'L1', elevation: 1, width: 500, height: 400 },
    ],
    nodes: [
      { id: 'moto', floorId: 'f1', x: 10, y: 100, type: 'courier_parking', label: 'Ponto motos' },
      { id: 'main', floorId: 'f1', x: 10, y: 300, type: 'entrance', label: 'Entrada principal' },
      { id: 'c1', floorId: 'f1', x: 110, y: 100, type: 'corridor' },
      { id: 'door-a', floorId: 'f1', x: 210, y: 100, type: 'corridor' },
      { id: 'el1', floorId: 'f1', x: 110, y: 200, type: 'vertical_connector' },
      { id: 'el2', floorId: 'f2', x: 110, y: 200, type: 'vertical_connector' },
      { id: 'door-b', floorId: 'f2', x: 210, y: 200, type: 'corridor' },
    ],
    edges: [
      { id: 'e1', floorId: 'f1', nodeA: 'moto', nodeB: 'c1', distance: 25 },
      { id: 'e2', floorId: 'f1', nodeA: 'c1', nodeB: 'door-a', distance: 25 },
      { id: 'e3', floorId: 'f1', nodeA: 'c1', nodeB: 'el1', distance: 25 },
      { id: 'e4', floorId: 'f2', nodeA: 'el2', nodeB: 'door-b', distance: 25 },
    ],
    verticalConnectors: [
      { id: 'v', name: 'Elevador', type: 'elevator', accessible: true, courierAllowed: true, connections: [{ floorId: 'f1', nodeId: 'el1' }, { floorId: 'f2', nodeId: 'el2' }] },
    ],
    units: [
      { id: 'u-a', floorId: 'f1', name: 'Loja A', category: 'food', polygon: [], door: { x: 212, y: 98 } },
      { id: 'u-far', floorId: 'f1', name: 'Longe', category: 'food', polygon: [], door: { x: 400, y: 380 } },
    ],
  };
}

// ---------------------------------------------------------------- QR
test('QR: URL do mesmo site com entrada válida é aceita', () => {
  const r = parseQrPayload(`${ORIGIN}/?mall=shop-a&entrance=moto`, map(), ORIGIN);
  assert.equal(r.kind, 'entrance');
  assert.equal(r.entranceId, 'moto');
});

test('QR: o link gerado para a placa é lido de volta', () => {
  const url = buildPlateUrl(ORIGIN, 'shop-a', 'main');
  assert.equal(parseQrPayload(url, map(), ORIGIN).entranceId, 'main');
});

test('QR: URL de outro site é recusada (adesivo malicioso sobre a placa)', () => {
  for (const evil of ['https://evil.test/?mall=shop-a&entrance=moto', 'http://mallway.example/?mall=shop-a&entrance=moto', 'https://mallway.example.evil.test/?mall=shop-a&entrance=moto']) {
    assert.equal(parseQrPayload(evil, map(), ORIGIN).kind, 'invalid', evil);
  }
});

test('QR: esquemas perigosos e lixo são recusados', () => {
  for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'ftp://x', '', '   ', 'x'.repeat(700), 'https://']) {
    assert.equal(parseQrPayload(bad, map(), ORIGIN).kind, 'invalid', bad);
  }
});

test('QR: entrada inexistente NÃO cai na primeira entrada', () => {
  assert.equal(parseQrPayload(`${ORIGIN}/?mall=shop-a&entrance=fantasma`, map(), ORIGIN).kind, 'invalid');
  assert.equal(parseQrPayload(`${ORIGIN}/?mall=shop-a`, map(), ORIGIN).kind, 'invalid');
});

test('QR: shopping diferente do site vira navegação para o outro mapa', () => {
  const r = parseQrPayload(`${ORIGIN}/?mall=shop-b&entrance=x`, map(), ORIGIN);
  assert.equal(r.kind, 'other-mall');
  assert.equal(r.mallId, 'shop-b');
});

test('QR: código digitado exige id exato (sem diferenciar maiúsculas), nunca parcial', () => {
  assert.equal(parseQrPayload('MOTO', map(), ORIGIN).entranceId, 'moto');
  assert.equal(parseQrPayload('mot', map(), ORIGIN).kind, 'invalid');
  assert.equal(parseQrPayload('entrada principal', map(), ORIGIN).kind, 'invalid');
});

test('entradas: ponto de entregadores vem primeiro', () => {
  assert.deepEqual(listEntrances(map()).map((n) => n.id), ['moto', 'main']);
});

// ---------------------------------------------------------------- porta da loja
test('porta: snap até 40px, explícita tem prioridade, longe devolve null', () => {
  const m = map();
  assert.equal(resolveUnitDoorNode(m, m.units[0]).id, 'door-a');
  assert.equal(resolveUnitDoorNode(m, m.units[1]), null);
  const forced = { ...m.units[1], doorNodeId: 'door-b' };
  assert.equal(resolveUnitDoorNode(m, forced).id, 'door-b');
  assert.equal(resolveUnitDoorNode(m, { ...m.units[1], doorNodeId: 'nao-existe' }), null);
});

test('porta: não encosta em conector vertical nem em nó de outro piso', () => {
  const m = map();
  const u = { id: 'x', floorId: 'f1', name: 'X', category: 'food', polygon: [], door: { x: 110, y: 200 } }; // exatamente sobre el1 (vertical)
  assert.equal(resolveUnitDoorNode(m, u), null);
});

// ---------------------------------------------------------------- calibração
const nodeA = { id: 'a', floorId: 'f1', x: 0, y: 0 };
const nodeB = { id: 'b', floorId: 'f1', x: 200, y: 0 };

test('calibração: escala a partir de dois pontos', () => {
  const r = computeScale(nodeA, nodeB, 50);
  assert.equal(r.ok, true);
  assert.equal(r.metersPerPixel, 0.25);
});

test('calibração: rejeita pontos iguais, em pisos diferentes, próximos demais e escala absurda', () => {
  assert.equal(computeScale(nodeA, nodeA, 10).ok, false);
  assert.equal(computeScale(nodeA, { ...nodeB, floorId: 'f2' }, 50).ok, false);
  assert.equal(computeScale(nodeA, { id: 'c', floorId: 'f1', x: 20, y: 0 }, 5).ok, false);
  assert.equal(computeScale(nodeA, nodeB, 0).ok, false);
  assert.equal(computeScale(nodeA, nodeB, -3).ok, false);
  assert.equal(computeScale(nodeA, nodeB, NaN).ok, false);
  assert.equal(computeScale(nodeA, nodeB, 100000).ok, false);
  assert.equal(computeScale(nodeA, nodeB, 0.5).ok, false);
});

test('calibração: recalcula só as arestas do piso calibrado e marca o piso', () => {
  const m = map();
  m.edges.push({ id: 'e5', floorId: 'f2', nodeA: 'el2', nodeB: 'door-b', distance: 999 });
  const out = calibrateFloor(m, 'f1', 0.5);
  assert.equal(out.floors[0].scaleCalibrated, true);
  assert.equal(out.floors[0].metersPerPixel, 0.5);
  assert.equal(out.floors[1].scaleCalibrated, undefined);
  assert.equal(out.edges.find((e) => e.id === 'e4').distance, 25); // piso f2 intacto
  assert.equal(out.edges.find((e) => e.id === 'e1').distance, 50); // hypot(100,0) = 100 px × 0,5 m/px
});

// ---------------------------------------------------------------- rotas
test('rota: metragem real não sofre o desconto do corredor de serviço', () => {
  const m = map();
  m.edges[0].courierOnly = true;
  const r = calculateIndoorRoute(m, 'moto', 'door-a', 'courier');
  assert.equal(r.totalDistanceMeters, 50); // 25 + 25 reais, não 21,25 + 25
});

test('rota: cliente não usa corredor exclusivo de entregador', () => {
  const m = map();
  m.edges[0].courierOnly = true;
  assert.equal(calculateIndoorRoute(m, 'moto', 'door-a', 'customer'), null);
});

test('rota: entregador sem permissão no elevador não chega ao 2º piso; cliente chega', () => {
  const m = map();
  m.verticalConnectors[0].courierAllowed = false;
  assert.equal(calculateIndoorRoute(m, 'moto', 'door-b', 'courier'), null);
  assert.notEqual(calculateIndoorRoute(m, 'moto', 'door-b', 'customer'), null);
});

test('lista de distâncias concorda com a rota e omite destinos inalcançáveis', () => {
  const m = map();
  const d = routeDistancesFrom(m, 'moto', 'courier');
  assert.equal(d.get('door-a'), calculateIndoorRoute(m, 'moto', 'door-a', 'courier').totalDistanceMeters);
  assert.equal(d.has('main'), false); // 'main' não tem arestas
  assert.equal(routeDistancesFrom(m, 'nao-existe').size, 0);
});
