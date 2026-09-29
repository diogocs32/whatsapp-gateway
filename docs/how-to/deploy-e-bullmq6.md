---
tipo: runbook
dono: Diogo Santos
revisado_em: 2026-09-29
validade: 2026-10-29
status: preparado — deploy e canário não executados
origem: E17 / P-062 parte 2 / D-043
---

# Deploy E — BullMQ 6 com ioredis 5 e ULID 3

Executar manualmente depois do merge da E17 com CI verde. O gateway usa BullMQ 6.3.10,
ioredis 5.11.1 e ULID 3.0.2. O backend continua Redis, com os mesmos nomes de fila,
prefixo `bull`, IDs, épocas, limiter e slot de envio. Não há migration, env ou payload
novo. O alias `bullmq-v5` é apenas dependência de desenvolvimento para provar N-1;
ele é removido pelo prune da imagem.

## Antes da janela

- [ ] Registrar SHA/imagem alvo e checks `ci`, `imagens`, `advisories` verdes. Confirmar
      Auto Deploy desligado (D-027). Reservar janela sem campanha ativa/pareamento.
- [ ] Concluir e registrar os aceites dos [deploys C](deploy-c-onda3.md) e
      [D](deploy-d-manutencao.md). Não pular diretamente da produção antiga para várias
      majors juntas; não incluir Nest 12 nesta janela. B-004 stop-first, B-005
      backup/restore e B-007 diagnóstico/canários continuam exigidos; observar P-099.
- [ ] Separar imagem de rollback da E16 (`7d547fc`, BullMQ 5.81.5), já validada na
      janela D. Preservar credenciais, volume WWEBJS e migrations aditivas. Snapshot
      Redis/backup deve seguir o procedimento operacional existente, sem alterar AOF
      ou reiniciar o Redis para realizar este upgrade.
- [ ] Parar consumidores/produtores antigos antes de iniciar os novos (stop-first).
      Não misturar versões durante operações de pausa global do BullMQ.

## Conferência somente leitura do Redis

No cliente Redis autenticado da instância/DB usada pelo gateway, registrar apenas
contagens e flags, antes do deploy e antes de qualquer rollback:

```text
INFO server
CONFIG GET maxmemory-policy
CONFIG GET appendonly
ZCARD bull:campaigns:repeat
ZCARD bull:webhooks:repeat
HEXISTS bull:campaigns:meta paused
HEXISTS bull:webhooks:meta paused
LLEN bull:campaigns:paused
LLEN bull:webhooks:paused
LLEN bull:campaigns:wait
ZCARD bull:campaigns:delayed
LLEN bull:campaigns:active
ZCARD bull:campaigns:failed
LLEN bull:webhooks:wait
ZCARD bull:webhooks:delayed
LLEN bull:webhooks:active
ZCARD bull:webhooks:failed
```

Esperado para `repeat`, flags `paused` e listas `:paused`: **zero**. O produto não usa
repeat/debounce nem pausa global de Queue. Se alguma dessas seis verificações retornar
valor diferente de zero, adiar a troca e investigar ainda na versão atual; não apagar
chaves nem drenar filas. Repeat antigo precisa de migração própria antes da v6.

A pausa da campanha via `/api/campaigns/:id/pause` grava PAUSED no PostgreSQL e continua
suportada; não é `Queue.pause()`. Na v6 a pausa global mantém jobs em `:wait`, enquanto
a v5 usa `:paused`. Se ambas listas coexistirem, o `RENAME` da v5 pode substituir a
lista de espera. O requisito de zero evita esse caminho; não usar pause/resume global
para preparar a janela. Fontes: [guia v6](https://github.com/taskforcesh/bullmq/blob/v6.3.10/docs/gitbook/guide/migrations/migrate-from-v5-to-v6.md),
[script v5](https://github.com/taskforcesh/bullmq/blob/v5.81.5/src/commands/pause-7.lua)
e [script v6](https://github.com/taskforcesh/bullmq/blob/v6.3.10/src/commands/pause-7.lua).

## Publicar e conferir

1. No Dokploy, selecionar o SHA aprovado e fazer um Deploy manual do gateway. Confirmar
   o encerramento do anterior antes do boot novo; manter Update/Rollback stop-first.
2. Registrar SHA/imagem, Node 26.10.0, versões efetivamente instaladas e horário. Conferir
   `/health` com database/redis/storage verdadeiros e reidratação das sessões. Não
   provocar reconexões em rajada, logout, novo QR ou limpeza de autenticação.
3. Conferir logs: ausência de `Missing lock`, erro de backend/client, jobId inválido,
   repeat legado ou Worker parado; callbacks antigos não devem gravar status/auth.
4. Comparar contagens de `wait`, `delayed`, `active` e `failed`; não exigir filas vazias.
   Jobs legados de campanhas PAUSED são descartados sem requeue, mas podem consumir um
   slot de início de 8 s (P-099). Nunca usar drain/obliterate/FLUSHDB como correção.
5. Em canário separado autorizado pelo dono: webhook para destino controlado com
   retry/DLQ/reentrega; campanha de teste com pausa/retomada, sessão temporariamente
   indisponível e recuperação, verificando espaçamento e ausência de FAILED transitório.
   Nenhum chip, QR ou envio real foi usado na validação local/CI desta etapa.
6. Shutdown offline foi provado com worker já ocioso. `close()` não tem timeout próprio;
   operação Redis principal pendente no momento da falha ainda exige investigação (P-100).
   Não reduzir retries nem forçar close como contorno; conferir duração no encerramento
   real e preservar StopGracePeriod/B-004.
7. O painel não tem mudança de comportamento na E17. Preservar o aceite HTTP/navegador
   da E16 e os canários A/B/W/G pendentes. Não anunciar proteção em produção pelo merge.

## Rollback

- Guardar diagnóstico e contagens. Interromper a janela em vez de repetir restarts.
- Repetir as verificações `repeat`/`paused` acima. Com qualquer valor não zero, investigar
  antes de iniciar v5; não renomear/remover chaves manualmente.
- Com as filas comuns do produto e sem pausa global, selecionar a imagem E16 aprovada
  e fazer rollback manual stop-first. Preservar Redis, banco, épocas, intenções e
  `bull:campaigns:send-slot`; não restaurar snapshot por cima de envios já realizados.
- Confirmar health, reidratação, consumo das filas e destinatários no banco. Os testes
  locais cobrem jobs comuns v5→v6 e v6→v5, incluindo atraso; não constituem uma garantia
  geral de downgrade de schedulers, flows, backends novos ou recursos não usados aqui.

Devolver: SHA/imagem/horário, versões, contagens antes/depois, flags verificadas,
health/reidratação, efeito do canário e eventual rollback. Deploy e aceite são evidências
distintas do CI e do merge.
