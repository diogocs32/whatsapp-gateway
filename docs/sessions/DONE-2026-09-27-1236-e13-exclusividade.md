---
id: e13-exclusividade
inicio: 2026-09-27 12:36 BRT
branch: feature/onda3-e13-exclusividade
base: origin/main 78d0f27 (PR #18 da E26 mergeado)
etapa: E13 / P-056
---

# E13 — exclusividade de sessão entre processos

## ECO DE LEITURA (R9 v4.3)

- `ESTADO.md`: main à frente da produção documentada `768fb26`; deploy manual continua com o dono.
- `SESSOES.md`: aviso E27 exige preservar `runExclusive` por processo e teto em toda operação; E26/D-038 preserva as atribuições órfãs de proxy.
- `PENDENCIAS.md`: P-056 cobre lease/fencing e auth transacional; B-004 registra o start-first e continua sendo ação operacional do dono.
- `ROTEIRO-ONDAS-2026-09.md`: E13 abre Onda 3; uma etapa/PR, CI verde, merge ao fim; sem deploy nem conta real.
- `MAPA-CODIGO.md` §§3.4, 3.11, 5.1: start-first duplica sockets/escritores; shutdown não grava status; guard de engine órfã e dedup de status devem continuar.
- `DECISOES.md` D-038: exclusões no container antigo durante start-first não criam sugestão; E13 não altera a memória de proxy.

## Fontes de biblioteca verificadas antes de editar

- `npm ls`: Baileys 7.0.0-rc14, whatsapp-web.js 1.34.7, Prisma 7.10.0; `npm view … dist-tags`: Baileys latest rc14, wwebjs latest 1.34.7.
- Baileys oficial: `https://github.com/WhiskeySockets/Baileys/blob/master/README.md` (auth state e persistência de Signal keys); versão instalada: `node_modules/@whiskeysockets/baileys/lib/Socket/socket.js` e `lib/Utils/auth-utils.js` (store e transações internas).
- PostgreSQL 18, espelho oficial `~/dioggo-agents/agentes/docs/postgresql/18/postgresql-18-full.txt`: linhas 34490–34519 (locks de linha em UPDATE) e 20049–20059 (`clock_timestamp()` usa tempo real, distinto de `now()` na transação).
- Prisma v7 oficial: `https://www.prisma.io/docs/orm/prisma-client/queries/transactions` (`$transaction` interativa e `updateMany` condicional); tipos da versão instalada serão conferidos no typecheck.

## Plano

1. Lease/epoch atômico no Postgres, antes do start, renovado e liberado só após desligar a engine; fencing de auth/status.
2. `keys.set` e `saveCreds` transacionais e serializados por epoch; drenar imediatamente na perda de posse.
3. Provar duas instâncias sobre o mesmo Postgres, sem socket real; rodar gates, revisar o diff e reconciliar docs.

## BLOQUEADO EM VOCÊ

- Nenhum para merge/código. Antes do primeiro deploy da E13: confirmar B-004 `stop-first` no
  `UpdateConfig` e `RollbackConfig` do serviço, backup/restore B-005 e janela controlada com chip
  B-007. Manter WWEBJS em stop-first depois da E13. Deploy C/aceite real só após E15, pelo dono.

## DOCS TOCADAS

- Este DONE; `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/PENDENCIAS.md`,
  `docs/ROTEIRO-ONDAS-2026-09.md`, `docs/DECISOES.md` (D-039), `docs/MAPA-CODIGO.md`,
  `docs/reference/mapa-codigo/`, `docs/ARQUITETURA.md`, `docs/INTEGRACAO.md`, `CHANGELOG.md`.

## Checkpoint R9

- **Entregue:** P-056/E13 em `feature/onda3-e13-exclusividade`, PR #19: lease PostgreSQL por sessão
  (`authEpoch`/owner/prazo), auth Baileys e status cercados por transação, `FencedLocalAuth` por
  epoch/geração e rename do perfil sob lock, drenagem após perda, 409 transitório para ciclo de
  vida em outra réplica e campanha reprogramada sem FAILED. P-096 corrigida; resíduo de perfil
  descartado vira P-098. Nenhum contrato `/api` de sucesso mudou.
- **Prova local:** migration aditiva aplicada só ao Postgres local e `prisma migrate status` em dia;
  2 SessionManagers sobre o mesmo Postgres/Redis com engine falsa; 1.304/1.304 testes gateway e
  292/292 painel; typecheck, depcruise, builds dos 2 apps, mapa e lint/formato dos arquivos tocados
  verdes. `npm run lint`/`format:check` globais enxergam apenas os dois arquivos `seed-mock`
  não versionados pré-existentes; foram preservados fora do PR.
- **Limite:** sem conta, QR, mensagem ou deploy real. No primeiro deploy, N-1 não reconhece a lease;
  para WWEBJS o Chromium/perfil compartilhado exige stop-first mesmo após esta etapa. O fencing
  SQL impede a escrita velha no banco, mas não cancela RPC ao WhatsApp já iniciado.
- **Reconciliação (R3):** §3.3/3.4/3.11 e P-056 do MAPA-CODIGO deixaram de dizer que não havia
  lease/auth transacional; P-096 foi fechada no quadro e P-098 foi aberta. Integração, arquitetura,
  estado, roteiro e changelog distinguem merge de deploy. Aviso E13 foi deixado em SESSOES para E14.
- **Integração:** PR #19 com checks `ci` e `imagens` verdes, merge na `main` ao encerrar a etapa;
  nenhum deploy foi executado.
