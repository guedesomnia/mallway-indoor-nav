# MallWay Pro — navegação indoor assistida por QR para shoppings

Aplicativo web (PWA) que leva entregadores e visitantes da entrada de um shopping até a loja, sem instalar nada: o
QR Code da placa abre o app já posicionado, e a rota é calculada no próprio celular.

> **O que ele é e o que não é.** A posição do usuário é uma **estimativa**: ponto de partida confirmado pelo QR da
> placa + contagem de passos pelo acelerômetro, sempre ao longo da rota calculada. Não é GPS indoor, não usa beacons
> e não detecta desvio de rota. O modo câmera é um overlay simples sobre a imagem do celular, não realidade
> aumentada com rastreamento. Rotas e tempos só são confiáveis depois que a **escala da planta foi calibrada**.

Produto independente (co-irmão da Omnia): operação, venda e clientes próprios. Só a infraestrutura do servidor é
compartilhada, por economia.

## Como funciona

```
 Editor (equipe)            Servidor (FastAPI + Postgres)              App do entregador (PWA)
 ───────────────            ─────────────────────────────              ───────────────────────
 edita o rascunho  ──PUT──▶ rascunho com controle de revisão
 valida e publica  ─────────▶ validador (simula todas as rotas)
                             grava versão imutável vN
                             atualiza latest.json  ──── /p/{shopping}/latest.json ────▶ baixa o mapa
                                                                                        guarda cópia offline
                                                                                        calcula a rota no aparelho
```

- **Rascunho x publicado.** A equipe edita um rascunho no servidor. O entregador só enxerga o que foi **publicado**
  (versão numerada, imutável). Publicou errado? Rollback de um clique no painel de publicação.
- **Offline.** O mapa baixado fica no aparelho (por shopping). Sem sinal no corredor, o app usa a última cópia e avisa.
- **Placas.** Cada entrada tem um QR com `https://<site>/?mall=<shopping>&entrance=<entrada>`. O app só aceita QR do
  próprio site e nunca "adivinha" a entrada: código desconhecido é recusado.

## Estrutura

```
src/            PWA React 19 + TypeScript + Tailwind v4
  api/          cliente HTTP, sessão (login/refresh) e carregador do mapa publicado (cache offline)
  state/        useAdminCatalog: rascunhos, autosave e detecção de conflito
  screens/      telas do entregador (QR → lojas → detalhe → mapa → passo a passo → chegada)
  components/   editor (AdminPanel, MapStudioEditor), painel de publicação, console da rede
  utils/        rotas (Dijkstra), regras de mapa, QR, calibração de escala
server/         API FastAPI
  app/          auth, rascunhos, validador, publicação, upload de planta
  scripts/      seed (importa os mapas do protótipo como rascunho) e create_admin
  tests/        71 testes (inclui fuzz contra entrada hostil)
test/           30 testes do frontend (QR, calibração, rotas, cache offline)
deploy/         Nginx, systemd, backup das plantas, script de deploy
```

## Rodando localmente

Pré-requisitos: Node 20+ e Python 3.11+.

```bash
# 1) Backend (porta 8000, SQLite local, nada de produção)
cd server
python -m venv .venv && ./.venv/Scripts/pip install -r requirements-dev.txt    # Linux/Mac: .venv/bin/pip
./.venv/Scripts/python -m scripts.seed          # importa Bangu/Barra/Norte como rascunhos e mostra o que falta corrigir
./.venv/Scripts/python -m scripts.create_admin voce@exemplo.com --role master   # pede a senha no terminal
./.venv/Scripts/python dev.py

# 2) Frontend (porta 5174; o Vite repassa /api, /auth e /p para o backend)
cd .. && npm install && npm run dev
```

Abra `http://localhost:5174/?mode=master` e entre. Para ver o app do entregador, publique um shopping e abra
`http://localhost:5174/?mall=<id-do-shopping>`.

Testes: `npm test` (frontend), `npm run test:server` (backend), `npm run check:paths` (paridade do motor de rotas com a
versão original do protótipo).

## Regras de publicação

O servidor simula **toda entrada × toda loja × cada perfil** (entregador, cliente, cliente acessível) antes de publicar.
Bloqueiam a publicação:

| Regra | Por quê |
|---|---|
| Piso sem **escala calibrada** | sem ela toda distância e tempo estimado ficam errados |
| Loja sem nó de porta ligado ao corredor | a rota levaria a outro lugar |
| Loja inalcançável por entregador | o app não conseguiria guiar até lá |
| Entrada sem nenhuma conexão, ou mapa sem entradas | não há ponto de partida |
| IDs duplicados, referências quebradas, aresta entre pisos, distância ≤ 0 | grafo inconsistente |
| Planta que não é caminho local (data URL, link externo) | pacote gigante / conteúdo de terceiros |
| Pacote acima de 2 MB | ruim para rede de shopping |

Avisos (não bloqueiam): ponto fora da tela, ponto órfão, distância divergente da geometria, loja inalcançável para
cliente/cadeirante, rota de entregador acima de 1200 m (sinal de escala errada).

## Segurança e operação

- Senhas com scrypt; sessões JWT com revogação imediata (usuário desativado ou senha trocada perde acesso na hora);
  limite de tentativas de login por IP e por e-mail; mensagem idêntica para e-mail inexistente e senha errada.
- Quem administra um shopping só enxerga esse shopping (os outros respondem 404, não 403).
- Dois admins no mesmo mapa: o segundo a salvar recebe aviso de conflito e **nada é sobrescrito** (revisão por
  compare-and-swap no banco).
- Plantas: validadas, convertidas para WebP, com nome pelo hash do conteúdo (nunca o nome enviado).
- Erros do app chegam em `POST /api/beacon` e viram linha de log (journald), sem dado pessoal.
- `GET /api/health` (banco responde + pasta pública gravável) — adicione ao `omnia-health`.
- Esquema do banco hoje é criado por `create_all`. **Antes de alterar qualquer coluna existente (ex.: tabela de
  telemetria da Fase 2), introduza Alembic.**

## Deploy (VPS com Nginx + systemd + Postgres)

1. Usuário `mallway`, pastas `/opt/mallway` (código), `/var/lib/mallway/public` (mapas e plantas, dono `mallway`),
   `/var/www/mallway/dist` (build do app), `/etc/mallway/mallway.env` (veja `deploy/mallway.env.example`, perm. 640).
2. Banco: `CREATE DATABASE mallway; CREATE USER mallway ...` e inclua `mallway` no `pg_dump` diário.
3. `deploy/mallway-api.service` → `/etc/systemd/system/`; `deploy/nginx-mallway.conf` → sites do Nginx;
   `certbot --nginx -d mallway.omniasoftwares.com`.
4. Primeira carga: `python -m scripts.seed` e `python -m scripts.create_admin ...` no servidor.
5. **Plantas enviadas ficam só em disco**: agende `deploy/backup-plantas.sh` (o `pg_dump` não as cobre).
6. Atualizações: `./deploy/deploy.sh` (roda os testes antes de reiniciar).

## O que ainda não existe

Coleta de rotas e métricas reais (o painel de BI mostra **dados de exemplo**, avisado na tela), QR no balcão para medir o
tempo cancela→balcão, gerador de placas em PDF, fotos de referência nas instruções, importação de lojas por planilha e
cobrança. Roteiro completo em [`PLANO-COMERCIAL-3-FASES.md`](PLANO-COMERCIAL-3-FASES.md).

---

Propriedade de **Jean Guedes / Omnia Softwares**. Todos os direitos reservados.
