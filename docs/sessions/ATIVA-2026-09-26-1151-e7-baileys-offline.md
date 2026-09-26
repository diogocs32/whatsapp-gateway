# Sessão: e7-baileys-offline

- **Status:** 🟢 ATIVA — E7/P-047, sem merge/deploy.
- **Início:** 26/09/2026 11:51 BRT.
- **Objetivo:** entregar mensagens Baileys recebidas durante queda, reconexão ou deploy ao webhook, Inbox e reply-rate.
- **Escopo:** `sessions/infrastructure/baileys`, persistência de mensagens, testes de efeito e documentação. Pontos globais possíveis: `schema.prisma`, migration, `packages/contracts`, `docs/INTEGRACAO.md`, `docs/MAPA-CODIGO.md` e referência gerada.
- **Fora do escopo:** E8–E12, conta real, envio real, deploy, merge e arquivo ATIVA da sessão `lid-envio-wwebjs`.
- **Branch:** `feature/onda2-baileys`, a partir de `origin/feature/onda6-wwebjs` (`836336c`), pois PR #10 segue aberto; `origin/main` conferida em `43f5843`.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** Onda 6 E6 está no PR #10 com CI verde, sem merge/deploy; último SHA de produção documentado é `768fb26`. E7/P-047 é a próxima etapa.
- **SESSOES:** `lid-envio-wwebjs` é a única sessão ativa; escopo distinto. Avisos E22/E23/E24 exigem preservar `describeBaileysMessage`, reação apenas em `message.reaction`, participante como remetente de grupo e `raw` inbound para encaminhar. O aviso E6 protege regras WWEBJS fora do escopo.
- **PENDENCIAS:** assumida P-047; B-004/B-005/B-007 e canários dependem do dono em janela posterior.
- **ROTEIRO:** um PR por Onda 2, E7 nesta sessão; E8–E12 continuarão na mesma branch, sem merge/deploy nesta etapa. Base na Onda 6 enquanto PR #10 estiver aberto.
- **MAPA-CODIGO §3.2/§5.1:** filtro global de `append` perde inbound offline; `sentMessages` sozinho não cobre ecos após restart; falta unique em `(sessionId,keyId)`; o efeito precisa atravessar EventBus, banco, webhook, SSE/Inbox e reply-rate.
- **INTEGRACAO §3.2:** preservar tipos/textos fiéis, contrato da reação e `senderJid` de grupo.

## Progresso

- 11:51 — base remota conferida, branch aberta e arquivos locais não versionados preservados.
- 11:54 — versão instalada `@whiskeysockets/baileys@7.0.0-rc14` e `npm view … dist-tags` conferidos (latest rc14). Documentação oficial: [Receiving Updates](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/receiving-updates.md) descreve `notify`/`append` e a iteração de todas as mensagens; fonte da versão instalada em `node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js:1432` (offline → append) e `messages-send.js:1135-1138` (`emitOwnEvents` → append).
- 11:58 — `upsert-decision.ts`: janela de 48 h, tolerância de 5 min futuro, filtro de eco `fromMe` no append, status/newsletter e key inválida; `onMessagesUpsert` mantém describe, remetente de grupo e raw, usa cache de keyId + consulta `(sessionId,keyId)` antes de emitir. Sem campo público/migration.
- 12:03 — validação: 493 unit gateway, 776 testes gateway no `npm run test`, 180 painel; tsc, depcruise, builds gateway/painel e mapa `--check` passaram. E2E novo atravessa DB, job do webhook, Inbox e reply-rate com lote misto e replay após engine nova. `npm run lint` e `format:check` globais só falham nos arquivos locais não versionados preexistentes `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts`; ESLint/Prettier dos arquivos da E7 passaram.

## Checkpoint R9

- **BLOQUEADO EM VOCÊ:** merge/deploy e canário com chip ficam para outra ordem/janela; B-004/B-005/B-007 permanecem abertos.
- **Limites:** a dedupe após restart é sequencial, pois `wa_messages` não tem unique `(sessionId,keyId)`; duas instâncias simultâneas seguem P-056/B-004. EventBus sem outbox (P-034) não cobre queda no instante entre emissão, persistência e enqueue. `append` de `fromMe` fica no backfill, sem handoff falso.
- **DOCS TOCADAS PELO DIFF:** `INTEGRACAO`, `MAPA-CODIGO` + referência gerada, `PENDENCIAS`, `ROTEIRO-ONDAS`, `SESSOES`, este arquivo e runbook do canário; `ESTADO`/`CHANGELOG` no fechamento. Sem mudança de contrato, schema, migration, rota ou painel.
