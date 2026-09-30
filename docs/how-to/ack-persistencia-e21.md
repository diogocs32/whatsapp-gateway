---
tipo: how-to
dono: equipe gateway / messaging
revisado_em: 2026-09-30
validade: 90 dias
---

# ACK antes da persistência (E21/P-078)

Um recibo pode chegar enquanto a mensagem ainda espera mídia ou INSERT. Antes deste recorte,
`updateStatusByKey` atualizava zero linhas e perdia o recibo; a memória de tiques do painel
compensava só enquanto a tela permanecia aberta. A reprodução local na base `899e86d` retornou
`expected null to be 'read'` após ACK `read` aguardado antes do save e repositório novo sobre
PostgreSQL (`/tmp/conexozenvo-e21-ack-red.log`). O MessagePersister real também expôs a corrida.
Isso é evidência local; não houve nova consulta/operação produtiva, conta, QR ou envio real.

## O que fica no banco

`messaging` é dono de `wa_pending_message_acks`, criada pela migration aditiva
`20260930163000_pending_message_acks`. A chave primária é `(sessionId,keyId)`; `status` é
texto com CHECK `sent/delivered/read/error`, `lastSeenAt` é `TIMESTAMPTZ(3)` com índice.
A FK remove os pendentes quando `wa_sessions` é excluída. Não há texto, mídia ou raw nessa tabela.

Somente ACK sem alvo fica pendente. Novo recibo preserva o maior status
`sent < delivered < read < error` e renova `lastSeenAt`, inclusive quando duplicado ou regressivo.
Status desconhecido continua ignorado. Havendo mensagem, aplica o máximo entre recibo atual,
pendente e status gravado e remove o pendente na mesma transação.

O alvo continua sendo a mensagem de timestamp mais recente por sessão/key; não adiciona filtro
`fromMe` ou `chatJid`. Duplicatas legadas e inbound/read-self mantêm a política anterior:
`read` numa mensagem recebida significa leitura no celular do operador. `error` continua
superior a `read`. Depois de consumido, o ACK não é reaplicado a outro INSERT futuro da mesma key.

## Como a corrida é serializada

ACK, `save` ao vivo e `saveHistorical` adquirem o mesmo `pg_advisory_xact_lock` por
`hashtextextended(JSON.stringify(['message-ack',sessionId,keyId]),0)`. O lock funciona mesmo
quando ainda não existe linha para bloquear e é liberado ao encerrar a transação. Todas as
instâncias deste código precisam compartilhar o mesmo PostgreSQL.

A transação usa `ReadCommitted` e adquire o lock em statement separado **antes** das leituras
de alvo/pendente. A consulta seguinte obtém uma fotografia posterior à espera; colocar lock e
leitura no mesmo statement não garante essa atualização de snapshot. Essa ordem implementa
a serialização da aplicação sobre a semântica de
[advisory locks](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS) e
[Read Committed](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED).

Backfill trabalha em chunks de 50, deduplica pares de sessão/key e adquire hashes efetivos
distintos em ordem crescente antes de consultar os existentes. Ordenar os hashes, inclusive
colisões, evita inversão de locks em lotes concorrentes. Dedup após a espera enxerga o commit
da outra instância; aplicar status/consumir ACK ocorre dentro do mesmo commit do lote.
A primeira ocorrência de cada par é selecionada antes dos locks; depois da espera, a consulta
ao banco revalida quais chaves já existem. A atomicidade é **por chunk**: falha no segundo
preserva o primeiro já commitado; retry deduplica as linhas existentes e converge.
O histórico mantém sua gravação direta sem emitir eventos ou baixar mídia.

O EventBus e o MessagePersister continuam assíncronos. Durabilidade começa no commit do ACK
pendente; evento perdido antes dele continua sujeito a P-034/outbox. Não se cria replay
sintético de `message.ack`, webhook ou SSE. A garantia é sobre a persistência reconciliada.

## Retenção

`RetentionService` usa a env existente `RETENTION_MESSAGES_DAYS`, default 90 dias;
0 desliga essa janela. O purge de pendentes usa `lastSeenAt`, enquanto mensagens e reações
mantêm suas regras de idade. Recibo recente duplicado ou de rank menor renova o carimbo sem
regredir status. Sessão excluída remove os pendentes por cascade.

Pendente antigo removido antes da chegada da mensagem deixa de estar disponível para recuperação.
Se o purge remove um pendente depois de ele ter sido lido pela reconciliação, o consumo aceita
zero linhas removidas e mantém o INSERT/status. Nenhuma env nova foi criada; a limpeza não toca
atribuições órfãs de proxy preservadas pela D-038.

## Verificar sem conta real

Use PostgreSQL local e sessões criadas como fixtures `STOPPED/autostart=false`; o
`POST /sessions` inicia a engine mesmo com autostart false. Para verificar o recorte:

```sh
npm run test:e2e -w apps/gateway -- test/ack-persistence.e2e-spec.ts
```

Os gates de efeito do recorte precisam observar banco, GET por sessão, Inbox e G4, cobrindo
ACK antes do INSERT, duplicados/regressivos/fora de ordem, restart do repositório, duas
instâncias, backfill/dedup, rollback da transação/chunk, retenção/cascade, inbound/read-self,
alvo legado mais recente e ausência de reaplicação em INSERT futuro. MessagePersister real
deve exercitar os eventos, com transporte falso. Resultados finais/CI/merge ficam na sessão
deste recorte; este documento guarda a política.

## Publicar e reverter

A publicação é manual do gateway, depois dos pré-requisitos C/D/E/F e B-004/B-005/B-007.
Aplicar a migration por `migrate deploy` no procedimento de publicação; preservar backup
testado e `stop-first` em Update/Rollback Config. N-1 ignora a tabela, não participa do lock
nem da reconciliação: a compatibilidade de schema não estende a correção à coexistência
entre versões. A primeira implantação precisa encerrar a N-1 antes de iniciar o novo gateway.

No rollback da imagem, mantenha a migration aditiva. N-1 continua compatível com o schema,
mas volta a perder ACK antes do INSERT; pendentes retidos só serão reconciliados quando
o código deste recorte voltar. Não recrie recibos já descartados pela versão antiga.
Não há nova rota, payload, env ou engine; o contrato do node n8n 0.4.1 permanece igual.

G4 pode refletir corretamente `delivered`/`read` recuperados, sem alterar resposta ou os
critérios de identidade, `ambiguousMature` e `reliable` da D-047. Antes do primeiro
enforce/canário E21, recalcular os snapshots de reply-rate7d da frota ou aguardar a expiração
de 24h dos antigos; GET reply-rate grava métrica, sem aplicar G5. Esse procedimento e o
canário com chip continuam para o dono. P-100/P-101/P-102 abertas; não usar force-close ou
retries reduzidos, nem drenar filas P-099.

## Fontes conferidas em 30/09/2026

- PostgreSQL local 18.4; documentação da família18:
  [advisory locks](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS) e
  [fotografias Read Committed](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED).
- Prisma instalado 7.10: transações interativas, nível de isolamento e
  `$executeRaw` parametrizado, conferidos via Context7/documentação oficial:
  [transações](https://www.prisma.io/docs/orm/fundamentals/transactions) e
  [SQL raw](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries).
- Decisão D-049 em [DECISOES.md](../DECISOES.md); fronteiras em
  [ARQUITETURA.md](../ARQUITETURA.md), contrato em [INTEGRACAO.md](../INTEGRACAO.md).
