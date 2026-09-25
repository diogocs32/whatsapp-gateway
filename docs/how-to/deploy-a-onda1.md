---
tipo: runbook
dono: Diogo
revisado_em: 2026-09-25
validade: 2026-10-25
status: ativo
origem: etapa E4 do roteiro — fecha a Onda 1 (P-055, P-054, P-053, P-065, P-070) e prepara o B-004
---

# 🚀 Deploy A (Onda 1) — o que fazer antes, o que conferir depois, e o stop-first (B-004)

> **Para quem:** o dono (nada disto é executado por chat — R0). **📎 25/09 (D-027):** todo auto-deploy
> do Dokploy está DESLIGADO — o merge não publica nada; dashboard e gateway sobem quando você clica
> **Deploy** em cada um (§2, passo 0).
> **O que sobe:** PR #6 (`feature/onda1-guardas-seguranca`) — guardas de build (E2), Nest 11.2.6 +
> multipart 10.1.2 + bullmq 5.81.5 + Node fixado 26.10.0 + checagem de advisories (E3), rate-limit/
> log/auditoria pela rota resolvida + egress com `net.BlockList` + fotos por URL com política de
> egress (E4). **Sem migration nova.** Os DOIS apps mudam neste PR (o Dockerfile do
> dashboard deixou de copiar `patches/` — E2) e os dois precisam do Deploy manual.

## 1. Antes do merge (5 min)

1. PR #6 com os 3 checks verdes: `ci`, `imagens` (inclui o smoke novo do login → 429) e
   `advisories`. `gh pr checks 6`.
2. Mergear o **PR #5** antes (só docs/CI — não deploya) e depois o **#6**, sem squash (as etapas
   ficam como commits separados). O #6 já contém os commits do #5.
3. Janela calma **para o Deploy do gateway** (o merge em si não mexe no gateway): nenhuma campanha
   rodando e ninguém pareando conta. Até o B-004, **todo deploy abre as mesmas contas duas vezes por
   ~15 s** (start-first — D-020).
4. Só leitura, no banco de produção (opcional, para saber o que esperar):
   - `SELECT name FROM wa_sessions WHERE name ILIKE 'messages%';` — sessões com esse nome passam a
     ter as mutações auditadas (antes escapavam por bug; D-025).
   - `SELECT url FROM webhooks;` — webhook com IP literal ou host interno precisa estar em
     `EGRESS_ALLOW_HOSTS` (já era assim desde 09/09). Faixas **novas** recusadas: IPv6 que embute
     IPv4 privado, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `192.88.99.0/24`, `2002::/16`,
     `2001::/23` e todo IPv6 fora de `2000::/3` (D-026). Um host público comum não é afetado.

## 2. Depois do merge — Deploy do gateway e checklist do deploy A

**Passo 0 (auto-deploy desligado — D-027):** confira que o último commit da `main` é o merge do #6;
depois Dokploy → projeto `conexozenvo` → app **dashboard** → **Deploy** (sem risco para as contas) e,
na janela calma do §1.3, app **gateway** → **Deploy**. Sem isso a produção continua no código de
15/09 — o `/health` segue com o uptime antigo.

Marque cada item; se algo falhar, ver §4.

| #   | Onde                                                 | O que conferir                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Dokploy → gateway e dashboard → **Deployments**      | Os dois deploys que VOCÊ disparou terminam `Done` (se o build falhar, as guardas da P-055 pararam uma imagem quebrada — **produção não mudou**)                                                                                                        |
| 2   | `https://api.conexozenvo.cloud/health`               | 200 com `database`, `redis` e `storage` **true** e `uptime` recomeçando                                                                                                                                                                                |
| 3   | Dokploy → gateway → **Logs** (boot)                  | `Runtime: Node v26.10.0` (pin da E3 — antes era a tag móvel) · `Nest application successfully started` · nenhum `Cannot find module` · nenhum `ERROR [ExceptionsHandler]` de 4xx                                                                       |
| 4   | Logs do boot, 2–3 min                                | Reidratação escalonada: as sessões que estavam WORKING voltam a WORKING. Anotar se aparecer `440`/`replaced`/`conflict` (efeito do start-first que o B-004 elimina)                                                                                    |
| 5   | Painel (conexozenvo.com)                             | Login funciona; página **Auditoria** mostra a entrada do seu login; `/atendimento` carrega                                                                                                                                                             |
| 6   | n8n                                                  | O próximo evento chega no webhook (Trigger). Nos logs do gateway: nenhum `URL de mídia recusada`, `URL da imagem recusada` ou `política de egress` inesperado; dead-letter sem itens novos                                                             |
| 7   | Envio (canário — **só com chip de teste**, opcional) | 1 texto e 1 `media-url` por uma sessão de teste → 201 e entregue                                                                                                                                                                                       |
| 8   | Terminal local                                       | Checagem de advisories na main: `gh workflow run advisories.yml --ref main` → `gh run list --workflow advisories.yml -L 1` → `gh run view <id>` (o **resumo** do job lista o que foi checado; falha só com advisory sem aceite datado — D-023)         |
| 9   | GitHub → Settings → Notifications → Actions          | "Notify me: only failures" por e-mail (é o alarme da checagem diária)                                                                                                                                                                                  |
| 10  | Terminal local (opcional — prova o P-053 em prod)    | `for i in $(seq 11); do curl -s -o /dev/null -w '%{http_code} ' -X POST -H 'content-type: application/json' -d '{}' 'https://api.conexozenvo.cloud/api/auth/%6Cogin'; done; echo` → **dez `401` e um `429`**. Bloqueia o login do SEU IP por até 1 min |
| 11  | Dokploy → gateway → **Environment** (só olhar)       | `RATE_LIMIT_MAX` ausente ou > 0 (com `0` o rate-limit inteiro, login incluso, fica desligado)                                                                                                                                                          |

Devolver no próximo chat: "deploy A ok em DD/MM HH:MM" + o que saiu diferente (itens 4, 6, 10).

## 3. Depois do deploy A estável — B-004 (stop-first)

**Por que agora:** o stop-first para o container antigo ANTES de subir o novo — acaba com as mesmas
contas abertas duas vezes a cada deploy (D-020). Só é seguro com as guardas de build (P-055) já em
produção, que é o que o deploy A leva. Custo aceito: ~30–90 s de API fora por deploy.

1. Dokploy → projeto `conexozenvo` → app **gateway** → **Advanced** → **Cluster Settings** →
   **Swarm Settings** (doc oficial: `docs.dokploy.com` → Applications → Rollbacks/Zero Downtime,
   espelho `~/dioggo-agents/agentes/docs/dokploy/latest/core/applications/rollbacks.mdx:57-58`).
2. **Update Config** (colar e salvar):

   ```json
   {
     "Parallelism": 1,
     "Delay": 10000000000,
     "FailureAction": "rollback",
     "Order": "stop-first"
   }
   ```

3. **Rollback Config** (colar e salvar):

   ```json
   { "Parallelism": 1, "Order": "stop-first" }
   ```

4. **Stop Grace Period (nanoseconds)**: `30000000000` (30 s — cobre o `onModuleDestroy` de até 15 s
   das engines + fechamento das filas; campo do Dokploy v0.30.2,
   `swarm-forms/stop-grace-period-form.tsx`, aplicado como `StopGracePeriod` em
   `utils/docker/utils.ts:697-700`).
5. **Health Check do Swarm: deixar VAZIO** (issue Dokploy #5171 — o campo prende as tasks em
   `Starting`; o HEALTHCHECK do Dockerfile continua valendo).
6. **Deploy** (redeploy) do gateway para aplicar — mesma janela calma do §1.3.
7. Conferir no servidor (SSH na VPS, só leitura):

   ```sh
   docker service ls | grep gateway
   docker service inspect <servico-do-gateway> --format \
     '{{json .Spec.UpdateConfig}} {{json .Spec.RollbackConfig}} {{.Spec.TaskTemplate.ContainerSpec.StopGracePeriod}}'
   ```

   Esperado: os dois JSON com `"Order":"stop-first"` e `30000000000`.

8. No **próximo** deploy, olhar o log: o container antigo registra `Shutdown: todas as engines
fecharam` ANTES do novo começar a reidratar; nenhum `440`/`replaced`.
9. Devolver: "B-004 feito em DD/MM, inspect mostra stop-first" + a observação do item 8 → vira a
   D-xxx que fecha o B-004 (corrige de vez a D-014).

**Se o deploy com stop-first falhar** (o novo não sobe): não há container antigo segurando a API —
seguir [rollback-gateway.md](rollback-gateway.md) (rollback por registry do Dokploy ou redeploy do
commit anterior).

## 4. Se algo der errado no deploy A

- Build falhou → produção intacta; ler o log do build (guardas P-055), corrigir, novo deploy.
- Container novo não fica healthy → hoje (start-first) o antigo segura a API; ver logs e
  [rollback-gateway.md](rollback-gateway.md).
- Webhook parou (dead-letter com `política de egress`) → o host do destino caiu numa faixa nova
  (D-026): liberar em `EGRESS_ALLOW_HOSTS` e reentregar da dead-letter.
- Login do painel com 429 → 10 tentativas/min por IP (D-025); esperar 1 min. Se todos os usuários
  levarem 429 juntos, o IP real não está chegando (Traefik/CDN) — ver B-007.
