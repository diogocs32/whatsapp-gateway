# PROMPT MESTRE — Plataforma "WhatsApp Gateway" (melhor que Evolution API + WAHA Pro)

> **Tipo de documento:** blueprint executável / prompt mestre. Entregue este arquivo a um agente (ou time) de implementação. Ele descreve **o quê** construir, **com que arquitetura**, **em que ordem**, e **qual é o critério de pronto** de cada fase.
>
> **Idioma do produto/código:** identificadores e código em inglês; documentação, comentários de domínio e UI em pt-BR.
>
> **Conteúdo técnico ancorado** em consultas a especialistas (engine Baileys/whatsapp-web.js, Node.js v26 e Dokploy) — citações de fonte oficial aparecem ao longo do texto e nos anexos.

---

## 0. Como usar este documento

Este é o **contrato de produto e arquitetura**. Regras para quem implementa:

1. **Não invente requisito.** Se algo não está aqui e for necessário, registre como decisão pendente antes de codar.
2. **Respeite a arquitetura (Modular Monolith + DDD).** Toda feature nova entra como um _módulo/bounded context_ ou um _use case_ dentro de um módulo existente — nunca como código solto.
3. **Entrega incremental com frontend desde o dia 1.** Cada fase do roadmap (§20) entrega backend + uma tela mínima testável. Nada de "front só no final".
4. **Anti-ban é requisito de primeira classe**, não um detalhe (§11). Decisões de proxy, rate-limit e humanização vêm antes de "features bonitas".
5. **JID vs LID e custom auth store em Postgres são os dois pilares que decidem o sucesso** (§23). Trate-os com prioridade máxima.

---

## 1. Visão & Posicionamento

Construir um **servidor HTTP self-hosted** que gerencia **sessões de WhatsApp ilimitadas**, cada uma com **proxy próprio e rotação por faixa**, exposto por **API REST + WebSocket**, com **webhooks de eventos**, **dashboard web completo em tempo real** e **engine plugável (Baileys padrão, whatsapp-web.js alternativa)**. Roda em **Docker** e faz deploy no **Dokploy**.

### 1.1 Diferenciais vs. concorrentes

| Capacidade                                                                 | Evolution API    | WAHA (Core/Plus)             | **Esta plataforma**                                                         |
| -------------------------------------------------------------------------- | ---------------- | ---------------------------- | --------------------------------------------------------------------------- |
| Sessões ilimitadas                                                         | ✅               | ✅ (Plus)                    | ✅ **sem trava de licença**                                                 |
| Engine plugável (Baileys + WWebJS)                                         | parcial          | ✅                           | ✅ **interface `IEngine` única**                                            |
| Proxy por sessão                                                           | ✅               | ✅                           | ✅                                                                          |
| **Pool de proxies + rotação por faixa de IDs (1–10, 5–10…) por instância** | ❌               | ❌ (só round-robin por nome) | ✅ **diferencial central (§7)**                                             |
| **Sync automático da API Webshare**                                        | ❌               | ❌                           | ✅ **(§7.4)**                                                               |
| Webhooks + HMAC + retries                                                  | ✅               | ✅                           | ✅ **(constant/linear/exponencial+jitter)**                                 |
| WebSocket em tempo real                                                    | parcial          | ✅                           | ✅                                                                          |
| **Dashboard com visão em tempo real do que acontece**                      | básico (Manager) | ✅ (dashboard)               | ✅ **monitor de eventos + grid de sessões + IP de saída ao vivo (§13/§14)** |
| Envio em massa / campanhas                                                 | via integração   | ❌                           | ✅ **nativo, com anti-ban (§11)**                                           |
| **Licença perpétua offline (funciona após cancelar)**                      | n/a              | n/a                          | ✅ **(§16)**                                                                |
| **Arquitetura Modular Monolith + DDD**                                     | ❌               | parcial                      | ✅ **(§4)**                                                                 |
| Tratamento **JID↔LID 2025/2026**                                           | parcial          | parcial                      | ✅ **núcleo (§23)**                                                         |

### 1.2 Slogans operacionais (claims do produto)

- **Sem limite de contas/sessões.** _No limits on accounts or servers._
- **On-premise — seu servidor, sua infraestrutura. Sem vazamento de dados.**
- **Licença sem verificação online** — funciona mesmo depois de cancelar a assinatura (§16).
- **Mensagens ilimitadas** — texto, imagem, voz, vídeo, etc.
- **Convide sua equipe (5 vagas)** + suporte prioritário no painel (chat).

---

## 2. Princípios de Excelência (não-negociáveis)

1. **Anti-ban first.** Proxy sticky por sessão, rate-limit por chip, humanização (presença, delays aleatórios, variação de texto). Ver §11.
2. **Estado da sessão é sagrado.** Auth state (creds + Signal keys) persistido em **PostgreSQL** (não em disco volátil) e reidratado no restart sem novo QR. Ver §8.4.
3. **JID/LID aware.** Nunca assumir que o remetente é um telefone parseável. Sempre normalizar via mapping. Ver §23.
4. **Isolamento de falha.** Crash de uma sessão **não** derruba as outras. Ver §8.2 e §18.2.
5. **Tudo observável.** Cada evento, cada mudança de IP de saída, cada uso de RAM por shard é visível no dashboard em tempo real. Ver §14.
6. **Modular e extensível.** Bounded contexts isolados; comunicação por contratos/eventos; nada de acoplamento direto entre módulos. Ver §4.
7. **Idempotência.** Envio com `messageId` determinístico por job → retry não duplica mensagem. Ver §23.8.

---

## 3. Stack Tecnológica (definitiva)

| Camada             | Escolha                                                        | Justificativa                                                                                            |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Linguagem          | **Node.js v26 + TypeScript (strict)**                          | Engine Baileys é Node; TS dá contratos fortes para DDD.                                                  |
| Framework backend  | **NestJS (adapter Fastify)**                                   | Módulos/DI nativos = encaixe perfeito em Modular Monolith + DDD; Fastify dá performance de Fastify puro. |
| Engine principal   | **Baileys** (`@whiskeysockets/baileys`)                        | Leve, sem browser, SOCKS5 nativo, pairing code, eventos granulares → viabiliza sessões ilimitadas.       |
| Engine alternativa | **whatsapp-web.js** (Puppeteer+Chromium)                       | Plugável; **nunca** para massa (Chromium inviabiliza escala).                                            |
| Persistência       | **PostgreSQL 18** (jsonb, partial index, GIN, particionamento) | Auth state, sessões, contatos, mensagens, configs, proxies.                                              |
| Cache/estado/filas | **Redis 7**                                                    | Registry de sessões, cursores de rotação, rate-limit, estado em tempo real, pub/sub WS.                  |
| Filas              | **BullMQ**                                                     | Envio com rate-limit, retries de webhook, sync Webshare, processamento de mídia.                         |
| Mídia              | **Local (volume) + S3/MinIO/R2**                               | Conversão server-side via **ffmpeg** (Opus/OGG, MP4/H264, JPEG, WebP).                                   |
| Frontend           | **React + Vite 8 + Tailwind 4**                                | Dashboard SPA com WebSocket para tempo real.                                                             |
| Auth API           | header **`X-Api-Key`** (texto e SHA-512)                       | Compatível com o padrão WAHA.                                                                            |
| Auth dashboard     | login usuário/senha (env) + sessão JWT + RBAC                  | §15.                                                                                                     |
| Container/Deploy   | **Docker + Dokploy** (Swarm, Traefik, Let's Encrypt)           | §19.                                                                                                     |

> **Decisão registrada:** este projeto **diverge** da stack-padrão Laravel/Filament do usuário **de propósito**, porque a engine WhatsApp (Baileys) é Node-nativa e não tem equivalente Laravel viável para multi-sessão de massa. Decisão consciente, não esquecimento.

---

## 4. Arquitetura — Modular Monolith + DDD

### 4.1 Por que Modular Monolith + DDD

Um único deployable (simples de operar no Dokploy), mas internamente dividido em **bounded contexts** independentes, cada um com suas próprias camadas. Permite **adicionar novas funções de forma organizada** (novo módulo ou novo use case) sem virar espaguete, e abre caminho para extrair microsserviço depois, se necessário.

### 4.2 Mapa de Bounded Contexts (módulos)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          WhatsApp Gateway                              │
│                                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  Sessions  │  │ Messaging  │  │  Contacts  │  │   Proxy    │       │
│  │ (instâncias│  │  (envio/   │  │  /Chats/   │  │ (pool +    │       │
│  │  + engine) │  │  recebim.) │  │  Groups)   │  │ rotação +  │       │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  │  Webshare) │       │
│        │               │               │         └─────┬──────┘       │
│  ┌─────┴──────┐  ┌──────┴─────┐  ┌──────┴─────┐  ┌──────┴─────┐       │
│  │   Media    │  │ Events &   │  │ Campaigns  │  │Observability│      │
│  │ (storage + │  │ Webhooks   │  │ (massa +   │  │ (monitor +  │      │
│  │  ffmpeg)   │  │ (+ WS GW)  │  │ anti-ban)  │  │  saúde)     │      │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │
│  ┌────────────┐  ┌────────────┐                                       │
│  │    IAM     │  │ Licensing  │     ← Shared Kernel: VOs (Jid,        │
│  │(usuários,  │  │ (licença   │       PhoneNumber, ProxyUri),         │
│  │ API keys,  │  │  offline + │       EventBus, Result, ULID,         │
│  │ team seats)│  │  seats)    │       Clock, Logger, Crypto           │
│  └────────────┘  └────────────┘                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Contextos (módulos):**

1. **Sessions** — ciclo de vida da instância, máquina de estados, abstração de engine (`IEngine`), reconexão, custom auth store.
2. **Messaging** — envio e recebimento de todos os tipos de mensagem, ack/receipts, edição, revogação, reactions.
3. **Contacts & Chats** — contatos, chats, grupos, canais/newsletters, comunidades, labels, presença.
4. **Proxy** — pool de proxies, indexação por posição, faixas por instância, estratégias de rotação, health-test, **sync Webshare**.
5. **Media** — armazenamento (local/S3) e conversão ffmpeg.
6. **Events & Webhooks** — dispatcher (HMAC, retries), WebSocket gateway, filtros por assinatura.
7. **Campaigns** — envio em massa, templates com variáveis, agendamento, relatório de entrega, enforcement de anti-ban.
8. **Observability** — métricas por sessão/shard, monitor de eventos ao vivo, health checks.
9. **IAM** — usuários do painel, API keys, RBAC, team seats (5 vagas).
10. **Licensing** — licença perpétua offline, validação de seats, white-label.

### 4.3 Camadas dentro de cada módulo (DDD tático)

```
modules/<context>/
├── domain/                 # núcleo puro — sem dependência de infra
│   ├── entities/           # Session, Proxy, Campaign, Message...
│   ├── value-objects/      # Jid, PhoneNumber, ProxyRange, ProxyUri, ApiKey...
│   ├── events/             # SessionConnected, ProxyRotated, MessageSent...
│   ├── repositories/       # interfaces (ports) — SessionRepository (abstrata)
│   └── services/           # domain services (regras que não cabem em 1 entidade)
├── application/            # casos de uso (orquestra domínio)
│   ├── commands/           # CreateSession, AssignProxyRange, SendText...
│   ├── queries/            # ListSessions, GetProxyPoolHealth...
│   └── ports/              # interfaces de saída (EnginePort, WebsharePort...)
├── infrastructure/         # implementações concretas (adapters)
│   ├── persistence/        # repos Postgres (Prisma/Drizzle/Kysely)
│   ├── engine/             # BaileysAdapter, WWebJSAdapter
│   └── external/           # WebshareClient, S3Client, ffmpeg
└── interface/              # entrada (controllers/gateways)
    ├── http/               # REST controllers (NestJS)
    ├── ws/                 # WebSocket handlers
    └── dto/                # request/response DTOs + validação (zod/class-validator)
```

### 4.4 Comunicação entre módulos (regra de ouro)

- **Nunca** um módulo lê a tabela de outro diretamente.
- Comunicação por **contratos públicos** (interfaces expostas pelo módulo) ou por **eventos de domínio** num **EventBus interno** (in-process; pode ser Redis pub/sub quando shardado).
- Exemplo: ao conectar uma sessão, `Sessions` emite `SessionConnectedEvent` → `Proxy` reage atribuindo/validando o proxy da faixa; `Observability` reage atualizando o grid; `Events & Webhooks` despacha `session.status`.

### 4.5 Shared Kernel

Value Objects e utilitários compartilhados (imutáveis, sem regra de negócio de um contexto específico):

- `Jid` (parse/normalize, sufixos `@s.whatsapp.net | @lid | @g.us | @newsletter | @broadcast`).
- `PhoneNumber` (E.164, regra BR 9º dígito — §23.11).
- `ProxyUri`, `ProxyRange` (`{ start, end }` com invariantes `start>=1`, `end>=start`).
- `Ulid` (IDs de eventos/mensagens), `Result<T,E>`, `Clock`, `Logger`, `Crypto` (HMAC SHA-512, criptografia de credenciais de proxy).

### 4.6 Estrutura de pastas do repositório

```
/whatsapp-gateway
├── apps/
│   ├── gateway/                 # NestJS (backend, modular monolith)
│   │   └── src/
│   │       ├── modules/         # bounded contexts (§4.3)
│   │       ├── shared-kernel/
│   │       ├── bootstrap/       # composição, DI, config loader
│   │       └── main.ts
│   └── dashboard/               # React + Vite + Tailwind (frontend)
│       └── src/
│           ├── features/        # 1 pasta por feature (espelha contextos)
│           ├── components/      # UI compartilhada
│           ├── lib/             # api client, ws client, auth
│           └── routes/
├── packages/
│   └── contracts/               # tipos TS compartilhados backend↔frontend (DTOs, eventos)
├── prisma/ (ou drizzle/)        # schema + migrations
├── docker/                      # Dockerfile, entrypoints
├── docker-compose.yml           # dev local (app + postgres + redis + minio)
├── .env.example
└── PROMPT-MESTRE-WHATSAPP-GATEWAY.md   # este arquivo
```

---

## 5. Modelo de Conexão & Abstração de Engine

### 5.1 Modos de conexão (por sessão, o usuário escolhe)

1. **QR Code (WhatsApp Web)** — retorna QR em `binary`, `base64` e `raw`. QR expira e renova automaticamente → **emitir evento `session.qr` a cada renovação**.
2. **Pairing Code (por número)** — usuário informa o telefone e recebe código de 8 dígitos (`requestPairingCode(number)`). **Sempre manter QR como fallback.**
3. **Restaurar sessão salva** — reidratar do Postgres sem reescanear (auth persistida).

### 5.2 Máquina de estados da sessão

```
STOPPED ──start──▶ STARTING ──▶ SCAN_QR_CODE / PAIRING_CODE ──▶ WORKING
   ▲                  │                                            │
   │                  ▼                                            ▼
   └──────────── FAILED ◀───────────── (loggedOut/erro) ─── DEGRADED (reconnect loop cap)
```

- Reinício automático ao reiniciar o container (**autostart configurável** por sessão).
- `loggedOut` → vai para `FAILED`, limpa credenciais, **não** entra em loop (§23.3).
- Reconexão transitória (`connectionLost`, `timedOut`, `restartRequired`) → backoff exponencial com jitter até cap; depois `DEGRADED` + alerta.

### 5.3 Interface `IEngine` (porta — coração da plugabilidade)

```ts
// modules/sessions/application/ports/engine.port.ts
export interface IEngine {
  // ciclo de vida
  start(opts: StartOptions): Promise<void>;
  stop(opts?: { clearState?: boolean }): Promise<void>;
  logout(): Promise<void>;
  getState(): SessionState;

  // auth
  getQr(): Promise<QrPayload | null>; // { binary, base64, raw }
  requestPairingCode(phone: string): Promise<string>;

  // envio (forma canônica — o adapter traduz p/ Baileys/WWebJS)
  sendText(jid: Jid, text: string, opts?: SendOpts): Promise<SentMessage>;
  sendMedia(jid: Jid, media: MediaInput, opts?: SendOpts): Promise<SentMessage>;
  sendLocation(jid: Jid, loc: LocationInput): Promise<SentMessage>;
  sendContact(jid: Jid, vcards: VCardInput[]): Promise<SentMessage>;
  sendPoll(jid: Jid, poll: PollInput): Promise<SentMessage>;
  sendReaction(key: MessageKey, emoji: string): Promise<void>;
  editMessage(key: MessageKey, newText: string): Promise<void>;
  deleteMessage(key: MessageKey): Promise<void>;
  forward(jid: Jid, message: WAMessageRef): Promise<SentMessage>;

  // presença / leitura
  sendPresence(jid: Jid, type: PresenceType): Promise<void>;
  markRead(keys: MessageKey[]): Promise<void>;

  // consultas
  onWhatsApp(phone: string): Promise<{ exists: boolean; jid: Jid } | null>;
  profilePictureUrl(
    jid: Jid,
    kind?: 'image' | 'preview',
  ): Promise<string | null>;

  // grupos / canais (subset; ver §6)
  groups: GroupApi;
  newsletters: NewsletterApi;

  // eventos (normalizados p/ schema único de webhook — §10)
  onEvent(handler: (e: NormalizedEvent) => void): void;
}
```

Dois adapters: **`BaileysAdapter`** (default) e **`WWebJSAdapter`**. Ambos **normalizam eventos para o mesmo envelope** (§10) — o resto do sistema nunca sabe qual engine está rodando.

---

## 6. Superfície COMPLETA do WhatsApp (o que a plataforma expõe)

> Em Baileys, **quase tudo passa por `sock.sendMessage(jid, content, options)`** — o "tipo" é a forma do objeto `content` (`AnyMessageContent`). Nomes de funções/eventos confirmados contra `src/Types/Events.ts` e `README.md` oficiais do Baileys.

### 6.1 Tipos de mensagem (módulo Messaging)

| Capacidade                        | `content` (Baileys)                                                   | Observações                                                                                     |
| --------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Texto                             | `{ text }`                                                            | Link preview automático (`link-preview-js`).                                                    |
| Imagem                            | `{ image: {url}\|Buffer, caption?, mimetype? }`                       | url ou Buffer/stream.                                                                           |
| Vídeo                             | `{ video: {url}\|Buffer, caption?, gifPlayback? }`                    | `gifPlayback:true` emula GIF.                                                                   |
| Vídeo-nota (PTV)                  | `{ video:{url}, ptv:true }`                                           | Vídeo circular.                                                                                 |
| Áudio/Voz (PTT)                   | `{ audio:{url}, mimetype:'audio/mp4', ptt:true }`                     | Transcodar p/ Opus/OGG.                                                                         |
| Documento                         | `{ document:{url}\|Buffer, mimetype, fileName }`                      | `fileName` controla nome exibido.                                                               |
| Localização                       | `{ location:{ degreesLatitude, degreesLongitude, name?, address? } }` | Estática (live não estável).                                                                    |
| Contato/vCard                     | `{ contacts:{ displayName, contacts:[{vcard}] } }`                    | Vários contatos; vCard 3.0 cru.                                                                 |
| Sticker estático                  | `{ sticker:{url}\|Buffer }`                                           | WebP; EXIF (autor/pacote) montado manualmente.                                                  |
| Sticker animado                   | `{ sticker: Buffer }` (WebP animado)                                  | Conversão mp4/gif→webp via ffmpeg/`wa-sticker-formatter`.                                       |
| Enquete/Poll                      | `{ poll:{ name, values[], selectableCount } }`                        | `selectableCount:1` única; >1 múltipla.                                                         |
| Reaction                          | `{ react:{ text:'💖', key } }`                                        | `text:''` **remove** a reação.                                                                  |
| Mentions                          | `{ text:'@55...', mentions:['...@s.whatsapp.net'] }`                  | `@número` no texto + JID no array.                                                              |
| @all (grupo)                      | montar lista de JIDs de `groupMetadata().participants`                | Não há "@all" nativo.                                                                           |
| Reply/Quote                       | `options:{ quoted: msg }`                                             | `msg` precisa estar em cache/store.                                                             |
| Edição                            | `{ text:'novo', edit: key }`                                          | Janela ~15 min.                                                                                 |
| Revogar/Delete                    | `{ delete: key }`                                                     | `protocolMessage` REVOKE; só autor, na janela.                                                  |
| Ephemeral                         | `options:{ ephemeralExpiration }` / `groupToggleEphemeral`            | TTL 24h/7d/90d.                                                                                 |
| Forward                           | `{ forward: msg }` (`options:{ force:true }`)                         | Preserva conteúdo.                                                                              |
| View once                         | `{ image/video/audio, viewOnce:true }`                                | Visualização única.                                                                             |
| **Listas / Botões / Interactive** | `listMessage`/`buttonsMessage`/`interactiveMessage`                   | ⚠️ **Instável/descontinuado** p/ contas comuns. Vender como **best-effort com fallback texto**. |

### 6.2 Status/Stories

Mensagem para `status@broadcast` (texto c/ background, imagem, vídeo). Audiência via `statusJidList`.

### 6.3 Canais/Newsletters (server `@newsletter`)

`newsletterCreate`, `newsletterMetadata`, `newsletterFollow/Unfollow`, `newsletterMute/Unmute`, `newsletterUpdateName/Description/Picture`; postar via `sendMessage`; eventos `newsletter.reaction`, `newsletter.view`, `newsletter-participants.update`, `newsletter-settings.update`.

### 6.4 Grupos (módulo Contacts & Chats) — família `group*`

| Operação                   | Função                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Criar                      | `groupCreate(subject, participants[])`                                                     |
| add/remove/promote/demote  | `groupParticipantsUpdate(jid, [jids], action)`                                             |
| Nome / descrição           | `groupUpdateSubject` / `groupUpdateDescription`                                            |
| Configs (quem envia/edita) | `groupSettingUpdate(jid, 'announcement'\|'not_announcement'\|'locked'\|'unlocked')`        |
| Modo de adição             | `groupMemberAddMode`                                                                       |
| Sair                       | `groupLeave`                                                                               |
| Link de convite            | `groupInviteCode` → `https://chat.whatsapp.com/<code>`; revogar `groupRevokeInvite`        |
| Aceitar convite            | `groupAcceptInvite(code)` / `groupAcceptInviteV4`                                          |
| Aprovar entrada            | `groupRequestParticipantsList` + `groupRequestParticipantsUpdate(...,'approve'\|'reject')` |
| Metadados                  | `groupMetadata` / `groupFetchAllParticipating`                                             |
| Ephemeral                  | `groupToggleEphemeral`                                                                     |
| Foto                       | `updateProfilePicture(jid, media)`                                                         |

### 6.5 Comunidades, Catálogo/Commerce, Labels, Business profile

- **Comunidades**: grupo "pai" + subgrupos via família `group*` (parcial, recurso avançado).
- **Catálogo/Commerce** (`getCatalog`, `productCreate/Update/Delete`, `orderMessage`/`productMessage`): **Business-only**, condicional.
- **Labels** (`labels.edit`, `labels.association`): Business-only.
- **Business profile**: leitura/escrita condicional (Business).

> Regra de produto: itens marcados **instável/Business-only** são oferecidos como **condicionais**, com fallback claro. É exatamente aqui que WAHA/Evolution "prometem demais e quebram" — nós **não** vendemos como core.

### 6.6 Presença, ack, bloqueio, perfil, verificação, chamadas

- **Presença**: `sendPresenceUpdate('composing'|'recording'|'paused'|'available'|'unavailable', jid)`; assinar `presenceSubscribe`; receber `presence.update`.
- **Ack/receipts** (`messages.update` + `message-receipt.update`): `PENDING → SERVER_ACK(✓) → DELIVERY_ACK(✓✓) → READ(azul) → PLAYED(áudio)`.
- **Bloqueio**: `updateBlockStatus(jid,'block'|'unblock')`; eventos `blocklist.set/update`.
- **Perfil próprio**: `updateProfilePicture`/`removeProfilePicture`, `updateProfileStatus(text)`, `updateProfileName(name)`; de terceiros `profilePictureUrl` / `fetchStatus`.
- **Verificar número**: `onWhatsApp(jid)` → usar `res.jid` retornado como verdade canônica (regra BR §23.11).
- **Chamadas**: receber via evento `call`; **`rejectCall(id, from)`** suportado; **aceitar/originar não é estável** → política: auto-rejeitar (anti-spam) + responder texto.

---

## 7. Proxy & Rotação — DIFERENCIAL CENTRAL ⭐

> Esta seção atende explicitamente: **(a)** criar lista de proxies, **(b)** rotacionar a lista entre os números, **(c)** escolher na plataforma uma **faixa de IDs por instância** (ex.: instância A usa **1–10**, instância B usa **5–10**, com sobreposição permitida), e **(d)** **puxar automaticamente a lista da API do Webshare**.

### 7.1 Aplicação correta de proxy no Baileys (regra dura)

Dois campos no `makeWASocket`, ambos com o **mesmo** proxy:

- **`agent`** → conexão **WebSocket** principal (socket WA).
- **`fetchAgent`** → **fetch de mídia** (upload/download).

> ⚠️ **Pegadinha clássica:** setar só `agent` e esquecer `fetchAgent` faz o **download/upload de mídia vazar pelo IP real do servidor**, minando o anti-ban e expondo a infra. **Sempre os dois.**

Agentes: **SOCKS5** `new SocksProxyAgent('socks5://user:pass@host:port')`; **HTTP(S)** `new HttpsProxyAgent('http://user:pass@host:port')`.

### 7.2 Modelo de domínio do Proxy

**Entidade `Proxy`** (tabela `proxies`):

| Campo                     | Tipo                                  | Nota                                              |
| ------------------------- | ------------------------------------- | ------------------------------------------------- |
| `id`                      | ULID                                  | PK interna                                        |
| **`position`**            | int **único, estável**                | **o "ID 1..N" que o usuário vê e usa nas faixas** |
| `label`                   | text                                  | opcional                                          |
| `protocol`                | enum `http\|https\|socks4\|socks5`    |                                                   |
| `host`                    | text                                  |                                                   |
| `port`                    | int                                   |                                                   |
| `username`                | text null                             |                                                   |
| `password`                | text null (**criptografado at-rest**) |                                                   |
| `source`                  | enum `webshare\|manual`               | origem                                            |
| `webshare_id`             | text null                             | id externo p/ upsert idempotente                  |
| `country`                 | text null                             | geo do IP de saída                                |
| `exit_ip`                 | inet null                             | último IP de saída testado                        |
| `latency_ms`              | int null                              | última latência testada                           |
| `status`                  | enum `untested\|alive\|dead`          | saúde                                             |
| `last_tested_at`          | timestamptz null                      |                                                   |
| `enabled`                 | bool default true                     |                                                   |
| `created_at`/`updated_at` | timestamptz                           |                                                   |

**Invariante crítica — `position` é estável:**

- Atribuída **na importação** e **nunca reembaralhada** em re-syncs.
- Proxy novo (Webshare ou manual) recebe `next position` (append).
- Proxy removido na origem é marcado `dead`/tombstone, mas **mantém seu slot** — assim "faixa 1–10" continua significando os mesmos proxies ao longo do tempo. (Sem isso, a re-sincronização do Webshare bagunçaria todas as faixas já configuradas.)

### 7.3 Atribuição por instância — **faixa de IDs** + estratégia

**Entidade `SessionProxyAssignment`** (tabela `session_proxy_assignments`):

| Campo                     | Tipo                                              | Nota                       |
| ------------------------- | ------------------------------------------------- | -------------------------- |
| `session_id`              | FK                                                | 1:1 com sessão             |
| `mode`                    | enum `range\|single\|global_round_robin\|none`    | como o proxy é escolhido   |
| `range_start`             | int null                                          | início da faixa (ex.: 1)   |
| `range_end`               | int null                                          | fim da faixa (ex.: 10)     |
| `selection_strategy`      | enum `sticky\|round_robin\|least_latency\|random` | dentro da faixa            |
| `rotate_interval_minutes` | int null                                          | rotação agendada (opt-in)  |
| `current_proxy_id`        | FK null                                           | proxy em uso agora         |
| `pinned`                  | bool                                              | trava o `current_proxy_id` |

**Como a faixa funciona (exatamente o pedido):**

- Instância A: `mode=range`, `range_start=1`, `range_end=10` → usa apenas proxies de posição 1 a 10.
- Instância B: `mode=range`, `range_start=5`, `range_end=10` → usa 5 a 10 (**sobreposição permitida** — A e B podem compartilhar 5–10).
- A seleção do proxy concreto **dentro** da faixa segue `selection_strategy`.

**Estratégias dentro da faixa:**

| Estratégia               | Comportamento                                                                                                                    | Quando usar                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **`sticky`** _(default)_ | `hash(sessionId)` mapeia deterministicamente para um índice da faixa → o **mesmo** proxy sempre (estável). Só troca em failover. | **Recomendado p/ anti-ban** — chip aquecido não deve trocar de IP à toa. |
| `round_robin`            | cursor compartilhado avança a cada (re)conexão/atribuição → distribui sessões pela faixa.                                        | Distribuir carga na **alocação inicial** de muitas sessões.              |
| `least_latency`          | escolhe o proxy `alive` de menor `latency_ms` na faixa.                                                                          | Priorizar performance.                                                   |
| `random`                 | aleatório dentro da faixa.                                                                                                       | Casos específicos.                                                       |

> **Cursor de round-robin** vive em **Redis** (`proxy:rr:cursor:<rangeKey>` com `INCR`), para funcionar entre shards. Ao atingir `range_end`, volta a `range_start` (ignorando `dead`/`disabled`).

**Rotação entre os números (o pedido "rotacionar a lista entre os números"):**

- Na criação de várias sessões em lote, com `mode=global_round_robin` (ou `range` + `round_robin`), o sistema distribui os proxies **round-robin entre as instâncias** automaticamente.
- **Rotação agendada (opt-in, com aviso anti-ban):** se `rotate_interval_minutes` definido, um job BullMQ repetível troca o `current_proxy_id` pela próxima posição válida da faixa a cada N minutos. **UI mostra alerta:** "trocar IP de chip aquecido aumenta risco de bloqueio — use rotação agendada só em chips frios/aquecimento".

**Failover:** se o proxy atual cair (health-test falha ou erro de conexão repetido), seleciona o próximo `alive` da **mesma faixa**, preferindo **mesmo país/região** do atual (coerência geográfica para o número).

### 7.4 Sync automático da API Webshare

**Job BullMQ repetível** `proxy.webshare.sync` (intervalo configurável, default 6h) + botão **"Sincronizar agora"** no dashboard:

1. `GET https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page_size=100` com header `Authorization: Token <WEBSHARE_API_KEY>`; **paginar** todas as páginas.
2. **Upsert por `webshare_id`** na tabela `proxies` (host, port, user, pass, country). Proxies novos recebem **próxima `position`** (append, estável).
3. Proxies que sumiram da Webshare → `status=dead` (tombstone), mantendo `position`.
4. Disparar `health-test` (§7.5) dos novos/alterados.
5. Emitir evento `proxy.pool.synced` → dashboard atualiza em tempo real.

> Suportar também credenciais embutidas (`user:pass@host:port`) e o formato de lista por env (`PROXY_SERVER_LIST`) como fallback manual.

### 7.5 Health-test (latência + IP de saída)

Antes de prender um proxy a uma sessão, e periodicamente:

- Requisição a um **echo de IP** (serviço que devolve o IP visto) **usando o `agent` do proxy**, medindo latência e confirmando que o IP de saída é o do proxy (**não** o do servidor → detecta vazamento).
- Reprovar proxies lentos (> limite configurável) ou com IP vazado → `status=dead`.
- Botão **"Testar"** por proxy e **"Testar faixa"** (testa todos da faixa de uma instância) no dashboard.

### 7.6 Precedência de configuração de proxy

`sessão (faixa/single) > lista round-robin global > proxy global (env)`.

### 7.7 Telas de Proxy no dashboard (§13 detalha)

- **Pool de Proxies:** tabela com `#position`, `host:port`, protocolo, país, **IP de saída**, **latência**, status colorido, origem, **nº de sessões usando**, ações (testar / ativar / desativar / excluir). Botão **"Sincronizar Webshare"** + agendamento.
- **Config por instância:** dois inputs numéricos **De → Até** (ex.: `1` → `10`) com preview ao vivo dos proxies que caem na faixa e a saúde de cada um; dropdown de estratégia; toggle + intervalo de rotação agendada (com alerta anti-ban); botão **"Testar faixa"**.

---

## 8. Sessões ILIMITADAS — arquitetura de escala

### 8.1 Custo por sessão (operacional)

|                               | Baileys                       | WWebJS                    |
| ----------------------------- | ----------------------------- | ------------------------- |
| RAM idle                      | ~40–90 MB                     | ~250–400 MB               |
| RAM pico (history sync/mídia) | ~120–250 MB                   | ~400–700 MB               |
| CPU                           | baixo (spikes em decode/sync) | alto e contínuo (browser) |

> `syncFullHistory` é o maior vilão de RAM no boot → **default `false`**.

### 8.2 Isolamento e sharding

1. **Process pool**: K sessões por processo (`child_process.fork` por grupo). Crash de um grupo **não** derruba os outros; o pai supervisiona via `child.on('exit')` e reinicia só o grupo afetado.
2. **Sticky por `sessionId`**: roteador mapeia `sessionId → shard/processo` por hash consistente; toda chamada/evento da sessão cai no worker que tem o socket vivo. Mapa em **Redis**.
3. **Múltiplos containers**: cada container = um pool com teto de sessões; **registry** (Redis/Postgres) de `sessionId → container`.
4. **Teto por RAM real**, não número mágico (regra de bolso: ~150 MB/sessão de teto → container de 4 GB ≈ 20–25 sessões com folga) + **backpressure** (recusa nova sessão no teto).

### 8.3 Escala horizontal

Borda **stateless** (API/webhook dispatcher) + shard **stateful** (socket). Fila de saída por sessão (BullMQ) desacopla API↔socket e habilita rate-limit/anti-ban. Eventos entram em fila central (Redis Stream) consumida pelo dispatcher de webhooks.

### 8.4 Custom Auth Store em PostgreSQL (pilar)

`useMultiFileAuthState` (arquivos) só p/ dev. **Produção = custom auth store em DB:**

- `creds` → 1 linha por sessão (jsonb) em `wa_sessions`.
- `keys` (Signal: pre-keys, sender-keys, app-state-sync) → tabela KV `wa_session_keys(session_id, key_type, key_id, value jsonb)` com `get(type, ids[])` e `set(batch)`.
- Persistir em `creds.update` (`sock.ev.on('creds.update', saveCreds)`); persistir keys no `set`.
- **Cache LRU em memória** na frente do DB para `keys` (leitura altíssima).
- **Reidratação no restart**: registry lista sessões ativas → shard carrega `creds`+`keys` → `makeWASocket({ auth })` → reconecta sem novo QR.

### 8.5 Reconexão (decisão por `DisconnectReason`)

- `restartRequired`(515) / `connectionLost` / `connectionClosed` / `timedOut` → **reconectar** (backoff+jitter, cap).
- `loggedOut`(401) → **NÃO** reconectar; limpar creds/keys; exigir novo QR/pairing; alertar. (Loop aqui = causa nº1 de "QR infinito" e acelera ban.)

### 8.6 `getMessage` obrigatório

WhatsApp pede retry de descriptografia → Baileys chama `getMessage(key)` do config. Implementar **store de mensagens enviadas** (DB/cache) que `getMessage` consulta, senão ocorrem "Waiting for this message" e falhas de poll/receipt.

### 8.7 Cache de `groupMetadata`

Fornecer `cachedGroupMetadata: async (jid) => cache.get(jid)` e atualizar em `groups.update`/`group-participants.update` (evita fetch a cada envio — lento e detectável).

---

## 9. API REST + WebSocket

> Auth: header **`X-Api-Key`** (texto e SHA-512). Padrão de rota compatível com WAHA/Evolution.

### 9.1 Sessões

- `POST /api/sessions` — criar/iniciar (config: webhooks, **proxy {mode, range_start, range_end, strategy, rotate_interval}**, engine, metadata, deviceName, ignore rules, debug).
- `GET /api/sessions` (`?all=true`), `GET /api/sessions/{s}`, `PUT /api/sessions/{s}`.
- `POST /api/sessions/{s}/start | /stop | /restart | /logout`, `DELETE /api/sessions/{s}`.
- `GET /api/sessions/{s}/me`, `GET /api/{s}/auth/qr` (binary/base64/raw), `POST /api/{s}/auth/request-code` (pairing).
- `GET /api/screenshot?session={s}` (só engine com browser).

### 9.2 Envio

`sendText` (reply_to, mentions, `mentions:["all"]`, linkPreview), `sendImage`, `sendVideo` (`asNote`), `sendVoice` (`convert`), `sendFile`, `sendLocation`, `sendContactVcard`, `sendPoll`, `sendPollVote`, `sendList`, `sendButtons`, link preview custom, `sendSeen`, presença "digitando".
Conversão server-side: `POST /api/media/convert/voice`, `/api/media/convert/video` (Opus/OGG, MP4/H264, JPEG).

### 9.3 Mensagens/Chats

`forwardMessage`, editar (`PUT .../messages/{id}`), deletar, `reaction` (PUT), `star` (PUT). `GET /api/messages?chatId=&limit=`, `GET .../messages/{id}` (`downloadMedia`). Chats: listar, arquivar, marcar lido, apagar.

### 9.4 Contatos/Grupos/Canais/Status

Contatos: `check-exists` (regra BR §23.11), foto, info, bloquear/desbloquear. Grupos: §6.4 completo. Canais & Status: enviar/listar. Perfil próprio: nome, foto, "sobre".

### 9.5 Proxy (novo conjunto de rotas)

- `GET /api/proxies` (pool + saúde) · `POST /api/proxies` (manual) · `PUT/DELETE /api/proxies/{id}`.
- `POST /api/proxies/{id}/test` · `POST /api/proxies/test-range?start=&end=`.
- `POST /api/proxies/webshare/sync` (sync agora) · `GET /api/proxies/webshare/status`.
- `PUT /api/sessions/{s}/proxy` (definir faixa/estratégia/rotação) · `POST /api/sessions/{s}/proxy/rotate` (forçar rotação).

### 9.6 Mídia

`GET /api/files/{id}` (autenticado; opção de excluir path da auth; `FILES_LIFETIME` configurável).

### 9.7 WebSocket

`/ws?session=*&events=*&x-api-key=...` — para dashboard e integrações em tempo real (eventos normalizados §10). Configurar Traefik p/ WebSocket long-lived (§19.2).

---

## 10. Eventos & Webhooks

### 10.1 Envelope padronizado (todos os eventos)

```jsonc
{
  "id": "01J...", // ULID
  "timestamp": 1718800000000,
  "event": "message", // tipo
  "session": "proxy-3",
  "metadata": {/* metadata da sessão */},
  "me": { "id": "...", "pushName": "..." },
  "payload": {/* específico do evento */},
  "engine": "baileys",
}
```

### 10.2 Eventos a emitir (mapeados de `BaileysEventMap`, normalizados)

`session.status`, `session.qr`, `message`, `message.any`, `message.reaction`, `message.ack` (+`.group`), `message.edited`, `message.revoked`, `chat.archive`, `group.v2.join/leave/participants/update`, `presence.update`, `poll.vote(.failed)`, `call.received/accepted/rejected`, `label.*`, `proxy.pool.synced`, `proxy.rotated`, `engine.event` (debug).

> Eventos de alto volume (`messages.upsert`, `presence.update`, `messages.update`) passam por fila + **filtro por assinatura** (cliente escolhe quais recebe) p/ não afogar o endpoint.

### 10.3 Webhooks

Por sessão **e** globais, com seleção de eventos, **HMAC SHA-512**, headers customizados, **retries** (`constant | linear | exponential+jitter`). Botão **"testar webhook"** no painel. Filtros _ignore_ por sessão (status/grupos/canais/broadcast) p/ economizar recursos. **Bônus (Evolution):** conectores opcionais RabbitMQ, WebSocket global, Chatwoot/Typebot/n8n.

---

## 11. Campanhas / Envio em massa + Anti-ban (módulo Campaigns)

### 11.1 Campanha

Lista de destinatários, template com variáveis (`{{nome}}`, `{{data}}`…), mídia, **rate-limit configurável**, agendamento (BullMQ), relatório **entregue/lido/falha** em tempo real.

### 11.2 Anti-ban (enforcement obrigatório)

- **Proxy residencial/ISP sticky por sessão** (não datacenter, não rotativo agressivo); geo coerente com DDI.
- **Rate-limit por chip** (contador Redis `INCR` + TTL diário): chip novo dezenas/dia em rampa; aquecido centenas/dia.
- **Delays humanizados aleatórios** entre envios (ex.: `random(3s,12s)`), pausas maiores a cada N.
- **Presença simulada**: `presenceSubscribe` → `composing` (tempo ∝ tamanho do texto) → `paused` → enviar; áudio usa `recording`. `markOnlineOnConnect:false`.
- **Variação de mensagem** (spintax): nunca o mesmo texto literal em massa.
- **Reação a risco**: queda de entregabilidade / surto de bloqueios / `loggedOut` repetido → **pausar sessão automaticamente** + alertar (não reerguer em loop).

### 11.3 Aquecimento de chip novo

Rampa crescente (2–4 semanas), tráfego bidirecional com contatos reais, perfil completo (foto/nome/"sobre"), poucos grupos legítimos.

---

## 12. Mídia (módulo Media)

- Storage **local (volume)** + **S3/MinIO/R2** (configurável). `FILES_LIFETIME` p/ expiração.
- **Streams + ffmpeg via `spawn`** (nunca `exec` — bufferiza tudo): pipeline `node:stream/promises` com `AbortSignal` p/ cancelar em disconnect. Conversões: voz→Opus/OGG, vídeo→MP4/H264, imagem→JPEG, sticker→WebP(animado).
- Download de mídia **on-demand/assíncrono** (fila), com `downloadMediaMessage(msg,'stream',{}, { reuploadRequest: sock.updateMediaMessage })` (mídia antiga expira → precisa re-upload). Ver §23.4.

---

## 13. Dashboard / Frontend — incremental e testável desde o dia 1 ⭐

> **Requisito explícito:** o frontend é construído **junto** com o backend, fase a fase, para você ir testando. React + Vite + Tailwind, WebSocket p/ tempo real, protegido por login (§15).

### 13.1 Telas (controle máximo)

1. **Visão geral (grid de sessões):** cards com status colorido, número conectado, engine, **proxy atribuído + IP de saída ao vivo**, faixa de proxy em uso, **CPU/RAM por sessão/shard**, msgs/min in/out, último evento.
2. **Criar sessão:** engine (Baileys/WWebJS), modo (QR/pairing), **proxy (faixa De→Até / single / global / nenhum)** + estratégia + rotação agendada, webhooks, deviceName, metadata, regras de ignore.
3. **Conexão visual:** QR em tempo real (auto-renova) e/ou campo de número + código de pareamento.
4. **Gerenciador de Proxies (§7.7):** pool, sync Webshare, teste latência/IP, faixas por instância, rotação agendada.
5. **Monitor de eventos (Event Monitor):** stream ao vivo de todos os webhooks/eventos, filtro por sessão e tipo.
6. **Chat/Inbox embutido:** ver conversas, enviar (texto/mídia/enquete/localização/contato), responder, reagir — direto no painel.
7. **Campanhas:** destinatários, template+variáveis, mídia, rate-limit, agendamento, relatório entregue/lido/falha.
8. **Webhooks UI:** URL, eventos, HMAC, headers, retries; botão "testar".
9. **Logs & saúde:** logs por sessão (info/debug/trace), health (storage/DB/sessões), métricas.
10. **API keys & usuários do painel** (§15).
11. **Configurações globais:** engine padrão, proxy global, lifetime de mídia, storage, timezone.
12. **Licença** (§16) e **Suporte** (chat com a equipe, opcional).

### 13.2 Mockup — Config de faixa de proxy por instância

```
┌─ Instância: vendas-01 ──────────────────────────────────────────────┐
│ Engine: [Baileys ▼]      Modo conexão: ( ) QR  (•) Pairing code      │
│                                                                      │
│ Proxy:  (•) Faixa do pool   ( ) Único   ( ) Global RR   ( ) Nenhum   │
│         De [  1 ]  Até [ 10 ]      Estratégia: [ sticky ▼ ]          │
│         [✓] Rotação agendada a cada [ 360 ] min  ⚠ risco anti-ban    │
│                                                                      │
│ Preview da faixa (1–10):                          [ Testar faixa ]   │
│   #1  socks5 br  201.x.x.x   45ms   ● alive   (3 sessões)            │
│   #2  socks5 br  201.x.x.y   52ms   ● alive   (2 sessões)            │
│   #5  http   br  187.x.x.z  120ms   ● alive   (1 sessão)            │
│   #8  socks5 us  3.x.x.x      —     ○ dead    (0)                    │
│   ...                                                                │
│                                            [ Cancelar ]  [ Salvar ]  │
└──────────────────────────────────────────────────────────────────────┘
```

### 13.3 Frontend client

- `lib/api` (REST, injeta `X-Api-Key`), `lib/ws` (assina `/ws`, reconecta), `lib/auth` (JWT do painel).
- `packages/contracts` compartilha tipos DTO/evento backend↔frontend (sem divergência de schema).

---

## 14. Observability — "ver o que está acontecendo" ⭐

> Requisito explícito: visão em tempo real do que acontece.

- **Grid de sessões ao vivo** (via WS): status, número, engine, **proxy + IP de saída atual**, última rotação, msgs in/out por minuto, último evento, RAM/CPU do shard.
- **Event Monitor**: stream de todos os eventos (filtra por sessão/tipo), com pause/replay e export.
- **Timeline por sessão**: conexões, reconexões, trocas de proxy, erros.
- **Métricas (Prometheus-friendly em `/metrics`)**: `event_loop_delay_p99`, `heap_used`, `external_bytes` (buffers de mídia!), sessões ativas, fila BullMQ (waiting/active/failed), taxa de envio/erro por sessão, latência de proxy.
- **Health `/health`** com `ok|degraded|unhealthy` (heap%, loop lag) — usado pelo Swarm (§19.6).
- **Logs estruturados** com `AsyncLocalStorage` propagando `sessionId`/`requestId` por toda a cadeia async.

---

## 15. IAM — usuários, API keys, team seats (módulo IAM)

- **Login do painel** (usuário/senha em env p/ admin inicial) + JWT de sessão.
- **RBAC**: papéis `owner | admin | operator | viewer`.
- **API keys** (texto + SHA-512), com escopo e revogação; rotação.
- **Team seats — convide sua equipe (5 vagas)**: convite por e-mail, papel por membro, limite de 5 (configurável por licença).
- Auditoria de ações sensíveis (criar/excluir sessão, trocar proxy, disparar campanha).

---

## 16. Licenciamento & Comercialização (módulo Licensing) ⭐

> Requisito: **licença que funciona mesmo após cancelar a assinatura** (sem verificação online / sem kill-switch).

- **Licença perpétua OFFLINE**: chave assinada (Ed25519/JWT) emitida pelo seu sistema de venda, validada **localmente** com a public key embutida. **Sem phone-home** — funciona desconectado e após cancelamento.
- Conteúdo da licença (claims): `licensee`, `seats` (ex.: 5), `features` (white-label, engines), `issued_at`, `edition`. **Sem `expires_at` obrigatório** (perpétua) — opcionalmente um `support_until` apenas informativo (não bloqueia o software).
- **Sem limite de sessões/mensagens** imposto pela licença (claims de marketing §1.2).
- **White-label** (opcional por licença): logo, cores, domínio próprio do painel.
- **Anti-pirataria leve e honesto**: assinatura criptográfica (não dá pra forjar chave), mas **sem travar o cliente legítimo offline**. (Esse é exatamente o apelo do produto.)
- **Suporte prioritário** (opcional): módulo de chat no painel para a equipe trocar mensagens com o cliente (pode ser um canal interno simples ou integração externa).

---

## 17. Persistência — PostgreSQL + Redis

### 17.1 Tabelas principais (PostgreSQL 18, jsonb)

- `wa_sessions` (id, name, engine, status, metadata jsonb, **creds jsonb**, autostart, ignore_rules jsonb, created_at…).
- `wa_session_keys` (session_id, key_type, key_id, value jsonb) — **Signal keys** (§8.4); PK composta; índice por (session_id, key_type).
- `proxies` (§7.2) — `position` único; índice parcial `WHERE enabled AND status='alive'`.
- `session_proxy_assignments` (§7.3).
- `messages` (id ULID, session_id, chat_jid, sender_jid, **lid_jid**, type, payload jsonb, status, timestamp) — **particionar por tempo (pg_partman) quando > 50M linhas**; índice por (session_id, chat_jid, timestamp DESC); GIN em payload p/ busca.
- `contacts` (session_id, pn_jid, **lid_jid**, push_name, business…), `chats`, `groups`.
- `webhooks` (escopo, url, eventos[], hmac_key, headers jsonb, retry_policy), `webhook_deliveries` (status, tentativas, próximo retry).
- `campaigns`, `campaign_recipients` (status entregue/lido/falha).
- `users`, `api_keys`, `team_members`, `licenses`, `audit_logs`.
- `lid_pn_mappings` (lid_jid ↔ pn_jid) — **crítico** (§23.1).

### 17.2 Redis 7

- Registry `sessionId → shard/container`; cursores de rotação de proxy; rate-limit por chip (`INCR`+TTL); estado em tempo real p/ grid; pub/sub p/ WS entre shards; backing do BullMQ.

---

## 18. Decisões de runtime Node.js v26 (resumo dos pontos críticos)

> Fonte: doc oficial Node.js v26 (anexo B).

### 18.1 Modelo de processo

Cluster **não** serve para hospedar sessões com estado (round-robin quebra afinidade; a própria doc avisa para não depender de estado em memória). **worker_threads** é para CPU-bound, não I/O. **Decisão: múltiplos processos/containers com afinidade por `sessionId`** (§8.2). Cluster só para rotas REST stateless, se necessário.

### 18.2 Isolamento de falha

`child_process.fork()` por grupo de sessões; pai reinicia só o grupo que caiu. Workers de tarefa com `resourceLimits.maxOldGenerationSizeMb` (terminados ao estourar, sem derrubar o processo).

### 18.3 Memória

Monitorar `process.memoryUsage()` (atenção a `external` = buffers de mídia) e `monitorEventLoopDelay()` (p99 > 100ms = CPU-bound bloqueando). `--max-old-space-size` **explícito** em container (senão OOMKill silencioso). `--heapsnapshot-near-heap-limit=2` p/ snapshot automático antes do OOM. Remover listeners (`removeAllListeners`) e timers ao fechar sessão (leak comum).

### 18.4 Graceful shutdown (SIGTERM/SIGINT)

Ordem: parar de aceitar conexões → drenar BullMQ (`worker.close()`) → **persistir auth state de todas as sessões** → fechar sockets Baileys limpos → fechar PG/Redis. `process.exitCode=0` (não `process.exit()`), timeout de força com `.unref()`. No compose: `stop_grace_period` > timeout do Node.

### 18.5 CPU-bound → worker_threads

Geração de QR, thumbnails, compressão de histórico, parsing de vCard grande. Transferir buffers com `transferList` (zero-copy). `EventEmitter.captureRejections=true` (handler async que rejeita derruba o processo no v26 por padrão).

### 18.6 HTTP client / webhooks

`undici` (`Agent` keep-alive + `ProxyAgent`), `AbortSignal.timeout()` por webhook, retries via BullMQ (não loop `while` bloqueando worker).

---

## 19. Deploy no Dokploy (Swarm + Traefik + Let's Encrypt)

> Fonte: doc oficial Dokploy (anexo C).

### 19.1 Estrutura no painel

```
Projeto: whatsapp-gateway
├── Application: gateway-app   (Dockerfile, porta 3000, domínio HTTPS letsencrypt)
│   ├── Volumes: gateway-auth-state→/app/auth · gateway-media→/app/media
│   ├── Healthcheck: curl /health (interval 30s, startPeriod 30s)
│   ├── Update Config: FailureAction=rollback, Order=start-first (zero-downtime)
│   ├── Replicas: 1 (escala horizontal exige auth state externalizado)
│   └── Auto Deploy: webhook Git
├── Application: dashboard-app (build estático React, domínio próprio)
├── Database: gateway-postgres → Backup R2 (cron 0 3 * * *)
├── Database: gateway-redis
└── Volume Backup: gateway-auth-state → R2 (cron 0 4 * * *)
```

### 19.2 WebSocket long-lived atrás do Traefik

Traefik suporta WS nativo (handshake `Upgrade`), mas timeouts padrão derrubam conexões idle (sessão WA fica horas aberta). Configurar `serversTransport` em `/etc/dokploy/traefik/dynamic/` com `responseHeaderTimeout`/`idleConnTimeout` altos (ex.: `3600s`) e aplicar via campo Traefik custom da Application.

### 19.3 Build

Dockerfile multi-stage (`node:26-alpine` + `curl` p/ healthcheck + ffmpeg). **Recomendado**: build em CI (GitHub Actions) → push GHCR → Dokploy só faz pull (não estoura RAM do servidor no build de imagem pesada).

### 19.4 Volumes/Backups

Auth state e mídia em volumes nomeados (sobrevivem a redeploy). Postgres → S3/R2 agendado; volume auth state → Volume Backup agendado. Mídia idealmente em S3/MinIO (volume local só temporário).

### 19.5 Escala (o problema das sessões)

Socket WA vive no processo → **não** pode pular entre réplicas. Opções: **A)** 1 réplica (vertical) — mais simples; **B)** 1 Application por número; **C)** sticky session no Traefik (cookie) + **auth state externalizado em Postgres/Redis** p/ escalar HTTP/WS; **D)** placement constraint p/ pinar no nó do volume. **Escala horizontal real exige auth state em DB (§8.4).**

### 19.6 Healthcheck

`/health` 200/503 (heap%, loop lag). Swarm só roteia tasks `healthy` (base do zero-downtime); `StartPeriod` 30s (Baileys demora a reconectar no boot). Rollback automático se `unhealthy` após start.

---

## 20. Roadmap de entrega — backend **+ frontend** por fase

> Cada fase termina **rodando e testável no dashboard**. Nada de front só no final.

| Fase                                      | Backend                                                                                                                    | Frontend testável                                                           | Critério de pronto                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **F0 — Fundação**                         | Monorepo, NestJS+Fastify, Postgres+Redis, Docker compose, config loader, shared-kernel, EventBus, IAM mínimo (login admin) | Tela de **login** + shell do dashboard                                      | `docker compose up` sobe tudo; login funciona; `/health` 200                                          |
| **F1 — Sessão + QR/Pairing + Auth store** | Módulo Sessions, `IEngine`+`BaileysAdapter`, custom auth store PG, máquina de estados, reconexão                           | **Criar sessão** + **QR ao vivo** + **pairing code** + grid de status       | Conectar 1 número via QR e via código; reidratar após restart sem novo QR                             |
| **F2 — Mensagens texto + webhook**        | Enviar/receber texto, `getMessage` store, envelope de eventos, webhook dispatcher (HMAC/retries), WS gateway               | **Inbox** mínima (enviar/receber texto) + **Event Monitor** ao vivo         | Enviar e receber texto; webhook entrega com HMAC; ver evento no monitor                               |
| **F3 — Proxy + Webshare + Faixas** ⭐     | Módulo Proxy: pool, `position` estável, **sync Webshare**, health-test, faixas por instância, estratégias, failover        | **Gerenciador de Proxies** + **config de faixa De→Até** + teste latência/IP | Importar do Webshare; atribuir faixa 1–10 a A e 5–10 a B; ver IP de saída por sessão; sticky funciona |
| **F4 — Mídia**                            | Streams+ffmpeg, storage local/S3, download on-demand, conversões                                                           | Enviar/receber imagem/vídeo/voz/doc na inbox                                | Enviar e baixar todos os tipos de mídia                                                               |
| **F5 — Grupos/Contatos/Canais**           | Família `group*`, contatos (`onWhatsApp` BR), presença, ack, newsletters                                                   | Telas de grupos/contatos + presença/ack na inbox                            | CRUD de grupo; verificar número BR; ack visível                                                       |
| **F6 — Campanhas + Anti-ban**             | Módulo Campaigns, BullMQ, rate-limit por chip, humanização, relatório                                                      | **Campanhas** (destinatários/template/agendamento/relatório)                | Disparar campanha com rate-limit e ver entregue/lido/falha                                            |
| **F7 — Observability + Escala**           | Métricas `/metrics`, timeline, process pool/sharding, registry Redis                                                       | **Logs & saúde** + métricas por shard no grid                               | Crash de 1 sessão não derruba outras; métricas visíveis                                               |
| **F8 — WWebJS plugável**                  | `WWebJSAdapter` por trás do mesmo `IEngine`                                                                                | Selecionar engine na criação                                                | Trocar engine por sessão sem mudar API/UI                                                             |
| **F9 — IAM completo + Licença + Deploy**  | RBAC, team seats (5), API keys, licença offline, white-label                                                               | **API keys**, **equipe**, **licença**, config global                        | Convidar 5 membros; licença valida offline; deploy Dokploy completo                                   |

---

## 21. Definition of Done (global)

- [ ] Cada módulo respeita as 4 camadas DDD; sem leitura cruzada de tabela.
- [ ] Cada fase entrega tela funcional no dashboard.
- [ ] Auth state persiste em PG e reidrata sem novo QR.
- [ ] Proxy: faixa por instância + Webshare sync + IP de saída ao vivo funcionando; `agent` **e** `fetchAgent` setados.
- [ ] Anti-ban enforced (rate-limit, delays, presença, variação).
- [ ] JID↔LID normalizado e persistido (mapping).
- [ ] Webhooks com HMAC SHA-512 + retries; WS em tempo real.
- [ ] Graceful shutdown salva auth state.
- [ ] Deploy Dokploy: WS long-lived OK, backups agendados, healthcheck + zero-downtime.
- [ ] Licença offline valida sem internet.

---

## 22. Variáveis de ambiente (núcleo)

```bash
# App
NODE_ENV=production
PORT=3000
APP_URL / BASE_URL / PUBLIC_URL=https://api.seudominio.com
DEFAULT_ENGINE=baileys
TZ=America/Sao_Paulo

# Auth
API_KEY=...                       # X-Api-Key (texto e/ou SHA-512)
DASHBOARD_USERNAME / DASHBOARD_PASSWORD=...
JWT_SECRET=...

# Persistência
DATABASE_URL=postgresql://...@gateway-postgres:5432/gateway
REDIS_URL=redis://gateway-redis:6379
QUEUE_REDIS_URL=redis://gateway-redis:6379

# Webhooks
WEBHOOK_URL / WEBHOOK_EVENTS / WEBHOOK_HMAC_KEY
WEBHOOK_RETRIES_POLICY=exponential   # constant|linear|exponential
WEBHOOK_RETRIES_MAX=5

# Proxy
PROXY_SERVER / PROXY_USERNAME / PROXY_PASSWORD     # global fallback
PROXY_SERVER_LIST=user:pass@host:port,host2:port   # lista manual fallback
PROXY_INDEX_PREFIX=proxy-                           # nome de sessão proxy-3 → posição 3
WEBSHARE_API_KEY=...
WEBSHARE_SYNC_INTERVAL_MIN=360
PROXY_TEST_ECHO_URL=https://...                     # echo de IP p/ health-test
PROXY_MAX_LATENCY_MS=1500

# Mídia
MEDIA_STORAGE=s3                  # local|s3
S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY / S3_REGION
FILES_LIFETIME=86400

# Baileys
WA_AUTH_STATE=postgres            # postgres|files
WA_SYNC_FULL_HISTORY=false
WA_LOG_LEVEL=info

# Licença
LICENSE_KEY=...                   # JWT/Ed25519 assinado, validado offline
LICENSE_PUBLIC_KEY=...            # embutida no build
```

---

## 23. Pegadinhas / armadilhas reais (prioridade máxima)

1. **JID vs LID** ⭐ — WhatsApp migrou para `@lid` (id opaco) em muitos contextos (grupos). Remetente pode vir `<x>@lid`, **não** o número. Use evento `lid-mapping.update` + utilitários de mapping; persista **LID e PN** (`lid_pn_mappings`). **Nunca** parsear `participant`/`remoteJid` como telefone.
2. **Roteamento por sufixo de JID**: `@s.whatsapp.net` (usuário) · `@lid` (opaco) · `@g.us` (grupo) · `@newsletter` (canal) · `status@broadcast` (status). Switch por sufixo; misturar quebra silenciosamente.
3. **`loggedOut`(401) vs `restartRequired`(515)**: loggedOut = sessão morta, **não** reconectar (limpar creds); restartRequired = esperado pós-pareamento, reconectar. Loop em loggedOut = "QR infinito" + ban.
4. **`downloadMediaMessage`**: mídia vem cifrada/referenciada; usar `{ reuploadRequest: sock.updateMediaMessage }` (mídia antiga expira → re-upload). Download **assíncrono** (fila), nunca bloqueando o handler.
5. **`getMessage` obrigatório** (§8.6) — sem store de enviadas, ocorrem "Waiting for this message" e falhas de poll/receipt.
6. **Votos de enquete** chegam cifrados → descriptografar com `getAggregateVotesInPollMessage`/decode `pollUpdate`; sem isso você vê "houve voto" mas não em qual opção.
7. **`messages.upsert` inclui suas próprias mensagens** (`fromMe:true`) e `append` (sync). Filtrar por `type==='notify'` e `fromMe` conforme intenção, senão reprocessa/reenvia webhook das próprias mensagens.
8. **Idempotência**: gerar `key.id` determinístico por job e checar store antes de reenviar (retry de worker não pode duplicar).
9. **History sync** explode RAM no boot → `syncFullHistory:false`; ligar sob demanda com streaming pro DB.
10. **Cache de `groupMetadata`** (§8.7) — sem `cachedGroupMetadata`, fetch a cada envio (lento e detectável).
11. **Número BR (9º dígito)**: nunca assumir formato. Resolver via `onWhatsApp(jid)`; se `exists=false`, tentar variante com/sem o `9` após o DDD; **persistir o JID resolvido**, nunca o número digitado.
12. **Proxy `fetchAgent`** (§7.1) — esquecê-lo vaza mídia pelo IP real.

---

## Anexo A — Fontes (engine WhatsApp / Baileys)

- Eventos (verbatim `BaileysEventMap`): `WhiskeySockets/Baileys` → `src/Types/Events.ts` — https://github.com/WhiskeySockets/Baileys/blob/master/src/Types/Events.ts
- Funções (envio, grupos, newsletter, proxy `agent`/`fetchAgent`, `useMultiFileAuthState`, `requestPairingCode`, `downloadMediaMessage`): README oficial — https://github.com/WhiskeySockets/Baileys
- Wiki Baileys (`makeWASocket`, auth state): https://baileys.wiki/docs/intro
- whatsapp-web.js (Puppeteer/Chromium, `Buttons`/`List` DEPRECATED, `Poll`, `MessageMedia`, `LocalAuth`/`RemoteAuth`): https://docs.wwebjs.dev/
- Proxy agents: `socks-proxy-agent`, `https-proxy-agent` (npm).

## Anexo B — Fontes (Node.js v26)

- Cluster: https://nodejs.org/docs/latest-v26.x/api/cluster.html
- Worker Threads (`resourceLimits`, `transferList`): https://nodejs.org/docs/latest-v26.x/api/worker_threads.html
- Child Process (`spawn`/`fork`, stdio): https://nodejs.org/docs/latest-v26.x/api/child_process.html
- Process (sinais, `memoryUsage`, `exitCode`): https://nodejs.org/docs/latest-v26.x/api/process.html
- Streams (`pipeline`, backpressure, `signal`): https://nodejs.org/docs/latest-v26.x/api/stream.html
- perf_hooks (`monitorEventLoopDelay`, `eventLoopUtilization`): https://nodejs.org/docs/latest-v26.x/api/perf_hooks.html
- AsyncLocalStorage: https://nodejs.org/docs/latest-v26.x/api/async_context.html
- EventEmitter (`captureRejections`): https://nodejs.org/docs/latest-v26.x/api/events.html
- CLI (`--max-old-space-size`, `--heapsnapshot-near-heap-limit`, `--expose-gc`): https://nodejs.org/docs/latest-v26.x/api/cli.html

## Anexo C — Fontes (Dokploy)

- Build type / going-production / zero-downtime / rollbacks / advanced: https://docs.dokploy.com/docs/core/applications/*
- Domains (HTTPS, Traefik, WebSocket): https://docs.dokploy.com/docs/core/domains
- Databases + Backups: https://docs.dokploy.com/docs/core/databases · /databases/backups
- Volume Backups: https://docs.dokploy.com/docs/core/volume-backups
- Auto-deploy / Watch paths / Variables / Cluster: https://docs.dokploy.com/docs/core/*
- S3 Cloudflare R2: https://docs.dokploy.com/docs/core/(S3-Destinations)/cloudflare-r2

---

### Perguntas de arranque (responder antes da F1)

1. **Engine inicial do MVP:** começar com **Baileys** (recomendado) e deixar whatsapp-web.js para a F8? _(default: sim)_
2. **Escopo do F1–F2:** sessão + QR + pairing + texto + webhook + **proxy por faixa** + persistência, e expandir mídia/grupos/campanhas depois? _(default: sim — proxy já entra cedo, na F3)_
3. **Storage de mídia no MVP:** S3/MinIO desde o início ou volume local primeiro? _(default: volume local na F4, S3 logo após)_
