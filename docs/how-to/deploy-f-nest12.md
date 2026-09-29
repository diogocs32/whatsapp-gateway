---
tipo: runbook
dono: Diogo Santos
revisado_em: 2026-09-29
validade: 2026-10-29
status: preparado — deploy e canário não executados
origem: E18 / P-062 parte 3 / D-044
---

# Deploy F — Nest 12 no runtime

Janela manual própria, depois dos aceites C/D/E. Nest common/core/platform-fastify
12.1.1 (piso 12.0.4), Config 12.0.1, JWT 12.0.2, nestjs-pino 5.2.1 e Fastify
5.12.5. CLI/schematics continuam 11 e TypeScript 5.9.3; aplicação CommonJS no Node
26.10.0 usa require(esm). BullMQ 6.3.10/ioredis 5.11.1/ULID 3.0.2 permanecem.
Nenhuma migration, env, rota ou payload novo. `/api` é o contrato do node n8n;
não existe uma nova rota `/api/n8n`.

## Antes da janela

- [ ] Registrar SHA/imagem alvo, checks ci/imagens/advisories verdes e Auto Deploy
      desligado (D-027). Guardar imagem anterior aprovada da E17, merge `4de87fe`.
- [ ] Confirmar aceites dos [deploys C](deploy-c-onda3.md),
      [D](deploy-d-manutencao.md) e [E](deploy-e-bullmq6.md). Não saltar da produção
      antiga diretamente para várias majors na mesma janela.
- [ ] Confirmar B-004: Update/Rollback stop-first e StopGracePeriod 30 s;
      B-005: backup fora da VPS + restore testado; B-007: diagnóstico/canário.
      Manter as precauções de perfil WWEBJS e não iniciar pareamentos/campanhas
      durante a troca. Não operar com Redis indisponível ou conexão reconectando/comando sem resposta (P-100).
- [ ] Registrar health/uptime, reidratação e contagens wait/delayed/active/failed
      das duas filas. Preservar observação P-099 e verificações repeat/paused do E.
      Não drenar filas nem remover épocas, reservas, intenções ou autenticação.

## Publicar e conferir

1. No Dokploy, selecionar a imagem/SHA aprovado e fazer Deploy manual do gateway.
   Conferir que o antigo terminou antes do boot novo. Registrar duração do shutdown,
   códigos de saída e se houve SIGKILL; não repetir restarts para obter uma prova boa.
2. Conferir versões na imagem efetiva e `/health` com database/redis/storage true.
   A guarda de build deve mostrar Nest 12.1.x, identidade única do DI e ULID CommonJS.
   Verificar ausência de ERR_REQUIRE_ESM/MODULE_NOT_FOUND, erro de provider ou plugin.
3. Conferir reidratação escalonada, uma posse por sessão, status/auth preservados,
   ausência de 440/replaced e liberação/renovação das leases. Não provocar logout/QR.
4. Com usuário/chave de teste controlados pelo dono: login do painel mantém 201 e
   cookies; API key inválida 401; CSRF/RBAC continuam bloqueando. Em IP separado,
   dez logins inválidos dão 401 e o 11º 429, inclusive variantes percent-encoded
   e forma absoluta. Não usar IP dos operadores para esse teste.
5. Em fluxo n8n de canário autorizado: ID/nome de sessão, envio sintético autorizado
   com idempotencyKey, repetição sem duplicar, 409 por payload divergente e 423 pelo
   guardrail. Verificar webhook/HMAC, retry/DLQ, histórico e auditoria sem segredos.
   A validação local usa fakes; mensagens reais continuam sob controle do dono.
6. Observar campanhas após aceite: épocas, PAUSED sem laço, espaçamento global de
   8 s, reserva cercada e indisponibilidade transitória sem FAILED permanente.
   Comparar contagens do Redis/banco sem exigir filas vazias.
7. Observar shutdown normal: campanhas/webhooks drenam antes das sessões; a engine
   e escritas cercadas de status/diagnóstico acompanhadas pelo manager terminam antes de liberar lease; fan-out precede Redis,
   infraestrutura termina antes do fechamento HTTP. P-100 não autoriza close(true)
   nem mudança de retries. No teste diferencial v5/v6, o EVAL principal pendente
   resolve ao restaurar a rede; se a bloqueante já está sem socket em reconnecting,
   disconnect espera um evento end ausente e close continua pendente mesmo após a
   recuperação da principal. A prova observa uma janela finita, não mede infinitude.
   Redis deve estar saudável durante a troca. Timeout/SIGKILL é falha de drenagem;
   registrar o caso e interromper a janela para diagnóstico, conforme
   [P-100/DONE E18](../sessions/DONE-2026-09-29-1501-e18-nest12.md#p-100--duas-esperas-reproduzidas).

## Rollback

- Guardar diagnóstico/contagens e selecionar a imagem E17 aprovada (`4de87fe`),
  com Nest 11 e BullMQ 6, para rollback manual stop-first. Não voltar a BullMQ 5
  nesta operação; isso é o procedimento próprio do deploy E.
- Preservar Postgres/Redis/volume WWEBJS e migrations aditivas. Sem restore sobre
  envios já realizados e sem apagar filas ou autenticação.
- P-100 também ocorre na v5; rollback de Nest ou BullMQ não é correção dessa falha.
- Revalidar health, autenticação, reidratação, filas e efeito do canário. Não
  confundir imagem construída, CI verde ou merge com implantação comprovada.

Devolver SHA/imagem/horário, versões, shutdown/exit code, health/uptime, contagens,
resultado do canário n8n/campanhas e eventual rollback. Deploy e canários permanecem
pendentes até esse retorno.
