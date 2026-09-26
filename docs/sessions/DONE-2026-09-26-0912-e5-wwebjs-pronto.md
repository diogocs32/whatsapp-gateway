# Sessão: e5-wwebjs-pronto

- **Status:** ✅ CONCLUÍDA EM CÓDIGO — E5 (P-059 e P-073), sem merge nem deploy.
- **Início:** 26/09/2026 09:12 BRT.
- **Objetivo:** deixar a engine wwebjs pronta para uso sob demanda antes do vencimento da build fixa, com patch de compatibilidade, observabilidade da build efetiva, override por sessão, ciclo de vida seguro e teste estável.
- **Escopo:** `apps/gateway/src/modules/sessions/infrastructure/wwebjs/`, configuração de sessão estritamente necessária ao override, `patches/whatsapp-web.js+1.34.7.patch`, testes do gateway, `scripts/guardas-build.sh` e documentação da E5. Pontos globais previstos: `packages/contracts` e `docs/INTEGRACAO.md` somente se o override exigir contrato público; `apps/gateway/prisma/schema.prisma` somente se precisar de persistência aditiva.
- **Fora do escopo:** E6/P-060 (perfil de memória), produção/Dokploy, login, QR ou envio real, merge na main, deploy A/G/W, alterações na sessão antiga `lid-envio-wwebjs`.
- **Branch:** `feature/onda6-wwebjs`, criada de `feature/onda8-conversas` em `79035f6` porque o PR #7 segue aberto e a E24 alterou a mesma engine.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** Onda 8 E22–E25 fechada no PR #7, aberto e com CI verde; Onda 1 já mergeada na main, porém deploy A pendente. Último estado documentado da produção: `768fb26`, sem verificação atual do Dokploy. Auto-deploy desligado (D-027). Próxima etapa E5, depois E6; E26 fica após E5 por causa do prazo de 13/10.
- **SESSOES:** `lid-envio-wwebjs` ainda consta ativa desde 31/08 com escopo na engine wwebjs; seu commit `740b911` já é ancestral da branch E5, então a linha parece documentalmente obsoleta. Esta sessão não editará o arquivo ATIVA alheio. Avisos E25/E24/E23/E22 e E2 lidos: preservar encaminhar nativo, `ForwardEchoRegistry`, LID outbound e marcador por arquivo no `guardas-build.sh`; E4 informa deploy manual e start-first até B-004.
- **PENDENCIAS:** assume P-059 (build, patch, observabilidade, override, ciclo de vida, tetos) e P-073 (teste instável que sobe Chromium). B-001/B-003/B-004/B-005/B-007 dependem do dono; P-060 fica para E6. Não há autorização para deploy nesta sessão.
- **MAPA-CODIGO:** seção §3.1 (ciclo wwebjs) e §5.1 P-059 lidas; `doStart`/`handleInitFailure`/`handleDisconnect`, watchdogs, `healWedgedPage` e patch são os pontos de intervenção. Código e mapa precisam ser reconciliados juntos.
- **ROTEIRO:** E5 em `feature/onda6-wwebjs`, incluir P-073, upstream primeiro, documentação da versão instalada, gates locais, PR com CI verde, entregar mensagem E6. Usuário reforçou que não fará deploy agora porque a equipe está trabalhando e o deploy derruba contas conectadas.
- **Fontes consultadas:** Context7 `/wwebjs/whatsapp-web.js` (Client: `webVersion`, `webVersionCache`, `getWWebVersion`, eventos `disconnected`/`change_state`), e pacote instalado `whatsapp-web.js@1.34.7` com Puppeteer `24.38.0`. Validação do upstream e do código instalado ainda em curso.

## Progresso

- 09:12 — branch criada; leitura do roteiro, mapa e dependência instalada. PR #7 segue aberto e verde, sem merge.
- Upstream conferido: npm 1.34.7 ainda é a versão publicada; PR #201923 cobre `__x_id` da mídia, PR #201930 o path traversal do cache. A candidata `2.3000.1046934385-alpha` tem HTML no catálogo até 07/11, mas precisa do canário real. Mantido o default já validado `2.3000.1045101284-alpha` até esse teste.
- Patch versionado estendido e guarda do build reforçada. Override por sessão persiste em coluna nullable e só vale no próximo start; logs da build efetiva e do Chromium. Desconexões terminais param sem QR automático; renovação do pairing e heal têm teto; start manual zera os contadores.
- P-073: teste do caso sem `WA_REQUIRE_PROXY` movido para `wwebjs.lifecycle.spec.ts` com FakeClient; não inicializa Chromium. P-086 (link público temporário para parear por QR) registrada em PENDENCIAS para etapa futura, sem implementação nesta E5.

## Validação

- `npm run test:unit`: 483 gateway + 180 painel. Primeira execução no sandbox deu EPERM nos specs que abrem porta local; repetida fora dele, passou integralmente.
- `npm run test:e2e -w apps/gateway`: 281/281 com Postgres/Redis/MinIO locais; migration aditiva aplicada **somente** ao banco local `localhost:5436`.
- `npx tsc --noEmit -p apps/gateway/tsconfig.json`, `npm run depcruise`, `npm run gateway:build`, `npx prisma validate`, patch reversível por `git apply --reverse --check` e `sh scripts/guardas-build.sh patches`: passaram.
- ESLint passou quando excluídos `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts`, arquivos soltos preexistentes de outra sessão. Prettier passou nos arquivos tocados; a checagem global aponta apenas esses dois arquivos de outra sessão. Nenhum QR, envio ou teste com chip foi feito.

## Checkpoint (R9 v4.3)

- **Entregue:** E5 em `feature/onda6-wwebjs`, sobre `feature/onda8-conversas` porque o PR #7 ainda está aberto; patch/override/log/ciclo de vida/teste P-073 e runbook do canário.
- **Onde parou:** código e testes locais prontos; PR da Onda 6 é empilhado sobre o PR #7. Produção não foi verificada nem alterada; último SHA documentado é `768fb26`.
- **Próxima etapa:** E6 (P-060 — perfil leve de memória), na mesma branch `feature/onda6-wwebjs`; depois do PR #7 mergeado, ajustar a base do PR da Onda 6 se preciso. Canário com chip e deploy W só em janela escolhida pelo dono.
- **BLOQUEADO EM VOCÊ:** canário real da build candidata, teste com chip e promoção global ficam para depois do deploy W, na janela do dono; nenhuma publicação agora porque o deploy derruba contas conectadas. B-001 (proxy obrigatório) e B-004 (stop-first) seguem como controles operacionais do dono.
- **DOCS TOCADAS PELO DIFF:** `docs/DECISOES.md` (D-032), `docs/PENDENCIAS.md` (P-059, P-073 e P-086), `docs/MAPA-CODIGO.md` + `docs/reference/mapa-codigo/` (regenerado), `docs/INTEGRACAO.md`, `docs/ROTEIRO-ONDAS-2026-09.md`, `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/how-to/canario-wwebjs-onda6.md`, `CHANGELOG.md` e este arquivo.
- **Reconciliação documental (R3):** `INTEGRACAO` ganhou o campo do contrato; `MAPA-CODIGO` foi revisado para o ciclo wwebjs; `ESTADO`, `PENDENCIAS`, `ROTEIRO` e `CHANGELOG` distinguem código local, canário futuro e produção inalterada. `ARQUITETURA` não mudou de proprietário de módulo/tabela; a coluna nova pertence à `session_config` já mapeada.
