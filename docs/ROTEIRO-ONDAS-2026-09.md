---
tipo: roteiro de execução
dono: Diogo Santos
criado_em: 2026-09-25
origem: pedido do dono em 25/09 — "faça todas as melhorias, 1 por chat, e no fim de cada chat me diga o que colar no próximo"
base: docs/analise-atualizacoes-2026-09.md (§12 ondas) + docs/analise-wwebjs-memoria-2026-09.md + docs/PENDENCIAS.md
status: vivo — cada chat atualiza a sua etapa ao terminar
---

# Roteiro das ondas de melhoria — 1 etapa = 1 chat

Este arquivo é o **fio condutor entre chats**. Cada chat executa UMA etapa, atualiza o quadro
abaixo e entrega ao dono a mensagem pronta da etapa seguinte (seção [Mensagens prontas](#mensagens-prontas-para-colar)).
O detalhe técnico de cada pendência está em [PENDENCIAS.md](PENDENCIAS.md) e o "onde mexer" (classe,
método, arquivo:linha) em [MAPA-CODIGO.md](MAPA-CODIGO.md) § "Onde mexer por pendência".

## Decisões do dono que valem para todas as etapas (25/09/2026)

1. **Merge = dono.** O chat abre/atualiza o PR da onda com CI verde; o dono faz o merge na main
   **📎 25/09 (D-027): todo auto-deploy do Dokploy foi desligado ("por enquanto")** — o merge na
   main não publica nada; gateway e dashboard entram em produção quando o dono clica **Deploy** no
   Dokploy, na janela que escolher. "Deploy X" nas etapas = merge + Deploy manual dos apps tocados.
2. **Um PR por onda, um commit (ou poucos) por etapa.** As etapas da mesma onda trabalham na MESMA
   branch da onda, em sequência (nunca dois chats ao mesmo tempo na mesma branch). O dono mergeia
   no fim da onda → um deploy por onda (menos janelas de risco — até o B-004 cada deploy abre as
   contas duas vezes).
3. **As duas engines ficam vivas e no melhor estado possível** ("usarei as 2 quando necessário"):
   Baileys = frota atual; wwebjs = sob demanda. A Onda 6 (wwebjs) é obrigatória e tem prazo: a build
   fixa do WA Web sai do catálogo em **13/10/2026 07:01 UTC**.
4. **P-048 — sinal duro de restrição** (463, `reachoutTimeLock`, message capping): **pausar os envios
   da sessão até o fim informado pelo WhatsApp (`timeEnforcementEnds`) + alertar**; volta sozinha.
   Não travar a sessão como `banida`.

## Quadro de etapas

Legenda: ⬜ a fazer · 🟡 em andamento · ✅ feita · ⏸️ bloqueada (ver coluna Dono).

| Etapa | Onda | Tema (pendências)                                                                                                                                                                                                                    | Branch da onda                      | Dono antes/depois                                                                   | Status   |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------- | -------- |
| E1    | 0B   | Mapa do código + roteiro + reconciliação documental (P-063) + decisões D-020..D-022                                                                                                                                                  | `feature/onda0b-mapa-roteiro`       | mergear o PR (só docs, não deploya)                                                 | ✅ 25/09 |
| E2    | 1    | Guardas de build: patch que falha quebra o build, `dist/main.js` conferido, imagem no CI (P-055)                                                                                                                                     | `feature/onda1-guardas-seguranca`   | —                                                                                   | ✅ 25/09 |
| E3    | 1    | Patches de segurança/estabilidade sem major: Nest 11.2.6, multipart 10.1.2, bullmq 5.81.5, protobufjs 7.6.6 + checagem de advisories de repositório (P-054)                                                                          | `feature/onda1-guardas-seguranca`   | —                                                                                   | ✅ 25/09 |
| E4    | 1    | Rate-limit/log/auditoria por rota real em vez de `req.url` (P-053) + bypass do egress por IPv6 v4-mapeado em hex (P-065) → fecha a Onda 1                                                                                            | `feature/onda1-guardas-seguranca`   | **merge = deploy A**; depois **B-004** (stop-first)                                 | ✅ 25/09 |
| E5    | 6    | wwebjs pronto para uso: build nova + patch estendido (`__x_id`, WID), build efetiva no log, override por sessão, LOGOUT/TOS sem QR automático, tetos (P-059) — **prazo 13/10**                                                       | `feature/onda6-wwebjs`              | depois do deploy: `WWEBJS_WEB_VERSION` canário + **B-001**                          | ⬜       |
| E6    | 6    | wwebjs leve: mídia por stream, sem auto-download de grupo, fila de mídia, teto de envio, flags do Chromium (P-060) → fecha a Onda 6                                                                                                  | `feature/onda6-wwebjs`              | **merge = deploy W** (canário com 1 chip antes da frota)                            | ⬜       |
| E7    | 2    | Baileys: mensagens recebidas durante queda/deploy deixam de ser descartadas (P-047)                                                                                                                                                  | `feature/onda2-baileys`             | —                                                                                   | ⬜       |
| E8    | 2    | Baileys: sinais nativos de restrição → pausa até o fim + alerta + evento aditivo (P-048)                                                                                                                                             | `feature/onda2-baileys`             | —                                                                                   | ⬜       |
| E9    | 2    | Baileys: tratamento por código de desconexão + política de versão do protocolo (P-049)                                                                                                                                               | `feature/onda2-baileys`             | —                                                                                   | ⬜       |
| E10   | 2    | Baileys: download de mídia com timeout e pelo proxy (P-050)                                                                                                                                                                          | `feature/onda2-baileys`             | —                                                                                   | ⬜       |
| E11   | 2    | Baileys: patch-package mínimo (#2751 Curve.verify, #2815 stream de mídia) (P-051)                                                                                                                                                    | `feature/onda2-baileys`             | teste de pareamento com chip (B-007)                                                | ⬜       |
| E12   | 2    | Baileys: pairing com guarda (409), LID do roster, caches, `countryCode` (P-052) → fecha a Onda 2                                                                                                                                     | `feature/onda2-baileys`             | **merge = deploy B**                                                                | ⬜       |
| E13   | 3    | Exclusividade de sessão entre processos: lease/fencing + auth store em transação (P-056)                                                                                                                                             | `feature/onda3-exclusividade-ritmo` | —                                                                                   | ⬜       |
| E14   | 3    | Campanhas: sem rajada ao retomar, sem FAILED no boot (P-057)                                                                                                                                                                         | `feature/onda3-exclusividade-ritmo` | —                                                                                   | ⬜       |
| E15   | 3    | Proxy com afinidade por conta (P-058) → fecha a Onda 3                                                                                                                                                                               | `feature/onda3-exclusividade-ritmo` | **merge = deploy C**; depois `WA_REQUIRE_PROXY=true` (B-001)                        | ⬜       |
| E16   | 5    | Manutenção leve: nginx pinado, Actions node24 por SHA + `ubuntu-24.04`, Node por digest, remover `ts-node`; manter e atualizar `allowScripts` (incluir fsevents, decidir puppeteer@24.38.0), minors de tooling/React (P-062 parte 1) | `feature/onda5a-manutencao`         | **merge = deploy D**                                                                | ⬜       |
| E17   | 5    | BullMQ 6 com ioredis 5 + ulid 3 (P-062 parte 2)                                                                                                                                                                                      | `feature/onda5b-bullmq6`            | **merge = deploy E**                                                                | ⬜       |
| E18   | 5    | Nest 12.1.x só no runtime + e2e de contrato do node n8n (P-062 parte 3)                                                                                                                                                              | `feature/onda5c-nest12`             | **merge = deploy F**                                                                | ⬜       |
| E19   | 5    | Vitest 5 + tsconfig pronto para TS 6 (sem subir o TS) (P-062 parte 4)                                                                                                                                                                | `feature/onda5d-vitest5`            | merge (só CI/dev)                                                                   | ⬜       |
| E20   | 7    | Métricas e regras de produto que reduzem risco: destinatários novos sem resposta em 30 dias, cota em `/contacts/check`, inventário pessoal × Business, A/B de leads Baileys × wwebjs (P-064 parte código + P-061)                    | `feature/onda7-metricas-produto`    | decisão sobre canal oficial (P-064) fica com o dono                                 | ⬜       |
| E21   | —    | Backlog anterior: triagem e execução do que ainda vale (P-001 resto, P-018, P-022, P-023, P-013, P-005, P-036, P-044..P-046 …) — pode virar mais de um chat                                                                          | definir no chat                     | —                                                                                   | ⬜       |
| E22   | 8    | Conversas fiéis — gateway: conteúdo de todos os tipos (fim do "…"), reações em tabela própria, selo de encaminhada, reply-rate com reações (P-066) + `status` no feed da caixa única (P-072)                                         | `feature/onda8-conversas`           | **antes:** decidir reação fora do evento `message` + contando no reply-rate         | ⬜       |
| E23   | 8    | Conversas fiéis — painel: balões e mídia (imagem/áudio/vídeo por blob, sem link que muda a cada 2,5 s) no Inbox e no Atendimento (P-067) + tiques ✓/✓✓ (P-072)                                                                       | `feature/onda8-conversas`           | —                                                                                   | ⬜       |
| E24   | 8    | Encaminhar — API e engines (Baileys `forward` com original guardada; wwebjs `Message.forward` com eco correlacionado) (P-068)                                                                                                        | `feature/onda8-conversas`           | **antes:** confirmar limites (5 destinos, 1 se "com frequência", só a mesma sessão) | ⬜       |
| E25   | 8    | Encaminhar — interface fiel ao WhatsApp Web (menu ⌄ → Encaminhar → seletor → ➤, selos) (P-068) → fecha a Onda 8                                                                                                                      | `feature/onda8-conversas`           | **merge = deploy G**                                                                | ⬜       |

**Ordem e porquê:** a Onda 1 vem antes de tudo porque o stop-first (B-004) só é seguro depois das
guardas de build (P-055) e porque o Nest de produção tem advisory high (P-054). A Onda 6 (wwebjs)
vem logo depois por causa do prazo de 13/10 e porque o stop-first protege o perfil do Chromium
(dois containers no mesmo perfil corrompem a sessão). As Ondas 2–3 são o grosso da estabilidade do
Baileys. A Onda 4 é só do dono (borda/infra). A Onda 5 é manutenção, um major por deploy.
**Se chegar 08/10 sem a E5 feita, pular direto para ela** (prazo da build do wwebjs).
**Tiques ✓/✓✓ no painel (pedido do dono em 25/09, depois da E4 — P-072):** decisão do dono = só exibição (o painel não manda recibo de leitura) e dentro da Onda 8 — parte gateway na E22, parte painel na E23 (mesmo balão da P-067).
**Onda 8 (pedido do dono em 25/09 — conversas fiéis ao WhatsApp Web):** entra logo depois da E4
(deploy A), antes da E5, porque é dor diária no painel; se a E4 atrasar, a E22 pode começar na branch
da Onda 1 (regra 2). Diagnóstico com causas provadas em
[analise-conversas-whatsapp-web-2026-09.md](analise-conversas-whatsapp-web-2026-09.md). "Completo em
todos os chats" depende também da E7 (P-047, recebidas durante queda/deploy) e da E10 (P-050,
download de mídia travado). Opcional depois: P-069.

## Regras de toda etapa (o chat segue sem precisar perguntar)

1. **Abertura (R9):** ler `docs/ESTADO.md`, `docs/SESSOES.md` (ativas + 📢 avisos), `docs/PENDENCIAS.md`
   (B-xxx + as P-xxx da etapa), a etapa neste roteiro e, em `docs/MAPA-CODIGO.md`, a seção da área +
   a linha da pendência em "Onde mexer". Criar `docs/sessions/ATIVA-<AAAA-MM-DD-HHMM>-<slug>.md` com
   ECO DE LEITURA e registrar a linha em `SESSOES.md`. Marcar a etapa 🟡 aqui.
2. **Branch:** a da onda (tabela). Se ainda não existe, criar a partir da `main` atualizada
   (`git fetch && git checkout main && git pull`); se o PR da etapa anterior ainda não foi mergeado,
   criar a partir da branch dele. Nunca trabalhar na `main`.
3. **Nunca adivinhar — documentation-first:** toda API de biblioteca é conferida na versão INSTALADA
   (`node_modules/...`, `npm ls <pkg>`) e na doc oficial — **Context7** (`resolve-library-id` →
   `query-docs`), espelho local `~/dioggo-agents/agentes/docs/<stack>/` quando existir, ou WebFetch
   no domínio oficial. Registrar a fonte no ATIVA. Se não achar prova, dizer "não verificado" e
   perguntar ao dono.
4. **Upstream primeiro nas etapas de engine:** antes de mexer em Baileys/wwebjs, conferir se saiu
   versão nova (`npm view @whiskeysockets/baileys dist-tags`, `npm view whatsapp-web.js dist-tags`,
   releases/issues no GitHub) — "as 2 engines atualizadas" é pedido do dono.
5. **Ferramentas:** Python para análise de dados/logs/JSON (scripts no scratchpad, não no repo);
   Workflow multi-agente para mapear/revisar (ultracode); `/code-review` ou céticos adversariais
   antes do commit de código; `gh` para PR e checks do CI.
6. **Produção é sagrada (R0):** nenhuma ação no Dokploy, nenhum envio, nenhum QR/pareamento em
   produção — descrever o passo a passo para o dono. Sem contact-check de rede no caminho de envio.
   Contrato `/api` só muda de forma aditiva; payload novo → `packages/contracts` + `docs/INTEGRACAO.md`
   no mesmo commit; o node n8n 0.4.1 só trata 423 (não introduzir 429/novos códigos de erro de uma vez).
7. **Testes (R6):** unit ao lado do código (`*.spec.ts`, roda sem infra) para lógica pura; e2e de
   efeito (`apps/gateway/test/*.e2e-spec.ts`) quando tocar webhook/evento/job/fila. Para e2e no macOS:
   `open -a Docker`, esperar o daemon, `npm run infra:up` (Postgres 5436, Redis 6382, MinIO 9000).
8. **Validação local obrigatória antes do commit:** `npm run lint` · `npm run format:check` ·
   `npm run depcruise` · `npx tsc --noEmit -p apps/gateway/tsconfig.json` · `npm run test:unit` ·
   `npm run test` (quando houver e2e/infra) · `npm run gateway:build` / `npm run dashboard:build`
   quando tocar build (NUNCA com `npm run dev` rodando).
9. **Mapa em dia:** mudou código → `node scripts/mapa-codigo.mjs` e commitar o resultado; mudou
   fluxo/relação → atualizar `docs/MAPA-CODIGO.md` (seção da área + "Onde mexer").
10. **Encerramento (R9):** ATIVA→DONE com checkpoint (BLOQUEADO EM VOCÊ, DOCS TOCADAS), linha no
    histórico do `SESSOES.md`, status em `PENDENCIAS.md`, nota em `ESTADO.md`, `CHANGELOG.md`, D-xxx em
    `DECISOES.md` se houve decisão. Commit Conventional em pt-BR → `git push` → abrir/atualizar o PR
    da onda (`gh pr create`/`gh pr edit`) → esperar o CI (`gh pr checks --watch`) verde.
11. **Fechar a etapa aqui:** marcar ✅ com data e commit, anotar ajustes que a próxima etapa precisa
    saber (seção [Diário](#diário-de-execução)), e entregar ao dono: (a) resumo do que mudou, (b) o
    que ELE precisa fazer, (c) a mensagem pronta da próxima etapa (copiar da seção abaixo e ajustar).

## Mensagens prontas para colar

Cada mensagem é curta de propósito: o detalhe está neste roteiro e no MAPA-CODIGO. Ajuste a branch
de origem se o PR anterior ainda não foi mergeado.

### E2 — guardas de build (P-055)

```text
Etapa E2 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): guardas de build — P-055.
Siga as "Regras de toda etapa" do roteiro (abertura R9, documentation-first com Context7/doc oficial, nunca adivinhar, Python quando ajudar, validação local completa, encerramento R9, PR com CI verde — o merge é meu).
Branch da onda: feature/onda1-guardas-seguranca (criar a partir da main se o PR da E1 já foi mergeado; senão, a partir de feature/onda0b-mapa-roteiro).
Objetivo: build que aplica patch errado ou gera imagem sem dist/main.js tem de FALHAR (CI e Dockerfile) — pré-requisito do stop-first (B-004). Itens: patch-package --error-on-fail; grep do marcador do patch do wwebjs nos Dockerfiles; test -f apps/gateway/dist/main.js no CI e no Dockerfile; docker build do gateway no CI (avaliar custo/tempo); runbook de rollback manual (docs/how-to) com tempo medido.
Leia no MAPA-CODIGO a seção plataforma-seguranca-build e a linha P-055. Prove que a guarda falha (patch corrompido de propósito numa cópia/branch de teste) e passa no caminho normal.
No fim: atualize o roteiro, e me dê a mensagem da E3 e a lista do que eu preciso fazer.
```

### E3 — patches de segurança sem major (P-054)

```text
Etapa E3 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-054 — @nestjs/* 11.2.6 (GHSA-9c5c-9qcx-q35q), @fastify/multipart 10.1.2, bullmq 5.81.5, protobufjs 7.6.6 + checagem periódica de advisories de REPOSITÓRIO (npm audit não enxerga).
Siga as "Regras de toda etapa". Branch: feature/onda1-guardas-seguranca (continuar da E2).
Antes de subir cada pacote: npm view <pkg> versions/peerDependencies, changelog/release notes oficiais (Context7 ou GitHub), conferir que nenhum major entra e que o override do TypeScript 5.9.3 continua valendo. NUNCA npm audit fix --force, nunca prisma@latest.
O CI já tem o job "imagens" (build do dashboard e do gateway com as guardas da P-055 + boot do container até o /health): a troca de versões tem de passar nele; localmente dá para repetir com docker build -f apps/gateway/Dockerfile . (Docker Desktop).
Provas: upload com 2 arquivos → 4xx (regressão da multipart 10.1.1); worker BullMQ volta a consumir após restart do Redis em dev (NODE_ENV=development). Script/documentação da checagem de advisories (gh api repos/<o>/<r>/security-advisories) para nestjs/nest, fastify/*, WhiskeySockets/Baileys, wwebjs, traefik, fork do MinIO, Dokploy, redis.
No fim: atualize o roteiro, e me dê a mensagem da E4 e a lista do que eu preciso fazer.
```

### E4 — rotas reais em rate-limit/log/auditoria (P-053) + egress IPv6 (P-065) — fecha a Onda 1

```text
Etapa E4 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-053 — rate-limit, autoLogging e AuditInterceptor usam req.url; trocar pela rota resolvida (req.routeOptions.url no fastify 5.11.3 instalado — conferir na doc oficial/código) com e2e das variantes (login em forma absoluta e /api/auth/%6Cogin → 429 no 11º; mutação em /%61pi/... auditada).
Na mesma etapa, P-065: o safe-fetch aceita http://[::ffff:127.0.0.1]/ (o URL normaliza para ::ffff:7f00:1 e a regex de isPrivateAddress não pega) — trocar por net.BlockList v4+v6 (doc oficial do Node: node:net BlockList) com casos novos no safe-fetch.spec.ts.
Siga as "Regras de toda etapa". Branch: feature/onda1-guardas-seguranca (continuar da E3 — PR #6). Esta etapa FECHA a Onda 1: PR com CI verde (jobs ci, imagens e advisories) + checklist de deploy A (o que conferir depois do merge) + instrução do B-004 (stop-first) para eu aplicar DEPOIS do deploy A.
Da E3 (MAPA-CODIGO §5.1 P-053): o bypass do login por forma absoluta continua no Nest 11.2.6 (PoC: x-ratelimit-limit 600 × 10); com esquema maiúsculo (HTTP://host/…) o router dá 404 e routeOptions.url fica undefined; o inject do e2e reduz a URL a origin-form — para forma absoluta use app.listen(0) + socket cru, como em apps/gateway/src/bootstrap/fastify-adapter.absolute-form.spec.ts; desde o 11.2.6 o pino-http loga request em forma absoluta com req.url absoluto.
No fim: atualize o roteiro, o PR #6, e me dê a mensagem da próxima etapa — a E22 (Onda 8, conversas fiéis ao WhatsApp Web; a mensagem já está no roteiro) ou a E5 se já for 08/10 — e a lista do que eu preciso fazer (inclua no checklist do deploy A: rodar `gh workflow run advisories.yml` na main e conferir o resumo).
```

### E5 — wwebjs pronto para uso (P-059) — prazo 13/10

```text
Etapa E5 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-059 — wwebjs pronto para uso sob demanda antes de a build fixa sair do catálogo (13/10/2026 07:01 UTC).
Siga as "Regras de toda etapa". Branch: feature/onda6-wwebjs (a partir da main se a Onda 1 já foi mergeada; senão de feature/onda1-guardas-seguranca).
Passo 0: conferir upstream (npm view whatsapp-web.js, commits do main após 1780711, issues #201921–#201930, wa-version versions.json) e a build candidata (2.3000.1046934385-alpha, anterior à quebra de mídia de ~17/09).
Itens da P-059: patch estendido (filtro de campos do mediaOptions/__x_id, fallback WID _serialized||$1, toString no MsgKey, contador de chats pulados no getChats), log da build EFETIVA (getWWebVersion) e do Chromium por sessão, override de build por sessão (canário), LOGOUT/UNPAIRED → STOPPED sem QR automático, TOS_BLOCK → FAILED com código bruto, CONFLICT sem retomar, teto de renovação do pairing code, teto de heal, zerar tentativas no start(), validar versão contra path traversal (#201930). Corrigir o comentário falso de wwebjs.engine.ts (~63-65).
Leia no MAPA-CODIGO a seção sessions (parte wwebjs) e a linha P-059. Nenhum QR/envio em produção — o canário é passo meu, descreva-o.
No fim: atualize o roteiro, e me dê a mensagem da E6 e a lista do que eu preciso fazer.
```

### E6 — wwebjs leve (P-060) — fecha a Onda 6

```text
Etapa E6 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-060 — perfil leve de memória do wwebjs (ver docs/analise-wwebjs-memoria-2026-09.md).
Siga as "Regras de toda etapa". Branch: feature/onda6-wwebjs (continuar da E5).
Itens: downloadMediaStream em blocos (conferir a API no pin 1780711 instalado), mídia de grupo sem auto-download (opt-in por env/config, sem quebrar contrato), fila de mídia por sessão, teto de envio 16–24 MB no WWEBJS, ready sem syncAddressBook após heal, kill do Chromium órfão por PID, single-flight do onAppStateHasSyncedEvent, --disable-features=SpareRendererForSitePerProcess, remover --max-semi-space-size=64 (medir), métricas por sessão. Medir antes/depois localmente (página não logada) — sem parear conta.
Esta etapa FECHA a Onda 6: PR com CI verde + roteiro do canário (1 chip) para eu executar depois do merge (deploy W).
No fim: atualize o roteiro, e me dê a mensagem da E7 e a lista do que eu preciso fazer.
```

### E22 — conversas fiéis: gateway (P-066) — abre a Onda 8

```text
Etapa E22 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-066 — conteúdo das mensagens fiel ao WhatsApp Web no gateway (fim do "…" no lugar de emoji/reação/localização/contato/enquete), reações em tabela própria e selo "Encaminhada".
Siga as "Regras de toda etapa". Branch: feature/onda8-conversas (a partir da main se a Onda 1 já foi mergeada; senão de feature/onda1-guardas-seguranca).
Leia ANTES o diagnóstico docs/analise-conversas-whatsapp-web-2026-09.md (§2 S1, §5 C1, §6, §7) e, no MAPA-CODIGO, §3.2 (mensagem recebida) e §4.2; e o Diário da E4 no roteiro (decidir por rota resolvida, nunca req.url; URL do cliente só via safeFetch). Passo 0: conferir upstream (npm view @whiskeysockets/baileys dist-tags; whatsapp-web.js).
Decisões (se eu não disser o contrário, vale a recomendação): reação sai do evento `message` (só `message.reaction`, que já existe) e passa a contar no reply-rate no MESMO deploy (GUARDRAIL_ENFORCE=true em produção); registrar como D-xxx.
Itens: describeBaileysMessage/describeWwebjsMessage puros com fixtures dos ~20 tipos; migration aditiva (wa_messages.isForwarded/forwardingScore + wa_message_reactions); ReactionPersister; GET /messages com reactions[]/isForwarded/forwardingScore (contracts + INTEGRACAO no mesmo commit); reply-rate com reações; retenção. e2e de efeito (reação grava/apaga, reply-rate). P-072 (parte gateway — tiques no painel, decisão: só exibição, sem recibo de leitura): `status` aditivo no InboxFeedItemDto de GET /api/inbox/messages (contracts + INTEGRACAO); conferir ACK de mensagem enviada pelo celular (source=phone) e o significado de `read` em grupo — registrar o achado para a E23.
No fim: atualize o roteiro e me dê a mensagem da E23 e a lista do que eu preciso fazer.
```

### E7 a E21

As mensagens das etapas seguintes seguem o mesmo molde (Etapa, pendência, "Siga as Regras de toda
etapa", branch da onda, passo 0 de upstream quando for engine, itens da pendência com os critérios
de aceite do relatório §12, "leia no MAPA-CODIGO a seção X e a linha P-0xx", "no fim: atualize o
roteiro e me dê a mensagem da próxima"). O chat que fechar a etapa anterior escreve a mensagem da
próxima aqui antes de entregá-la, já com o que aprendeu.

## Ações que só o dono pode fazer (e quando)

| Quando                      | Ação                                                                                                                                                                                                                         | Referência         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Agora                       | Mergear o PR da E1 (só docs — não faz deploy)                                                                                                                                                                                | E1                 |
| Agora (mais urgente)        | Backup do Postgres para S3 **fora da VPS** + restore testado num banco descartável                                                                                                                                           | B-005              |
| Agora                       | MinIO → imagem `pgsty/minio` pinada, fechar só o console 9001, trocar root se `minioadmin`, access key própria do gateway                                                                                                    | B-006              |
| Agora                       | Diagnóstico somente leitura (Traefik, Node/Chromium, Redis, Postgres, env, painel do Dokploy, logs desde 17/09, composição da frota, pareamento Baileys novo com chip de teste) — devolver as respostas                      | B-007              |
| Agora                       | Checklist no celular dos chips deslogados + verificação em duas etapas com e-mail + usar cada celular a cada ≤14 dias                                                                                                        | B-003              |
| Agora (fecha a Onda 1)      | Mergear o PR #5 e depois o PR #6 (= **deploy A**) e seguir o checklist de [how-to/deploy-a-onda1.md](how-to/deploy-a-onda1.md) §1–§2                                                                                         | E4 · deploy A      |
| Depois do deploy A (E4)     | Swarm Settings do gateway: Update/Rollback Config `stop-first`, StopGracePeriod 30 s, Health Check do Swarm vazio; conferir com `docker service inspect` — passo a passo em [deploy-a-onda1.md](how-to/deploy-a-onda1.md) §3 | B-004              |
| Depois do deploy A (E4)     | GitHub → Settings → Notifications → Actions: e-mail "only failures" (é o alarme da checagem diária de advisories); `gh workflow run advisories.yml` uma vez na main; rever os 7 aceites do fastify até 30/11/2026            | P-054 · D-023      |
| Depois do deploy W (E6)     | `WWEBJS_WEB_VERSION` canário em 1 sessão/chip de teste; depois `WA_REQUIRE_PROXY=true` na env                                                                                                                                | P-059 · B-001      |
| Depois do deploy B (E12)    | Observar 48 h: 405/403/440 nos logs, mensagens recebidas durante o deploy chegando no webhook                                                                                                                                | Onda 2             |
| Depois do deploy C (E15)    | Ligar `WA_REQUIRE_PROXY=true` (se ainda não) e Redeploy                                                                                                                                                                      | B-001              |
| Quando puder (Onda 4)       | Traefik → v3.7.13 (se 3.6.x) · Redis com AOF (Custom Command completo com `--requirepass`, depois do deploy A — bullmq 5.81.5; nota E3 na análise §8) · Postgres pinado na minor                                             | B-007 · análise §8 |
| Antes da E22 (Onda 8)       | Responder: reação fora do evento `message` do webhook + contando no reply-rate (recomendado) — confira se algum fluxo n8n usa o tipo `other`                                                                                 | P-066              |
| Quando puder (Onda 8)       | Checagens do diagnóstico §3: SQL só leitura dos tipos em `wa_messages` (7 dias), logs de mídia, `canPlayType` do áudio no seu navegador (Safari × Chrome)                                                                    | P-066/P-067        |
| Decisão estrutural (Onda 7) | Canal oficial/coexistência para fluxos críticos                                                                                                                                                                              | P-064              |

## Diário de execução

- **25/09 — E4 (sessão `e4-rotas-egress`):** P-053 + P-065 entregues e **Onda 1 fechada** na branch
  `feature/onda1-guardas-seguranca` (PR #6 — merge do dono = deploy A; checklist e B-004 em
  [how-to/deploy-a-onda1.md](how-to/deploy-a-onda1.md)). Achados da investigação/revisão viraram
  **P-070** (fotos por URL com `fetch` cru — corrigida) e **P-071** (forma absoluta com `?` antes do
  caminho — 400 na borda). O que as próximas etapas precisam saber: (1) decidir por rota =
  `request.routeOptions.url` (FastifyRequest) ou `routeUrlOf(req)` (IncomingMessage, carimbo do
  `buildFastifyAdapter`) — nunca `req.url`; (2) teto por rota = `@RouteConfig({ rateLimit })` (store
  próprio — D-025); registrar plugins de rota SEMPRE antes do init (depois não dá erro e não vale);
  (3) URL vinda do cliente = `safeFetch`/`fetchImageByUrl` (grep `fetch(` antes de criar rota nova);
  **nunca** regra IPv6 com `::ffff:0:0/96` na BlockList (bloqueia todo IPv4 — D-026); (4) as opções do
  request-log estão em `bootstrap/http-logger.ts` (o spec usa a função real); (5) o 404 nunca passa
  pelo middleware do pino-http (pré-existente); (6) o `inject` preserva `%xx` mas não a forma
  absoluta — specs de borda usam socket cru (`rate-limit.spec.ts`, `audit.interceptor.spec.ts`).
  E22 em diante: a Onda 8 mexe em `messages.controller.ts`/engines — a auditoria continua excluindo
  as rotas de `/messages` (catálogo explícito = P-036).
- **25/09 — E3 (sessão `e3-patches-seguranca`):** P-054 entregue na branch
  `feature/onda1-guardas-seguranca` (PR #6, merge no fim da E4). O que a E4 e as seguintes precisam
  saber: (1) Nest 11.2.6 trocou o clone `fastify-middie.js` pelo `@fastify/middie` 9.3.4 — citações
  antigas no MAPA-CODIGO têm nota; (2) `POST /messages/media` lê o corpo todo antes do envio (2+
  arquivos = 413, D-024) e 4xx estilo http-errors não gera mais `ERROR [ExceptionsHandler]`; (3) novo
  workflow `advisories.yml` (diário; em PR só roda quando muda o lockfile ou o próprio script) — quem
  subir dependência de runtime nova adiciona o repo em `scripts/checar-advisories.config.json`;
  aceite é decisão do dono (D-023); (4) `allowScripts` NÃO é inerte (npm ≥ 11.16 do CI/Docker) — a
  E16 deve mantê-lo e atualizá-lo; (5) a premissa "multipart 10.1.2 corrige 2 arquivos" era falsa
  (vira 201 com descarte calado) e a da bullmq era imprecisa (o fix é o Worker em conexão half-open;
  restart do Redis já se recuperava) — conferir o mecanismo no tarball antes de aceitar a frase da
  análise; (6) o Dockerfile do gateway fixa `node:26.10.0-bookworm-slim` e a checagem avalia o
  undici desse Node + releases de segurança da linha — subir o Node = trocar os DOIS `FROM`.
- **25/09 — E2 (sessão `e2-guardas-build`, mesmo chat da E1):** P-055 entregue na branch
  `feature/onda1-guardas-seguranca` (PR da Onda 1 aberto; merge só no fim da E4). O que a E3/E4 precisa
  saber: o CI agora tem o job **`imagens`** (build do dashboard e do gateway + smoke `/health`) — mudança
  de dependência que quebre a imagem aparece ali; o postinstall usa `--error-on-fail`; a guarda `deps`
  carrega todos os pacotes do dist (se a E3 trocar algum pacote por ESM-only, ela acusa). A revisão
  adversarial pegou um bloqueante real (build do dashboard no Dokploy) que o CI antigo não via.
- **25/09 — E1 (sessão `onda0b-mapa-roteiro`):** criado este roteiro; mapa do código gerado
  (`scripts/mapa-codigo.mjs` → `docs/reference/mapa-codigo/`) e mapa de relações
  (`docs/MAPA-CODIGO.md`); reconciliação P-063 nas docs; decisões do dono registradas (acima).
  Verificação adversarial do mapa: 1.049 afirmações conferidas no código, 85 correções antes da
  síntese. Achados que as próximas etapas PRECISAM saber (detalhe em MAPA-CODIGO §5.1):
  - **P-065 nova (segurança):** bypass do egress por IPv6 v4-mapeado em hex → entrou na E4.
  - **E7/P-047:** a rc14 reemite TODO envio nosso como `messages.upsert` `append` (eco,
    `emitOwnEvents` default true) — aceitar `append` sem filtrar o eco duplica mensagens e marca
    nossa reação como `source=phone`; reações recebidas hoje viram `message` type `other`.
  - **E12/P-052:** a guarda do pairing deve olhar `creds.me` + status, não `creds.registered` (só
    vira true no fluxo de pairing code).
  - **E11/P-051:** `Curve.verify` também é usado no handshake Noise (certificado do servidor), não só
    no pair-success.
  - **E8/P-048:** `canSendCold` cobre API e campanhas mas só o envio cold — a pausa geral (D-022)
    precisa ficar no `SessionManager`; `GuardrailModule` não importa `SessionsModule` (sem ciclo).
  - **CI:** o quay.io da MinIO passou a responder 401 e quebrou o CI; dev/CI já foram trocados para
    `pgsty/minio`/`pgsty/mc` nesta etapa (331/331 testes verdes local). O fork virou `pgsty/silo`.
  - **Cobrança Meta:** "serviço pago desde 01/10/2026" NÃO se confirmou na doc oficial (nota na
    análise §9 e na P-064).
