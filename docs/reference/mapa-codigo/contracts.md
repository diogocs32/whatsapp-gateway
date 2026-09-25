<!-- GERADO por scripts/mapa-codigo.mjs — NÃO editar à mão. Regenerar: node scripts/mapa-codigo.mjs -->

# Mapa do código — packages/contracts

Legenda: `L` = linha · **chama**/**chamado por** = chamadas resolvidas pelo type-checker (chamada via interface aparece na interface — ver “implementado por”) · **banco** = `modelo.operação` Prisma (`SQL:tabela` = SQL cru) · **env** = variável de ambiente lida.

| Arquivo | Linhas |
| --- | --- |
| `contracts/index.ts` | 568 |

## `contracts/index.ts`

568 linhas · caminho: `packages/contracts/src/index.ts`
- importado por: `dashboard/lib/api.ts`, `dashboard/lib/auth.tsx`, `dashboard/lib/branding.tsx`, `dashboard/routes/ApiKeys.tsx`, `dashboard/routes/Atendimento.tsx`, `dashboard/routes/Audit.tsx`, `dashboard/routes/Campaigns.tsx`, `dashboard/routes/Contacts.tsx`, `dashboard/routes/Dashboard.tsx`, `dashboard/routes/Groups.tsx`, `dashboard/routes/Health.tsx`, `dashboard/routes/Inbox.tsx`, `dashboard/routes/License.tsx`, `dashboard/routes/Proxies.tsx`, `dashboard/routes/Sessions.tsx`, `dashboard/routes/Users.tsx`, `dashboard/routes/Webhooks.tsx`

**Funções e constantes de topo**
- `WEBHOOK_EVENTS` = `['*', 'message', 'session.status'] as const` · L256

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
- interface `MessageDto` L117 · 17 propriedade(s)
- interface `ConversationDto` L143 · 7 propriedade(s)
- type `InboxTriageStatus` L160
- interface `InboxConversationDto` L162 · 16 propriedade(s)
- interface `InboxCounts` L181 · 4 propriedade(s)
- interface `InboxConversationsResponse` L188 · 2 propriedade(s)
- interface `InboxFeedItemDto` L194 · 11 propriedade(s)
- interface `InboxTriageRequest` L211 · 3 propriedade(s)
- interface `InboxTriageResponse` L217 · 3 propriedade(s)
- interface `SendTextRequest` L223 · 2 propriedade(s)
- interface `SendTextResponse` L228 · 2 propriedade(s)
- interface `WebhookDto` L234 · 8 propriedade(s)
- interface `CreateWebhookRequest` L245 · 7 propriedade(s)
- interface `ApiKeyDto` L259 · 6 propriedade(s)
- interface `CreateApiKeyRequest` L268 · 1 propriedade(s)
- interface `CreatedApiKeyDto` L273 · 4 propriedade(s)
- interface `UserDto` L281 · 5 propriedade(s)
- interface `CreateUserRequest` L289 · 4 propriedade(s)
- interface `UpdateUserRequest` L296 · 2 propriedade(s)
- interface `UsersListResponse` L301 · 3 propriedade(s)
- interface `LicenseStatus` L308 · 9 propriedade(s)
- interface `InstallLicenseRequest` L320 · 1 propriedade(s)
- interface `Branding` L325 · 4 propriedade(s)
- interface `UpdateBrandingRequest` L332 · 4 propriedade(s)
- interface `AuditLogDto` L340 · 7 propriedade(s)
- type `ProxyProtocol` L351
- type `ProxySource` L352
- type `ProxyStatus` L353
- type `ProxyMode` L354
- type `ProxyStrategy` L355
- interface `ProxyDto` L358 · 13 propriedade(s)
- interface `CreateProxyRequest` L374 · 6 propriedade(s)
- interface `ProxyAssignmentDto` L383 · 6 propriedade(s)
- interface `SetProxyAssignmentRequest` L392 · 5 propriedade(s)
- interface `ProxyTestResult` L400 · 4 propriedade(s)
- interface `BulkImportProxiesRequest` L407 · 2 propriedade(s)
- interface `BulkImportResult` L413 · 3 propriedade(s)
- interface `WebshareSyncResult` L419 · 4 propriedade(s)
- type `GroupParticipantRole` L427
- type `GroupParticipantAction` L428
- interface `GroupParticipantDto` L430 · 4 propriedade(s)
- interface `GroupDto` L437 · 8 propriedade(s)
- interface `CreateGroupRequest` L448 · 2 propriedade(s)
- interface `GroupParticipantsRequest` L453 · 2 propriedade(s)
- interface `GroupSubjectRequest` L458 · 1 propriedade(s)
- interface `GroupDescriptionRequest` L461 · 1 propriedade(s)
- interface `GroupInviteDto` L464 · 2 propriedade(s)
- interface `ContactCheckDto` L470 · 3 propriedade(s)
- interface `ProfilePictureDto` L475 · 2 propriedade(s)
- interface `BlockRequest` L479 · 2 propriedade(s)
- interface `ContactDirectoryDto` L485 · 11 propriedade(s)
- interface `ChannelDto` L500 · 4 propriedade(s)
- interface `CreateChannelRequest` L506 · 2 propriedade(s)
- type `CampaignStatus` L512
- type `CampaignMessageType` L514
- type `CampaignRecipientStatus` L516
- interface `CampaignDto` L519 · 19 propriedade(s)
- interface `CreateCampaignRequest` L543 · 15 propriedade(s)
- interface `CampaignRecipientDto` L561 · 5 propriedade(s)
