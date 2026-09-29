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

## Decisões do dono que valem para todas as etapas (25–26/09/2026)

1. **Merge ao fim da etapa:** em 26/09, o dono instruiu “faça merge sempre ao fim”.
   Ao concluir a etapa com revisão e CI verde, o assistente integra o PR na `main`.
   **📎 25/09 (D-027): auto-deploy do Dokploy consta desligado ("por enquanto")** — o merge
   não é prova de publicação; gateway e dashboard entram em produção quando o dono faz
   **Deploy** na janela escolhida. O toggle não foi conferido ao vivo nesta sessão.
   Os merges #7, #8, #10, #11 e #13 tiveram autorização específica em 26/09, sem Deploy.
2. **Um PR por etapa a partir da E11.** Etapas já agrupadas mantêm seu histórico: E7–E10
   foram integradas pelo PR #11. A E11/P-051 usa `feature/onda2-baileys-e11-e12`, criada de
   `origin/main=960471e`, no PR #15. Com o merge desse PR ao fim da E11, a E12/P-052
   começou de `origin/main=119635c` em `feature/onda2-baileys-e12` e abriu o PR #16.
   O deploy B manual e o canário continuam depois da E12 e da integração de seu PR.
3. **As duas engines ficam vivas e no melhor estado possível** ("usarei as 2 quando necessário"):
   Baileys = frota atual; wwebjs = sob demanda. A Onda 6 (wwebjs) é obrigatória e tem prazo: a build
   fixa do WA Web sai do catálogo em **13/10/2026 07:01 UTC**.
4. **P-048 — sinal duro de restrição** (463, `reachoutTimeLock`, message capping): **pausar os envios
   da sessão até o fim informado pelo WhatsApp (`timeEnforcementEnds`) + alertar**; volta sozinha.
   Não travar a sessão como `banida`.

## Quadro de etapas

Legenda: ⬜ a fazer · 🟡 em andamento · ✅ feita · ⏸️ bloqueada (ver coluna Dono).

| Etapa | Onda | Tema (pendências)                                                                                                                                                                                                                    | Branch da onda                    | Dono antes/depois                                                                                                                                                  | Status                    |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| E1    | 0B   | Mapa do código + roteiro + reconciliação documental (P-063) + decisões D-020..D-022                                                                                                                                                  | `feature/onda0b-mapa-roteiro`     | mergear o PR (só docs, não deploya)                                                                                                                                | ✅ 25/09                  |
| E2    | 1    | Guardas de build: patch que falha quebra o build, `dist/main.js` conferido, imagem no CI (P-055)                                                                                                                                     | `feature/onda1-guardas-seguranca` | —                                                                                                                                                                  | ✅ 25/09                  |
| E3    | 1    | Patches de segurança/estabilidade sem major: Nest 11.2.6, multipart 10.1.2, bullmq 5.81.5, protobufjs 7.6.6 + checagem de advisories de repositório (P-054)                                                                          | `feature/onda1-guardas-seguranca` | —                                                                                                                                                                  | ✅ 25/09                  |
| E4    | 1    | Rate-limit/log/auditoria por rota real em vez de `req.url` (P-053) + bypass do egress por IPv6 v4-mapeado em hex (P-065) → fecha a Onda 1                                                                                            | `feature/onda1-guardas-seguranca` | PR #6 mergeado; **deploy A manual** pendente; depois B-004                                                                                                         | ✅ 25/09                  |
| E5    | 6    | wwebjs pronto para canário: build candidata + patch estendido (`__x_id`, WID), build efetiva no log, override por sessão, LOGOUT/TOS sem QR automático, tetos (P-059) — **prazo 13/10**                                              | `feature/onda6-wwebjs`            | PR #8 mergeado; canário por sessão após deploy W + **B-001**                                                                                                       | ✅ 26/09                  |
| E6    | 6    | wwebjs leve: mídia por stream, sem auto-download de grupo, fila de mídia, teto de envio, flags do Chromium (P-060) → fecha a Onda 6                                                                                                  | `feature/onda6-wwebjs`            | PR #10 mergeado `d577b05`; **deploy W manual** pendente (1 chip antes da frota)                                                                                    | ✅ 26/09                  |
| E7    | 2    | Baileys: mensagens recebidas durante queda/deploy deixam de ser descartadas (P-047)                                                                                                                                                  | `feature/onda2-baileys`           | PR #11 mergeado `8291c17`; sem deploy B                                                                                                                            | ✅ 26/09                  |
| E8    | 2    | Baileys: sinais nativos de restrição → pausa até o fim + alerta + evento aditivo (P-048)                                                                                                                                             | `feature/onda2-baileys`           | —                                                                                                                                                                  | ✅ 26/09 · 8b513c5        |
| E9    | 2    | Baileys: tratamento por código de desconexão + política de versão do protocolo (P-049)                                                                                                                                               | `feature/onda2-baileys`           | PR #11 mergeado `8291c17`; sem deploy B; canário após E12                                                                                                          | ✅ 26/09 · 7c0441c        |
| E10   | 2    | Baileys: download de mídia com timeout, proxy e reupload (P-050/P-075)                                                                                                                                                               | `feature/onda2-baileys`           | PR #11 mergeado `8291c17`; sem deploy B; canário após E12                                                                                                          | ✅ 26/09 · b489b21        |
| E11   | 2    | Baileys rc14: patch mínimo de Curve.verify e domainType (#2751), stream de mídia (#2716; #2815 duplicado), P-051                                                                                                                     | `feature/onda2-baileys-e11-e12`   | PR #15; merge ao encerrar esta etapa; sem deploy B                                                                                                                 | ✅ 26/09 · 9e82ec7        |
| E12   | 2    | Baileys: pairing com guarda (409), LID do roster, caches, `countryCode` (P-052) → fecha a Onda 2                                                                                                                                     | `feature/onda2-baileys-e12`       | PR #16; merge após CI verde; depois **deploy B manual**                                                                                                            | ✅ código 26/09           |
| E13   | 3    | Exclusividade de sessão entre processos: lease/fencing + auth store em transação (P-056)                                                                                                                                             | `feature/onda3-e13-exclusividade` | PR #19 mergeado; sem deploy C                                                                                                                                      | ✅ 27/09                  |
| E14   | 3    | Campanhas: sem rajada ao retomar, sem FAILED no boot (P-057)                                                                                                                                                                         | `feature/onda3-e14-campanhas`     | PR #20 mergeado `b56ff27`; sem deploy C                                                                                                                            | ✅ código 29/09 · cfc2976 |
| E15   | 3    | Proxy com afinidade por conta (P-058) → fecha a Onda 3                                                                                                                                                                               | `feature/onda3-e15-proxy`         | PR #21; **deploy C manual** pelo runbook, B-001 depois                                                                                                             | ✅ 29/09 · 0cf2cd4        |
| E16   | 5    | Manutenção leve: nginx pinado, Actions node24 por SHA + `ubuntu-24.04`, Node por digest, remover `ts-node`; manter e atualizar `allowScripts` (incluir fsevents, decidir puppeteer@24.38.0), minors de tooling/React (P-062 parte 1) | `feature/onda5a-manutencao`       | PR #22 mergeado `7d547fc`; **deploy D manual** depois                                                                                                              | ✅ 29/09 · ce7ada0        |
| E17   | 5    | BullMQ 6 com ioredis 5 + ulid 3 (P-062 parte 2)                                                                                                                                                                                      | `feature/onda5b-bullmq6`          | PR #23; merge ao fim; **deploy E manual** depois                                                                                                                   | ✅ código 29/09 · bd4e699 |
| E18   | 5    | Nest 12.1.x só no runtime + e2e de contrato do node n8n (P-062 parte 3)                                                                                                                                                              | `feature/onda5c-nest12`           | merge ao fim; **deploy F manual** depois                                                                                                                           | ✅ 29/09 (D-044)          |
| E19   | 5    | Vitest 5 + tsconfig pronto para TS 6 (sem subir o TS) (P-062 parte 4)                                                                                                                                                                | `feature/onda5d-vitest5`          | merge (só CI/dev)                                                                                                                                                  | ✅ código 29/09 · D-045   |
| E20   | 7    | Métricas e regras de produto que reduzem risco: destinatários novos sem resposta em 30 dias, cota em `/contacts/check`, inventário pessoal × Business, A/B de leads Baileys × wwebjs (P-064 parte código + P-061)                    | `feature/onda7-metricas-produto`  | decisão sobre canal oficial (P-064) fica com o dono                                                                                                                | ⬜                        |
| E21   | —    | Backlog anterior: triagem e execução do que ainda vale (P-001 resto, P-018, P-022, P-023, P-013, P-005, P-036, P-044..P-046 …) — pode virar mais de um chat                                                                          | definir no chat                   | —                                                                                                                                                                  | ⬜                        |
| E22   | 8    | Conversas fiéis — gateway: conteúdo de todos os tipos (fim do "…"), reações em tabela própria, selo de encaminhada, reply-rate com reações (P-066) + `status` no feed da caixa única (P-072)                                         | `feature/onda8-conversas`         | **antes:** decidir reação fora do evento `message` + contando no reply-rate                                                                                        | ✅ 25/09                  |
| E23   | 8    | Conversas fiéis — painel: balões e mídia (imagem/áudio/vídeo por blob, sem link que muda a cada 2,5 s) no Inbox e no Atendimento (P-067) + tiques ✓/✓✓ (P-072)                                                                       | `feature/onda8-conversas`         | **antes:** decidir P-074 (decidido: entra)                                                                                                                         | ✅ 25/09                  |
| E24   | 8    | Encaminhar — API e engines (Baileys `forward` com original guardada; wwebjs `Message.forward` com eco correlacionado) (P-068)                                                                                                        | `feature/onda8-conversas`         | **antes:** confirmar limites (5 destinos, 1 se "com frequência", só a mesma sessão)                                                                                | ✅ 26/09                  |
| E25   | 8    | Encaminhar — interface fiel ao WhatsApp Web (menu ⌄ → Encaminhar → seletor → ➤, selos) (P-068) → fecha a Onda 8                                                                                                                      | `feature/onda8-conversas`         | PR #7 mergeado; **deploy G manual pendente**                                                                                                                       | ✅ 26/09                  |
| E26   | 9    | Sugerir o proxy da sessão apagada ao recriar uma sessão com o mesmo nome — sugere, não bloqueia (P-084, pedido do dono em 26/09)                                                                                                     | `feature/onda9-proxy-sugestao`    | merge ao fim; deploy manual posterior (migration aditiva pequena)                                                                                                  | ✅ 27/09 · 036f333        |
| E27   | 9    | Link público temporário para conectar uma sessão por QR de outro local — expira ao conectar, prazo máximo, revogação, token opaco (P-086) + filtro de sessões por nome/status/número (P-089), pedidos do dono em 26–27/09            | `feature/onda9-link-conexao-qr`   | merge ao fim; **deploy manual dos 2 apps** (gateway antes do painel; migration aditiva) + aceite com chip ([how-to/link-conexao-qr.md](how-to/link-conexao-qr.md)) | ✅ 27/09 · 27a7dee        |

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
**Onda 9 — E27 (pedidos do dono em 26–27/09 — P-086 + P-089):** link público para conectar uma
sessão Baileys por QR de outro lugar + filtro da tela de Sessões; feita em 27/09 antes da E26, a pedido
do dono. Política na D-037.
**Onda 9 — E26 (pedido do dono em 26/09, no chat da E25 — P-084):** sugerir o proxy da sessão apagada
ao recriar com o mesmo nome. Independente das outras ondas (proxies + sessões + painel, migration
aditiva pequena), 1 chat; entra depois da E5 por causa do prazo de 13/10 — ou antes, se o dono pedir.

## Regras de toda etapa (o chat segue sem precisar perguntar)

1. **Abertura (R9):** ler `docs/ESTADO.md`, `docs/SESSOES.md` (ativas + 📢 avisos), `docs/PENDENCIAS.md`
   (B-xxx + as P-xxx da etapa), a etapa neste roteiro e, em `docs/MAPA-CODIGO.md`, a seção da área +
   a linha da pendência em "Onde mexer". Criar `docs/sessions/ATIVA-<AAAA-MM-DD-HHMM>-<slug>.md` com
   ECO DE LEITURA e registrar a linha em `SESSOES.md`. Marcar a etapa 🟡 aqui.
2. **Branch:** a da etapa (tabela). Criar a partir da `origin/main` atualizada; após o
   merge da etapa anterior, abrir branch e PR novos. Nunca trabalhar na `main`.
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
    da etapa (`gh pr create`/`gh pr edit`) → esperar o CI (`gh pr checks --watch`) verde →
    fazer o merge ao fim. Deploy manual fica na janela operacional do dono.
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
Siga as "Regras de toda etapa". Branch: feature/onda6-wwebjs — a partir da main se o PR #7 (Onda 8) já foi mergeado; senão a partir de feature/onda8-conversas (a E24 mexeu no wwebjs.engine.ts: encaminhar nativo, ForwardEchoRegistry, withLidFallback — partir da main antiga geraria conflito). Inclua a P-073 (teste instável do wwebjs no CI).
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

### E7 — Baileys: recebidas durante queda/deploy (P-047) — abre a Onda 2

```text
Execute a E7 do ConexoZenvo: mensagens recebidas durante queda, reconexão ou deploy devem chegar ao webhook, Inbox e reply-rate (P-047), conforme docs/ROTEIRO-ONDAS-2026-09.md e docs/PENDENCIAS.md.

Siga a leitura obrigatória do AGENTS.md/R9, abra uma sessão própria e trabalhe na branch feature/onda2-baileys a partir da main atualizada (ou da feature/onda6-wwebjs se o PR #10 ainda não tiver sido mergeado, conforme a regra 2 do roteiro). Preserve os arquivos locais não versionados. Antes de usar APIs, confira o Baileys instalado (rc14) e a documentação oficial; leia docs/MAPA-CODIGO.md §3.2/§5.1 P-047, os avisos da E22/E24 e docs/INTEGRACAO.md §3.2.

Corrija o descarte de messages.upsert type=append com decisão por mensagem: janela 24–48 h, sem eco dos nossos envios, sem newsletter/status, dedupe por sessão+keyId inclusive após restart. Preserve describeBaileysMessage, reação fora de message, remetente de grupo e raw inbound do encaminhar. Se acrescentar campo público de histórico/offline, atualize packages/contracts e INTEGRACAO no mesmo commit. Use migration somente forward-only se necessária. Teste o efeito no banco, webhook, Inbox e reply-rate, com lote misto notify/append/eco/reação e chave repetida; não conecte conta, não envie mensagem real e não faça deploy.

Entregue código, testes, documentação e PR da Onda 2 para a main com CI verde. No fim, atualize o roteiro e o runbook do próximo canário, informe o que ficou pendente e a mensagem pronta da E8. O merge e o deploy ficam para outra ordem/janela.
```

### E8 — Baileys: sinais nativos de restrição (P-048)

```text
Execute a E8 do ConexoZenvo (P-048): sinais nativos de restrição do Baileys devem pausar os envios da sessão até `timeEnforcementEnds` e alertar, voltando sozinhos ao fim (D-022). Continue em feature/onda2-baileys, branch do PR da Onda 2; não faça merge nem deploy. Siga AGENTS.md/R9 e as Regras de toda etapa em docs/ROTEIRO-ONDAS-2026-09.md.

Leia a sessão DONE da E7, docs/PENDENCIAS.md P-048, docs/MAPA-CODIGO.md §5.1 P-048, os avisos da E22–E24 e docs/INTEGRACAO.md. Confira primeiro o Baileys rc14 instalado e a documentação oficial; veja se saiu versão nova. Preserve o gate por mensagem de `messages.upsert` da E7, a reação fora de `message`, o remetente de grupo e o raw inbound do encaminhar.

Ligue `reachoutTimeLock`, `message-capping.update` e `messages.update` ERROR 463 ao `recordHardSignal`; consulte `fetchAccountReachoutTimelock()` com limite/timeout para obter `timeEnforcementEnds`, conte 479 e publique evento aditivo. A pausa deve cobrir os envios da sessão no `SessionManager` sem ciclo de módulos; o node n8n atual só trata 423. Contrato/payload novo exige packages/contracts e INTEGRACAO no mesmo commit. Prove com unit e e2e de efeito a pausa, alerta, retomada automática, ausência de bloqueio permanente e não regressão dos envios normais. Sem conta, envio real ou deploy. Atualize roteiro, mapa, runbook e PR com CI verde; entregue a mensagem da E9.
```

### E9 — Baileys: desconexão e versão do protocolo (P-049)

```text
Execute a E9 do ConexoZenvo (P-049) na branch feature/onda2-baileys e no PR #11, sem merge nem deploy. Siga AGENTS.md/R9 e as Regras de toda etapa do roteiro. Leia a sessão DONE da E8, P-049 em PENDENCIAS e MAPA-CODIGO §5.1, D-022 e INTEGRACAO. Confirme as versões instaladas e a documentação oficial do Baileys antes de mudar APIs.

Trate os códigos de desconexão 401/403/405/408/411/428/440/500/503/515 conforme a matriz P-049: 515 não gasta tentativa, 405 alerta client_too_old, 403/411 ficam terminais, 440 tem no máximo uma retentativa tardia até P-056. Preserve stopped/connectGeneration e a pausa E8/P-048, inclusive `connection.update` provisório (`source=temporary`) e a confirmação do prazo só pela resposta direta do RPC. Exponha lastError {code,reason} de forma aditiva e métrica wa_disconnects_total{engine,code}. Na política de versão, limite a consulta, não cacheie isLatest:false como versão fresca, registre a versão por conexão e permita override por env para canário. Cubra classificação, retentativas, alerta, métrica e regressão com unit/e2e sem conta, mensagem real ou deploy. Contratos e INTEGRACAO no mesmo commit se mudar payload; atualize mapa, roteiro, runbook, PR e entregue a mensagem da E10 com CI verde.
```

### E10 — Baileys: mídia recebida com teto, proxy e reupload (P-050/P-075)

```text
Execute a E10 do ConexoZenvo (P-050 e P-075) na branch feature/onda2-baileys e no PR #11, sem merge nem deploy. Siga AGENTS.md/R9 e as Regras de toda etapa do roteiro. Leia os DONE da E8 e E9, P-050/P-075 em PENDENCIAS, MAPA-CODIGO §5.1, INTEGRACAO e o runbook do canário. Confirme as versões instaladas e a documentação oficial da rc14 e do undici da versão do Node antes de mudar APIs.

No download de mídia recebida, limite a espera a 60–120 s e preserve o fallback sem binário. A rc14 não usa `fetchAgent` no download: passe um `dispatcher` undici pelo proxy HTTP/HTTPS da sessão, sem prometer SOCKS antes de prova. Em 404/410 da CDN, use `sock.updateMediaMessage` com teto para pedir reupload e tente baixar de novo; cubra vídeo redondo `ptvMessage`. Corrija o comentário de `fetchAgent` e teste stream pendurado, proxy, falha e reupload com socket/fetch falsos. Preserve a dedupe E7, a pausa E8 e a matriz/versão E9. Sem conta, mídia ou mensagem real. Atualize contratos/INTEGRACAO se payload mudar, mapa, roteiro, runbook e PR; entregue a mensagem da E11 com CI verde.
```

### E11 — Baileys: patch mínimo da rc14 (P-051)

```text
Execute a E11 do ConexoZenvo (P-051) em nova branch feature/onda2-baileys-e11-e12 criada da origin/main atualizada (merge #11 em 8291c17), com novo PR para main; não reutilize o PR #11 já mergeado. Sem merge nem deploy nesta etapa. Siga AGENTS.md/R9 e as Regras de toda etapa do roteiro. Leia o DONE da E10, P-051/P-087 em PENDENCIAS, MAPA-CODIGO §5.1 (P-051), o diário da E10 e o runbook do canário. Confirme a versão instalada da rc14, as fontes oficiais dos PRs #2751/#2815 e o código instalado ANTES de aplicar patch-package.

Faça o patch mínimo no JS compilado para Curve.verify rejeitar assinatura inválida de 64 bytes e para a falha de stream de mídia coberta pelo #2815, sem copiar mudanças extras. Só inclua domainType hosted se a fonte oficial e o caso instalado confirmarem a necessidade. #2789, #2765 e #2781 dependem de reprodução concreta; não aplique por precaução. Prove Curve.verify com a lib real, sem mock, com assinatura inválida e válida; teste o stream com fixture sintética. Confirme postinstall --error-on-fail, guardas de patch e ambos os Dockerfiles/builds. Preserve E7–E10 e o contrato público; avalie P-087 separadamente, sem declarar que o patch cancelou o listener se não houver prova.

Sem conta, QR em aparelho, mídia ou mensagem real. Pareamento/reconexão e saída real por proxy permanecem no canário do dono após E12, merge do novo PR e deploy B manual. Atualize mapa, roteiro, runbook, novo PR e docs pelo R3; entregue a mensagem da E12 com CI verde.
```

### E12 — Baileys: pairing, LID e caches (P-052) — fecha a Onda 2 em código

```text
Execute a E12/P-052 do ConexoZenvo em nova branch feature/onda2-baileys-e12 criada da origin/main atualizada, após o merge do PR #15 da E11, e abra um PR novo para main. Siga AGENTS.md/R9 e as Regras de toda etapa do roteiro. Leia o DONE da E11, P-052/P-087 em PENDENCIAS, MAPA-CODIGO §5.1, os avisos em SESSOES e o runbook do canário. Confirme a rc14 instalada e a documentação/código oficial antes de alterar APIs.

Proteja requestPairingCode: sessão WORKING ou com sock.user/creds.me deve responder 409 sem chamar a lib; creds.registered sozinho não detecta QR já pareado. Troque o sleep fixo por espera limitada de connecting ou primeiro QR. Corrija o roster LID usando phoneNumber (e o par PN↔LID), com fallback somente no lidMapping local e JID normalizado, sem consulta de existência na rede. Avalie caches de retry/devices com métrica antes de externalizar; conte pre-keys por sessão e configure countryCode BR apenas como coerência, sem alegar efeito anti-ban. Cubra 409, espera, roster e regressões com socket/DB sintéticos.

Preserve E7–E11, os dois patches, a pausa E8, a matriz E9, o teto/proxy/reupload E10 e o contrato público; mude contracts/INTEGRACAO no mesmo commit se mudar payload. P-087 continua separada. Atualize docs, runbook e o novo PR; valide postinstall, guardas, ambos os Dockerfiles e CI. Sem conta, QR em aparelho, mídia ou mensagem real. Com CI verde, faça merge do PR da E12 ao fim do chat; não faça deploy. Deploy B manual e pareamento/reconexão/saída real pelo proxy no canário posterior dependem da janela do dono. Entregue o checkpoint da Onda 2 e as ações do dono.
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

### E23 — conversas fiéis: painel (P-067 + P-072 parte painel)

```text
Etapa E23 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-067 — balões e mídia no painel (Inbox e Atendimento) fiéis ao WhatsApp Web + P-072 parte painel (tiques ✓/✓✓, só exibição — o painel NÃO manda recibo de leitura).
Siga as "Regras de toda etapa". Branch: feature/onda8-conversas (continuar da E22 — mesmo PR da Onda 8, sem merge).
LEIA ANTES: docs/analise-conversas-whatsapp-web-2026-09.md (§2 S2–S5, §5 C2, §7); docs/INTEGRACAO.md §3.2 (tipos novos: location/contact/poll/event/group_invite/poll_vote/other com resumo), §12 (reactions[], isForwarded, forwardingScore) e §13 (status do feed = ACK); em docs/PENDENCIAS.md a P-067, os 7 achados da E22 na P-072 e a P-074; o Diário da E22 no roteiro; MAPA-CODIGO §4.5 (dashboard).
Itens: components/chat/MessageBubble.tsx + MediaView.tsx compartilhados por Inbox e Atendimento; lib/message-format.ts (rótulo/ícone por type, prévia da lista sem "…", fallback "Mensagem não suportada — veja no celular", link do mapa clicável); mídia baixada pelo gateway como blob (fetch com cookie + refresh de login → object URL em cache por mensagem, liberado ao desmontar; imagem ao aparecer na tela, áudio/vídeo no clique) — resolve o helmet CORP same-origin, a falta de Range e a URL pré-assinada que muda a cada 2,5 s; "Baixar" quando o navegador não toca Ogg/Opus; selos de reação (reactions[]) e "↪ Encaminhada"/"↪↪ Encaminhada com frequência" (forwardingScore ≥ 5); tiques só em fromMe (null = sem confirmação; grupo sem tique — o Baileys não grava ACK de grupo); Atendimento passa a ouvir message.ack e message.reaction no SSE (casar por keyId, nunca por chatJid).
Decisão do dono na abertura: P-074 (remetente de mensagem de grupo = jid do grupo nas 2 engines) entra nesta etapa (muda o valor de senderJid no webhook em grupo) ou fica para depois.
Testes: vitest em ambiente node para lib/*; validação manual no Chrome e no Safari com seed local (mensagens + objetos no MinIO de dev) — nada em produção.
No fim: atualize o roteiro, o PR da Onda 8, e me dê a mensagem da E24 (ou da E5, se já for 08/10 — prazo da build do wwebjs: 13/10) e a lista do que eu preciso fazer.
```

### E24 — encaminhar: API e engines (P-068)

```text
Etapa E24 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-068 parte API/engines — encaminhar mensagem fiel ao WhatsApp Web (Baileys `forward` com a original guardada; wwebjs `Message.forward` com o eco correlacionado).
Siga as "Regras de toda etapa". Branch: feature/onda8-conversas (continuar da E23 — mesmo PR #7 da Onda 8, sem merge).
LEIA ANTES: docs/analise-conversas-whatsapp-web-2026-09.md §4 (API proposta, pré-requisitos, riscos) e §7; em docs/PENDENCIAS.md a P-068 e a P-077 (ecos de localização/enquete sem o conteúdo completo — decidir se entra junto, porque mexe no mesmo emitOutbound); docs/INTEGRACAO.md §2 (cold + idempotência), §3.2 (selo Encaminhada, senderJid de grupo desde a E23) e §12; MAPA-CODIGO §3.1 (envio) e §4.1/§4.2; o Diário da E23 no roteiro; D-028 e D-029.
Decisão do dono na abertura: confirmar os limites — até 5 destinos por vez, só 1 se a original já é "encaminhada com frequência" (forwardingScore ≥ 5), só a MESMA sessão, destino sem conversa = cold com a trava 423, idempotencyKey por destino.
Passo 0: upstream (npm view @whiskeysockets/baileys dist-tags; whatsapp-web.js) e conferir no código instalado generateForwardMessageContent/`forward` (Baileys rc14) e Message.forward/getMessageById (wwebjs 1.34.7).
Itens: guardar a original das RECEBIDAS no Baileys (o webhook e o SSE já tiram o `raw`) ou remontar do banco/S3; IEngine.forwardMessage nas 2 engines; SessionManager.forwardMessage pelo sendWithIntent (um destino por vez, intervalo 1–3 s); rota aditiva POST /api/sessions/:s/messages/:msgId/forward {to[], cold?, idempotencyKey?} → {results[]}; eco com isForwarded/forwardingScore; no wwebjs, correlacionar o eco para não virar handoff (source=phone). Contracts + INTEGRACAO no mesmo commit. e2e de efeito (>5 → 400, cold em quarentena → 423, mensagem desconhecida → 404, repetição dedupada, eco sem handoff).
Nada em produção — nenhum envio real; o teste com chip é passo meu, descreva-o.
No fim: atualize o roteiro, o PR da Onda 8, e me dê a mensagem da E25 (ou da E5, se já for 08/10 — prazo da build do wwebjs: 13/10) e a lista do que eu preciso fazer.
```

### E25 — encaminhar: interface (P-068) — fecha a Onda 8

```text
Etapa E25 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-068 parte interface — encaminhar fiel ao WhatsApp Web no painel (Inbox e Atendimento). ESTA ETAPA FECHA A ONDA 8 (merge = deploy G).
Siga as "Regras de toda etapa". Branch: feature/onda8-conversas (continuar da E24 — mesmo PR #7 da Onda 8).
LEIA ANTES: docs/INTEGRACAO.md §2 (item "Encaminhar" — limites, cold à força, 423 no pedido inteiro, idempotencyKey do pedido, results[] com target/ok/id/deduped/cold/confirmed/code/error, recusas FORWARD_UNSUPPORTED/FORWARD_SOURCE_UNAVAILABLE/FORWARD_LIMIT) e §3.2; D-030; MAPA-CODIGO §3.12 (fluxo do encaminhar) e §4.5 (painel); packages/contracts ForwardMessageRequest/ForwardResultDto; o Diário da E24 no roteiro; docs/analise-conversas-whatsapp-web-2026-09.md §4 (UI fiel).
Itens: menu ⌄ no balão (components/chat/MessageBubble) → "Encaminhar" → modo seleção → diálogo "Encaminhar mensagem para" (busca, conversas da MESMA sessão, até 5; só 1 quando a original tem forwardingScore ≥ 5) → ➤ com progresso e erro por destino a partir de results[]; atalho ↪ nas mídias; esconder a ação nos tipos que o gateway recusa (poll/event/group_invite/poll_vote/other) e tratar com mensagem de operador os 400 com code (apagada/editada/visualização única/original indisponível — "encaminhe pelo celular"), o 423 (sessão em quarentena — nada foi enviado), o 409 e o confirmed:false (WWEBJS — "encaminhado, confirmação pendente", NÃO reenviar); idempotencyKey gerada por clique (reenvio do mesmo diálogo não duplica); o eco chega pelo SSE/polling como mensagem nossa (source api) com o selo. Libs puras em lib/* com vitest; validação no Chrome com seed local e gateway local (fake do encaminhar ou sessão de teste LOCAL) — nada em produção.
Fechamento da Onda 8: PR #7 com CI verde + checklist do deploy G (migrations 20260925203458_reacoes_encaminhada e 20260926052719_encaminhar_marcas_apagada_editada; fluxos n8n da INTEGRACAO §3.2; conferência no Safari; teste com chip de docs/how-to/teste-chip-encaminhar.md) para eu executar depois do merge.
Se já for 08/10, pare e faça a E5 antes (prazo da build do wwebjs: 13/10).
No fim: atualize o roteiro, o PR #7, e me dê a mensagem da E5 e a lista do que eu preciso fazer.
```

### E26 — sugerir o proxy da sessão apagada (P-084) — onda 9 (produto)

```text
Etapa E26 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-084 — ao criar uma sessão com o MESMO nome de uma sessão apagada que usava proxy, o painel SUGERE esse proxy (pré-seleciona no dropdown com "usado antes na sessão X"); não bloqueia escolher outro.
Siga as "Regras de toda etapa". Branch: feature/onda9-proxy-sugestao criada da origin/main atualizada (depois do merge do PR da E27). A E27 mexeu no SessionsController (stop/logout revogam o link de conexão) e no Sessions.tsx (filtro P-089, botão Link e diálogo) — leia o aviso E27 em SESSOES antes de mexer no formulário de criação.
LEIA ANTES: a P-084 em docs/PENDENCIAS.md (levantamento de 26/09 com a abordagem A recomendada e os casos de borda), D-008 em docs/DECISOES.md, docs/INTEGRACAO.md §11, MAPA-CODIGO §4.4 (atribuição de proxy) e a linha P-084 em "Onde mexer".
Itens (abordagem A): migration ADITIVA com releasedSessionName + releasedAt (+ índice) em session_proxy_assignments; ProxyService.markReleased chamado no SessionsController.remove ANTES do manager.remove (só SINGLE com currentProxyId; falha só loga — nunca bloqueia a exclusão); rota aditiva GET /api/proxies/suggestion?sessionName=X (mais recente, sem diferenciar caixa, preferindo o exato) → {proxy, fromSession, releasedAt, available, reason: IN_USE|DEAD|DISABLED|REMOVED} ou null; ProxySuggestionDto em contracts; Sessions.tsx pré-seleciona só se o dono não mexeu no seletor (ocupado/morto/removido = só aviso). POST /sessions NÃO muda (R0). Registrar D-xxx: as atribuições órfãs viram registro intencional (a retenção não pode limpá-las). e2e: livre, ocupado, DEAD, removido, caixa diferente, duas exclusões seguidas; validação no Chrome local.
No fim: atualize o roteiro, abra o PR da onda 9 com CI verde, e me dê a mensagem da próxima etapa e a lista do que eu preciso fazer.
```

### E13 — exclusividade de sessão entre processos (P-056) — abre a Onda 3

```text
Etapa E13 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-056 — exclusividade de sessão entre processos (lease/fencing + auth store em transação). Hoje, no deploy start-first (B-004), dois containers abrem a mesma conta: disputa de 440, dois escritores do auth store (keys.set sem transação, saveCreds concorrente) e de wa_sessions.status.
Siga as "Regras de toda etapa". Branch: feature/onda3-e13-exclusividade criada da origin/main atualizada (depois do merge do PR da E26). Passo 0 (engine): conferir versões novas de Baileys/wwebjs (npm view … dist-tags) e a doc oficial/código da versão instalada antes de mexer no auth store.
LEIA ANTES: a P-056 em docs/PENDENCIAS.md, B-004 (start-first), MAPA-CODIGO §3.4 (shutdown/deploy e consequências do overlap), §3.11 e §5.1 P-056, o aviso E27 em SESSOES (o SessionManager já tem lock de ciclo de vida POR PROCESSO — runExclusive; toda operação dentro do lock precisa de teto) e a D-038 (E26) sobre as limitações de start-first já documentadas.
Itens: lease por sessão antes da reidratação/start (Redis SET NX com TTL renovado, ou epoch/fencing no Postgres — decidir com documentação oficial e registrar D-xxx); processo sem lease não grava auth/status nem envia (engines em "draining" até soltar); auth store com keys.set em transação e saveCreds encadeado com authEpoch (migration aditiva); DEGRADED com retentativa lenta só para queda de rede. Sem mudança de contrato /api (R0); nada de conta/QR real — provas com dois SessionManagers no mesmo banco/Redis nos e2e.
No fim: atualize o roteiro, abra o PR com CI verde, faça o merge e me dê a mensagem da próxima etapa e a lista do que eu preciso fazer.
```

### E14 — campanhas sem rajada ou FAILED no boot (P-057)

```text
Etapa E14 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-057 — campanhas sem rajada ao retomar e sem destinatário FAILED durante a reidratação de sessão.
Siga as "Regras de toda etapa". Crie feature/onda3-e14-campanhas de origin/main atualizada após o merge da E13; um PR para a etapa, CI verde e merge ao fim. Leia o DONE da E13, a D-039, P-056/P-057 em PENDENCIAS e MAPA-CODIGO §3.3 (boot), §3.6 (campanhas) e §5.1 P-057. Preserve o lease/fencing da E13: campanha em réplica sem posse ou durante shutdown libera a reserva e reagenda, sem FAILED.
Itens: eliminar o laço de jobs PAUSED reenfileirados a cada 30 s; retomar com espaçamento e limite global do Worker; só iniciar o consumo após reidratação das sessões; tratar sessão temporariamente fora de WORKING com liberação da reserva e backoff, sem FAILED permanente. Conferir doc oficial da versão instalada do BullMQ 5 antes de alterar limiter/Worker. Provar com e2e de efeito no mesmo Redis/Postgres: pausa, retomada sem rajada, boot antes da sessão WORKING, disputa de lease e destinatários preservados. Sem conta, QR ou envio real; sem quebra de /api.
No fim: atualize o roteiro, abra PR com CI verde, faça merge, e me dê a mensagem da E15 e a lista do que eu preciso fazer.
```

### E15 — proxy com afinidade por conta (P-058) — fecha a Onda 3

```text
Etapa E15 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-058 — manter o proxy da conta nas reconexões e impedir conexão direta fora do modo NONE.
Siga as "Regras de toda etapa". Crie feature/onda3-e15-proxy de origin/main atualizada após o merge da E14; um PR para a etapa, CI verde e merge ao fim. Leia o DONE da E14, D-039/D-040, P-056/P-058/P-099 em PENDENCIAS e MAPA-CODIGO §3.4, §3.6 e §5.1 P-058. Preserve lease/fencing da E13 e o backoff das campanhas da E14.
Itens: reusar currentProxyId da atribuição quando ainda elegível, inclusive em RANGE/GLOBAL; SINGLE ausente/desabilitado/DEAD deve produzir erro explícito; só NONE permite saída direta; revisar a regex de falha que marca proxy DEAD e validar o proxy no PUT. Conferir versões instaladas e documentação oficial antes de mudar APIs de Redis/Prisma/engines. Provar com unit e e2e em Postgres/Redis e engines falsas, sem conta, QR ou envio real; sem quebra de /api.
No fim: atualize o roteiro, abra PR com CI verde, faça merge e entregue o checklist do deploy C manual ao dono (B-004 stop-first, B-005 backup/restore, diagnóstico/canário B-007 e B-001 depois), incluindo observação do backlog legado P-099. Não opere o Dokploy.
```

### E16 — manutenção leve (P-062 parte 1)

```text
Etapa E16 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-062 parte 1 — manutenção leve.
Siga as Regras de toda etapa. Crie feature/onda5a-manutencao da origin/main atualizada após merge da E15; um PR, CI verde e merge ao fim. Leia DONE E15, D-039/D-040/D-041, P-062/P-099, avisos SESSOES e MAPA-CODIGO da área de build.
Confira versões instaladas e documentação oficial antes de editar: nginx pinado, Actions node24 por SHA + ubuntu-24.04, Node por digest, remover ts-node se provada ausência de uso; mantenha/atualize allowScripts (fsevents e decisão sobre puppeteer@24.38.0), minors de tooling/React sem majors nesta etapa. Preserve patches/guardas e prove npm ci, postinstall, ambos Dockerfiles/builds e testes com fakes.
Deploy C e canários anteriores continuam manuais pelo dono em docs/how-to/deploy-c-onda3.md (B-004/B-005/B-007, P-099, B-001 depois); não opere Dokploy, conta, QR ou envio real. Sem quebra de /api. Atualize mapa, roteiro e docs; entregue checklist do deploy D manual e mensagem da E17.
```

### E17 — BullMQ 6 com ioredis 5 e ulid 3 (P-062 parte 2)

```text
Etapa E17 do roteiro ConexoZenvo (docs/ROTEIRO-ONDAS-2026-09.md): P-062 parte 2 — BullMQ 6 com ioredis 5 + ulid 3.
Siga as Regras de toda etapa. Crie feature/onda5b-bullmq6 da origin/main atualizada após o merge da E16; um PR, CI verde e merge ao fim. Leia DONE E16 e D-039/D-040/D-041/D-042, P-099 e mapa das filas/webhooks/campanhas.
Antes de editar, confirme versões instaladas, peers, changelogs e migration guide oficiais. Não subir ioredis para 6, Nest, Prisma, Vitest nem TypeScript; preserve TS 5.9.3, pins, allowScripts estrito e patches. ULID 3 possui export CJS, mas prove no runtime real do gateway.
Preserve épocas, PAUSED sem requeue, início do Worker após reidratação, limiter/slot Redis de 8 s, moveToDelayed/DelayedError, liberação cercada da reserva e backoff sem FAILED transitório. Teste dois workers no mesmo Redis/Postgres, jobs legados da época zero, retomada, queda/reconexão Redis e shutdown; prove também webhook/retry/DLQ sem jobId com dois-pontos. Não drenar filas nem usar conta, QR ou envio real.
Reaplique npm ci --strict-allow-scripts/postinstall, guardas, testes de efeito, builds e Dockerfiles/smokes. Deploys C/D e canários anteriores permanecem manuais; prepare checklist E e rollback/compatibilidade N-1 das filas, registre docs/mapa e entregue mensagem da E18.
```

### E18 — Nest 12 no runtime (P-062 parte 3)

```text
Execute E18/P-062 parte 3 seguindo as Regras de toda etapa: Nest 12.1.x só no runtime, piso 12.0.4, mantendo CLI 11 e TS 5.9.3. Crie feature/onda5c-nest12 da origin/main atualizada após merge da E17; um PR, CI verde e merge ao fim.
Leia DONE E17, D-039 a D-043, P-062/P-099/P-100 e mapa de boot/shutdown/borda HTTP. Confirme versões, peers e guias oficiais; preserve BullMQ 6 com ioredis 5, ULID 3, épocas/8 s/lease/reservas e os gates E16/E17.
Prove contrato /api consumido pelo n8n, auth/rate-limit/auditoria e ordem real de shutdown com fakes; investigar P-100 sem forçar close ou alterar retries para esconder falha. Não subir outras majors, usar conta/QR/envio real, drenar filas ou operar Dokploy.
Deploys C/D/E e canários permanecem manuais. Atualize docs/mapa, prepare checklist F e mensagem E19.
```

### E19 — Vitest 5 e preparação do TypeScript (P-062 parte 4)

```text
Execute E19/P-062 parte 4 seguindo as Regras de toda etapa: Vitest 5 e tsconfig preparado para TS 6, mantendo TypeScript 5.9.3 e CLI/schematics 11. Crie feature/onda5d-vitest5 da origin/main atualizada após o merge da E18/PR #24; um PR, CI verde e merge ao fim.
Leia DONE E18, D-039 a D-044, P-062/P-099/P-100 e os gates E16/E17/E18. Confirme versões, peers e guia oficial do Vitest 5 antes de editar; preserve SWC/decorators, separação unit/e2e, execução serial dos e2e e coverage. Não usar nest upgrade nem prisma@latest; outras majors e Prisma 8 não entram nesta etapa.
Preserve Nest 12.1.x/runtime CommonJS, identidade única do DI, Fastify 5.12.5, BullMQ 6/ioredis 5/ULID 3, contratos n8n, auth/rate-limit/auditoria, épocas/8 s/lease/reservas e provas de shutdown. P-100 tem falhas reproduzidas também em v5: não forçar close nem reduzir retries; subprocesso encerrado pelo harness não é shutdown aprovado.
Reexecute instalação estrita, patches/guardas, unit/e2e/coverage, typechecks/builds/imagens e smokes relevantes. Atualize docs/mapa e prepare a mensagem da próxima etapa. Deploys C/D/E/F e canários permanecem manuais; nenhuma conta, QR, envio real ou limpeza de filas.
```

### E20 — métricas e regras de produto (P-064 parte código + P-061)

```text
Execute E20 seguindo as Regras de toda etapa; feature/onda7-metricas-produto da origin/main após merge E19, um PR, CI verde e merge ao fim. Leia DONE E19/D-039–D-045, P-061/P-064/P-099/P-100 e MAPA-CODIGO observability/contacts/sessions.
Implemente métrica de destinatários novos sem resposta em 30 dias, cota de contacts/check e inventário pessoal × Business com fontes oficiais/versões instaladas. Preserve contrato n8n 0.4.1: defaults compatíveis e nenhuma restrição/status novo sem decisão explícita; cota não entra no caminho de envio. A/B de leads apenas com fixtures; chip/grupo real e decisão sobre canal oficial ficam para o dono. Não remover WWEBJS/Chromium (D-021), não verificar números reais pela rede nem fazer QR/envio real.
Mantenha TS 5.9.3/CLI 11, Vitest/coverage 5.0.2, config .mts/SWC/decorators, unit/e2e serial, node20/node16 com emissão CommonJS e buildinfo dentro de dist. Preserve Nest 12/Fastify, BullMQ6/ioredis5/ULID3, epochs/lease/CAS/8s e gates E16–E19. P-100 aberta: sem force-close/retries reduzidos; P-099 sem drenar filas.
Reexecute instalação estrita/patches, testes de efeito, typechecks/builds/guardas e smokes aplicáveis, revise com agentes, atualize docs/mapa e entregue mensagem E21. Deploys C/D/E/F e canários permanecem manuais.
```

### E27 — link público de conexão por QR (P-086) + filtro de sessões (P-089) — onda 9 (produto) — ✅ 27/09

```text
(Pedido do dono no chat, 27/09) "preciso criar aquele link pra eu enviar e a pessoa acompanhar e conectar ao qrcode quando cair ou quando eu criar uma sessão e quiser compartilhar para pessoa conectar de outro local" + "outro ponto que quero que adicione é um filtro em sessão por nome, status e numero".
Regra: P-086 em docs/PENDENCIAS.md. Entregue com a política da D-037; diário abaixo.
```

### E7 a E21

As mensagens das etapas seguintes seguem o mesmo molde (Etapa, pendência, "Siga as Regras de toda
etapa", branch da etapa, passo 0 de upstream quando for engine, itens da pendência com os critérios
de aceite do relatório §12, "leia no MAPA-CODIGO a seção X e a linha P-0xx", "no fim: atualize o
roteiro e me dê a mensagem da próxima"). O chat que fechar a etapa anterior escreve a mensagem da
próxima aqui antes de entregá-la, já com o que aprendeu.

## Ações que só o dono pode fazer (e quando)

| Quando                      | Ação                                                                                                                                                                                                                                        | Referência                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Agora                       | Mergear o PR da E1 (só docs — não faz deploy)                                                                                                                                                                                               | E1                                           |
| Agora (mais urgente)        | Backup do Postgres para S3 **fora da VPS** + restore testado num banco descartável                                                                                                                                                          | B-005                                        |
| Agora                       | MinIO → imagem `pgsty/minio` pinada, fechar só o console 9001, trocar root se `minioadmin`, access key própria do gateway                                                                                                                   | B-006                                        |
| Agora                       | Diagnóstico somente leitura (Traefik, Node/Chromium, Redis, Postgres, env, painel do Dokploy, logs desde 17/09, composição da frota, pareamento Baileys novo com chip de teste) — devolver as respostas                                     | B-007                                        |
| Agora                       | Checklist no celular dos chips deslogados + verificação em duas etapas com e-mail + usar cada celular a cada ≤14 dias                                                                                                                       | B-003                                        |
| Agora (fecha a Onda 1)      | PR #5 e PR #6 já mergeados; fazer **deploy A manual** quando autorizado, seguindo o checklist de [how-to/deploy-a-onda1.md](how-to/deploy-a-onda1.md) §1–§2                                                                                 | E4 · deploy A                                |
| Depois do deploy A (E4)     | Swarm Settings do gateway: Update/Rollback Config `stop-first`, StopGracePeriod 30 s, Health Check do Swarm vazio; conferir com `docker service inspect` — passo a passo em [deploy-a-onda1.md](how-to/deploy-a-onda1.md) §3                | B-004                                        |
| Depois do deploy A (E4)     | GitHub → Settings → Notifications → Actions: e-mail "only failures" (é o alarme da checagem diária de advisories); `gh workflow run advisories.yml` uma vez na main; rever os 7 aceites do fastify até 30/11/2026                           | P-054 · D-023                                |
| Depois do deploy W (E6)     | PATCH `wwebjsWebVersion` na sessão com 1 chip de teste; só depois decidir promoção global e `WA_REQUIRE_PROXY=true`                                                                                                                         | P-059 · B-001                                |
| Depois do deploy B (E12)    | Observar 48 h: 405/403/440 nos logs, mensagens recebidas durante o deploy chegando no webhook                                                                                                                                               | Onda 2                                       |
| Antes do deploy C (E15)     | Confirmar B-004 `stop-first` em Update/Rollback Config, backup fora da VPS + restore B-005 e janela/canário B-007. Medir `wait`/`delayed` da fila de campanhas antes/depois (P-099); não drenar toda a fila.                                | B-004 · B-005 · B-007 · P-099                |
| Depois do deploy C (E15)    | Ligar `WA_REQUIRE_PROXY=true` (se ainda não) e Redeploy                                                                                                                                                                                     | B-001                                        |
| Depois do merge E16         | Deploy D manual dos dois apps, conferência Node/nginx/Chromium, smoke e navegação; cumprir primeiro pré-requisitos C se pendentes                                                                                                           | [checklist D](how-to/deploy-d-manutencao.md) |
| Depois do merge E18         | Deploy F manual do gateway após aceites C/D/E; observar shutdown/P-100 e canário n8n, mantendo stop-first                                                                                                                                   | [checklist F](how-to/deploy-f-nest12.md)     |
| Quando puder (Onda 4)       | Traefik → v3.7.13 (se 3.6.x) · Redis com AOF (Custom Command completo com `--requirepass`, depois do deploy A — bullmq 5.81.5; nota E3 na análise §8) · Postgres pinado na minor                                                            | B-007 · análise §8                           |
| Antes da E22 (Onda 8)       | Responder: reação fora do evento `message` do webhook + contando no reply-rate (recomendado) — confira se algum fluxo n8n usa o tipo `other`                                                                                                | P-066                                        |
| Quando puder (Onda 8)       | Checagens do diagnóstico §3: SQL só leitura dos tipos em `wa_messages` (7 dias), logs de mídia, `canPlayType` do áudio no seu navegador (Safari × Chrome)                                                                                   | P-066/P-067                                  |
| Antes do deploy G (Onda 8)  | Conferir o painel da E23 no **Safari** (áudio Ogg/Opus tocando, imagem, vídeo com seek, "Baixar", lightbox) — no Chrome já foi validado localmente                                                                                          | P-067                                        |
| Antes do deploy G (Onda 8)  | Fluxos n8n que usam `senderJid` em GRUPO (como destino ou para detectar grupo) — trocar por `chatJid` (INTEGRACAO §3.2 item 9)                                                                                                              | P-074 · D-029                                |
| Antes do deploy G (Onda 8)  | Teste com chip do encaminhar (local antes da E25, ou no canário depois do deploy G) — [how-to/teste-chip-encaminhar.md](how-to/teste-chip-encaminhar.md); devolver o resultado no chat seguinte                                             | P-083 · D-030                                |
| Quando puder (Onda 8)       | Decidir P-080 (mídia antiga no encaminhar pelo S3 — exige marca de visualização única) e P-081 (cold derivado também no `/text`, WA-02)                                                                                                     | P-080 · P-081                                |
| Fecha a Onda 8 (E25)        | PR #7 já mergeado; fazer **deploy G manual** (2 apps, 2 migrations aditivas) seguindo [how-to/deploy-g-onda8.md](how-to/deploy-g-onda8.md) — de preferência DEPOIS do deploy A; antes: fluxos n8n (INTEGRACAO §3.2), Safari, cópia do banco | E25 · deploy G                               |
| Quando puder (Onda 8)       | Decidir P-085 (regra "encaminhada → só 1 grupo" também na API — 400 novo para o n8n); o painel já aplica                                                                                                                                    | P-085 · D-031                                |
| Decisão estrutural (Onda 7) | Canal oficial/coexistência para fluxos críticos                                                                                                                                                                                             | P-064                                        |

## Diário de execução

- **29/09 — E19/P-062 parte 4 (D-045; sem deploy):** Vitest/coverage 5.0.2,
  provider root para runner hoisted; SWC/decorators, clearMocks:false, extends:true,
  e2e serial e coverage preservados. Config gateway .mts, .vitest ignorada.
  TS 5.9.3/CLI 11 mantidos; node20/node16 lê exports e continua emitindo CommonJS,
  sem shim de proxies. Tipos/rootDir/defaults explicitados. Buildinfo fora de dist
  produziu segundo build vazio; corrigido com tsBuildInfoFile dentro de dist e
  Docker ignore, dois builds consecutivos aprovados. Prisma gerado preserva import()
  nativo, provado em SQL na imagem final. 983 unit gateway + 292 painel;
  fullcov 1.425/92 e 178 fontes cobertas, imagens/health/auth/rate-limit/painel/SIGTERM
  isolados verdes. Três revisões independentes; pacotes de produção do lock inalterados.
  TS 6 não instalado; P-100 aberta, deploys C/D/E/F e canários manuais pendentes.
  Próxima etapa **E20/P-064 parte código + P-061**, preservando todos os gates.

- **29/09 · E18/P-062 parte 3 (D-044, PR #24), sem deploy:** Nest 12.1.1 e companions
  compatíveis; CLI/schematics 11 e TS 5.9.3 preservados. Fastify 5.12.5 remove
  os sete aceites de advisories; guardas de identidade DI e CommonJS após prune.
  Contrato n8n/auth/rate-limit/auditoria e ordem de shutdown provados com fakes;
  P-100 diferenciada em v5/v6, sem close forçado/retries alterados. E17/PR #23
  confirmado mergeado `4de87fe` com checks verdes. [Checklist F](how-to/deploy-f-nest12.md)
  manual após C/D/E; B-004/B-005/B-007/P-099 permanecem. E19 segue em branch/PR próprios.

- **29/09 · E17/P-062 parte 2 (D-043), sem deploy:** BullMQ 6.3.10 com ioredis 5.11.1
  e ULID 3.0.2; troca de `Queue.client` por `getBackend().client`. Épocas, lease,
  reidratação, limiter/slot e reserva/backoff preservados. Provas v5/v6 com dois workers,
  HTTP/retry/DLQ/reconexão e ULID CommonJS na imagem final; alias v5 só em desenvolvimento.
  [Checklist E](how-to/deploy-e-bullmq6.md) inclui compatibilidade/rollback e conferência
  manual de repeat/pausa global; não drenar filas. P-100 investiga shutdown com operação
  Redis em voo (não confundir com o caso ocioso provado). E16/PR #22 mergeada `7d547fc`;
  E18 segue em branch/PR próprios após esta etapa. Deploys C/D/E e canários são manuais.

- **29/09 — E16/P-062 parte 1 (`e16-manutencao`, D-042, PR #22, código `ce7ada0`, base `54c659a` após merge #21):**
  Node/nginx por digest multiarch, Actions node24 por SHA/Ubuntu 24.04/Node exato;
  React/Router/tooling sem major de runtime; ts-node removido por ausência de uso.
  allowScripts completo com fsevents aprovado e Puppeteer negado, npm ci estrito;
  patches e guardas preservados. Smoke HTTP do painel e autenticação da imagem gateway;
  mutações exigem falha. Deploy D manual no [checklist](how-to/deploy-d-manutencao.md),
  sem migrations/contrato novo e sem substituir os canários/precondições do C.
  E17 segue em branch/PR próprios depois do merge; evidência final no DONE E16.

- **29/09 — E15/P-058 (`e15-proxy`, D-041, PR #21, código `0cf2cd4`, base `b56ff27` após merge E14):** afinidade
  persistida inclusive RANGE/GLOBAL; configuração sem saída elegível falha explicitamente
  nas duas engines, sem fallback direto. DEAD restrito a auth/túnel, ID do transporte e
  transação da lease E13; E14/backoff preservados. PUT valida elegibilidade e disputa SINGLE
  sob lock; nome vivo resolve para ID preservando 200 de órfãs (P-097). Sem migration nova,
  payload novo, conta/QR/envio real. Runbook [deploy C](how-to/deploy-c-onda3.md) preparado
  com B-004/B-005/B-007, inventário de proxies, P-099 e B-001 depois. Validação local:
  1.394 gateway + 292 painel, incluindo 15 e2e E15. CI e merge acompanhados no PR #21.

- **29/09 — E14/P-057 (`e14-campanhas`, PR #20, código `cfc2976`,
  `feature/onda3-e14-campanhas` da `origin/main=5501593`):** D-040 separa cada retomada por época persistida e encerra jobs
  PAUSED sem o laço de 30 s; falha parcial de enqueue volta a PAUSED. Worker BullMQ 5.81.5 só
  consome após a primeira reidratação, limita globalmente um início/8 s e reserva no Redis
  um slot por envio efetivo/8 s (inclusive downloads de mídia concorrentes). Sessão sem
  WORKING, réplica sem lease e shutdown liberam a reserva e atrasam o mesmo job, sem FAILED.
  Migration aplicada só no Postgres local; 1.313 testes gateway e 292 painel locais,
  incluindo sete e2e no mesmo Redis/Postgres com envio falso, sem conta/QR/mensagem real. Sem mudança em `/api` nem deploy. E15/P-058 fecha a Onda 3;
  o primeiro deploy C exige B-004 stop-first, e a fila legada pode atrasar o consumo inicial
  (P-099). A mensagem da E15 está acima.

- **27/09 — E13/P-056 (`e13-exclusividade`, branch `feature/onda3-e13-exclusividade` da
  `origin/main=78d0f27`):** D-039 escolhe Postgres 18 como árbitro da lease/epoch (30 s, renovação
  8 s), com auth Baileys/status transacionais e `keys.set` atômico. Boot/manual só abrem engine sob
  posse; perda drena; campanha em réplica sem posse ou em shutdown reprograma sem FAILED. WWEBJS
  cerca o LocalAuth por epoch e geração, renomeia o perfil sob lock e apaga apenas o descartado;
  logout/Chromium inconclusivo não libera a posse. E2E com dois managers no Postgres/Redis e engines
  falsas: disputa, takeover, TTL, logout, restart pós-crash, RPC antigo bloqueado e isolamento do
  perfil. Local: 915 unit gateway + 292 painel, 1304 gateway total + 292 painel, typecheck,
  depcruise, ambos builds e mapa gerado verdes. `npm run lint`/`format:check` globais enxergam
  `seed-mock.js`/`apps/gateway/prisma/seed-mock.ts` pré-existentes fora desta branch; escopo tocado
  passou. Sem conta/QR/envio real ou deploy. **Primeiro deploy requer B-004 stop-first; WWEBJS mantém
  stop-first** porque o Chromium/perfil não é cercado inteiramente pelo Postgres. Resíduo de perfil
  descartado após falha de limpeza: P-098. PR #19 e merge registrados no DONE da sessão.

- **27/09 — E26/P-084 (`e26-proxy-sugestao`, branch `feature/onda9-proxy-sugestao` da
  `origin/main=1fc2f34`; PR #18, código `036f333`, CI verde no run `36324262323`; D-038):** apagar sessão com proxy fixo guarda o nome na atribuição órfã e o
  painel sugere esse proxy ao recriar com o mesmo nome. O que as próximas etapas precisam saber: (1)
  **as órfãs carimbadas de `session_proxy_assignments` são registro intencional** — nada pode
  apagá-las (`retention.service.spec.ts` trava); (2) busca sem caixa pelo Prisma (`mode:
'insensitive'`) vira ILIKE e o `_` do nome é curinga — use `lower(col) = lower($1)` em `$queryRaw`;
  (3) `setAssignment` (PUT) zera o carimbo; (4) `GET/PUT /sessions/:id/proxy` não resolvem nome
  (P-097); (5) o formulário "Nova sessão" deriva a escolha do proxy (`lib/proxy-suggestion.ts`,
  `decideAfterHold`) — mantenha "o que se vê é o que se envia"; (6) harness headless do painel com
  gateway falso (puppeteer) no scratchpad desta sessão (`dash-e26`) — volátil, recriar se precisar.

- **27/09 — E27/P-086 + P-089 (`e27-link-conexao-qr`, branch `feature/onda9-link-conexao-qr` da
  `origin/main=11e28cb`; PR #17, código `27a7dee`, CI verde no run `36296938202`; D-037):** link público de conexão por QR (só Baileys; criado no painel por
  OPERATOR+; token no `#` da URL do painel e em `Authorization: Bearer`; página `/conectar`) e filtro de
  sessões. O que as próximas etapas precisam saber: (1) **`SessionManager` tem lock de ciclo de vida
  por sessão** (`runExclusive`): de dentro de uma operação chame as versões `*Unlocked`; toda operação
  dentro do lock precisa de teto (o pairing ganhou 45 s → 409); fakes de e2e precisam de `liveView`/
  `isBusy`/`isRehydrated`/`hasEngine`/`newQrForConnectLink`/`rejectConnectedAccount` (já em
  `test/setup-app.ts`); (2) o QR do Baileys fica em memória depois de expirar e de lido (DEGRADED só
  local) — decida "QR válido" por `liveView`, nunca pelo status do banco (P-094 para o modal); (3)
  `creds.account` (não `creds.me`) prova conta pareada; (4) stop/logout pelo operador revogam o link
  ativo; (5) `wa_sessions.lastMeJid` guarda o último número conectado (o `meJid` zera no 401) e entra
  no `SessionDto`; (6) o filtro de Sessões usa estado local espelhado na URL — input controlado direto
  por `useSearchParams` quebra a digitação (transição do React Router 7); (7) armadilhas de validação:
  janela do Chrome encoberta deixa `visibilityState` hidden mesmo com foco (sobrescrever na aba); o
  gateway de dev rodando junto dos e2e disputa filas; o banco de dev tem 128 dead-letters órfãs que
  fazem o `g6.e2e-spec` falhar localmente (CI limpo passa); `prisma migrate dev` pede reset por
  checksum antigo no banco de dev — gerar SQL com `prisma migrate diff` e aplicar com `migrate deploy`;
  (8) pendências novas P-089..P-096. Deploy: manual, gateway antes do painel, migration aditiva;
  aceite com chip no runbook (principal: o `#` sobreviver ao toque no WhatsApp).

- **26/09 — E11/P-051 (`e11-baileys-patch`, nova branch da `origin/main=960471e`; sem merge/deploy):**
  o patch-package da rc14 corrige `Curve.verify` e domínio hosted por device (#2751) e passa o
  stream cifrado por `pipeline` (#2716; #2815 foi fechado como duplicado). Cinco testes com a lib
  real e fixture sintética passaram; `npm ci` aplicou os patches com `--error-on-fail`.
  567 unit gateway, 853 gateway no total e 180 painel locais; typechecks, fronteiras, mapa e
  builds dos dois Dockerfiles verdes, inclusive guardas na imagem final do gateway.
  `Curve.verify` foi rechecado na imagem final. Lint/formato globais veem só os dois `seed-mock`
  não rastreados, preexistentes; a checagem direcionada passou. P-087 continua aberta e separada.
  PR #15 aberto; jobs `ci` e `imagens` verdes no run `36280099308` do HEAD `e3368d0`.
  Em 26/09, o dono pediu merge ao fim de cada etapa: o PR #15 será integrado após
  o CI do ajuste documental; E12 começa de `origin/main` atualizada em branch/PR próprios.
  Canário e deploy B manual continuam após E12 e na janela do dono.

- **26/09 — integração das branches restantes (PR #13, merge `2f02f02`, sem Deploy):**
  as pontas históricas `coleta-mac` e `feature/m2-guardrail-ativo` foram reconciliadas
  com 12 coletas M2 de julho; o detector local entrou como observador WWEBJS
  D-035/P-088 opt-in, desligado por padrão e somente WARN. Jobs `ci` e `imagens`
  verdes no run `36278240407`. Nenhuma conta, mensagem real, coleta nova, ação no
  Dokploy ou canário. E11/P-051 e E12/P-052 continuam ⬜; deploys A/G/W/B e
  canários dependem da janela manual do dono.

- **26/09 — reconciliação dos merges #10/#11 (sem Deploy):** `origin/main` contém E6/P-060
  pelo merge `d577b05` (PR #10, 19:16 BRT) e E7–E10 pelo merge `8291c17` (PR #11,
  19:19 BRT). E11/P-051 e E12/P-052 continuam ⬜, agora em nova branch/PR a partir da `main`.
  Os diários abaixo registram o estado no fechamento de cada etapa; o último SHA de produção
  documentado continua `768fb26`, sem verificação ao vivo nesta reconciliação. Deploy W e futuro
  B/canários dependem de janela manual do dono.

- **26/09 — E10 (sessão `e10-baileys-midia`, PR #11, sem merge/deploy):** P-050/P-075 em código:
  prazo total de 90 s para o download recebido, com até 20 s de reupload dentro dele; dispatcher
  Undici 8.10.2 privado por mídia, destruído ao encerrar, passa ao `fetch` da rc14. Uma única
  escolha de proxy alimenta socket/upload e CDN HTTP/HTTPS; SOCKS entrega apenas metadados até
  prova, sem fetch direto. Boom 404/410 chama `sock.updateMediaMessage` uma vez e tenta baixar de
  novo; `ptvMessage` usa alias de `videoMessage` no reupload, sem perder o `raw` original. Sem campo
  público novo. Testes com rc14/fetch/socket falsos e proxy HTTP local passaram; 843 gateway no
  total e 180 painel, typecheck, fronteiras e ambos os builds locais verdes. A espera interna de
  `updateMediaMessage` sem cancelamento ficou registrada na P-087. Commit `b489b21` com CI `ci`/
  `imagens` verde no run `36272852120`; canário com chip e prova do IP de saída só após E12,
  merge e deploy B do dono.
  **Para E11:** patch mínimo P-051, conferir fontes dos PRs e código instalado antes de editar;
  não presumir que #2815 resolve P-087.

- **26/09 — E9 (sessão `e9-baileys-desconexao`, commit `7c0441c`, PR #11):** P-049 entregue
  em código: matriz 401/403/405/408/411/428/440/500/503/515, alerta `session.client_too_old`
  no 405, uma tentativa quieta aos 60 s no 440 e 515 sem orçamento comum (teto próprio). O
  diagnóstico bruto `lastErrorDetails {code,reason}` é aditivo e persistido em migration aplicada
  só no Postgres local; `lastError` texto permanece. Métrica `wa_disconnects_total{engine,code}`
  desde o boot. Consulta de versão com espera 3 s/single-flight/intervalo 30 s, cache renovado só
  por `isLatest:true`, log por conexão e override por par de envs de uma sessão canário. A pausa E8
  segue provisória no `connection.update` e só o retorno direto do RPC confirma o prazo. Revisão
  adversarial detectou e corrigiu a corrida entre status WORKING pendente e detalhe do close.
  Provas: 546 unit gateway, 831 gateway no total e 180 painel, e2e com socket falso/HTTP/banco/
  webhook/métrica; typecheck, fronteiras, builds e mapa; CI `ci`/`imagens` verde no run
  `36262065637`. Sem conta, envio real, merge ou deploy. **Para E10:** preservar E7/E8/E9,
  sobretudo dedupe `append`, pausa provisória e matriz/versão; a rc14 ignora `fetchAgent` no
  download e a próxima etapa precisa provar `dispatcher` undici, timeout e reupload 404/410.

- **26/09 — revisão E8 (sessão `e8-baileys-fonte-prazo`, commit `8b513c5`, PR #11):** a rc14
  fabrica agora + 60 s quando a notificação de timelock omite o prazo. `connection.update`
  passa a registrar a data como provisória; só a resposta direta do RPC confirma
  `timeEnforcementEnds`, inclusive se chegar após os 3 s de espera. Capping mais curto não
  encurta pausa provisória maior. Testes adicionais provam origem do alerta, precedência e
  retomada por relógio sem alterar o prazo persistido. 507 unit gateway + 180 painel; 791
  gateway + 180 painel no total; typecheck, fronteiras, builds e mapa passaram. Lint/formato
  globais locais apontam apenas os `seed-mock` não versionados. CI `ci` e `imagens` verdes no
  run `36259684192`; sem conta, envio real, merge ou deploy. **Para E9:** preservar essa
  distinção ao alterar `onConnectionUpdate` e a política de versão.

- **26/09 — E8 (sessão `e8-baileys-restricao`, commit `d2577c5`, PR #11):** P-048 entregue
  em código, sem merge/deploy/conta/envio real. Baileys rc14 liga 463, `reachoutTimeLock` e
  capping CAPPED; RPC com timeout de 3 s, single-flight e intervalo mínimo de 30 s; 479 só conta.
  Prazo persistido libera por relógio, sem `banida`; o `SessionManager` barra com 423 todos os
  envios de mensagem (inclusive chat aberto e cada destino do encaminhar), e a campanha re-agenda
  sem `PAUSED`. Evento `session.restricted`, ACK `error` e `health.restriction_until` são aditivos;
  contracts e INTEGRACAO no mesmo commit. Migration aplicada só no banco local. Provas: 501 unit
  gateway + 180 painel; 785 gateway na suíte completa + 180 painel; e2e com socket falso para
  pausa, webhook, ACK e retomada; typecheck, fronteiras, builds, Prisma, mapa e lint/formato dos
  arquivos da E8. Os comandos globais de lint/formato no workspace local esbarram só em
  `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts`, arquivos não versionados anteriores.
  **Para E9:** preservar o callback de restrição em `onConnectionUpdate` e o gate do
  `SessionManager`; P-049 trata DisconnectReason e versão. O prazo da notificação é provisório
  (`source=temporary`) até a resposta direta do RPC; sem qualquer prazo válido, são 60 s.
  O vencimento provisório não prova fim da restrição no WhatsApp. Canário após E12 e
  merge/deploy B; B-004/B-005/B-007, P-034 e P-056 seguem pendentes.

- **26/09 — E7 (sessão `e7-baileys-offline`, commit `1f8cb2b`, PR #11):** P-047 entregue em código
  sem conta, envio ou deploy: `append` inbound de até 48 h entra no fluxo existente; eco próprio,
  status e newsletter são filtrados por mensagem. Cache + consulta por `(sessionId,keyId)` barram
  replay sequencial antes do EventBus, inclusive após restart; `describeBaileysMessage`, reação
  separada, participante de grupo e `raw` inbound foram preservados. E2E do efeito: banco, job do
  webhook, Inbox e reply-rate; 493 unit gateway + 776 testes gateway + 180 painel. Nenhuma migration
  nem campo público novo. PR #11 depende do #10 aberto; E8/E9 foram concluídas depois na mesma
  branch e PR. Limites:
  concorrência de duas instâncias = P-056/B-004; falta de outbox = P-034. Canário após E12 no
  `how-to/canario-baileys-onda2.md`. O `onMessagesUpsert` agora é async; tests privados devem
  aguardar sua Promise. CI dos jobs `ci` e `imagens` verde no PR #11 (run `36250883011`).

- **26/09 — E6 (sessão `e6-wwebjs-leve`, branch `feature/onda6-wwebjs`, PR #10, D-033):** P-060
  implementada sem deploy/conta real: stream de 2 MB no download, grupo sem auto-download por
  padrão, fila de mídia por sessão, teto de 24 MB no envio, intenção pendente se o CDP completar
  depois do HTTP, single-flight no patch, sync de agenda uma vez por instância, limpeza do Chromium
  por PID, flags revistas e perfil JSHeap/PSS/IndexedDB no log. Medição local `about:blank` no macOS
  (soma RSS −87.982.080 B; JSHeap estável; PSS indisponível) **não substitui** o canário de sessão
  logada. 489 unit gateway + 282 e2e + 180 painel locais. Próxima E7: proteger `append`/dedupe sem
  mexer na semântica de grupo/mídia desta etapa; ver `INTEGRACAO` e aviso em `SESSOES`.

- **26/09 — E25 (sessão `e25-encaminhar-painel`, commits `06d4ac1` + `f6d0116`):** P-068 parte interface (decisões do dono na
  abertura: modo seleção com 1 mensagem; destinos = contatos e grupos) na branch
  `feature/onda8-conversas` — **fecha a Onda 8** (PR #7, merge do dono = deploy G; D-031). Pedido
  novo do dono no mesmo chat: sugerir o proxy da sessão apagada (P-084 → **E26**, onda 9). O que as
  próximas etapas precisam saber: (1) as regras do encaminhar no painel (`lib/forward.ts`) são
  ESPELHO do gateway e o `forward.spec.ts` confere contra o `forward.decision.ts`/`engine.port.ts`
  reais — mudar limite, tipo encaminhável ou destino canônico lá quebra o spec do painel; (2)
  `ApiError` tem `code` e `body` (aditivo) — tela nova que precise do `code` (ex.: 423) já o tem;
  (3) `<dialog>`: o evento `close` atrasa em aba oculta e o Chrome FECHA À FORÇA num Esc repetido
  mesmo com `preventDefault` no `cancel` — nunca contar com o diálogo aberto; o `closedby` não existe
  no Safari estável (clique fora é nosso); (4) Tailwind 4: `hover:`/`group-hover:` só em dispositivo
  com hover — use `not-pointer-fine:` para tela de toque e `group-has-[:focus-visible]` em vez de
  `group-focus-within` (clique de mouse não deve deixar controle à vista); (5) validação no Chrome:
  com a aba oculta o Chrome segura timers e renderização (scripts de teste dão falso resultado) —
  traga a janela à frente; o seed da E23 foi copiado para o scratchpad da E25 com os comandos novos
  `mark <keyId> revoked|edited|clear` e `eco <keyId> <destino> [chave]` (o scratchpad é volátil); o
  simulador do `/forward` por `window.fetch` está no diário da sessão; (6) o gateway local sem
  aparelho responde `FORWARD_FAILED` "Sessão não iniciada" com `results[]` — dá para validar a fiação
  real sem chip; (7) achados novos: P-084 (pedido do dono), P-085 (regra de 1 grupo na API + contador
  do Baileys sem teto); (8) a INTEGRACAO §2 dizia que tipo/limite vinham sem `results` — só no F0;
  corrigida.

- **26/09 — E24 (sessão `e24-encaminhar-api`):** P-068 parte API/engines + P-077 (decisões do
  dono na abertura: limites confirmados; P-077 entra) na branch `feature/onda8-conversas` (PR #7 —
  sem merge; D-030). O que a E25 e as seguintes precisam saber: (1) a rota é
  `POST …/messages/:msgId/forward` e devolve `results[]` na ordem de `to` — o painel mostra
  progresso/erro por destino a partir dele; 400 com `code` (`FORWARD_UNSUPPORTED`/
  `FORWARD_SOURCE_UNAVAILABLE`/`FORWARD_LIMIT`), 404, 409 e 423 vêm ANTES de enviar; (2) destino
  sem conversa RECEBIDA no número EXATO vira cold à força (o 9º dígito não conta — o "gêmeo" pode
  ser outra pessoa); com a sessão em quarentena, qualquer destino cold dá 423 no pedido inteiro;
  (3) o Baileys guarda a original das recebidas em `wa_messages.raw` só por 7 dias — mídia/local/
  contato mais antigos não encaminham (P-080); texto sim; (4) o wwebjs encaminha pelo caminho nativo
  e correlaciona o eco — `confirmed:false` = saiu sem o id a tempo (o painel NÃO deve oferecer
  reenviar); (5) o eco da cópia é uma mensagem nossa (`source:'api'`) com o selo — o painel já
  desenha pelo `ForwardedTag` da E23; (6) `revokedAt`/`editedAt` existem só no banco (não vão no
  DTO) — a P-069 pode expô-los; (7) armadilhas: `sendFingerprint` apaga objeto aninhado (fingerprint
  sempre plano); o `generateForwardMessageContent` da rc14 usa `Object.keys(content)[0]` (passe só o
  nó); `withLidFallback` trata `undefined` como "não enviou" (op do forward devolve o destino); o
  e2e zera o intervalo espiando `ForwardService.sleep`; (8) achados abertos: P-080..P-083 (a P-083
  lista o que só o chip prova — `how-to/teste-chip-encaminhar.md`); (9) testes da etapa: 4 arquivos
  novos (unit sem infra + e2e), mutantes do nó único e do casamento do eco mortos.

- **25/09 — E23 (sessão `e23-conversas-painel`):** P-067 + P-072 (parte painel) + P-074 (decisão do
  dono: entra) entregues na branch `feature/onda8-conversas` (PR #7 — sem merge; D-029). O que a E24
  e as seguintes precisam saber: (1) o painel desenha por `lib/message-format.ts` (`bubbleContent`,
  `messagePreview`) — tipo novo no gateway = rótulo/cartão lá, e o spec do painel confere ida e volta
  com o `message-content.ts` do gateway (quebra se o formato mudar); (2) mídia no painel só pelo
  `GET …/media` como blob, em cache por mensagem (`lib/media-cache.ts`) — nunca `mediaUrl` como
  `src`; o blob mora na origem do painel (documento/SVG viram octet-stream; nunca abrir `blob:` em
  aba); (3) tempo real: casar por (sessionId, keyId), memórias fora do updater, recargas por
  `overlayAcks`/`replayReactions`/`mergeFeed`/`stabilize`; o SSE é recriado por `useLiveStream`;
  (4) `senderJid` de grupo = participante (Baileys `phoneFirst` — a fórmula antiga da P-074 estava
  errada no modo PN; wwebjs só cache) e `senderName` no GET; o encaminhar da E24 deve manter o
  remetente original fora do eco; (5) `GET …/media` com nome fora do Latin-1 dava 500 (P-076,
  corrigido); (6) achados novos: P-077 (ecos de localização/enquete da API sem link/opções — decidir
  na E24), P-078 (ACK antes do INSERT se perde no banco), P-079 (SSE sem heartbeat/replay); (7) a
  linha da P-072 não tinha os achados de ACK da E22 (o commit dizia que sim) — reconciliada; (8)
  armadilhas de validação: o Chrome da extensão pode estar noutra máquina (`list_connected_browsers`)
  e, com a aba oculta, o Chrome adia mídia e IntersectionObserver (validar com a janela à frente);
  (9) o `.env` local não tem S3 — suba o gateway com `S3_*` do MinIO de dev na linha de comando.
  (10) conferência do dono no painel local (26/09): linha inteira da conversa clicável no Atendimento
  (só o nome era), erro do Enviar junto da caixa + caixa travada com aparelho desligado
  (`lib/send-feedback.ts`), e cursor de mãozinha em todo botão (o Tailwind 4 tirou o `pointer` do
  `<button>` — regra em `index.css`); tela nova com botão herda isso sozinha.

- **25/09 — E22 (sessão `e22-conversas-gateway`):** P-066 + P-072 (parte gateway) entregues na
  branch `feature/onda8-conversas` (PR da Onda 8 — sem merge; D-028). O que a E23 e as seguintes
  precisam saber: (1) domínio de `type` e texto de cada cartão em `message-content.ts` (fonte única;
  INTEGRACAO §3.2) — o painel rotula por `type`; `other` pode trazer resumo; `poll_vote` (Baileys) é
  voto do contato, texto null; (2) reações: `reactions[]` no `GET /messages`/`/search`, evento
  `message.reaction` no SSE (o Atendimento hoje só ouve `message` — `Atendimento.tsx:218`); casar por
  `keyId`; (3) tiques: `status` no feed e no `GET /messages`; **grupo no Baileys fica null**; `read`
  em mensagem recebida = lida no celular → tique só em `fromMe`; detalhes na P-072; (4) selo:
  `forwardingScore ≥ 5` = "com frequência" (inferência da FAQ oficial); (5) P-074 (remetente de
  mensagem de GRUPO = jid do grupo nas 2 engines) é decisão do dono na abertura da E23; (6) a E7
  (P-047, `append`) deve passar pelo `describeBaileysMessage` e cuidar do eco da nossa reação; (7)
  P-075 (reupload de mídia nunca dispara) vai junto da E10; (8) armadilha de teste: `proto.Message`
  tem todos os campos no protótipo (`null`) — `toHaveProperty` sempre passa, compare o valor.

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
