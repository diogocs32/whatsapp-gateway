<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 696 |

## `contracts/index.ts`

696 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L377

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
- interface `SessionConfigDto` L95 · 11 propriedade(s)
- interface `UpdateSessionConfigRequest` L109 · 9 propriedade(s)
- interface `CreateSessionRequest` L121 · 6 propriedade(s)
- interface `QrResponse` L132 · 3 propriedade(s)
- interface `PairingCodeResponse` L140 · 1 propriedade(s)
- interface `MessageReactionDto` L152 · 4 propriedade(s)
- interface `MessageDto` L159 · 21 propriedade(s)
- interface `ConversationDto` L198 · 7 propriedade(s)
- type `InboxTriageStatus` L215
- interface `InboxConversationDto` L217 · 16 propriedade(s)
- interface `InboxCounts` L236 · 4 propriedade(s)
- interface `InboxConversationsResponse` L243 · 2 propriedade(s)
- interface `InboxFeedItemDto` L249 · 14 propriedade(s)
- interface `InboxTriageRequest` L272 · 3 propriedade(s)
- interface `InboxTriageResponse` L278 · 3 propriedade(s)
- interface `SendTextRequest` L284 · 2 propriedade(s)
- interface `SendTextResponse` L289 · 2 propriedade(s)
- interface `ForwardMessageRequest` L301 · 3 propriedade(s)
- interface `ForwardResultDto` L307 · 13 propriedade(s)
- interface `ForwardMessageResponse` L325 · 1 propriedade(s)
- interface `WebhookDto` L330 · 8 propriedade(s)
- interface `CreateWebhookRequest` L341 · 7 propriedade(s)
- interface `SessionRestrictedPayload` L354 · 5 propriedade(s)
- type `MessageAckStatus` L363
- interface `MessageAckEventPayload` L364 · 5 propriedade(s)
- interface `ApiKeyDto` L387 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L396 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L401 · 4 propriedade(s)
- interface `UserDto` L409 · 5 propriedade(s)
- interface `CreateUserRequest` L417 · 4 propriedade(s)
- interface `UpdateUserRequest` L424 · 2 propriedade(s)
- interface `UsersListResponse` L429 · 3 propriedade(s)
- interface `LicenseStatus` L436 · 9 propriedade(s)
- interface `InstallLicenseRequest` L448 · 1 propriedade(s)
- interface `Branding` L453 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L460 · 4 propriedade(s)
- interface `AuditLogDto` L468 · 7 propriedade(s)
- type `ProxyProtocol` L479
- type `ProxySource` L480
- type `ProxyStatus` L481
- type `ProxyMode` L482
- type `ProxyStrategy` L483
- interface `ProxyDto` L486 · 13 propriedade(s)
- interface `CreateProxyRequest` L502 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L511 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L520 · 5 propriedade(s)
- interface `ProxyTestResult` L528 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L535 · 2 propriedade(s)
- interface `BulkImportResult` L541 · 3 propriedade(s)
- interface `WebshareSyncResult` L547 · 4 propriedade(s)
- type `GroupParticipantRole` L555
- type `GroupParticipantAction` L556
- interface `GroupParticipantDto` L558 · 4 propriedade(s)
- interface `GroupDto` L565 · 8 propriedade(s)
- interface `CreateGroupRequest` L576 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L581 · 2 propriedade(s)
- interface `GroupSubjectRequest` L586 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L589 · 1 propriedade(s)
- interface `GroupInviteDto` L592 · 2 propriedade(s)
- interface `ContactCheckDto` L598 · 3 propriedade(s)
- interface `ProfilePictureDto` L603 · 2 propriedade(s)
- interface `BlockRequest` L607 · 2 propriedade(s)
- interface `ContactDirectoryDto` L613 · 11 propriedade(s)
- interface `ChannelDto` L628 · 4 propriedade(s)
- interface `CreateChannelRequest` L634 · 2 propriedade(s)
- type `CampaignStatus` L640
- type `CampaignMessageType` L642
- type `CampaignRecipientStatus` L644
- interface `CampaignDto` L647 · 19 propriedade(s)
- interface `CreateCampaignRequest` L671 · 15 propriedade(s)
- interface `CampaignRecipientDto` L689 · 5 propriedade(s)
