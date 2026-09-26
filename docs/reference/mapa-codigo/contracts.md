<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 710 |

## `contracts/index.ts`

710 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L390

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
- interface `SessionDto` L79 · 12 propriedade(s)
- interface `SessionErrorDetails` L95 · 2 propriedade(s)
- interface `SessionClientTooOldEventPayload` L101 · 1 propriedade(s)
- interface `SessionConfigDto` L107 · 11 propriedade(s)
- interface `UpdateSessionConfigRequest` L121 · 9 propriedade(s)
- interface `CreateSessionRequest` L133 · 6 propriedade(s)
- interface `QrResponse` L144 · 3 propriedade(s)
- interface `PairingCodeResponse` L152 · 1 propriedade(s)
- interface `MessageReactionDto` L164 · 4 propriedade(s)
- interface `MessageDto` L171 · 21 propriedade(s)
- interface `ConversationDto` L210 · 7 propriedade(s)
- type `InboxTriageStatus` L227
- interface `InboxConversationDto` L229 · 16 propriedade(s)
- interface `InboxCounts` L248 · 4 propriedade(s)
- interface `InboxConversationsResponse` L255 · 2 propriedade(s)
- interface `InboxFeedItemDto` L261 · 14 propriedade(s)
- interface `InboxTriageRequest` L284 · 3 propriedade(s)
- interface `InboxTriageResponse` L290 · 3 propriedade(s)
- interface `SendTextRequest` L296 · 2 propriedade(s)
- interface `SendTextResponse` L301 · 2 propriedade(s)
- interface `ForwardMessageRequest` L313 · 3 propriedade(s)
- interface `ForwardResultDto` L319 · 13 propriedade(s)
- interface `ForwardMessageResponse` L337 · 1 propriedade(s)
- interface `WebhookDto` L342 · 8 propriedade(s)
- interface `CreateWebhookRequest` L353 · 7 propriedade(s)
- interface `SessionRestrictedPayload` L367 · 5 propriedade(s)
- type `MessageAckStatus` L376
- interface `MessageAckEventPayload` L377 · 5 propriedade(s)
- interface `ApiKeyDto` L401 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L410 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L415 · 4 propriedade(s)
- interface `UserDto` L423 · 5 propriedade(s)
- interface `CreateUserRequest` L431 · 4 propriedade(s)
- interface `UpdateUserRequest` L438 · 2 propriedade(s)
- interface `UsersListResponse` L443 · 3 propriedade(s)
- interface `LicenseStatus` L450 · 9 propriedade(s)
- interface `InstallLicenseRequest` L462 · 1 propriedade(s)
- interface `Branding` L467 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L474 · 4 propriedade(s)
- interface `AuditLogDto` L482 · 7 propriedade(s)
- type `ProxyProtocol` L493
- type `ProxySource` L494
- type `ProxyStatus` L495
- type `ProxyMode` L496
- type `ProxyStrategy` L497
- interface `ProxyDto` L500 · 13 propriedade(s)
- interface `CreateProxyRequest` L516 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L525 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L534 · 5 propriedade(s)
- interface `ProxyTestResult` L542 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L549 · 2 propriedade(s)
- interface `BulkImportResult` L555 · 3 propriedade(s)
- interface `WebshareSyncResult` L561 · 4 propriedade(s)
- type `GroupParticipantRole` L569
- type `GroupParticipantAction` L570
- interface `GroupParticipantDto` L572 · 4 propriedade(s)
- interface `GroupDto` L579 · 8 propriedade(s)
- interface `CreateGroupRequest` L590 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L595 · 2 propriedade(s)
- interface `GroupSubjectRequest` L600 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L603 · 1 propriedade(s)
- interface `GroupInviteDto` L606 · 2 propriedade(s)
- interface `ContactCheckDto` L612 · 3 propriedade(s)
- interface `ProfilePictureDto` L617 · 2 propriedade(s)
- interface `BlockRequest` L621 · 2 propriedade(s)
- interface `ContactDirectoryDto` L627 · 11 propriedade(s)
- interface `ChannelDto` L642 · 4 propriedade(s)
- interface `CreateChannelRequest` L648 · 2 propriedade(s)
- type `CampaignStatus` L654
- type `CampaignMessageType` L656
- type `CampaignRecipientStatus` L658
- interface `CampaignDto` L661 · 19 propriedade(s)
- interface `CreateCampaignRequest` L685 · 15 propriedade(s)
- interface `CampaignRecipientDto` L703 · 5 propriedade(s)
