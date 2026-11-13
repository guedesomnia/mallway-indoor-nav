# Mallway Pro — Plano para ficar comercialmente pronto (3 fases)

> Escrito em 13/11/2026. Premissas: dev solo, sem serviços pagos até gerar receita.
> Mallway é produto CO-IRMÃO da Omnia — independente, operação e comercialização
> distintas, sem acoplamento de produto. O que se compartilha é só a infra física,
> por economia (VPS Vultr SP, Postgres, Nginx, systemd, pg_dump diário).
> "Comercialmente pronto" = dá para fechar contrato com um shopping, operar sem vergonha
> e provar valor com números reais — **não** inclui gateway de cobrança (cobrança manual
> via Pix/boleto, igual à estratégia da Omnia).

---

## Visão das 3 fases

| Fase | Nome | Resultado que destrava a próxima |
|---|---|---|
| 1 | Fundação confiável | Mapa vive no servidor, publica com validação, PWA funciona em **qualquer** celular (inclusive iPhone) e sem sinal |
| 2 | Prova de valor | Telemetria real medindo cancela→balcão + piloto no Bangu com placas físicas por 30 dias |
| 3 | Pronto para vender | Onboarding de shopping novo em dias, relatório mensal automático, operação gerenciada, kit comercial |

Gatilhos: a Fase 2 só começa com a Fase 1 em produção e o Bangu seedado; a Fase 3 só
começa com o piloto mostrando redução de tempo mensurável (é o material de venda).

---

# FASE 1 — Fundação confiável (~3 semanas)

Objetivo: matar o localStorage como fonte de verdade e matar os bugs que estourariam
no primeiro dia de uso real.

## 1.1 Repositório e estrutura

- [ ] Criar repo git próprio `mallway` (hoje a pasta está solta dentro do repo "projetos claude").
- [ ] Monorepo: `src/` (PWA, já existe) + `server/` (FastAPI novo) + `deploy/` (nginx, systemd, scripts).
- [ ] Atenção à lição do pipeline da Omnia: se o deploy for por bundle, garantir que `deploy/` chega ao servidor pelo passo de scp do workflow, não pelo bundle.

## 1.2 Banco (Postgres, database `mallway`)

```sql
admin_users  (id, email UNIQUE, password_hash, role ENUM('master','mall_admin'),
              mall_id NULL, is_active, created_at)
malls        (id slug PK, name, status ENUM('draft','active','paused'),
              draft_json JSONB, draft_updated_at, draft_updated_by, created_at)
map_versions (id, mall_id FK, version INT, package_json JSONB,  -- IMUTÁVEL
              published_by, published_at, UNIQUE(mall_id, version))
feedback     (id, mall_id, created_at, category, message, route_context JSONB,
              status ENUM('new','triaged','done'))  -- botão "reportar problema"
```

- `draft_json` = o `BuildingMap` em edição. **Não normalizar** lojas/nós em tabelas agora: o JSON já é coerente, normalizar é retrabalho sem ganho nesta escala.
- Database entra no pg_dump diário das 03h existente (retenção 14 dias).

## 1.3 API FastAPI

**Auth (admin):**
- `POST /auth/login` → JWT access (30 min) + refresh (7 dias). Argon2/bcrypt.
- Rate limit 5 tentativas/min por IP no login (slowapi ou contador em memória).
- `mall_admin` enxerga apenas o próprio mall em TODAS as rotas (checagem no backend, nunca só esconder botão no front).

**Admin:**
- `GET /api/malls` · `POST /api/malls` (master) · `GET/PUT /api/malls/{id}/draft`
- `PUT draft` com **controle de concorrência**: o front manda o `draft_updated_at` que carregou; se divergir → `409` com mensagem "Fulano salvou às 14:32 — recarregue antes de continuar". Nunca last-write-wins silencioso (dois admins editando = mapa de um deles evaporaria).
- `POST /api/malls/{id}/publish` → roda o validador (1.4); se passar, grava `map_versions` e escreve `/var/www/mallway/p/{mall}/v{N}.json` + atualiza `latest.json`.
- `POST /api/malls/{id}/rollback/{version}` → repontar `latest.json` para versão anterior. **1 clique.** Publicou errado às 18h de sexta? Resolve em 10 segundos sem deploy.

**Público (estático via Nginx, sem tocar no FastAPI):**
- `GET /p/{mall}/latest.json` — `Cache-Control: max-age=300` + ETag (o PWA revalida barato).
- `GET /p/{mall}/v{N}.json` — `max-age=31536000, immutable` (versão nunca muda).

## 1.4 Validador de publicação (o coração anti-burrice do admin)

Publicar só passa se:

- [ ] Escala calibrada: `metersPerPixel` definido por piso (novo campo em `FloorLevel`). Sem isso, TODA distância/ETA do app é mentira. Calibração no editor: traçar uma linha sobre distância conhecida (ex: largura de corredor) e digitar os metros.
- [ ] Referências íntegras: todo `floorId`, `nodeA/nodeB`, `connectorId` apontam para coisas que existem; IDs únicos.
- [ ] Grafo conexo: por piso + via conectores verticais, nenhum nó órfão.
- [ ] Toda loja tem `door` a ≤ N px de algum nó transitável (senão a rota termina no meio do corredor).
- [ ] ≥ 1 entrada e ≥ 1 QR âncora por piso com entrada.
- [ ] Arestas com `distance > 0`; nenhum par de nós duplicado.
- [ ] **Simulação exaustiva**: Dijkstra de cada entrada × cada loja × perfis (courier/customer/acessível). Relatório: "Burger King inacessível para perfil cliente a partir da Entrada C". É O(entradas×lojas), centenas de rotas, roda em < 1s.
- [ ] Pacote final < 2 MB (sem a planta; imagem vai separada, ver 1.7).

Resultado da validação aparece no editor como checklist verde/vermelho ANTES do botão
publicar habilitar. Erro vira link que seleciona o elemento problemático no mapa.

## 1.5 PWA — pacote publicado + offline de verdade

- [ ] Modo cliente busca `/p/{mall}/latest.json`; persiste em `localStorage` como cache com `{schemaVersion, mallId, fetchedAt}`.
- [ ] **Sem sinal no corredor** (comum em shopping): fetch falha → usa cache do mesmo mall + aviso discreto "mapa de {data}". Dijkstra já roda 100% client-side, navegação funciona offline.
- [ ] Cache de mall errado: link do Barra com cache do Bangu → nunca usar cache de outro `mallId`; sem rede e sem cache certo → tela honesta "conecte-se uma vez para baixar o mapa".
- [ ] `schemaVersion` no pacote: app descarta cache de schema incompatível (evita tela branca pós-update).
- [ ] Limpar chaves `*_v4` do protótipo no primeiro load da versão nova (migração one-shot), senão usuários antigos carregam mapa velho do localStorage para sempre.
- [ ] `src/data/*Map.ts` vira **seed** (script que insere draft + publica v1) e SAI do bundle do cliente.

## 1.6 PWA — bugs reais de dispositivo (descobertos no código)

- [ ] **BUG CONFIRMADO — iPhone não escaneia QR**: `Screen1QR.tsx` depende de `BarcodeDetector`, que não existe no Safari/iOS. Fallback obrigatório com `jsQR` via canvas (lib leve, MIT, sem custo). Sem isso, ~metade dos motoboys não entra no app.
- [ ] Plano C do scanner: campo "digite o código da placa" (ex.: `ENT-B`) + lista de entradas com foto. A placa física imprime o código em texto grande embaixo do QR exatamente para isso.
- [ ] Permissão de câmera negada → cair direto no plano C, sem beco sem saída.
- [ ] Permissão de sensores negada (iOS exige gesto) → modo "toque para avançar" já existe; garantir que a UI deixa isso óbvio em vez de parecer travada.
- [ ] TTS indisponível/bloqueado por autoplay → navegação 100% visual continua íntegra; áudio só liga após primeiro toque.
- [ ] Câmera AR desliga sozinha após 60s sem interação (bateria do motoboy é ferramenta de trabalho).
- [ ] Tela sempre acesa durante navegação: `navigator.wakeLock` com try/catch (não existe em todo browser).
- [ ] Erros do front viram beacon `POST /api/beacon` (endpoint público, rate-limited, payload mínimo: msg, stack truncado, UA, mall). Zero custo, substitui Sentry por ora.

## 1.7 Planta baixa (imagem)

- [ ] Upload da planta pelo editor → servidor valida (PNG/JPEG/WebP, ≤ 10 MB), reescala para ≤ 2048px, converte WebP, serve em `/p/{mall}/floors/{floorId}.webp` com cache imutável por hash.
- [ ] Nunca aceitar o nome do arquivo do usuário como path (sanitizar; nome final = hash).

## 1.8 Deploy

- [ ] Subdomínio `mallway.omniasoftwares.com` (certbot, grátis): Nginx serve build Vite + `/p/` estático + proxy `/api/` → FastAPI (systemd `mallway-api`, mesmo padrão Omnia).
- [ ] `.env` com permissão 600, UMA cópia canônica (lição da higiene do servidor de 28/08 — nada de cópias world-readable espalhadas).
- [ ] logrotate configurado desde o dia 1 para os logs do mallway-api (dívida conhecida no servidor da Omnia; não repetir).
- [ ] Adicionar check do mallway no `omnia-health` existente (exit 1 em CRITICAL).

## 1.9 README

- [ ] Reescrever: remover "AR holográfica"/"tempo real estilo Waze"; descrever "navegação assistida por QR + estimativa de passos". Regra Talos: nada inventado.

**Critério de saída da Fase 1:** admin edita no PC, publica; motoboy abre QR num iPhone
no modo avião-com-wifi-ruim e navega até a loja. Rollback testado.

---

# FASE 2 — Prova de valor: telemetria + piloto Bangu (~2-3 semanas de dev + 30 dias de piloto)

Objetivo: transformar o BI cenográfico em números reais e sair do piloto com UMA frase
vendedora: "tempo médio cancela→balcão caiu de X para Y minutos".

## 2.1 A jogada mais inteligente da fase: QR no balcão

O QR da entrada marca o início. **Um QR no balcão de retirada marca o fim.** O motoboy
escaneia ao chegar ("confirmar retirada") e o delta entre os dois scans é a métrica
cancela→balcão **exata** — não estimada por passos, não autodeclarada. Esse dado:
- é o argumento de venda inteiro;
- prepara integração futura (check-in de retirada pode conversar com apps de delivery, ex. iFood);
- dá à loja um motivo para querer a placa no balcão (fila de motoboy organizada).

## 2.2 Telemetria (anônima, LGPD-clean)

```sql
events (id, mall_id, session_id, route_id NULL, type, ts, meta JSONB)
```

- Tipos: `package_loaded, route_started, qr_scanned(node), rerouted, arrived_confirmed, route_abandoned, error_beacon`.
- `session_id` aleatório gerado no device por visita, expira em 24h. **Zero PII**: sem conta, sem telefone, sem localização fora do shopping. Uma linha de aviso no app.
- Envio: `navigator.sendBeacon` com fila offline (eventos sem rede ficam no localStorage e sobem no próximo load — senão você perde exatamente os dados dos corredores sem sinal, que são os mais importantes).
- Backend: endpoint público rate-limited; aceita lote; descarta payload > 10 KB.

## 2.3 Anti-lixo nos dados (o "uso burro" aqui é estatístico)

- [ ] Rota com `isSimulating` NUNCA vira evento (o simulador é ferramenta de demo; sem isso suas métricas de venda viram fraude acidental).
- [ ] Flag `?demo=1` nos links usados em apresentação → sessão marcada e excluída.
- [ ] Desktop user-agent excluído das métricas operacionais (motoboy usa celular).
- [ ] Dedup: mesmo `session_id` + mesma rota em < 2 min conta uma vez.
- [ ] `route_abandoned` = rota iniciada sem chegada em 40 min (timeout, não evento do device).
- [ ] Mesma disciplina dos tenants de teste da Omnia: mall de teste fica fora de toda análise.

## 2.4 Dashboard real

- [ ] Substituir os números mockados do AdminPanel/Master por queries reais: tempo médio cancela→balcão (p50/p90), rotas/dia, % concluídas, top destinos, horários de pico, heatmap de arestas percorridas (contagem por aresta da rota — não precisa de posição real).
- [ ] Honestidade no vazio: com < 20 rotas no período, mostrar "amostra insuficiente" em vez de média de 3 rotas (número aleatório vira argumento contra você numa reunião).

## 2.5 Operação do piloto (Bangu)

- [ ] Gerador de placas no admin: botão "gerar placas" → PDF A4 pronto para imprimir com QR grande + código em texto + "aponte a câmera" (sem designer, sem custo).
- [ ] Caminhada de QA com o mapa publicado: percorrer as 5 rotas mais prováveis cronometrando; corrigir grafo onde o ETA errar > 30%.
- [ ] Botão "reportar problema" no app (loja fechada, mudou de lugar, placa sumiu) → tabela `feedback` → fila de triagem no admin. Lojas mudam TODO mês; sem esse loop o mapa apodrece e o produto morre de desconfiança.
- [ ] Combinar com 2-3 restaurantes âncora de alto volume de delivery para indicar a placa ao motoboy.
- [ ] 30 dias rodando; relatório antes/depois.

**Critério de saída da Fase 2:** ≥ 200 rotas reais medidas, p50 cancela→balcão com
redução documentada, feedback triado, mapa corrigido ao menos 1 vez pelo loop.

---

# FASE 3 — Pronto para vender e escalar (~3-4 semanas)

Objetivo: shopping novo entra em dias, a operação não depende da sua memória, e existe
material para fechar contrato.

## 3.1 Onboarding industrializável (o produto real é ESTE processo)

- [ ] Checklist de onboarding no admin (wizard): subir planta → calibrar escala → traçar lojas → traçar grafo → validar → caminhada de QA → gerar placas → publicar.
- [ ] Importador de lista de lojas via CSV/planilha (shopping sempre tem uma planilha do mix de lojas; digitar 180 lojas à mão no modal é tortura).
- [ ] Meta medida: planta → publicado em ≤ 3 dias de trabalho.

## 3.2 Operação gerenciada (decisão comercial inteligente)

Shopping NÃO vai manter mapa atualizado bem — assuma isso no modelo. O contrato inclui
"mapa gerenciado": atualizações a partir do feedback + revisão mensal remota. Isso vira
receita recorrente defensável e mantém a qualidade que protege a marca. O admin do
shopping ganha papel de leitura + triagem de feedback, não de edição de grafo.

## 3.3 Multi-tenant maduro

- [ ] Gestão de usuários por shopping (master cria/desativa; reset de senha por link com token de 1h — sem fluxo de e-mail robusto ainda, o master gera o link e manda por WhatsApp: zero custo, auditável).
- [ ] White-label leve: logo + cor primária do shopping no PWA (2 campos no mall, não um theming engine).
- [ ] `status: paused` → PWA mostra "manutenção" em vez de mapa desatualizado.
- [ ] Auditoria mínima: quem publicou/rollback/editou usuário, quando (tabela `audit_log` de 6 colunas).

## 3.4 Confiabilidade visível

- [ ] Relatório mensal automático por shopping: página HTML print-friendly (PDF via imprimir) com as métricas da Fase 2 — é o que justifica a fatura todo mês.
- [ ] Backup restaurável TESTADO (restore drill 1x; backup que nunca foi restaurado não é backup).
- [ ] Teste de carga simples: 200 sessões simultâneas baixando pacote + batendo telemetria (é estático + insert; a VPS aguenta, mas prove antes de prometer).

## 3.5 Kit comercial

- [ ] Case de 1 página do piloto Bangu (números reais, gráfico antes/depois).
- [ ] Proposta padrão: setup (onboarding do mapa) + mensalidade por shopping; cobrança manual Pix/boleto — gateway só quando houver ≥ 3 pagantes (mesma régua da Omnia).
- [ ] Demo pública `demo.mallway...` com mall fictício e `?demo=1` (ninguém polui métricas reais).
- [ ] Termos de uso + página de privacidade (telemetria anônima, LGPD).
- [ ] Landing page simples — pode entrar na frente futura do site institucional da Guedes Business.

**Critério de saída da Fase 3:** você consegue, sozinho, colocar um shopping novo no ar
em ≤ 3 dias, mostrar relatório mensal automático e entregar proposta no mesmo dia.

---

## O que fica explicitamente FORA (e por quê)

| Item | Por quê fora |
|---|---|
| Beacons BLE / posicionamento real | Custo em dólar + instalação física; QR + estimativa honesta resolve o caso de uso |
| AR "de verdade" (WebXR) | Esforço alto, valor marginal; setas no mapa + fotos de referência convertem mais |
| App nativo nas lojas | PWA é a tese (zero instalação); nativo só se um contrato exigir |
| Gateway de pagamento | Cobrança manual até ≥ 3 pagantes (estratégia Omnia) |
| Normalizar o mapa em tabelas SQL | JSONB versionado é mais simples e mais seguro nesta escala |
| Multi-idioma | pt-BR até existir demanda real |

## Riscos honestos

1. **Risco nº 1 não é técnico**: é o shopping não deixar instalar placas. Mitigação: começar pelos restaurantes — placa no balcão e QR no saco/comanda são dentro da loja, não precisam de autorização do shopping; a administração entra depois, vendo os números.
2. Mapa desatualizar e matar a confiança → loop de feedback (2.5) + operação gerenciada (3.2) existem exatamente para isso.
3. Fadiga de dev solo com Omnia em paralelo → fases com critério de saída claro; nunca duas fases abertas ao mesmo tempo.
