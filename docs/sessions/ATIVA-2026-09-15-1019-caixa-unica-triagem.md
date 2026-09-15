# Sessão: caixa-unica-triagem

- **Status:** 🟢 ATIVA
- **Início:** 15/09/2026 10:19 (BRT) · 13:19 UTC
- **Objetivo:** entregar a **caixa única de triagem humana** no painel — uma página que mostra,
  em sequência e SEM escolher sessão, tudo que chega de TODOS os aparelhos conectados, com
  semáforo por conversa:
  - 🔴 **vermelho** = a última mensagem é do contato → preciso responder;
  - 🟢 **verde** = a última mensagem é minha (inclusive respondida **pelo celular**,
    `fromMe=true` + `source='phone'`) → respondido;
  - 🟡 **amarelo** = marcação MANUAL "não preciso responder" (o "ok/obrigado" de fim de conversa).

  **Regra de ouro fechada com o dono (15/09):** mensagem NOVA de entrada sempre devolve a conversa
  para 🔴 — não importa se estava 🟡 ou 🟢. O amarelo vale para _aquela_ mensagem de entrada, não
  para a conversa. A cor só muda (a) ao responder ou (b) ao clicar. **Zero automação de resposta**:
  quem escreve é humano, no aparelho (o painel ganha uma caixa de resposta opcional, não é o foco).

- **Decisões do dono na abertura (15/09):**
  1. **Grupos não entram** (nem `@g.us`, nem `status@broadcast`, nem `@newsletter`).
  2. Histórico: **do zero para frente** — só o que passou pelo gateway (sem `POST /messages/sync`).
  3. Cor muda só **ao responder ou ao clicar** (ler no celular NÃO muda — o WhatsApp não nos
     entrega leitura de mensagem alheia; `message.ack` só cobre o que NÓS enviamos).
  4. Responder pelo painel: **deixar a opção**, sem ser o foco.
  5. Amarelo **não registra autor** (marca compartilhada, sem quem/quando de usuário).

- **Escopo (pode tocar):**
  - `apps/gateway/src/modules/messaging/` (domain/application/infrastructure/interface — dono de
    `wa_messages`; ganha a tabela nova `wa_conversation_triage`)
  - `apps/gateway/prisma/schema.prisma` + migration nova **aditiva** (ponto de contato global)
  - `packages/contracts` (DTOs novos — ponto de contato global)
  - `apps/dashboard/src/routes/Atendimento.tsx` (novo) + `App.tsx` (rota) + `lib/api.ts` +
    card no `Dashboard.tsx`
  - `apps/gateway/test/*.e2e-spec.ts` (novo) e specs unit no módulo messaging
  - docs: esta sessão, `SESSOES.md`, `PENDENCIAS.md`, `ARQUITETURA.md` (tabela dona nova),
    `CHANGELOG.md`, `docs/INTEGRACAO.md` se o contrato público ganhar rota

- **Fora do escopo (não tocar):**
  - `modules/sessions/infrastructure/wwebjs/` — escopo da sessão ativa `lid-envio-wwebjs`
  - engines (Baileys/wwebjs): a captura de `fromMe`/`source='phone'` **já existe** e é o que
    sustenta o verde; nada a mudar lá
  - `Inbox.tsx` atual (segue existindo como está — a página nova é adicional)
  - contrato existente de `/api` (R0): nenhuma rota/payload publicada muda; tudo é **aditivo**
  - guard-rail, campanhas, webhooks, proxies

- **Branch:** `feature/caixa-unica-triagem` (criada de `main` `7aeefa4`)

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** onda M3 concluída; produção no Dokploy novo (VPS 89.116.73.121,
  `api.conexozenvo.cloud` + `api.conexozenvo.com`), último deploy **09/09 18:15 UTC `301d42d`**
  (`BaileysEngine.shutdown()`, P-043) — main == produção, nada pendente de deploy. Ressalva viva do
  P-043: a prova cabal do shutdown vem no PRÓXIMO deploy (o container que sai já terá a correção) —
  **este deploy é esse**, então na validação eu confiro se alguma sessão gravou `STOPPED` na saída.
  Frota: contato20/contato1/ddd WORKING, contato11 em SCAN_QR (creds mortas, pré-existente), 14
  deslogadas pelo dono seguem STOPPED. Próxima onda oficial = M4 · Segurança (esta sessão é
  backlog de produto, não onda).
- **SESSOES.md:** sessão `lid-envio-wwebjs` (31/08) segue 🟢 ATIVA com escopo
  `modules/sessions/infrastructure/wwebjs/` — **disjunto do meu** (messaging + dashboard +
  contracts + schema). Não toco nenhum arquivo dela. Aviso de 18/08 (m3-qualidade) **absorvido**:
  CI exige `format:check` + `depcruise` (fronteiras como error) + suíte com coverage; teste unit é
  `src/**/*.spec.ts` (projeto vitest `unit`, roda sem infra) e não vai para o `dist`. Mantenho o
  aviso na seção 📢 (a sessão wwebjs ainda não o absorveu).
- **PENDENCIAS.md:** B-001 (proxy residencial/`WA_REQUIRE_PROXY` no Dokploy novo) e B-003 seguem
  do dono — **não bloqueiam** esta sessão (nada aqui depende de proxy/pareamento). P-023 (9º
  dígito) me toca de raspão: a busca de conversa por número já é resolvida pelo
  `candidateJids()` do `messages.controller.ts` (cobre `@s.whatsapp.net`/`@c.us` e as duas formas
  do 9) — reaproveito a função, não reescrevo. Não assumo P-xxx de outra sessão.
- **Travas absorvidas:** TS fixo 5.9.3 · forward-only em migration (correção = migration nova) ·
  jobId de BullMQ sem `:` · NUNCA `nest build` com watch · **sem Docker nesta máquina** (confirmado
  agora: `docker info` falha) → e2e roda no CI, aqui vale `test:unit` + `tsc --noEmit` + lint +
  depcruise + builds · push na main dispara deploy stop-first (janela é do dono, R0) · mudou
  payload → `packages/contracts` no MESMO commit.

## Plano

**Fase 1 — dados (messaging):**

1. `schema.prisma`: modelo novo `ConversationTriage` (`wa_conversation_triage`) —
   `sessionId + chatJid` unique, `markedKeyId` (âncora = keyId da última mensagem de ENTRADA no
   momento do clique) + `markedTimestamp`. Verde/vermelho **não** têm registro: são derivados de
   `wa_messages`.
2. Migration aditiva escrita à mão (mesmo padrão do `20260909150000`), sem `migrate dev` (sem
   Postgres local).
3. Query nova no `PrismaMessageRepository`: conversas de TODAS as sessões (sem grupos), com
   última mensagem, última mensagem de entrada, contagem de entradas pendentes, nome/foto do
   contato, nome/engine da sessão e a âncora do amarelo.
4. Derivação de cor em função PURA (`application/conversation-triage.decision.ts`) + spec unit.

**Fase 2 — API (aditiva, R0):** controller novo `inbox` (fora do prefixo
`sessions/:id/messages`, que é por sessão):

- `GET /api/inbox/conversations?status=&session=&limit=` — lista agregada com `status`
- `GET /api/inbox/messages?limit=` — fluxo cronológico recente de todos os aparelhos (carga
  inicial do feed; o tempo real vem do SSE `/api/events/stream` que já existe)
- `POST /api/inbox/triage` — `{sessionId, chatJid, state: 'ignored'|'pending'}` (amarelo / voltar
  ao vermelho)

**Fase 3 — painel:** `Atendimento.tsx` — contadores 🔴🟡🟢, filtro por aparelho e por cor, lista
com bolinha + etiqueta do aparelho, painel direito com abas **Conversa** (histórico + caixa de
resposta opcional, reusando `POST /messages/text`) e **Fluxo ao vivo** (todas as mensagens em
sequência). Tempo real pelo SSE já existente (evento `message`), com refetch de segurança.

**Fase 4 — qualidade:** spec unit da derivação + e2e do endpoint agregado e do amarelo
(volta a vermelho quando chega entrada nova) · `tsc --noEmit` · lint · format · depcruise ·
2 builds · reconciliação documental (R3) e encerramento R9.

## Progresso

- **15/09 10:19 BRT** — abertura: doc lida (ESTADO/SESSOES/PENDENCIAS + ATIVA alheia), requisitos
  fechados com o dono (5 decisões acima), branch criada de `7aeefa4`, plano em 4 fases.
- **15/09 10:35 BRT** — **Fases 1 a 4 implementadas** (aguardando merge+deploy do dono):
  - **Dados:** modelo `ConversationTriage` + migration aditiva `20260915140000_conversation_triage`
    (escrita à mão, sem `migrate dev`). Só o AMARELO é persistido; 🔴/🟢 saem de `wa_messages`.
  - **Derivação:** `application/triage-status.ts` (função pura) — 8 testes unitários cobrindo a
    regra de ouro nos dois sentidos (amarelo→vermelho e verde→vermelho) e a âncora por keyId/tempo.
  - **Leitura agregada:** `domain/inbox.repository.ts` + `infrastructure/prisma-inbox.repository.ts`
    (uma consulta: `DISTINCT ON (sessionId, chatJid)` para a última mensagem de cada conversa de cada
    aparelho + 4 LATERAL para última entrada/última saída/entradas pendentes/contato; grupo,
    transmissão e canal filtrados por sufixo de JID).
  - **API:** `interface/inbox.controller.ts` — `GET /api/inbox/conversations` (`?sessions=`,
    `?status=`, `?limit=`; devolve `{counts, conversations}`), `GET /api/inbox/messages` e
    `POST /api/inbox/sessions/:id/triage`. **Anti-atropelo** no amarelo: o painel manda o `keyId` da
    entrada que exibiu; se chegou mensagem nova antes do clique, NADA é gravado e a resposta volta
    `pending`.
  - **Painel:** `routes/Atendimento.tsx` (rota `/atendimento` + card no Dashboard) — contadores por
    cor, filtro por cor e por aparelho, lista com bolinha/etiqueta do aparelho/"há X min"/"N novas",
    abas **Conversa** (histórico + resposta opcional com idempotencyKey) e **Fluxo ao vivo**. Tempo
    real pelo SSE `/api/events/stream` já existente (debounce 800 ms) + refetch de segurança de 20 s;
    o `EventSource` NÃO reabre ao trocar de conversa (conversa aberta lida por ref).
  - **Contracts:** DTOs `Inbox*` + drift do `MessageDto` corrigido (`keyId`/`source`/`isCold` já eram
    devolvidos pelo gateway e não estavam declarados).
- **Gates locais (15/09 10:35 BRT):** `test:unit` **133/133** · `tsc --noEmit` gateway **e** dashboard
  · `eslint` limpo · `prettier --check` limpo · `depcruise` **sem violação** (207 módulos) ·
  `gateway:build` + `dashboard:build` OK (chunk `Atendimento` 12,1 kB / 4,17 kB gzip).
- **Validação do SQL sem Docker (15/09):** o e2e novo (`test/inbox-triage.e2e-spec.ts`, 16 casos) só
  roda no CI, então subi um **PostgreSQL 18.6 temporário** (Homebrew, porta 55432, cluster no
  scratchpad, derrubado depois), rodei `prisma migrate deploy` (todas as migrations aplicaram, a nova
  inclusive) e exercitei o repositório de verdade: estado inicial A=`pending`/B=`answered` com grupo
  AUSENTE · amarelo → `ignored` · entrada nova → volta a `pending` com `pendingInbound: 2` · filtro
  por aparelho · fluxo cronológico desc sem grupo · `findLastInbound` e `clearTriage` OK.
- **Pendências abertas na hora (R9):** P-044 (item do fluxo ao vivo entra sem nome do contato —
  cosmético), P-045 (sem som/notificação de 🔴 nova — decisão do dono), P-046
  (`wa_conversation_triage` fora da rotina de retenção).
- **Próximo passo (do dono):** revisar → merge → deploy. O CI precisa passar com o e2e novo (é a
  primeira execução dele em infra real). No deploy: conferir a ressalva do **P-043** (o container que
  sai já tem o `shutdown()` — nenhuma sessão deve gravar `STOPPED` na saída).
- **Doc reconciliada (R3 — mapa de gatilhos):** migration com tabela nova → `ARQUITETURA.md`
  (messaging ganhou `wa_conversation_triage` + REST `/inbox`) · rota/payload novo de `/api` →
  `packages/contracts` no MESMO commit + `INTEGRACAO.md` §13 · decisão cara de reverter (superfície
  pública + modelo de estado) → **D-019** · aviso em 📢 `SESSOES.md` (migration + rotas novas) ·
  `CHANGELOG.md` [Unreleased] · pendências P-044/P-045/P-046. **Sem env nova, sem script novo,
  sem procedimento operacional alterado** → nada em `env.example`, `CLAUDE.md` §comandos ou
  how-to/runbook. `ESTADO.md` fica para o encerramento (R9).
