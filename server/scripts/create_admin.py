"""Cria (ou redefine a senha de) um usuário administrador. A senha é pedida no terminal, nunca por argumento
de linha de comando (argumentos ficam no histórico do shell e em `ps`).

Uso (de dentro de server/):
  python -m scripts.create_admin master@exemplo.com --role master
  python -m scripts.create_admin gerente@shopping.com --role mall_admin --mall bangu-shopping
"""
from __future__ import annotations

import argparse
import getpass
import sys

from sqlalchemy import select

from app.config import load_settings
from app.db import Base, make_engine, make_session_factory
from app.models import AdminUser, Mall
from app.security import hash_password


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("email")
    ap.add_argument("--role", choices=["master", "mall_admin"], required=True)
    ap.add_argument("--mall")
    args = ap.parse_args()
    if (args.role == "mall_admin") != bool(args.mall):
        print("mall_admin exige --mall; master não pode ter --mall", file=sys.stderr)
        return 2

    pw = getpass.getpass("Senha (mín. 10 caracteres): ")
    if len(pw) < 10 or pw != getpass.getpass("Repita a senha: "):
        print("Senha curta demais ou diferente da confirmação", file=sys.stderr)
        return 2

    engine = make_engine(load_settings().database_url)
    Base.metadata.create_all(engine)
    with make_session_factory(engine)() as db:
        if args.mall and db.get(Mall, args.mall) is None:
            print(f"Shopping '{args.mall}' não existe", file=sys.stderr)
            return 2
        email = args.email.strip().lower()
        user = db.execute(select(AdminUser).where(AdminUser.email == email)).scalar_one_or_none()
        if user:
            user.password_hash, user.role, user.mall_id, user.is_active = hash_password(pw), args.role, args.mall, True
            user.token_version += 1  # derruba sessões antigas ao trocar a senha
            print(f"Usuário {email} atualizado; sessões anteriores revogadas")
        else:
            db.add(AdminUser(email=email, password_hash=hash_password(pw), role=args.role, mall_id=args.mall))
            print(f"Usuário {email} criado ({args.role})")
        db.commit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
