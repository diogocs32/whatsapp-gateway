<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 646 |

## `contracts/index.ts`

646 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L328

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
- interface `ForwardMessageRequest` L273 · 3 propriedade(s)
- interface `ForwardResultDto` L279 · 13 propriedade(s)
- interface `ForwardMessageResponse` L297 · 1 propriedade(s)
- interface `WebhookDto` L302 · 8 propriedade(s)
- interface `CreateWebhookRequest` L313 · 7 propriedade(s)
- interface `ApiKeyDto` L337 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L346 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L351 · 4 propriedade(s)
- interface `UserDto` L359 · 5 propriedade(s)
- interface `CreateUserRequest` L367 · 4 propriedade(s)
- interface `UpdateUserRequest` L374 · 2 propriedade(s)
- interface `UsersListResponse` L379 · 3 propriedade(s)
- interface `LicenseStatus` L386 · 9 propriedade(s)
- interface `InstallLicenseRequest` L398 · 1 propriedade(s)
- interface `Branding` L403 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L410 · 4 propriedade(s)
- interface `AuditLogDto` L418 · 7 propriedade(s)
- type `ProxyProtocol` L429
- type `ProxySource` L430
- type `ProxyStatus` L431
- type `ProxyMode` L432
- type `ProxyStrategy` L433
- interface `ProxyDto` L436 · 13 propriedade(s)
- interface `CreateProxyRequest` L452 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L461 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L470 · 5 propriedade(s)
- interface `ProxyTestResult` L478 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L485 · 2 propriedade(s)
- interface `BulkImportResult` L491 · 3 propriedade(s)
- interface `WebshareSyncResult` L497 · 4 propriedade(s)
- type `GroupParticipantRole` L505
- type `GroupParticipantAction` L506
- interface `GroupParticipantDto` L508 · 4 propriedade(s)
- interface `GroupDto` L515 · 8 propriedade(s)
- interface `CreateGroupRequest` L526 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L531 · 2 propriedade(s)
- interface `GroupSubjectRequest` L536 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L539 · 1 propriedade(s)
- interface `GroupInviteDto` L542 · 2 propriedade(s)
- interface `ContactCheckDto` L548 · 3 propriedade(s)
- interface `ProfilePictureDto` L553 · 2 propriedade(s)
- interface `BlockRequest` L557 · 2 propriedade(s)
- interface `ContactDirectoryDto` L563 · 11 propriedade(s)
- interface `ChannelDto` L578 · 4 propriedade(s)
- interface `CreateChannelRequest` L584 · 2 propriedade(s)
- type `CampaignStatus` L590
- type `CampaignMessageType` L592
- type `CampaignRecipientStatus` L594
- interface `CampaignDto` L597 · 19 propriedade(s)
- interface `CreateCampaignRequest` L621 · 15 propriedade(s)
- interface `CampaignRecipientDto` L639 · 5 propriedade(s)
