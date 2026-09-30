# Sessão: E21 continuação — QR esgotado (P-018/P-091)

- **Status:** ✅ CONCLUÍDA EM CÓDIGO.
- **Início:** 30/09/2026 08:53 BRT.
- **Branch/base:** `feature/onda21-qr-esgotado`, `origin/main=8f7683f`.
- **Objetivo:** encerrar o ciclo QR explicitamente esgotado de Baileys com credenciais iniciais em STOPPED, com prova de persistência/evento e exclusão do autostart. Um PR, revisão, CI verde e merge ao fim.
- **Escopo:** desconexão Baileys, testes unitários/efeito e docs/mapa. Sem migration, env, novo status, rota, payload ou alteração em WWEBJS/media-provider.
- **Fora do escopo:** parada imediata por expiração/revogação de link, qualquer inferência de credenciais incompletas de pairing-code, migração/limpeza de sessões legadas, restante do backlog, P-100/P-101/P-102/P-099, produção/Dokploy/deploy/canário e conta/QR/check/envio reais. ATIVA e engine `lid-envio-wwebjs` preservadas.

## ECO DE LEITURA

- **ESTADO:** E21/P-103 entregue em código, produção no último SHA documentado `768fb26`. PR27 confirmado MERGED em `8f7683f6639b9a6cc8bdc844de2b139530da6187` (`gh pr view 27`, 30/09), ci/imagens SUCCESS. `git fetch origin` confirmou a base. Nenhuma consulta produtiva.
- **SESSOES:** arquivo completo, avisos e cinco últimas sessões lidos; `lid-envio-wwebjs` alheia. Fencing/lease, epochs/CAS/8s e gates E16–E21 preservados.
- **PENDENCIAS:** B-004/B-005/B-007 e deploys C/D/E/F/canários manuais. P-018 descreve QR esgotado; P-091 permite resolvê-lo pela parada ao esgotar QRs. Demais itens da triagem continuam abertos, incluindo P-100/P-101/P-102; P-099 sem drenar.
- **Roteiro/base/mapa:** BASE v4.3, R0/R3/R6/R9; mensagem E21 continuação em ROTEIRO; DONE E21, D-047 e `reference/e21-triagem-backlog.md`; MAPA-CODIGO boot/pareamento/fronteiras. Preservados TS5.9.3/CLI11, Vitest5/.mts/SWC/e2e serial, node20/node16 CommonJS/buildinfo em dist, Nest12/Fastify5.12.5/BullMQ6/ioredis5/ULID3; identidade G4/G5, métrica30d independente e cota observe0.

## Recorte registrado antes de implementar

- Trigger restrito: 408 **e** motivo exato `QR refs attempts ended` **e** credenciais presentes e iniciais (`registered=false`, sem `account`, `me` ou `sock.user`). Qualquer ausência ou sinal de login/pareamento mantém a política existente. 408 comum, 515 e 440 preservados.
- A engine encerra socket/listeners/timer/QR e publica STOPPED com diagnóstico, sem apagar creds/Signal ou mudar autostart. `findAutostart` já exclui STOPPED; start/new-qr manual continuam disponíveis.
- Não chamar `manager.stop()`/`engine.stop()` de dentro do callback serializado: aguardaria a própria fila da engine. Limpeza local direta no ramo de close; persistência segue a fila cercada existente do SessionManager.
- P-091 é tratada pela alternativa P-018: token expira/revoga imediatamente, sessão inicial para ao fim do ciclo QR. Não instalar scheduler novo nem alterar decisão D-037 de prazo do link.
- Sessões legadas DEGRADED podem iniciar um ciclo no próximo boot e só então parar. Não migrar nem classificar credenciais antigas por status ou lastMeJid.
- Fontes: instalação rc14 `Socket/socket.js:714-723` (QR esgotado/408), `Types/index.js:16-18` (408 compartilhado), `Utils/auth-utils.js` (initAuthCreds), `Utils/validate-connection.js` (account após validação), `Socket/socket.js:601-606` (me antecipado no código). Conferência independente com Context7, tag oficial rc14 e npm dist-tags/releases: latest continua rc14; PR2765 aberto, sem correção publicada. Fontes completas no how-to; sem alteração de dependência.
- Revisão independente de fronteiras confirma que não há necessidade de tocar messaging/media-provider nem sessão WWEBJS. Testes de efeito usarão manager/lease/DB/evento/webhook reais e socket falso; fixture SQL STOPPED/autostart=false, nunca POST /sessions.

## Checkpoints

- Branch nova criada de origin/main após merge E21; `.codex/`, `AGENTS.md`, `seed-mock.js` e `apps/gateway/prisma/seed-mock.ts` preservados.

- Instalação estrita Node26.10.0/npm11.19.1 e patch-package passaram; Prisma7.10 gerado. Deps instaladas confirmadas, nenhum manifest/lock alterado. Builds gateway/painel e typechecks gateway/painel/contracts verdes.
- 56/56 testes focados de desconexão, incluindo19 novos;3/3 testes de efeito novos com Postgres/lease/manager/engine/evento/HTTP/timeline/fila Redis reais e transporte falso. START/QR só sintéticos; nenhum makeWASocket real. E2E cobre creds/chaves/epoch intactos, webhook enfileirado, autostart/novo boot/start manual e callback do dono anterior sem pisar WORKING.
- Mutação em cópia descartável: controle56/56; retirar assinatura do motivo falha4, retirar guardas auth/WORKING falha9. Falhas em assertions, sem importar zero testes como evidência. Root não foi mutado.
- Suite com coverage1548/1548 gateway em101arquivos;292/292 painel em14arquivos. Statements74,20%,branches66,22%,functions72,47%,lines76,06%. Logs ERROR de lease perdida/banco indisponível/validação inválida são cenários negativos; execução encerrou exit0.
- Revisão adversarial independente aprovada; único P3 documental corrigido: 408/428/503 mantêm retry lento300s após cinco tentativas. Fronteiras, patches, guardas dist/deps/Prisma e mapa em dia. Guardas runtime conferiram215JS/33pacotes, Nest12 com DI único e ULIDCommonJS.
- Dois ajustes do harness antes dos gates finais: mock async ganhou Promise<void> explícita para aceitar await suspenso (tsc antes detectou TS2322); formato passou a conferir arquivos versionados e novos com ignore original/ignore-unknown, preservando seeds/configs locais e ignorando fontes geradas conforme política existente. Tentativa com ignore-path fora do repo não aplicou os ignores relativos e foi descartada; nenhum arquivo gerado/runtime foi reformatado.

## Encerramento/checkpoint R9/R3

- **RESULTADO:** P-018/P-091 concluídas no recorte QR inicial em código (D-048); parada explícita de ciclo esgotado, sem novo retry/boot automático. CI/merge da continuação são gates remotos canônicos.
- **ARQUIVOS:** ramo de close/doStop Baileys, matriz unit, novo e2e, docs e inventário gerado. Nenhuma alteração WWEBJS/media-provider/ATIVA alheia.
- **PACOTES ADICIONADOS:** nenhum; sem lock/deps/env/tabelas/migration/rota/payload/status novo.
- **EFEITO DE DEPLOY:** auth inicial elegível passa a STOPPED ao esgotar refs; socket/QR/timer/listeners limpos, diagnóstico/evento preservados sob fencing. STOPPED sai do autostart; creds/Signal/authEpoch/autostart intactos. Sinais inconclusivos de código/login mantêm recuperação anterior. LegacyDEGRADED pode iniciar um ciclo antes de parar; expiração/revogação do token não desliga imediatamente engine. Parada natural não revoga link válido.
- **CLASSES/GATES:** 408ambíguo/QRsignature e authinconclusivo→matriz/timers/mutações; deadlock/reentrada/stale→listener serializado/geração/socket; fence/estado/bootstrap→Postgres/manager/HTTP/evento/Redis reais. E2E prova job enfileirado, não entrega externa. A suite global preservou guardrail/reply-rate/contratos/campanhas anteriores. CI imagens valida os Dockerfiles/smokes.
- **BLOQUEADO EM VOCÊ:** nada para código/PR/merge autorizado. Publicação/canário/aceite com chip continuam manuais após C/D/E/F/B-004/B-005/B-007 e recálculo7d ou expiração24h dos snapshots pré-E21. Produção não foi operada ou consultada.
- **PENDÊNCIAS:** sinais inconclusivos de pairing e demais recortes do backlog mantêm suas pendências; P-100/P-101/P-102 abertas, P-099 sem drenar.
- **DOCS TOCADAS:** D-048/CHANGELOG, INTEGRACAO, MAPA/MAPA-CODIGO/inventário, how-toQR/link, agent-whatzapp_api§6.14, triagem, PENDENCIAS/roteiro, ESTADO/SESSOES/arquivo e esta sessão.
- **Docs-n/a:** contracts e ARQUITETURA sem gatilho de novo DTO/payload/evento/provider/tabela; BASE/CLAUDE/env sem regra/script novo. D-047/rotasE20 mantidas. Nenhuma migration ou procedimento de deploy alterado.
- **RETOMADA:** E21 continuação/P-078, mensagem pronta no roteiro; reprodução ACK antes do INSERT, recorte de persistência com efeitos e revisão, um PR próprio.
- **ARTEFATOS LOCAIS:** logs `/private/tmp/conexozenvo-e21-qr-*.log`, mutações em `/private/tmp/conexozenvo-e21-qr-mutation-*`; infra dev e arquivos locais preservados.

## PR e gates remotos

- Código/docs `e72b324`, base `8f7683f`, [PR #28](https://github.com/diogocs32/whatsapp-gateway/pull/28).
- Reconciliação da referência do PR antes dos checks finais; ci/imagens verdes no head final são pré-requisito do merge autorizado. Resultado/SHA de integração e checks finais no PR canônico.
- P-100/P-101/P-102 abertas, P-099 sem drenar; nenhuma operação/consulta produtiva.
