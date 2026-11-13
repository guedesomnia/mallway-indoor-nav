"""Importa os 3 mapas do protótipo (server/seed/*.json, gerados por scripts/export-maps.mjs) como RASCUNHOS.

Nada é publicado aqui: o validador decide. O relatório impresso mostra o que ainda precisa de correção
no editor (escala nunca calibrada, lojas sem ligação confiável com o corredor, etc).

Uso (de dentro de server/):  python -m scripts.seed [--reset]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from app.config import load_settings
from app.db import Base, make_engine, make_session_factory
from app.graph import resolve_door_node
from app.models import Mall
from app.validator import validate_map

SEED_DIR = Path(__file__).resolve().parent.parent / "seed"
LEGACY_PX_PER_METER = 4  # constante mágica que o editor antigo usava (AdminPanel: distância_px / 4)


def migrate(slug: str, legacy: dict) -> tuple[dict, list[str]]:
    """Converte o mapa do protótipo para o modelo novo. Retorna (mapa, notas_de_migração)."""
    notes: list[str] = []
    m = json.loads(json.dumps(legacy))
    m["id"] = slug
    for f in m["floors"]:
        f["metersPerPixel"] = 1 / LEGACY_PX_PER_METER
        f["scaleCalibrated"] = False  # valor herdado, nunca medido: o admin precisa calibrar antes de publicar

    for u in m["units"]:
        node_id, source, _ = resolve_door_node(m, u)
        if node_id:
            u["doorNodeId"] = node_id
            continue
        # Último recurso: a regra antiga (texto do label). Fica marcado para revisão, nunca silencioso.
        needle = u["name"].lower()
        guess = next((n for n in m["nodes"] if n["floorId"] == u["floorId"] and needle in (n.get("label") or "").lower()), None)
        if guess:
            u["doorNodeId"] = guess["id"]
            notes.append(f"INFERIDO por label: '{u['name']}' → nó '{guess['id']}' (porta fica longe do nó; confira no mapa)")
        else:
            notes.append(f"SEM LIGAÇÃO: '{u['name']}' não tem nó de porta — corrigir no editor")
    return m, notes


def main(reset: bool = False) -> int:
    settings = load_settings()
    engine = make_engine(settings.database_url)
    Base.metadata.create_all(engine)
    factory = make_session_factory(engine)
    for path in sorted(SEED_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        slug = data["slug"]
        draft, notes = migrate(slug, data["map"])
        with factory() as db:
            mall = db.get(Mall, slug)
            if mall and not reset:
                print(f"[{slug}] já existe — use --reset para sobrescrever o rascunho")
                continue
            if mall:
                mall.draft_json, mall.draft_rev = draft, mall.draft_rev + 1
            else:
                db.add(Mall(id=slug, name=draft["name"], status="draft", draft_json=draft, draft_rev=1, draft_updated_by="seed"))
            db.commit()
        report = validate_map(draft, max_bytes=settings.max_package_bytes, mall_id=slug)
        print(f"\n=== {slug} — {draft['name']} ===")
        print(f"  rascunho salvo | publicável agora: {'SIM' if report['ok'] else 'NÃO'} | erros: {len(report['errors'])} | avisos: {len(report['warnings'])}")
        for n in notes:
            print(f"  migração: {n}")
        for e in report["errors"]:
            print(f"  ERRO  {e['code']}: {e['message']}")
        for w in report["warnings"][:12]:
            print(f"  aviso {w['code']}: {w['message']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(reset="--reset" in sys.argv))
