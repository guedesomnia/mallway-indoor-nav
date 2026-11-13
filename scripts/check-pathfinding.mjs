// Teste de paridade do motor de rotas: compara a versão original (git HEAD~N) com a atual em todas as rotas
// entrada × nó dos 3 mapas de seed. Rode: node scripts/check-pathfinding.mjs [git-ref-da-versao-antiga]
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.argv[2] ?? '1342c2a';

function load(code) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
  return mod.exports;
}

const oldMod = load(execSync(`git show ${ref}:src/utils/pathfinding.ts`, { cwd: root, encoding: 'utf8' }));
const newMod = load(readFileSync(join(root, 'src/utils/pathfinding.ts'), 'utf8'));

const seedDir = join(root, 'server', 'seed');
let compared = 0;
let metersDiffs = 0;
const diffProfiles = new Set();
let structural = 0;
let listMismatch = 0;

for (const f of readdirSync(seedDir).filter((x) => x.endsWith('.json'))) {
  const { map } = JSON.parse(readFileSync(join(seedDir, f), 'utf8'));
  const entries = map.nodes.filter((n) => ['entrance', 'courier_parking', 'qr_anchor'].includes(n.type));
  for (const profile of ['courier', 'customer']) {
    for (const accessible of [false, true]) {
      for (const e of entries) {
        const dist = newMod.routeDistancesFrom(map, e.id, profile, accessible);
        for (const n of map.nodes) {
          const a = oldMod.calculateIndoorRoute(map, e.id, n.id, profile, accessible);
          const b = newMod.calculateIndoorRoute(map, e.id, n.id, profile, accessible);
          compared++;
          if (!!a !== !!b) { structural++; console.log('ALCANÇABILIDADE DIFERE', f, e.id, n.id); continue; }
          if (!a) { if (dist.has(n.id)) { listMismatch++; console.log('LISTA diz alcançável, rota não', f, e.id, n.id); } continue; }
          const sameShape = JSON.stringify(a.floorSegments.map((s) => s.points)) === JSON.stringify(b.floorSegments.map((s) => s.points))
            && a.instructions.map((i) => i.title).join('|') === b.instructions.map((i) => i.title).join('|');
          if (!sameShape) { structural++; console.log('CAMINHO DIFERE', f, e.id, n.id); }
          if (a.totalDistanceMeters !== b.totalDistanceMeters) { metersDiffs++; diffProfiles.add(profile); }
          if (Math.abs((dist.get(n.id) ?? -1) - Math.round(b.totalDistanceMeters)) > 1.01 && Math.abs((dist.get(n.id) ?? -1) - b.totalDistanceMeters) > 1.01) {
            listMismatch++;
            if (listMismatch < 5) console.log('LISTA != ROTA', f, e.id, n.id, dist.get(n.id), b.totalDistanceMeters);
          }
        }
      }
    }
  }
}
console.log(`rotas comparadas: ${compared}`);
console.log(`diferenças de caminho/instruções (devem ser 0): ${structural}`);
console.log(`diferenças só em metros (esperadas onde há corredor exclusivo de entregador): ${metersDiffs}`);
console.log(`perfis com diferença de metros: ${[...diffProfiles].join(', ') || 'nenhum'}`);
console.log(`divergências lista × rota (devem ser 0): ${listMismatch}`);
process.exit(structural || listMismatch ? 1 : 0);
