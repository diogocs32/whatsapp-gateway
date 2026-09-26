<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 697 |

## `contracts/index.ts`

697 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L378

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
- interface `SessionRestrictedPayload` L355 · 5 propriedade(s)
- type `MessageAckStatus` L364
- interface `MessageAckEventPayload` L365 · 5 propriedade(s)
- interface `ApiKeyDto` L388 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L397 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L402 · 4 propriedade(s)
- interface `UserDto` L410 · 5 propriedade(s)
- interface `CreateUserRequest` L418 · 4 propriedade(s)
- interface `UpdateUserRequest` L425 · 2 propriedade(s)
- interface `UsersListResponse` L430 · 3 propriedade(s)
- interface `LicenseStatus` L437 · 9 propriedade(s)
- interface `InstallLicenseRequest` L449 · 1 propriedade(s)
- interface `Branding` L454 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L461 · 4 propriedade(s)
- interface `AuditLogDto` L469 · 7 propriedade(s)
- type `ProxyProtocol` L480
- type `ProxySource` L481
- type `ProxyStatus` L482
- type `ProxyMode` L483
- type `ProxyStrategy` L484
- interface `ProxyDto` L487 · 13 propriedade(s)
- interface `CreateProxyRequest` L503 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L512 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L521 · 5 propriedade(s)
- interface `ProxyTestResult` L529 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L536 · 2 propriedade(s)
- interface `BulkImportResult` L542 · 3 propriedade(s)
- interface `WebshareSyncResult` L548 · 4 propriedade(s)
- type `GroupParticipantRole` L556
- type `GroupParticipantAction` L557
- interface `GroupParticipantDto` L559 · 4 propriedade(s)
- interface `GroupDto` L566 · 8 propriedade(s)
- interface `CreateGroupRequest` L577 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L582 · 2 propriedade(s)
- interface `GroupSubjectRequest` L587 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L590 · 1 propriedade(s)
- interface `GroupInviteDto` L593 · 2 propriedade(s)
- interface `ContactCheckDto` L599 · 3 propriedade(s)
- interface `ProfilePictureDto` L604 · 2 propriedade(s)
- interface `BlockRequest` L608 · 2 propriedade(s)
- interface `ContactDirectoryDto` L614 · 11 propriedade(s)
- interface `ChannelDto` L629 · 4 propriedade(s)
- interface `CreateChannelRequest` L635 · 2 propriedade(s)
- type `CampaignStatus` L641
- type `CampaignMessageType` L643
- type `CampaignRecipientStatus` L645
- interface `CampaignDto` L648 · 19 propriedade(s)
- interface `CreateCampaignRequest` L672 · 15 propriedade(s)
- interface `CampaignRecipientDto` L690 · 5 propriedade(s)
