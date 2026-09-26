# Sessão: e6-wwebjs-leve

- **Status:** 🟢 EM ANDAMENTO — E6/P-060, sem deploy.
- **Início:** 26/09/2026 11:13 BRT.
- **Objetivo:** reduzir picos de memória do wwebjs e medir o perfil local sem conectar conta.
- **Escopo:** engine wwebjs, patch da lib para single-flight, métricas locais, testes, documentação e runbook do canário. Pontos globais possíveis: configuração, contratos e documentação de integração caso se exponha opção pública.
- **Fora do escopo:** Dokploy, QR, pareamento, envio real, merge na main e arquivo ATIVA da sessão `lid-envio-wwebjs`.
- **Branch:** `feature/onda6-wwebjs`, atualizada por fast-forward até `43f5843` antes do trabalho.

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E5 e Onda 8 mergeadas, E6 pendente. Produção segue no último SHA documentado `768fb26`; nenhum deploy autorizado.
- **SESSOES:** `lid-envio-wwebjs` consta ativa desde 31/08 com escopo sobreposto, mas a E5 já documentou que seu commit é ancestral da branch. Não editar seu arquivo. Avisos E5, E24 e E23 exigem preservar patch, encaminhamento, eco, remetente de grupo e contrato.
- **PENDENCIAS:** assumir P-060. B-001/B-003/B-004/B-005/B-007 e canário com chip dependem de ação futura do dono.
- **ROTEIRO:** E6 fecha a Onda 6 com métricas antes/depois locais, testes, PR e CI verde; deploy W manual só em outra janela.
- **MAPA-CODIGO:** §5.1 P-060 aponta `doStart`, `handleIncomingMedia`, `ready` e `sendMedia`; rever a seção sessions e atualizar o mapa após o diff.
- **Fontes conferidas:** `whatsapp-web.js@1.34.7` e Puppeteer 24.38.0 instalados; Context7 `/wwebjs/whatsapp-web.js` confirmou `downloadMediaStream({ chunkSize })` com `{ stream, mimetype, filename, filesize }`. Upstream npm ainda marca 1.34.7 como latest em 26/09; Baileys latest rc14.

## Progresso

- 11:13 — branch atualizada por fast-forward com a main `43f5843`; arquivos locais não versionados preservados.
- Código E6, patch da lib, contratos de mídia documentados e runbook do canário preparados; nenhuma migration ou alteração em `packages/contracts` (shape público preservado).
- Medição `about:blank` sem conta no Chrome 146.0.7680.31: JSHeap 1.073.432→1.073.432 B; soma RSS 739.622.912→651.640.832 B; IndexedDB 0→0 B; PSS indisponível no macOS. Não extrapolar para WhatsApp logado.
- Validação local: 488 unit gateway, 282 e2e local, 180 painel; `depcruise`, `tsc`, builds e Prettier dos arquivos do PR aprovados. Lint/formato globais enxergam apenas os `seed-mock` não versionados pré-existentes; não tocados.
- PR e CI pendentes no momento deste checkpoint; nenhum deploy/conta/QR/envio real/restart.
