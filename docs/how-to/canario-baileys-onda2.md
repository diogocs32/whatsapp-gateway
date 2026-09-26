# Canário da Onda 2 — fila offline Baileys (E7)

> Preparação para a janela de deploy B, depois das E8–E12 e do merge pelo dono. Não foi executado
> na E7. Produção `.cloud` não tem homologação; usar somente um chip/sessão de teste e um proxy
> residencial dedicado. Não reiniciar contas da frota para simular queda.

## Antes da janela

1. Concluir backup com restore testado (B-005) e acertar `stop-first` do gateway (B-004). Confirmar
   qual imagem/SHA está rodando e guardar o rollback; seguir `how-to/rollback-gateway.md`.
2. Conferir que PR da Onda 2 está mergeado e CI verde, migrations (se houver em E8–E12) aplicadas
   por `prisma migrate deploy`, `/health` saudável e sessão canário `WORKING` após deploy manual.
3. Separar uma conversa de teste 1:1, um webhook de teste inscrito em `message` (URL distinta do
   Trigger n8n existente) e anotar `sessionId`, `chatJid`, `keyId` e horários. Usar credenciais
   próprias de teste; não tocar números reais da frota.

## Prova com o chip

1. Na janela controlada, deixar somente a sessão canário desconectada temporariamente; enviar do
   chip externo **uma** mensagem de teste enquanto ela estiver fora e anotar o horário. Reconectar
   apenas a sessão canário. Esse envio é ação futura do dono, não parte do teste local da E7.
2. Conferir que o webhook recebeu exatamente um `message` com `fromMe:false`, `keyId` anotado e
   `payload.timestamp` do envio original. O campo `raw` não pode sair no webhook. Conferir que
   `GET /api/sessions/:id/messages?chatId=...` mostra uma linha com o mesmo `keyId` e que o Inbox
   `/api/inbox/conversations` mostra a conversa como `pending`.
3. Reconectar a mesma sessão canário mais uma vez **sem novo envio**. A chave não pode reaparecer
   no webhook nem no banco/Inbox. Confirmar que nenhuma cópia de envio próprio ou newsletter/status
   entrou como `message`.
4. Para reply-rate, usar um cold **de teste** com pelo menos 72 h de maturação e uma resposta
   offline até 72 h após ele; comparar `GET /api/observability/reply-rate/:sessionId?window=7`
   antes/depois. Sem cold maduro, a contagem não muda — isso não invalida a recuperação do Inbox.
5. Registrar horário, keyId, contagens e SHA no diário da sessão de deploy; em caso de duplicata,
   ausência de evento ou falha de reidratação, seguir o rollback da janela e manter a frota parada.

## Limites conhecidos na E7

- O dedupe entre instâncias simultâneas depende da exclusividade de sessão (P-056, E13); até B-004,
  `start-first` ainda pode abrir a mesma conta em dois containers. O canário só dá prova da sessão
  única. Não usar o deploy para provocar duas instâncias da conta de teste.
- O EventBus não tem outbox (P-034): queda exatamente entre publicação e persistência/enfileiramento
  ainda exige inspeção do `keyId` e correção específica. Não declarar entrega garantida após crash
  nesse intervalo com base apenas no teste de reconexão.
