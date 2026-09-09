# Sessão: baileys-shutdown

- **Status:** ✅ ENCERRADA 09/09 — mergeada (PR #3, `301d42d`) e **em produção** (18:15 UTC); ver "Validação em produção" no fim
- **Início:** 09/09/2026 17:45 (BRT) — na mesma conversa que validou o deploy `4af6f9b`
- **Objetivo:** P-043 — dar ao Baileys um `shutdown()` que fecha o socket SEM persistir status,
  para o número (Diogo) reidratar sozinho no deploy stop-first. Achado ao investigar, a pedido do
  dono, por que o Diogo aparecia STOPPED enquanto enviava normalmente.
- **Escopo (tocou):** `modules/sessions/infrastructure/baileys/baileys.engine.ts` (novo
  `shutdown()` + spec), `modules/sessions/application/engine.port.ts` (comentário do
  `shutdown?()` corrigido), docs.
- **Fora do escopo:** wwebjs, contratos, schema, deps, o fluxo de mensagens.
- **Branch:** `feature/baileys-shutdown-sem-persistir-status` (base `4af6f9b` = produção).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** produção = `4af6f9b` (logs sem erro batido, 09/09 17:27 UTC). Esta branch NÃO
  está em produção.
- **SESSOES.md:** `lid-envio-wwebjs` (alheia) segue ativa — não toco.
- **PENDENCIAS.md:** P-043 criada; P-042 remete a observação do Baileys para cá. B-003 segue no dono.
- **Travas:** TS 5.9.3 · Baileys rc14 intocado (só a engine wrapper) · sem migration · sem mudança
  de contrato `/api` (R0) · push na main = deploy stop-first (janela do dono).

## Diagnóstico (evidência de produção — pedido do dono: "veja se não foi eu ter parado manual")

- O dono viu Diogo (Baileys) em STOPPED e perguntou se não teria sido parada manual. **Não foi.**
- **Sem ação manual:** entre o boot do container novo `a226fb2dffdf` (17:26:40) e o `POST /start`
  do dono (17:41:35), os logs não têm NENHUM stop/restart/logout para o Diogo.
- **Sessão viva:** Diogo enviou mensagens com 201 às 17:28 e 17:30 enquanto o banco dizia STOPPED
  (updatedAt 17:26:55, erro vazio). Sessão parada não envia.
- **Prova direta (container antigo `7192ca1ec8cd`):** sua última linha é
  `Shutdown: todas as engines fecharam em 306ms` às **17:26:55** — o mesmo carimbo do STOPPED do
  Diogo.
- **Mecanismo:** deploy stop-first deixa os dois containers vivos por ~15 s (novo 17:26:40, antigo
  morre 17:26:55). O novo reidratou o Diogo (17:26:49) e gravou WORKING. O `onModuleDestroy` do
  antigo chamou `e.shutdown ?? e.stop()`; o Baileys não tinha `shutdown()` → `stop()` →
  `doStop()` → `setStatus('STOPPED', { error: null })`, gravado por cima do WORKING do novo.
- **Por que só Diogo:** única sessão Baileys; as wwebjs usam `shutdown()` (não persiste) e
  reidrataram normais.
- **Gravidade:** desta vez cosmético (seguiu enviando), mas se o STOPPED chegar ANTES de o novo ler
  o `findAutostart` (que ignora STOPPED), a sessão nem reidrata — o número principal ficaria fora
  até um start manual.

## Entregue (1 commit na branch)

- `BaileysEngine.shutdown()`: `stopped=true`, `clearReconnectTimer()`, `detachSocketListeners()`
  (antes do `end()`, para o 'close' tardio não reentrar e emitir STOPPED), `sock.end()`,
  `sock=null`, `qrBase64=null` — **sem `setStatus`**. Fora do mutex (grace do SIGTERM).
- `engine.port.ts`: comentário do `shutdown?()` corrigido — o motivo é NÃO persistir status
  (findAutostart ignora STOPPED), não "risco de perfil sujo"; ambas as engines implementam.
- `baileys.shutdown.spec.ts` (3 testes, mock leve de `@whiskeysockets/baileys`): shutdown() fecha
  o socket e NÃO emite `session.status`; stop() (contraste) EMITE STOPPED com erro nulo; shutdown()
  sem socket é no-op.

## Verificação

- `tsc` ✅ · `lint` ✅ · `format:check` ✅ · `depcruise` ✅ (202 módulos) · `test:unit` ✅ **125/125**
  (era 122; +3).

## BLOQUEADO EM VOCÊ

- Merge (`feature/baileys-shutdown-sem-persistir-status` → main) e janela de deploy (stop-first
  reinicia a frota). Após o deploy, o próximo redeploy do Baileys deixa de precisar de start manual.

## DOCS TOCADAS

- `docs/PENDENCIAS.md` (P-043; P-042 remete pra cá) · `CHANGELOG.md` · `docs/SESSOES.md` · este arquivo.

## Validação em produção (09/09, 18:11–18:18 UTC — Dokploy 89.116.73.121)

- **Deploy:** "faça o merge e acompanhe o deploy" → merge ff `301d42d` (push 18:11) → CI da main verde (run 34387489755) → auto-deploy → container novo `047606fd42a3` healthy 18:15:29 (troca detectada por uptime 2910→12).
- **Diogo (o alvo):** reidratou 18:15:21 e ficou **WORKING** com status limpo (updatedAt 18:15:30, `lastError` vazio). Sem intervenção manual — ao contrário do deploy anterior, em que ficou STOPPED preso.
- **Ressalva honesta:** este deploy aposentou o container `a226fb2dffdf`, que AINDA era o SEM a correção. Ele encerrou às 18:15:29 (`Shutdown: todas as engines fecharam em 751ms`) e chamou o `stop()` do Baileys como antes. Desta vez o WORKING do container novo (18:15:30) chegou ao banco DEPOIS do STOPPED do antigo (18:15:29) e ganhou a corrida — por 1 s, sorte de timing, não pela correção. **A prova cabal da correção é o PRÓXIMO deploy**, quando o container que sai (`047606fd42a3`, já com `shutdown()`) não gravará STOPPED e não haverá corrida.
- **Frota:** contato20/contato1/ddd WORKING; contato11 em SCAN_QR (creds mortas, reparear — pré-existente, bounce entre deploys); as 14 sessões que o dono deslogou seguem STOPPED (corretamente não reidratadas).
- **CI/qualidade:** run 34387489755 (push main) verde. A 1ª tentativa do PR #3 falhou por um e2e flaky do wwebjs (`guard WA_REQUIRE_PROXY … não bloqueia por engano`, timeout 30 s, sem relação com o diff); rerun (attempt 2) verde.
