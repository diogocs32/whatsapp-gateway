<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 611 |

## `contracts/index.ts`

611 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L293

**Tipos**
- type `Role` L4
- interface `AuthUser` L6 · 4 propriedade(s)
- interface `LoginResponse` L13 · 2 propriedade(s)
- type `HealthStatus` L18
- interface `HealthResponse` L20 · 5 propriedade(s)
- interface `ObservabilitySummary` L35 · 9 propriedade(s)
- interface `TimelineEvent` L47 · 5 propriedade(s)
- interface `EventEnvelope` L56 · 6 propriedade(s)
- type `Engine` L66
- type `SessionStatus` L68
- type `ConnectionMode` L77
- interface `SessionDto` L79 · 11 propriedade(s)
- interface `CreateSessionRequest` L93 · 6 propriedade(s)
- interface `QrResponse` L104 · 3 propriedade(s)
- interface `PairingCodeResponse` L112 · 1 propriedade(s)
- interface `MessageReactionDto` L124 · 4 propriedade(s)
- interface `MessageDto` L131 · 21 propriedade(s)
- interface `ConversationDto` L170 · 7 propriedade(s)
- type `InboxTriageStatus` L187
- interface `InboxConversationDto` L189 · 16 propriedade(s)
- interface `InboxCounts` L208 · 4 propriedade(s)
- interface `InboxConversationsResponse` L215 · 2 propriedade(s)
- interface `InboxFeedItemDto` L221 · 14 propriedade(s)
- interface `InboxTriageRequest` L244 · 3 propriedade(s)
- interface `InboxTriageResponse` L250 · 3 propriedade(s)
- interface `SendTextRequest` L256 · 2 propriedade(s)
- interface `SendTextResponse` L261 · 2 propriedade(s)
- interface `WebhookDto` L267 · 8 propriedade(s)
- interface `CreateWebhookRequest` L278 · 7 propriedade(s)
- interface `ApiKeyDto` L302 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L311 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L316 · 4 propriedade(s)
- interface `UserDto` L324 · 5 propriedade(s)
- interface `CreateUserRequest` L332 · 4 propriedade(s)
- interface `UpdateUserRequest` L339 · 2 propriedade(s)
- interface `UsersListResponse` L344 · 3 propriedade(s)
- interface `LicenseStatus` L351 · 9 propriedade(s)
- interface `InstallLicenseRequest` L363 · 1 propriedade(s)
- interface `Branding` L368 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L375 · 4 propriedade(s)
- interface `AuditLogDto` L383 · 7 propriedade(s)
- type `ProxyProtocol` L394
- type `ProxySource` L395
- type `ProxyStatus` L396
- type `ProxyMode` L397
- type `ProxyStrategy` L398
- interface `ProxyDto` L401 · 13 propriedade(s)
- interface `CreateProxyRequest` L417 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L426 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L435 · 5 propriedade(s)
- interface `ProxyTestResult` L443 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L450 · 2 propriedade(s)
- interface `BulkImportResult` L456 · 3 propriedade(s)
- interface `WebshareSyncResult` L462 · 4 propriedade(s)
- type `GroupParticipantRole` L470
- type `GroupParticipantAction` L471
- interface `GroupParticipantDto` L473 · 4 propriedade(s)
- interface `GroupDto` L480 · 8 propriedade(s)
- interface `CreateGroupRequest` L491 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L496 · 2 propriedade(s)
- interface `GroupSubjectRequest` L501 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L504 · 1 propriedade(s)
- interface `GroupInviteDto` L507 · 2 propriedade(s)
- interface `ContactCheckDto` L513 · 3 propriedade(s)
- interface `ProfilePictureDto` L518 · 2 propriedade(s)
- interface `BlockRequest` L522 · 2 propriedade(s)
- interface `ContactDirectoryDto` L528 · 11 propriedade(s)
- interface `ChannelDto` L543 · 4 propriedade(s)
- interface `CreateChannelRequest` L549 · 2 propriedade(s)
- type `CampaignStatus` L555
- type `CampaignMessageType` L557
- type `CampaignRecipientStatus` L559
- interface `CampaignDto` L562 · 19 propriedade(s)
- interface `CreateCampaignRequest` L586 · 15 propriedade(s)
- interface `CampaignRecipientDto` L604 · 5 propriedade(s)
