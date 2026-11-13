// Carrega módulos TypeScript do app sem bundler: transpila com o compilador do projeto e resolve imports relativos.
// `overrides` troca um import (pelo texto exato do specifier) por um objeto, para isolar rede/armazenamento.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function createLoader(overrides = {}) {
  const cache = new Map();

  function load(absPath) {
    if (cache.has(absPath)) return cache.get(absPath).exports;
    const source = readFileSync(absPath, 'utf8');
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    cache.set(absPath, mod);
    const req = (spec) => {
      if (spec in overrides) return overrides[spec];
      if (spec.startsWith('.')) {
        let p = resolve(dirname(absPath), spec);
        if (!p.endsWith('.ts')) p += '.ts';
        return load(p);
      }
      throw new Error(`import externo não suportado no teste: ${spec}`);
    };
    new Function('module', 'exports', 'require', js)(mod, mod.exports, req);
    return mod.exports;
  }

  return (relPath) => load(join(root, relPath));
}
