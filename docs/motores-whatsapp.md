# Motores (engines) de WhatsApp — estado atual e roadmap multi-engine

> Registro vivo dos motores que o gateway usa **hoje** e dos que queremos **integrar com o tempo**.
> A arquitetura já é plugável (`IEngine` + `EngineFactory`, escolha por sessão), então cada motor
> novo é um **adapter** que implementa o mesmo contrato. Última atualização: **2026-06-21**.

---

## 0. O problema transversal: LID (`@lid` vs `@c.us` / `@s.whatsapp.net`)

Desde 2024 o WhatsApp atribui a cada usuário um **LID** (Local/Linked ID — um ID oculto, ex.
`47661889642695@lid`) **além** do ID por telefone (`@c.us` no protocolo web, `@s.whatsapp.net` no
Baileys). Em muitos contatos as **mensagens recebidas chegam com `@lid`**, enquanto o **envio** sai
pelo telefone. Resultado: a mesma conversa **se divide em dois identificadores** e o inbox "digite o
número" não acha as recebidas.

**Quem resolve bem o LID (mapeia `@lid`↔telefone):**

| Motor | Resolve LID? | Como |
| --- | --- | --- |
| **Baileys 7.x** | ✅ nativo | `lidMapping` / `decodeJid` interno (já validado neste projeto) |
| **WAHA (NOWEB/GOWS)** | ✅ merge automático | 2026.3 funde `@lid`↔`@c.us` numa thread única (com flag p/ desligar) |
| **WPPConnect (wa-js)** | 🟡 API dedicada | `lidPnCache.getPhoneNumber`, `getPnForLid`, `requestPhoneNumber` |
| **whatsmeow** (Evolution Go / WAHA-GOWS) | ✅ | lib Go madura, mapeia LID |
| **whatsapp-web.js** (nosso WWEBJS) | ✅ via WWebJS interno | `enforceLidAndPnRetrieval([lid])` + `WWebJS.getContact` → id vira `<tel>@c.us` (**merge implementado aqui**, seção 5). `getContact().number` sozinho NÃO serve |
| **API Oficial Meta** | ✅ N/A | trabalha com `wa_id` (telefone), sem o hack de LID |

Fontes: [wwebjs #3969](https://github.com/pedroslopez/whatsapp-web.js/issues/3969) ·
[wwebjs #3857](https://github.com/pedroslopez/whatsapp-web.js/issues/3857) ·
[wwebjs #3519](https://github.com/pedroslopez/whatsapp-web.js/issues/3519) ·
[WAHA 2026.3](https://waha.devlike.pro/blog/waha-2026-3/) ·
[wa-js getPhoneNumber](https://wppconnect.io/wa-js/functions/whatsapp.lidPnCache.getPhoneNumber.html) ·
[wa-js getPnForLid](https://wppconnect.io/wa-js/functions/whatsapp.functions.getPnForLid.html)

> **Conclusão prática:** **Baileys** resolve LID nativo. No motor **WhatsApp-Web (whatsapp-web.js)** o
> merge `@lid`↔telefone foi **implementado neste projeto** via `window.WWebJS.enforceLidAndPnRetrieval`
> + `getContact` (seção 5) — `window.Store` não é exposto na 1.34, então usamos o `window.WWebJS`.
> Alternativas com merge pronto fora da caixa: **WAHA** (NOWEB/GOWS) e **WPPConnect** (`getPnForLid`).

---

## 1. Comparativo dos motores

| Motor | Tipo | Base / protocolo | LID | Custo recursos | Esforço integração | Status no projeto |
| --- | --- | --- | --- | --- | --- | --- |
| **Baileys** | Biblioteca (in-process) | WebSocket multidevice | ✅ nativo | Baixíssimo | — (feito) | ✅ **instalado** (engine principal) |
| **whatsapp-web.js** | Biblioteca (in-process) | Puppeteer + Chrome | ❌ fraco | Alto (Chrome) | — (feito) | ✅ **instalado** (engine WWEBJS, teste) |
| **WPPConnect** | Biblioteca **ou** servidor REST | Puppeteer + `wa-js` | 🟡 API | Alto (Chrome) | Médio | ⬜ planejado |
| **WAHA** | Servidor REST (Docker) | WEBJS / NOWEB / GOWS | ✅ (NOWEB/GOWS) | Médio | Baixo (HTTP) | ⬜ planejado |
| **Evolution Go** | Servidor REST (Docker) | Go + `whatsmeow` | ✅ | Baixíssimo | Baixo (HTTP) | ⬜ planejado |
| **Venom-bot** | Biblioteca (in-process) | Puppeteer | ❌/imaturo | Alto (Chrome) | Médio | ⬜ baixa prioridade |
| **Z-API** | SaaS comercial | Gerenciado (nuvem) | ✅ (N/A) | N/A (pago) | Baixo (HTTP) | ⬜ avaliar |
| **API Oficial Meta** | API oficial (nuvem) | WhatsApp Cloud API | ✅ (`wa_id`) | N/A | Médio-alto | ⬜ futuro (oficial) |

---

## 2. Detalhe por motor

### 2.1 Baileys — ✅ instalado (principal)
- **O que é:** biblioteca Node TS, fala o protocolo WhatsApp multidevice direto por **WebSocket**
  (sem browser). Versão atual no projeto: `@whiskeysockets/baileys@7.0.0-rc13`.
- **LID:** resolvido nativamente no 7.x (corrigiu o "Aguardando mensagem" do multi-device).
- **Prós:** leve, rápido, controle total, sem Chrome. **Contras:** API de baixo nível, segue mudanças
  do protocolo (não-oficial).
- **No projeto:** `infrastructure/baileys/baileys.engine.ts`.

### 2.2 whatsapp-web.js (WWEBJS) — ✅ instalado (teste)
- **O que é:** biblioteca que automatiza o **WhatsApp Web real** via Puppeteer + Chrome do sistema.
- **LID:** ⚠️ **ponto fraco**. `getContact().number` frequentemente devolve o próprio LID; resolver
  `@lid`→telefone **não é confiável hoje** (issues abertas). Nosso `resolveNumberJid` faz best-effort
  (só aceita o número se for ≠ do LID) e captura tudo via `message_create`, mas contatos não-salvos
  podem continuar em `@lid`.
- **Prós:** simples, estável para 1:1 com número salvo. **Contras:** pesado (Chrome), LID fraco.
- **No projeto:** `infrastructure/wwebjs/wwebjs.engine.ts`.

### 2.3 WPPConnect — ⬜ planejado (upgrade do WhatsApp-Web)
- **O que é:** projeto BR, também **WhatsApp Web via Puppeteer**, mas com a camada `wa-js` muito mais
  rica. Pode rodar como **lib** (in-process, igual ao wwebjs) ou como **servidor REST**.
- **LID:** tem APIs dedicadas — `lidPnCache.getPhoneNumber`, `whatsapp.functions.getPnForLid`,
  `chat.requestPhoneNumber`. Ainda em evolução (há issues de "could not find phone number for lid"),
  mas **bem à frente** do whatsapp-web.js.
- **Integração:** como **lib**, vira um `WppConnectEngine` quase idêntico ao WWEBJS (troca o import e
  usa `getPnForLid` no lugar do `getContactById`). Como **servidor**, vira adapter HTTP.
- **Quando:** primeiro candidato para **substituir o WWEBJS** quando o LID via browser importar.

### 2.4 WAHA — ⬜ planejado (servidor REST multi-engine)
- **O que é:** servidor REST self-hosted (Docker, "configura num clique") com **3 engines**: `WEBJS`
  (browser), `NOWEB` (WebSocket Node) e `GOWS` (WebSocket Go). Tem free + plus (pago).
- **LID:** desde **2026.3** faz **merge automático `@lid`↔`@c.us`** (NOWEB/GOWS), com flag para
  desligar e fixes de mapeamento/threads duplicadas. **Resolve o nosso problema fora da caixa.**
- **Integração:** adapter HTTP (`WahaEngine` implementa `IEngine` chamando a REST API + webhooks da
  WAHA). Não roda in-process — é um container à parte.
- **Quando:** ótima opção para ter **WhatsApp-Web (WEBJS) e WebSocket (NOWEB/GOWS) com LID resolvido**
  sem manter o browser dentro do nosso processo.

### 2.5 Evolution Go — ⬜ planejado (servidor REST, Go)
- **O que é:** reescrita em **Go** da Evolution API, sobre **`whatsmeow`** (lib Go do WhatsApp
  multidevice, do tulir). Binário único, ~50–150 MB/instância, sobe em <1s; REST + WebSocket +
  webhooks + AMQP/NATS, mídia S3/MinIO, Postgres opcional.
- **LID:** via `whatsmeow` (maduro). **Custo de recursos: o menor de todos.**
- **Integração:** adapter HTTP (`EvolutionGoEngine`). Container à parte.
- **Quando:** quando o volume exigir **muitas sessões com pouca RAM** (escala).

### 2.6 Venom-bot — ⬜ baixa prioridade
- **O que é:** biblioteca Node, **WhatsApp Web via Puppeteer** (semelhante ao wwebjs). Suporte/uso BR.
- **LID:** sem suporte específico maduro encontrado (tende ao mesmo problema do wwebjs).
- **Quando:** só se houver recurso específico do Venom que falte no wwebjs/WPPConnect. Não prioritário.

### 2.7 Z-API — ⬜ avaliar (SaaS comercial)
- **O que é:** **SaaS gerenciado** brasileiro (a infra roda na nuvem deles; consumimos REST/webhooks).
- **LID:** abstraído pelo provedor (N/A para nós).
- **Prós:** zero manutenção de sessão/Chrome. **Contras:** custo recorrente, dependência de terceiro,
  dados passam pela infra deles (avaliar LGPD/contrato).
- **Integração:** adapter HTTP (`ZApiEngine`).

### 2.8 API Oficial Meta (WhatsApp Cloud API) — ⬜ futuro (oficial)
- **O que é:** a **API oficial** da Meta (Cloud API hospedada pela Meta, ou On-Premises descontinuando).
  Identifica contatos por **`wa_id`** (telefone) — **sem o hack de LID**.
- **Prós:** oficial, sem risco de ban por automação, estável. **Contras / pegadinhas a registrar:**
  - Exige **WhatsApp Business Account (WABA)** + número verificado + **Meta Business** aprovado.
  - **Mensagens iniciadas pela empresa** só via **templates aprovados**; fora da **janela de 24h**
    (após o usuário escrever) não dá para mandar texto livre.
  - **Cobrança por conversa** (categorias: marketing/utility/auth/service) — modelo muda com o tempo.
  - Webhooks oficiais (entrega/leitura/recebimento), rate limits por tier de número.
- **Integração:** adapter HTTP (`MetaCloudEngine`) — bem diferente das outras (templates, opt-in,
  janela 24h). Provavelmente um **módulo de canal à parte**, não só um `IEngine`, por causa das regras.
- **Quando:** quando o produto precisar de **conformidade oficial** (clientes que exigem API oficial).

---

## 3. Como cada um encaixa na arquitetura (`IEngine` plugável)

- **In-process (lib):** Baileys ✅, whatsapp-web.js ✅, WPPConnect (modo lib), Venom. Implementam
  `IEngine` direto, rodam dentro do gateway (cuidado com Chrome = RAM por sessão).
- **Servidor REST externo (Docker):** WAHA, Evolution Go, WPPConnect (modo server), Z-API. Implementam
  `IEngine` como **adapter HTTP** (chamam a REST API do container + recebem **webhooks** que o
  `EngineFactory` converte nos mesmos eventos `session.status` / `message`).
- **API Oficial:** Meta Cloud — adapter HTTP oficial, com camada extra de templates/janela 24h.

> Passo comum para os REST: criar um `HttpEngineBase` que normaliza webhooks → `onEvent(...)` e mapeia
> `sendText/sendMedia/...` para os endpoints do provedor. Aí WAHA/Evolution Go/WPPConnect-server/Z-API
> viram, cada um, ~1 arquivo fino.

---

## 4. Ordem sugerida de integração (proposta)

1. **WAHA** (NOWEB/GOWS) — resolve LID fora da caixa, baixo esforço (HTTP), valida o padrão "engine
   REST externa". Bom primeiro adapter HTTP.
2. **WPPConnect** (modo lib) — substitui/complementa o WWEBJS no mundo browser, com LID via `getPnForLid`.
3. **Evolution Go** — quando escala/RAM importar (Go + whatsmeow, leve).
4. **API Oficial Meta** — quando precisar de conformidade oficial (templates/janela 24h).
5. **Z-API** / **Venom** — avaliar caso a caso (SaaS pago / recurso específico).

---

## 5. Estado atual do WWEBJS neste projeto (2026-06-21)

**Versões (confirmadas as mais recentes):** `whatsapp-web.js@1.34.7` (= última no npm) ·
`@whiskeysockets/baileys@7.0.0-rc13` (= tag `latest`). O bug de LID **persiste na última** do wwebjs
(o changelog 1.34 só traz fixes pontuais de LID, ex. block/unblock).

- **Enviadas pelo painel:** emitidas no próprio `sendText`/`sendMedia` com o **telefone digitado**
  (`<num>@c.us`) → sempre aparecem no inbox por número. Não usamos `message_create` para as `fromMe`
  porque ele traria o `@lid` interno (não buscável) — e capturar `fromMe` por evento é justamente o
  ponto frágil dos outros motores: o WAHA NOWEB **não dispara webhook ao enviar do próprio device**
  ([WAHA #1318](https://github.com/devlikeapro/waha/issues/1318)).
- **Recebidas:** via evento `message`, com `resolveNumberJid` que faz o **merge `@lid`→telefone**.
- **Merge automático `@lid`→telefone (implementado ✅):** resolve via
  `window.WWebJS.enforceLidAndPnRetrieval([lid])` + `WWebJS.getContact` (o id volta como `<tel>@c.us`),
  chamado por `pupPage.evaluate` — pois o `window.Store` NÃO é exposto na 1.34. Ao resolver:
  (a) `mergeLidMessages` reescreve retroativamente as mensagens já gravadas naquele `@lid` → funde a
  conversa antes dividida; (b) registra o par no `ContactDirectory`; (c) cacheia em memória
  (`lidToPnCache`). No `ready`, `mergeExistingLids` funde todas as conversas `@lid` já existentes; nas
  novas mensagens, o merge ocorre na entrada. **Validado:** 5/5 LIDs fundidos (ex.: recebidas em
  `47661889642695@lid` + enviadas em `551731670499@c.us` → uma thread só, com 6 enviadas + 5 recebidas).
- **Como WAHA/Evolution fazem:** mesmo padrão (um evento p/ todas + `fromMe`), e a WAHA tem o mesmo
  merge nativo ([2026.3](https://waha.devlike.pro/blog/waha-2026-3/)); enviadas-do-device não
  capturadas é limitação compartilhada ([WAHA #1318](https://github.com/devlikeapro/waha/issues/1318)).
- **Limitações restantes (whatsapp-web.js):** (a) mensagens **enviadas pelo próprio celular** não são
  capturadas (igual ao WAHA NOWEB #1318); (b) se o WhatsApp Web ainda não souber o telefone de um
  `@lid` (contato novo/anônimo), o `enforceLidAndPnRetrieval` pode não resolver e a conversa fica em
  `@lid` até o WA sincronizar — o merge é re-tentado a cada boot e em cada nova mensagem.
