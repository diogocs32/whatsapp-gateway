---
tipo: runbook
dono: Diogo
revisado_em: 2026-09-26
validade: 2026-10-26
status: ativo
origem: etapas E24 (P-068 encaminhar — API e engines; P-077 — D-030) e E25 (interface no painel — D-031)
---

# 📱 Teste com chip do ENCAMINHAR (E24 + E25) — o que só o aparelho prova

> **Para quem:** o dono (nada disto é executado por chat — R0). O código da E24 foi provado com a
> biblioteca real e socket/navegador falsos; **o que o WhatsApp faz do outro lado** (selo no aparelho
> de quem recebe, eco do WhatsApp Web, limites do servidor) só um chip de teste mostra.
> **Nunca** use os chips da frota nem contatos reais: 1 chip de teste (remetente) + 2 aparelhos seus
> (destinos A e B), todos já com conversa entre si — e um 3º número SEM conversa para o caso cold.

## Quando fazer

- **Opção 1 (recomendada — antes da E25):** gateway LOCAL (`npm run dev` no Mac, infra `npm run
infra:up`) com o chip de teste pareado nele. Pega cedo o que a E25 (interface) assume. Pareie o
  chip de teste no local, **nunca** o mesmo chip ao mesmo tempo no Dokploy.
- **Opção 2:** depois do deploy G (fim da Onda 8), no `.cloud`, com a sessão canário (chip de teste).

Em qualquer das duas: sessão **Baileys** primeiro; se for usar o WWEBJS sob demanda, repita a §3 numa
sessão WWEBJS (a build fixa vence em 13/10 — E5).

## 1. Preparar (5 min)

1. No celular do chip de teste, receba de A: um texto, uma foto com legenda, um áudio (nota de voz),
   um documento PDF, uma figurinha, uma localização fixa, um contato; e mande de volta para A um
   texto seu (original "nossa").
2. Pegue os ids: `GET /api/sessions/<sessao>/messages?chatId=<A>` → campo `keyId` (ou `id`) de cada
   mensagem.
3. Tenha à mão a `X-Api-Key` (ou use o painel logado + `curl` com o cookie).

## 2. Casos — sessão Baileys

Envio (troque `<...>`):

```bash
curl -s -X POST "$API/api/sessions/<sessao>/messages/<keyId>/forward" \
  -H "X-Api-Key: $KEY" -H 'content-type: application/json' \
  -d '{"to":["<B>"],"idempotencyKey":"teste-fwd-1"}' | jq
```

| #   | O quê                                                                                                                                                                      | Esperado na resposta                                    | Confira no aparelho de B                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | texto recebido de A → B                                                                                                                                                    | 201, `ok:true`, `isForwarded:true`, `forwardingScore:1` | balão com **"↪ Encaminhada"**, sem citação                                           |
| 2   | foto com legenda → B                                                                                                                                                       | idem                                                    | foto abre (mídia reaproveitada, sem novo upload), legenda igual                      |
| 3   | nota de voz, documento, figurinha, localização, contato → B                                                                                                                | idem                                                    | cada um abre como no original (áudio toca como nota de voz; localização abre o mapa) |
| 4   | o texto NOSSO → B                                                                                                                                                          | 201, `isForwarded:false`                                | **sem** selo (o WhatsApp não marca a própria mensagem encaminhada)                   |
| 5   | repetir o caso 1 com a MESMA `idempotencyKey`                                                                                                                              | 201, `deduped:true`, nada chega de novo                 | nada novo                                                                            |
| 6   | mesma chave com `to:["<A>"]`                                                                                                                                               | **409**, nada sai                                       | nada                                                                                 |
| 7   | `to:[B, <3º número sem conversa>]` com a sessão em quarentena (`POST /api/sessions/<sessao>/quarantine` e, no fim, `POST /api/sessions/<sessao>/activate` — INTEGRACAO §5) | **423** `SESSION_QUARANTINED`, nada sai (nem para B)    | nada                                                                                 |
| 8   | uma mensagem que já chegou "↪↪ Encaminhada com frequência" para 2 destinos                                                                                                 | **400** `FORWARD_LIMIT`; para 1 destino → 201           | —                                                                                    |
| 9   | enquete recebida                                                                                                                                                           | **400** `FORWARD_UNSUPPORTED`                           | —                                                                                    |
| 10  | apague para todos (no aparelho de A) uma mensagem já recebida e tente encaminhar                                                                                           | **400** `FORWARD_UNSUPPORTED` (apagada)                 | —                                                                                    |

Webhook: a cópia chega como evento `message` com `fromMe:true`, **`source:"api"`** (a IA NÃO pausa),
`isForwarded`/`forwardingScore` e `idempotencyKey` = `teste-fwd-1:<número de B>`.

## 3. Casos — sessão WWEBJS (o que ficou NÃO VERIFICADO no código)

| #   | O quê                                                                       | Esperado                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | texto recebido → B                                                          | 201 com **`id` preenchido** e `confirmed` ausente. Se vier `confirmed:false` + `id:null`, o WhatsApp Web encaminhou mas o eco não veio em 10 s — anote e veja se a cópia aparece no `GET /messages` de B depois (deve aparecer como `source:"api"`, **nunca** `phone`). |
| 2   | foto → B                                                                    | idem; o `GET /media` da cópia devolve a mesma foto                                                                                                                                                                                                                      |
| 3   | destino que migrou para `@lid` (número que dava "No LID for user" no envio) | 201 **uma** cópia só (antes do conserto o fallback mandaria duas)                                                                                                                                                                                                       |
| 4   | destino SEM conversa                                                        | 201 e a conversa é criada no WhatsApp Web (a lib cria o chat)                                                                                                                                                                                                           |
| 5   | mensagem anterior a um novo pareamento                                      | 400 `FORWARD_SOURCE_UNAVAILABLE`                                                                                                                                                                                                                                        |

## 4. Pelo painel (E25) — Inbox e Atendimento

Mesmo chip de teste, mesmos destinos A/B (e o 3º número sem conversa). Tudo pelo painel logado.

| #   | O quê                                                                                                            | Esperado no painel                                                                                                                  | Confira no aparelho                                     |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Inbox → conversa com A → passe o mouse numa mensagem de texto → **⌄** → **Encaminhar**                           | entra no modo seleção (quadrados à esquerda, "1 selecionada", a caixa de resposta some); ↪ na barra abre "Encaminhar mensagem para" | —                                                       |
| 2   | no diálogo, pesquise B pelo nome e pelo número; marque B; ➤ **Enviar**                                           | "Encaminhando…" e depois o diálogo fecha com **"Você encaminhou 1 item para B."**; a cópia aparece na conversa de B com o selo      | B recebe com "↪ Encaminhada", sem citação               |
| 3   | foto recebida de A → botão redondo **↪** ao lado dela (atalho "Encaminhar mídia") → B                            | abre o diálogo direto (sem modo seleção); mesmo resultado do 2                                                                      | foto abre em B                                          |
| 4   | mensagem já "Encaminhada" → marque 2 grupos                                                                      | o 2º grupo é recusado: "Você pode enviar mensagens encaminhadas para apenas uma conversa em grupo por vez." (regra do WhatsApp)     | —                                                       |
| 5   | mensagem "Encaminhada com frequência" (se tiver)                                                                 | só 1 conversa: a 2ª marcação é recusada com o texto do WhatsApp                                                                     | B vê "↪↪ Encaminhada com frequência"                    |
| 6   | com a sessão em quarentena (INTEGRACAO §5), marque B e o 3º número (sem conversa) → ➤                            | faixa "Nada foi enviado… 1 destino é 1º contato…"; desmarque o 3º e ➤ de novo → vai só para B                                       | B recebe 1 vez só                                       |
| 7   | tente encaminhar uma enquete                                                                                     | o ⌄ nem aparece (tipo que o gateway recusa)                                                                                         | —                                                       |
| 8   | apague para todos (no celular de A) uma mensagem recebida e tente encaminhar pelo painel                         | faixa "…(apagada). Se precisar, encaminhe pelo celular."; o ➤ trava                                                                 | nada chega                                              |
| 9   | Atendimento → mesma conversa → ⌄ → Encaminhar → o diálogo lista também os GRUPOS da sessão                       | igual ao Inbox; o destino passa a 🟢 na lista                                                                                       | —                                                       |
| 10  | **WWEBJS** (se usar): encaminhe um texto                                                                         | se aparecer "Encaminhada, confirmação pendente — não reenvie", confira no celular e **não** repita                                  | chegou 1 vez?                                           |
| 11  | P-085: encaminhe de A para B uma mensagem que chegou com contador 4 ("Encaminhada", 4 encaminhamentos na cadeia) | o diálogo avisa "Esta mensagem será marcada como encaminhada com frequência."                                                       | B vê "com frequência"? (Baileys soma sem teto — anotar) |

## 5. Devolver (colar no chat da próxima etapa)

"Teste chip E24/E25 em DD/MM (local|.cloud, Baileys|WWEBJS): casos X/Y ok; selo visto em B: sim/não;
'encaminhada com frequência' em B a partir de score N; WWEBJS com id: sim/não (confirmed:false em
quantos); painel §4: casos …; falhas: …". Isso fecha os itens "Não verificado" da D-030 e da D-031.
