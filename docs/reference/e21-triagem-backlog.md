---
tipo: reference
dono: equipe gateway
revisado_em: 2026-10-04
validade: a cada release
---

# E21 — triagem do backlog anterior

- **Data:** 30/09/2026.
- **Dono:** equipe gateway.
- **Base inspecionada:** `351a68b` (`origin/main` após o merge do PR #26/E20).
- **Método:** leitura de código, testes existentes, documentação e histórico Git. A triagem não executou testes adicionais, infra, deploy, canário, pareamento ou operação de produção. Os fatos abaixo descrevem a implementação versionada; não comprovam implantação ou comportamento de conta real.
- **Recorte de implementação E21:** somente **P-103**, correlação de reações no reply-rate do G4. Os outros itens permanecem no quadro central para etapas próprias. P-100 continua aberta; deploys e canários continuam manuais.

| Item          | Fato atual e evidência                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Status após triagem                                                                                                              | Próximo recorte                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-001         | A matriz granular já existe em [disconnect-policy.ts:29](../../apps/gateway/src/modules/sessions/infrastructure/baileys/disconnect-policy.ts#L29), com testes em `baileys.disconnect.spec.ts:132/167/182/198/229` (E9, `7c0441c`). Há recuperação após o orçamento, a cada 5 min, somente para 408/428/503 em [baileys.engine.ts:1133](../../apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts#L1133) (E13, `f742158`). `setStatus` é imediato (`:588`) e `open` publica WORKING (`:994`).  | **Parcial.** A descrição antiga precisa distinguir granularidade entregue, auto-heal limitado entregue e histerese ainda aberta. | Avaliar histerese e os casos de recuperação restantes, em conjunto com a política de sessão nunca pareada.                                                                                                    |
| P-018 / P-091 | O retry por 408 não distingue credencial de conta pareada (`baileys.engine.ts:1128-1144`). O boot inclui SCAN_QR_CODE/PAIRING_CODE/DEGRADED em [prisma-session.repository.ts:178](../../apps/gateway/src/modules/sessions/infrastructure/prisma-session.repository.ts#L178). Revogar só altera o link; expiração/revogação bloqueia o token em [connect-link.service.ts:217](../../apps/gateway/src/modules/sessions/application/connect-link.service.ts#L217) e `:248-277`.                                         | **Abertas**, relacionadas ao mesmo ciclo de vida.                                                                                | Distinguir nunca pareada de pareada; encerrar esgotamento em STOPPED e provar que não reidrata. Definir o efeito da expiração/revogação sobre sessão nunca pareada.                                           |
| P-022         | A base tem **55 arquivos unit gateway**, além dos e2e. A regressão do jobId webhook já possui teste de efeito em [webhooks.e2e-spec.ts:74](../../apps/gateway/test/webhooks.e2e-spec.ts#L74). Campanha usa `campaign-${id}-e${epoch}-${r.id}` em `campaign.service.ts:72-74`. Licença Ed25519 (`iam/domain/license.ts:46-57`) e parse cgroup (`shared-kernel/memory.ts:70-83`) não têm specs dedicados encontrados. Coverage permanece sem piso em [vitest.config.mts:18](../../apps/gateway/vitest.config.mts#L18). | **Aberta/parcial.** O número de testes e a lista de candidatos da descrição antiga não representam toda a base atual.            | Atualizar a baseline e escolher lacunas de licença/cgroup/jobId. Confirmar o comportamento de ritmo/pacing existente antes de ampliar esse candidato; não criar funcionalidade por causa da descrição antiga. |
| P-023         | O envio só remove pontuação e acrescenta o sufixo: [baileys.engine.ts:2609](../../apps/gateway/src/modules/sessions/infrastructure/baileys/baileys.engine.ts#L2609) e `wwebjs.engine.ts:2747-2749`. A variação do nono dígito em `messaging/application/chat-jids.ts:6-16` atende consultas, não corrige o destino enviado.                                                                                                                                                                                          | **Aberta.**                                                                                                                      | Política explícita de normalização com testes BR/não-BR, preservando fixos e JIDs; sem sondagem `onWhatsApp`.                                                                                                 |
| P-013         | [SendTextRequest:445](../../packages/contracts/src/index.ts#L445) ainda só tem `to` e `text`; `SendReactionRequest` não foi encontrado. O gateway aceita `mentions` em `messages.controller.ts:69-70/85-90` e reação `{ emoji }` em `:107-108`.                                                                                                                                                                                                                                                                      | **Aberta/desbloqueada.**                                                                                                         | Alinhar tipos aditivos ao contrato publicado; conferir completude dos demais campos já aceitos pela rota.                                                                                                     |
| P-005         | O índice de `RefreshToken.expiresAt` existe (`schema.prisma:40-57`). Token expirado é rejeitado sem remoção em [prisma-refresh-token.repository.ts:47](../../apps/gateway/src/modules/iam/infrastructure/prisma-refresh-token.repository.ts#L47). O sweep de retenção não inclui tokens (`retention.service.ts:30-60`).                                                                                                                                                                                              | **Aberta.**                                                                                                                      | Purge por `expiresAt`, preservando a semântica de famílias e detecção de reuso.                                                                                                                               |
| P-036         | [RetentionService.sweep:30](../../apps/gateway/src/modules/observability/retention.service.ts#L30) cobre raw, mensagens, **reações**, eventos, audit logs e send intents. Não cobre mídia S3/DLQ/campanhas; os deletes atuais são `deleteMany` sem lotes.                                                                                                                                                                                                                                                            | **Parcial.** Registrar também a retenção de reações já entregue; demais conjuntos, trilha e temporalidade continuam no backlog.  | Retenção por conjunto de dados, com lotes e preservação de objetos ainda referenciados.                                                                                                                       |
| P-044         | O item ao vivo continua com `name: null`, agora em [live-events.ts:365](../../apps/dashboard/src/lib/live-events.ts#L365), testado em `live-events.spec.ts:131-137`. Atendimento chama o helper em `:245` e recarrega a lista por debounce de 800 ms (`:210-217/248`).                                                                                                                                                                                                                                               | **Aberta/cosmética.** A referência antiga ao trecho que construía o item em Atendimento mudou de lugar.                          | Resolver o nome no evento ou reaproveitar cache de conversas.                                                                                                                                                 |
| P-045         | O fluxo em [Atendimento.tsx:229](../../apps/dashboard/src/routes/Atendimento.tsx#L229) atualiza estado/lista. Não foram encontrados áudio, `Notification` ou contador de título para mensagem nova nessa tela; alterações de título existentes são branding e Conectar.                                                                                                                                                                                                                                              | **Aberta/decisão do dono.**                                                                                                      | Definir opt-in e gesto para áudio antes do recorte de UI.                                                                                                                                                     |
| P-046         | [ConversationTriage:429](../../apps/gateway/prisma/schema.prisma#L429) não tem índice temporal; o sweep não a inclui. Há cascade da sessão (`:440`) **e limpeza manual** em `prisma-inbox.repository.ts:201-204`.                                                                                                                                                                                                                                                                                                    | **Aberta.** A afirmação antiga de que a tabela só é limpa por cascade é imprecisa; purge por idade segue ausente.                | Juntar com retenção, preservando marcas de conversas com entrada relevante.                                                                                                                                   |
| P-078         | **Fotografia da base 351a68b:** ACK e save eram independentes em `message-persister.service.ts`; `updateStatusByKey` era no-op antes do INSERT. A memória do painel (`live-events.ts:158-190`) compensava durante a tela aberta. **Continuação em base 899e86d:** ACK pendente passa a ser durável e consumido atomicamente; ver D-049 e seção abaixo.                                                                                                                                                               | **Aberta na triagem; continuação em código, sem deploy.**                                                                        | Publicação/canário manuais; banco/GET/Inbox/reply-rate e restart/réplicas são os gates do recorte.                                                                                                            |

As atualizações de status acima reconciliam o escopo do código existente. Nenhuma pendência foi considerada concluída em produção por esta triagem.

## Continuação — QR inicial esgotado (30/09/2026, base 8f7683f)

A tabela acima é a fotografia da triagem P-103. O recorte seguinte implementa somente P-018/P-091
para o QR com auth ainda inicial: 408 com motivo exato da rc14 passa a STOPPED e sai do autostart;
qualquer sinal de pairing ou auth ausente conserva a política anterior. Não muda expiração/revogação
imediata do token nem purga legado. Decisão D-048, comportamento e limites no
[how-to](../how-to/qr-esgotado-e21.md); testes de efeito em `test/baileys-qr-exhaustion.e2e-spec.ts`.
Demais itens ficam abertos; P-100/P-101/P-102 e deploys/canários manuais preservados.

## Continuação — ACK antes da persistência (30/09/2026, base 899e86d)

A reprodução inicial em PostgreSQL retornou `expected null to be 'read'` depois de receber
ACK antes do INSERT e criar outro repositório (`/tmp/conexozenvo-e21-ack-red.log`).
O recorte P-078 usa `wa_pending_message_acks` e advisory lock transacional compartilhado por
ACK/save/backfill; aplica o maior status e consome o pendente no mesmo commit. Preserva o alvo
mais recente por sessão/key e inbound/read-self, sem reaplicar ACK consumido em INSERT futuro.

Retenção pelo `lastSeenAt`/`RETENTION_MESSAGES_DAYS` existente. Migration aditiva compatível
com N-1; coexistência com N-1 não recebe a garantia de serialização, portanto primeira publicação
exige stop-first. D-049 e [política/limites](../how-to/ack-persistencia-e21.md) são canônicos;
evidência final dos gates fica na sessão deste recorte. Não houve publicação ou canário.
Demais pendências permanecem abertas; D-047/G4/G5, D-048/QR e contrato n8n preservados.

## Continuação — tipos W5 (30/09/2026, base86f9041)

P-013 entrega somente `SendTextRequest.mentions?: string[]` e
`SendReactionRequest { emoji: string }`, espelhando os schemas privados já existentes.
Menções podem ser omitidas/vazias; reação vazia remove. Nenhuma restrição, rota ou
comportamento de envio muda. Painel e n8n0.4.1 seguem seus payloads HTTP existentes;
o node não depende do pacote privado de tipos e seu repo não foi editado.

Fixtures compiladas pelo tsc e HTTP/SQL com manager falso comprovam o recorte.
Demais divergências de contratos do mapa seguem P-040; demais itens da triagem
continuam abertos. ACK D-049, G4/G5 D-047 e QR D-048 preservados; sem deploy/canário.

## Continuação — purge de refresh tokens (30/09/2026, basebc2896d)

P-005 entregue no IAM: cutoff com margem7dias/0desliga, lotes500 e família
protegida retém ancestrais expirados/revogados. Reapresentar ancestral após purge
continua revogando descendente válido. Locks de escritores por usuário e DELETE
fresh READ COMMITTED explícito coordenam com rotação/revogação. Até20lotes/sweep,
boot2min/6h, single-flight/shutdown aguardado; nenhuma mudança de TTL/HTTP/schema.
[D-050/política/provas/limites](../how-to/auth-sessao-refresh-rotation.md#retenção-segura-p-005e21--d-050).
Primeira troca/rollback stop-first, publicação/canários manuais; não cobre P-036/P-046.
Próximo recorte proposto P-022: testes de domínio de licença, sem funcionalidade nova.
P-100/P-101/P-102 abertas, P-099 sem drenar; D-047/D-048/D-049 e tipos W5 preservados.

## Continuação — testes de licença (30/09/2026, base9db34ad)

A lacuna da licença foi confirmada sem specs dedicados na base do PR31/P-005.
E21/P-022 acrescenta testes de domínio com Node crypto real e somente a confiança
pública substituída; fixtures fixas vieram do emissor offline com chave de teste
RFC8032 temporária. Service usa par sintético descartável, repo/config e consumidores
com portas falsas. Não foi acessada a chave privada real nem iniciada engine.

O recorte fixa o comportamento atual: exp em ms e igualdade aceita, null perpétua;
repo precede env inclusive vazio/inválido, comunidade usa limites configurados,
persistência falha preserva cache, remove pode restaurar o env. Assentos/sessões
bloqueiam em >=, incluindo zero; maxSessions conta registros de todos os status.
Claims sem schema e cache até reload/install permanecem limites documentados.
[Provas/gates/mutações](../sessions/DONE-2026-09-30-2213-e21-license-tests.md).

P-022 continua parcial. Próximo candidato independente: parse cgroup
`shared-kernel/memory.ts:70-83`, usado por `memoryStats` e `/health`, ainda sem
spec dedicado. Não criar extração/API/política por hipótese; conferir código/fonte
oficial e provar working set/fallback sem Docker ou arquivos reais do host.
P-100/P-101/P-102 abertas, P-099 sem drenar; gates/deploys/canários manuais preservados.

## Continuação — testes do parser cgroup (30/09/2026, basec818f89)

A lacuna sem spec dedicado foi reconfirmada após o merge do PR32/licença.
O parser privado permanece dentro de memory.ts; testes exercitam memoryStats real
com fs/process/v8 sintéticos, sem ler cgroup/proc do host. Working set usa somente
inactive_file, chaves podem mudar de posição e erro de leitura devolve fallback V8.
Ausência de chave equivale a desconto zero; working set não positivo após subtração
devolve current. Gramática permissiva (Number(trim)/prefixo numérico) é caracterizada
sem endurecimento. Health/summary reais provam prioridade container, ratios em duas
casas, limiar <0.9 já existente e campos/unidades do resumo.

[Provas/gates/mutações/limites](../sessions/DONE-2026-09-30-2256-e21-cgroup-tests.md).
Chromium/PSS do mesmo arquivo fica fora do recorte; sem piso de cobertura novo.
P-022 continua parcial. Próximo candidato independente: withDeadline/probes health
(`health.service.ts:31-43/56-60`), ainda sem spec dedicado de resolução/rejeição/
timeout/cleanup e probe pendurado encontrado. C10 e demais lacunas permanecem abertas.
P-100/P-101/P-102 abertas/P-099 sem drenar, gates e publicação/canários manuais preservados.

## Continuação — withDeadline e probes health (30/09/2026, base407620c)

A lacuna foi confirmada após PR33/cgroup: health e2e somente caminho positivo,
health-memory.spec cobre memória/limiar mas não probes pendurados. Novos specs
with-deadline/health-probes exercitam helper/service/controller reais com relógio
sintético e portas falsas, sem extrair funções nem mudar runtime/política.
Resolução original, fallback por erro/timeout, cleanup e resultados tardios são
caracterizados; timeout não cancela a operação. DB/Redis3000ms e storage5000ms
partem juntos; storage informa, uma falha core degrada200, ambas dão unhealthy503.
Precisão de relógio simulado não é SLA/prova produtiva; cache/S3/HTTP reais ficam fora.
[Provas/gates/mutações](../sessions/DONE-2026-09-30-2333-e21-health-deadline-tests.md).

P-022 parcial. Próximo candidato independente: CampaignService.start/resume
(`campaigns/application/campaign.service.ts:59-80`), offset/jitter inclusivo/delay
acumulado/época/jobId e falha parcial, por portas falsas/Math.random/relógio controlados.
Não foi encontrado spec dedicado; e2e fixa min=max1 ou12 e prova recuperação/8s,
não fronteiras aleatórias. Conferir a lacuna e registrar recorte antes de implementar,
sem exportar randInt nem mexer no worker. StripRaw/HMAC já têm provas de efeito no
webhook-bullmq6.e2e-spec/crypto.spec; C10 exige prova própria Prisma/SQL/default.
P-100/P-101/P-102 abertas/P-099 sem drenar, demais gates/publicação manuais preservados.

## Continuação — agendamento CampaignService.start/resume (01/10/2026, base8987018)

Lacuna reconfirmada após PR34/health: não existia spec dedicado ao serviço; os e2e
recovery/BullMQ6 fixam min=max1/12 e scheduledAt null, provando recuperação/fila/8s.
O novo campaign-scheduling.spec chama start/resume reais com repo/queue falsos,
Date e Math.random controlados, sem exportar randInt nem alterar runtime/worker.
Resultados literais cobrem offset futuro/passado/igual/null, jitter inclusivo e
fronteiras internas, primeiro atraso/soma/ordem, epoch devolvida pelo CAS (inclui0)
e jobId, startedAt/status/no-op/CAS perdida. Falhas pré-schedule não pausam;
list/queue rejeitados pausam a mesma época; falha parcial não agenda o restante e
resume posterior agenda todos PENDING em outra época. Barreiras verificam enqueue
serial, winner/loser CAS e pausa aguardada, inclusive count0. Se pause falha, seu
erro substitui o original conforme política existente, que não foi alterada.
[Provas/gates/mutações](../sessions/DONE-2026-10-01-0058-e21-campaign-scheduling-tests.md).

As portas falsas provam o contrato do serviço, sem nova prova de CAS SQL, jobs Redis,
worker ou pontualidade de entrega. Essas provas de efeito continuam nos e2e existentes.
Reconciliadas descrições antigas de prefixo resume-timestamp e requeue PAUSED no mapa;
nenhuma mudança de política, API, deps, schema ou operação produtiva neste recorte.

P-022 permanece parcial. Próximo recorte independente C10: getState omite eventTs no
create, schema tem @default(now()) e migration DEFAULT CURRENT_TIMESTAMP. Fakes
atuais assumem data; não decidem a origem do default nem comprovam ordenação contra
clock Node/TimeZone SQL. Exige fixture Prisma/SQL isolada, relógio/TimeZone explícitos
e eventos antigo/igual/novo pelo serviço real; não aplicar correção por hipótese.
StripRaw/HMAC já têm provas de efeito. P-100/P-101/P-102 abertas/P-099 sem drenar,
gates/publicação/canários manuais preservados.

## Continuação — C10 GuardrailService.getState/apply (01/10/2026, baseb842d4b)

Dois specs com30testes por serviço/ReplyRate/Prisma/SQL/EventBus reais cobrem origem
eventTs/default, ordenação antigo/igual/novo, bootstrap/consumidores, CAS/P2002
concorrentes e limite4writes. Fixture aplica migrations versionadas em schema
local exclusivo, sem copiar dados reais; relógio controla somente Date e barreiras
de Promise ordenam concorrência/efeitos, sem sleep arbitrário.

Prisma Client/adapter7.10.0/engine0edf envia eventTs/updatedAt gerados pelo Node no
INSERT getState, embora DEFAULT CURRENT_TIMESTAMP exista no DDL. Seis caminhos
autocommit/transação×UTC/SãoPaulo/Tokyo confrontam SQL/params/valor persistido com
Node2001 e SQL atual. Três INSERTs SQL omitindo eventTs comprovam default real do
banco, horário da mesma transação e deslocamento da coluna sem fuso pelo adapter.
Hipótese de defaultDB/fuso no getState descartada; fonte primária da versão
instalada explica a materialização cliente. [Fontes/provas/limites](../sessions/DONE-2026-10-01-0213-e21-guardrail-c10-tests.md).

Dezessete mutações recusadas por assertions, com controles30/30 antes/depois;
um mutante retryP2002→throw causou dois erros semânticos e foi contabilizado à parte.
P-022 permanece parcial. **P-104 nova, reproduzida localmente:** empate após
getState conserva ativa no override manual; evaluate retorna applied=true/target
aquecimento sem escrever/emitir. Runtime atual foi caracterizado, não corrigido;
próximo recorte delimita bootstrap/resultado efetivo sem abrir eventos explícitos
antigos/iguais. Nenhuma ocorrência ou TimeZone de produção consultada. P-100/P-101/
P-102 abertas/P-099 sem drenar; publicação/canários/gates anteriores mantidos.

## Continuação — P-104 bootstrap C10 e retorno efetivo (01/10/2026, base57267e7)

A reprodução anterior foi convertida em regressões red/green: bootstrap sem
transição recebe eventTs=epoch explícito em getState e no create de registro de
sinal, com updatedAt atual. getState preserva releituras; bootstrap não zera/reclassifica eventTs legado.
apply público mantém retorno de linha; helper privado conserva C10/CAS/P2002
e retorna autoria de transição. evaluate.applied só é true quando esta chamada
ganha escrita e muda state. Vencedor no mesmo target/timestamp, retry que só
renova metadados e derrota terminal retornam false.

SQL/gate/EventBus reais e barreiras verificam primeira aplicação no mesmo relógio,
consumidores/observe/sinais, antigos/iguais explícitos, CAS/retry/P2002. Controles
ORM omitido e SQL omitido preservam a prova de origem do default7.10 e fuso.
Não há migration/default/fuso/dep/API nova ou garantia nova de entrega webhook.
[Provas/fontes/limites](../sessions/DONE-2026-10-01-0736-e21-guardrail-bootstrap.md). P-022 parcial; P-104 concluída em código.

P-105 separada: cron Advisories da main identificou sharp0.35.4 vulnerável
(GHSA-wq5f-xc86-pv6w high), com correção oficial0.35.5. Não alterada em P-104;
próximo recorte deve validar patch/lock/imagens locais/CI sem WhatsApp.
P-100/P-101/P-102 abertas/P-099 sem drenar; publicação/canários/gates mantidos.

## Continuação — P-105 sharp/librsvg (02/10/2026, base cbb40a9)

Atualização nomeada de 27 entradas sharp/@img: sharp 0.35.5 e libvips 1.3.4,
com manifests/allowScripts e patches preservados. Loader Baileys importa sharp dentro
dos helpers; a guarda de import anterior não provava binding/libvips. Smoke explícito
na imagem final pós-prune, como node e sem rede, usa PNG/SVG sem recursos externos e
helpers reais para conferir seis JPEGs, dimensões e pixels. Host darwin/arm64 e imagem
Linux x64/glibc 2.36 aprovados, rsvg 2.63.2/vips 8.18.7; outros targets não executados.
[Provas/fontes/revisão/limites](../sessions/DONE-2026-10-02-1043-e21-sharp-p105.md).

Advisories estrito: uma pendência → zero, sem aceite novo. npm audit continua exit 1,
com vulnerabilities idêntico antes/depois: 1 moderate/14 high em 15 pacotes/13 GHSAs.
P-106 registra triagem residual separada, vinculada a P-038/P-062; cadeias Prisma e
extract-zip já têm contexto em §7.5, enquanto basic-ftp/brace-expansion/ip-address
precisam triagem detalhada atual. Primeiro candidato: brace-expansion 2.1.4 em duas
cadeias WWEBJS/archiver/minimatch 9 e 5. Mapear pais/cópias/faixas/alcance build/dev/runtime
antes de qualquer correção: RemoteAuth usa archiver, mas gateway usa FencedLocalAuth.
Presença não comprova entrada não confiável nem exploração produtiva. Sem major,
downgrade, override ou aceite por hipótese; nenhuma dependência residual alterada.

P-022 parcial, P-100/P-101/P-102 abertas e P-099 sem drenar; D-047/D-048/D-049/D-050,
P-104 e publicação/canários/gates manuais anteriores preservados. Nenhuma consulta ou
operação produtiva, conta/QR/check/envio real. PR/CI/merge finais são canônicos no PR.

## Continuação — P-106 brace-expansion 2.x (02/10/2026, base 130e8bdf)

Recorte corrigido em código: somente as duas cópias optional/runtime 2.1.4 passam
para 2.1.7. P-106 permanece parcial para os demais residuais e as cópias dev.
A atualização nomeada gerou quatro candidatos em cópia descartável; apenas os dois
objetos 2.x regenerados foram retidos. npm ci estrito valida lock/resolução, sem
major, override, downgrade, dependência direta ou aceite novo.

| Cadeia/cópia baseline                                                                                   | Faixa do pai imediato | Uso e destino                                         |
| ------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------- |
| WWEBJS1.34.7 → archiver7.0.1 → archiver-utils5.0.2 → glob10.5.0 → minimatch9.0.9 → brace-expansion2.1.4 | ^2.0.2                | Optional/runtime; corrigida para2.1.7                 |
| WWEBJS → archiver → readdir-glob1.1.3 → minimatch5.1.9 → brace-expansion2.1.4                           | ^2.0.1                | Optional/runtime; corrigida para2.1.7                 |
| Nest CLI11.0.24 → fork-ts-checker-webpack-plugin9.1.0 → minimatch3.1.5 → brace-expansion1.1.18          | ^1.1.7                | Dev/build; inventariada, fora do recorte, segue P-106 |
| ESLint/TS-eslint → minimatch10.2.6 → brace-expansion5.0.9                                               | ^5.0.8                | Dev; inventariada, fora do recorte, segue P-106       |

Fontes oficiais consultadas02/10: [6j4f](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p)
fix2.1.5; [qhr7](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-qhr7-859c-m2p7)
fix2.1.6; [q2hr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) fix2.1.7.
[Compare oficial](https://github.com/juliangruber/brace-expansion/compare/v2.1.4...v2.1.7)
preserva CommonJS/balanced-match e não adiciona lifecycle install. Os três descrevem
DoS ao receber padrão não confiável; nenhum payload de DoS foi executado.

Alcance confirmado por fonte instalada: WWEBJS index.js:32 importa RemoteAuth,
que requer archiver em src/authStrategies/RemoteAuth.js:7. Gateway importa WWEBJS,
mas configura FencedLocalAuth extends LocalAuth (wwebjs.engine.ts:93/916).
compressSession:200-218 chama directory(tempDir,false), que fornece somente
stat/dot a readdir-glob (archiver/lib/core.js:632-635/679); readdir-glob/index.js:130-157
só cria Minimatch com pattern/ignore/skip. Expansão da cadeia9 existe em
archiver-utils/file.js:53-65; archive.glob usa cadeia5 (core.js:725-752).
Busca em src/test/scripts não encontrou invocação RemoteAuth ou padrão do produto
nesses caminhos. Import puro carregou archiver e as duas cópias, sem chamar expansão.
Presença/carregamento não demonstram exploração nem ausência global de risco;
nenhuma versão/incidente produtivo foi consultado. Dashboard não instala gateway e
publica só bundle/nginx. Runtime do gateway retém optional após prune.

Baseline sintética com2.1.4 e smoke com2.1.7 comprovam seleção/exclusão pelos pais
reais e ZIP/conteúdo/directory, sem Client/rede/extração. Gate na imagem final
exige ambas as versões corrigidas após prune, como node/sem rede; sharp smoke
permanece intacto. [Provas, controles, revisão e limites](../sessions/DONE-2026-10-02-2045-e21-brace-expansion-p106.md).

npm audit --omit=dev baseline confirmou vulnerabilities idêntico à P-105;
após o recorte, somente brace-expansion e seus três GHSAs saíram. Demais objetos
vulnerabilities permanecem integralmente idênticos. npm audit continua exit1;
contagens medidas estão no DONE. Advisories estrito nos repos configurados passou,
sem aceite novo; não substitui o audit residual. Prisma/mysql2/deepmerge e
Puppeteer/extract-zip continuam vinculados a P-038/P-062 e auditoria §7.5,
sem pendências duplicadas. Próximo candidato independente: triagem basic-ftp,
sem atualização automática; cópias dev1/5 continuam explicitamente P-106.

P-022 parcial; P-100/P-101/P-102 abertas/P-099 sem drenar. D-047/D-048/D-049/D-050,
P-104/C10/default/CAS/P2002 e publicação/canários/gates manuais preservados.

## Continuação — P-106 basic-ftp (02/10/2026, base 8f7ca681)

**Triagem concluída; dependência não corrigida e risco não aceito.** Uma cópia
runtime de basic-ftp5.3.1 permanece no lock. O advisory oficial
[GHSA-c475-qrg2-pj4r](https://github.com/patrickjuchli/basic-ftp/security/advisories/GHSA-c475-qrg2-pj4r)
afeta <=6.2.0, corrigido em6.2.1. O [registry oficial](https://registry.npmjs.org/basic-ftp)
consultado02/10 tem latest6.2.1 e última5.x=5.3.1, sem backport publicado.
get-uri6.0.5 exige ^5.0.2; até get-uri latest8.0.1 exige ^5.3.1, sem solução
compatível publicada encontrada. 6.2.1 é major fora da faixa; o
[changelog6.0](https://github.com/patrickjuchli/basic-ftp/blob/v6.2.1/CHANGELOG.md)
documenta bloqueio de hosts separados de transferência por padrão.
Nenhuma atualização, major, downgrade, override, patch novo ou aceite foi aplicado.

fixAvailable=false descreve a remediação calculada pelo scanner para a árvore,
sem negar a correção upstream. A restrição pelas faixas é inferência apoiada no
lock/registry e [cálculo de metavulnerabilidades do npm](https://docs.npmjs.com/cli/v11/commands/npm-audit/#calculating-meta-vulnerabilities-and-remediations).
Audit --omit=dev antes/depois mantém vulnerabilities integralmente idêntico e exit1;
contagens e comandos ficam no [DONE](../sessions/DONE-2026-10-02-2138-e21-basic-ftp-p106.md).

| Pai instalado                   | Faixa declarada do filho   | Uso observado                                            |
| ------------------------------- | -------------------------- | -------------------------------------------------------- |
| WWEBJS1.34.7                    | puppeteer 24.38.0 (exato)  | Engine runtime; pin/SHA e patches preservados            |
| puppeteer/puppeteer-core24.38.0 | @puppeteer/browsers 2.13.0 | Download/gestão de browsers; Chromium externo no produto |
| @puppeteer/browsers2.13.0       | proxy-agent ^6.5.0         | Transporte HTTP dos downloads de tooling                 |
| proxy-agent6.5.0                | pac-proxy-agent ^7.1.0     | PAC carregado sob demanda, inclusive pac+ftp             |
| pac-proxy-agent7.2.0            | get-uri ^6.0.1             | Carregamento do arquivo PAC                              |
| get-uri6.0.5                    | basic-ftp ^5.0.2           | FTP; LIST como fallback da data MDTM                     |

Fonte instalada: lock:6525/9080/11132; proxy-agent/dist/index.js:47/62/121
faz lazy load do PAC; pac-proxy-agent/dist/index.js:132 chama getUri.
get-uri/dist/ftp.js:34/44/55 acessa FTP, tenta lastMod e chama list se MDTM não
produzir data. basic-ftp/dist/Client.js contém list/_list e parseListUnix.js:40-46
conserva os dois quantificadores ambíguos. O
[commit corretivo oficial](https://github.com/patrickjuchli/basic-ftp/commit/d0d9e07c56e519587bb50532ac6eadbb0cb0cfe9)
ancora regex Unix/DOS e limita owner/group; leitura estática, sem payload hostil.
Pacote e pais não têm dev:true nem optional:true; são retidos após prune.

**Build/dev:** Puppeteer lifecycle negado por allowScripts, skip download em
CI/Dockerfiles; não foi encontrado comando do produto para browser install/PAC.
O painel instala somente seus workspaces e publica bundle/nginx, sem essa cadeia.
**Runtime:** WWEBJS usa executablePath/Chromium externo e proxy-server; os tipos de
proxy do produto são HTTP/HTTPS/SOCKS4/SOCKS5, sem PAC. safe-fetch.ts:111-114
recusa esquemas fora de HTTP/HTTPS antes do transporte. O import WWEBJS isolado
carrega browsers/proxy-agent, mas não PAC/get-uri/basic-ftp. Isto não garante que
uma chamada futura/manual ao tooling nunca possa receber PAC FTP; envs/proxies
reais e estado produtivo não foram consultados. Não foi demonstrada entrada FTP
não confiável pelo fluxo examinado do produto; o caminho da biblioteca permanece.

Prova sintética offline: import sem Client WhatsApp/socket; parse de duas linhas
Unix normais; getUri com access/lastMod/list/downloadTo falsos. MDTM positivo evita
LIST; sem MDTM, Unix alcança o parser antes de ENOTFOUND (modifiedAt ausente), MLSD
normal alcança parser/download. Zero tentativa de conexão; não prova resistência
à CPU, correção ou exploração. A mesma prova passou no artefato pruned anterior,
como node/sem rede; smokes sharp/brace intactos reexecutados. Novo PR documental
passa por CI/imagens; detalhes/limites no DONE.

P-106 permanece parcial para basic-ftp, brace dev1/5 e demais residuais.
Responsável: equipe gateway; reavaliar upstream em02/11/2026 (cadência R17) ou
antes se houver backport5.x/pai compatível, em recorte próprio. Próximo candidato
independente: ip-address, com inventário/GHSAs do audit reconfirmados antes de
qualquer edição; não triado/corrigido nesta sessão. Prisma/mysql2/deepmerge e
Puppeteer/extract-zip continuam P-038/P-062/§7.5, sem duplicar pendências.
P-022 parcial/P-100/P-101/P-102 abertas/P-099 sem drenar; gates operacionais,
publicação, stop-first e snapshots E21 permanecem manuais.

## Continuação — P-106 ip-address (04/10/2026, base fb00f9b3)

**Recorte corrigido em código; P-106 permanece parcial.** Uma única cópia runtime
regular em `node_modules/ip-address`:10.5.0→10.7.1. Lock:9470 altera apenas versão,
resolved e integrity; nenhum pai/manifest/override/allowScripts/patch/aceite novo.
Instalação estrita confirma resolução deduplicada e patches existentes.

| Pai imediato instalado    | Faixa ip-address | Resolução e uso                                   |
| ------------------------- | ---------------- | ------------------------------------------------- |
| @fastify/rate-limit11.2.0 | ^10.2.0          | Mesma cópia10.7.1; normalização do IP do request  |
| socks2.8.9                | ^10.1.1          | Mesma cópia10.7.1; conversão e serialização SOCKS |

`socks` é compartilhado por proxy-chain2.7.1 e quatro socks-proxy-agent:10.1.0
na raiz e8.0.5 aninhados em proxy-chain/proxy-agent/pac-proxy-agent. Todos exigem
socks^2.8.3, deduplicado2.8.9. `npm ls`/`npm explain`, lock e inventário físico
confirmam somente uma ip-address, sem cópia dev isolada. Preservada após prune.

### Fontes oficiais e alvo mínimo

Consultadas ao vivo04/10/2026; advisories do mantenedor e base revisada concordam:

| Advisory                                                                                              | Afetadas          | Primeira corrigida | Condição da falha                                                   |
| ----------------------------------------------------------------------------------------------------- | ----------------- | ------------------ | ------------------------------------------------------------------- |
| [rpw4-54j3-4h4q](https://github.com/beaugunderson/ip-address/security/advisories/GHSA-rpw4-54j3-4h4q) | <=10.5.0          | 10.5.1             | isLinkLocal restringia indevidamente link-local a /64 em vez de /10 |
| [2vr4-cq9g-pvrc](https://github.com/beaugunderson/ip-address/security/advisories/GHSA-2vr4-cq9g-pvrc) | >=10.2.0 <=10.5.0 | 10.5.1             | isPrivate não reconhecia NAT64 local-use64:ff9b:1::/48              |
| [j6r3-76f7-8jcv](https://github.com/beaugunderson/ip-address/security/advisories/GHSA-j6r3-76f7-8jcv) | <=10.7.0          | 10.7.1             | Contenção de subnet comparava famílias distintas                    |
| [h3mg-xc3c-68pw](https://github.com/beaugunderson/ip-address/security/advisories/GHSA-h3mg-xc3c-68pw) | <=10.7.0          | 10.7.1             | Diagnóstico do parser crescia com string não limitada               |

[Registry oficial](https://registry.npmjs.org/ip-address) confirma10.7.1 publicada
15/09/2026; latest10.7.3 não é o alvo deste recorte. Mínimo comum10.7.1 nas duas
faixas dos pais; Node>=12, CommonJS/main/types e zero dependencies preservados.
Não há10.5.2/10.6.1 publicado;10.5.1 corrige somente dois dos quatro. Registries
[socks2.8.9](https://registry.npmjs.org/socks/2.8.9) e
[rate-limit11.2.0](https://registry.npmjs.org/@fastify%2frate-limit/11.2.0)
confirmam as faixas exatas. SHA512 do tarball10.7.1 conferido contra registry.

Não há CHANGELOG nessa tag. A [release10.7.1](https://github.com/beaugunderson/ip-address/releases/tag/v10.7.1)
menciona dev lock, mas o [compare10.5.0...10.7.1](https://github.com/beaugunderson/ip-address/compare/v10.5.0...v10.7.1)
contém os fixes: [d03e960/link-local](https://github.com/beaugunderson/ip-address/commit/d03e960c7cc3179ef25c8a44b4f94dd499625546),
[ab3dc88/NAT64](https://github.com/beaugunderson/ip-address/commit/ab3dc88bcf5374344168a2ba075ca7ac4ff257f8),
[1343629/famílias](https://github.com/beaugunderson/ip-address/commit/1343629d57fea413644a5c9d41ff1e59619f3f28),
[469ead1/limite](https://github.com/beaugunderson/ip-address/commit/469ead1231b4cc059f2150c626e1e0c2895c0134)
via [8b34a21](https://github.com/beaugunderson/ip-address/commit/8b34a21e0839b37c094066816fb2c2c48a2adcf5).
Tarball confirma common.js:52, ipv6.js:153–158/1084/1197 e ipv4.js:82–87.
Context7 `/beaugunderson/ip-address` consultado; docs main confrontadas com a tag/
fonte empacotada, sem substituir evidência de versão. A
[política oficial](https://github.com/beaugunderson/ip-address/blob/v10.7.1/SECURITY.md)
não mantém LTS e exige considerar DNS/redirect/socket na defesa SSRF.

### Consumidores e entrada não confiável

**Runtime HTTP:** FastifyAdapter usa trustProxy:true (`bootstrap/fastify-adapter.ts:14`),
main.ts:67–68 registra rate-limit, rate-limit.ts:36–46 não troca keyGenerator.
`@fastify/rate-limit/index.js:32–48/58` normaliza req.ip: net.isIPv6 precede
Address6, isMapped4/to4/correctForm ou startAddress(/64). IP do request/forwarded
é entrada HTTP possível; configuração real de Traefik/headers não consultada.
Não usa classificadores especiais de confiança como isLinkLocal/isPrivate.
isMapped4 chama isHostInSubnet internamente entre Address6; não foi demonstrada
comparação entre famílias pelo consumidor. Presença do parser não prova que
string grande alcance o diagnóstico: net.isIPv6 filtra antes do construtor.

**Runtime SOCKS:** factory.ts:15–20 cria SocksProxyAgent para SOCKS4/5;
proxy-resolver.service.ts:196–218 escolhe Agent usado pelo Baileys socket/upload.
Health-tester:24–30 usa a mesma factory; resposta ipify não passa pelos classificadores.
socks-proxy-agent/dist/index.js:93–107/128 resolve destino/chama SocksClient.
socks/build/common/helpers.js:104–110/147–160 limita destino e valida net.isIPv4/6
antes de Address4.toArray/Address6.canonicalForm. Resposta IPv6 do protocolo tem
16bytes, convertida por fromByteArray/canonicalForm (socksclient.js:679–688).
UDP é API da biblioteca, sem caller do produto encontrado. Destino/config/protocolo
podem fornecer dados, mas nestes caminhos foram observadas conversões, não decisões
SSRF com classificadores especiais. Mídia recebida com SOCKS continua recusada
(factory.ts:25–28/resolver:215–218), sem fallback direto novo.

WWEBJS usa anonymizeProxy (`wwebjs.engine.ts:887–895`): proxy-chain
chain_socks.js:47–58/forward_socks.js:25–36 também converge nessa cópia.
Tooling Puppeteer/browsers→proxy-agent e PAC→socks-proxy-agent convergem em socks;
PUPPETEER_SKIP_DOWNLOAD/allowScripts negam o download conhecido no install.
Não há tipo PAC na API de proxies. Não inferir impossibilidade futura/manual
ou reabrir as triagens Prisma/Puppeteer de P-038/P-062. Build/dev carregam esses
módulos nos testes/ferramentas; compilação não processa IP remoto por si só.
Dashboard instala seus workspaces e publica bundle/nginx, sem esta cópia runtime.

**Egress separado:** `safe-fetch.ts:2/95–102/104–122/133–171/235–269` usa
Node net.BlockList/isIP, URL WHATWG, DNS e revalidação de redirects. Media-url,
fotos, campanhas e webhooks chegam a esse helper, sem import de ip-address.
Fixture recusa cinco destinos privados pequenos sem chamar ip-address. Não
comprova DNS rebinding, topologia real, resistência DoS ou exploração produtiva.
Nenhuma consulta/ação de produção, conta/QR/contact-check/envio real.

### Validação e residual

`scripts/smoke-ip-address.cjs` exige linha10/piso10.7.1 e mesma resolução pelos dois
pais, exerce módulos reais do dist para rate-limit/SOCKS/egress. Fixtures pequenas
provam bytes SOCKS4/5, /64 e IPv4 mapeado, classificadores corrigidos e famílias
separadas. Entrada fixa46 caracteres, só um além de45 após remover CIDR/zone,
prova AddressError sem parseMessage; não é teste de carga/DoS/CPU/memória.
Sockets/DNS/TLS/fetch negados, zero tentativa de rede; UDP só API sintética separada.
Dockerfile executa no estágio final após prune, como node/sem rede, junto aos
smokes brace/sharp intactos, e remove os scripts. Controles negativos, suites,
imagens, revisão e evidências/limites no [DONE](../sessions/DONE-2026-10-03-2332-e21-ip-address-p106.md).

Audit --omit=dev remove somente ip-address/quatro GHSAs; demais objetos
vulnerabilities integralmente idênticos e exit1. P-106 parcial: basic-ftp5.3.1
segue afetado, sem correção/aceite; brace dev1.1.18/5.0.9 e demais residuais abertos.
Próximo candidato independente: brace-expansion dev1/5, inventário e audit completo
reconfirmados antes de editar; não analisado/corrigido aqui. Prisma/Puppeteer
permanecem P-038/P-062, sem duplicação. P-022 parcial/P-100/P-101/P-102 abertas/
P-099 sem drenar; contratos/patches/allowScripts e D-047/48/49/50/P-104 preservados.
Publicação/canários C/D/E/F/B-004/B-005/B-007, stop-first e snapshots7dias/24h manuais.

## Continuação — P-106 brace-expansion dev 1/5 (04/10/2026, base 1ab06ee)

**Recorte corrigido em código; P-106 permanece parcial.** Fetch confirmou
`origin/main=1ab06ee97c887ac4cdeae2e347785ce1bbe448a1` após PR #42, antes da nova
feature. Somente duas entradas `dev:true` do lock passam de 1.1.18→1.1.21 e
5.0.9→5.0.12; seis campos (`version`, `resolved`, `integrity`). `npm update brace-expansion --package-lock-only --ignore-scripts --no-audit --no-fund` nomeado no checkout e numa cópia descartável
gerou objetos idênticos; o diff retém somente os dois objetos dev autorizados.
`npm ci` estrito passou com aplicação dos patches existentes. Pais/manifests,
overrides, allowScripts e instalação estrita permanecem intactos; sem major,
downgrade, dependência direta ou aceite novo.

### Fontes oficiais, faixas e mínimo comum

Consultadas ao vivo em04/10/2026: [advisories do mantenedor](https://github.com/juliangruber/brace-expansion/security/advisories),
[base oficial revisada](https://api.github.com/advisories?ecosystem=npm&affects=brace-expansion&per_page=100)
e [registry npm](https://registry.npmjs.org/brace-expansion). A base revisada lista
dez GHSAs do pacote; o repositório lista oito, sem os dois antigos2017/2025.
Somente estes três afetam as versões dev instaladas no baseline:

| Advisory                                                                 | Faixa afetada na linha1 | Fix1   | Faixa afetada na linha5 | Fix5   | Falha descrita                                                       |
| ------------------------------------------------------------------------ | ----------------------- | ------ | ----------------------- | ------ | -------------------------------------------------------------------- |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | <1.1.19                 | 1.1.19 | >=4.0.0,<5.0.10         | 5.0.10 | Recursão/append de arrays no parser de partes separadas por vírgulas |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | <1.1.20                 | 1.1.20 | >=4.0.0,<5.0.11         | 5.0.11 | Recursão de grupos aninhados                                         |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | <1.1.21                 | 1.1.21 | >=4.0.0,<5.0.12         | 5.0.12 | Custo quadrático ao reescrever grupo literal seguido de conjunto     |

Os sete advisories anteriores já estavam fora das duas versões dev no baseline;
não são sete correções novas desta etapa:

| Advisory                                                                 | Primeira corrigida1 | Primeira corrigida5 | Situação de1.1.18/5.0.9 |
| ------------------------------------------------------------------------ | ------------------- | ------------------- | ----------------------- |
| [GHSA-832h-xg76-4gv6](https://github.com/advisories/GHSA-832h-xg76-4gv6) | 1.1.7               | Linha5 não afetada  | Fora das faixas         |
| [GHSA-v6h2-p8h4-qcjw](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw) | 1.1.12              | Linha5 não afetada  | Fora das faixas         |
| [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) | 1.1.13              | 5.0.5               | Fora das faixas         |
| [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2) | Linha1 não listada  | 5.0.6               | Fora das faixas         |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | 1.1.16              | 5.0.7               | Fora das faixas         |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | 1.1.17              | 5.0.8               | Fora das faixas         |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | 1.1.18              | 5.0.9               | Fora das faixas         |

Mínimos comuns1.1.21/5.0.12 publicados14/09/2026; são também os últimos patches
publicados dessas linhas no registry. `maintenance-v1=1.1.18` é uma tag antiga,
sem substituir `1.x=1.1.21`; `latest=5.0.12`. 1.1.19/5.0.10 e1.1.20/5.0.11
corrigiriam apenas parte dos três advisories.
[Compare1.x](https://github.com/juliangruber/brace-expansion/compare/v1.1.18...v1.1.21)
e [compare5.x](https://github.com/juliangruber/brace-expansion/compare/v5.0.9...v5.0.12)
confirmam os commits corretivos; tags finais1.1.21=`8e81e187` e5.0.12=`f3410159`.
Tarballs dos baselines e alvos tiveram SHA512 conferido contra o registry.

**Compatibilidade verificada:**1.x preserva função CommonJS/`main=index.js`, sem
engine Node declarada, `balanced-match:^1.0.0` e `concat-map:0.0.1`; metadata muda
só versão. 5.x preserva `type:module`, exports condicionais CJS/ESM e tipos,
`node:20 || >=22` e `balanced-match:^4.0.2`; metadata muda versão e acrescenta
script editorial `format:check`, sem mudança de lifecycle de instalação.
Código/tarball substitui recursão/`push.apply` do parser por iteração e adiciona
`maxDepth=1000`/`maxRewrites=1000`, preservando `max`/`maxLength` e API anterior.
5.x acrescenta constantes/opções/tipos de forma aditiva. Os novos limites podem
retornar literalmente trechos que ultrapassam o teto; sem inferir equivalência
para toda entrada ou executar payload de DoS. Fixtures pequenas e consumidores
reais são a validação deste recorte, com resultados no DONE.

### Consumidores, alcance e limites

Inventário físico/lock/`npm ls`/`npm explain` confirmam quatro cópias: estas duas
dev e duas optional/runtime2.1.7 da cadeia WWEBJS/archiver, que permanecem intactas.

| Cópia alterada                                                                        | Pais imediatos e faixas                                                                                                                                  | Consumo observado                                                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `fork-ts-checker-webpack-plugin/node_modules/brace-expansion`1.1.18→1.1.21; lock:8908 | minimatch3.1.5/^1.1.7; fork9.1.0 usa minimatch^3.0.4; Nest CLI11.0.24 fixa fork9.1.0                                                                     | Filtro de issues e padrões ignored do watcher, quando fork é ativado no webpack                     |
| `node_modules/brace-expansion`5.0.9→5.0.12; lock:6571                                 | minimatch10.2.6/^5.0.8; ESLint10.11.0/^10.2.5, config-array0.23.5/^10.2.4, typescript-estree8.71.0/^10.2.2 e glob13.0.6/^10.2.2 convergem em minimatch10 | Configuração files/ignores e globs CLI do ESLint; opções de parser e assets Nest quando habilitadas |

**Dev1/build:** fonte instalada `fork-ts-checker-webpack-plugin/lib/issue/issue-match.js:10–17`
separa padrão `match.file` do caminho relativo `issue.file`; `issue-config.js:19–26`
monta include/exclude. `watch/inclusive-node-watch-file-system.js:14–32/49` usa
`watchOptions.ignored`. CLI `lib/compiler/defaults/webpack-defaults.js:87–94`
instancia fork no webpack; `actions/build.action.js:74–95/122–134` escolhe
compilador/watch. `apps/gateway/nest-cli.json:5–8` não declara webpack/assets;
os defaults instalados (`lib/configuration/defaults.js:14–22`) são
tsc/false/[]. Assim, o caminho fork está instalado, mas não é acionado pelo gateway:build atual.
A [documentação oficial fork9.1.0](https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/blob/v9.1.0/README.md)
confirma a semântica de includes/excludes como glob; não demonstra alcance produtivo.

**Dev5:** `eslint.config.mjs:9–20/25/29` contém ignores e padrão dashboard `{ts,tsx}`
real. Fonte instalada `@eslint/config-array/dist/cjs/index.cjs:412–429` compila
padrões; `eslint/lib/eslint/eslint-helpers.js:603–617/285–291` converte globs CLI.
A [documentação oficial ESLint](https://eslint.org/docs/latest/use/configure/configuration-files#specifying-files-and-ignores)
confirma minimatch para files/ignores. Parser `@typescript-eslint/typescript-estree/dist/useProgramFromProjectService.js:243–244`
oferece allowDefaultProject; configuração atual não habilita projectService.
A [documentação oficial do parser](https://typescript-eslint.io/packages/parser/#allowdefaultproject)
confirma que é opção de glob, sem tornar esse caminho ativo no projeto. CLI
`lib/compiler/assets-manager.js:37–39` retorna sem assets; quando configurados,
`:45–53/71–92` expande includes/excludes via glob13.0.6.

**Entrada e runtime:** padrões observados vêm de configs/CLI do repositório;
arquivos lintados/issues fornecem caminhos, não padrões. Busca em TS do produto
não encontrou import brace/minimatch/glob/fork, nem request/mensagem WhatsApp
chegando às cópias dev1/5. Isto delimita o fluxo examinado, sem provar ausência
global ou impedir uso futuro/manual de tooling com configuração não confiável.
`apps/gateway/Dockerfile:43–48` remove dev com prune; as duas runtime2.1.7 e os
smokes finais permanecem. Dashboard publica bundle/nginx
(`apps/dashboard/Dockerfile:28–30`). Inventário da imagem desta etapa, node/sem
rede, e demais resultados ficam no [DONE](../sessions/DONE-2026-10-04-0852-e21-brace-dev-p106.md);
nenhum estado/versionamento produtivo foi consultado. Presença no lock, import
ou êxito de build não provam exploração. Nenhum padrão hostil, PoC ou acesso
externo para exploração foi executado.

### Validação, residual e próximo candidato

Audit completo antes/depois: exit1,0moderate/18high→17high,
18pacotes/10GHSAs→17pacotes/7GHSAs. Saíram somente brace-expansion e seus três
GHSAs; todos os objetos `vulnerabilities` sobreviventes são integralmente
idênticos. `--omit=dev` segue exit1,0moderate/13high,13pacotes/6GHSAs, com todos
os objetos `vulnerabilities` integralmente idênticos ao baseline/PR #42.

Baseline reconstruído redireciona somente a resolução das duas brace-expansion
no processo para os tarballs oficiais1.1.18/5.0.9, preservando os pais/consumidores
reais atuais; passa com rede negada/zero tentativas. Não é uma instalação npm
antiga completa. Fixture candidata exerce os mesmos consumidores reais dev1/dev5
com padrões pequenos normais, rede negada e zero tentativas; positiva passa e
quatro controles negativos falham pelas assertions específicas, sem copiar implementação ou usar
payload DoS. Fixtures benignas não provam resistência CPU/memória/stack para toda
entrada. Comparações audit/controles/suites/gates/imagens e limites ficam no
[DONE](../sessions/DONE-2026-10-04-0852-e21-brace-dev-p106.md); PR/CI/merge finais
são canônicos no PR único. npm audit residual permanece exit1.

P-106 permanece parcial: basic-ftp5.3.1 segue afetado, fix6.2.1 major fora de
^5.0.2/sem backport5.x encontrado, sem correção ou aceite. Próximo candidato
independente observado somente no audit: `braces3.0.3/GHSA-vfj7-8cjw-p6xm`, via
micromatch/find-yarn-workspace-root/patch-package; ainda não triado/corrigido,
sem ampliar esta etapa para a cadeia. Prisma/Puppeteer seguem P-038/P-062/§7.5,
sem duplicação. Brace runtime2.1.7/ip-address10.7.1/sharp0.35.5/librsvg2.63.2 e
os três smokes permanecem preservados. P-022 parcial/P-100/P-101/P-102 abertas/
P-099 sem drenar; contratos/guardas/patches/allowScripts/arquivos locais intactos.
Nenhuma conta/QR/contact-check/envio real, produção/Dokploy/deploy/canário;
publicação/canários C/D/E/F/B-004/B-005/B-007, stop-first e snapshots E21
7dias/24h continuam manuais.

## Continuação — P-106 braces (04/10/2026, base d19f056)

**Triagem documental concluída; pacote afetado, sem atualização compatível
corrigida publicada encontrada. P-106 permanece parcial/aberta, sem aceite.**
Fetch confirmou `origin/main=d19f056e5006b4ee18e0a0638a1979ba0d6de4c4` após
PR #43 antes da nova feature. `braces` é um pacote distinto de
`brace-expansion`; nenhuma versão, manifest, lock, patch, override ou decisão
de instalação foi alterada neste recorte. Entendimento, viabilidade, impacto
e validação foram apresentados antes de registrar a decisão documental.

### Fontes oficiais e viabilidade

Consultadas em 04/10/2026: [advisory GitHub revisado
GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
[registry npm](https://registry.npmjs.org/braces),
[tags upstream](https://github.com/micromatch/braces/tags) e
[compare 3.0.3/master](https://github.com/micromatch/braces/compare/3.0.3...master).
O advisory high/CVE-2026-93687, atualizado em 02/10, afeta `<=3.0.3` e não
declara primeira versão corrigida. A falha descrita é exaustão de stack por
walkers recursivos de AST sem guarda de profundidade; o limite de caracteres
não resolve essa classe. Isto não demonstra exploração no ConexoZenvo.

O registry publica somente até `3.0.3`, também `latest`, desde 21/05/2024.
Tag `3.0.3=74b2db2938fad48a2ea54a9c8bf27a37a62c350d`; master
`e53730e6f935498326c72d768889ac194eedc0e0` tem 16 commits posteriores, mas
`index.js`, `lib/compile.js`, `expand.js`, `stringify.js`, `utils.js` e
`constants.js` são byte a byte idênticos à tag. As mudanças de `parse.js`
tratam quotes e vírgulas. O tarball oficial `braces-3.0.3.tgz` teve SHA512
conferido contra registry/lock; os arquivos de implementação e package.json
instalados foram comparados ao tarball e à tag, sem divergência.

**Existe proposta upstream:** [PR #72](https://github.com/micromatch/braces/pull/72),
aberto e não mergeado na consulta, com oito commits/head
`28d440b5dd449dbf1fe6f3506cf94ecca4d02660`, propõe `maxDepth` com teto 100 no
parser e nos walkers. Essa proposta não foi aplicada nem homologada nesta
sessão e não é uma release npm corrigida comprovada. A ausência de candidato
publicado não significa ausência de trabalho upstream; merge sem publicação
também não resolve a dependência instalada.

Os outros três advisories revisados do pacote não afetam 3.0.3:
[GHSA-grv7-fg5c-xmjg](https://github.com/advisories/GHSA-grv7-fg5c-xmjg)
afeta `<3.0.3`, com fix 3.0.3; [GHSA-cwfw-4gq5-mrqx](https://github.com/advisories/GHSA-cwfw-4gq5-mrqx)
afeta `>=2.2.0,<2.3.1`; [GHSA-g95f-p29q-9xw4](https://github.com/advisories/GHSA-g95f-p29q-9xw4)
afeta `<2.3.1`. A correção antiga em 3.0.3 não corrige o novo vfj7, que inclui
essa versão. Context7 retornou somente picomatch, biblioteca diferente;
foram usadas as fontes primárias exatas de braces 3.0.3.

Metadata instalada `node_modules/braces/package.json:23–32`: CommonJS,
`main=index.js`, sem `type`/`exports`, Node `>=8`, dependência
`fill-range:^7.1.1`, sem lifecycle de instalação. Fonte
`node_modules/braces/lib/compile.js:48–57`, `expand.js:102–110` e
`stringify.js:22–30` mantém recursão sem guarda de profundidade.
`parse.js:36–40` limita caracteres ao máximo 10000 de `constants.js:4`;
`expand.js:34/57–62` limita sequências por `rangeLimit=1000`. Não foram
executados payloads DoS, padrões hostis ou benchmarks de exaustão.

Não há alvo npm corrigido para atualização mínima nomeada dentro de `^3.0.3`
com a evidência atual. A sugestão do scanner `patch-package@6.0.7`, marcada
`isSemVerMajor:true`, seria downgrade do pai 8.0.1 e não constitui correção
compatível autorizada. Sem major/downgrade/override/patch ou aceite por
hipótese; dependências ficam intactas.

### Pais, consumidores e entrada não confiável

Inventário físico recursivo, lock, `npm ls` e resolução pelos pais confirmam
uma única cópia `node_modules/braces@3.0.3`, `dev:true`
(`package-lock.json:6584`). Cadeia única instalada:

| Relação                                  | Versões/faixa instalada                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Raiz → patch-package                     | 8.0.1 / `^8.0.1` (`package.json:41`)                                       |
| patch-package → find-yarn-workspace-root | 2.0.0 / `^2.0.0` (`node_modules/patch-package/package.json:77`)            |
| find-yarn-workspace-root → micromatch    | 4.0.8 / `^4.0.2` (`node_modules/find-yarn-workspace-root/package.json:23`) |
| micromatch → braces                      | 3.0.3 / `^3.0.3` (`node_modules/micromatch/package.json:40`)               |

**Instalação/build/dev:** a raiz executa `patch-package --error-on-fail` no
postinstall (`package.json:31`). Fonte instalada
`node_modules/patch-package/dist/index.js:66–84/85–104` separa criação de
patch com nome de pacote da aplicação sem argumentos. A aplicação do
postinstall não chama `detectPackageManager`; sua cadeia importada pode
carregar braces, sem executar os walkers por esse fato. O detector
`dist/detectPackageManager.js:32–55` retorna npm ao encontrar package-lock;
só o fallback sem lock chama o finder. A criação de patch para Yarn pode
chamar o finder também em `dist/getPackageResolution.js:17–24`.
`--include`/`--exclude` são RegExp (`dist/makeRegExp.js:8–14` e
`filterFiles.js:10–14`), não padrões passados ao parser braces.

O finder lê `package.json` ao subir diretórios e extrai `workspaces`/packages
(`node_modules/find-yarn-workspace-root/index.js:22–28/42–50`). A raiz usa
os padrões locais `apps/*` e `packages/*` (`package.json:6–9`).
Sua chamada `micromatch([relativePath], workspaces)` usa picomatch na função
principal (`node_modules/micromatch/index.js:32–54`), sem chamar braces.
Os helpers explícitos `parse`, `braces` e `braceExpand` alcançam braces
(`index.js:424–465`); não foram encontrados chamadores desses helpers no
fluxo do finder/patch-package examinado. A [documentação oficial micromatch
4.0.8](https://github.com/micromatch/micromatch/tree/4.0.8) e a
[fonte oficial do finder](https://github.com/square/find-yarn-workspace-root/blob/master/index.js)
permitem conferir a distinção de APIs.

**Entrada/runtime:** as entradas observadas são manifest, caminho de diretório
e opções CLI locais. Não foi demonstrado fluxo de request, mensagem WhatsApp,
mídia ou outro dado não confiável do produto até os walkers braces. Isso
delimita o exame, sem prova global de ausência de alcance futuro/manual.
Os builds dos dois apps instalam devDependencies e executam o postinstall
(`apps/gateway/Dockerfile:25–28`, `apps/dashboard/Dockerfile:17–24`). Gateway
remove dev antes da cópia final (`:41–46/68–74`); dashboard publica somente
bundle no nginx (`apps/dashboard/Dockerfile:29–32`). Presença no lock ou
import não prova exploração, e o resultado físico pós-prune desta etapa fica
no [checkpoint](../sessions/DONE-2026-10-04-1541-e21-braces-p106.md).

### Validação, decisão residual e continuação

Baseline reconfirmada com Node 26.10.0/npm 11.19.1: `npm audit --json`
exit 1, 0 moderate/17 high, 17 pacotes/7 GHSAs; `npm audit --omit=dev --json`
exit 1, 0 moderate/13 high, 13 pacotes/6 GHSAs. Todos os objetos
`vulnerabilities` são idênticos aos respectivos resultados da etapa anterior;
nenhum alerta removido nesta triagem.

Fixture scratch `/tmp/conexozenvo-p106-braces/consumer-probe.cjs` exerce
finder/micromatch/detector reais com manifests/diretórios sintéticos, os
padrões reais do repo e pequenos padrões benignos de conjuntos/sequências/
padding/escape/incompletos. Baseline e controle positivo passaram exit 0 sob
Node 26.10.0, rede negada/zero tentativas. Workspace e seleção de manager
tiveram zero chamadas braces; somente a fase dos helpers explícitos fez
oito chamadas da implementação real. Quatro controles negativos in-memory
falharam exit 1 nas assertions específicas de versão, seleção workspace,
resultado de helper e manager npm. Não foram alterados os arquivos instalados
e não houve chamada ao CLI que criaria patch ou instalaria pacotes.
Esses casos demonstram resolução/semântica/alcance do fluxo examinado, sem
provar resistência stack/CPU/memória ou corrigir a vulnerabilidade.
Gates, imagens finais após prune/node/sem rede, smokes preservados, revisão
independente e resultados finais ficam no [DONE da sessão](../sessions/DONE-2026-10-04-1541-e21-braces-p106.md);
PR/CI/merge são os gates canônicos do PR único, sem operação produtiva.

**Decisão:** braces 3.0.3 permanece afetado, sem correção ou aceite. Equipe
gateway reavalia em **02/11/2026**, ou antes diante de publicação compatível,
merge do PR #72 ou pai compatível que altere a cadeia. Cada sinal exige
reconferir release/faixas/lock/consumidores; merge sem release não resolve.
P-106 permanece parcial/aberta, inclusive basic-ftp 5.3.1 afetado sem
correção/aceite. Prisma/Puppeteer continuam P-038/P-062/§7.5, sem duplicação.
Brace-expansion runtime 2.1.7/dev 1.1.21/5.0.12, ip-address 10.7.1,
sharp 0.35.5/librsvg 2.63.2 e três smokes, patches/allowScripts/instalação
estrita, contratos/guardas e arquivos locais permanecem preservados.

Próxima continuação: **E21/P-022**, reconciliação da baseline de testes/
coverage e seleção de uma lacuna restante com código/consumidores/fontes;
nenhuma lacuna nova foi escolhida ou implementada nesta sessão. P-022 parcial,
P-100/P-101/P-102 abertas, P-099 sem drenar. Nenhuma conta/QR/contact-check/
envio real, produção/Dokploy/deploy/canário. Publicação e gates operacionais
manuais, stop-first D-049/D-050 e snapshots E21 de 7 dias/24 h preservados.
