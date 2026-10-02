---
tipo: reference
dono: equipe gateway
revisado_em: 2026-10-02
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
