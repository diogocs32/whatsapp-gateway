<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 603 |

## `contracts/index.ts`

603 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `[ '*', 'message', 'message.ack', 'message.reaction', 'session.status'…` · L285

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
- interface `MessageDto` L131 · 20 propriedade(s)
- interface `ConversationDto` L162 · 7 propriedade(s)
- type `InboxTriageStatus` L179
- interface `InboxConversationDto` L181 · 16 propriedade(s)
- interface `InboxCounts` L200 · 4 propriedade(s)
- interface `InboxConversationsResponse` L207 · 2 propriedade(s)
- interface `InboxFeedItemDto` L213 · 14 propriedade(s)
- interface `InboxTriageRequest` L236 · 3 propriedade(s)
- interface `InboxTriageResponse` L242 · 3 propriedade(s)
- interface `SendTextRequest` L248 · 2 propriedade(s)
- interface `SendTextResponse` L253 · 2 propriedade(s)
- interface `WebhookDto` L259 · 8 propriedade(s)
- interface `CreateWebhookRequest` L270 · 7 propriedade(s)
- interface `ApiKeyDto` L294 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L303 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L308 · 4 propriedade(s)
- interface `UserDto` L316 · 5 propriedade(s)
- interface `CreateUserRequest` L324 · 4 propriedade(s)
- interface `UpdateUserRequest` L331 · 2 propriedade(s)
- interface `UsersListResponse` L336 · 3 propriedade(s)
- interface `LicenseStatus` L343 · 9 propriedade(s)
- interface `InstallLicenseRequest` L355 · 1 propriedade(s)
- interface `Branding` L360 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L367 · 4 propriedade(s)
- interface `AuditLogDto` L375 · 7 propriedade(s)
- type `ProxyProtocol` L386
- type `ProxySource` L387
- type `ProxyStatus` L388
- type `ProxyMode` L389
- type `ProxyStrategy` L390
- interface `ProxyDto` L393 · 13 propriedade(s)
- interface `CreateProxyRequest` L409 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L418 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L427 · 5 propriedade(s)
- interface `ProxyTestResult` L435 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L442 · 2 propriedade(s)
- interface `BulkImportResult` L448 · 3 propriedade(s)
- interface `WebshareSyncResult` L454 · 4 propriedade(s)
- type `GroupParticipantRole` L462
- type `GroupParticipantAction` L463
- interface `GroupParticipantDto` L465 · 4 propriedade(s)
- interface `GroupDto` L472 · 8 propriedade(s)
- interface `CreateGroupRequest` L483 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L488 · 2 propriedade(s)
- interface `GroupSubjectRequest` L493 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L496 · 1 propriedade(s)
- interface `GroupInviteDto` L499 · 2 propriedade(s)
- interface `ContactCheckDto` L505 · 3 propriedade(s)
- interface `ProfilePictureDto` L510 · 2 propriedade(s)
- interface `BlockRequest` L514 · 2 propriedade(s)
- interface `ContactDirectoryDto` L520 · 11 propriedade(s)
- interface `ChannelDto` L535 · 4 propriedade(s)
- interface `CreateChannelRequest` L541 · 2 propriedade(s)
- type `CampaignStatus` L547
- type `CampaignMessageType` L549
- type `CampaignRecipientStatus` L551
- interface `CampaignDto` L554 · 19 propriedade(s)
- interface `CreateCampaignRequest` L578 · 15 propriedade(s)
- interface `CampaignRecipientDto` L596 · 5 propriedade(s)
