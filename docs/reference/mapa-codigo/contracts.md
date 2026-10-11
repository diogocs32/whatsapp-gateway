<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 935 |

## `contracts/index.ts`

935 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/connect-link-memory.ts`, `dashboard/lib/connect-link.spec.ts`, `dashboard/lib/connect-link.ts`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/proxy-suggestion.spec.ts`, `dashboard/lib/proxy-suggestion.ts`, `dashboard/lib/proxy-usage.spec.ts`, `dashboard/lib/proxy-usage.ts`, `dashboard/lib/public-connect.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/session-filter.spec.ts`, `dashboard/lib/session-filter.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `CONNECT_LINK_ERROR_CODES` = `[ 'CONNECT_LINK_NOT_FOUND', // 404: token ausente/inválido/desconheci…` · L291
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L548

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
- interface `QrResponse` L188 · 3 propriedade(s)
- interface `PairingCodeResponse` L196 · 1 propriedade(s)
- type `ConnectLinkState` L204
- type `ConnectLinkRevokedReason` L211
- interface `ConnectLinkDto` L217 · 13 propriedade(s)
- interface `CreateConnectLinkRequest` L234 · 2 propriedade(s)
- interface `ConnectLinkCreatedResponse` L239 · 3 propriedade(s)
- interface `ConnectLinkCurrentResponse` L246 · 1 propriedade(s)
- interface `ConnectLinkRevokeResponse` L251 · 2 propriedade(s)
- type `PublicConnectPhase` L257
- interface `PublicConnectNewQrState` L264 · 4 propriedade(s)
- type `PublicConnectResponse` L272
- interface `PublicConnectNewQrResponse` L284 · 2 propriedade(s)
- type `ConnectLinkErrorCode` L306
- interface `MessageReactionDto` L316 · 4 propriedade(s)
- interface `MessageDto` L323 · 21 propriedade(s)
- interface `ConversationDto` L362 · 7 propriedade(s)
- type `InboxTriageStatus` L379
- interface `InboxConversationDto` L381 · 16 propriedade(s)
- interface `InboxCounts` L400 · 4 propriedade(s)
- interface `InboxConversationsResponse` L407 · 2 propriedade(s)
- interface `InboxFeedItemDto` L413 · 14 propriedade(s)
- interface `InboxTriageRequest` L436 · 3 propriedade(s)
- interface `InboxTriageResponse` L442 · 3 propriedade(s)
- interface `SendTextRequest` L448 · 3 propriedade(s)
- interface `SendReactionRequest` L455 · 1 propriedade(s)
- interface `SendTextResponse` L459 · 2 propriedade(s)
- interface `ForwardMessageRequest` L471 · 3 propriedade(s)
- interface `ForwardResultDto` L477 · 13 propriedade(s)
- interface `ForwardMessageResponse` L495 · 1 propriedade(s)
- interface `WebhookDto` L500 · 8 propriedade(s)
- interface `CreateWebhookRequest` L511 · 7 propriedade(s)
- interface `SessionRestrictedPayload` L525 · 5 propriedade(s)
- type `MessageAckStatus` L534
- interface `MessageAckEventPayload` L535 · 5 propriedade(s)
- interface `ApiKeyDto` L559 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L568 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L573 · 4 propriedade(s)
- interface `UserDto` L581 · 5 propriedade(s)
- interface `CreateUserRequest` L589 · 4 propriedade(s)
- interface `UpdateUserRequest` L596 · 2 propriedade(s)
- interface `UsersListResponse` L601 · 3 propriedade(s)
- interface `LicenseStatus` L608 · 9 propriedade(s)
- interface `InstallLicenseRequest` L620 · 1 propriedade(s)
- interface `Branding` L625 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L632 · 4 propriedade(s)
- interface `AuditLogDto` L640 · 7 propriedade(s)
- type `ProxyProtocol` L651
- type `ProxySource` L652
- type `ProxyStatus` L653
- type `ProxyMode` L654
- type `ProxyStrategy` L655
- interface `ProxyDto` L658 · 13 propriedade(s)
- interface `ProxySessionRefDto` L676 · 2 propriedade(s)
- interface `ProxyListItemDto` L683 · 2 propriedade(s)
- interface `BulkDeleteProxiesRequest` L692 · 1 propriedade(s)
- interface `BulkDeleteProxiesResult` L696 · 2 propriedade(s)
- type `ProxySuggestionReason` L704
- interface `ProxySuggestionDto` L706 · 6 propriedade(s)
- interface `ProxySuggestionResponse` L715 · 1 propriedade(s)
- interface `CreateProxyRequest` L719 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L728 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L739 · 6 propriedade(s)
- interface `ProxyTestResult` L750 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L757 · 2 propriedade(s)
- interface `BulkImportResult` L763 · 3 propriedade(s)
- interface `WebshareSyncResult` L769 · 4 propriedade(s)
- type `GroupParticipantRole` L777
- type `GroupParticipantAction` L778
- interface `GroupParticipantDto` L780 · 4 propriedade(s)
- interface `GroupDto` L787 · 8 propriedade(s)
- interface `CreateGroupRequest` L798 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L803 · 2 propriedade(s)
- interface `GroupSubjectRequest` L808 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L811 · 1 propriedade(s)
- interface `GroupInviteDto` L814 · 2 propriedade(s)
- interface `ContactCheckDto` L820 · 3 propriedade(s)
- interface `ProfilePictureDto` L825 · 2 propriedade(s)
- interface `BlockRequest` L829 · 2 propriedade(s)
- interface `ContactDirectoryDto` L835 · 11 propriedade(s)
- interface `ChannelDto` L850 · 4 propriedade(s)
- interface `CreateChannelRequest` L856 · 2 propriedade(s)
- type `CampaignStatus` L862
- type `CampaignMessageType` L864
- type `CampaignRecipientStatus` L866
- interface `CampaignDto` L869 · 19 propriedade(s)
- interface `CreateCampaignRequest` L893 · 15 propriedade(s)
- interface `ReplyRateMetricDto` L912 · 13 propriedade(s)
- interface `CampaignRecipientDto` L928 · 5 propriedade(s)
