<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — índice

Inventário determinístico gerado pelo compilador do TypeScript (type-checker). Relações de alto nível, fluxos e “onde mexer” por pendência: [MAPA-CODIGO.md](../../MAPA-CODIGO.md).

- Regenerar: `node scripts/mapa-codigo.mjs` · conferir se está em dia: `node scripts/mapa-codigo.mjs --check`
- 280 arquivos · 1513 símbolos (métodos/funções/assinaturas/constantes) · 1518 chamadas resolvidas · 790 testes (it/test)

## Áreas

| Área | Arquivos | Linhas | Mapa |
| --- | --- | --- | --- |
| packages/contracts | 1 | 697 | [contracts.md](contracts.md) |
| Dashboard (React) | 55 | 13780 | [dashboard.md](dashboard.md) |
| Gateway — bootstrap (config, logs, adapter) | 15 | 1685 | [gateway-bootstrap.md](gateway-bootstrap.md) |
| módulo `campaigns` | 6 | 993 | [gateway-campaigns.md](gateway-campaigns.md) |
| módulo `channels` | 2 | 87 | [gateway-channels.md](gateway-channels.md) |
| módulo `contacts` | 2 | 194 | [gateway-contacts.md](gateway-contacts.md) |
| Gateway — testes e2e (apps/gateway/test) | 28 | 7513 | [gateway-e2e.md](gateway-e2e.md) |
| módulo `events` | 3 | 92 | [gateway-events.md](gateway-events.md) |
| módulo `groups` | 2 | 268 | [gateway-groups.md](gateway-groups.md) |
| módulo `guardrail` | 5 | 1494 | [gateway-guardrail.md](gateway-guardrail.md) |
| módulo `health` | 3 | 127 | [gateway-health.md](gateway-health.md) |
| módulo `iam` | 40 | 2457 | [gateway-iam.md](gateway-iam.md) |
| Gateway — infra (prisma, redis, storage, directory) | 10 | 684 | [gateway-infra.md](gateway-infra.md) |
| módulo `messaging` | 25 | 4216 | [gateway-messaging.md](gateway-messaging.md) |
| módulo `observability` | 7 | 625 | [gateway-observability.md](gateway-observability.md) |
| módulo `proxies` | 12 | 1277 | [gateway-proxies.md](gateway-proxies.md) |
| Gateway — raiz (main.ts, app.module.ts) | 2 | 153 | [gateway-raiz.md](gateway-raiz.md) |
| módulo `sessions` | 38 | 14232 | [gateway-sessions.md](gateway-sessions.md) |
| Gateway — shared-kernel | 16 | 1287 | [gateway-shared-kernel.md](gateway-shared-kernel.md) |
| módulo `webhooks` | 8 | 693 | [gateway-webhooks.md](gateway-webhooks.md) |

## Rotas HTTP (gateway)

| Verbo | Rota | Handler | Decorators (guards/roles/etc.) |
| --- | --- | --- | --- |
| GET | `/api/api-keys` | `ApiKeysController.list` (api-keys.controller.ts:37) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/api-keys` | `ApiKeysController.create` (api-keys.controller.ts:26) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| DELETE | `/api/api-keys/:id` | `ApiKeysController.revoke` (api-keys.controller.ts:50) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/audit` | `AuditController.list` (audit.controller.ts:15) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/auth/login` | `AuthController.signIn` (auth.controller.ts:50) | `@RouteConfig({ rateLimit: LOGIN_RATE_LIMIT })` |
| POST | `/api/auth/logout` | `AuthController.logout` (auth.controller.ts:96) |  |
| GET | `/api/auth/me` | `AuthController.me` (auth.controller.ts:107) | `@UseGuards(JwtAuthGuard)` |
| POST | `/api/auth/refresh` | `AuthController.refresh` (auth.controller.ts:75) |  |
| GET | `/api/branding` | `BrandingController.get` (branding.controller.ts:29) |  |
| PUT | `/api/branding` | `BrandingController.update` (branding.controller.ts:35) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| GET | `/api/campaigns` | `CampaignsController.list` (campaigns.controller.ts:100) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/campaigns` | `CampaignsController.create` (campaigns.controller.ts:105) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| DELETE | `/api/campaigns/:id` | `CampaignsController.remove` (campaigns.controller.ts:178) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/campaigns/:id` | `CampaignsController.get` (campaigns.controller.ts:140) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/campaigns/:id/cancel` | `CampaignsController.cancel` (campaigns.controller.ts:173) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/campaigns/:id/pause` | `CampaignsController.pause` (campaigns.controller.ts:163) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/campaigns/:id/recipients` | `CampaignsController.recipients` (campaigns.controller.ts:145) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/campaigns/:id/resume` | `CampaignsController.resume` (campaigns.controller.ts:168) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/campaigns/:id/start` | `CampaignsController.start` (campaigns.controller.ts:158) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET(SSE) | `/api/events/stream` | `EventsController.stream` (events.controller.ts:14) | `@UseGuards(SseAuthGuard)` |
| GET | `/api/guardrail/:sessionId` | `GuardrailController.evaluate` (guardrail.controller.ts:51) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/guardrail/config` | `GuardrailController.config` (guardrail.controller.ts:32) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| PATCH | `/api/guardrail/config` | `GuardrailController.updateConfig` (guardrail.controller.ts:37) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/health` | `HealthController.check` (health.controller.ts:10) |  |
| GET | `/api/inbox/conversations` | `InboxController.conversations` (inbox.controller.ts:111) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/inbox/messages` | `InboxController.messages` (inbox.controller.ts:148) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/inbox/sessions/:id/triage` | `InboxController.triage` (inbox.controller.ts:162) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| DELETE | `/api/license` | `LicenseController.remove` (license.controller.ts:52) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| GET | `/api/license` | `LicenseController.status` (license.controller.ts:40) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| POST | `/api/license` | `LicenseController.install` (license.controller.ts:45) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| GET | `/api/metrics` | `MetricsController.scrape` (metrics.controller.ts:22) |  |
| GET | `/api/observability/reply-rate/:sessionId` | `ObservabilityController.replyRateMetrics` (observability.controller.ts:33) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/observability/summary` | `ObservabilityController.summary` (observability.controller.ts:17) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/observability/timeline/:sessionId` | `ObservabilityController.timeline` (observability.controller.ts:22) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/proxies` | `ProxiesController.list` (proxies.controller.ts:59) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/proxies` | `ProxiesController.create` (proxies.controller.ts:76) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| DELETE | `/api/proxies/:id` | `ProxiesController.remove` (proxies.controller.ts:138) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/proxies/:id/disable` | `ProxiesController.disable` (proxies.controller.ts:132) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/proxies/:id/enable` | `ProxiesController.enable` (proxies.controller.ts:126) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/proxies/:id/test` | `ProxiesController.test` (proxies.controller.ts:117) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/proxies/available` | `ProxiesController.listAvailable` (proxies.controller.ts:66) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/proxies/bulk` | `ProxiesController.bulk` (proxies.controller.ts:96) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/proxies/test-all` | `ProxiesController.testAll` (proxies.controller.ts:107) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/proxies/webshare/status` | `ProxiesController.webshareStatus` (proxies.controller.ts:71) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/proxies/webshare/sync` | `ProxiesController.syncWebshare` (proxies.controller.ts:112) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/sessions` | `SessionsController.list` (sessions.controller.ts:155) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions` | `SessionsController.create` (sessions.controller.ts:98) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| DELETE | `/api/sessions/:id` | `SessionsController.remove` (sessions.controller.ts:350) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/sessions/:id` | `SessionsController.get` (sessions.controller.ts:175) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/activate` | `SessionsController.activate` (sessions.controller.ts:307) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/channels` | `ChannelsController.create` (channels.controller.ts:29) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/channels/:jid` | `ChannelsController.info` (channels.controller.ts:42) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/channels/:jid/follow` | `ChannelsController.follow` (channels.controller.ts:47) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/channels/:jid/unfollow` | `ChannelsController.unfollow` (channels.controller.ts:56) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/config` | `SessionsController.getConfig` (sessions.controller.ts:190) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| PATCH | `/api/sessions/:id/config` | `SessionsController.patchConfig` (sessions.controller.ts:197) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/contacts/:jid/profile-picture` | `ContactsController.profilePicture` (contacts.controller.ts:106) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/contacts/block` | `ContactsController.block` (contacts.controller.ts:121) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/contacts/check` | `ContactsController.check` (contacts.controller.ts:89) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/contacts/directory` | `ContactsController.listDirectory` (contacts.controller.ts:58) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/contacts/remove` | `ContactsController.remove` (contacts.controller.ts:164) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/contacts/save` | `ContactsController.save` (contacts.controller.ts:140) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/groups` | `GroupsController.list` (groups.controller.ts:53) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups` | `GroupsController.create` (groups.controller.ts:58) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/groups/:groupId` | `GroupsController.info` (groups.controller.ts:66) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/description` | `GroupsController.description` (groups.controller.ts:133) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/groups/:groupId/invite` | `GroupsController.invite` (groups.controller.ts:146) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/invite/revoke` | `GroupsController.revoke` (groups.controller.ts:157) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/groups/:groupId/leads` | `GroupsController.leads` (groups.controller.ts:76) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/leave` | `GroupsController.leave` (groups.controller.ts:113) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/groups/:groupId/membership-requests` | `GroupsController.membershipRequests` (groups.controller.ts:169) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/membership-requests` | `GroupsController.membership` (groups.controller.ts:178) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/participants` | `GroupsController.participants` (groups.controller.ts:100) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/photo` | `GroupsController.photo` (groups.controller.ts:213) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/settings` | `GroupsController.settings` (groups.controller.ts:192) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/groups/:groupId/subject` | `GroupsController.subject` (groups.controller.ts:122) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/health` | `SessionsController.health` (sessions.controller.ts:181) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/logout` | `SessionsController.logout` (sessions.controller.ts:343) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/messages` | `MessagesController.list` (messages.controller.ts:276) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/:chatId/flag` | `MessagesController.chatFlag` (messages.controller.ts:410) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/:msgId/forward` | `MessagesController.forward` (messages.controller.ts:529) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/messages/:msgId/media` | `MessagesController.downloadMedia` (messages.controller.ts:442) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/:msgId/reaction` | `MessagesController.reaction` (messages.controller.ts:496) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/:msgId/read` | `MessagesController.markRead` (messages.controller.ts:484) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/messages/conversations` | `MessagesController.conversations` (messages.controller.ts:266) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/location` | `MessagesController.sendLocation` (messages.controller.ts:787) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/media` | `MessagesController.sendMedia` (messages.controller.ts:645) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/media-url` | `MessagesController.sendMediaUrl` (messages.controller.ts:715) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/poll` | `MessagesController.sendPoll` (messages.controller.ts:826) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/messages/search` | `MessagesController.search` (messages.controller.ts:359) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/sync` | `MessagesController.sync` (messages.controller.ts:381) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/messages/text` | `MessagesController.sendText` (messages.controller.ts:616) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/new-qr` | `SessionsController.newQr` (sessions.controller.ts:374) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/pairing-code` | `SessionsController.pairingCode` (sessions.controller.ts:381) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/pause` | `SessionsController.pause` (sessions.controller.ts:312) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/presence` | `SessionsController.presence` (sessions.controller.ts:214) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/profile/name` | `SessionsController.profileName` (sessions.controller.ts:249) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/profile/photo` | `SessionsController.profilePhoto` (sessions.controller.ts:269) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/profile/status` | `SessionsController.profileStatus` (sessions.controller.ts:230) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/sessions/:id/proxy` | `ProxiesController.getAssignment` (proxies.controller.ts:145) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| PUT | `/api/sessions/:id/proxy` | `ProxiesController.setAssignment` (proxies.controller.ts:160) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/sessions/:id/qr` | `SessionsController.qr` (sessions.controller.ts:358) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/quarantine` | `SessionsController.quarantine` (sessions.controller.ts:297) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/restart` | `SessionsController.restart` (sessions.controller.ts:336) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/start` | `SessionsController.start` (sessions.controller.ts:322) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/stop` | `SessionsController.stop` (sessions.controller.ts:329) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| POST | `/api/sessions/:id/warmup` | `SessionsController.warmup` (sessions.controller.ts:302) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` |
| GET | `/api/users` | `UsersController.list` (users.controller.ts:79) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| POST | `/api/users` | `UsersController.create` (users.controller.ts:92) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| DELETE | `/api/users/:id` | `UsersController.remove` (users.controller.ts:108) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| PATCH | `/api/users/:id` | `UsersController.update` (users.controller.ts:97) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| POST | `/api/users/:id/password` | `UsersController.resetPassword` (users.controller.ts:102) | `@UseGuards(JwtAuthGuard, RolesGuard)` `@MinRole('OWNER')` |
| GET | `/api/webhooks` | `WebhooksController.list` (webhooks.controller.ts:55) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/webhooks` | `WebhooksController.create` (webhooks.controller.ts:60) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| DELETE | `/api/webhooks/:id` | `WebhooksController.remove` (webhooks.controller.ts:125) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/webhooks/:id/disable` | `WebhooksController.disable` (webhooks.controller.ts:117) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/webhooks/:id/enable` | `WebhooksController.enable` (webhooks.controller.ts:109) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/webhooks/:id/test` | `WebhooksController.test` (webhooks.controller.ts:133) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| GET | `/api/webhooks/dead-letters` | `WebhooksController.deadLetters` (webhooks.controller.ts:98) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |
| POST | `/api/webhooks/dead-letters/redeliver` | `WebhooksController.redeliver` (webhooks.controller.ts:104) | `@UseGuards(ApiKeyAuthGuard, RolesGuard)` `@MinRole('ADMIN')` |

## Filas BullMQ

| Tipo | Fila / chamada | Onde | jobId |
| --- | --- | --- | --- |
| add | `this.queue.add('send')` | `CampaignQueue.enqueueSend` (campaign-queue.ts:121) | `parâmetro jobId (montado pelos chamadores — ver tabela abaixo)` |
| Queue | `campaigns` | `CampaignQueue.onModuleInit` (campaign-queue.ts:87) |  |
| Worker | `campaigns` | `CampaignQueue.onModuleInit` (campaign-queue.ts:90) |  |
| add | `this.queue.add('send')` | `CampaignQueue.requeue` (campaign-queue.ts:134) | — |
| add | `this.queue.add('deliver')` | `WebhookQueue.enqueue` (webhook-queue.ts:140) | `parâmetro jobId (montado pelos chamadores — ver tabela abaixo)` |
| Queue | `webhooks` | `WebhookQueue.onModuleInit` (webhook-queue.ts:81) |  |
| Worker | `webhooks` | `WebhookQueue.onModuleInit` (webhook-queue.ts:94) |  |

### jobId montado nos chamadores (regra do projeto: jobId do BullMQ NUNCA contém `:`)

| Chamador | Chama | Expressão do jobId |
| --- | --- | --- |
| `CampaignService.schedulePending` (campaign.service.ts:71) | `CampaignQueue.enqueueSend` | ``${jobPrefix}-${r.id}`` |
| `WebhookDispatcher.handle` (webhook-dispatcher.service.ts:66) | `WebhookQueue.enqueue` | ``${env.id}-${w.id}`` |
| `WebhookQueue.redeliverDeadLetters` (webhook-queue.ts:249) | `WebhookQueue.enqueue` | ``dlq-redeliver-${it.id}`` |
| `WebhooksController.test` (webhooks.controller.ts:145) | `WebhookQueue.enqueue` | `(omitido)` |

## Eventos do EventBus

| Evento (`name`) | Publicado por | Assinado por |
| --- | --- | --- |
| `'wa.event'` | `GuardrailService.emit` (guardrail.service.ts:208), `SessionManager.handleEngineEvent` (session-manager.service.ts:262) | `EventFanout.onModuleInit` (event-fanout.ts:60), `EventsController.stream` (events.controller.ts:36), `MessagePersister.onModuleInit` (message-persister.service.ts:25), `ReactionPersister.onModuleInit` (reaction-persister.service.ts:28), `SessionEventLogger.onModuleInit` (session-event.logger.ts:23), `WebhookDispatcher.onModuleInit` (webhook-dispatcher.service.ts:35) |
| `'wa.event.remote'` | `EventFanout.onRemote` (event-fanout.ts:80) | `EventsController.stream` (events.controller.ts:39), `WebhookDispatcher.onModuleInit` (webhook-dispatcher.service.ts:38) |

## Banco (Prisma) — quem lê e quem escreve

| Modelo / tabela | Escrita | Leitura |
| --- | --- | --- |
| `campaign` | `CampaignRepository.create`, `CampaignRepository.delete`, `CampaignRepository.refreshCounts`, `CampaignRepository.transitionToRunning`, `CampaignRepository.updateStatus` | `CampaignRepository.findById`, `CampaignRepository.list`, `CampaignRepository.refreshCounts`, `CampaignRepository.sessionTimezone` |
| `campaignRecipient` | `CampaignRepository.cancelPending`, `CampaignRepository.markRecipientFailed`, `CampaignRepository.markRecipientSent`, `CampaignRepository.releaseRecipient`, `CampaignRepository.reserveRecipient` | `CampaignRepository.findRecipient`, `CampaignRepository.listPendingRecipients`, `CampaignRepository.listRecipients`, `CampaignRepository.refreshCounts`, `CampaignRepository.reserveRecipient` |
| `conversationTriage` | `PrismaInboxRepository.clearTriage`, `PrismaInboxRepository.markIgnored` | — |
| `guardrailConfig` | `GuardrailService.updateConfig` | `GuardrailService.cfg`, `ReplyRateService.nmin` |
| `messageReaction` | `BaileysEngine.mergeLidMessages`, `RetentionService.sweep`, `WWebJSEngine.mergeLidMessages` | `PrismaReactionRepository.listForMessages` |
| `proxy` | `PrismaProxyRepository.create`, `PrismaProxyRepository.delete`, `PrismaProxyRepository.setEnabled`, `PrismaProxyRepository.updateConnection`, `PrismaProxyRepository.updateTest` | `PrismaProxyRepository.findById`, `PrismaProxyRepository.findByWebshareId`, `PrismaProxyRepository.listEnabledAlive`, `PrismaProxyRepository.listInRange`, `PrismaProxyRepository.list`, `PrismaProxyRepository.nextPosition` |
| `refreshToken` | `PrismaRefreshTokenRepository.create`, `PrismaRefreshTokenRepository.revokeAllForUser`, `PrismaRefreshTokenRepository.revokeFamilyByToken`, `PrismaRefreshTokenRepository.rotate` | `PrismaRefreshTokenRepository.revokeFamilyByToken`, `PrismaRefreshTokenRepository.rotate` |
| `sendIntent` | `RetentionService.sweep`, `SendIntentService.complete`, `SendIntentService.fail`, `SendIntentService.reserve` | `SendIntentService.reserve` |
| `sessionConfig` | `SessionConfigService.get`, `SessionConfigService.update` | `SessionManager.getOrCreateEngine` |
| `sessionGuardrail` | `GuardrailService.apply`, `GuardrailService.getState`, `GuardrailService.recordHardSignal`, `GuardrailService.recordReachoutRestriction` | `GuardrailService.apply`, `GuardrailService.canSendMessage`, `GuardrailService.statesFor` |
| `sessionMetric` | `ReplyRateService.computeFor` | `GuardrailService.fleetMedianReplyRate` |
| `sessionProxyAssignment` | `PrismaProxyRepository.setAssignment`, `PrismaProxyRepository.setCurrent` | `PrismaProxyRepository.getAssignment`, `PrismaProxyRepository.usedProxyIds` |
| `user` | `PrismaUserRepository.create`, `PrismaUserRepository.delete`, `PrismaUserRepository.updatePassword`, `PrismaUserRepository.update` | `PrismaUserRepository.countByRole`, `PrismaUserRepository.count`, `PrismaUserRepository.findById`, `PrismaUserRepository.findByUsername`, `PrismaUserRepository.list` |
| `waApiKey` | `PrismaApiKeyRepository.create`, `PrismaApiKeyRepository.revoke`, `PrismaApiKeyRepository.touch` | `PrismaApiKeyRepository.findByHash`, `PrismaApiKeyRepository.list` |
| `waAuditLog` | `PrismaAuditRepository.create`, `RetentionService.sweep` | `PrismaAuditRepository.list` |
| `waAuthKey` | `BaileysEngine.clearCredentials`, `SessionManager.logout`, `SessionManager.newQr`, `usePostgresAuthState` | `usePostgresAuthState` |
| `waBranding` | `PrismaBrandingRepository.set` | `PrismaBrandingRepository.get` |
| `waContact` | `ContactDirectory.record` | `ContactDirectory.lidMap`, `ContactDirectory.list`, `ContactDirectory.namesFor` |
| `waLicense` | `PrismaLicenseRepository.clear`, `PrismaLicenseRepository.set` | `PrismaLicenseRepository.get` |
| `waMessage` | `BaileysEngine.markMessage`, `BaileysEngine.mergeLidMessages`, `PrismaMessageRepository.saveHistorical`, `PrismaMessageRepository.save`, `RetentionService.sweep`, `WWebJSEngine.mergeLidMessages` | `BaileysEngine.loadMessageForRetry`, `BaileysEngine.mergeKnownLids`, `BaileysEngine.onMessagesUpsert`, `BaileysEngine.prepareForward`, `MetricsService.counters`, `PrismaInboxRepository.findLastInbound`, `PrismaMessageRepository.findByIdempotencyKey`, `PrismaMessageRepository.findByKeyId`, `PrismaMessageRepository.findByRef`, `PrismaMessageRepository.findInboundChat`, `PrismaMessageRepository.listByChat`, `PrismaMessageRepository.saveHistorical`, `PrismaMessageRepository.searchMessages`, `WWebJSEngine.mergeExistingLids` |
| `waSession` | `BaileysEngine.clearCredentials`, `PrismaSessionRepository.create`, `PrismaSessionRepository.delete`, `PrismaSessionRepository.updateStatus`, `SessionManager.logout`, `SessionManager.newQr`, `removeSession`, `seedSession`, `usePostgresAuthState` | `GuardrailService.emit`, `GuardrailService.setManualState`, `MetricsService.counters`, `PrismaProxyRepository.usedProxyIds`, `PrismaSessionRepository.findAutostart`, `PrismaSessionRepository.findById`, `PrismaSessionRepository.findByName`, `PrismaSessionRepository.list`, `ReplyRateService.resolveSessionId`, `usePostgresAuthState` |
| `waSessionEvent` | `RetentionService.sweep`, `SessionEventLogger.onModuleInit` | `MetricsService.timeline` |
| `webhook` | `PrismaWebhookRepository.create`, `PrismaWebhookRepository.delete`, `PrismaWebhookRepository.setEnabled` | `PrismaWebhookRepository.findById`, `PrismaWebhookRepository.listEnabled`, `PrismaWebhookRepository.list`, `WebhookQueue.redeliverDeadLetters` |
| `webhookDeadLetter` | `WebhookQueue.redeliverDeadLetters`, `WebhookQueue.toDeadLetter` | `WebhookQueue.listDeadLetters`, `WebhookQueue.redeliverDeadLetters` |

## Variáveis de ambiente — onde são lidas

| Variável | Lida em |
| --- | --- |
| `API_KEY` | `base` (config.ts) |
| `CORS_ORIGIN` | `base` (config.ts) |
| `DASHBOARD_PASSWORD` | `base` (config.ts) |
| `DASHBOARD_USERNAME` | `base` (config.ts) |
| `DATABASE_URL` | `base` (config.ts) |
| `DB_HOST` | `base` (config.ts) |
| `DB_NAME` | `base` (config.ts) |
| `DB_PASSWORD` | `base` (config.ts) |
| `DB_POOL_CONNECT_TIMEOUT_MS` | `base` (config.ts) |
| `DB_POOL_IDLE_TIMEOUT_MS` | `base` (config.ts) |
| `DB_POOL_MAX` | `base` (config.ts) |
| `DB_PORT` | `base` (config.ts) |
| `DB_SSL` | `base` (config.ts) |
| `DB_SSL_CA` | `base` (config.ts) |
| `DB_SSL_REJECT_UNAUTHORIZED` | `base` (config.ts) |
| `DB_USER` | `base` (config.ts) |
| `EGRESS_ALLOW_HOSTS` | `base` (config.ts) |
| `EGRESS_ALLOW_PRIVATE` | `base` (config.ts) |
| `EVENT_FANOUT` | `EventFanout.onModuleInit` (event-fanout.ts) |
| `GUARDRAIL_COOLDOWN_HOURS` | `base` (config.ts) |
| `GUARDRAIL_ENFORCE` | `base` (config.ts) |
| `GUARDRAIL_NMIN` | `base` (config.ts) |
| `GUARDRAIL_QUARANTINE_MULT` | `base` (config.ts) |
| `GUARDRAIL_TARGET_REPLY_RATE` | `base` (config.ts) |
| `GUARDRAIL_THROTTLE_MULT` | `base` (config.ts) |
| `JWT_ACCESS_TTL` | `base` (config.ts) |
| `JWT_EXPIRES_IN` | `base` (config.ts) |
| `JWT_REFRESH_TTL` | `base` (config.ts) |
| `JWT_SECRET` | `base` (config.ts) |
| `LICENSE_KEY` | `base` (config.ts) |
| `MAX_SEATS` | `base` (config.ts) |
| `MAX_SESSIONS` | `base` (config.ts) |
| `MEDIA_MAX_BYTES` | `base` (config.ts) |
| `MEDIA_URL_TTL` | `base` (config.ts) |
| `METRICS_TOKEN` | `MetricsController.scrape` (metrics.controller.ts) |
| `NODE_ENV` | `base` (config.ts), `EventFanout.onModuleInit` (event-fanout.ts), `AuthController.setAuthCookies` (auth.controller.ts), `RetentionService.onApplicationBootstrap` (retention.service.ts), `ProxyService.onApplicationBootstrap` (proxy.service.ts) |
| `PASSWORD_SCRYPT_LOG2N` | `base` (config.ts), `currentScryptCost` (crypto.ts) |
| `PORT` | `base` (config.ts) |
| `PROXY_RETEST_INTERVAL_MIN` | `ProxyService.onApplicationBootstrap` (proxy.service.ts) |
| `PROXY_TEST_ECHO_URL` | `base` (config.ts) |
| `REDIS_DB` | `base` (config.ts) |
| `REDIS_HOST` | `base` (config.ts) |
| `REDIS_PASSWORD` | `base` (config.ts) |
| `REDIS_PORT` | `base` (config.ts) |
| `REDIS_TLS` | `base` (config.ts) |
| `REDIS_URL` | `base` (config.ts) |
| `REDIS_USERNAME` | `base` (config.ts) |
| `RETENTION_SWEEP_HOURS` | `RetentionService.onApplicationBootstrap` (retention.service.ts) |
| `S3_ACCESS_KEY` | `base` (config.ts) |
| `S3_BUCKET` | `base` (config.ts) |
| `S3_ENDPOINT` | `base` (config.ts) |
| `S3_FORCE_PATH_STYLE` | `base` (config.ts) |
| `S3_REGION` | `base` (config.ts) |
| `S3_SECRET_KEY` | `base` (config.ts) |
| `VITE_API_URL` | `BASE` (api.ts) |
| `WA_LOG_LEVEL` | `base` (config.ts) |
| `WA_REQUIRE_PROXY` | `base` (config.ts) |
| `WEBHOOK_CONCURRENCY` | `base` (config.ts) |
| `WEBSHARE_API_KEY` | `base` (config.ts) |
| `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA` | `base` (config.ts), `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA` (wwebjs.engine.ts) |
| `WWEBJS_CHROME_PATH` | `base` (config.ts) |
| `WWEBJS_DATA_PATH` | `base` (config.ts) |
| `WWEBJS_INIT_TIMEOUT_MS` | `base` (config.ts), `INIT_TIMEOUT_MS` (wwebjs.engine.ts) |
| `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` | `WWEBJS_MEDIA_DOWNLOAD_MAX_BYTES` (wwebjs.engine.ts) |
| `WWEBJS_USER_AGENT` | `base` (config.ts), `userAgentFor` (wwebjs.engine.ts) |
| `WWEBJS_WEB_VERSION` | `base` (config.ts) |
| `npm_package_version` | `HealthService.check` (health.service.ts) |

## Dashboard → gateway (caminhos literais chamados pelo painel)

| Chamada | Componente/função |
| --- | --- |
| `request /api/api-keys` | `api` (api.ts:176) |
| `request /api/api-keys` | `api` (api.ts:176) |
| `request /api/api-keys/${id}` | `api` (api.ts:176) |
| `request /api/audit?limit=${limit}&offset=${offset}` | `api` (api.ts:176) |
| `request /api/auth/login` | `api` (api.ts:176) |
| `request /api/auth/logout` | `api` (api.ts:176) |
| `request /api/auth/me` | `api` (api.ts:176) |
| `request /api/branding` | `api` (api.ts:176) |
| `request /api/branding` | `api` (api.ts:176) |
| `request /api/campaigns` | `api` (api.ts:176) |
| `request /api/campaigns/${id}` | `api` (api.ts:176) |
| `request /api/campaigns/${id}/cancel` | `api` (api.ts:176) |
| `request /api/campaigns/${id}/pause` | `api` (api.ts:176) |
| `request /api/campaigns/${id}/resume` | `api` (api.ts:176) |
| `request /api/campaigns/${id}/start` | `api` (api.ts:176) |
| `request /api/campaigns${sessionId ? `?sessionId=${sessionId}` : ''}` | `api` (api.ts:176) |
| `request /api/inbox/conversations${qs ? `?${qs}` : ''}` | `api` (api.ts:176) |
| `request /api/inbox/messages${qs ? `?${qs}` : ''}` | `api` (api.ts:176) |
| `request /api/inbox/sessions/${encodeURIComponent(sessionId)}/triage` | `api` (api.ts:176) |
| `request /api/license` | `api` (api.ts:176) |
| `request /api/license` | `api` (api.ts:176) |
| `request /api/license` | `api` (api.ts:176) |
| `request /api/observability/summary` | `api` (api.ts:176) |
| `request /api/observability/timeline/${sessionId}?limit=${limit}` | `api` (api.ts:176) |
| `request /api/proxies` | `api` (api.ts:176) |
| `request /api/proxies` | `api` (api.ts:176) |
| `request /api/proxies/${id}` | `api` (api.ts:176) |
| `request /api/proxies/${id}/disable` | `api` (api.ts:176) |
| `request /api/proxies/${id}/enable` | `api` (api.ts:176) |
| `request /api/proxies/${id}/test` | `api` (api.ts:176) |
| `request /api/proxies/available` | `api` (api.ts:176) |
| `request /api/proxies/bulk` | `api` (api.ts:176) |
| `request /api/proxies/test-all` | `api` (api.ts:176) |
| `request /api/proxies/webshare/status` | `api` (api.ts:176) |
| `request /api/proxies/webshare/sync` | `api` (api.ts:176) |
| `request /api/sessions` | `api` (api.ts:176) |
| `request /api/sessions` | `api` (api.ts:176) |
| `request /api/sessions/${encodeURIComponent(id)}/messages/${encodeURIComponent…` | `api` (api.ts:176) |
| `request /api/sessions/${id}` | `api` (api.ts:176) |
| `request /api/sessions/${id}` | `api` (api.ts:176) |
| `request /api/sessions/${id}/logout` | `api` (api.ts:176) |
| `request /api/sessions/${id}/messages?chatId=${encodeURIComponent(chatId)}&lim…` | `api` (api.ts:176) |
| `request /api/sessions/${id}/messages/conversations?limit=${limit}` | `api` (api.ts:176) |
| `requestForm /api/sessions/${id}/messages/media` | `api` (api.ts:176) |
| `request /api/sessions/${id}/messages/text` | `api` (api.ts:176) |
| `request /api/sessions/${id}/new-qr` | `api` (api.ts:176) |
| `request /api/sessions/${id}/pairing-code` | `api` (api.ts:176) |
| `request /api/sessions/${id}/qr` | `api` (api.ts:176) |
| `request /api/sessions/${id}/restart` | `api` (api.ts:176) |
| `request /api/sessions/${id}/start` | `api` (api.ts:176) |
| `request /api/sessions/${id}/stop` | `api` (api.ts:176) |
| `request /api/sessions/${sessionId}/proxy` | `api` (api.ts:176) |
| `request /api/sessions/${sessionId}/proxy` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/channels` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/follow` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/channels/${encodeURIComponent(jid)}/unfollow` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/contacts/${encodeURIComponent(jid)}/profile-pict…` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/contacts/block` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/contacts/check` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/contacts/directory?limit=${limit}&offset=${offse…` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/description` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/invite/revoke` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/leave` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/participants` | `api` (api.ts:176) |
| `request /api/sessions/${sid}/groups/${encodeURIComponent(jid)}/subject` | `api` (api.ts:176) |
| `request /api/users` | `api` (api.ts:176) |
| `request /api/users` | `api` (api.ts:176) |
| `request /api/users/${id}` | `api` (api.ts:176) |
| `request /api/users/${id}` | `api` (api.ts:176) |
| `request /api/users/${id}/password` | `api` (api.ts:176) |
| `request /api/webhooks` | `api` (api.ts:176) |
| `request /api/webhooks` | `api` (api.ts:176) |
| `request /api/webhooks/${id}` | `api` (api.ts:176) |
| `request /api/webhooks/${id}/disable` | `api` (api.ts:176) |
| `request /api/webhooks/${id}/enable` | `api` (api.ts:176) |
| `request /api/webhooks/${id}/test` | `api` (api.ts:176) |
| `request /health` | `api` (api.ts:176) |
