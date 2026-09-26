# Sessão: e8-baileys-fonte-prazo

- **Status:** 🟡 ATIVA — revisão da E8/P-048 no PR #11, sem merge/deploy.
- **Início:** 26/09/2026 14:21 BRT.
- **Objetivo:** distinguir prazo confirmado pelo RPC do fallback de 60 s fabricado pela notificação Baileys rc14.
- **Escopo:** `baileys.engine.ts`, guardrail, testes unit/e2e e documentação da E8. Pontos globais: `docs/SESSOES.md`, `docs/ROTEIRO-ONDAS-2026-09.md`, `docs/MAPA-CODIGO.md`, `docs/INTEGRACAO.md` e contratos somente se o payload mudar.
- **Fora do escopo:** E9–E12, conta/mensagem real, merge/deploy e sessão `lid-envio-wwebjs`.
- **Branch:** `feature/onda2-baileys`, PR #11, HEAD inicial `880c330`.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E7/E8 já entregues em código no PR #11; produção segue no último SHA documentado `768fb26`; deploy/canário B só após E12.
- **SESSOES:** `lid-envio-wwebjs` é a única sessão ativa alheia. E7 e E22–E24 exigem preservar upsert/append, reação fora de `message`, remetente de grupo e `raw` inbound.
- **PENDENCIAS:** P-048 estava marcada como entregue em código; esta revisão corrige a procedência do prazo sem alterar a decisão D-022. B-004/B-005/B-007, P-034/P-056 continuam.
- **ROTEIRO:** mesma branch e PR, sem merge/deploy; testes unit/e2e, mapa e documentação reconciliados, CI verde ao fim.
- **MAPA-CODIGO §5.1:** gate no `SessionManager`, estado persistido em `session_guardrail`, alerta `session.restricted`; RPC com timeout 3 s e intervalo 30 s.
- **E7 DONE e E8 DONE:** append com dedupe antes do EventBus; E8 provou 423, webhook, retomada e ausência de banida, mas não distinguiu fallback da notificação.
- **D-022/INTEGRACAO:** `timeEnforcementEnds` no alerta deve representar prazo confirmado pelo WhatsApp; a pausa expira pelo relógio sem `banida`.
- **Baileys rc14 instalado e fonte oficial:** `npm ls` confirmou `7.0.0-rc14`; `lib/Socket/messages-recv.js:167-170` fabrica `Date.now()+60000` se a notificação não trouxer `time_enforcement_ends`. O tag oficial `v7.0.0-rc14/src/Socket/messages-recv.ts:304-307` documenta esse fallback no código. `lib/Socket/socket.js:906-917` mostra que o RPC retorna `undefined` quando o campo remoto falta e também emite `connection.update`.

## Progresso

- 14:21 — suíte base passou (785 gateway + 180 painel); revisão encontrou classificação incorreta da origem do prazo de notificação. CI remoto no HEAD inicial `880c330`: `ci` e `imagens` verdes.
- 14:27 — notificação ativa gravada como `temporary` com seu prazo; RPC em background confirma só a resposta direta. `GuardrailService` aceita a data provisória, permite sua extensão sem estender 463 repetido e promove o prazo confirmado. `timeEnforcementEnds` do alerta continua nulo até a confirmação. Corrigidos comentários de ACK e schema.
- 14:29 — testes: 505 unit gateway + 180 painel; suíte completa 789 gateway + 180 painel; e2e cobre 423, webhook, ACK, retomada por avanço do relógio sem alterar a linha e regressões E7/E22–E24. Typecheck, depcruise, builds gateway/painel e mapa atualizado passaram. `npm run lint` falha só no `seed-mock.js` local não versionado; `format:check` aponta só `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts` preexistentes, além de dois docs desta revisão que foram formatados depois. `npm view` confirma rc14 e wwebjs 1.34.7 como `latest`.
- 14:36 — revisão adversarial detectou capping que encurtava o prazo provisório e RPC que respondia após o teto de espera; ambos corrigidos. Um eco `connection.update` do próprio RPC pode publicar alerta provisório adicional antes da confirmação, sem alterar a precedência do prazo; a sequência está documentada para integradores. Suíte final: 507 unit gateway + 180 painel; 791 gateway + 180 painel no teste completo. Typecheck, depcruise, builds e mapa conferidos novamente. Lint/formato dos arquivos tocados passaram; os comandos globais falham só nos dois `seed-mock` locais não versionados.

## Checkpoint R9

- **BLOQUEADO EM VOCÊ:** merge/deploy/canário seguem para ordem posterior, após E12.
- **DOCS TOCADAS PELO DIFF:** `INTEGRACAO`, `MAPA-CODIGO` + referência gerada, `PENDENCIAS`, `ESTADO`, `DECISOES` (nota de execução da D-022), `ROTEIRO-ONDAS`, `SESSOES`, `CHANGELOG`, runbook do canário e este arquivo; comentário em `packages/contracts` no mesmo commit de `INTEGRACAO`. Sem novo payload público, rota ou migration.

## Encerramento pendente

- CI do novo HEAD e atualização do PR #11 após o push; sem merge/deploy. A E9 preserva a classificação provisória da notificação e a confirmação do prazo somente pelo resultado do RPC.
- **Reconciliação R3:** `connection.update` passou a acionar consulta em background e a ser sempre provisório; todas as afirmações contrárias foram corrigidas nos docs de integração, mapa, decisão, estado, pendência, roteiro e runbook. A migration existente não mudou.
