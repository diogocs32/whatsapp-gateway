---
tipo: runbook
dono: Diogo
revisado_em: 2026-09-26
validade: 2026-10-26
status: ativo
origem: etapa E25 do roteiro — fecha a Onda 8 (P-066, P-067, P-068, P-072, P-074, P-076, P-077) — D-028..D-031
---

# 🚀 Deploy G (Onda 8) — conversas fiéis ao WhatsApp Web: antes, depois e como voltar

> **Para quem:** o dono (nada disto é executado por chat — R0). **Auto-deploy desligado (D-027):** o
> merge não publica nada; gateway e dashboard sobem quando você clica **Deploy** em cada um.
> **O que sobe:** PR #7 (`feature/onda8-conversas`) — E22 (conteúdo fiel, reação em tabela própria,
> selo "Encaminhada", `status` no feed), E23 (balões e mídia no painel, tiques, remetente de grupo,
> `/media` sem 500), E24 (rota do encaminhar nas 2 engines, original das recebidas guardada 7 dias,
> ecos de localização/enquete completos) e E25 (encaminhar no painel). **Os DOIS apps mudam.**
> **2 migrations aditivas** (aplicadas sozinhas no boot do gateway — `prisma migrate deploy`):
> `20260925203458_reacoes_encaminhada` e `20260926052719_encaminhar_marcas_apagada_editada`.

## 0. Ordem recomendada: deploy A primeiro

O PR #7 nasceu da `main` com a Onda 1 já mergeada, mas **o deploy A ainda não foi feito** (produção
em `768fb26`). Se você mergear o #7 e clicar Deploy, sobem A + G juntos — dois conjuntos de mudança
na mesma janela. Recomendado: fazer o deploy A agora com a `main` como está
([deploy-a-onda1.md](deploy-a-onda1.md) §1–§2), observar 1 dia, e só então o deploy G. Se preferir
junto, siga também o checklist do deploy A no §2 abaixo.

## 1. Antes do merge (a parte que muda comportamento — 20–30 min)

1. **CI verde** no PR #7: `gh pr checks 7` (`ci`, `imagens`, `advisories`).
2. **Fluxos n8n** — [INTEGRACAO.md](../INTEGRACAO.md) §3.2, "O que conferir nos seus fluxos n8n" (9
   itens). Os que mais pegam:
   - reação **sai** do evento `message` (só `message.reaction`): fluxo que tratava reação como "lead
     respondeu" para de disparar se o webhook assina só `["message"]` (item 1 — como voltar a receber
     sem quebrar o Trigger 0.4.1);
   - localização, contato, enquete, evento e convite passam a chegar **com texto** → a IA vai
     responder a eles (item 3);
   - em **grupo**, `senderJid` passa a ser o participante — responda sempre para `chatJid` (item 9);
   - o `text` do eco de `…/messages/location` e `…/poll` enviados pela API muda (P-077).
3. **Painel no Safari** (no Chrome já foi validado localmente — E23 e E25): com o painel local ou
   depois do deploy, abra Inbox e Atendimento e confira áudio Ogg/Opus tocando (ou "Baixar"), imagem,
   vídeo com seek, lightbox; e o **encaminhar**: ⌄ aparece ao passar o mouse, "Encaminhar" entra no
   modo seleção, o diálogo abre com a busca focada, **Esc** fecha, **clique fora** fecha, o ➤ mostra o
   resultado por conversa. (O Safari estável não tem `closedby` — o clique fora é nosso; confira.)
4. **Teste com chip** (recomendado antes; senão, logo depois no canário):
   [teste-chip-encaminhar.md](teste-chip-encaminhar.md) — agora com a §4 "pelo painel".
5. **Cópia do banco** antes das migrations (B-005 segue aberto — produção sem backup): no mínimo um
   `pg_dump` do Postgres de produção guardado FORA da VPS. As 2 migrations só criam tabela/colunas
   (nada é apagado), mas sem backup qualquer imprevisto não tem volta.
6. **Janela calma** para o Deploy do gateway: nenhuma campanha rodando, ninguém pareando. Até o B-004
   o deploy abre as mesmas contas 2× por ~15 s (start-first — D-020).

## 2. Depois do merge — Deploy e checklist

**Passo 0:** confira que a `main` tem o merge do #7; Dokploy → `conexozenvo` → **dashboard** →
**Deploy**; na janela calma, **gateway** → **Deploy**.

| #   | Onde                                           | O que conferir                                                                                                                                                                                                                 |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Dokploy → gateway e dashboard → Deployments    | os dois `Done`                                                                                                                                                                                                                 |
| 2   | `https://api.conexozenvo.cloud/health`         | 200, `database`/`redis`/`storage` **true**, `uptime` recomeçando                                                                                                                                                               |
| 3   | Dokploy → gateway → Logs (boot)                | `Applying migration 20260925203458_reacoes_encaminhada` e `…20260926052719_encaminhar_marcas_apagada_editada` (ou "No pending migrations" num 2º boot) · `Nest application successfully started` · nenhum `Cannot find module` |
| 4   | Logs, 2–3 min                                  | sessões WORKING voltam a WORKING (reidratação escalonada); anote `440`/`replaced` (start-first até o B-004)                                                                                                                    |
| 5   | Painel → Inbox e Atendimento                   | emojis/localização/contato/enquete no lugar de "…"; foto e áudio abrem; tiques ✓/✓✓ nas enviadas; reações abaixo do balão; ⌄ no balão e ↪ ao lado das fotos                                                                    |
| 6   | Painel → encaminhar (**só com chip de teste**) | ⌄ → Encaminhar → ➤ para 1 aparelho seu: "Você encaminhou 1 item para …" e a cópia aparece no chat de destino com o selo — detalhes na §4 do teste com chip                                                                     |
| 7   | n8n                                            | o próximo `message` chega; uma reação chega como `message.reaction` (se o fluxo assina); resposta pelo celular ainda pausa a IA (`source:"phone"`)                                                                             |
| 8   | Banco (só leitura), depois de 1–2 dias         | `SELECT pg_size_pretty(pg_total_relation_size('wa_messages'));` — a E24 passou a guardar a original das RECEBIDAS por 7 dias (`raw`); anote o tamanho para comparar (P-083: reescrita diária da retenção)                      |

## 3. Se der errado

- **Painel quebrado, gateway bom:** voltar só o dashboard, pelo mesmo caminho do
  [rollback-gateway.md](rollback-gateway.md) (opção A — rollback por registry, se configurado no app
  dashboard; senão opção B — `git revert` do merge e Deploy manual). O painel antigo funciona com o
  gateway novo (as rotas da Onda 8 são aditivas).
- **Gateway não sobe / comportamento errado:** [rollback-gateway.md](rollback-gateway.md). As
  migrations são aditivas: o código anterior ignora a tabela `wa_message_reactions` e as colunas
  `revokedAt`/`editedAt` — **não** é preciso (nem se deve) desfazer migration (forward-only). Reações
  gravadas enquanto o código novo esteve no ar não aparecem no código antigo (voltariam a sair como
  `message` `other` só as novas).
- **n8n respondendo a reação/robôs de empresa:** é mudança de comportamento, não defeito — ajuste do
  fluxo pelo §3.2 da INTEGRACAO (itens 1–3).

## 4. Devolver no chat seguinte

"Deploy G em DD/MM HH:MM: health ok, migrations aplicadas, painel ok (Chrome/Safari), n8n ok/ajustado
(quais itens do §3.2), teste com chip: …; tamanho de `wa_messages` antes/depois: …".
