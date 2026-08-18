# Sessão: wwebjs-w4-superficie

- **Status:** ✅ CONCLUÍDA
- **Início:** 12/08 20:36 UTC (17:36 local)
- **Objetivo:** W4 do plano wwebjs (P-010): implementar os 14 métodos que hoje lançam
  `nope()` — a API existe na lib 1.34.7. Grupos (createGroup, updateParticipants,
  leaveGroup, setGroupSubject/Description, groupInviteCode, groupRevokeInvite),
  contatos (checkNumbers, profilePicture, setBlock), canais (createChannel, channelInfo,
  followChannel, unfollowChannel). Casar os retornos com GroupInfo/ContactCheck/ChannelInfo
  (mesma forma que o Baileys emite).
- **Escopo (pode tocar):** `wwebjs.engine.ts` (implementar os 14) · `test/wwebjs-engine.e2e-spec.ts`.
- **Fora do escopo:** baileys · session-manager · contracts · schema · dashboard
  (o painel já chama essas rotas; a UI de sinalização por engine é da W8) · outras sessões
- **Branch:** feature/wwebjs-w4-superficie

## Eco de leitura (abertura — R9)

- **Sessões ativas vistas:** M2 · auth-refresh (sem interseção)
- **Últimas conclusões absorvidas:** wwebjs W1/W2/W3 (HOJE) — base sólida; a W3 já fez
  os `nope()` responderem 501, esta W4 os IMPLEMENTA (deixam de lançar)
- **Pendências assumidas:** P-010 (W4)

## Progresso

- [12/08 20:36] Abertura R9. Assinaturas da lib conferidas no d.ts (createGroup→
  CreateGroupResult{gid}, GroupChat.{add/remove/promote/demote}Participants/setSubject/
  setDescription/getInviteCode/revokeInvite/leave, getNumberId→ContactId|null,
  getProfilePicUrl, Contact.block/unblock, createChannel→CreateChannelResult{nid},
  Channel{id,name,description,isChannel}, subscribe/unsubscribeToChannel). Reuso dos
  helpers já existentes: `withStoreReady`, `toGroupId`, `toChatId`, `groupInfo`.

- [12/08 20:40] Implementados os 14: grupos via `getGroupChat` (refatorado do groupInfo)
  - `createGroup`/`updateParticipants`/`leaveGroup`/`setGroupSubject`/`setGroupDescription`/
    `groupInviteCode`/`groupRevokeInvite`; contatos `checkNumbers` (getNumberId sequencial),
    `profilePicture` (getProfilePicUrl), `setBlock` (Contact.block/unblock); canais
    `createChannel`/`channelInfo`/`followChannel`/`unfollowChannel`. `nope()` removido (morto)
  - import órfão do erro tipado removido; comentário do cabeçalho atualizado. O erro tipado
    `UnsupportedEngineOperationError` + guards 501 nos controllers FICAM (contrato de
    capacidade — útil para META_CLOUD/M6, hoje dormente).
- [12/08 20:42] Gates: typecheck 0 · lint 0 · build 0 · teste 10/10 (createGroup/
  checkNumbers/setBlock/followChannel agora vão à lib real — sem client → "Sessão não
  conectada", provando que deixaram de ser nope).

## Encerramento

- **Resultado (para quem NÃO participou):** W4 do wwebjs entregue — os **14 métodos que
  lançavam "não suportado" agora estão implementados** (a API existia na lib 1.34.7). O
  motor wwebjs passa a ter **paridade funcional com o Baileys** no contrato IEngine:
  criar/administrar grupos (criar, add/remove/promover/rebaixar participantes, sair,
  assunto, descrição, convite, revogar), contatos (checar número no WhatsApp, foto de
  perfil, bloquear/desbloquear) e canais/newsletter beta (criar, info, seguir, deixar de
  seguir). Antes essas rotas respondiam 501 para sessão wwebjs; agora executam. O
  `nope()` foi removido (código morto). O comportamento real depende de browser+WhatsApp
  (fora do CI) — coberto por typecheck contra o d.ts da lib + espelhamento do Baileys +
  testes de que os métodos deixaram de ser no-op. Sem migration/env/contrato.
- **Nota (fora do escopo, ainda aberto):** `announce`/`restrict` continuam hardcoded
  `false` em `listGroups`/`groupInfo` (o d.ts da lib não tipa `groupMetadata`) — P2 menor,
  não é um dos 14; fica registrado. Dashboard sinalizar capacidade por engine = W8.
- **Reconciliação documental:** diff = wwebjs.engine.ts + teste + CHANGELOG + PENDENCIAS
  - análise + ESTADO + sessão. Gatilho do mapa (R3): comportamento novo → CHANGELOG
    (feito); nenhuma rota/contrato mudou de forma (as rotas já existiam — passaram de
    501→execução). `Docs-n/a`: nenhum.
- **Efeito de deploy:** comportamento novo — **exige deploy**. Sem migration/env/contrato.
- **Pendências geradas:** nenhuma. **P-010 concluída.** Resta do plano wwebjs só a P-011
  (recursos NOVOS W5–W8, aditivos).
- **Classe de erro introduzível e gate:** método novo que não chega à lib (regressão para
  nope/no-op) → testes "vão à lib real" (Sessão não conectada); erro de tipo contra a lib
  → typecheck contra o d.ts (pegou tudo no desenvolvimento).
