---
tipo: analise
dono: Diogo Santos
revisado_em: 2026-09-23
validade: versões, políticas e estado de produção mudam rápido — revalidar antes de executar cada onda
status: propostas priorizadas; nenhuma alteração de código, dependência ou produção
complementa: auditoria-melhorias-2026-09.md (09/09) — este documento é o DELTA até 23/09 + prioridades
---

# Análise de atualizações da plataforma e estabilidade das contas — 23/09/2026

Pedido do dono (23/09): _"análise de tudo o que eu preciso atualizar da plataforma, todas as
versões, se tem coisa nova e melhor para garantir a estabilidade das contas"_. Na mesma conversa:
_"hoje está tudo Baileys, pois o wwebjs consome muita memória e processamento"_ — a parte de
memória do wwebjs está em [analise-wwebjs-memoria-2026-09.md](analise-wwebjs-memoria-2026-09.md).

Leitura sugerida: [§1 conclusão](#1-conclusão-executiva) → [§4 ações do dono](#4-urgente--ações-do-dono-sem-código-e-sem-deploy--onda-0)
→ [§12 ondas](#12-ondas-de-execução) → [§13 rastreabilidade](#13-rastreabilidade--pendências).

## 1. Conclusão executiva

1. **Não há versão nova de engine para instalar.** Baileys segue `7.0.0-rc14` (29/07; sem rc15 nem
   7.0.0) e whatsapp-web.js segue `1.34.7` (24/04; o main só tem 1 commit após o nosso pin `1780711`).
   O que mais protege as contas agora é **configuração + código nosso**, não troca de versão.
2. **Todo deploy abre as mesmas contas duas vezes.** Com _Update Config_ vazio, o Dokploy aplica
   `start-first` (não `stop-first` como diz o runbook) — confirmado no código do Dokploy v0.30.2
   (`packages/server/src/utils/docker/utils.ts:681-696`). Casa com a sobreposição de ~15 s do P-043.
   → **B-004** (ação do dono, 1 minuto).
3. **Produção sem backup** das credenciais Baileys (Postgres) — já era A1; segue a lacuna nº 1 de
   continuidade. → **B-005**.
4. **MinIO de produção** (`s3.conexozenvo.cloud`, API pública por contrato) é o community
   arquivado, com **CVE-2026-41145** (high, escrita sem assinatura, sem correção no community). → **B-006**.
5. **Frota agora 100% Baileys** (informado pelo dono em 23/09; o repo registrava 18 WWEBJS + 1
   Baileys em 31/08). Com isso sobem ao topo os achados do Baileys (§5.1): mensagens recebidas
   durante queda/deploy **descartadas**, **sinais nativos de restrição ignorados**, download de
   mídia **sem proxy** e sem timeout, tratamento igual para todo código de desconexão.
6. **Advisories invisíveis ao `npm audit`:** Nest `GHSA-9c5c-9qcx-q35q` (high, publicado 15/09,
   afeta `@nestjs/platform-fastify` < 11.2.4 — produção roda 11.2.3) e 5 advisories do fastify
   (5.12.2/5.12.5) existem só como advisory de repositório. Correção: Nest **11.2.6** (patch).
7. **Política do WhatsApp mudou em 23/09/2026** (Business Messaging Policy + novos WhatsApp Terms
   for Business App/Platform): seguem proibidos apps não oficiais, APIs equivalentes, scraping e
   disfarce de localização por proxy. A FAQ oficial liga ban a vincular app não oficial "now or in
   the past". Nenhuma medida técnica elimina esse risco; o caminho estrutural é o oficial (§9).
8. **Alarme refutado:** "versão de protocolo do Baileys vence 25–26/09" (regra de catálogo do
   wa-version). O único precedente real de rejeição (#2733, 405 `client_too_old`) veio ~4,5 meses
   após a versão entrar → risco por volta de **dezembro**. Não é caso de deploy de emergência;
   é caso de alerta 405 + override por env (P-049).

## 2. Método, evidência e limites

- **Workflow multi-agente (23/09):** 8 frentes de pesquisa (Baileys · wwebjs/Chromium/build WA Web ·
  backend · dashboard/tooling · infra · oficial/política · engines alternativas · código de
  estabilidade), cada uma com **verificador adversarial** (objetivo: refutar), + **crítico de
  completude** que cruzou as frentes e propôs as ondas. 17 agentes, ~1.900 chamadas de ferramenta.
  Segunda rodada (memória do wwebjs): 4 frentes + 4 verificadores (ver documento irmão).
- **Conferido manualmente na fonte pelo orquestrador:** default start-first do Dokploy (código
  v0.30.2); `GHSA-9c5c-9qcx-q35q` (API GitHub, `nestjs/nest`); `GHSA-hv4r-mvr4-25vw`/CVE-2026-41145
  (MinIO, sem versão corrigida); `GHSA-w4v4-9rw7-5326` (Traefik, corrigido só em v3.7.13);
  expiração no catálogo wa-version da build `2.3000.1045101284-alpha` = 2026-10-13T07:01Z; frota
  18 WWEBJS em 31/08 (`sessions/ATIVA-2026-08-31-1930-lid-envio-wwebjs.md`).
- **Snapshot local 23/09:** `npm outdated` e `npm audit` (11 vulnerabilidades: 9 high, 2 moderate —
  fastify, cadeia Prisma → mysql2/deepmerge-ts, cadeia wwebjs → puppeteer → extract-zip).
- **Evidência bruta** (todos os itens, fontes, verificações e ressalvas, com links):
  [reference/analise-atualizacoes-2026-09.json](reference/analise-atualizacoes-2026-09.json).
- **Limites:** nenhum acesso a produção, nenhuma conta pareada, nenhum envio. Versões reais de
  Traefik, Redis, Postgres, MinIO, Node e Chromium **dentro do container** não foram verificadas
  (§14). Medições de navegador foram em macOS e página não logada. Nada aqui é garantia anti-ban.

## 3. Premissas que estavam erradas nas docs (reconciliação — P-063)

| Afirmação no repo                                                                           | Realidade (23/09)                                                                                                                                     | Onde                                                                               |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| "Update Config VAZIO = default do Swarm = `stop-first`"                                     | Dokploy injeta `start-first` + `FailureAction: rollback` quando vazio (utils.ts:681-696)                                                              | `deploy-dokploy.md:67-68`, D-014, `agent-whatzapp_api.md` §6B.11, P-015            |
| `.cloud` é "segundo ambiente" / "testar no .cloud"                                          | `.cloud` **é a produção** desde 31/08; não existe homologação — canário = sessão/chip de teste na produção                                            | memória do agente (corrigida), propostas de teste                                  |
| Frota "100% Baileys" (ESTADO de 18/08) / 18 WWEBJS (31/08)                                  | Dono informa 100% Baileys em 23/09; migração pós-15/09 não documentada — precisa de D-xxx substituindo a D-012                                        | `ESTADO.md`, D-012                                                                 |
| "Fallback live + patch `$1` seguram a operação" se a build vencer                           | Falso desde ~17/09: builds novas quebram envio de mídia (`__x_id`) e há relato de rename `$1` também em WID                                           | `PENDENCIAS.md` B-002, comentário `wwebjs.engine.ts:63-65`                         |
| "API oficial: sem risco de ban" / "cobrança por conversa/janela" / "wa_id sem LID"          | Policy 23/09 prevê limitar envio e remover acesso; cobrança por mensagem desde 01/07/2025 (serviço pago a partir de 01/10/2026); BSUID omite telefone | `motores-whatsapp.md:39,64,123-128,156`, `DOCUMENTO_CONEXOZENVO_NESTJS.md:113,127` |
| D-016: `@hapi/boom` não sobe porque quebraria `instanceof Boom`                             | Não há `instanceof Boom` no gateway (só tipo); o motivo real é "sem ganho + Baileys declara ^9.1.3"                                                   | D-016                                                                              |
| D-016/P-021: `ulid 3` é ESM-only; "bullmq 6 + ioredis 6 juntos"                             | `ulid 3` tem export CJS (e corrige viés do gerador); BullMQ 6 é testado upstream com **ioredis 5.11.1** — ioredis 6 muda para RESP3                   | D-016, P-021                                                                       |
| CLAUDE.md: Baileys rc13                                                                     | rc14 instalado desde 16/08                                                                                                                            | `CLAUDE.md`                                                                        |
| P-019 "codada, aguarda deploy"                                                              | Em produção desde 16/08 (`25cad0c`)                                                                                                                   | `PENDENCIAS.md`                                                                    |
| Comentário "fetchAgent serve para o download de mídia" / "transactionOpts acima do default" | rc14: `fetchAgent` só vale no upload; o default de transactionOpts já é 10/3000                                                                       | `baileys.engine.ts:547`, `:587-590`                                                |
| `allowScripts` no `package.json` pina versões                                               | Campo inerte no npm 11.12.1 (nenhuma referência no código do npm)                                                                                     | `package.json:47-54`                                                               |

## 4. Urgente — ações do dono (sem código e sem deploy) — Onda 0

| ID    | Ação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Por quê                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-004 | Dokploy → gateway → Advanced → Swarm Settings: **Update Config** `{"Parallelism":1,"Delay":10000000000,"FailureAction":"rollback","Order":"stop-first"}` · **Rollback Config** `{"Parallelism":1,"Order":"stop-first"}` · StopGracePeriod 30 s · **deixar vazio o campo Health Check do Swarm** (issue Dokploy #5171 serializa `Test` errado e prende tasks em Starting). Conferir com `docker service inspect`.                                                                                                                                                                                                                                                                                                         | Hoje cada deploy sobe o container novo com o antigo vivo: 2 conexões Baileys com as mesmas credenciais (disputa 440, dois escritores do auth store) e, com wwebjs, 2 Chromium no mesmo perfil. **Custo:** perde-se a rede do start-first (em 16/08 ela segurou o antigo quando o novo caiu com `Cannot find module zod`) → exige as guardas de build da Onda 1 (P-055). |
| B-005 | Backup agendado do Postgres (Dokploy Database Backups) para S3 **fora da VPS** + restore testado num banco descartável (contagem de `wa_sessions`/`wa_auth_keys` igual à de produção). Repetir antes de cada onda que mexa em engine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Perder disco/VPS = reparear a frota inteira por QR — e repareamento em massa é, ele próprio, padrão de risco. É a A1 (M4).                                                                                                                                                                                                                                              |
| B-006 | MinIO: snapshot do volume → trocar imagem para o fork corrigido **`pgsty/minio`** pinado (≥ RELEASE.2026-04-17; preferir 2026-09-16), drop-in (mesmo `/data` e envs) · fechar **só o console 9001** · manter a API pública (mediaUrl pré-assinada é contrato — R0) · trocar root se for `minioadmin` · access key própria de menor privilégio para o gateway · mesmo pin em dev/CI.                                                                                                                                                                                                                                                                                                                                      | CVE-2026-41145 / GHSA-hv4r-mvr4-25vw (high, 14/04/2026): escrita de objeto sem assinatura conhecendo a access key; afeta todo release community; repo `minio/minio` arquivado.                                                                                                                                                                                          |
| B-007 | Diagnóstico somente leitura (vira evidência de produção): `docker exec dokploy-traefik traefik version` (se 3.6.x → trocar por **traefik:v3.7.13**, NÃO a v3.6.25 da doc do Dokploy) · `node -v` e `chromium --version` no container · Redis `INFO server` + `CONFIG GET appendonly/maxmemory-policy/save` · Postgres `SELECT version()` · imagem/tag/root do MinIO · `WA_REQUIRE_PROXY`/`WWEBJS_WEB_VERSION` na env · painel Dokploy em `http://IP:3000` (→ domínio HTTPS + 2FA + firewall) · logs desde 17/09: `smax-invalid (479)`, `reachout timelock`, `Connection Failure` com 403/405/440 · composição real da frota (`GET /api/sessions`) · pareamento Baileys **novo** (QR e código) com chip de teste (#2737). | Transforma em evidência o que ficou como hipótese; define urgência de Traefik (3.6 sem correção desde 16/08), Redis (AOF) e do #2737.                                                                                                                                                                                                                                   |
| B-003 | (existente, ampliado) Checklist no celular dos chips deslogados: restrita / banida temporariamente / "Your devices were logged out" / "logged out for your account security" / "Account locked due to inactivity" / pedido de **passkey** / alerta de vinculação suspeita. Ativar **verificação em duas etapas com e-mail** nos números (re-registro por terceiro desloga todos os aparelhos). Usar o celular ao menos a cada **14 dias** (FAQ: aparelho vinculado cai). Inventariar números pessoais × WhatsApp Business.                                                                                                                                                                                               | Causas oficiais de desconexão aparecem hoje todas como o mesmo 401/LOGOUT; QR em série é o comportamento a evitar.                                                                                                                                                                                                                                                      |

## 5. Engines

### 5.1 Baileys (frota atual)

**Upstream (23/09):** npm `latest` = `7.0.0-rc14` (29/07; o pacote `baileys` sem escopo é o mesmo
build, gitHead `7e7b075`). Master só 2 commits à frente (o #2741 WIN_HYBRID não afeta nossa config:
`syncFullHistory:false` + browser não-Desktop). Develop 19 à frente, monorepo pnpm, sem release.
Nenhum merge de mantenedor desde 05/08; PRs de bump de versão WA do bot não são mergeados desde 29/07.
**Não fixar master/develop.** Correções úteis entram por `patch-package` (como já fazemos no wwebjs).

**Achados de código (sem trocar versão) — prioridade alta:**

| #   | Achado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Evidência                                                                                | Proposta                                                                                                                                                                                                                                                                                                                                      | P     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Mensagens da fila offline (recebidas durante queda/reconexão/deploy) chegam como `messages.upsert` type `append` e o gateway **descarta tudo que não é `notify`** — sem webhook, sem Inbox, sem log. O flush do buffer usa o `type` da 1ª mensagem do lote (descarte não determinístico). Issue #2810: conta com `offline="0"` em todas as mensagens (`!!"0"` = true).                                                                                                                                        | `baileys.engine.ts:783`; rc14 `messages-recv.js:1432`, `event-buffer.js:569-575`         | Decidir **por mensagem**: aceitar `append` se não for eco próprio, newsletter ou status, e `messageTimestamp` dentro de 24–48 h; dedupe por keyId; não disparar lógica de "nova conversa" para histórico. Teste com lote misto.                                                                                                               | P-047 |
| 2   | **Sinais nativos de restrição ignorados:** rc14 emite `connection.update.reachoutTimeLock {isActive,timeEnforcementEnds,enforcementType}`, evento `message-capping.update` (FIRST_WARNING/SECOND_WARNING/CAPPED) e expõe `fetchAccountReachoutTimelock()`/`fetchNewChatMessageCap()`. O caminho interno "consultar timelock após ack 463" é **código morto** na rc14. `messages.update` com status ERROR (463, 479) é descartado (`mapAckStatus`, `onMessagesUpdate`). `recordHardSignal` segue sem chamador. | rc14 `Types/State.d.ts`; `baileys.engine.ts:272-287,876-879`; `guardrail.service.ts:427` | Ouvir os eventos; em ERROR `463` → `recordHardSignal` + `fetchAccountReachoutTimelock()` + evento aditivo (contracts no mesmo commit); contar `479`; pausar envios da sessão até `timeEnforcementEnds`. Reduz risco, não garante.                                                                                                             | P-048 |
| 3   | **Mesmo backoff para todo DisconnectReason** (5 tentativas → DEGRADED; contador zera no `open`): 403/405 queimam 5 logins contra conta/versão bloqueada; 440 vira pingue-pongue no deploy start-first; 515 pós-scan consome orçamento; 500 é o default genérico da lib (não prova sessão corrompida).                                                                                                                                                                                                         | `baileys.engine.ts:689-776`                                                              | 515 religa sem contar; **405 → ramo próprio com alerta `client_too_old`**; 403 → FAILED com código bruto; 440 → no máx. 1 retentativa tardia, **sem persistir status terminal** até existir lease (P-056); 500 → backoff + reason bruto; 411 terminal. Persistir `{code, reason}` no lastError + métrica `wa_disconnects_total{engine,code}`. | P-049 |
| 4   | **Versão de protocolo:** todas as sessões anunciam `2.3000.1043857760` (embutida na rc14 = master). `fetchLatestBaileysVersion` não lança em falha (devolve a embutida com `isLatest:false`) e o gateway guarda isso 12 h como "fresco". Precedente #2733: versão recusada com 405 ~4,5 meses após entrar.                                                                                                                                                                                                    | `baileys.engine.ts:99-130,545`                                                           | Manter `fetchLatestBaileysVersion` (versão curada; wiki desaconselha `fetchLatestWaWebVersion` a cada conexão) + timeout + não cachear fallback + log da versão por conexão + **override por env** com canário numa sessão + runbook do 405.                                                                                                  | P-049 |
| 5   | **Download de mídia recebida sai pelo IP da VPS** (na rc14 `fetchAgent` só vale no upload; download usa `fetch` global com `dispatcher`) e **pode pendurar para sempre** (#2750: stream sem listener de erro; chamada `void` → nem evento nem fallback).                                                                                                                                                                                                                                                      | `baileys.engine.ts:547,860,917-925`; rc14 `messages-media.js:297-301,673`                | `Promise.race` com timeout (60–120 s) + fallback sem mídia; `dispatcher` undici `ProxyAgent` (instalar `undici` na major do Node 26 = 8.x; SOCKS só após teste); corrigir comentário falso.                                                                                                                                                   | P-050 |
| 6   | **Curve.verify aceita qualquer assinatura de 64 bytes** na rc14 (reproduzido localmente: 64 zeros → `true`); afeta certificados do handshake Noise e assinatura ADV no pair-success. Mitigado por TLS. Corrigido só no develop (#2751, 1 linha, com testes). O mesmo PR corrige `domainType` de device hosted contaminando os devices seguintes.                                                                                                                                                              | rc14 `Utils/crypto.js:23-31`, `Utils/signal.js:144-160`                                  | `patch-package` mínimo: #2751 + #2815 (erro do stream de mídia, +5 linhas). #2789 (presença "available" em creds.update parcial) só após reproduzir. #2765 (companion_reg_refresh) **só se** o teste de pareamento falhar.                                                                                                                    | P-051 |
| 7   | **Pareamento Baileys novo pode estar quebrado desde 28–29/07** (issue #2737: servidor manda `companion_reg_refresh` após o scan; PR #2765 aberto, "blocked", 474 linhas; o whatsmeow implementou o mesmo tratamento em 09/09). Pairing code: notificação "Link Device" não aparece (#2764/#2759).                                                                                                                                                                                                             | GitHub WhiskeySockets/Baileys #2737, #2765, #2764; whatsmeow `9ec8f76`                   | Testar com chip (B-007) QR **e** código antes de concluir; aplicar #2765 via patch só se falhar.                                                                                                                                                                                                                                              | P-051 |
| 8   | `requestPairingCode` sem guarda: sobrescreve `creds.me` numa sessão já registrada; `sleep` fixo de 1,5 s não garante socket aberto.                                                                                                                                                                                                                                                                                                                                                                           | `baileys.engine.ts:1557-1562`; `session-manager.service.ts:451-464`                      | 409 se `creds.registered`; esperar `connecting`/primeiro QR.                                                                                                                                                                                                                                                                                  | P-052 |
| 9   | `recordGroupParticipants` lê `p.jid` (não existe na rc14) e ignora `p.phoneNumber` → perde pares LID↔telefone que o servidor já entregou; o gateway nunca consulta `signalRepository.lidMapping` (persistido em `wa_auth_keys`).                                                                                                                                                                                                                                                                              | `baileys.engine.ts:1348-1357`; rc14 `groups.js:337`                                      | Gravar `phoneNumber` do roster; fallback local `lidMapping.getPNsForLIDs` (sem rede).                                                                                                                                                                                                                                                         | P-052 |
| 10  | Reenvio por retry receipt em 1:1 gera stanza inválida (479) e avança o ratchet 2× (#2781, sem PR).                                                                                                                                                                                                                                                                                                                                                                                                            | rc14 `messages-send.js:457-466,636-721`                                                  | Só se aparecer `smax-invalid (479)` nos logs (B-007): patch pulando fan-out quando `isRetryResend && !isGroup`.                                                                                                                                                                                                                               | P-051 |
| 11  | Sem `msgRetryCounterCache`/`userDevicesCache` externos: recriados a cada reconexão. Pre-keys só crescem (#2797) — medir `wa_auth_keys` por sessão.                                                                                                                                                                                                                                                                                                                                                            | `baileys.engine.ts:566-612`                                                              | Avaliar com métrica (ganho é inferência); query de contagem de pre-keys.                                                                                                                                                                                                                                                                      | P-052 |

`countryCode` não configurado (payload de login sai `US` numa frota BR): ajustar para `BR` custa
pouco; **sem evidência de efeito sobre restrição** — tratar como coerência, não anti-ban.

### 5.2 whatsapp-web.js (somente se voltar a ser usado — frota atual 0)

- **Build do WA Web fixa** `2.3000.1045101284-alpha` sai do catálogo wa-version em **13/10/2026 07:01 UTC**
  (regra do catálogo = lançamento + ~2 meses; não é prazo da Meta; o HTML é removido na data e um volume
  novo cairia na `live`). Candidata: `2.3000.1046934385-alpha` (expira 07/11); atual do catálogo
  `2.3000.1048289394-alpha` (23/09).
- **Builds de ~17/09 em diante quebram envio de mídia** (`Data passed to getter must include an id
property`, wwebjs #201921/#201922; correção só em PR #201923 / fork WAHA `481db6c`). Relato de rename
  `$1` também em WID (chat ids) → o `getChats` tolerante do patch **descartaria grupos em silêncio**.
- Não há log da **build efetiva** (`client.getWWebVersion()`); relato de 18/09 de pin que não segura.
- Engine reconecta 5× e gera QR sozinho após `LOGOUT`/`TOS_BLOCK`/`CONFLICT` (padrão do B-003);
  pairing code renovado a cada 3 min para sempre com push no celular; auto-heal sem teto.
- Plano completo (patch estendido, build efetiva, override por sessão, canário) → **P-059**;
  memória/CPU → **P-060** e [documento irmão](analise-wwebjs-memoria-2026-09.md).

## 6. Tabela de versões (23/09/2026)

| Componente                                                 | Em uso                                        | Disponível                                                                    | Recomendação                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Baileys                                                    | 7.0.0-rc14                                    | 7.0.0-rc14 (nada novo)                                                        | manter + patch-package (#2751, #2815) — P-051                                                          |
| whatsapp-web.js                                            | tarball `1780711` + patch                     | 1.34.7 (nada novo); main `942d236`                                            | manter; patch estendido só se voltar a usar — P-059                                                    |
| Build WA Web (wwebjs)                                      | `1045101284` (sai do catálogo 13/10)          | `1046934385` / `1048289394`                                                   | canário antes de religar wwebjs — P-059                                                                |
| protobufjs (transitiva)                                    | 7.6.5                                         | 7.6.6 (hardening)                                                             | lockfile — P-054                                                                                       |
| whatsapp-rust-bridge                                       | 0.5.4 (pin exato da rc14, WASM)               | 0.5.5 / 0.6.0-alpha                                                           | manter (não forçar override)                                                                           |
| `@nestjs/*`                                                | 11.2.3                                        | **11.2.6** (legacy) · 12.1.0                                                  | **11.2.6 já** (GHSA-9c5c high) — P-054; Nest 12 depois (piso 12.0.4; nunca 12.0.0/12.0.1) — P-062      |
| fastify                                                    | 5.11.3 (pinado pelo Nest 11)                  | 5.12.5                                                                        | vem com Nest ≥ 12.0.4; override sobre Nest 11 só por decisão do dono                                   |
| `@fastify/multipart`                                       | 10.1.1                                        | **10.1.2**                                                                    | já: a 10.1.1 tem regressão nos limites (upload com 2 arquivos → 500 em vez de 4xx) — P-054             |
| bullmq                                                     | 5.81.4                                        | **5.81.5** · 6.3.8                                                            | **5.81.5 já** (worker volta a consumir após queda do Redis) — P-054; v6 com **ioredis 5** depois       |
| ioredis                                                    | 5.11.1                                        | 6.0.0                                                                         | evitar (RESP3 por padrão; BullMQ não testa com 6)                                                      |
| prisma / client / adapter                                  | 7.10.0                                        | 7.10.0 (fixes na branch v7 não publicados); `prisma@latest` = **8.0.0-rc.15** | manter; **nunca** `prisma@latest` nem o downgrade 6.19.3 do `audit fix`; subir no 7.10.x/7.11 que sair |
| zod (gateway)                                              | 3.25.76                                       | 4.6.5                                                                         | sem ganho para contas; migração gradual via `zod/v4` — P-021                                           |
| dotenv / ulid / proxy-chain / @hapi/boom                   | 16.6.1 / 2.4.0 / 2.7.1 / 9.1.4                | 18.0.3 / 3.0.2 / 3.0.1 / 10.0.1                                               | dotenv 18 imaturo; ulid 3 ok (CJS); proxy-chain 3 oportunista; boom manter (Baileys ^9)                |
| puppeteer (via wwebjs)                                     | 24.38.0 (Chrome 146)                          | 25.11.0 (Chrome 153) / 25.12.0                                                | só após troca de build, override exato na raiz (remove extract-zip) — P-062                            |
| TypeScript                                                 | 5.9.3 (override)                              | 7.0.2 (nativo, sem API programática)                                          | manter; TS 6 só com CLI 12 + tsconfig preparado + guarda `dist/main.js`                                |
| @nestjs/cli / schematics                                   | 11.0.24 / 11.1.0                              | 12.0.5                                                                        | CLI 12 depende de TS ~6.0.2 → depois                                                                   |
| React / react-router-dom / Vite                            | 19.2.8 / 7.18.3 / 8.2.2                       | 19.3.0 / 7.18.4 / 8.3.0                                                       | lote de manutenção (baixo impacto)                                                                     |
| Vitest / unplugin-swc                                      | 4.1.11 / 1.6.0                                | 5.0.1 / 2.0.0                                                                 | Vitest 5 em sessão própria; unplugin-swc 2 ok                                                          |
| eslint / typescript-eslint / prettier / dependency-cruiser | 10.10 / 8.70.0 / 3.9.6 / 18.2                 | 10.11 / 8.70.1 / 3.9.9 / 18.4                                                 | lote de tooling; remover `ts-node` (não usado)                                                         |
| Node (imagens)                                             | `node:26-bookworm-slim` (tag móvel)           | 26.10.0 (26 vira LTS em 28/10/2026)                                           | pinar tag+digest; manter a 26 — P-062                                                                  |
| Base Debian                                                | bookworm (LTS desde 11/07/2026)               | trixie 13.7                                                                   | depois, em deploy próprio (Chromium idêntico hoje: 153.0.8010.52)                                      |
| nginx (dashboard)                                          | 1.27-alpine (imagem parada desde 16/04/2025)  | 1.30.5-alpine                                                                 | trocar, pinado por digest — P-062                                                                      |
| GitHub Actions                                             | checkout v4.2.2 / setup-node v4.4.0 (node20)  | v5+ (node24); Node 20 saiu dos runners em 23/09                               | trocar pinando SHA + `runs-on: ubuntu-24.04` (ubuntu-latest → 26.04 entre 19/10 e 19/11) — P-062       |
| Traefik (borda Dokploy)                                    | desconhecido (install.sh instalava v3.6.7)    | **v3.7.13**                                                                   | se 3.6.x, trocar — B-007                                                                               |
| MinIO                                                      | community (arquivado)                         | `pgsty/minio` (fork corrigido)                                                | B-006; médio prazo RustFS/Garage/SeaweedFS                                                             |
| Redis (prod)                                               | desconhecido (Dokploy sugere redis:8 sem AOF) | 7.4.11 / 8.x / Valkey 8–9                                                     | B-007: AOF com `--requirepass` no MESMO comando (Custom Command substitui o default)                   |
| Postgres                                                   | 18 (minor desconhecida)                       | 18.6 (próxima 12/11)                                                          | confirmar e pinar                                                                                      |
| Dokploy                                                    | v0.30.2 (registrado 25/08)                    | v0.30.7                                                                       | opcional — não resolve start-first, Traefik nem #5171                                                  |

## 7. Segurança que independe de atualização

- **Rate-limit, autoLogging e AuditInterceptor usam `req.url`** (`main.ts:72-73`,
  `app.module.ts:52`, `audit.interceptor.ts:49`): alvo em forma absoluta
  (`POST http://x/api/auth/login`) e **percent-encoding** (`/api/auth/%6Cogin`, `/%61pi/...`,
  origin-form — provavelmente atravessa o Traefik) fazem o teto de login cair de 10/min para
  600/min e mutações escaparem da trilha de auditoria. Reproduzido localmente pelos agentes.
  → `req.routeOptions.url` + e2e (P-053).
- **`npm audit` é cego a advisories de repositório** (Nest GHSA-9c5c, fastify 5.12.2/5.12.5): a
  M4 "npm audit no CI" precisa de checagem periódica de `gh api repos/<owner>/<repo>/security-advisories`
  para nestjs/nest, fastify/*, WhiskeySockets/Baileys, wwebjs, traefik, MinIO fork, Dokploy, redis (P-054).
- `trustProxy:true` + rate-limit por IP: falsificação de IP depende dos bypasses de limpeza de
  `X-Forwarded-*` do Traefik (GHSA-v67p ≤ 3.7.12) → Traefik 3.7.13 (B-007). Não trocar `trustProxy`
  para contagem de saltos enquanto fastify < 5.12.1 (GHSA-3m5p afeta esse modo).

## 8. Infraestrutura e deploy

- **Daily Docker Cleanup do Dokploy (ligado por padrão) + build sem `--pull` + tag única
  `${appName}`:** após cada limpeza, o próximo deploy puxa Node e Chromium novos sem registro; o
  rollback automático do Swarm sobe a mesma tag (código novo). Registrar `node -v`/`chromium --version`
  no boot e no `/health`; pinar digest; médio prazo: imagem construída no CI + registry
  (atenção à issue Dokploy #5453 — apps "Docker image" perdem labels do Traefik).
- **Custom Command do Redis no Dokploy substitui por inteiro** o `redis-server --requirepass <senha>`
  padrão: a linha completa precisa ser
  `redis-server --requirepass <senha> --appendonly yes --appendfsync everysec` (validar `NOAUTH` sem senha).
  Fazer **depois** do bullmq 5.81.5 em produção.
- **Chromium do apt troca de major sozinho** a cada rebuild pós-limpeza (hoje 153.0.8010.52 no
  bookworm-security e no trixie-security). Precedente: no Debian 11 o chromium foi declarado
  "non-supported" antes do fim da distro → planejar trixie (só relevante se wwebjs voltar).
- O entrypoint dá até **50% do cgroup** ao heap do Node (`docker-entrypoint.sh:25-33`) — com 4 GB,
  sobram ~2 GB para tudo o mais (Chromium, se houver).

## 9. Política do WhatsApp e caminho oficial

- **23/09/2026:** Business Messaging Policy alterada (opt-in por "phone number or username"; limites
  "based on this user feedback"; "or limit your ability to send messages"); Messaging Guidelines
  atualizadas; entram em vigor os **WhatsApp Terms for WhatsApp Business App/Platform** — vedam
  scraping, apps que interajam sem consentimento, APIs equivalentes oferecidas a terceiros e
  disfarce de localização por proxy. FAQ de aparelhos vinculados: _"Linking your account to an
  unofficial app or website, now or in the past, may result in a temporary or permanent account ban."_
- **Causas oficiais de desconexão** que hoje aparecem como o mesmo 401/LOGOUT: conta restrita (não
  pode usar aparelhos vinculados), celular sem uso > 14 dias, inatividade de 30 dias no vinculado,
  falha de verificação de sincronização, re-registro do número por terceiro. → Checklist no logout
  (P-048/P-059) e B-003.
- **Limite mensal para quem não responde:** anunciado em 10/2025 como teste; sem página oficial no
  Help Center em 23/09 (TechCrunch 31/07/2026: "being iterated"). Métrica interna de destinatários
  novos sem resposta em 30 dias, sem chamar de limite oficial (P-064).
- **Cloud API (set/2026):** cobrança por mensagem desde 01/07/2025; **serviço e utilidade dentro da
  janela passam a ser cobrados em 01/10/2026**; limites por **portfólio** (250 → 2K → 10K → 100K →
  ilimitado); BSUID nos webhooks desde abr/2026 (telefone omitido para quem usa username); Graph
  v26.0 (29/07/2026); Embedded Signup v2/v3 obsoletos em 15/10/2026; On-Premises API encerrada.
- **Coexistência** (número do app WhatsApp Business também na Cloud API): tira o tráfego do cliente
  não oficial sem QR; o app continua; 20 mps; sem grupos; desvincula todos os companheiros no
  onboarding — **nunca** religar Baileys/wwebjs no mesmo número depois. Exige Tech Provider ou BSP.
  Decisão estrutural do dono (Onda 7, P-064).
- AI Providers: exceção vigente só para usuários **+55 (Brasil)** desde 11/03/2026, cobrada;
  atendimento com IA do próprio negócio segue permitido.

## 10. Engines alternativas não oficiais

- **whatsmeow (Go)** é a lib não oficial mais bem mantida hoje: proto semanal (v1047769893 em
  17/09), pareamento por **passkey** (01/07), `companion_reg_refresh` (09/09), usado em produção pelo
  mautrix-whatsapp. Piloto como sidecar só **depois** das Ondas 1–3 (engine.factory hoje cai em
  Baileys para engine desconhecida; ~42 operações da IEngine). Economia de RAM vs Baileys pequena.
- **zapo-js** (TS, 1.9.0 em 20/09, passkey, store Postgres): só laboratório (mantenedor único).
- **Forks do Baileys no npm** (dezenas em 30 dias): **evitar** — sem ganho verificável, risco de supply-chain.
- **Passkey no vínculo** (relatos desde ~30/06): suportado por whatsmeow/whatsapp-rust/zapo-js;
  ausente em Baileys, wwebjs e wa-js. Hipótese para parte das falhas de pareamento — checar no celular.

## 11. Conflitos resolvidos e o que NÃO fazer

- **Não** rodar `npm audit fix --force` (downgrade do Prisma para 6.19.3 / quebra do pin do wwebjs).
- **Não** instalar `prisma@latest` (aponta para o 8.0.0-rc.15, reescrita da camada de dados).
- **Não** subir TS 7 (sem API programática: quebra `nest build`, typescript-eslint < 6.1.0, dependency-cruiser).
- **Não** usar ioredis 6 (RESP3) nem Nest 12.0.0/12.0.1 (vulneráveis ao GHSA-9c5c).
- **Não** fixar Baileys master/develop nem usar forks; correções via `patch-package` mínimo.
- **Não** tirar o domínio da API do MinIO (quebra mediaUrl do n8n — R0); fechar só o console.
- **Não** fazer deploy de emergência pela "versão Baileys vencendo 25–26/09" (refutado).
- **Não** combinar no mesmo deploy: build do WA Web + Chromium/base Debian + puppeteer + UA.
- **Não** transformar 440 em terminal antes de existir lease (o container que sai grava status e
  derruba a reidratação — mecanismo do P-043).
- **Não** introduzir 429 novos no contrato de uma vez: o node n8n 0.4.1 só trata 423
  (`body.message/reason/code`); qualquer outro não-2xx vira erro. Gates novos entram como métrica/config.

## 12. Ondas de execução

Ordem: estabilidade das contas → segurança → manutenção. Tudo em `feature/*`, e2e de efeito (R6),
deploy em janela calma (R0). **Frota 100% Baileys → deploy não exige re-scan**, então as ondas
podem ser separadas sem custo de conta.

- **Onda 0 — dono, sem código:** B-004 (stop-first), B-005 (backup), B-006 (MinIO), B-007
  (diagnóstico + Traefik + painel + Redis + teste de pareamento Baileys), B-003 (checklist + 2FA).
  _Aceite:_ `docker service inspect` mostra `stop-first` nos dois configs; no 1º deploy seguinte o
  antigo encerra antes da reidratação do novo, sem 440/"replaced"; backup externo restaurado com
  contagens iguais; respostas do diagnóstico registradas em PENDENCIAS com data e comando.
- **Onda 0B — reconciliação documental (só docs):** itens do §3 (P-063). _Aceite:_ push só de docs
  não dispara build (Watch Paths).
- **Onda 1 — guardas de build + patches de segurança (deploy A):** P-055 (`patch-package
--error-on-fail`, grep do patch no Dockerfile, `test -f apps/gateway/dist/main.js` no CI e no
  Dockerfile) — **pré-requisito do stop-first** · P-054 (Nest 11.2.6, multipart 10.1.2, bullmq
  5.81.5, protobufjs 7.6.6) · P-053 (`routeOptions.url`). _Aceite:_ build com patch corrompido
  FALHA; e2e: login em forma absoluta e `%6Cogin` → 429 no 11º, mutação em `/%61pi/...` auditada,
  upload com 2 arquivos → 4xx; spec do P-041 verde; restart do Redis > timeout de bloqueio em dev
  (`NODE_ENV=development`, o e2e não sobe Worker) → job de webhook consumido.
- **Onda 2 — Baileys (deploy B):** P-047, P-048, P-049, P-050, P-051, P-052. _Aceite:_ unit por
  código de desconexão; 405 gera alerta e não 5 reconexões; sessão de teste cai, recebe mensagem e
  volta → webhook/Inbox recebem (inclusive lote misto) sem duplicar ecos; ERROR 463 simulado grava
  sinal e emite evento aditivo (contracts + INTEGRACAO); download pendurado cai no fallback ≤ 120 s
  e sai pelo IP do proxy; `POST /pairing-code` em sessão WORKING → 409; `Curve.verify(pub,msg,zeros)` = false.
- **Onda 3 — exclusividade e ritmo (deploy C):** P-056 (lease/fencing por sessão + auth store em
  transação + authEpoch + engines "draining"), P-057 (campanhas), P-058 (proxy), DEGRADED com
  retentativa lenta só para queda de rede. Depois o dono liga `WA_REQUIRE_PROXY=true` (B-001) e faz
  Redeploy. _Aceite:_ 2 processos na mesma sessão → só um conecta; campanha pausada 10 min e
  retomada sem envios abaixo do espaçamento; restart com jobs vencidos sem FAILED por "sessão não
  iniciada"; queda de proxy > 2 min volta sozinha ≤ 15 min; reconexão mantém o mesmo proxy.
- **Onda 4 — borda e infra (dono, paralelizável):** Traefik v3.7.13, MinIO fork, Redis AOF,
  Postgres pin, nginx 1.30.5, Actions node24 + `ubuntu-24.04` (P-062).
- **Onda 5 — manutenção, um major por deploy (P-062):** Nest 12.1.x só no runtime (CLI 11 + TS
  5.9.3; e2e de contrato do node n8n: corpo de 423/409/400/401 + CRUD `/api/webhooks`; ordem de
  shutdown), tsconfig pronto para TS 6, Node pinado, BullMQ 6 com ioredis 5, ulid 3, Vitest 5,
  React 19.3/RR 7.18.4, tooling.
- **Onda 6 — wwebjs (só se decidir voltar):** P-060 (perfil leve de memória) + P-059 (patch/build/canário).
- **Onda 7 — redução estrutural (decisão do dono):** P-064 (oficial/coexistência, BSUID, métricas
  e regras de produto, inventário pessoal × Business, piloto whatsmeow) + P-061 (D-xxx da frota).

## 13. Rastreabilidade → pendências

B-004 · B-005 · B-006 · B-007 (novos) · B-003 (ampliado) · P-047..P-064 em
[PENDENCIAS.md](PENDENCIAS.md) § "Análise de atualizações — 23/09/2026". Itens da auditoria de 09/09
relacionados: WA-03/WA-11/WA-20 → P-048/P-049; WA-16 → P-058; WA-19/P-037 → P-056; ABE-01/A1 →
B-005; UP-10/ABE-23 → P-055/P-062; P-012 → P-048; P-021 → P-062; P-040 → P-063.

## 14. Perguntas em aberto (dependem de produção ou do dono)

- Versões reais de Traefik, Redis (e AOF), Postgres, MinIO (imagem/root), Node e Chromium no container.
- O Update Config ainda está vazio no Dokploy novo? (A migração de 31/08 pode ter perdido config.)
- Houve pareamento Baileys **novo** bem-sucedido depois de 29/07? (define urgência do #2737/#2765)
- Logs com `smax-invalid (479)`, `reachout timelock`, `message capping`, 403/405/440?
- Modo/estratégia de proxy por sessão (alguma em ROUND_ROBIN/RANDOM troca IP a cada reconexão?).
- As campanhas nativas do gateway estão em uso ou o ritmo vem todo do n8n?
- Decisão do P-012: sinal duro (403/463/TOS_BLOCK) leva a sessão a `banida` (travada, com
  `GUARDRAIL_ENFORCE=true`) ou só registra e alerta?
- Números da frota: pessoais ou WhatsApp Business? 2FA com e-mail ativo?

## 15. Fontes principais (datas de consulta: 23/09/2026)

- Dokploy v0.30.2 `packages/server/src/utils/docker/utils.ts:681-696` (default UpdateConfig/RollbackConfig start-first).
- GitHub Security Advisories: `nestjs/nest` GHSA-9c5c-9qcx-q35q · `minio/minio` GHSA-hv4r-mvr4-25vw (CVE-2026-41145) · `traefik/traefik` GHSA-w4v4-9rw7-5326, GHSA-f52w-8j3h-j724, GHSA-v67p-phpq-fc8x · fastify GHSA-w2qp-rph6-63g4, GHSA-3m5p-2c4r-xxw2.
- Baileys: releases/tags/milestones via API; issues/PRs #2733, #2737, #2750, #2765, #2781, #2789, #2797, #2810, #2815, #2825, #2751 (develop); wiki `baileys.wiki-site` (configuration).
- whatsapp-web.js: #201653, #201697, #201901, #201910, #201919, #201921–#201926, #201930; wppconnect-team/wa-version `versions.json`.
- whatsmeow commits `9ec8f76` (companion_reg_refresh), PR #1186 (passkey), proto `2e338d0`.
- WhatsApp: Business Messaging Policy e Messaging Guidelines (23/09/2026); WhatsApp Terms for Business App/Platform (vigentes 23/09/2026); FAQs "About linked devices", "About restricted accounts", "Your devices were logged out"; Meta Newsroom 11/03/2026 (alerta de vinculação suspeita); developers.facebook.com (pricing, coexistence, BSUID, messaging limits, Graph v26.0).
- Node.js release schedule (26 → LTS 28/10/2026); Debian security tracker (chromium 153.0.8010.52; DSA-6508-1, DLA-4790-1); nginx.org (1.30.5 stable); GitHub Changelog (Node 20 removido dos runners em 23/09/2026; ubuntu-latest → 26.04).
- Lista completa por item, com verificação adversarial e ressalvas: [reference/analise-atualizacoes-2026-09.json](reference/analise-atualizacoes-2026-09.json).
