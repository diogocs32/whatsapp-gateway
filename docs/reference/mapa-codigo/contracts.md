<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 943 |

## `contracts/index.ts`

943 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/connect-link-memory.ts`, `dashboard/lib/connect-link.spec.ts`, `dashboard/lib/connect-link.ts`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/proxy-suggestion.spec.ts`, `dashboard/lib/proxy-suggestion.ts`, `dashboard/lib/proxy-usage.spec.ts`, `dashboard/lib/proxy-usage.ts`, `dashboard/lib/public-connect.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/session-filter.spec.ts`, `dashboard/lib/session-filter.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `CONNECT_LINK_ERROR_CODES` = `[ 'CONNECT_LINK_NOT_FOUND', // 404: token ausente/inválido/desconheci…` · L299
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L556

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
- interface `SessionDto` L79 · 13 propriedade(s)
- interface `SessionErrorDetails` L98 · 2 propriedade(s)
- interface `NewRecipientsMetricDto` L104 · 10 propriedade(s)
- interface `ContactCheckQuotaDto` L117 · 9 propriedade(s)
- interface `SessionAccountInventoryDto` L129 · 2 propriedade(s)
- interface `SessionClientTooOldEventPayload` L142 · 1 propriedade(s)
- interface `SessionConfigDto` L148 · 11 propriedade(s)
- interface `UpdateSessionConfigRequest` L162 · 9 propriedade(s)
- interface `CreateSessionRequest` L174 · 7 propriedade(s)
- interface `UpdateSessionRequest` L192 · 1 propriedade(s)
- interface `QrResponse` L196 · 3 propriedade(s)
- interface `PairingCodeResponse` L204 · 1 propriedade(s)
- type `ConnectLinkState` L212
- type `ConnectLinkRevokedReason` L219
- interface `ConnectLinkDto` L225 · 13 propriedade(s)
- interface `CreateConnectLinkRequest` L242 · 2 propriedade(s)
- interface `ConnectLinkCreatedResponse` L247 · 3 propriedade(s)
- interface `ConnectLinkCurrentResponse` L254 · 1 propriedade(s)
- interface `ConnectLinkRevokeResponse` L259 · 2 propriedade(s)
- type `PublicConnectPhase` L265
- interface `PublicConnectNewQrState` L272 · 4 propriedade(s)
- type `PublicConnectResponse` L280
- interface `PublicConnectNewQrResponse` L292 · 2 propriedade(s)
- type `ConnectLinkErrorCode` L314
- interface `MessageReactionDto` L324 · 4 propriedade(s)
- interface `MessageDto` L331 · 21 propriedade(s)
- interface `ConversationDto` L370 · 7 propriedade(s)
- type `InboxTriageStatus` L387
- interface `InboxConversationDto` L389 · 16 propriedade(s)
- interface `InboxCounts` L408 · 4 propriedade(s)
- interface `InboxConversationsResponse` L415 · 2 propriedade(s)
- interface `InboxFeedItemDto` L421 · 14 propriedade(s)
- interface `InboxTriageRequest` L444 · 3 propriedade(s)
- interface `InboxTriageResponse` L450 · 3 propriedade(s)
- interface `SendTextRequest` L456 · 3 propriedade(s)
- interface `SendReactionRequest` L463 · 1 propriedade(s)
- interface `SendTextResponse` L467 · 2 propriedade(s)
- interface `ForwardMessageRequest` L479 · 3 propriedade(s)
- interface `ForwardResultDto` L485 · 13 propriedade(s)
- interface `ForwardMessageResponse` L503 · 1 propriedade(s)
- interface `WebhookDto` L508 · 8 propriedade(s)
- interface `CreateWebhookRequest` L519 · 7 propriedade(s)
- interface `SessionRestrictedPayload` L533 · 5 propriedade(s)
- type `MessageAckStatus` L542
- interface `MessageAckEventPayload` L543 · 5 propriedade(s)
- interface `ApiKeyDto` L567 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L576 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L581 · 4 propriedade(s)
- interface `UserDto` L589 · 5 propriedade(s)
- interface `CreateUserRequest` L597 · 4 propriedade(s)
- interface `UpdateUserRequest` L604 · 2 propriedade(s)
- interface `UsersListResponse` L609 · 3 propriedade(s)
- interface `LicenseStatus` L616 · 9 propriedade(s)
- interface `InstallLicenseRequest` L628 · 1 propriedade(s)
- interface `Branding` L633 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L640 · 4 propriedade(s)
- interface `AuditLogDto` L648 · 7 propriedade(s)
- type `ProxyProtocol` L659
- type `ProxySource` L660
- type `ProxyStatus` L661
- type `ProxyMode` L662
- type `ProxyStrategy` L663
- interface `ProxyDto` L666 · 13 propriedade(s)
- interface `ProxySessionRefDto` L684 · 2 propriedade(s)
- interface `ProxyListItemDto` L691 · 2 propriedade(s)
- interface `BulkDeleteProxiesRequest` L700 · 1 propriedade(s)
- interface `BulkDeleteProxiesResult` L704 · 2 propriedade(s)
- type `ProxySuggestionReason` L712
- interface `ProxySuggestionDto` L714 · 6 propriedade(s)
- interface `ProxySuggestionResponse` L723 · 1 propriedade(s)
- interface `CreateProxyRequest` L727 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L736 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L747 · 6 propriedade(s)
- interface `ProxyTestResult` L758 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L765 · 2 propriedade(s)
- interface `BulkImportResult` L771 · 3 propriedade(s)
- interface `WebshareSyncResult` L777 · 4 propriedade(s)
- type `GroupParticipantRole` L785
- type `GroupParticipantAction` L786
- interface `GroupParticipantDto` L788 · 4 propriedade(s)
- interface `GroupDto` L795 · 8 propriedade(s)
- interface `CreateGroupRequest` L806 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L811 · 2 propriedade(s)
- interface `GroupSubjectRequest` L816 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L819 · 1 propriedade(s)
- interface `GroupInviteDto` L822 · 2 propriedade(s)
- interface `ContactCheckDto` L828 · 3 propriedade(s)
- interface `ProfilePictureDto` L833 · 2 propriedade(s)
- interface `BlockRequest` L837 · 2 propriedade(s)
- interface `ContactDirectoryDto` L843 · 11 propriedade(s)
- interface `ChannelDto` L858 · 4 propriedade(s)
- interface `CreateChannelRequest` L864 · 2 propriedade(s)
- type `CampaignStatus` L870
- type `CampaignMessageType` L872
- type `CampaignRecipientStatus` L874
- interface `CampaignDto` L877 · 19 propriedade(s)
- interface `CreateCampaignRequest` L901 · 15 propriedade(s)
- interface `ReplyRateMetricDto` L920 · 13 propriedade(s)
- interface `CampaignRecipientDto` L936 · 5 propriedade(s)
