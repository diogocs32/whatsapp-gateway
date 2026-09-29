---
tipo: runbook
dono: Diogo Santos
revisado_em: 2026-09-29
validade: 2026-10-29
status: preparado — não executado; deploy e canário dependem da janela do dono
origem: E13/P-056, E14/P-057 e E15/P-058 — fechamento da Onda 3
---

# Deploy C — lease, campanhas e afinidade de proxy

Este é o checklist de execução **manual pelo dono** após o merge da E15 com CI verde.
Prepará-lo, passar nos testes e mergear não comprovam deploy nem comportamento em produção.
O auto-deploy consta desligado por D-027; conferir esse estado na janela. O último SHA de
produção documentado antes da E15 é `768fb26`, sem inspeção ao vivo nesta etapa.

## 1. Antes de iniciar a janela

- [ ] Registrar SHA alvo da `main`, PR/CI da E15, imagem/SHA atual e opção de rollback
      disponível em [rollback-gateway.md](rollback-gateway.md). Conferir o que entrou entre
      esses SHAs: o Deploy da `main` também publica etapas anteriores ainda ausentes da produção.
- [ ] Concluir B-005: backup recente do Postgres em destino **fora da VPS**, restaurado em
      banco descartável. Comparar schema, migrations e contagens de `wa_sessions`/`wa_auth_keys`
      com o snapshot do backup; registrar data, destino, duração e resultado. **Não iniciar um
      gateway usando as credenciais restauradas.** O backup do Postgres não inclui o volume
      `/data/wwebjs`; conferir a cópia consistente e a persistência desse volume separadamente.
- [ ] Confirmar B-004 **antes do primeiro Deploy com E13**: Update e Rollback em `stop-first`,
      StopGracePeriod de 30 s e campo Health Check do Swarm vazio. Procedimento no
      [deploy A, §3](deploy-a-onda1.md#3-depois-do-deploy-a-estável--b-004-stop-first).
      Se ainda não aplicado, concluir B-004 com a revisão estável aprovada antes do Deploy C.
      Salvar o JSON no painel sem confirmar o serviço não encerra o bloqueio.
- [ ] Escolher janela sem campanhas em execução ou pessoas pareando contas; registrar quais
      campanhas foram pausadas pelo dono. Teto diário atingido e guardrail manual continuam
      exigindo `/resume` manual depois; a E14 não os libera automaticamente.
- [ ] Reservar um chip/sessão de teste e proxy residencial dedicado para B-007. Levantar o
      inventário de proxies do §2 e a fila do §3 antes de decidir seguir.

No servidor, a confirmação de B-004 é somente leitura; substituir o serviço pelo nome real:

```sh
docker service inspect <servico-do-gateway> --format \
  '{{json .Spec.UpdateConfig}} {{json .Spec.RollbackConfig}} {{.Spec.TaskTemplate.ContainerSpec.StopGracePeriod}}'
```

Os dois JSON devem mostrar `"Order":"stop-first"`; o último valor deve ser `30000000000`.
Guardar o output com horário. O container anterior à E13 ignora a lease, então o primeiro
deploy não pode depender dela para impedir sobreposição. **WWEBJS deve continuar stop-first
também nos deploys seguintes**, porque o perfil/Chromium é um efeito externo ao Postgres.

## 2. Inventário somente leitura de proxies antes do deploy

Executar no banco usado pelo gateway, com acesso somente leitura. As consultas usam tabelas e
campos já existentes antes da E13; não imprimem senhas ou material de autenticação. Guardar o
resultado operacional fora do repositório. O teste de saúde existente usa ipify e não comprova
reputação no WhatsApp (P-002).

**SINGLE que passará a falhar explicitamente:** a sessão não conectará diretamente se o pin
estiver ausente, tiver sido apagado, estiver desabilitado ou DEAD, mesmo com
`WA_REQUIRE_PROXY=false`. Corrigir a atribuição pelo painel/API antes de seguir:

```sql
SELECT w.id, w.name, w.engine, w.status,
       a."currentProxyId", p.position, p.enabled, p.status AS proxy_status,
       CASE
         WHEN a."currentProxyId" IS NULL THEN 'SEM_PIN'
         WHEN p.id IS NULL THEN 'PROXY_REMOVIDO'
         WHEN NOT p.enabled THEN 'DESABILITADO'
         WHEN p.status = 'DEAD' THEN 'DEAD'
       END AS motivo
FROM wa_sessions w
JOIN session_proxy_assignments a ON a."sessionId" = w.id
LEFT JOIN proxies p ON p.id = a."currentProxyId"
WHERE a.mode = 'SINGLE'
  AND (a."currentProxyId" IS NULL OR p.id IS NULL
       OR NOT p.enabled OR p.status = 'DEAD')
ORDER BY w.name;
```

**RANGE/GLOBAL:** registrar candidatos elegíveis e se o pin atual ainda está entre eles. Zero
candidatos significa FAILED explícito; pin inelegível permite escolher outro candidato. ALIVE
e UNTESTED são elegíveis quando habilitados. Um RANGE exige limites válidos:

```sql
SELECT w.id, w.name, a.mode, a."rangeStart", a."rangeEnd", a."currentProxyId",
       count(p.id) AS candidatos_elegiveis,
       coalesce(bool_or(p.id = a."currentProxyId"), false) AS atual_elegivel
FROM wa_sessions w
JOIN session_proxy_assignments a ON a."sessionId" = w.id
LEFT JOIN proxies p
  ON p.enabled AND p.status <> 'DEAD'
 AND (a.mode = 'GLOBAL_ROUND_ROBIN'
      OR (a.mode = 'RANGE' AND p.position BETWEEN a."rangeStart" AND a."rangeEnd"))
WHERE a.mode IN ('RANGE', 'GLOBAL_ROUND_ROBIN')
GROUP BY w.id, w.name, a.mode, a."rangeStart", a."rangeEnd", a."currentProxyId"
ORDER BY w.name;
```

**NONE/sem atribuição:** são as únicas sessões que ainda podem usar saída direta enquanto
`WA_REQUIRE_PROXY=false`. Atribuir um proxy elegível às que precisam conectar antes do B-001:

```sql
SELECT w.id, w.name, w.engine, w.status
FROM wa_sessions w
LEFT JOIN session_proxy_assignments a ON a."sessionId" = w.id
WHERE a."sessionId" IS NULL OR a.mode = 'NONE'
ORDER BY w.name;
```

Não mudar uma sessão para NONE para contornar um proxy inválido. A E15 preserva `currentProxyId`
enquanto elegível, inclusive em RANGE/GLOBAL; a estratégia só escolhe quando falta um pin elegível.
O PUT SINGLE rejeita proxy inválido/em uso por outra sessão e permite manter o próprio.

## 3. P-099 — medir o backlog legado de campanhas

Na conexão Redis autenticada usada pelo gateway, selecionar o **mesmo banco lógico** de
`REDIS_URL` ou `REDIS_DB`. A fila chama-se `campaigns` e usa o prefixo BullMQ padrão `bull`
(`campaign-queue.ts` e `redis-connection.ts`). Estes comandos são somente leitura:

```text
LLEN bull:campaigns:wait
ZCARD bull:campaigns:delayed
LLEN bull:campaigns:active
LLEN bull:campaigns:paused
```

Registrar horário e as quatro contagens antes do deploy, após a reidratação e durante o
acompanhamento. Repetir a leitura de `wait`/`delayed` para observar a tendência. A lista `paused`
é da pausa da **fila BullMQ**; campanha PAUSED é um estado no Postgres e seus jobs podem estar
em `wait`/`delayed`.

A versão antiga pode ter acumulado jobs de campanhas PAUSED a cada 30 s. A E14 descarta esses
jobs sem reenfileirar nem enviar, mas cada job antigo ainda pode consumir um slot do limiter
global de 8 s. Logo, backlog alto pode atrasar campanhas ativas depois do deploy. O tempo real
depende também dos jobs delayed e das campanhas presentes; contagens sozinhas não identificam
quais jobs podem ser removidos.

**Não drenar a fila inteira, executar `obliterate`/`FLUSHDB` ou apagar chaves em massa.** Se a
drenagem atrasar campanhas ativas, registrar P-099 com as contagens e preparar uma limpeza
seletiva revisada por campanha, estado e época. Preservar jobs da época zero de campanhas
RUNNING; a migration E14 usa zero justamente para aceitar os jobs existentes. Após o deploy,
esta consulta ajuda a identificar essas campanhas sem alterar nada:

```sql
SELECT id, name, status, "scheduleEpoch"
FROM campaigns
WHERE status = 'RUNNING' AND "scheduleEpoch" = 0
ORDER BY id;
```

As chaves foram conferidas no BullMQ 5.81.5 instalado (`queue-base.js`/`queue-keys.js`);
[LLEN](https://redis.io/docs/latest/commands/llen/) e
[ZCARD](https://redis.io/docs/latest/commands/zcard/) são comandos de leitura.

## 4. Deploy manual e migrations

1. Com os pré-requisitos concluídos, conferir o SHA alvo no Dokploy e fazer **um Deploy manual
   do gateway**. Se a diferença entre a produção e a `main` também incluir dashboard pendente,
   publicar esse app na mesma janela conforme seus runbooks; a E15 em si muda o gateway.
2. Conferir o encerramento do container antigo antes da reidratação do novo. Esperar
   `Shutdown: todas as engines fecharam`; investigar `Shutdown estourou o teto de 15s` ou
   `Shutdown sem confirmação`. Não repetir restarts para tentar eliminar o erro.
3. O entrypoint executa `/app/node_modules/.bin/prisma migrate deploy` antes de
   `node dist/main.js`. A Onda 3 inclui as migrations aditivas:
   - `20260927124000_session_lease_fencing` — `authEpoch`, `leaseOwner`, `leaseUntil`;
   - `20260929053000_campaign_schedule_epoch` — `campaigns.scheduleEpoch`, default zero.
     A E15 não adiciona migration. O entrypoint aplica **todas as migrations pendentes** da
     imagem, inclusive as das ondas anteriores presentes na `main`; revisar essa lista antes.
4. Registrar deploy `Done`, SHA/imagem efetivamente selecionados, horário e duração. Conferir
   o log de migrations sem erro; não usar reset, `db push` ou editar/reverter migration aplicada.
5. Conferir `/health` no domínio de API usado pela produção: HTTP 200, `checks.database`,
   `checks.redis` e `checks.storage` verdadeiros, `uptimeSeconds` reiniciado. `/health` saudável não comprova sessões WORKING,
   saída pelo proxy ou envio. Conferir essas condições separadamente abaixo.

## 5. Diagnóstico e canário B-007 após o deploy

- [ ] Registrar Node (`node -v`/`node -p process.versions`), Chromium (`chromium --version`),
      Postgres (`SELECT version()`), Redis (`INFO server`, `CONFIG GET appendonly`,
      `CONFIG GET maxmemory-policy`, `CONFIG GET save`) e Traefik
      (`docker exec dokploy-traefik traefik version`), conforme B-007. Ler os valores de
      `WA_REQUIRE_PROXY` e `WWEBJS_WEB_VERSION` sem copiar secrets. Achados de versão/config
      continuam em suas pendências; não juntar upgrades de infraestrutura a este deploy.
- [ ] Conferir `GET /api/sessions`, painel e logs até terminar a reidratação escalonada.
      Sessões antes WORKING devem voltar; STOPPED não deve religar sozinho. Investigar
      FAILED por proxy e `Lease perdido`, 440/`replaced` ou QR inesperado. Registrar
      `lastError`/`lastErrorDetails` e horário, sem gerar novo QR para a frota.
- [ ] No chip de teste, anotar `currentProxyId` antes e depois de **uma reconexão controlada**.
      Se o proxy continuar elegível, o ID deve permanecer igual. Confirmar também o caminho
      real no registro de tráfego do proxy; o log de escolha do gateway, sozinho, não prova
      que a saída ocorreu por ele.
- [ ] Para o aceite de recuperação da Onda 3, testar uma indisponibilidade de rede por mais
      de 2 min somente no caminho dedicado ao canário, restaurá-lo e medir a volta automática
      a WORKING em até 15 min. Não afetar um proxy compartilhado ou induzir 401/403/440, ban,
      logout ou corrupção de credenciais. Proxy SINGLE marcado DEAD exige correção/teste e
      nova tentativa explícita; não confundir esse estado com queda transitória de rede.
- [ ] Retomar somente a campanha de teste escolhida pelo dono e observar espaçamento efetivo
      de pelo menos 8 s, sem rajada. Durante reconexão/lease indisponível, destinatários devem
      permanecer PENDING e tentar novamente, sem FAILED por esse motivo. Conferir reserva,
      resultado e contagens da fila; as demais campanhas pausadas dependem da decisão do dono.
- [ ] Se os canários anteriores ainda estiverem pendentes, executar com o mesmo cuidado os
      runbooks [Baileys](canario-baileys-onda2.md) e [WWEBJS](canario-wwebjs-onda6.md).
      Pareamento novo por QR/código, mídia, webhook e Inbox usam somente chip e conversa de
      teste. Nenhuma destas provas reais foi executada durante a E15.

## 6. B-001 depois do deploy C estável

Conferir novamente o inventário do §2. Depois de todos os casos que precisam conectar terem
proxy elegível e do canário estar aprovado, o dono confirma se `WA_REQUIRE_PROXY=true` já está
ativo. Se não estiver, configurar a env e fazer o Redeploy manual em uma janela controlada,
mantendo B-004, backup e rollback. Repetir `/health`, reidratação e observação do proxy.

Registrar a data e devolver **"B-001 feito"**. A informação de agosto pertencia ao Dokploy antigo;
ela não comprova a env do servidor atual. A E15 já bloqueia saída direta em modos com proxy
mesmo com a env false; B-001 estende a exigência também a NONE/sem atribuição.

## 7. Se falhar e o que devolver

Usar [rollback-gateway.md](rollback-gateway.md), preservando `stop-first`. Guardar diagnóstico e
evitar restarts em sequência. Não reverter as migrations aditivas. Se voltar a uma imagem
anterior à Onda 3, ela ignora lease/fencing e perde as garantias de proxy/campanha; manter as
campanhas pausadas até avaliar o incidente. `scheduleEpoch` no banco não faz a imagem antiga
respeitar épocas ou espaçamento.

Devolver no próximo chat: SHA/imagem e horário do deploy; outputs de B-004; backup/restore
B-005; saúde e reidratação; versões e resultado do canário B-007; IDs do proxy antes/depois;
tempo de recuperação; contagens `wait`/`delayed` e eventual impacto P-099; estado/data de B-001.
Assim é possível registrar separadamente código/CI/merge, deploy e aceite real.
