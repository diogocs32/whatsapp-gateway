<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 841 |

## `contracts/index.ts`

841 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/components/chat/ChatThread.tsx`, `dashboard/components/chat/ForwardDialog.tsx`, `dashboard/components/chat/MediaView.tsx`, `dashboard/components/chat/MessageBubble.tsx`, `dashboard/components/chat/Reactions.tsx`, `dashboard/components/chat/forward-context.ts`, `dashboard/components/sessions/ConnectLinkDialog.tsx`, `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/lib/connect-link-memory.ts`, `dashboard/lib/connect-link.spec.ts`, `dashboard/lib/connect-link.ts`, `dashboard/lib/forward.spec.ts`, `dashboard/lib/forward.ts`, `dashboard/lib/live-events.spec.ts`, `dashboard/lib/live-events.ts`, `dashboard/lib/message-format.ts`, `dashboard/lib/proxy-suggestion.spec.ts`, `dashboard/lib/proxy-suggestion.ts`, `dashboard/lib/public-connect.ts`, `dashboard/lib/send-feedback.ts`, `dashboard/lib/session-filter.spec.ts`, `dashboard/lib/session-filter.ts`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `CONNECT_LINK_ERROR_CODES` = `[ 'CONNECT_LINK_NOT_FOUND', // 404: token ausente/inválido/desconheci…` · L250
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L501

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
- interface `SessionClientTooOldEventPayload` L104 · 1 propriedade(s)
- interface `SessionConfigDto` L110 · 11 propriedade(s)
- interface `UpdateSessionConfigRequest` L124 · 9 propriedade(s)
- interface `CreateSessionRequest` L136 · 6 propriedade(s)
- interface `QrResponse` L147 · 3 propriedade(s)
- interface `PairingCodeResponse` L155 · 1 propriedade(s)
- type `ConnectLinkState` L163
- type `ConnectLinkRevokedReason` L170
- interface `ConnectLinkDto` L176 · 13 propriedade(s)
- interface `CreateConnectLinkRequest` L193 · 2 propriedade(s)
- interface `ConnectLinkCreatedResponse` L198 · 3 propriedade(s)
- interface `ConnectLinkCurrentResponse` L205 · 1 propriedade(s)
- interface `ConnectLinkRevokeResponse` L210 · 2 propriedade(s)
- type `PublicConnectPhase` L216
- interface `PublicConnectNewQrState` L223 · 4 propriedade(s)
- type `PublicConnectResponse` L231
- interface `PublicConnectNewQrResponse` L243 · 2 propriedade(s)
- type `ConnectLinkErrorCode` L265
- interface `MessageReactionDto` L275 · 4 propriedade(s)
- interface `MessageDto` L282 · 21 propriedade(s)
- interface `ConversationDto` L321 · 7 propriedade(s)
- type `InboxTriageStatus` L338
- interface `InboxConversationDto` L340 · 16 propriedade(s)
- interface `InboxCounts` L359 · 4 propriedade(s)
- interface `InboxConversationsResponse` L366 · 2 propriedade(s)
- interface `InboxFeedItemDto` L372 · 14 propriedade(s)
- interface `InboxTriageRequest` L395 · 3 propriedade(s)
- interface `InboxTriageResponse` L401 · 3 propriedade(s)
- interface `SendTextRequest` L407 · 2 propriedade(s)
- interface `SendTextResponse` L412 · 2 propriedade(s)
- interface `ForwardMessageRequest` L424 · 3 propriedade(s)
- interface `ForwardResultDto` L430 · 13 propriedade(s)
- interface `ForwardMessageResponse` L448 · 1 propriedade(s)
- interface `WebhookDto` L453 · 8 propriedade(s)
- interface `CreateWebhookRequest` L464 · 7 propriedade(s)
- interface `SessionRestrictedPayload` L478 · 5 propriedade(s)
- type `MessageAckStatus` L487
- interface `MessageAckEventPayload` L488 · 5 propriedade(s)
- interface `ApiKeyDto` L512 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L521 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L526 · 4 propriedade(s)
- interface `UserDto` L534 · 5 propriedade(s)
- interface `CreateUserRequest` L542 · 4 propriedade(s)
- interface `UpdateUserRequest` L549 · 2 propriedade(s)
- interface `UsersListResponse` L554 · 3 propriedade(s)
- interface `LicenseStatus` L561 · 9 propriedade(s)
- interface `InstallLicenseRequest` L573 · 1 propriedade(s)
- interface `Branding` L578 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L585 · 4 propriedade(s)
- interface `AuditLogDto` L593 · 7 propriedade(s)
- type `ProxyProtocol` L604
- type `ProxySource` L605
- type `ProxyStatus` L606
- type `ProxyMode` L607
- type `ProxyStrategy` L608
- interface `ProxyDto` L611 · 13 propriedade(s)
- type `ProxySuggestionReason` L630
- interface `ProxySuggestionDto` L632 · 6 propriedade(s)
- interface `ProxySuggestionResponse` L641 · 1 propriedade(s)
- interface `CreateProxyRequest` L645 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L654 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L665 · 5 propriedade(s)
- interface `ProxyTestResult` L673 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L680 · 2 propriedade(s)
- interface `BulkImportResult` L686 · 3 propriedade(s)
- interface `WebshareSyncResult` L692 · 4 propriedade(s)
- type `GroupParticipantRole` L700
- type `GroupParticipantAction` L701
- interface `GroupParticipantDto` L703 · 4 propriedade(s)
- interface `GroupDto` L710 · 8 propriedade(s)
- interface `CreateGroupRequest` L721 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L726 · 2 propriedade(s)
- interface `GroupSubjectRequest` L731 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L734 · 1 propriedade(s)
- interface `GroupInviteDto` L737 · 2 propriedade(s)
- interface `ContactCheckDto` L743 · 3 propriedade(s)
- interface `ProfilePictureDto` L748 · 2 propriedade(s)
- interface `BlockRequest` L752 · 2 propriedade(s)
- interface `ContactDirectoryDto` L758 · 11 propriedade(s)
- interface `ChannelDto` L773 · 4 propriedade(s)
- interface `CreateChannelRequest` L779 · 2 propriedade(s)
- type `CampaignStatus` L785
- type `CampaignMessageType` L787
- type `CampaignRecipientStatus` L789
- interface `CampaignDto` L792 · 19 propriedade(s)
- interface `CreateCampaignRequest` L816 · 15 propriedade(s)
- interface `CampaignRecipientDto` L834 · 5 propriedade(s)
