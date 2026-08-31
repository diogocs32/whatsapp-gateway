# Sessão: lid-envio-wwebjs

- **Status:** 🟢 ATIVA
- **Início:** 31/08/2026 19:30 (BRT)
- **Objetivo:** consertar o **"No LID for user"** no caminho de envio da engine **WWEBJS** —
  ~30% dos envios/presenças da campanha falham (500, até na presença invisível) quando o alvo
  é conta migrada a `@lid`; campanha congelada (cap 0) desde ~19:15 BRT aguardando este patch.
  **Diagnóstico corrigido na abertura:** a memória da campanha apontava o `resolveJid` do
  BAILEYS, mas a frota inteira é WWEBJS (provado em `GET /api/sessions` 31/08 19:2x — 18
  sessões WWEBJS, só `Diogo` BAILEYS) e o stack do erro é do JS da própria página do WhatsApp
  Web (`static.whatsapp.net/rsrc.php` → `toUserLidOrThrow` dentro de `findOrCreateLatestChat`,
  atingido via `window.WWebJS.getChat`; issue canônica upstream
  [#3834](https://github.com/pedroslopez/whatsapp-web.js/issues/3834), aberta desde set/2025,
  os 2 PRs de correção fechados sem merge — não há versão da lib que resolva).
- **Escopo (pode tocar):** `apps/gateway/src/modules/sessions/infrastructure/wwebjs/`
  (`wwebjs.engine.ts` + arquivo novo de resolução LID outbound + spec unit) ·
  docs de sessão/pendências/changelog.
- **Fora do escopo (não tocar):** engine Baileys (a sessão `Diogo`/alerta funciona; se doer,
  vira P próprio — atenção: o `lidMapping.getLIDForPN` do Baileys **tem fallback USync de
  REDE**, conferido no rc14 instalado, não copiar às cegas) · `getContactLidAndPhone`,
  `getNumberId`, `queryWidExists` no caminho de envio (o fallback deles é contact-check de
  rede = padrão proibido, risco de ban — conferido em `src/util/Injected/Utils.js:1806-1820`
  da lib instalada) · contrato `/api` (R0 — nenhum campo muda) · deps/patch-package ·
  `feature/detector-nao-entrega` (não embarca).
- **Branch:** fix/lid-envio-wwebjs (criada de `main` `5a15d02`)

## ECO DE LEITURA (R9 v4.3)

- **ESTADO.md:** produção no Dokploy novo (VPS 89.116.73.121, api.conexozenvo.cloud,
  MinIO `wa-media`, `checks.storage=true`); deploy `66b7076` (envio Baileys sem consulta de
  existência) validado ~20:45 UTC de 31/08. Este bug é o efeito colateral que a sessão
  anterior ainda não conhecia no encerramento.
- **SESSOES.md:** nenhuma sessão ativa antes desta; aviso do CI novo (18/08, m3-qualidade)
  lido — unit = `src/**/*.spec.ts`, projeto vitest `unit`, sem infra. **Deriva detectada:**
  o encerramento `5a15d02` removeu a linha ATIVA da envio-sem-onwhatsapp mas não adicionou a
  linha no Histórico — reconcilio no meu fechamento.
- **PENDENCIAS.md:** P-023 (9º dígito) e P-024 (rename cold) abertas pela sessão anterior —
  não toco. P-020 (dedup alertas) segue "aguarda merge+deploy" em branch própria — embarcar
  ou não no próximo deploy é decisão do dono, não desta sessão.
- **Travas:** TS 5.9.3 · wwebjs pinada (tarball `1780711` + `patches/whatsapp-web.js+1.34.7.patch`)
  · jobId sem `:` · forward-only · NUNCA `nest build` com watch · push na main dispara deploy
  stop-first (janela é do dono) · sem Docker nesta máquina (e2e fica pro CI).

## Plano (fechado com a investigação de 31/08 — 4 agentes: engine, lib instalada, repo, upstream)

**Causa:** todo outbound converge em `toChatId()` (`wwebjs.engine.ts:1651`) → `<num>@c.us`
sintático. Para chip remetente LID-migrado e alvo sem mapeamento PN→LID no store local da
página, o `findOrCreateLatestChat` da Meta lança "No LID for user". O merge LID existente do
engine (`resolveNumberJid`/`lidToPnCache`) é só inbound — nenhum call site outbound.

**Conserto (mínimo, zero rede, zero regressão):** novo `resolveOutboundJid(to)` usado pelos
call sites de envio (sendText/sendMedia/sendLocation/sendPoll/sendPresence/markRead):

1. `toChatId(to)`; se não terminar em `@c.us`, devolve como está (grupos etc. intactos).
2. UM `pupPage.evaluate` local (mesmo padrão do `resolveLidToPhone:1519`):
   `isLidMigrated()` do remetente (`WAWebLid1X1MigrationGating`) — **false/indisponível →
   devolve o PN como hoje** (os ~70% que funcionam ficam intocados; o gate é exatamente a
   condição do throw da Meta);
   true → `WAWebApiContact.getCurrentLid(wid)` (lookup LOCAL síncrono, sem rede — é o 1º
   passo do próprio `enforceLidAndPnRetrieval` da lib, SEM o fallback `queryWidExists`),
   com `getAlternateUserWid` como 2ª tentativa local.
3. LID achado → envia para `<lid>@lid` (caminho suportado pela lib: `Utils.js:420-426` troca
   o `from` para o LID do remetente quando `chat.id.isLid()`; evidência de funcionamento na
   #3919) + alimenta `cacheLidPn` e `deps.contacts.record` (paridade com o inbound).
4. LID não achado ou QUALQUER erro no evaluate → devolve o PN e envia como hoje (falha
   honesta; sem throw novo, sem retry, sem rede). Alvo frio migrado sem mapeamento local
   continua não-entregável por construção — a rotina Contact→Save que já roda antes do 1º
   sendText é a candidata a popular o mapeamento (provar em produção, não nesta sessão).

**Testes:** spec unit do resolvedor (novo arquivo ao lado do engine): passthrough de grupo,
PN→LID quando o evaluate devolve lid, PN intacto quando devolve null/erro/malformado, e um
teste-guarda que afirma que o código injetado NÃO contém `queryWidExists`/`getNumberId`/
`enforceLidAndPnRetrieval` (proteção contra reintroduzir contact-check no futuro).

**Revisão adversarial (31/08 ~19:50, 3 céticos):** 3× APROVADO, 12 achados menores; 2
consertados no ato: (a) `op(lid)` pode resolver `null` SEM lançar (Client.js:1596-1617) — agora
null no retry sobe o ERRO ORIGINAL e nada é memorizado; null no caminho memorizado esquece o
par e refaz pelo PN na mesma chamada; (b) invariantes pinados por spec (núcleo do fallback
movido para o módulo puro; 18 testes no arquivo). Achado registrado p/ P-023 no fechamento:
`toChatId` repassa `@s.whatsapp.net` intacto — alvo migrado nesse formato não reroteia
(nenhum caller conhecido usa; normalizar junto do 9º dígito). Residual aceito e documentado:
duplicata teórica só se a Meta lançar "No LID" DEPOIS de enfileirar em chat pré-existente —
contra a evidência upstream/produção (throw é no findOrCreateLatestChat, antes de existir
mensagem).

**Validação local:** lint · format:check · depcruise · tsc --noEmit · test:unit (46/46).
**Deploy:** push na main SÓ com janela do dono. Prova pós-deploy: (a) 201 ao número do dono
(mapeamento existe); (b) o veredito real exige alvo migrado — decidir com o dono qual.
