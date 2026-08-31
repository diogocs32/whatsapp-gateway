# Sessão: envio-sem-onwhatsapp

- **Status:** 🟢 ATIVA — código pronto e validado local; **aguardando janela de deploy do dono** (push na main = deploy)
- **Início:** 31/08/2026 17:30 (BRT)
- **Objetivo:** remover a consulta de existência `onWhatsApp` do caminho de envio da engine
  Baileys (`resolveJid`). Motivo duplo, medido em produção HOJE (campanha da Dra. Merabe):
  (1) **quebra viva** — pós-reconexão, `onWhatsApp` volta vazio/`exists:false` para números
  válidos (13 dígitos BR) e TODO envio morre com `O número X não está no WhatsApp` →
  `BadRequestException` (400 genérico no cliente n8n); 6 envios reais falharam entre 12:03 e
  15:43 BRT em 4 sessões diferentes; (2) **política do dono (31/08, campanha):** não existe
  checagem de existência no caminho de envio (padrão contact-check arrisca ban de chip) —
  permissão é o único critério de bloqueio; destino inexistente simplesmente não entrega e o
  ledger de ACKs conta essa história.
- **Escopo (pode tocar):** `apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts`
  (só `resolveJid`) · docs de sessão/pendências/changelog.
- **Fora do escopo (não tocar):** mecânica `cold` inteira (guardrail/anti-ban — decisão do dono:
  fica) · `candidateJids` (inbound; fica MAIS necessário) · `checkNumbers`/`/contacts/check`
  (produto genérico; campanha proibida por gate próprio) · wwebjs (`toChatId` já é o modelo) ·
  contrato `/api` (R0 — nenhum campo muda) · `feature/detector-nao-entrega` (não embarca).
- **Branch:** fix/envio-sem-onwhatsapp (criada de `main` `a0955c8`)

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** M3 concluída e em produção 18/08; próxima onda M4. Divergência conhecida:
  ESTADO ainda descreve produção no Dokploy antigo — produção REAL hoje é o Dokploy em
  89.116.73.121 (projeto `conexozenvo`, app `gateway`; api.conexozenvo.cloud vivo, storage
  MinIO criado 31/08 e `checks.storage=true`). Reconciliar no encerramento.
- **SESSOES.md:** nenhuma sessão ativa antes desta; aviso de CI novo (18/08) lido.
- **PENDENCIAS.md:** P-020 (dedup alertas: código pronto, aguarda deploy — **carona natural
  neste deploy**, decisão do dono) · P-021 majors deferidos (não toco deps) · P-015/P-014
  resolvidas. Novas desta sessão: P-023, P-024 (abaixo).
- **Travas:** TS 5.9.3 · wwebjs tarball `1780711` · jobId sem `:` · forward-only ·
  NUNCA `nest build` com watch · push na main dispara deploy stop-first (janela é do dono).

## O que foi feito (31/08)

1. `resolveJid` reduzido a `return toJid(to);` — sem `onWhatsApp`, sem throw de existência,
   sem `contacts.record(source:'onwhatsapp')` (órfão removido junto). Assinatura `async`
   preservada → zero mudança nos 5 call sites.
2. Validação local completa: `lint` ✓ · `format:check` ✓ (só o doc não-rastreado
   `DOCUMENTO_UNIVERSAL_v4.3.md` de outra sessão avisa — não tocado) · `depcruise` ✓
   (176 módulos, 0 violações) · `tsc --noEmit` ✓ · `test:unit` 28/28 ✓. E2e não rodou nesta
   máquina (sem Docker local) — CI roda no push.
3. Prova pendente (pós-deploy): envio de teste ao número do dono por sessão Baileys → 2xx
   e ACK evoluindo além de `sent`; grep de `onWhatsApp` no src aponta só `checkNumbers`.

## Pendências abertas por esta sessão

- **P-023** — 9º dígito BR determinístico em `toJid` (local, sem rede): sem o `onWhatsApp`,
  número móvel grafado sem o 9 segue cru e pode não entregar (ACK para em `sent`).
  Base atual da campanha é ~toda 13 dígitos; decidir com calma, com teste, fora do hotfix.
- **P-024** — renomear `cold`→`firstContact` no fio (HTTP + node + `modo cold_ok`):
  cosmético; se um dia, aditivo-primeiro (gateway aceita ambos → node → workflows → derruba
  o velho). Nunca gateway-primeiro.
