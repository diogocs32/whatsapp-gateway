---
tipo: runbook
dono: Diogo Santos
revisado_em: 2026-09-26
validade: 2026-10-26
status: preparado — não executado; aguardar E12, merge e deploy B por ordem do dono
origem: E7/P-047, E8/P-048, E9/P-049, E10/P-050/P-075
---

# Canário da Onda 2 — fila offline, restrição, desconexão e mídia Baileys (E7–E10)

> Preparação para a janela de deploy B, depois da E12 e do merge pelo dono. Não foi executado
> na E7–E10. Produção `.cloud` não tem homologação; usar somente um chip/sessão de teste e um proxy
> residencial dedicado. Não reiniciar contas da frota para simular queda.

## Antes da janela

1. Concluir backup com restore testado (B-005) e acertar `stop-first` do gateway (B-004). Confirmar
   qual imagem/SHA está rodando e guardar o rollback; seguir `how-to/rollback-gateway.md`.
2. Conferir que PR da Onda 2 está mergeado e CI verde, as migrations aditivas da E8
   (`20260926164000_restricao_temporaria`) e E9
   (`20260926175800_baileys_disconnect_details`) e as posteriores aplicadas por `prisma migrate deploy`,
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

## Verificação da E9 na janela

1. Antes de conectar o chip, conferir que a suíte local/CI cobriu 401/403/405/408/411/428/440/
   500/503/515 com socket falso, incluindo o alerta 405, a única retentativa tardia do 440, o
   reinício 515 sem consumir tentativa, o detalhe persistido e o contador em `/metrics`. **Não
   provocar 403/405/440 nem deslogar uma conta real** para repetir estes testes.
2. `GET /api/sessions/:id` da sessão de teste passa a conter `lastError` textual e o campo aditivo
   `lastErrorDetails`, nulo após WORKING ou `{code,reason}` após uma desconexão. Se a queda acontecer
   espontaneamente, anotar o código bruto, o motivo e a versão/fonte do log
   `Baileys protocolo <sessionId>: versão <versão> (<fonte>)` da MESMA sessão (via Nest Logger,
   visível no nível padrão da aplicação). 401 exige novo QR porque as credenciais são limpas;
   403/411/405 ficam FAILED; 408/428/500/503 fazem backoff; 515 pós-pareamento tenta em 1 s sem
   consumir tentativa comum, mas mais de três 515 seguidos levam a DEGRADED; 440 espera 60 s para
   uma única tentativa quieta: não publica QR/STARTING nem, se falhar com qualquer código,
   persiste estado terminal, limpa credenciais ou emite alerta. Um close duplicado antes do timer
   não cria segunda tentativa.
3. Com `METRICS_TOKEN` configurado, ler `GET /metrics` com `Authorization: Bearer <token>` e
   conferir `wa_disconnects_total{engine="baileys",code="..."}` antes/depois de uma queda
   espontânea. Os totais são desde o boot do processo e zeram no restart; códigos fora da matriz
   aparecem como `other`. Não confundir número de eventos `session.status` com número de closes.
4. Se ocorrer `reachoutTimeLock` durante uma reconexão, aplicar a verificação da E8 acima: o
   `connection.update` continua provisório (`source=temporary`), e somente a resposta direta do
   RPC confirma `timeEnforcementEnds`. Reconectar, cair ou vencer o prazo local provisório não
   confirma que o WhatsApp removeu a restrição remota.

## Verificação da E10 na janela

1. Antes do canário, conferir que os testes locais/CI cobriram stream pendurado, caminho pelo
   dispatcher HTTP/HTTPS, falha sem binário, 404/410 com uma solicitação de reupload e vídeo
   redondo (`ptvMessage`) usando socket/fetch falsos, além de fetch pelo proxy HTTP local com
   autenticação. O teto de 90 s abrange as duas tentativas de download e a espera pelo reupload;
   esta espera tem também teto próprio de 20 s. **Não deixar um download real pendurado de
   propósito** para reproduzir o teste de timeout.
2. Na janela escolhida pelo dono, atribuir à **sessão de teste** um proxy HTTP/HTTPS dedicado já
   testado, anotar seu ID e confirmar a saída pelo proxy com registro de tráfego/egress do próprio
   proxy durante uma mídia de teste. O log de escolha do proxy no gateway, sozinho, não prova a
   rota da requisição à CDN. Não usar SOCKS para afirmar cobertura da E10: o código conserva a
   conexão pelo Agent existente, mas emite só metadados da mídia recebida até haver prova do
   dispatcher nessa modalidade.
3. Usar apenas mídia criada para o canário, enviada à conversa 1:1 da sessão de teste, incluindo
   uma imagem e um vídeo redondo quando o aparelho permitir. Anotar `keyId`, tipo, duração,
   horário, SHA da imagem, proxy escolhido e resultado do webhook `message`. Em download bem
   sucedido, esperar `mediaKey` e conferir os bytes com `GET .../messages/:msgId/media`. Em falha,
   esperar o mesmo evento com metadados e sem `mediaKey`/`mediaUrl`, seguido de 404 nessa rota;
   a conversa não deve desaparecer. Não usar mídia ou mensagens da frota.
4. Se uma mídia de teste tiver URL da CDN naturalmente expirada e produzir 404/410, registrar o
   pedido de reupload e a segunda tentativa, sem presumir sucesso: outro aparelho precisa ainda
   possuir o arquivo. Não fabricar erro na CDN nem reutilizar mídia real para forçar o cenário.
   O teste automatizado é a prova do ramo de falha; o canário só acrescenta observação real se
   esse caso ocorrer espontaneamente.

## Resposta ao 405: protocolo recusado

1. Confirmar o sinal certo: `session.client_too_old` com `{code:405,reason}`, sessão `FAILED` em
   `GET /api/sessions/:id` e `lastErrorDetails.code=405`. Este é o **405 da conexão Baileys**;
   o HTTP 405 do login do painel tem outra causa. Registrar horário, ID da sessão, motivo bruto,
   `wa_disconnects_total{engine="baileys",code="405"}` e a linha de log
   `Baileys protocolo <sessionId>: versão <versão> (<fonte>)`. Esse log registra a tentativa de
   conexão, não prova que o socket abriu; confira `WORKING` separadamente. FAILED não se reidrata
   nem deve ser iniciado em loop.
2. Conferir o estado da conta no celular e a versão candidata na fonte oficial do Baileys/WhatsApp
   antes da janela. A versão `latest` da consulta não prova aceitação pelo servidor. Preparar
   backup restaurável (B-005), `stop-first` (B-004), rollback da imagem e **um** chip com proxy de
   teste; não alterar toda a frota para testar a hipótese.
3. Na janela **manual escolhida pelo dono, após E12/merge/deploy B**, usar o ID (não o nome) da
   sessão de teste e definir JUNTAS no gateway do Dokploy
   `BAILEYS_PROTOCOL_VERSION=<major.minor.patch>` e
   `BAILEYS_PROTOCOL_CANARY_SESSION_ID=<id-da-sessao-de-teste>`. Salvar e fazer **Deploy manual**;
   aplicar env reinicia o gateway, mesmo que o override de protocolo atinja só a sessão canário.
   Iniciar manualmente só a sessão de teste se ela estava FAILED; conferir no log do novo processo
   `(canary-override)` e a versão esperada. Sem essas duas envs juntas, o boot falha pela
   validação do zod.
4. Registrar WORKING/405, versão efetiva e estabilidade da conexão do chip de teste. Se o 405
   persistir, remover **ambas** as envs e fazer Deploy manual na janela de rollback; deixar a
   sessão FAILED e investigar a causa sem repetição de starts. Se a candidata funcionar, manter
   apenas esse canário sob observação até a decisão sobre uma atualização da política de versão
   em mudança própria, revisada/testada para a frota. Para encerrar o canário, remover ambas as
   envs e fazer Deploy manual em janela; se a versão anterior continuar recusada, a sessão de
   teste volta a FAILED. O override não promove a versão para outras sessões.

## Limites conhecidos

- O dedupe entre instâncias simultâneas depende da exclusividade de sessão (P-056, E13); até B-004,
  `start-first` ainda pode abrir a mesma conta em dois containers. O canário só dá prova da sessão
  única. Não usar o deploy para provocar duas instâncias da conta de teste.
- O EventBus não tem outbox (P-034): queda exatamente entre publicação e persistência/enfileiramento
  ainda exige inspeção do `keyId` e correção específica. Não declarar entrega garantida após crash
  nesse intervalo com base apenas no teste de reconexão.
- O 440 pode ser disputa entre containers/réplicas. A retentativa única da E9 reduz a disputa,
  mas não identifica o dono da sessão; somente lease/fencing da P-056 resolve isso. O canário não
  deve induzir dois processos com as mesmas credenciais.
- O teto E10 limita a espera do download, mas o reupload da rc14 não oferece cancelamento do
  listener interno de `messages.media-update`; se o aparelho não responder, ele pode persistir até
  o socket fechar (D-034, P-087). Um resultado tardio não deve produzir segundo evento nem
  segundo binário. A correção desse listener depende de patch separado com teste de
  listeners/fechamento; não provocar falha real na frota. SOCKS4/SOCKS5 e a saída real da CDN só
  ficam comprovados após testes próprios. O sucesso do download não prova que o S3 esteja
  disponível em todas as sessões; conferir o GET da mídia.
