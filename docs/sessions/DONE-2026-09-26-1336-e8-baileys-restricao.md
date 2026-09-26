# Sessão: e8-baileys-restricao

- **Status:** ✅ ENCERRADA — E8/P-048 em código no PR #11, sem merge/deploy.
- **Início:** 26/09/2026 13:36 BRT.
- **Objetivo:** usar os sinais nativos de restrição do Baileys para pausar envios da sessão até `timeEnforcementEnds`, alertar e retomar automaticamente.
- **Escopo:** `sessions/infrastructure/baileys`, `SessionManager`, guardrail, envios/campanhas necessários ao gate, contratos de evento, testes unit/e2e e documentação. Pontos globais previstos: `packages/contracts`, `docs/INTEGRACAO.md`, `docs/MAPA-CODIGO.md` e referência gerada.
- **Fora do escopo:** E9–E12, alterações em `lid-envio-wwebjs`, conta real, mensagem real, merge e deploy.
- **Branch:** `feature/onda2-baileys`, PR #11 aberto para `main`, baseado na Onda 6 enquanto o PR #10 estiver aberto.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E7/P-047 entregue em código no PR #11, ainda sem merge/deploy. Produção segue no último SHA documentado `768fb26`; canário da Onda 2 fica para depois da E12.
- **SESSOES:** a única ATIVA alheia é `lid-envio-wwebjs`, escopo disjunto. Avisos E22–E24 obrigam preservar `describeBaileysMessage`, reação fora de `message`, participante de grupo e `raw` inbound; E7 tornou `onMessagesUpsert` assíncrono e mantém dedupe antes do EventBus.
- **PENDENCIAS:** assumida P-048; B-004/B-005/B-007 e P-034/P-056 seguem como limites operacionais ou de outra etapa.
- **ROTEIRO:** E8 na mesma branch e PR da E7, sem merge/deploy; sinais `reachoutTimeLock`, `message-capping.update`, ERROR 463; contar 479, evento aditivo e 423, testes unit/e2e, mapa e runbook, CI verde.
- **MAPA-CODIGO §3.2/§5.1:** `canSendCold` só cobre cold; pausa geral precisa passar por `SessionManager` sem ciclo de módulos. ACK de erro não deve ser perdido antes do tratamento. Novo evento público exige `WEBHOOK_EVENTS`, contratos e INTEGRACAO.
- **E7 DONE:** `append` inbound até 48 h, dedupe cache+banco; testes de efeito cobrem webhook/Inbox/reply-rate e preservam os formatos da E22–E24.
- **D-022:** sinal duro pausa até o prazo informado e alerta, com volta automática; não marca banida.
- **Fontes Baileys:** instalado `@whiskeysockets/baileys@7.0.0-rc14` via `npm ls`; `npm view @whiskeysockets/baileys dist-tags` e [releases oficiais](https://github.com/WhiskeySockets/Baileys/releases) confirmaram rc14 como candidata atual; wwebjs instalada/publicada segue 1.34.7. Context7 oficial `/whiskeysockets/baileys` documenta `fetchAccountReachoutTimelock()` e eventos `connection.update`/`message-capping.update`. Assinaturas e o ramo 463 foram conferidos na rc14 instalada em `node_modules/@whiskeysockets/baileys/lib/Socket/{socket,messages-recv}.js` e `lib/Types/{Events,State}.d.ts`.

## Progresso

- 13:36 — leitura R9, E7, P-048, D-022, mapa e roteiro; branch e PR #11 confirmados; arquivos locais não versionados preservados.
- 13:45 — migration aditiva de restrição temporária aplicada apenas no Postgres local, client Prisma gerado; `BaileysEngine` liga os três sinais via callback local, consulta RPC com timeout e limite, conta 479; `GuardrailService` grava o prazo e publica `session.restricted` sem marcar `banida`.
- 13:55 — gate de todo envio de mensagem no `SessionManager`, 423 HTTP preservado, campanha re-agenda sem `PAUSED`, ACK ERROR persiste `error`; contracts, INTEGRACAO e testes unit/e2e atualizados. Revisão cética corrigiu precedência do prazo confirmado, limpeza dos listeners, gate 423 do encaminhar antes do preparo e a ordem de checagem de sessão desconectada.
- 14:03 — `npm run test:unit`: 501 gateway + 180 painel; `npm run test`: 785 gateway (61 arquivos) + 180 painel; sem conexão/envio real. Typecheck, depcruise e builds gateway/painel passaram. O lint/formato globais apontaram só os arquivos locais preexistentes não versionados `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts`; ESLint e Prettier dos arquivos da E8, Prisma validate e `mapa-codigo --check` passaram. O CI do PR é conferido sobre o HEAD final após o push deste checkpoint.

## Checkpoint R9

- **BLOQUEADO EM VOCÊ:** merge, deploy e canário com chip dependem de ordem/janela posterior; B-004/B-005/B-007 permanecem.
- **DOCS TOCADAS PELO DIFF:** `INTEGRACAO`, `MAPA-CODIGO` + referência gerada, `ARQUITETURA` (sessions → guardrail), `PENDENCIAS`, `DECISOES` (registro de execução da D-022), `ROTEIRO-ONDAS`, `SESSOES`, `ESTADO`, `CHANGELOG`, este arquivo e `how-to/canario-baileys-onda2.md`. Contrato público `session.restricted`/ACK `error` em `packages/contracts` no mesmo commit da INTEGRACAO; schema/migration aditiva; painel atualizado para ACK `error`.

## Encerramento

- **Resultado para a E9:** P-048 entregue em código, com pausa persistida pelo prazo e liberação por relógio. `timeEnforcementEnds` confirmado prevalece sobre o ciclo do capping; se o Baileys não fornecer prazo, há pausa provisória de 60 s e alerta `source=temporary`, que não comprova a liberação remota. A E9/P-049 deve preservar o gate e o callback local ao refatorar `onConnectionUpdate`, `connect` e a política de versão; continuar na mesma branch e PR.
- **Pendências:** merge/deploy B e canário com chip após E12, com B-004/B-005/B-007; P-034 (outbox) e P-056 (exclusividade de sessão) seguem abertos. Não induzir 463 numa conta real para testar E8.
- **Reconciliação R3:** o diff tornou falsas as afirmações de que `message-capping.update` não era assinado, `recordHardSignal` não tinha chamador no Baileys, o gate só cobria cold e os listeners novos não eram limpos; todas foram corrigidas no `MAPA-CODIGO` e em `PENDENCIAS`. Mudança de relação sessions → guardrail registrada em `ARQUITETURA`; evento/status/health e 423 documentados em `INTEGRACAO`. Sem alteração de formato das mensagens E7/E22–E24.
