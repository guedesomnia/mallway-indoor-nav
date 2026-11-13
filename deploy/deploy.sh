#!/usr/bin/env bash
# Atualiza o Mallway no servidor. Rode como root (ou com sudo) em /opt/mallway:  ./deploy/deploy.sh
# Primeira instalação: veja a seção "Deploy" do README (usuário, banco, env, nginx, systemd).
set -euo pipefail

cd /opt/mallway
git fetch --quiet origin
git checkout --quiet main
git pull --quiet --ff-only origin main

echo "==> Backend"
cd server
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install --quiet -r requirements-dev.txt   # inclui pytest/httpx para rodar a suíte antes de subir
./.venv/bin/python -m pytest -q          # não sobe versão que não passa nos testes
cd ..

echo "==> Frontend"
npm ci --silent
npm test --silent
npm run build --silent
rsync -a --delete dist/ /var/www/mallway/dist/

echo "==> Reiniciando API"
systemctl restart mallway-api
sleep 2
curl -fsS http://127.0.0.1:8000/api/health && echo
echo "deploy concluído"
