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

- Nenhum para implementar. Deploy manual e aceite com chip continuam exclusivamente com o dono após a Onda 3.

## DOCS TOCADAS

- Este arquivo; `SESSOES.md`, `ROTEIRO-ONDAS-2026-09.md` (abertura). Encerramento pendente.
