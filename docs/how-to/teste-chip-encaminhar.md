---
tipo: runbook
dono: Diogo
revisado_em: 2026-09-26
validade: 2026-10-26
status: ativo
origem: etapa E24 do roteiro (P-068 encaminhar — API e engines; P-077) — D-030
---

# 📱 Teste com chip do ENCAMINHAR (E24) — o que só o aparelho prova

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

## 4. Devolver (colar no chat da próxima etapa)

"Teste chip E24 em DD/MM (local|.cloud, Baileys|WWEBJS): casos X/Y ok; selo visto em B: sim/não;
'encaminhada com frequência' em B a partir de score N; WWEBJS com id: sim/não (confirmed:false em
quantos); falhas: …". Isso fecha os itens "Não verificado" da D-030.
