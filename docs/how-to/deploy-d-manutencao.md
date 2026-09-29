---
tipo: runbook
dono: Diogo Santos
revisado_em: 2026-09-29
validade: 2026-10-29
status: preparado — deploy e aceite em produção não executados
origem: E16 / P-062 parte 1 / D-042
---

# Deploy D — manutenção das imagens e do painel

Executar manualmente depois do merge da E16 com CI verde. Esta etapa fixa as bases Node/nginx,
atualiza React/Router e tooling dentro das majors existentes, revisa scripts de instalação e
remove ts-node sem uso. Não há migration, env ou contrato `/api` novo na E16.

## Antes da janela

- [ ] Registrar SHA alvo, PR/CI verde (`ci`, `imagens`, `advisories`) e imagem/SHA atual dos
      dois apps. Confirmar Auto Deploy desligado (D-027) e uma revisão estável para rollback.
- [ ] Comparar o alvo com a produção: se a Onda 3 ainda não foi publicada e aceita, cumprir
      primeiro o [checklist C](deploy-c-onda3.md). A imagem contém as etapas anteriores e
      aplica todas as migrations pendentes; não é apenas a manutenção E16.
- [ ] Confirmar B-004: Update/Rollback `stop-first`, StopGracePeriod 30 s e Health Check do
      Swarm vazio. B-005: backup fora da VPS com restore testado; volume `/data/wwebjs`
      persistente/copiado. Preservar o diagnóstico e canário B-007, a observação P-099 e a
      sequência do B-001. O primeiro deploy E13 não pode confiar na lease do container antigo.
- [ ] Reservar janela sem pareamento ou campanha ativa. Não juntar BullMQ 6, Nest 12 ou
      outra major a este deploy. Conferir `VITE_API_URL` nos build args do dashboard.

## Publicar e conferir

1. No Dokploy, selecionar o SHA aprovado e fazer um Deploy manual do gateway; aguardar
   encerramento limpo do anterior, migrations concluídas e reidratação do novo. Não repetir
   restarts se houver erro. A E16 não pede novo QR nem mudança de atribuição de proxy.
2. Registrar Node do container (`node -v`: `v26.10.0`), Chromium (`chromium --version`), SHA,
   horário e imagem. Confirmar `/health` 200 com database/redis/storage verdadeiros e uptime
   reiniciado. Conferir separadamente a volta das sessões e os logs de lease/proxy/440.
3. Fazer Deploy manual do dashboard no mesmo SHA, mantendo os build args. Conferir no
   container `nginx -v` (`1.30.5`) e `nginx -t` (sucesso).
4. A partir do checkout aprovado, executar o smoke de leitura contra a **origem real do painel**:

   ```sh
   node scripts/smoke-dashboard.mjs https://<dominio-do-painel>
   ```

   Esperado: `smoke dashboard OK`. Ele verifica index, `/login`, `/atendimento`, `/conectar`,
   JS/CSS com tipos corretos, cache imutável, gzip, headers e 404 de asset ausente. Se o proxy
   alterar headers ou compressão, investigar a diferença sem enfraquecer a guarda às cegas.

5. No navegador, abrir `/login` diretamente, entrar, navegar entre Sessões e Atendimento,
   digitar um filtro de sessão, recarregar a URL filtrada e abrir/fechar diálogos. Conferir
   console sem erro de React/chunk e manter as validações Safari e dos canários anteriores.
   O smoke HTTP não executa JavaScript no navegador nem prova uma conta WhatsApp real.

## Se falhar

- `ESTRICTALLOWSCRIPTS` no build: revisar a versão/script que ficou fora de `allowScripts`
  em PR próprio, ou reconstruir a revisão aprovada; não liberar todos os scripts.
- Falha de patch/dist/deps/Prisma: a guarda impede imagem inválida; conservar os logs e
  corrigir antes de publicar. Não retirar a guarda para terminar o deploy.
- Tela vazia/chunk 404 ou erro de gateway: guardar o diagnóstico e usar
  [rollback-gateway.md](rollback-gateway.md); dashboard volta ao SHA anterior aprovado com
  seus build args. Preservar `stop-first`, credenciais, volume e migrations aditivas.

Os digests multiarch dos Dockerfiles fixam a base; o `apt` ainda instala pacotes Debian
disponíveis no momento do build (Chromium incluso). Runner Ubuntu 24.04 e actions por SHA
também não congelam o conteúdo inteiro do runner. Atualizar pins exige novo PR com ambos
Dockerfiles, guardas, suíte e smoke; acompanhar advisories, pois o digest não recebe patches sozinho.

Devolver no próximo chat: SHA/imagem e horário dos dois deploys, versões Node/nginx/Chromium,
health/reidratação, resultado do smoke e navegação, canários ainda pendentes e eventual rollback.
CI/merge, deploy e aceite de conta são evidências distintas.
