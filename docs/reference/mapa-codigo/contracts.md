<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 674 |

## `contracts/index.ts`

674 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L356

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
- interface `ApiKeyDto` L365 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L374 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L379 · 4 propriedade(s)
- interface `UserDto` L387 · 5 propriedade(s)
- interface `CreateUserRequest` L395 · 4 propriedade(s)
- interface `UpdateUserRequest` L402 · 2 propriedade(s)
- interface `UsersListResponse` L407 · 3 propriedade(s)
- interface `LicenseStatus` L414 · 9 propriedade(s)
- interface `InstallLicenseRequest` L426 · 1 propriedade(s)
- interface `Branding` L431 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L438 · 4 propriedade(s)
- interface `AuditLogDto` L446 · 7 propriedade(s)
- type `ProxyProtocol` L457
- type `ProxySource` L458
- type `ProxyStatus` L459
- type `ProxyMode` L460
- type `ProxyStrategy` L461
- interface `ProxyDto` L464 · 13 propriedade(s)
- interface `CreateProxyRequest` L480 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L489 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L498 · 5 propriedade(s)
- interface `ProxyTestResult` L506 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L513 · 2 propriedade(s)
- interface `BulkImportResult` L519 · 3 propriedade(s)
- interface `WebshareSyncResult` L525 · 4 propriedade(s)
- type `GroupParticipantRole` L533
- type `GroupParticipantAction` L534
- interface `GroupParticipantDto` L536 · 4 propriedade(s)
- interface `GroupDto` L543 · 8 propriedade(s)
- interface `CreateGroupRequest` L554 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L559 · 2 propriedade(s)
- interface `GroupSubjectRequest` L564 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L567 · 1 propriedade(s)
- interface `GroupInviteDto` L570 · 2 propriedade(s)
- interface `ContactCheckDto` L576 · 3 propriedade(s)
- interface `ProfilePictureDto` L581 · 2 propriedade(s)
- interface `BlockRequest` L585 · 2 propriedade(s)
- interface `ContactDirectoryDto` L591 · 11 propriedade(s)
- interface `ChannelDto` L606 · 4 propriedade(s)
- interface `CreateChannelRequest` L612 · 2 propriedade(s)
- type `CampaignStatus` L618
- type `CampaignMessageType` L620
- type `CampaignRecipientStatus` L622
- interface `CampaignDto` L625 · 19 propriedade(s)
- interface `CreateCampaignRequest` L649 · 15 propriedade(s)
- interface `CampaignRecipientDto` L667 · 5 propriedade(s)
