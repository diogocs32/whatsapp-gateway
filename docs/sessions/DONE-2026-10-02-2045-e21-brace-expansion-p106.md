# Sessão: E21/P-106 — brace-expansion residual

- **Status:** ✅ recorte runtime2.x encerrado em código; P-106 parcial, PR/CI/merge finais canônicos.
- **Início:** 02/10/2026 20:45 BRT.
- **Branch/base:** `feature/onda21-brace-expansion-p106`, `origin/main=130e8bdf3507c1da3de0d9b1af9b844991ac3961` (merge PR #38).
- **Objetivo:** triar as duas cópias brace-expansion 2.1.4 da cadeia WWEBJS/archiver; correção mínima compatível se comprovada, revisão independente, um PR, CI verde e merge ao fim.
- **Escopo:** lockfile dessas duas cópias, validação sintética pertinente e documentação/mapa. Manifests/allowScripts/patches preservados.
- **Fora do escopo:** outras cadeias residuais, major/downgrade/override/aceite por hipótese, API/env/schema/engine, ATIVA WWEBJS, conta/QR/check/envio real, produção/Dokploy/deploy/canário, payload de DoS.

## ECO DE LEITURA

AGENTS, BASE v4.3 (R0/R3/R6/R8/R9), ESTADO, SESSOES completo (ativas, todos avisos e cinco últimas), PENDENCIAS B-xxx/P-022/P-038/P-062/P-099..P-106, roteiro E21/P-106, triagem E21, auditoria §7.5 e DONE-2026-10-02-1043-e21-sharp-p105 lidos. Fetch confirmou HEAD/origin/main em 130e8bdf; PR #38 MERGED e ci/imagens/advisories SUCCESS reconfirmados por gh. Roteiro autoriza commit/push/PR/merge após revisão e CI verde; publicação manual D-027.

Sessão ativa lid-envio-wwebjs vista: pasta WWEBJS e seu ATIVA não serão editados. Avisos D-047/G4/G5, D-048/QR, D-049/ACK, D-050/purge, contratos W5/E20, E19/Vitest/CJS/buildinfo, epochs/lease/CAS/8s e guards/patches anteriores absorvidos. Cinco últimas: P-105/sharp, P-104/bootstrap/applied, P-022/C10/default, agendamento e health. sharp 0.35.5/librsvg 2.63.2 e smoke pós-prune preservados. P-022 continua parcial, P-100/P-101/P-102 abertas e P-099 sem drenar; Prisma/Puppeteer seguem P-038/P-062, sem duplicar pendências.

`.codex/`, AGENTS.md, seed-mock.js e apps/gateway/prisma/seed-mock.ts preservados por hash. Nenhuma consulta/operação produtiva. Gates C/D/E/F/B-004/B-005/B-007, stop-first D-049/D-050 e snapshots E21 7 dias/24 h permanecem manuais.

## Triagem inicial — antes da edição

npm ls confirma brace-expansion 2.1.4 por minimatch 9.0.9 e 5.1.9 via archiver 7.0.1; cópias 1.1.18 (build Nest) e 5.0.9 (dev ESLint) apenas serão inventariadas. Parecer de viabilidade/impacto/validação será apresentado antes de alterar lock/dependências. Provas temporárias em /tmp/conexozenvo-p106/.

## Recorte aprovado por evidência antes da edição

Audit baseline atual exit1: 1 moderate/14 high, 15 pacotes/13 GHSAs; vulnerabilities idêntico ao audit após P-105. Advisories oficiais 6j4f/qhr7/q2hr corrigem respectivamente 2.1.5/2.1.6/2.1.7. Faixas parentais ^2.0.2 (minimatch9.0.9) e ^2.0.1 (minimatch5.1.9) aceitam 2.1.7; CommonJS/balanced-match ^1.0.0 e ausência de install script preservados. Viabilidade/impacto/estratégia comunicados antes de editar.

Gerar atualização nomeada npm update brace-expansion em cópia descartável dos manifests/lock, aproveitar exclusivamente as duas entradas 2.x regeneradas (archiver-utils e readdir-glob), recusando mudanças extras dev1.x/5.x. Exigir diff estrutural fechado, npm ci --strict-allow-scripts no toolchain26.10.0/npm11.19.1 e patches. Gate sintético real: resolução das duas cadeias, padrões comuns/seleção/exclusão e ZIP/conteúdo sem extrair entrada externa; imagem final após prune, node/sem rede. Sharp smoke intacto. Suites/gates/builds/imagens/revisão/CI/merge ao fim. Nenhum payload DoS.

Reachability: WWEBJS importa RemoteAuth/archiver mesmo com FencedLocalAuth, mas compressSession usa directory(tempDir,false) sem pattern/ignore/skip. Nenhuma invocação RemoteAuth/glob com padrão não confiável encontrada no produto; isto não atesta ausência global ou exploração. Prisma/Puppeteer residual continua no contexto P-038/P-062.

## Fontes e evidência instalada

- [6j4f](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p): faixa2.x <2.1.5, fix2.1.5; [qhr7](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-qhr7-859c-m2p7): <2.1.6, fix2.1.6; [q2hr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr): <2.1.7, fix2.1.7. Fontes oficiais acessadas02/10; disponibilidade, sem payload executado.
- [Release2.1.7](https://github.com/juliangruber/brace-expansion/releases/tag/v2.1.7)/[compare2.1.4..2.1.7](https://github.com/juliangruber/brace-expansion/compare/v2.1.4...v2.1.7): CommonJS/balanced-match ^1.0.0 preservados, sem lifecycle install; parser iterativo, profundidade e rewrites limitados. Registry [metadata2.1.7](https://registry.npmjs.org/brace-expansion/2.1.7) e source/semver pais confirmados.
- Lock:6075-6184/12329-12356 mostra archiver7.0.1 → archiver-utils5.0.2/glob10.5.0/minimatch9.0.9/^2.0.2 e readdir-glob1.1.3/minimatch5.1.9/^2.0.1. Brace optional2.x em6113/12339; dev5.0.9/1.1.18 em6571/8908 fora do recorte. npm ls exit0 antes/depois.
- WWEBJS index.js:32 importa RemoteAuth; RemoteAuth.js:7 requer archiver. Gateway wwebjs.engine.ts:93/916 configura FencedLocalAuth. RemoteAuth.compressSession:200-218 usa directory(tempDir,false), sem padrão. archiver/core.js:632-635/679 envia somente stat/dot; readdir-glob/index.js:130-157 só cria matcher com pattern/ignore/skip. file.expand em archiver-utils/file.js:53-65 e archive.glob em core.js:725-752 exercitam cadeias9/5 respectivamente.
- [WWEBJS Authentication](https://wwebjs.dev/guide/creating-your-bot/authentication.html), [Archiver API](https://www.archiverjs.com/docs/archiver/) e Context7 /archiverjs/node-archiver confirmam LocalAuth/perfil, RemoteAuth/backups e directory/glob/finalize. [Unzipper Open.buffer](https://github.com/ZJONSSON/node-unzipper#openbuffer) + fonte instalada permitem ler somente ZIP gerado em memória, sem extração.

## Validação local concluída

Artefatos temporários em /tmp/conexozenvo-p106/; não são estado produtivo nem substituem CI remoto.

- **Lock/instalação:** npm update brace-expansion --package-lock-only --ignore-scripts --audit=false --fund=false executado no cwd real da cópia descartável candidate. Gerou quatro entradas; somente duas2.x retidas. Primeira tentativa com --prefix (cwd principal e /tmp symlink) produziu caminhos de candidato incompatíveis; recusada antes de qualquer cópia para o lock real. Diff estrutural final: exatamente dois nós, somente version/resolved/integrity; nenhuma outra entrada/metadado muda. npm ci --strict-allow-scripts com Node26.10.0/npm11.19.1/PUPPETEER_SKIP_DOWNLOAD passou, patches aplicados (install.log/named-update.log/npm-ls.log).
- **Reachability/baseline:** brace-baseline.cjs/log, com2.1.4, verificou import puro WWEBJS sem Client (archiver/duas cópias carregadas, zero expansão), seleção real pelas duas cadeias e ZIP/directory compatíveis. Directory não acrescentou chamadas brace. Não foi localizada invocação RemoteAuth nem padrão não confiável do produto no caminho; isto não é ausência global comprovada nem exploração/incidente produtivo.
- **Smoke/controles:** scripts/smoke-brace-expansion.cjs resolve ambas as versões corrigidas pelos pais reais/distintos; padrões pequenos aninhados/ranges/escape/unmatched, positivos/negativos, seleção/exclusão, ZIP/conteúdos e directory com dez arquivos/subdiretório/dotfile/nome literal. Host Node26.10.0/darwin-arm64 passou (brace-host-toolchain.log). Cinco controles por preload temporário recusados por assertions: versão2.1.6 em cada cópia, seleção archiver-utils errada, seleção readdir errada e conteúdo ZIP adulterado; controle positivo antes/depois passou. Logs brace-negative-*.log. Sem alterar deps instaladas; fixtures limpas em finally. node --check/Prettier aprovados; ESLint atual ignora .cjs, portanto não prova análise estática desse script.
- **Revisão independente:** subagent independent_review aprovou código/deps sem bloqueantes; lock/manifests/patches/sharp por bytes, pais/faixas, smoke independente e fechamento/erro/cleanup conferidos. Revisão é local, distinta da CI/imagem/prova produtiva.
- **Advisories/audit:** autoteste e scan estrito exit0, 64 repos configurados, zero pendências/falhas/aceites novos (advisories-strict.json/log). Audit --omit=dev antes: exit1, 1 moderate/14 high,15pacotes/13GHSAs, vulnerabilities idêntico ao após P-105. Depois: exit1,1moderate/13high,14pacotes/10GHSAs. Sai somente brace-expansion/três GHSAs; objetos restantes integralmente idênticos. Não é gate verde nem contagem de incidentes; scan estrito tem cobertura própria. audit-before/after.json.
- **Suites/gates:**1901gateway em118arquivos com coverage (statements75,66%,branches68,26%,functions73,45%,lines77,36%) e292painel em14arquivos. Lint ignora exclusivamente os dois seeds locais preexistentes; depcruise304módulos/1143dependências, três typechecks, Prisma generate, ambos builds e guardas patches/dist/deps/prisma aprovados. Logs coverage/dashboard-test/lint/depcruise/tsc-_/generate/build-_/guard-*.log.
- **Imagens:** ambos Dockerfiles --check/build Linux/amd64 passaram (docker-check-_/image-_.log). RUN final após prune, node/--network=none: brace2.1.7 nas duas cadeias, cinco arquivos selecionados/dez directory/conteúdos; sharp0.35.5/rsvg2.63.2/vips8.18.7/glibc2.36, seis JPEGs sintéticos pelos helpers reais. Smoke sharp por bytes preservado e /tmp/guardas removido depois dos gates. Outros targets não foram executados.
- **HTTP isolado/cleanup:** infra descartável tmpfs, schema fresco e zero wa_sessions (smoke-sessions.txt). Health DB/Redis/storage true; login201/cookie, API inválida401, dez logins inválidos401/11º429; painelSPA/assets aprovados (health.json/smoke-auth.log/smoke-dashboard.log). Compose --profile gateway down exit0 e filtros de containers/redes P-106 vazios (smoke-cleanup.log); infra local preexistente intacta.

## Encerramento e reconciliação R3/R9

P-106 parcial: recorte runtime2.x concluído; dev1.1.18/5.0.9 e demais residuais continuam no mesmo P-106. Próximo candidato é triagem basic-ftp/GHSA-c475-qrg2-pj4r; audit atual marca fixAvailable=false, sem decidir solução por esse campo. Prisma/mysql2/deepmerge e Puppeteer/extract-zip seguem P-038/P-062/§7.5, sem duplicação. Nenhuma hipótese aceita, exploração ou versão produtiva consultada.

Diff dispara documentação do gate/imagem e estado da etapa: triagem E21, auditoria§7.5, mapa/índice, pendência, roteiro/mensagem, changelog, sessão/histórico/ESTADO reconciliados. Mapa gerado --check passa, sem alteração de código src. Sem mudança de API/contrato/env/schema/provider/comando package.json/regra da base/decisão cara: INTEGRACAO/contracts/ARQUITETURA/CLAUDE/BASE/DECISOES não têm gatilho. Nenhum arquivo preexistente protegido ou ATIVA WWEBJS alterado; hashes reconferidos.

## CHECKPOINT R9

- **O QUE FOI FEITO:** triagem, atualização mínima de duas cópias runtime2.x, gate de resolução/seleção/ZIP após prune, cinco controles negativos, revisão independente, suites/imagens/HTTP sintéticos e documentação.
- **ARQUIVOS:** package-lock.json, apps/gateway/Dockerfile, scripts/smoke-brace-expansion.cjs e docs/mapa/estado/checkpoint.
- **PACOTES/DECISÕES:** somente brace-expansion2.1.4→2.1.7 em dois nós transitivos; nenhum pacote direto, major, override, downgrade, aceite novo ou D-xxx caro.
- **EFEITO DE DEPLOY:** nenhuma publicação executada; imagem homologada retém2.1.7 e os mesmos pais. Sem migration/env/API/QR/relogin novo.
- **AÇÕES OPERACIONAIS:** publicação/canários C/D/E/F e gates anteriores continuam manuais; nenhuma ação nova para fechar este recorte em código.
- **CLASSE DE ERRO E GATE:** resolução vulnerável/ausente após prune ou seleção/ZIP incompatíveis; smoke exige versões pelas duas cadeias e efeito real nomes/conteúdos, com controles de recusa.
- **BLOQUEADO EM VOCÊ:** nenhum para fechar código. B-001/B-003/B-004/B-005/B-006/B-007, D-049/D-050 stop-first e snapshots E21 7dias/24h mantêm ações manuais anteriores. P-022 parcial, P-100/P-101/P-102 abertas/P-099 sem drenar.
- **DOCS TOCADAS:** ESTADO, SESSOES/SESSOES_ARQUIVO, PENDENCIAS, ROTEIRO, CHANGELOG, MAPA/MAPA-CODIGO, triagem E21, auditoria§7.5 e este DONE.
- **VALIDAR:** suites/gates/mapa/format locais aprovados; CI remoto verde obrigatório antes de merge, provas finais no PR desta feature. Audit residual exit1 é limite explícito.
- **CONTINUAR:** mensagem P-106/basic-ftp no roteiro; fetch/origin/main após este merge, recorte próprio e fontes/faixas/alcance antes de editar. Dev1/5 permanecem P-106. Nenhuma conta/QR/check/envio real, produção/Dokploy/deploy/canário.
