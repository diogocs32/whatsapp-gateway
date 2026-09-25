# Motores (engines) de WhatsApp — estado atual e roadmap multi-engine

> **Distinção fundamental (leia primeiro):** o **nosso gateway já É** um servidor HTTP/REST
> self-hosted, multi-sessão e multi-engine para WhatsApp — ou seja, ele é um "WAHA/Evolution próprio"
> (e mais completo em vários pontos: multi-sessão grátis, campanhas/anti-ban, dashboard, observability).
> Por isso, neste documento **"motor" = a CAMADA que fala com o WhatsApp** (uma **biblioteca
> in-process** que implementa `IEngine`), **não** um servidor REST inteiro.
>
> - ✅ **Peças (viram `IEngine`)** = bibliotecas in-process: **Baileys**, **whatsapp-web.js**,
>   WPPConnect (modo lib), Venom, whatsmeow (se houver binding).
> - ❌ **Concorrentes (NÃO integrar)** = servidores REST completos: **WAHA, Evolution API/Go, Z-API**.
>   Embuti-los seria **gateway-dentro-de-gateway** (redundante, mais latência) — e o multi-sessão deles
>   costuma ser **pago**. Eles são _alternativas ao nosso produto_, não peças dele. Valem como
>   **referência** (estudar como resolvem LID, mídia, etc.).
> - 🏛️ **Canal oficial (agrega — integrar no futuro)** = **API Oficial Meta (Cloud API)**. É um canal
>   _oficial_ diferente, não um gateway concorrente.
>
> Arquitetura plugável: `IEngine` + `EngineFactory`, escolha por sessão. Última atualização: **2026-06-21**.

---

## 0. O problema transversal: LID (`@lid` vs `@c.us` / `@s.whatsapp.net`)

Desde 2024 o WhatsApp atribui a cada usuário um **LID** (Local/Linked ID — um ID oculto, ex.
`47661889642695@lid`) **além** do ID por telefone (`@c.us` no protocolo web, `@s.whatsapp.net` no
Baileys). Em muitos contatos as **mensagens recebidas chegam com `@lid`**, enquanto o **envio** sai
pelo telefone. Resultado: a mesma conversa **se divide em dois identificadores** e o inbox "digite o
número" não acha as recebidas.

**Como cada base de código resolve o LID (mapeia `@lid`↔telefone):**

| Base                                             | Resolve LID?          | Como                                                                                                                                                                                                 |
| ------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Baileys 7.x** (peça ✅)                        | ✅ nativo             | `lidMapping` / `decodeJid` interno (já validado neste projeto)                                                                                                                                       |
| **whatsapp-web.js** (peça ✅)                    | ✅ **resolvido aqui** | `window.WWebJS.enforceLidAndPnRetrieval([lid])` + `WWebJS.getContact` → id vira `<tel>@c.us` (seção 5). `getContact().number` sozinho NÃO serve; `window.Store` não é exposto na 1.34                |
| **WPPConnect** (peça, lib)                       | 🟡 API dedicada       | `lidPnCache.getPhoneNumber`, `getPnForLid`, `requestPhoneNumber`                                                                                                                                     |
| **whatsmeow** (base do Evolution Go / WAHA-GOWS) | ✅                    | lib Go madura, mapeia LID                                                                                                                                                                            |
| **WAHA** (concorrente)                           | ✅ merge automático   | 2026.3 funde `@lid`↔`@c.us` numa thread (referência do nosso merge)                                                                                                                                  |
| **API Oficial Meta** (oficial)                   | 🟡 BSUID              | `wa_id` (telefone) **e**, desde abr/2026, BSUID (`user_id`) nos webhooks; quem ativa username chega SEM telefone, salvo interação anterior — exige mapear BSUID↔contato (corrigido 25/09/2026, §2.9) |

Fontes: [wwebjs #3969](https://github.com/pedroslopez/whatsapp-web.js/issues/3969) ·
[wwebjs #3519](https://github.com/pedroslopez/whatsapp-web.js/issues/3519) ·
[WAHA 2026.3](https://waha.devlike.pro/blog/waha-2026-3/) ·
[wa-js getPnForLid](https://wppconnect.io/wa-js/functions/whatsapp.functions.getPnForLid.html)

> **Conclusão prática:** o LID **já está resolvido** nas duas engines que usamos — **Baileys** (nativo)
> e **whatsapp-web.js** (merge implementado neste projeto, seção 5). Não há motivo de LID para puxar
> outro motor.

---

## 1. Comparativo

| Base                   | Categoria                      | Protocolo             | LID                  | Custo recursos | Vale integrar como `IEngine`?           | Status                       |
| ---------------------- | ------------------------------ | --------------------- | -------------------- | -------------- | --------------------------------------- | ---------------------------- |
| **Baileys**            | Peça (lib in-process)          | WebSocket multidevice | ✅ nativo            | Baixíssimo     | —                                       | ✅ **instalado** (principal) |
| **whatsapp-web.js**    | Peça (lib in-process)          | Puppeteer + Chrome    | ✅ (merge aqui)      | Alto (Chrome)  | —                                       | ✅ **instalado** (WWEBJS)    |
| **WPPConnect**         | Peça (lib in-process)          | Puppeteer + `wa-js`   | 🟡 API               | Alto (Chrome)  | Talvez (browser c/ LID nativo)          | ⬜ opcional                  |
| **Venom-bot**          | Peça (lib in-process)          | Puppeteer             | ❌/imaturo           | Alto (Chrome)  | Improvável (sem vantagem)               | ⬜ baixa                     |
| **whatsmeow**          | Peça (lib **Go**)              | WebSocket (Go)        | ✅                   | Baixíssimo     | Só com microserviço Go                  | ⬜ futuro/escala             |
| **WAHA**               | ❌ Concorrente (servidor REST) | WEBJS/NOWEB/GOWS      | ✅                   | Médio          | **Não** (redundante; multi-sessão pago) | 🔵 referência                |
| **Evolution API / Go** | ❌ Concorrente (servidor REST) | Baileys / whatsmeow   | ✅                   | Baixo (Go)     | **Não** (redundante)                    | 🔵 referência                |
| **Z-API**              | ❌ Concorrente (SaaS pago)     | Gerenciado            | ✅                   | N/A (pago)     | **Não** (terceiro, custo, LGPD)         | 🔵 referência                |
| **API Oficial Meta**   | 🏛️ Canal oficial               | WhatsApp Cloud API    | 🟡 (`wa_id` + BSUID) | N/A            | **Sim, no futuro**                      | ⬜ futuro                    |

---

## 2. Detalhe

### 2.1 Baileys — ✅ instalado (principal) · peça

- Biblioteca Node TS, fala o protocolo WhatsApp multidevice por **WebSocket** (sem browser).
  `@whiskeysockets/baileys@7.0.0-rc13`. LID nativo. Leve e rápido; API de baixo nível, não-oficial.
- No projeto: `infrastructure/baileys/baileys.engine.ts`.

### 2.2 whatsapp-web.js (WWEBJS) — ✅ instalado · peça

- Biblioteca que automatiza o **WhatsApp Web real** via Puppeteer + Chrome do sistema.
- **LID: resolvido neste projeto** (seção 5) via `enforceLidAndPnRetrieval` + `getContact`. Captura
  recebidas + enviadas de qualquer device (`message_create` com dedup) e funde conversas (merge).
- Prós: comportamento "humano" (WhatsApp Web real). Contras: pesado (Chrome = RAM por sessão).
- No projeto: `infrastructure/wwebjs/wwebjs.engine.ts`.

### 2.3 WPPConnect — ⬜ opcional · peça (lib)

- Projeto BR, também **WhatsApp Web via Puppeteer**, com a camada `wa-js` mais rica (APIs de LID
  dedicadas: `getPnForLid`, `lidPnCache.getPhoneNumber`). Roda como **lib** (in-process) ou servidor.
- **Como peça** (modo lib) vira um `WppConnectEngine` quase igual ao WWEBJS. **Quando:** só se
  quisermos uma engine browser com LID nativo da lib — mas como já resolvemos o LID no whatsapp-web.js,
  é baixa prioridade. (O modo **servidor** cai na categoria "concorrente" — não integrar.)

### 2.4 Venom-bot — ⬜ baixa · peça (lib)

- Biblioteca Node, WhatsApp Web via Puppeteer (semelhante ao wwebjs), sem vantagem clara de LID.
  Só se houver um recurso específico que falte no wwebjs/WPPConnect.

### 2.5 whatsmeow — ⬜ futuro/escala · peça (lib Go)

- Lib **Go** do WhatsApp multidevice (do tulir), madura e leve (base do Evolution Go e do WAHA-GOWS).
  Resolve LID. **Não é Node**, então só entraria como **microserviço Go** que o gateway controla
  (não in-process). Faz sentido só se a escala exigir milhares de sessões com pouquíssima RAM.

### 2.6 WAHA — 🔵 referência (NÃO integrar) · concorrente

- Servidor REST self-hosted (Docker) com 3 engines (WEBJS/NOWEB/GOWS). **É o mesmo tipo de produto que
  o nosso gateway.** Embuti-lo = gateway-dentro-de-gateway. Além disso: **Core grátis = só 1 sessão**;
  **multi-sessão exige o Plus (~US$ 19/mês)** — pagaríamos por algo que já temos de graça.
- **Valor real:** **referência**. Foi onde estudamos o merge de LID, o padrão evento+`fromMe`, e as
  limitações compartilhadas (enviadas-do-device — [WAHA #1318](https://github.com/devlikeapro/waha/issues/1318)).

### 2.7 Evolution API / Evolution Go — 🔵 referência (NÃO integrar) · concorrente

- Servidores REST completos (Node/Baileys e Go/whatsmeow). Também concorrentes do nosso gateway.
  Referência de arquitetura (especialmente o Go/whatsmeow para escala). Não embutir.

### 2.8 Z-API — 🔵 referência (NÃO integrar) · concorrente (SaaS pago)

- SaaS gerenciado (infra na nuvem deles). Custo recorrente, dependência de terceiro e dados passando
  por fora (LGPD). Contraria o propósito self-hosted do projeto. Não integrar.

### 2.9 API Oficial Meta (WhatsApp Cloud API) — ⬜ futuro · 🏛️ canal oficial

> **Corrigido em 25/09/2026 (P-063)** — três afirmações anteriores desta seção estavam erradas
> ("sem o hack de LID", "sem risco de ban", "cobrança por conversa"). Fontes oficiais consultadas
> em 25/09/2026: [BSUID](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/), [pricing](https://developers.facebook.com/docs/whatsapp/pricing),
> [Business Messaging Policy](https://whatsappbusiness.com/policy/) (última atualização 23/09/2026) e
> [policy enforcement](https://developers.facebook.com/docs/whatsapp/overview/policy-enforcement).

- A **API oficial** da Meta. Identifica contatos por **`wa_id`** (telefone) **e por BSUID**: os
  webhooks trazem o BSUID (`user_id`) desde o início de abr/2026 e, _"If a WhatsApp user enables the
  username feature, their phone number will not be included in webhooks, unless you have interacted
  with the user before"_. Suportar BSUID é obrigatório para parceiros e empresas integradas
  diretamente. Ou seja: a engine oficial também precisa de mapeamento identificador↔contato.
- **Prós:** oficial e estável. **NÃO é "sem risco de ban":** a Business Messaging Policy diz
  _"We may limit or remove your access to or use of WhatsApp for Business, or limit your ability to
  send messages, if you receive significant amounts of negative feedback [...]"_, e a doc de
  enforcement da plataforma prevê bloqueios de envio de 1 a 30 dias, _account lock_ e desativação
  permanente. **Pegadinhas a registrar:**
  - Exige **WhatsApp Business Account (WABA)** + número verificado + **Meta Business** aprovado.
  - Mensagens iniciadas pela empresa só via **templates aprovados**; fora da **janela de 24h** não dá
    para mandar texto livre.
  - **Cobrança por mensagem** (template entregue) desde 01/07/2025 — _"Conversation-based pricing is
    deprecated. It was replaced with per-message pricing on July 1, 2025."_ Mensagens não-template
    (só dentro da janela de 24h) e templates de utilidade dentro da janela aberta são gratuitos
    segundo a página de pricing em 25/09/2026. Tabela de preço muda por país/data — conferir a
    página antes de orçar.
- **Integração:** é o único "externo" que **agrega** (canal oficial). Provavelmente um **módulo de
  canal à parte** (templates/opt-in/janela 24h), não só um `IEngine`. **Quando:** quando o produto
  precisar de conformidade oficial (clientes que exigem API oficial).

---

## 3. Como isso encaixa na arquitetura

- **Peças (in-process) → `IEngine` direto.** Baileys ✅, whatsapp-web.js ✅, WPPConnect (lib), Venom.
  Rodam dentro do gateway. Cuidado: Puppeteer = Chrome = RAM por sessão.
- **whatsmeow (Go) → microserviço.** Único caso de "processo à parte" que faria sentido (é Go), e só
  por escala. Não é um `IEngine` in-process.
- **Servidores REST completos (WAHA/Evolution/Z-API) → NÃO entram.** São concorrentes; embuti-los é
  redundante. Servem de referência.
- **API Oficial Meta → módulo de canal oficial** (à parte), no futuro.

---

## 4. O que realmente vale fazer (e o que não)

**Já temos o essencial:** duas engines (Baileys + whatsapp-web.js), ambas com LID resolvido,
multi-sessão grátis, mídia, grupos, campanhas, webhooks, dashboard e observability. Isso já é um
gateway multi-engine completo.

**Próximos passos que AGREGAM (em ordem):**

1. **API Oficial Meta (Cloud API)** — quando precisar de conformidade oficial. É o único canal externo
   que adiciona algo novo (oficialidade; a conta oficial ainda pode ter envio limitado ou acesso
   removido pela policy — §2.9).
2. **WPPConnect (modo lib)** — _opcional_, só se quiser uma 3ª engine browser. Baixa prioridade (o LID
   já está resolvido no whatsapp-web.js).
3. **whatsmeow via microserviço Go** — _só por escala_ (milhares de sessões com pouca RAM).

**O que NÃO fazer:** embutir **WAHA / Evolution / Z-API** como sub-motor — são concorrentes do nosso
gateway (gateway-dentro-de-gateway), e o multi-sessão deles costuma ser pago. Use-os apenas como
**referência** de implementação.

---

## 5. Estado atual do WWEBJS neste projeto (2026-06-21)

**Versões (as mais recentes):** `whatsapp-web.js@1.34.7` (= última no npm) ·
`@whiskeysockets/baileys@7.0.0-rc13` (= tag `latest`).

- **Enviadas pelo painel:** emitidas no próprio `sendText`/`sendMedia` com o **telefone digitado**
  (`<num>@c.us`) → aparecem no inbox por número.
- **Enviadas pelo próprio celular + recebidas:** capturadas via `message_create` (capta `fromMe` de
  qualquer device); as do painel são deduplicadas via `sentByPanel` + janela curta.
- **Merge automático `@lid`→telefone (implementado ✅):** resolve via
  `window.WWebJS.enforceLidAndPnRetrieval([lid])` + `WWebJS.getContact` (id volta como `<tel>@c.us`),
  por `pupPage.evaluate` (o `window.Store` NÃO é exposto na 1.34). Ao resolver: (a) `mergeLidMessages`
  reescreve retroativamente as mensagens já gravadas naquele `@lid` → funde a conversa; (b) registra o
  par no `ContactDirectory`; (c) cacheia (`lidToPnCache`). No `ready`, `mergeExistingLids` funde as
  conversas `@lid` existentes; nas novas, o merge ocorre na entrada. **Validado:** 5/5 LIDs fundidos
  (ex.: `47661889642695@lid` → `551731670499@c.us`, thread única com 6 enviadas + 5 recebidas).
- **Limitações restantes:** se o WhatsApp Web ainda não souber o telefone de um `@lid` muito novo, o
  `enforceLidAndPnRetrieval` pode não resolver na hora — o merge é re-tentado a cada boot e em cada
  nova mensagem.
