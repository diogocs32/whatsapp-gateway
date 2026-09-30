---
dono: Diogo / gateway
revisado_em: 2026-09-30
---

# Encerrar um ciclo QR esgotado no Baileys (E21 · P-018/P-091)

O código encerra em `STOPPED` o ciclo QR da Baileys rc14 quando o fechamento traz
`code=408` e o motivo **exato** `QR refs attempts ended`, a engine não estava `WORKING`
e as credenciais atuais estão presentes com `registered === false`, sem `account`,
`me` nem `sock.user`. A guarda é relida após a persistência do diagnóstico para não
ignorar um pareamento que tenha avançado nesse intervalo.

Um 408 de rede, motivo diferente, credenciais ausentes ou qualquer sinal de login
mantêm a política existente. `me` ou `registered=true` podem representar pairing-code
em andamento: não provam pareamento concluído, mas esses sinais impedem esta parada
por prudência. Pairing-code fica fora do recorte.

## O que observar e como retomar

- Ao esgotar o ciclo inicial, a engine cancela reconexões, encerra o socket, remove
  listeners e limpa o QR em memória. O status `STOPPED` é persistido sob a lease e
  publicado como `session.status`; `lastErrorDetails` preserva o 408/motivo e
  `lastError` orienta conectar novamente. Credenciais e chaves Signal são conservadas.
- `autostart` não muda. `findAutostart` já exclui `STOPPED`, portanto esta tentativa
  não abre outro QR no próximo boot. Para retomar, o operador usa **Conectar/start**;
  **Gerar novo QR** continua disponível conforme suas guardas e descarta credenciais
  pela regra já existente dessa operação.
- Uma sessão legada em `DEGRADED` ainda pode iniciar um ciclo no próximo boot. Se
  satisfizer a guarda acima quando os QRs esgotarem, para então em `STOPPED`.
  Não há migração nem limpeza retroativa de sessões/credenciais.
- P-091 usa a alternativa de encerrar o ciclo da P-018. Expiração/revogação do link
  invalida o token, mas **não para imediatamente** a engine. O ciclo elegível para
  ao esgotar; **Revogar → também parar a sessão** permite a parada imediata pelo dono.
  Um link ainda válido pode pedir outro ciclo conforme a cota/cooldown existentes.

## Publicar e aceitar manualmente

Merge/CI não publicam nem comprovam este comportamento em produção. Deploys C/D/E/F
e canários continuam manuais, com B-004 **stop-first**, B-005 backup/restore e B-007
diagnóstico/canário preservados. Não reiniciar a frota em rajada. Antes do canário
E21, [recalcular os snapshots reply-rate7d ou aguardar 24 h](reply-rate-identidade-e21.md#validar-sem-conta-real).
P-100/P-101/P-102 continuam abertas; P-099 não autoriza drenar filas.

O dono executa o aceite na janela autorizada, depois de publicar o código:

1. Em uma sessão **Baileys de teste nova**, com credenciais iniciais e autostart
   habilitado, gerar QR e deixá-lo esgotar **sem ler**. Não pedir novos QRs durante
   a observação. A biblioteca usa 60 s para o primeiro QR e 20 s para os seguintes
   por padrão; a duração total depende das referências recebidas.
2. Conferir pela API/painel `STOPPED`, QR ausente, `lastErrorDetails.code=408` e
   `reason="QR refs attempts ended"`; conferir o evento/webhook `session.status`
   correspondente e ausência de outro ciclo sem uma ação explícita.
   Para cobrir P-091, repetir com link de teste revogado **sem** marcar "também parar":
   o acesso termina imediatamente e a engine elegível para ao esgotar o ciclo.
3. Após **reinício manual do gateway pelo dono**, na mesma janela controlada,
   conferir que essa sessão permanece `STOPPED` e não gera QR no boot. Iniciar
   explicitamente e confirmar que um novo ciclo fica disponível.
4. Acompanhar uma sessão **já pareada de teste** como controle: login e operação
   permanecem disponíveis; se houver 408 comum, observar a recuperação existente.
   Não provocar logout, leitura de QR ou exclusão de credenciais para este controle.
   O agente não opera contas, QR, envios, reinícios ou Dokploy.

## Fontes verificadas em 30/09/2026

`npm ls @whiskeysockets/baileys --workspace apps/gateway` confirma **7.0.0-rc14**;
`npm view @whiskeysockets/baileys dist-tags --json` confirma `latest=7.0.0-rc14`
e `legacy=6.7.24`. O [release oficial rc14](https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc14)
segue o último publicado; Context7 e a fonte instalada foram consultados, sem upgrade.

- `node_modules/@whiskeysockets/baileys/lib/Socket/socket.js:709-723` e
  [tag rc14, QR lifecycle](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts#L888):
  exaustão explícita de refs e tempos dos QRs. `lib/Types/index.js:16-18` e
  [enum oficial](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/index.ts#L28)
  mostram que `connectionLost` também vale 408.
- `lib/Socket/socket.js:601-606` e [requestPairingCode](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts#L771)
  escrevem `me` antes do sucesso; `lib/Socket/messages-recv.js:940` e
  [companion_finish](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/messages-recv.ts#L1196)
  escrevem `registered=true` antes de `pair-success`. `lib/Utils/validate-connection.js:141-197`
  e [configureSuccessfulPairing](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/validate-connection.ts#L191)
  validam as assinaturas antes de produzir `account`.
- [Issue #2737](https://github.com/WhiskeySockets/Baileys/issues/2737) relata pairing
  incompleto em rc14; [PR #2765](https://github.com/WhiskeySockets/Baileys/pull/2765)
  segue aberto, sem merge. [Issue #2261](https://github.com/WhiskeySockets/Baileys/issues/2261)
  relata a mesma assinatura após uma conexão anterior em rc9: a mensagem sozinha
  não prova credenciais iniciais. Esses relatos não substituem o canário.
