<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 902 |

## `contracts/index.ts`

902 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/connect-link-memory.ts`, `dashboard/lib/connect-link.spec.ts`, `dashboard/lib/connect-link.ts`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/proxy-suggestion.spec.ts`, `dashboard/lib/proxy-suggestion.ts`, `dashboard/lib/public-connect.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/session-filter.spec.ts`, `dashboard/lib/session-filter.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `CONNECT_LINK_ERROR_CODES` = `[ 'CONNECT_LINK_NOT_FOUND', // 404: token ausente/inválido/desconheci…` · L288
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L545

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
- interface `CreateSessionRequest` L174 · 6 propriedade(s)
- interface `QrResponse` L185 · 3 propriedade(s)
- interface `PairingCodeResponse` L193 · 1 propriedade(s)
- type `ConnectLinkState` L201
- type `ConnectLinkRevokedReason` L208
- interface `ConnectLinkDto` L214 · 13 propriedade(s)
- interface `CreateConnectLinkRequest` L231 · 2 propriedade(s)
- interface `ConnectLinkCreatedResponse` L236 · 3 propriedade(s)
- interface `ConnectLinkCurrentResponse` L243 · 1 propriedade(s)
- interface `ConnectLinkRevokeResponse` L248 · 2 propriedade(s)
- type `PublicConnectPhase` L254
- interface `PublicConnectNewQrState` L261 · 4 propriedade(s)
- type `PublicConnectResponse` L269
- interface `PublicConnectNewQrResponse` L281 · 2 propriedade(s)
- type `ConnectLinkErrorCode` L303
- interface `MessageReactionDto` L313 · 4 propriedade(s)
- interface `MessageDto` L320 · 21 propriedade(s)
- interface `ConversationDto` L359 · 7 propriedade(s)
- type `InboxTriageStatus` L376
- interface `InboxConversationDto` L378 · 16 propriedade(s)
- interface `InboxCounts` L397 · 4 propriedade(s)
- interface `InboxConversationsResponse` L404 · 2 propriedade(s)
- interface `InboxFeedItemDto` L410 · 14 propriedade(s)
- interface `InboxTriageRequest` L433 · 3 propriedade(s)
- interface `InboxTriageResponse` L439 · 3 propriedade(s)
- interface `SendTextRequest` L445 · 3 propriedade(s)
- interface `SendReactionRequest` L452 · 1 propriedade(s)
- interface `SendTextResponse` L456 · 2 propriedade(s)
- interface `ForwardMessageRequest` L468 · 3 propriedade(s)
- interface `ForwardResultDto` L474 · 13 propriedade(s)
- interface `ForwardMessageResponse` L492 · 1 propriedade(s)
- interface `WebhookDto` L497 · 8 propriedade(s)
- interface `CreateWebhookRequest` L508 · 7 propriedade(s)
- interface `SessionRestrictedPayload` L522 · 5 propriedade(s)
- type `MessageAckStatus` L531
- interface `MessageAckEventPayload` L532 · 5 propriedade(s)
- interface `ApiKeyDto` L556 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L565 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L570 · 4 propriedade(s)
- interface `UserDto` L578 · 5 propriedade(s)
- interface `CreateUserRequest` L586 · 4 propriedade(s)
- interface `UpdateUserRequest` L593 · 2 propriedade(s)
- interface `UsersListResponse` L598 · 3 propriedade(s)
- interface `LicenseStatus` L605 · 9 propriedade(s)
- interface `InstallLicenseRequest` L617 · 1 propriedade(s)
- interface `Branding` L622 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L629 · 4 propriedade(s)
- interface `AuditLogDto` L637 · 7 propriedade(s)
- type `ProxyProtocol` L648
- type `ProxySource` L649
- type `ProxyStatus` L650
- type `ProxyMode` L651
- type `ProxyStrategy` L652
- interface `ProxyDto` L655 · 13 propriedade(s)
- type `ProxySuggestionReason` L674
- interface `ProxySuggestionDto` L676 · 6 propriedade(s)
- interface `ProxySuggestionResponse` L685 · 1 propriedade(s)
- interface `CreateProxyRequest` L689 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L698 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L709 · 5 propriedade(s)
- interface `ProxyTestResult` L717 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L724 · 2 propriedade(s)
- interface `BulkImportResult` L730 · 3 propriedade(s)
- interface `WebshareSyncResult` L736 · 4 propriedade(s)
- type `GroupParticipantRole` L744
- type `GroupParticipantAction` L745
- interface `GroupParticipantDto` L747 · 4 propriedade(s)
- interface `GroupDto` L754 · 8 propriedade(s)
- interface `CreateGroupRequest` L765 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L770 · 2 propriedade(s)
- interface `GroupSubjectRequest` L775 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L778 · 1 propriedade(s)
- interface `GroupInviteDto` L781 · 2 propriedade(s)
- interface `ContactCheckDto` L787 · 3 propriedade(s)
- interface `ProfilePictureDto` L792 · 2 propriedade(s)
- interface `BlockRequest` L796 · 2 propriedade(s)
- interface `ContactDirectoryDto` L802 · 11 propriedade(s)
- interface `ChannelDto` L817 · 4 propriedade(s)
- interface `CreateChannelRequest` L823 · 2 propriedade(s)
- type `CampaignStatus` L829
- type `CampaignMessageType` L831
- type `CampaignRecipientStatus` L833
- interface `CampaignDto` L836 · 19 propriedade(s)
- interface `CreateCampaignRequest` L860 · 15 propriedade(s)
- interface `ReplyRateMetricDto` L879 · 13 propriedade(s)
- interface `CampaignRecipientDto` L895 · 5 propriedade(s)
