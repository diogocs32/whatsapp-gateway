# Sessão: e9-baileys-desconexao

- **Status:** ✅ DONE — E9/P-049 no PR #11, sem merge/deploy.
- **Início:** 26/09/2026 14:48 BRT.
- **Objetivo:** classificar desconexões Baileys por código, expor diagnóstico e métrica, e controlar a versão do protocolo por conexão.
- **Escopo:** `sessions/infrastructure/baileys`, wiring em `sessions`, configuração, métricas, contratos e testes unit/e2e; documentação `INTEGRACAO`, `MAPA-CODIGO`/referência gerada, `ROTEIRO-ONDAS`, runbook, `PENDENCIAS`, `ESTADO`, `SESSOES`, `CHANGELOG` e esta sessão. Pontos globais: `packages/contracts`, env examples e `schema.prisma`/migration aditiva do gateway.
- **Fora do escopo:** E10–E12, sessão ativa `lid-envio-wwebjs`, conta/QR/mensagem real, merge/deploy.
- **Branch:** `feature/onda2-baileys`, PR #11 (base encadeada ao PR #10 enquanto aberto).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E7/E8 no PR #11 sem merge/deploy; produção permanece no último SHA documentado `768fb26`; canário da Onda 2 após E12.
- **SESSOES:** a sessão `lid-envio-wwebjs` segue ativa e disjunta. Avisos E7/E8 e E22–E24 exigem preservar `append`/dedupe, formato de mensagens/reação/grupo/raw e pausa nativa, inclusive callback de `connection.update`.
- **PENDENCIAS:** assumida P-049. B-004/B-005/B-007 e P-034/P-056 seguem como limites externos ou de outra etapa; 440 deve ter no máximo uma retentativa tardia enquanto falta exclusividade.
- **ROTEIRO:** E9 na mesma branch e PR, sem merge/deploy; documentação oficial da versão instalada, testes unit/e2e de efeito, validação local, mapa, runbook e CI verde; merge é do dono.
- **MAPA-CODIGO §5.1:** 515 não consome tentativa; 405 alerta `client_too_old`; 403/411 terminais; 440 retenta tarde uma vez; 500 preserva razão bruta; `lastError` aditivo e `wa_disconnects_total{engine,code}`; não cachear `isLatest:false` como fresco.
- **E8 DONE/D-022/INTEGRACAO:** pausa 423 cobre todos os envios; `connection.update.reachoutTimeLock` é provisório mesmo com `Date` válido e só resposta direta de `fetchAccountReachoutTimelock()` confirma `timeEnforcementEnds`; timeout de espera não cancela RPC.
- **Baileys oficial e versões instaladas:** `npm ls @whiskeysockets/baileys whatsapp-web.js --depth=0` em 26/09 confirmou rc14 e wwebjs 1.34.7; `npm view ... dist-tags --json` mostrou ambas como `latest`. Context7 `/whiskeysockets/baileys` confirma `DisconnectReason`, `connection.update`/Boom e a versão `[number,number,number]`. Fontes oficiais na tag rc14: [`src/Types/index.ts`](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/index.ts#L28-L39) (sem 405, 408 duplicado), [`src/Socket/socket.ts`](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts#L988-L1000) (código bruto de `CB:failure`), [`src/Utils/generics.ts`](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/generics.ts#L239-L274) (`fetchLatestBaileysVersion` devolve `isLatest:false` na falha, sem `signal`) e [`src/Socket/socket.ts`](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts#L1123-L1139) (RPC de timelock emite atualização e retorna resultado). API instalada conferida em `node_modules/@whiskeysockets/baileys/lib/Types/index.js`, `lib/Utils/generics.js` e `lib/Socket/socket.js`.

## Progresso

- 14:48 — abertura R9; branch e arquivos locais não versionados conferidos e preservados.
- 14:55 — upstream/npm e fontes oficiais da rc14 conferidos antes de mudar API. `lastError` público é string; o par estruturado virá em campo novo para preservar R0.
- 15:12 — implementação, migration aditiva `20260926175800_baileys_disconnect_details` e testes unit/e2e concluídos; 545 unit gateway + 180 painel, 830 gateway no total + 180 painel, typecheck, fronteiras e dois builds passaram. Schema validado e migration aplicada só no Postgres local. Lint/formato globais apontaram arquivos `seed-mock` preexistentes não versionados; formato de três docs desta sessão ainda será ajustado.
- 15:16 — revisão adversarial encontrou corrida entre `WORKING` pendente e diagnóstico de close; `onDisconnect` passou à fila `statusWrites`. O teste de interleaving passou; suíte completa refeita: 831 gateway + 180 painel. Revisor confirmou matriz, 440 quieto, pausa E8, versão e métrica sem outro bloqueador concreto. Build gateway e mapa gerado refeitos (285 fontes/1536 símbolos/120 rotas).
- 15:17 — unit repetido: 546 gateway + 180 painel; typecheck gateway/dashboard/contracts e `mapa-codigo.mjs --check` verdes. Documentos `INTEGRACAO`, mapa, runbook e arquitetura revisados contra código e migration; nenhuma ação em conta/produção.
- 15:22 — commit `7c0441c` no PR #11; CI [`ci`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36262065637/job/108459668186) e [`imagens`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36262065637/job/108459668027) verdes. Lint e formato dos arquivos versionados passaram; comandos globais locais falham apenas nos dois `seed-mock` não versionados preexistentes, fora do PR.

## RESULTADO para quem não participou

- Matriz P-049 implementada no Baileys rc14: 401 limpa credenciais/STOPPED; 403/411/405 ficam FAILED, com alerta `session.client_too_old` para 405; 408/428/500/503 usam backoff; 515 não gasta a tentativa comum e tem teto próprio de três repetições sem `open`; 440 faz só uma tentativa tardia quieta de 60 s e não persiste terminal/QR/STARTING ao disputar a sessão. Falha posterior nessa tentativa não apaga credenciais nem alerta. `stopped`, `connectGeneration` e a pausa E8 continuam protegidos.
- `lastError` textual foi preservado. `lastErrorDetails {code,reason}` é aditivo no REST e status terminal, persistido pela migration `20260926175800_baileys_disconnect_details` aplicada **somente no Postgres local**. `wa_disconnects_total{engine,code}` conta closes por processo desde o boot, com rótulos finitos. A fila `statusWrites` ordena o diagnóstico de uma queda após status anterior pendente.
- Consulta da versão limitada a 3 s, com single-flight, intervalo mínimo de 30 s e cache de 12 h renovado apenas por `isLatest:true`; versão/fonte registrada a cada conexão. O par `BAILEYS_PROTOCOL_VERSION` + `BAILEYS_PROTOCOL_CANARY_SESSION_ID` limita o override a um ID canário. A versão instalada e a API oficial rc14 estão registradas no ECO.
- Provas: 546 unit gateway + 180 painel; 831 gateway no total + 180 painel; E2E de HTTP, Postgres, EventBus, webhook e métrica com socket falso; typecheck gateway/dashboard/contracts, depcruise, builds, Prisma, mapa e CI verdes. Nenhuma conta conectada, QR gerado em aparelho, mensagem real enviada ou ação no Dokploy.
- Próxima etapa: E10/P-050/P-075 na mesma branch/PR, conforme o [roteiro](../ROTEIRO-ONDAS-2026-09.md#e10--baileys-mídia-recebida-com-teto-proxy-e-reupload-p-050p-075). P-056 ainda precisa de lease/fencing entre processos; B-004 (stop-first), B-005 (backup), B-007 e P-034 seguem abertos. Canário da Onda 2 só após E12, merge e janela manual do dono.

## RECONCILIAÇÃO DOCUMENTAL (R3)

- Payload/evento público novo → `packages/contracts`, `docs/INTEGRACAO.md`, `docs/ARQUITETURA.md` e aviso em `docs/SESSOES.md` no commit `7c0441c`.
- Migration/campo em `wa_sessions` → `docs/ARQUITETURA.md`, `docs/INTEGRACAO.md`, `docs/PENDENCIAS.md` e `docs/how-to/canario-baileys-onda2.md`.
- Env e procedimento de canário → `apps/gateway/env.example`, `apps/gateway/env.production.example` e runbook com `revisado_em`.
- Código/fluxos e onda → `docs/MAPA-CODIGO.md`, inventário gerado por `node scripts/mapa-codigo.mjs`, `docs/ROTEIRO-ONDAS-2026-09.md`, `CHANGELOG.md`, este DONE e `docs/ESTADO.md` no encerramento. Nenhum gatilho ficou sem doc; nenhum `Docs-n/a`.

## Checkpoint R9

- **Commits/PR:** código, contrato e documentação E9 no `7c0441c`; fechamento R9 em commit documental posterior no PR #11. Os jobs `ci` e `imagens` do commit de código passaram no run `36262065637`.
- **BLOQUEADO EM VOCÊ:** merge do PR #11, deploy manual B e canário com chip aguardam ordem após E12. Bloqueios ainda abertos no quadro: B-001 (confirmação formal), B-003 (pareamento QR), B-004 (stop-first), B-005 (backup), B-006 (MinIO) e B-007 (diagnóstico). P-034 e P-056 são pendências técnicas futuras, registradas em `PENDENCIAS.md`.
- **DOCS TOCADAS PELO DIFF:** `INTEGRACAO`, `ARQUITETURA`, `MAPA-CODIGO` e inventário gerado, runbook de canário, `PENDENCIAS`, `ROTEIRO-ONDAS`, `SESSOES`, `SESSOES_ARQUIVO`, `ESTADO`, `CHANGELOG` e este DONE; contratos/env examples no mesmo commit de código.
