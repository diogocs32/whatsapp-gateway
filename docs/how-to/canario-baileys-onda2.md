# Canário da Onda 2 — fila offline e restrição Baileys (E7/E8)

> Preparação para a janela de deploy B, depois das E8–E12 e do merge pelo dono. Não foi executado
> na E7/E8. Produção `.cloud` não tem homologação; usar somente um chip/sessão de teste e um proxy
> residencial dedicado. Não reiniciar contas da frota para simular queda.

## Antes da janela

1. Concluir backup com restore testado (B-005) e acertar `stop-first` do gateway (B-004). Confirmar
   qual imagem/SHA está rodando e guardar o rollback; seguir `how-to/rollback-gateway.md`.
2. Conferir que PR da Onda 2 está mergeado e CI verde, a migration aditiva da E8
   (`20260926164000_restricao_temporaria`) e as posteriores aplicadas por `prisma migrate deploy`,
   `/health` saudável e sessão canário `WORKING` após deploy manual. Antes de conectar o chip,
   consultar o banco e confirmar as quatro colunas `restrictionUntil`, `restrictionSignal`,
   `restrictionSource` e `restrictionType` em `session_guardrail`.
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

## Verificação da E8 na janela

1. No ambiente local, os testes automatizados usam socket e engine falsos; comprovam ERROR 463,
   `reachoutTimeLock`, `message-capping.update`, HTTP 423, job do webhook `session.restricted`,
   ACK `error`, re-agendamento da campanha e volta após o prazo. **Não provocar 463 nem capping
   num chip real** para repetir esse teste.
2. No canário, inscrever o webhook de teste em `session.restricted` ou `*`, consultar
   `GET /api/sessions/:id/health` e verificar `restriction_until: null` antes do envio normal
   de teste da E7. Se um sinal nativo ocorrer espontaneamente, registrar o evento, a fonte
   (`timeEnforcementEnds`, `cycle_end_timestamp` ou `temporary`), o prazo e o ACK; confirmar que
   o estado G5 não vira `banida`. Enquanto o prazo estiver vigente, 423 é o resultado esperado
   para envios de mensagem da sessão; ao vencer, o próximo envio volta sem `/activate`. O
   `timeEnforcementEnds` no alerta só é confirmado quando `source=timeEnforcementEnds`, recebido
   pela resposta direta do RPC; o `Date` da notificação `connection.update` é sempre provisório.
   Podem chegar alerta provisório, eco provisório do RPC e depois atualização confirmada; agrupar
   reentregas por sessão, fonte e prazo, preservando a atualização de `source`/`pausedUntil`.
3. Se a espera de 3 s pelo RPC expirar, o gateway mantém o prazo válido da notificação como
   `source=temporary`, mesmo se superar 60 s. A rc14 fabrica agora + 60 s quando a notificação
   não informa horário; se nenhum sinal trouxer prazo válido, o gateway usa fallback de 60 s. A
   chamada não é cancelada: resposta tardia ainda confirma se o socket e a consulta forem atuais.
   Capping com `cycle_end_timestamp` menor não reduz o prazo provisório já persistido.
   Uma retomada após esse prazo provisório **não prova** que a restrição remota terminou; anotar
   e investigar o estado no aparelho antes de autorizar mais tráfego. A campanha reconsulta
   o prazo até vencer e não deve ficar `PAUSED` por esse sinal.
4. Em rollback de imagem depois de a migration ter sido aplicada, **não reverter a migration**.
   As colunas são aditivas; a imagem antiga não lê a trava E8. Interromper envios da sessão canário
   e seguir `how-to/rollback-gateway.md`; não confiar no rollback para manter a pausa temporária.

## Limites conhecidos

- O dedupe entre instâncias simultâneas depende da exclusividade de sessão (P-056, E13); até B-004,
  `start-first` ainda pode abrir a mesma conta em dois containers. O canário só dá prova da sessão
  única. Não usar o deploy para provocar duas instâncias da conta de teste.
- O EventBus não tem outbox (P-034): queda exatamente entre publicação e persistência/enfileiramento
  ainda exige inspeção do `keyId` e correção específica. Não declarar entrega garantida após crash
  nesse intervalo com base apenas no teste de reconexão.
