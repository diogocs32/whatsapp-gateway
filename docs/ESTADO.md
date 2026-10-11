# 📊 ESTADO GLOBAL — ConexoZenvo

> Fonte única de verdade do projeto. Atualizado SOMENTE no encerramento de sessão (R9).
> Ordem de leitura de toda conversa: 1º este arquivo → 2º [SESSOES.md](SESSOES.md) → 3º o arquivo da sessão ativa em [sessions/](sessions/).

- **Processo:** ondas M0–M6 definidas em [`DOCUMENTO_CONEXOZENVO_NESTJS.md`](../DOCUMENTO_CONEXOZENVO_NESTJS.md) (raiz)
- **Onda atual:** M3 · Qualidade — **CONCLUÍDA e EM PRODUÇÃO em 18/08/2026** (sessão `2026-08-18-0545-m3-qualidade`, D-018: fronteiras no CI + testes unitários de domínio + coverage; deploy ~11:50 UTC validado). Continuação incremental = P-022. (M2 concluída no mesmo dia — D-017.)
- **Próxima onda:** M4 · Segurança (backup testado — A1 segue a MAIS urgente —, rotação de secrets, npm audit no CI)
- **Execução em curso (desde25/09):** [roteiro](ROTEIRO-ONDAS-2026-09.md), uma etapa por chat. **11/10: E28/P-107 (pedido do dono, D-051) — proxies em lote + seletores verde/vermelho com nº de sessões, compartilhar por opt-in; sem deploy ([DONE](sessions/DONE-2026-10-11-0835-e28-proxies-lote-uso.md)); a fila volta para E21/P-022 baseline.** Base reconfirmada04/10 antes da feature: `origin/main=d19f056e5006b4ee18e0a0638a1979ba0d6de4c4`, PR #43 MERGED/ci/imagens/advisories verdes. E21/P-106 bracesdev3.0.3 triada documentalmente: afetada por GHSA-vfj7-8cjw-p6xm, sem release npm corrigida publicada; PR upstream72 aberto propõe limite de profundidade. Deps/lock/patches/allowScripts intactos, sem correção/aceite. Fonte/grafo distinguem imports, matching workspace picomatch e helpers que chamam braces; entrada não confiável pelo produto não demonstrada. Probes benignos/4controles/rede negada,1259unitgateway+292painel/gates/imagens e3smokes finais frescos node/read-only/sem rede aprovados; scan pós-prune remove cadeia dev. Brace-expansion runtime2.1.7×2/dev1.1.21/5.0.12/ip-address10.7.1/sharp0.35.5/librsvg2.63.2 preservados. Audit full17high/17pacotes/7GHSAs e omit13high/13pacotes/6GHSAs, todos objetos idênticos ao PR43, ambos exit1. [DONE](sessions/DONE-2026-10-04-1541-e21-braces-p106.md); PR/revisão/CI/merge finais canônicos no PR desta feature. P-106 parcial/braces e basic-ftp afetados sem aceite; equipe gateway reavalia02/11 ou antes com candidato compatível. Próximo E21/P-022: reconciliação baseline agregada e lacuna restante demonstrada. Prisma/Puppeteer seguem P-038/P-062, P-022 parcial/P-100/P-101/P-102 abertas/P-099 sem drenar. D-027/D-049/D-050/C/D/E/F/B-004/B-005/B-007 e snapshots7dias/24h manuais preservados; nenhuma consulta produtiva, último SHA documentado768fb26. [Mapa](MAPA-CODIGO.md).

## Roadmap (R2)

| Onda | Objetivo                                                                             | Status        |
| ---- | ------------------------------------------------------------------------------------ | ------------- |
| M0   | Doc viva (ESTADO, SESSOES, DECISOES, ARQUITETURA, PROJETO, CHANGELOG, CLAUDE.md)     | ✅ 10/07/2026 |
| M1   | Destravar produção: O1–O3 operacionais + confirmar prod = código mais recente        | ✅ 10/07/2026 |
| M2   | Guard-rail ativo: observação G1–G8 → ligar `GUARDRAIL_ENFORCE`                       | ✅ 18/08/2026 |
| M3   | Qualidade: testes unitários de domínio + coverage + boundaries no CI                 | ✅ 18/08/2026 |
| M4   | Segurança: backup testado, rotação de secrets, npm audit no CI                       | ⬜            |
| M5   | Observabilidade com alertas (canal único + uptime externo)                           | ⬜            |
| M6   | Roadmaps estratégicos: ENGINE META CLOUD → multi-tenant RLS → multi-engine → /api/v1 | ⬜            |

## Estado de produção

> **11/10/2026 (E28/P-107, D-051, pedido do dono — sem deploy):** tela Proxies ganha marcar vários
> e excluir com UMA confirmação (rota aditiva `POST /api/proxies/bulk-delete`, ADMIN, lock das linhas)
> e coluna Sessões; seletores de proxy da sessão já criada e do "Nova sessão" mostram verde (livre) /
> vermelho (em uso, "em uso por N sessões" + nomes) e deixam compartilhar. `GET /api/proxies` traz
> `sessionCount`/`sessions`; `allowSharedProxy` (PUT/POST) é opt-in — sem ele, exclusividade D-008/
> D-041 idêntica (repetir o próprio SINGLE dividido não precisa dela); desabilitado/DEAD nunca
> liberados; o painel só compartilha o que o dono escolheu vermelho naquela hora. Sem migration/env.
> Gateway 1966 (unit+e2e, 4 mutações recusadas) + painel 351 locais, harnesses visuais (Chrome
> headless, gateway falso, inclusive gateway antigo), revisão independente aplicada; P-108 registrada.
> [Checkpoint](sessions/DONE-2026-10-11-0835-e28-proxies-lote-uso.md). Deploy manual dos dois apps,
> gateway antes do painel. Nenhuma conta/QR/envio real/produção/Dokploy; último SHA produtivo
> documentado `768fb26`, sem consulta ao vivo.

> **04/10/2026 (E21/P-106 braces, triagem documental/sem deploy):** cópia dev3.0.3
> segue afetada; sem release npm corrigida, PR upstream72 open/mergedfalse.
> Lock/deps/pais/patches/allowScripts/três smokes intactos, sem correção/aceite.
> Fonte/consumidores/fixtures offline/quatro controles/revisão,1259unitgateway+
> 292painel/gates/imagens; scan final pós-prune elimina a cadeia dev e três smokes
> frescos node/read-only/sem rede provam preservações runtime. Audit full17high/
> 7GHSAs e omit13high/6GHSAs, ambos exit1 e objetos idênticos ao PR43.
> [Fontes/provas/limites](sessions/DONE-2026-10-04-1541-e21-braces-p106.md); PR/CI/merge canônicos.
> P-106 parcial/braces e basic-ftp sem aceite; reavaliar02/11 ou antes com release/
> pai compatível ou merge72, confirmando publicação. Próximo E21/P-022 baseline/
> lacuna restante comprovada, sem piso por hipótese. Prisma/Puppeteer P-038/P-062,
> P-100/P-101/P-102/P-099, publicação/canários/stop-first/snapshots E21 preservados.
> Nenhuma conta/QR/contact-check/envio real/produção/Dokploy/deploy/canário.

> **04/10/2026 (E21/P-106 brace-expansion dev1/5, sem deploy):** duas entradas
> dev1.1.18→1.1.21 e5.0.9→5.0.12, mínimos dos três GHSAs nas faixas dos pais;
> seis campos lock e update nomeado checkout/scratch idêntico. Instalação estrita,
> patches/allowScripts/pais/manifests/exports/Node/deps preservados. Consumidores
> reais com padrões pequenos/rede negada/zero tentativas/quatro controles;
> revisão,1901gateway+292painel/gates/imagens/HTTP sintéticos locais verdes.
> Smokes Dockerfile ficaram em cache; três execuções frescas na imagem final,
> read-only/node1000/sem rede, provaram seis JPEGs/ZIP/consumidores dist. Inventário
> final mantém brace2.1.7x2/ip10.7.1/sharp0.35.5/rsvg2.63.2 e remove dev1/5.
> Audit completo sai18high/18pacotes/10GHSAs→17high/17pacotes/7GHSAs, somente
> brace-expansion/três GHSAs, sobreviventes idênticos; --omit=dev13high/13pacotes/
> 6GHSAs integralmente idêntico e ambos exit1. P-106 parcial/basic-ftp afetado,
> sem correção/aceite; próximo candidato braces3.0.3/GHSA-vfj7-8cjw-p6xm,
> só observado no audit, ainda não triado/corrigido. [Provas/fontes/limites](sessions/DONE-2026-10-04-0852-e21-brace-dev-p106.md);
> PR/CI/merge finais canônicos no PR desta feature. Nenhuma conta/QR/contact-check/
> envio real, produção/Dokploy/deploy/canário; Prisma/Puppeteer seguem P-038/P-062,
> publicação/canários/stop-first/snapshots E21 e gates anteriores manuais preservados.

> **04/10/2026 (E21/P-106 ip-address, sem deploy):** única cópia10.5.0→10.7.1,
> mínimo comum dos quatro GHSAs dentro das duas faixas rate-limit/socks; três campos
> lock, pais/manifests/patches/allowScripts preservados. Gate real do dist final
> pós-prune/node/sem rede e fixtures pequenas/6controles/revisão/suites/imagens/HTTP
> sintéticos aprovados. Audit retira só ip-address/quatro GHSAs, residual idêntico
> e exit1; P-106 parcial/basic-ftp aberto, próximo brace dev1/5.
> [Provas/fontes/limites](sessions/DONE-2026-10-03-2332-e21-ip-address-p106.md);
> PR/CI/merge finais canônicos. Classificadores não provam exploração/produção;
> nenhuma conta/QR/check/envio real/publicação ou operação produtiva.
> Publicação/canários/stop-first/snapshots E21 e gates anteriores manuais preservados.

> **02/10/2026 (E21/P-106 basic-ftp, somente docs):** fix upstream6.2.1 existe,
> mas major fora da faixa ^5.0.2/sem backport5.x; basic-ftp5.3.1 permanece afetado.
> Alcance runtime/PAC FTP/MDTM fallback mapeado; entrada não confiável do produto
> não demonstrada, produção não consultada. Lock/deps/patches/smokes intactos,
> sem aceite; audit residual idêntico/exit1. [DONE](sessions/DONE-2026-10-02-2138-e21-basic-ftp-p106.md);
> revisão/CI/merge finais canônicos no PR; próximo triagem ip-address.
> Publicação/canários/stop-first/snapshots E21 e gates anteriores manuais preservados.

> **02/10/2026 (E21/P-106 runtime2.x, sem deploy):** somente duas cópias optional
> brace-expansion2.1.4→2.1.7 dentro das faixas dos pais; smoke da imagem final após
> prune, node/sem rede, prova seleção e ZIP/conteúdo/directory, sharp/librsvg intactos.
> Revisão/controles/suites/gates/imagens/HTTP sintéticos aprovados. Audit retira apenas
> brace-expansion/três GHSAs e permanece exit1; P-106 parcial para dev1/5 e demais
> residuais, próximo basic-ftp. Presença/carregamento não demonstram exploração.
> [Provas/fontes/limites](sessions/DONE-2026-10-02-2045-e21-brace-expansion-p106.md); PR/CI/merge finais canônicos.
> Nenhuma operação/consulta produtiva, conta/QR/check/envio real; gates manuais preservados.

> **02/10/2026 (E21/P-105, sem deploy):** sharp 0.35.5/libvips 1.3.4 corrigem GHSA-wq5f-xc86-pv6w. Imagem final Linux x64/glibc 2.36 comprova rsvg 2.63.2/vips 8.18.7 após prune, como node e sem rede; seis JPEGs PNG/SVG pelos helpers Baileys, com dimensões e pixels conferidos. Revisão independente, 1.901 gateway/coverage + 292 painel, gates/imagens/smokes locais aprovados. Advisories estrito: uma pendência → zero, sem aceite novo. npm audit continua exit 1 com 1 moderate/14 high idênticos; P-106 registra triagem separada. [DONE](sessions/DONE-2026-10-02-1043-e21-sharp-p105.md); PR/CI/merge finais canônicos. Nenhuma operação/consulta produtiva; publicação/canários/gates anteriores preservados.

> **01/10/2026 (E21/P-104, sem deploy):** bootstrap sem transição usa epoch explícito, sem reclassificar eventTs legado. evaluate.applied só true por escrita adquirida com mudança de estado; replay/CAS perdido/metadados retornam false.41SQL/default/consumidores/concorrência,14mutações/revisão e1901gateway/coverage+292painel/gates locais verdes. [DONE](sessions/DONE-2026-10-01-0736-e21-guardrail-bootstrap.md); CI/merge finais no PR canônico. P-022 parcial; P-105 registra sharp0.35.4/advisory high do cron main, separado. Nenhuma operação/consulta produtiva; publicação/canários/gates anteriores preservados.

> **01/10/2026 (E21/P-022 C10, sem runtime/deploy):**30testes SQL/default/ordenação/consumidores/CAS/P2002 e17mutações por assertions, controles/revisão/gates locais verdes;1890gateway/coverage+292painel. Prisma7.10 materializa now cliente no getState; controle SQL prova default do banco em três fusos. P-104 registra empate bootstrap/override e evaluate.applied=true sem escrita, sem ocorrência produtiva observada. [DONE](sessions/DONE-2026-10-01-0213-e21-guardrail-c10-tests.md), feature/onda21-guardrail-c10-tests; CI/merge finais no PR canônico. P-022 parcial; próximo P-104. Publicação/canários/gates anteriores manuais preservados.

> **01/10/2026 (E21/P-022 agendamento CampaignService, sem runtime/deploy):**
> 75regressões/24mutações,1259unitgateway+292painel/revisão verdes. Start/resume reais com
> repo/queue/clock/random falsos provam offset/jitter/acúmulo/época/jobId/status/CAS
> e falha parcial/pausa aguardada. Sem nova prova SQL/Redis/worker/8s ou produtiva.
> [DONE](sessions/DONE-2026-10-01-0058-e21-campaign-scheduling-tests.md), feature/onda21-campaign-scheduling-tests;
> CI/merge finais no PR canônico. P-022 parcial; próximo C10/Prisma/SQL/default,
> sem correção por hipótese. Publicação/canários/gates anteriores manuais preservados.

> **30/09/2026 (E21/P-022 withDeadline/probes, sem runtime/deploy):**
> 30regressões/12mutações com controles positivos,1184unitgateway+292painel/revisão
> verdes. Helper/service/controller reais, relógio/portas falsos, prazos3/3/5s,
> cleanup/fallback/late/report/status existentes preservados; nenhuma prova produtiva.
> [DONE](sessions/DONE-2026-09-30-2333-e21-health-deadline-tests.md), feature/onda21-health-deadline-tests;
> CI/merge finais no PR canônico. P-022 parcial; próximo agendamento CampaignService,
> C10SQL separado. Publicação/canários e gates anteriores manuais preservados.

> **30/09/2026 (E21/P-022 parser cgroup, sem mudança de runtime/deploy):**
> memoryStats real tem working set/fallback/gramática permissiva cobertos com fontes
> sintéticas, sem cgroup do host; health/summary reais provam arredondamento/limiar/campos.
> 58 testes/oito mutações/1154unitgateway+292painel e revisão independente verdes.
> [DONE](sessions/DONE-2026-09-30-2256-e21-cgroup-tests.md), feature/onda21-cgroup-tests;
> CI/merge finais no PR canônico. P-022 parcial; próximo withDeadline/probes health.
> Nenhuma operação produtiva; publicação/canários/gates anteriores manuais preservados.

> **30/09/2026 (E21/P-005, D-050, [PR #31](https://github.com/diogocs32/whatsapp-gateway/pull/31), sem deploy):**
> purge IAM em lotes500 preserva ancestral expirado de família protegida;
> reuso pós-purge revoga descendente válido. Escritores compartilham advisory xact userId;
> try-lock e DELETE fresh READ COMMITTED explícito revalidam corrida. Margem7dias/0desliga,
> até20lotes/6h, timers/single-flight/shutdown provados.20e2e+21unit, quatro mutações,
> 1639gateway+292painel/coverage/builds/guardas/revisões verdes; CI/merge finais no PR canônico.
> Sem migration/deps/TTL/HTTP novos. Primeiro rollout/rollback stop-first manual N-1;
> D-049/anteriores e snapshots7d24h E21 mantidos. Nenhuma consulta/operação produtiva.
> P-100/P-101/P-102 abertas/P-099 sem drenar; próximo P-022, testes do domínio de licença.

> **30/09/2026 (E21 continuação/P-013, [PR #30](https://github.com/diogocs32/whatsapp-gateway/pull/30), sem deploy):**
> `mentions?: string[]` e `SendReactionRequest { emoji: string }` formalizados em contracts;
> schemas/limites/rotas/envio e painel/n8n0.4.1 intactos.2 fixtures de tipos compiladas,
> 20 HTTP com SQL STOPPED/autostart=false e transporte falso, quatro mutações recusadas,
> 1598gateway+292painel/coverage/builds/guardas e revisão independentes verdes.
> CI/merge finais no PR canônico; demais contratos seguem P-040. Nenhuma operação/consulta
> produtiva. D-049/D-047/D-048 e gates preservados; P-100/P-101/P-102 abertas/P-099 sem drenar.
> Publicação/canários C/D/E/F/B-004/B-005/B-007 manuais, migration aditiva/stop-first D-049,
> snapshots7d recalculados ou24h antes enforce/canário E21. Próximo recorte P-005 no roteiro.

> **30/09/2026 (E21 continuação/P-078, D-049, [PR #29](https://github.com/diogocs32/whatsapp-gateway/pull/29), sem deploy):**
> ACK órfão fica durável em wa_pending_message_acks; advisory lock por sessão/key e
> consumo transacional com INSERT/histórico preservam ranking/error/inbound/latest timestamp.
> Retenção lastSeenAt/default90 pela env existente; histórico por chunk50 com retry dedup.
> EventBus segue assíncrono, sem novo replay/outbox.28 testes de efeito/quatro mutações
> recusadas,1576gateway+292painel/coverage/builds/guardas e revisão final aprovados;
> PR #29 mergeado em86f9041, ci/imagens verdes reconferidos30/09. [Política/publicação manual](how-to/ack-persistencia-e21.md).
> Nenhuma operação/consulta produtiva. Migration aditiva pelo migrate deploy, primeira
> troca stop-first (N-1 ignora protocolo). P-100/P-101/P-102 abertas/P-099 sem drenar;
> deploys C/D/E/F/canários/B-004/B-005/B-007 manuais, snapshots7d recalculados ou24h
> antes enforce/canário E21. Próximo recorte P-013, mensagem pronta no roteiro.

> **30/09/2026 (E21 continuação/P-018/P-091, D-048, [PR #28](https://github.com/diogocs32/whatsapp-gateway/pull/28), sem deploy):**
> QR inicial explicitamente esgotado passa a STOPPED, limpa socket/QR/timer/listeners e
> sai do autostart sem apagar auth/chaves/epoch. Sinais de pairing preservam a política
> anterior. Link expira/revoga token imediatamente, sem parada implícita imediata da engine.
> Legado pode iniciar um ciclo antes de parar.19unit+3efeito novos/duas mutações recusadas,
> 1548gateway+292painel/coverage/builds/guardas e revisão aprovados; CI/merge no PR canônico.
> [Política e aceite manual](how-to/qr-esgotado-e21.md). Nenhuma consulta/operação produtiva.
> P-100/P-101/P-102 abertas, P-099 sem drenar; deploys C/D/E/F/canários e B-004/B-005/B-007
> manuais; antes do primeiro enforce/canário E21 recalcular snapshots7d ou aguardar24h.
> Próximo recorte P-078, mensagem pronta no roteiro.

> **30/09/2026 (E21/P-103, D-047, [PR #27](https://github.com/diogocs32/whatsapp-gateway/pull/27), sem deploy):**
> G4 exige identidade segura; reação de alvo inconclusivo não conta resposta nem ausência.
> `ambiguousMature` aditivo, snapshot unreliable fora da mediana e G5 mantém estado.
> 37 testes de efeito/quatro mutações recusadas;1526gateway+292painel/coverage/gates locais
> e revisões independentes verdes. CI/imagens e merge finais no PR. Antes do primeiro
> enforce/canário manual, recalcular reply-rate7d da frota ou aguardar24h dos snapshots
> antigos; [política](how-to/reply-rate-identidade-e21.md). Triagem registrada, demais
> recortes abertos. P-100 aberta/P-099 sem drenar; produção não foi operada/verificada.
> Deploys C/D/E/F/canários/B-004/B-005/B-007 manuais. Mensagem da continuação no roteiro.

> **29/09/2026 (E20/D-046, [PR #26](https://github.com/diogocs32/whatsapp-gateway/pull/26), sem deploy):**
> novas rotas/DTOs de métrica30d/cota/inventário, cota observe0 sem novo bloqueio/status,
> A/B leads com motores reais/transporte falso e dedup Baileys mantendo input/canônico.
> UNKNOWN sem fonte; P-101 cobertura, P-102 full batch e P-103 G4 legado delimitadas.
> 1489gateway+292painel/coverage/typechecks/builds/imagens/smokes finais verdes, revisões
> cruzadas aprovadas. Primeira tentativa de smoke acionou start em engine descartável
> por suposição sobre autostart; interrompida sem pareamento/conta real, substituída por
> fixture SQL STOPPED no smoke final. Detalhe/limites no DONE E20. Merge/CI no PR são a
> evidência remota; nenhuma operação/validação produtiva. P-100 aberta, P-099 sem drenar,
> deploys C/D/E/F/canários/B-004/B-005/B-007 manuais. E21 preparada no roteiro.

> **29/09/2026 (E19/P-062 parte 4, D-045 — [PR #25](https://github.com/diogocs32/whatsapp-gateway/pull/25), sem deploy):** Vitest/coverage5.0.2,
> config gateway .mts/SWC/decorators/e2e serial, TS5.9.3 e CLI11 preservados.
> node20/node16 mantém CommonJS e lê exports; shims de proxy removidos, tipos/rootDir
> explicitados. Cache build dentro de dist corrigiu segundo nest build vazio.
> 1.425 gateway + 292 painel, coverage178 fontes, typechecks/builds/imagens e smokes
> isolados verdes; SQL Prisma com import() nativo e SIGTERM sem contas aprovados.
> CI/merge no PR são a evidência remota; TS6 não instalado. P-100 permanece aberta.
> Deploys C/D/E/F/canários manuais e B-004/B-005/B-007/P-099 mantidos. Produção no
> último SHA documentado `768fb26`, sem conferência ao vivo nesta etapa.

> **29/09/2026 (E18/P-062 parte 3, D-044 — PR #24, sem deploy):** Nest 12.1.1 runtime
> com Config 12.0.1/JWT 12.0.2/pino 5.2.1 e Fastify 5.12.5; sete aceites corrigidos
> removidos. CLI 11/TS 5.9.3, BullMQ 6/ioredis 5/ULID 3, contratos e gates E16/E17
> preservados. 1.425 gateway + 292 painel locais, imagens/smokes e guardas DI/CJS.
> P-100 continua aberta: EVAL principal resolve ao recuperar a rede, mas disconnect
> bloqueante já em reconnecting continua esperando end na janela observada; reproduzido
> em BullMQ 5/6. Sem force-close/retries reduzidos; SIGTERM do subprocesso só limpa a
> falha. Gate webhook E17 ganhou barreira dos dois slots após reprodução de prefetch.
> Sem migration/env/payload novo, conta/QR/envio real ou operação no Dokploy.
> [Deploy F](how-to/deploy-f-nest12.md)/canário manuais após C/D/E, mantendo
> B-004/B-005/B-007/P-099. Último SHA produtivo documentado `768fb26`, sem consulta ao vivo.

> **29/09/2026 (E17/P-062 parte 2, D-043 — sem deploy):** BullMQ 6.3.10 mantendo
> ioredis 5.11.1; ULID 3.0.2. Slot da campanha adaptado a `getBackend().client`, sem
> mudar épocas, reidratação, PAUSED, lease, reserva cercada, limiter/slot de 8 s ou backoff.
> Treze novos testes de efeito com v5/v6, dois workers e HTTP local; CommonJS do ULID
> provado no build final, mutação recusada. Sem migration/env/contrato novo, conta/QR/envio
> real ou Dokploy. [Deploy E](how-to/deploy-e-bullmq6.md) e canários manuais, após C/D;
> repeat/pausa global exigem verificação antes de upgrade/rollback. P-100 delimita a
> investigação de shutdown com comando Redis pendente; teste offline prova worker ocioso.
> Último SHA de produção documentado continua `768fb26`, sem conferência ao vivo.

> **29/09/2026 (E16/P-062 parte 1, D-042 — PR #22, sem deploy):** Node 26.10.0 e nginx 1.30.5
> pinados por digest multiarch; Actions node24/Ubuntu 24.04, npm ci estrito, Puppeteer sem
> download e ts-node sem uso removido. React 19.3/Router e tooling atualizados sem major de
> runtime. Patches, TS 5.9.3, engines e contratos preservados; sem migration/env nova.
> Prova local: 1.394 gateway + 292 painel, ambos Dockerfiles e guardas, HTTP/SPA/assets,
> 12 cenários no Chrome com APIs falsas, autenticação e rate-limit na imagem isolada.
> Mutações da política de instalação e nginx falharam como esperado. CI verde e merge
> são gates do PR; [deploy D](how-to/deploy-d-manutencao.md) é manual e herda pré-requisitos
> C/B-004/B-005/B-007 e observação P-099 se ainda pendentes. Nenhuma conta, QR ou envio real.
> Produção permanece no último SHA **documentado** `768fb26`, sem conferência ao vivo.

> **29/09/2026 (E15/P-058, D-041 — PR #21, sem deploy):** currentProxyId elegível é mantido em
> RANGE/GLOBAL; SINGLE inválido e pool vazio falham antes do socket/Chromium, mesmo com
> WA_REQUIRE_PROXY=false. Só NONE/sem atribuição permite direto; DEAD exige assinatura de
> auth/túnel, identidade da conexão e escrita na transação da lease. PUT SINGLE validado e
> serializado; GET/PUT aceita nome vivo sem quebrar referências órfãs (P-097).
> Sem migration E15 ou payload novo. Evidência local: 1.394 gateway + 292 painel; CI/merge no PR #21. Depois,
> [deploy C manual](how-to/deploy-c-onda3.md): B-004 stop-first, B-005 backup/restore,
> B-007 diagnóstico/canário, observar P-099 e B-001 depois. Sem conta, QR ou envio real.
> Produção permanece no último SHA **documentado** `768fb26`, sem conferência ao vivo.

> **29/09/2026 (E14/P-057, D-040 — PR #20, sem deploy):** a migration aditiva
> `20260929053000_campaign_schedule_epoch` separa cada start/resume e invalida jobs antigos.
> PAUSED não cria laço; Worker BullMQ 5.81.5 espera a primeira reidratação e limita os jobs
> globalmente; slot Redis também espaça o envio efetivo entre réplicas após downloads de mídia.
> Sessão sem WORKING, perda de lease E13, shutdown ou restrição temporária liberam a reserva e
> tentam de novo com backoff, sem destinatário FAILED. Prova local com Redis/Postgres e envio
> falso, sem conta/QR/mensagem real. O backlog de jobs da versão antiga pode atrasar a fila
> no primeiro deploy (P-099); E15/P-058 e deploy C manual ainda pendentes. Último SHA de
> produção **documentado**: `768fb26`, sem verificação ao vivo nesta etapa.

> **27/09/2026 (E13/P-056, D-039 — PR #19; sem deploy):** a migration aditiva `20260927124000_session_lease_fencing` inclui `authEpoch`/`leaseOwner`/`leaseUntil`; dois SessionManagers disputam uma única posse no Postgres, com escrita de auth/status cercada, drenagem após perda e retry lento de rede em DEGRADED. `keys.set` é transacional e `saveCreds` encadeado. Testes usam engines falsas, sem conta/QR/envio real. O primeiro deploy precisa de **B-004 stop-first** antes da transição do container antigo; WWEBJS mantém stop-first pelo perfil/Chromium compartilhado. Merge/CI não comprovam proteção em produção. Último SHA de produção **documentado**: `768fb26`.

> **27/09/2026 (E26/P-084, D-038 — sem deploy):** ao apagar uma sessão com proxy fixo, o gateway
> guarda o nome na atribuição órfã (depois do delete; nunca bloqueia a exclusão) e o painel sugere
> esse proxy ao recriar uma sessão com o mesmo nome (pré-seleciona se livre; senão avisa em uso por
> qual sessão, fora do ar, desabilitado ou excluído; Enter espera a sugestão até 1,5 s). Migration
> aditiva `20260927100000_proxy_sugestao` (`session_proxy_assignments.releasedSessionName`/
> `releasedAt`), rota aditiva `GET /api/proxies/suggestion` (ADMIN); `POST`/`DELETE /api/sessions`
> com a mesma resposta; `PUT /sessions/:id/proxy` numa órfã apaga a memória. Achado à parte: P-097.
> Último SHA de produção **documentado** segue `768fb26`.

> **27/09/2026 (E27/P-086/P-089, D-037 — sem deploy):** link público temporário para outra pessoa
> conectar uma sessão **Baileys** por QR em outra tela (página `/conectar` do painel; token no
> fragmento e em `Authorization: Bearer`; só login do painel cria; nunca apaga login salvo nem derruba
> conta; número esperado com desfazimento automático; `CONNECTED` por 15 min) e filtro de sessões por
> nome/status/número. Migration aditiva `20260927013000_link_conexao_qr` (tabela `wa_connect_links` +
> `wa_sessions.lastMeJid`), rotas aditivas, `SessionDto.lastMeJid`, lock de ciclo de vida por sessão no
> `SessionManager` (pairing com teto de 45 s → 409), CORS `maxAge` 600. 866 unit gateway, 255 painel e
> 348/349 e2e locais (a falha é ambiental do banco de dev — dead-letters órfãs; CI é o gate). Validação
> no Chrome da página pública com gateway local e fases simuladas; sem chip, sem QR lido, sem deploy. Não
> verificado: o `#` sobreviver ao toque no link dentro do WhatsApp (aceite no runbook
> `how-to/link-conexao-qr.md`). Último SHA de produção **documentado** segue `768fb26`.

> **26/09/2026 (E12/P-052, PR #16 — sem deploy):** a rc14 instalada foi confirmada
> na tag oficial antes da mudança. Pairing recusa WORKING/`creds.me`/`sock.user` com 409 e
> espera `connecting` ou primeiro QR por até 10 s; o roster usa `phoneNumber` e só consulta
> `lidMapping` local se faltar PN. Caches de retry/devices são medidos por socket e as pre-keys
> contadas por sessão; externalização aguarda as medidas do canário. `countryCode: BR` é apenas
> coerência de configuração. Testes sintéticos locais, postinstall, guardas e ambos os
> Dockerfiles passaram; CI do PR #16 é o gate do merge. P-087 permanece separada.
> Não houve conta, QR em aparelho, mídia/mensagem real, deploy nem canário. O último SHA de
> produção **documentado** é `768fb26`, sem verificação ao vivo nesta sessão.

> **26/09/2026 (E11/P-051, PR #15 integrado — sem deploy):** patch-package da rc14
> corrige `Curve.verify`, domínio hosted por device e erro do stream cifrado (D-036).
> `npm ci`, guardas na imagem final, ambos os Dockerfiles, 567 unit gateway, 853 testes
> gateway no total e 180 painel passaram localmente; jobs `ci` e `imagens` do [run 36279808592](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36279808592) passaram no commit de código `9e82ec7`.
> P-087 continua aberta: o listener interno do reupload não é cancelado pelo patch.
> E12/P-052 segue em branch/PR próprios da `origin/main`; após seu merge, deploy B manual e canário com chip ficam para a janela do dono.
> Último SHA de produção **documentado** segue `768fb26`, sem verificação ao vivo aqui.

> **26/09/2026 (integração das branches, PR #13 mergeado — sem Deploy):** `origin/main`
> contém o merge `2f02f02` com as pontas antes exclusivas de `coleta-mac`,
> `feature/m2-guardrail-ativo` e `feature/detector-nao-entrega`. As 12 coletas M2
> recuperadas são registros históricos de 10–19/07, sem nova coleta em produção.
> O detector WWEBJS D-035/P-088 entrou como observador opt-in, desligado por padrão,
> somente WARN e sem transição de guardrail. Jobs `ci` e `imagens` verdes no
> [run 36278240407](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36278240407).
> Nenhum Deploy/canário foi executado; o último SHA de produção **documentado**
> continua `768fb26` (15/09), sem verificação ao vivo nesta sessão.

> **26/09/2026 (reconciliação dos merges, sem Deploy):** `git log origin/main` confirma o merge
> do PR #10 (E6/P-060) em `d577b05` às 19:16 BRT e do PR #11 (E7–E10) em `8291c17` às
> 19:19 BRT. Assim, o código está na `main`; E11/P-051 e E12/P-052 continuam pendentes.
> Nenhuma ação de Deploy ou canário foi feita nesta integração. O último SHA de produção
> **documentado** é `768fb26` (15/09); não houve verificação ao vivo do servidor nem do toggle
> de Auto Deploy nesta reconciliação. Deploy W e futuro deploy B requerem janela manual do dono.

> **26/09/2026 (sessão `e10-baileys-midia`, E10/P-050/P-075 no PR #11 — sem merge/deploy):**
> código `b489b21` limita o download recebido a 90 s no total, incluindo reupload de até 20 s
> em Boom 404/410 e uma segunda tentativa; `ptvMessage` preserva o `raw`. O `fetch` da rc14
> recebe dispatcher Undici 8.10.2 privado pela escolha única do proxy HTTP/HTTPS da sessão;
> SOCKS publica só metadados até prova do download por esse proxy. O contrato público mantém
> `mediaKey` opcional. 558 unit gateway, 843 gateway no total e 180 painel passaram localmente;
> typecheck, fronteiras, mapa e builds verdes; jobs
> [`ci`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36272852120/job/108489971382)
> e [`imagens`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36272852120/job/108489971419)
> verdes no commit de código. O listener interno sem cancelamento da rc14 é
> P-087. Nenhuma conta, mídia/mensagem real ou ação no Dokploy; canário só após E12 e ordem de
> merge/deploy B. Produção segue no último SHA **documentado** `768fb26`, sem verificação ao vivo.

> **26/09/2026 (sessão `e9-baileys-desconexao`, E9/P-049 no PR #11 — sem merge/deploy):**
> código `7c0441c` classifica 401/403/405/408/411/428/440/500/503/515, alerta 405 e
> limita 440 a uma tentativa tardia quieta; `lastErrorDetails {code,reason}` é aditivo,
> persistido por migration aplicada só no Postgres local, com métrica de closes por código.
> Consulta de versão limitada, cache renovado só por `isLatest:true`, log por conexão e override
> canário por par de envs. A pausa E8 e a confirmação do prazo apenas pelo RPC direto foram
> preservadas. 546 unit gateway, 831 gateway no total e 180 painel passaram localmente; jobs
> [`ci`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36262065637/job/108459668186)
> e [`imagens`](https://github.com/diogocs32/whatsapp-gateway/actions/runs/36262065637/job/108459668027)
> verdes no commit de código. Sem conta, QR em aparelho, mensagem real ou Dokploy. Produção segue
> no último SHA **documentado** `768fb26`; E10–E12, merge/deploy B e canário ainda pendentes.

> **26/09/2026 (revisão `e8-baileys-fonte-prazo`, PR #11 — sem merge/deploy):** a notificação de
> timelock da rc14 pode fabricar agora + 60 s; o prazo é provisório até confirmação pela resposta
> direta do RPC. Capping menor não reduz a pausa provisória e resposta tardia pode confirmar.
> Commit `8b513c5` com 507 unit gateway, 791 gateway no total e 180 painel locais; jobs `ci` e
> `imagens` verdes (run `36259684192`). Produção permanece no último SHA **documentado**
> `768fb26`; canário da Onda 2 só após E12 e ordem de merge/deploy B.

> **26/09/2026 (sessão `e8-baileys-restricao`, E8/P-048 no PR #11 — sem merge/deploy):**
> ERROR 463, `reachoutTimeLock` e capping CAPPED pausam envios de mensagem com 423 até o prazo
> persistido; `session.restricted` alerta e a pausa vence automaticamente. ERROR 479 é contado,
> ACK ERROR persiste `error`; o estado G5 não vira `banida`. Migration aditiva aplicada apenas no
> banco local de testes. Unit/e2e com socket falso, sem conta ou mensagem real; a produção segue
> no último SHA **documentado** `768fb26`. Merge/deploy B e canário após E12 pendentes; sem prazo
> confirmado pela resposta direta do RPC, a pausa é provisória: a notificação rc14 conserva seu
> `Date` (que pode ser fabricado como agora + 60 s ou superar 60 s) com `source=temporary`;
> capping mais curto não encurta essa pausa. Sem prazo válido, o fallback é 60 s. O limite de 3 s
> encerra só a espera do RPC: resposta tardia ainda confirma se socket/consulta forem atuais;
> o alerta provisório pode ser seguido de outro confirmado. O vencimento local não demonstra o fim
> remoto da restrição.

> **26/09/2026 (sessão `e7-baileys-offline`, E7/P-047 no PR #11 — sem merge/deploy):** `append`
> Baileys de terceiros até 48 h passa ao mesmo fluxo de banco/webhook/Inbox/reply-rate do `notify`;
> eco próprio, status e newsletter são filtrados por mensagem. Cache + consulta ao banco por
> `(sessionId,keyId)` evitam replay sequencial, inclusive após restart. Sem migration/campo público.
> 493 unit gateway, 776 testes gateway no total e 180 painel passaram localmente; E2E comprovou
> o efeito. Jobs `ci` e `imagens` do PR #11 verdes (run `36250883011`); o PR depende do #10 aberto.
> A janela de duas instâncias (P-056/B-004) e a ausência de
> outbox (P-034) permanecem. Produção segue no último SHA **documentado** `768fb26`; nenhuma
> conta conectada, mensagem real enviada, restart ou Deploy nesta sessão. Canário após E12.

> **26/09/2026 (sessão `e6-wwebjs-leve`, E6/P-060 na branch — sem deploy):** download WWEBJS
> por stream de 2 MB e fila por sessão; mídia de grupo não baixa por padrão (opt-in por env), teto
> de envio 24 MB e resultado tardio protegido pela intenção de idempotência; patch single-flight,
> sync de agenda só no primeiro ready da instância, limpeza do Chromium por PID e flags revistas.
> Perfil periódico JSHeap/PSS/IndexedDB no log. Sem conta conectada, `about:blank` no macOS mostrou
> JSHeap 1.073.432→1.073.432 B, soma RSS 739.622.912→651.640.832 B, IndexedDB 0→0 B; PSS
> indisponível. Esses valores **não demonstram** ganho em sessão logada. 489 unit gateway, 282 e2e
> locais, 180 painel; canário com chip e deploy W manual do dono pendentes. Produção continua no
> último SHA **documentado** `768fb26`; nenhum restart, pareamento ou envio real nesta sessão.

> **26/09/2026 — integração autorizada pelo dono, sem Deploy manual:** PR #7 (Onda 8) mergeado em
> `ddca44a`; PR #8 (E5 da Onda 6) mergeado em `6567112`. O código está na `main`, mas as mudanças
> de gateway e painel só chegam à produção após Deploy manual no Dokploy (D-027). A E6/P-060 continua
> pendente naquele fechamento; o canário com chip da build wwebjs também. Nenhum Deploy foi executado naquela conversa.
> Às 13:16 UTC, `/health` nos domínios `.cloud` e `.com` respondeu `ok`, com uptime de 947.341 s
> (boot aproximado em 15/09 14:06 UTC): o gateway não reiniciou após os merges. Último SHA de
> produção **documentado**: `768fb26`; o toggle do Dokploy não foi inspecionado ao vivo.

> **26/09/2026 (sessão `e5-wwebjs-pronto`, código na branch da Onda 6 — sem deploy):** patch
> wwebjs estendido para mídia `__x_id`, WID/MsgKey e cache de versão; override de build por sessão
> para canário, com default global validado preservado até o teste com chip; log da build efetiva
> e Chromium; estados terminais sem reconexão/QR automático; tetos de pairing e heal; teste P-073
> sem subir Chromium. Migration aditiva `20260926123000_wwebjs_web_version_por_sessao`, D-032.
> P-086 registra o link público temporário de QR para outra etapa. Testes locais: 483 unit gateway,
> 281 e2e, 180 painel; build e validações estáticas passaram (lint/formato globais ainda enxergam
> os `seed-mock` preexistentes fora da branch). **Produção segue no último SHA documentado
> `768fb26`**; não houve verificação atual do Dokploy nem deploy.

> **26/09/2026 (sessão `e25-encaminhar-painel`, código na branch da Onda 8 — sem deploy):** o painel
> ganha o "Encaminhar" do WhatsApp Web no Inbox e no Atendimento (menu ⌄ → modo seleção de 1
> mensagem → "Encaminhar mensagem para" com contatos e grupos da sessão → ➤ com resultado por
> destino; atalho ↪ nas mídias), sem nenhum caminho que reenvie para quem já recebeu (D-031). Só
> painel — gateway e contrato inalterados (a INTEGRACAO §2 foi corrigida onde divergia do código da
> E24). **Onda 8 fechada no PR #7** — deploy G = merge + Deploy manual dos 2 apps, 2 migrations
> aditivas; recomendado fazer o deploy A antes. 180 testes no painel. **Produção segue em
> `768fb26`** (deploy A e deploy G pendentes).

> **26/09/2026 (sessão `e24-encaminhar-api`, código na branch da Onda 8 — sem deploy):** rota aditiva
> `POST /api/sessions/:s/messages/:msgId/forward` (até 5 destinos; 1 se "encaminhada com frequência";
> destino sem conversa = cold à força com a trava 423 no pedido inteiro; `idempotencyKey` do pedido +
> `<chave>:<destino>`), nas 2 engines (Baileys `forward` só com o nó de conteúdo; wwebjs
> `Message.forward` com o eco correlacionado — sem handoff falso). O Baileys passa a guardar a
> original das RECEBIDAS em `wa_messages.raw` (7 dias) e marca apagada/editada (migration aditiva
> `20260926052719_encaminhar_marcas_apagada_editada`). Ecos de localização/enquete da API com o texto
> completo (P-077 — muda o `text` do webhook). D-030. 471 unit + 281 e2e + 122 (painel). **Produção
> segue em `768fb26`** (deploy A e deploy G pendentes).

> **25/09/2026 (sessão `e23-conversas-painel`, código na branch da Onda 8 — sem deploy):** painel com
> balões fiéis ao WhatsApp Web no Inbox e no Atendimento — mídia pelo gateway como blob (fim do
> `<audio>` que recarregava a cada 2,5 s e do `<img>` barrado pelo CORP), tiques ✓/✓✓ (só exibição) e
> reações ao vivo, prévias sem "…"; `senderJid` de mensagem de GRUPO passa a ser o participante (muda
> o webhook `message` em grupo — INTEGRACAO §3.2 item 9) + `senderName` no `GET /messages`; `/media`
> deixa de dar 500 com nome/mimetype fora do Latin-1 (P-076). Sem migration. 530/530 + 118/118
> (painel). **Produção segue em `768fb26`** (deploy A e deploy G pendentes).

> **25/09/2026 (sessão `e22-conversas-gateway`, código na branch da Onda 8 — sem deploy):** conteúdo
> fiel das mensagens nas duas engines (tipos `location`/`contact`/`poll`/`event`/`group_invite`/
> `poll_vote` no lugar do "…"), **reação fora do evento `message`** (só `message.reaction`) em tabela
> própria `wa_message_reactions` e **contando no reply-rate no mesmo deploy** (D-028 —
> `GUARDRAIL_ENFORCE=true` em produção), selo "Encaminhada", `status` no feed da caixa única.
> Migration aditiva `20260925203458_reacoes_encaminhada`. Muda o que o n8n recebe (INTEGRACAO §3.2 —
> lista do que conferir nos fluxos). 477/477. **Produção segue em `768fb26`**; a `main` já está à
> frente (Onda 1 mergeada, deploy A pendente).

> **25/09/2026 — deploy MANUAL nos dois apps (D-027):** o dono desligou todo auto-deploy do
> Dokploy ("por enquanto"); merge na `main` não publica nada — gateway e dashboard sobem no
> **Deploy** manual. Produção segue em `768fb26` até o Deploy da Onda 1 (deploy A).

> **25/09/2026 (sessão `e4-rotas-egress`, código na branch da Onda 1 — sem deploy):** rate-limit,
> request-log e auditoria decidem pela **rota resolvida** (`routeOptions.url`) em vez de `req.url` —
> teto do login em contador próprio via `@RouteConfig` (D-025); egress com `net.BlockList` (IPv6
> v4-mapeado em hexa, NAT64/6to4/Teredo e TEST-NETs recusados — D-026); fotos de grupo/perfil por
> URL passam pelo `safeFetch` (P-070, antes `fetch` cru); forma absoluta com `?`/`#` antes do caminho
> → 400 na borda (P-071). 360/360 testes; smoke do login no CI contra a imagem. **Produção segue em
> `768fb26`** até o merge do PR #6 (deploy A).

> **25/09/2026 (sessão `e3-patches-seguranca`, código na branch da Onda 1 — sem deploy):** Nest 11.2.6
> (GHSA-9c5c), multipart 10.1.2 + upload com 2+ arquivos = 413 (D-024), bullmq 5.81.5, protobufjs
> 7.6.6 e transitivos com advisory de repositório (proxy-addr 5.1.1 critical, busboy, fast-uri);
> workflow diário `advisories.yml` com aceites datados (D-023); Node do gateway fixado em
> `node:26.10.0-bookworm-slim` (a imagem de 15/09 usou a tag móvel — Node/undici ao acaso do cache). **Produção segue em `768fb26`** (Nest
> 11.2.3 afetado pelo GHSA-9c5c — só perda de log; multipart 10.1.1 → 500 com 2 arquivos) até o
> merge da Onda 1.

> **25/09/2026 (sessão `onda0b-mapa-roteiro`, doc-only — sem deploy):** decisões do dono —
> **as duas engines seguem vivas** (Baileys = frota atual; wwebjs pronto para uso sob demanda →
> Onda 6 obrigatória antes de 13/10, D-021); sinal duro de restrição → **pausar até o fim informado
> pelo WhatsApp + alertar** (D-022); premissa do stop-first corrigida (D-020 — com Update Config
> vazio o Dokploy aplica start-first até o B-004). Produção inalterada desde 15/09 (`768fb26`).

> **23/09/2026 (sessão `analise-atualizacoes`, doc-only — [relatório](analise-atualizacoes-2026-09.md)):**
> **frota 100% Baileys segundo o dono** (o wwebjs saiu por consumo de RAM/CPU — migração pós-15/09
> ainda sem D-xxx; ver [análise de memória](analise-wwebjs-memoria-2026-09.md)). Achados que valem
> para toda sessão: **Dokploy com Update Config vazio aplica `start-first`** (não stop-first — runbook
> e D-014 errados; todo deploy sobrepõe containers até o **B-004**); produção **sem backup** (B-005);
> MinIO community com CVE-2026-41145 e API pública (B-006); Nest 11.2.3 afetado por GHSA-9c5c (high,
> invisível ao npm audit → P-054); nenhuma versão nova de Baileys (rc14) nem wwebjs (1.34.7). **O
> `.cloud` é a produção — não existe homologação.** Próximo passo = Onda 0 (B-004..B-007, dono) e
> Ondas 1–2 (P-053..P-055, P-047..P-052). Detalhe: `sessions/DONE-2026-09-23-1750-analise-atualizacoes.md`.

> **31/08/2026:** produção AGORA roda no Dokploy novo (VPS 89.116.73.121, projeto `conexozenvo`, app `gateway`; `api.conexozenvo.cloud` vivo e `api.conexozenvo.com` reapontado via DNS). MinIO criado (bucket `wa-media`) → `checks.storage=true`. Deploy da sessão `envio-sem-onwhatsapp` (main `66b7076`) validado ~20:45 UTC — envio Baileys sem consulta de existência (`resolveJid` local). Detalhe: `sessions/DONE-2026-08-31-1730-envio-sem-onwhatsapp.md`.

> **09/09/2026 16:41 UTC (sessão `aplicacao-auditoria`):** as ondas A–H da auditoria 09/2026 estão **EM PRODUÇÃO** — PR #1, CI verde, merge ff `2836c65`, container `7192ca1ec8cd` healthy às 16:41:47. Validado na mesma conversa: migration `20260909150000_send_intents_reserva_campanha` aplicada no boot; reidratação escalonada de 20 sessões em ~3 min com as 5 que estavam WORKING antes (contato11, contato20, Diogo, contato1, contato2) de volta a WORKING; contato20 (a "presa" da P-025) subiu após 1 retentativa de init em 24 s; sessão nova `ddd` pareou por QR em ~30 s; logout de 14 sessões presas/em QR em <0,5 s cada; `POST /webhooks` e `/messages/media-url` com destino privado → 400 (egress); cookie/authorization redigidos no log. Detalhe: `sessions/DONE-2026-09-09-1050-aplicacao-auditoria.md`.
>
> **09/09/2026 17:27 UTC (sessão `logs-sem-erro-batido`):** correção da regressão P-041 + "logs sem erro batido" (P-042) **EM PRODUÇÃO** — CI verde, merge ff `4af6f9b`, container `a226fb2dffdf` healthy 17:27:05. Validado na mesma conversa: `request completed` com `statusCode` em 28/28 requisições (0 nulos, era 100% null); 4xx viram linha `http <status> <método> <rota>: <motivo>` com sessão e `code`; `syncAddressBook falhou` agora traz mensagem + stack (era `e={}`); 0 linhas de console (dump do libsignal sumiu); egress 400 e redação de cookie reconfirmados. Reidratou as 6 sessões WORKING de antes; contato2 caiu em SCAN_QR (creds mortas, precisa reparear — pré-existente) e Diogo (Baileys) enviou normalmente mas o status persistido ficou STOPPED com erro vazio (sync de status a investigar, sem impacto funcional). Detalhe: `sessions/DONE-2026-09-09-1400-logs-sem-erro-batido.md`.

> **15/09/2026 ~14:07 UTC (sessão `caixa-unica-triagem`):** caixa única de triagem **EM PRODUÇÃO** — PR #4, CI verde (e2e novo `inbox-triage` 16/16 na 1ª execução real), merge ff `768fb26`, push 13:58:37 UTC, container novo healthy ~14:07 (uptime 42 s na 1ª leitura). Validado por fora na mesma conversa: `/api/inbox/conversations` e `/api/inbox/messages` passaram de 404 → **401** (rotas novas no ar com guard), `/health` com database/redis/storage true (migration `20260915140000_conversation_triage` aplicada no boot), dashboard novo confirmado (bundle de prod contém a rota `atendimento`). Fix de carona no MESMO deploy: MinIO de CI/dev → `quay.io` pinado (Docker Hub passou a negar `minio/minio`; MinIO de PROD não é afetado — é serviço próprio do Dokploy). **P-043 (prova cabal):** este foi o 1º deploy em que o container aposentado JÁ TINHA o `shutdown()` — conferência do dono no painel: sessões WORKING de volta sem STOPPED fantasma. Detalhe: `sessions/DONE-2026-09-15-1019-caixa-unica-triagem.md`.

> **09/09/2026 18:15 UTC (sessão `baileys-shutdown`):** `BaileysEngine.shutdown()` (P-043) **EM PRODUÇÃO** — CI verde (run 34387489755), merge ff `301d42d`, container `047606fd42a3` healthy 18:15:29. Diogo (Baileys) reidratou às 18:15:21 e ficou **WORKING** com status limpo (18:15:30, erro vazio) — sem intervenção manual. Ressalva: este deploy aposentou o container `a226fb2dffdf` que AINDA era o sem correção (encerrou 18:15:29); desta vez o WORKING do container novo ganhou a corrida por 1 s, mas foi sorte de timing. A prova cabal vem no PRÓXIMO deploy, quando o container que sai já tiver o `shutdown()` e não gravar STOPPED. Frota: contato20/contato1/ddd WORKING; contato11 em SCAN_QR (creds mortas, reparear — pré-existente); as 14 deslogadas pelo dono seguem STOPPED.

- **Em produção:** conexozenvo.com (painel) + api.conexozenvo.com (API) no Dokploy (Docker Swarm)
- **Último deploy confirmado:** 15/09/2026 **~14:07 UTC** — `768fb26` (caixa única de triagem `/atendimento` + `/api/inbox/*` + fix MinIO quay.io), ver nota acima. Anteriores: 09/09 18:15 `301d42d` (Baileys shutdown) · 09/09 17:27 `4af6f9b` (logs) · 09/09 16:41 `2836c65` (auditoria) · 31/08 `66b7076`.
- **Deploy da onda M3:** 18/08/2026 **~11:50 UTC** (merge ff
  `4ea1c75` → push 11:47:25 → auto-deploy → container novo **11:50:26** healthy, ciclo ~3min).
  Validação: `/health` ok com uptime resetado e estável (19s→118s, database/redis/storage true,
  memória ~13%) · dashboard HTTP 200 · **CI novo passou na 1ª execução real** (run 32133482842,
  success em 4m36s — format:check + depcruise + suíte com coverage). Zero mudança de
  comportamento de runtime (M3 = tooling/testes); frota 100% Baileys (sem custo D-014).
  Conferência do dono (opcional): log de boot no Dokploy — reconexão da frota escalonada.
- **Deploy anterior:** 16/08/2026 **~23:43 UTC** — gateway no `d172b78` (auto-deploy do
  hotfix do Dockerfile; boot validado: Nest started, migration `indice_wa_contacts_phone` aplicada,
  1ª sessão Baileys conectada no **rc14** com pre-keys + LID, zero "Falha ao reidratar") e
  dashboard no `c96940c` (~22:11 UTC, Deploy manual — code-splitting + gzip_vary validados por
  fora). Cadeia do dia 16/08: ~17:50 Deploy manual `d75eab3` (**ativa P-019 watchdog + P-020
  dedup**) → ~22:11 Deploy manual `c96940c` nos 2 apps (dashboard OK; gateway Exited(1) por
  `Cannot find module 'zod'` — zod aninhado fora da imagem; Swarm segurou o antigo, SEM outage;
  migration ficou aplicada) → 23:36 push `d172b78` fix → auto-deploy → **23:43 container novo
  healthy**. Watch Paths "Teste 2" ✅ (código no topo → deploya). Deps agora em prod: NestJS
  11.2.1 · Prisma 7.9.1 · fastify 5.11.3 · **Baileys rc14** · pino 10 · BullMQ 5.81.3 (D-016).

- **Auditoria 07/2026: 100% ENCERRADA** — código (itens 3–26) e operacionais (O1–O4) todos ✅; detalhes em [auditoria-2026-07.md](auditoria-2026-07.md)
- **Proxies:** pool Webshare re-sincronizado (10/07), todos ALIVE de verdade (health-tester só aceita 2xx), sessões WORKING
- **DNS:** validado verde no Dokploy (10/07)
- **Guard-rail G1–G8:** implementado e **ATIVO em produção** (`GUARDRAIL_ENFORCE=true`, ligado pelo dono ≤13/08 — M2 concluída 18/08, D-017; rollback: `=false` + redeploy, funciona desde o D-007)
- **Node n8n** `n8n-nodes-conexozenvo-gateway`: publicado no npm (v0.4.1) — repo separado; o contrato `/api` atual é a v1 de fato (R0/R4)
- **Webhook de deploy do Dokploy:** intermitente no histórico (2 falhas em 03/07), mas disparou normal nos 2 pushes de 10/07 (~4,5 min de ciclo) — seguir observando
- **Watch Paths (13/08):** configurado nos 2 apps (gateway + dashboard) para NÃO redeployar em commit só de `docs/` — lista de inclusão `apps/<app>/**` + `packages/contracts/**` + `package.json` + `package-lock.json`. **Teste 1 OK** (push doc-only `cca541a` não gerou build em nenhum app). Teste 2 (código deploya) valida no próximo push de código real. Runbook: [how-to/dokploy-watch-paths.md](how-to/dokploy-watch-paths.md).
- **Push 13/08 (origin/main = `9cb5686`):** todas as ondas wwebjs (W1–W8 + qualidade/desempenho MAX) e a base v4.3 estão no remoto e **em produção** — deploy confirmado pelo `/health` (ver "Último deploy"). Resta só o smoke funcional (runbook [how-to/smoke-test-wwebjs-w8-qualidade.md](how-to/smoke-test-wwebjs-w8-qualidade.md)).

## Divergência dev × produção

| Onde                                  | O quê                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| feature/auditoria-melhorias-20260909  | **NÃO deployada** — 7 commits de código (ondas A–G da auditoria 09/2026) + docs. Base `b982d10`. Exige `EGRESS_ALLOW_HOSTS` se houver webhook interno; migration aditiva `20260909150000`. Ver checkpoint da sessão `aplicacao-auditoria`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| origin/main ↔ produção (última prova) | **DIVERGENTES pelo último deploy documentado:** base reconfirmada04/10 antes da feature `d19f056e5006b4ee18e0a0638a1979ba0d6de4c4`, após PR #43 MERGED/ci/imagens/advisories SUCCESS. P-105, brace-expansion runtime2.1.7/dev1.1.21/5.0.12 e ip-address10.7.1 integradas; três smokes preservados. Bracesdev3.0.3 triada documentalmente nesta feature, afetada/sem release npm corrigida, PR upstream72 aberto/sem aceite; PR/CI/merge finais canônicos no PR #44. Audit full17high/17pacotes/7GHSAs e omit13high/13pacotes/6GHSAs, ambos exit1 e objetos idênticos ao PR43. P-106 parcial/braces e basic-ftp afetados sem correção/aceite; fixFTP6.2.1 major fora ^5.0.2/sem backport5 encontrado. Equipe gateway reavalia02/11 ou antes com candidato compatível. Próximo E21/P-022 baseline agregada/lacuna restante comprovada. Produção documentada768fb26 sem consulta ao vivo; publicação/canários, stop-first/migrations e snapshots7dias/24h manuais preservados. |
| ~~feature/m3-qualidade~~              | ✅ **EM PRODUÇÃO 18/08 ~11:50 UTC** (merge ff `4ea1c75`; CI novo success na 1ª execução; branch deletada pós-merge). Onda M3 concluída — continuação = P-022                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ~~feature/dedup-status-alertas~~      | ✅ **EM PRODUÇÃO 16/08** (P-020/D-015, deploy ~17:50 UTC): dedup de `session.status` idêntico consecutivo — fim do spam de alerta zap/telegram                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ~~feature/otimizacao-deps-hotpaths~~  | ✅ **EM PRODUÇÃO 16/08 ~23:43 UTC** (D-016): deps atualizadas (NestJS 11.2.1, Prisma 7.9.1, fastify 5.11.3, Baileys rc14, pino 10, BullMQ 5.81.3) + otimizações (pool pg, recordMany em lote, ACK atômico, WEBHOOK_CONCURRENCY, teto de mídia, índice wa_contacts, code-splitting). Precisou de hotfix `d172b78` (zod aninhado fora da imagem — ver adendo no DONE da sessão). Majors deferidos → P-021                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~feature/wwebjs-store-travado~~      | ✅ **MERGEADA E EM PROD desde 13–14/08** (`3e74d25`/`4e30159`/`0e89017` — teto/probe, pin wwebjs `1780711` D-012, groupInfo sem getContacts + auto-heal; P-014 validado 14/08). Sessão encerrada 18/08                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ~~feature/m2-guardrail-ativo~~        | ✅ **MERGEADA em duas etapas:** `71d839f` em 18/08 trouxe a evidência conhecida então; a ponta remota histórica `f850cba`, com 12 coletas de 10–19/07, foi reconciliada no PR #13 (`2f02f02`) em 26/09. **Onda M2 concluída (D-017)**; `GUARDRAIL_ENFORCE=true` é o estado oficial documentado, sem nova verificação de produção nesta integração.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ~~feature/auth-refresh-rotation~~     | ✅ **EM PROD desde 19/07** (`ce204d1` — refresh-token rotation D-009, fim do 401 de 12h). Sessão encerrada 18/08 (a branch já nem existia)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Pendências operacionais

Nenhuma — O1–O4 concluídos. Observação contínua: intermitência do webhook de deploy do Dokploy (se um push não deployar em ~5 min: GitHub → Settings → Webhooks → Recent Deliveries + Deploy manual).

## Backlog de produto (fora das ondas — vira sessão R9 própria quando priorizado)

- ✅ **ENTREGUE 11/07/2026 — Escolha de proxy livre na criação de sessão** (D-008, sessão
  `2026-07-11-1753-proxy-na-criacao`): `GET /api/proxies/available` + `proxyId` opcional no
  `POST /sessions` (SINGLE/STICKY exclusivo, 1 proxy = 1 sessão) + dropdown no painel. Pendência
  residual (repo do node n8n): parâmetro `proxyId` opcional na operação de criar sessão.

## Processo (atualizado em 12/08 — D-011)

Base universal **v4.3** adotada (upgrade da v3.2 — D-010/D-011): regras canônicas em
`BASE_CONEXOZENVO.md` (raiz, R0–R21). Novidades v4.3 EM VIGOR: abertura de sessão lê
também [PENDENCIAS.md](PENDENCIAS.md) (quadro P-xxx/B-xxx) e preenche ECO DE LEITURA;
SESSOES.md tem seção 📢 Avisos; encerramento faz reconciliação documental (mapa de
gatilhos do R3); checkpoint ganhou BLOQUEADO EM VOCÊ + DOCS TOCADAS. Navegação em
[MAPA.md](MAPA.md); auditorias em [AUDITORIAS.md](AUDITORIAS.md); ondas de adoção
**A1–A7** (v3.2) + **A8–A11** (v4.3: projeção `.claude/`, gates de docs, bateria
única + varredura, reorganização docs/) em [ADOCAO.md](ADOCAO.md) — A1 backup segue
sendo a mais urgente: produção SEM backup do banco.

## Próximos passos

0. ✅ **P-019 + P-020 + D-016 ATIVADOS 16/08** (deploys de ~17:50 e ~23:43 UTC — ver "Último
   deploy"). Ações do dono que RESTAM: pausar/desligar autostart das Baileys não-pareadas (P-018,
   painel), rotacionar a `X-Api-Key` (exposta 2× em chat) e tirar `Webshare 20 proxies.txt` da
   raiz. Revalidar a build do WA Web ~início out/2026 (expira 13/10 — B-002). **Sessão wwebjs:
   REMOVIDA da frota no fim de 14/08** (frota atual = 18 Baileys); recriar quando precisar de
   leads (1 QR; bootstrap sempre completa).
1. ✅ **M2 CONCLUÍDA 18/08** (D-017): enforce ativo em prod desde ≤13/08, janela + teste 423 aprovados, docs mergeados (`71d839f`). Próxima onda de trabalho = **M3** (item 2)
   1b. **Estabilidade de sessão — P0 ENTREGUE 21/07** (sessão `DONE-2026-07-21-1730-estabilidade-sessoes`): mutex Baileys · creds limpas no loggedOut · `POST /:id/new-qr` + botão do painel · 401 → /login. Restam P1/P2 (watchdog, auto-heal DEGRADED, DisconnectReason, reconexão wwebjs — backlog no arquivo DONE da sessão; vira sessão nova quando priorizado)
   1c. **Anti-flag de sessão — CÓDIGO ENTREGUE 22/07** (sessão `DONE-2026-07-22-1700-hardening-antiban`): fingerprint realista por sessão · log de conexão sem proxy · `WA_REQUIRE_PROXY` (default false). Diagnóstico: proxies eram Webshare DATACENTER (`mode=direct`) — flag na conexão. **AÇÃO OPERACIONAL do usuário (em curso):** migrar p/ proxy RESIDENCIAL BR (adquirido — Webshare static residential, 20 IPs SP), importar em massa (`user:pass@ip:porta`, source MANUAL), atribuir 1 IP/sessão (Proxy fixo), ligar `WA_REQUIRE_PROXY=true` no Dokploy, re-vincular. Backlog: health-tester só testa ipify (não prova reputação WhatsApp).
   1d. **Adoção A1 (backup)** → A2 (gates) → A3 (fuso) · da v4.3: A8 (`.claude/`) →
   A9 (gates de docs) → A10 (bateria única + varredura) — ver [ADOCAO.md](ADOCAO.md);
   pendências e bloqueios agora centralizados em [PENDENCIAS.md](PENDENCIAS.md)
   (B-001 = migração proxy residencial, em curso com o usuário)
   1e. **Motor wwebjs — ANÁLISE ENTREGUE 12/08** (`analise-wwebjs-2026-08.md`): 3 defeitos P0, 12/28 métodos `nope()`, zero e2e, webVersion a semanas de expirar. Plano em ondas (P-007 W1 → P-008 W2 mídia → P-009 W3 ciclo de vida → P-010 W4 superfície → P-011 W5–W8 recursos novos).
   1s. **wwebjs W7 busca — ENTREGUE 13/08 (FECHA O W7)** (sessão `DONE-…-0810-wwebjs-w7c-search`, P-011): `GET /api/sessions/{s}/messages/search?q=termo` (opcional `&chatId=&limit=`) busca no banco (`wa_messages.text`, ILIKE) — **agnóstica de engine** (funciona no Baileys), alcança o histórico do backfill. Mergeado na main local, **NÃO pushado**. **W7 COMPLETO:** backfill + gestão de chat + busca. Do plano wwebjs (analise-wwebjs) resta recurso novo diverso (W6 restante, canais completos, vCard, reply/quote) + P-012 `recordHardSignal`.
   1r. **wwebjs W7 gestão de chat — ENTREGUE 13/08** (sessão `DONE-…-0744-wwebjs-w7b-chat-mgmt`, P-011): `setChatFlag` (arquivar/fixar/silenciar/marcar não-lido) via `POST /api/sessions/{s}/messages/{chatId}/flag` `{flag, enabled}` — só WWEBJS, **501** no Baileys (archive/markRead exigem app-state sync). Idempotente. Mergeado na main local, **NÃO pushado**. **Fecha o W7 exceto `searchMessages`.**
   1q. **wwebjs W7 inbox (recurso NOVO) — 1º incremento ENTREGUE 13/08** (sessão `DONE-…-0726-wwebjs-w7-inbox`, P-011): **backfill de histórico**. Descoberta: a inbox de LEITURA já existia (banco `wa_messages`, agnóstica de engine). O W7 é POPULAR: `POST /api/sessions/{s}/messages/sync` (`{chatId?, limit?, maxChats?}`) puxa o histórico da engine (`getChats`/`fetchMessages` no wwebjs; **501** no Baileys) e grava direto no banco (dedup por keyId, **sem** EventBus → não dispara webhook/reply-rate). Mídia histórica sem binário. Mergeado na main local, **NÃO pushado**. Restam do W7: gestão de chat (archive/pin/mute) + `searchMessages`. Contracts→P-013.
   1p. **wwebjs qualidade/desempenho MAX — ENTREGUE 12/08** (sessão `DONE-…-2043-wwebjs-qualidade-max`): **desempenho** — extração de leads em LOTE (round-trips CDP O(N)→O(N/50): `getContacts` 1× + `getContactLidAndPhone` em blocos de 50; grupo grande volta em segundos). **Correções** — presença global `available`/`unavailable` real (antes mentiam `ok`), `requestPairingCode`→`PAIRING_CODE` + listeners `code`/`change_state` (diagnóstico de queda), guard de Chromium ausente, higiene (clearTimeout/cache/early-return). **Anti-flag** — UA realista e estável POR SESSÃO + `WWEBJS_*` no zod (**fecha a parte de UA da P-012**; resta só `recordHardSignal` morto). **Recurso NOVO (W8, 2 engines, aditivo R0)** — administração de grupo: `GET/POST …/groups/:g/membership-requests` (fila + approve/reject com anti-flood), `POST …/settings` (announce/restrict), `POST …/photo` (por URL). Pushado 13/08 (deploy disparado). Contracts→P-013.
   1o. **wwebjs P-012 (correção) — announce/restrict reais 12/08** (sessão `DONE-…-1959-wwebjs-p012-announce-restrict`): grupos do wwebjs devolvem `announce`/`restrict` REAIS (era `false` fixo). Item "dashboard por engine" da P-012 virou obsoleto (W4). Pushado 13/08 (deploy disparado). Resta da P-012: `recordHardSignal` morto (o anti-flag/UA do wwebjs foi entregue na sessão qualidade-max, item 1p).
   1n. **wwebjs W8 (recurso NOVO) — ENTREGUE 12/08** (sessões `DONE-…-1941-wwebjs-w8-perfil-conta` e `DONE-…-1947-wwebjs-w8b-foto-perfil`): **perfil da conta completo** — `POST /profile/status`, `/profile/name` e `/profile/photo` nas 2 engines, aditivo. Pushado 13/08 (deploy disparado). Membership requests e admin-only toggles ENTREGUES na sessão qualidade-max (item 1p); resta de recurso novo o W7 inbox (assimétrico).
   1m. **PUSH de TODAS as ondas wwebjs FEITO 13/08** (origin/main = `3f7c611`): W1–W8 + qualidade/desempenho MAX (item 1p) + base v4.3 no remoto — **deploy disparado, aguardando confirmação operacional**. **Checklist de validação em produção:** [how-to/smoke-test-wwebjs-w1-w6.md](how-to/smoke-test-wwebjs-w1-w6.md) (prova de deploy, smoke por onda, rollback, B-001/B-002). O push reinicia o gateway (R0) — se havia sessão wwebjs real conectada, conferir se voltou (reconexão automática da W1; senão `POST /restart`).
   1l. **wwebjs W6 (recurso NOVO) — 1º incremento ENTREGUE 12/08** (sessão `DONE-2026-08-12-1921-wwebjs-w6-webhook-reacoes`): webhook mais rico — evento **`message.reaction`** (reações recebidas) nas 2 engines, aditivo. Pushado 13/08 (deploy disparado). Restam do W6: edição, revogação, votos (`vote_update`), `change_state`, `group_*` (deferidos — Baileys exige protocolMessage/decifrar).
   1k. **wwebjs W5b (recurso NOVO) — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1902-wwebjs-w5b-location-poll`): **enviar localização** (`POST /messages/location`) e **enviar enquete** (`POST /messages/poll`) nas 2 engines, aditivo. Pushado 13/08 (deploy disparado). Deferidos com motivo: reply/quote (Baileys sem `raw` inbound), captura de votos, vCard.
   1j. **wwebjs W5 (recurso NOVO) — 1º incremento ENTREGUE 12/08** (sessão `DONE-2026-08-12-1746-wwebjs-w5-mensagens-ricas`): **reações** (`POST /messages/:msgId/reaction`) e **menções** (`mentions[]` em text/media-url) nas DUAS engines, aditivo (R0). Pushado 13/08 (deploy disparado). Restam do W5: reply/quote, poll+vote_update, localização, vCard (P-011); formalizar contracts = P-013 (bloqueado por R9 na sessão auth-refresh).
   1i. **wwebjs W4 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1736-wwebjs-w4-superficie`, P-010 ✅): os 14 métodos antes "não suportados" (grupos completos, checkNumbers, profilePicture, setBlock, canais beta) IMPLEMENTADOS — **paridade IEngine wwebjs × Baileys**. Pushado 13/08 (deploy disparado). Do plano wwebjs resta só recurso NOVO (P-011 W5–W8) + polimentos (P-012).
   1h. **wwebjs W3 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1723-wwebjs-w3-ciclo-vida`, P-009 ✅): fim do vazamento de perfil Chromium no DELETE + `new-qr` recupera sessão wwebjs (limpa LocalAuth em disco) + `destroy` com teto + `qrBase64`/cache com teto + `nope()`→HTTP 501. Pushado 13/08 (deploy disparado). Próximo: W4 (implementar os 12 `nope()` — API existe na lib; P-010).
   1g. **wwebjs W2 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1715-wwebjs-w2-midia`, P-008 ✅): mídia no S3 nas duas direções (fim do 404 em `GET /media` para wwebjs) + envelope de webhook com a engine REAL (`engine:"wwebjs"`, antes tudo saía `baileys`) + `sendMediaAsDocument`/`Sticker` + guard de `sent` null. Pushado 13/08 (deploy disparado). Próximo: W3 (ciclo de vida — limpar LocalAuth no logout/new-qr/remove; P-009).
   1f. **wwebjs W1 — ENTREGUE 12/08** (sessão `DONE-2026-08-12-1702-wwebjs-w1-estabilidade`): reconexão automática + fim do `start` no-op + guard `WA_REQUIRE_PROXY` no wwebjs (fecha o vazamento de IP) + 1º teste da engine real. Pushado 13/08 (deploy disparado). **Restam ações operacionais do dono:** B-002 (revalidar `WWEBJS_WEB_VERSION` no Dokploy antes de expirar ~fim ago) e B-001 (proxy residencial por sessão — agora o `WA_REQUIRE_PROXY=true` protege o wwebjs de verdade). **Deploy R0:** o push reinicia o gateway — não fazer em rajada com sessão wwebjs real conectada.
2. ✅ **M3 CONCLUÍDA E EM PRODUÇÃO 18/08 ~11:50 UTC** (deploy validado + CI novo verde). Continuação incremental (mais testes de domínio, jobId sem `:` por teste, threshold de coverage) = **P-022**. Próxima onda de trabalho = **M4 · Segurança** (A1 backup é a mais urgente — produção SEM backup do banco)
3. Node n8n (repo separado): parâmetro `proxyId` na criação de sessão (D-008)
