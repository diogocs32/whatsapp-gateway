# 📘 DOCUMENTO UNIVERSAL DE PROJETOS — v4.3

### Laravel 13 · PHP 8.5 · Livewire 4 · Filament 5 · PostgreSQL 18 · Claude Code

**v2.0: Sessões Paralelas (R9) · v2.1: Monolito Modular + DDD (R10) · v2.2: MAPA.md (navegação) · v2.3: Protocolo de .env (R11) · v2.4: Criptografia em 2 níveis (R5) · v2.5: Gates de qualidade (R6), teste→go-live (R5), tuning (R11), Acessibilidade (R12) · v2.6: Tempo, fuso e relógio (R13) · v2.7: Assets estáticos e mídia (R14) · v2.8: Calibragem dos gates em produção (R6, R11, R13) · v3.0: Deploy de Excelência (R15), Hardening da imagem (R16), Cadência de auditorias (R17) e reforços R4/R6/R11 — lições de incidentes reais de produção · v3.1: Ciclo de vida da base — BASE_<NOME>.md e modos criação/adoção/upgrade (R18) · v3.2: Auditoria externa validada — CONCURRENTLY (R4), CSP nonce (R5), Rector fixado (R6), arquivamento de sessões (R9), identidade×domínio (R10), Temporal (R13), graceful shutdown (R15) · v3.3: Retenção no registry e higiene de custo de CI (R15, R6, R17) · v3.4: Comunicação entre sessões — PENDENCIAS.md, avisos e eco de leitura (R9) · v3.5: Ferramental de IA e agentes (R19), Briefing como loop de volta (R20), classe runbook e máquina nova (R3), gate do painel de sessões (R6) e matriz de decisão da stack (Parte 6) · v3.6: Continuidade do briefing — ID permanente, carimbo de corte, duas zonas e recibo de análise (R20) · v3.7: Automação que implementa regra também é gateada — mutação, falha vazia e etiquetagem por regra (R6, R17) · candidato descartado se registra (R20) · v3.8: Bloqueio externo (B-xxx) — o que o agente não pode fazer, com devolução especificada e contorno amarrado à remoção (R9, R5, checkpoint) · v3.9: Higiene de código (R21) — diagnóstico classificado, gate anti-recaída, lista do que NÃO é código morto e deploy vigiado · v4.0: Projeção operacional para Claude Code, verificada na doc oficial — CLAUDE.md enxuto + .claude/rules/ por path + skills de procedimento (R3, Parte 2), regra-que-vale-sempre vira HOOK e permissão versionada (R19, R6), sessão paralela = WORKTREE próprio (R9), governança de auto memory (R19), /run-skill-generator e /verify (R2, R8), dependências automatizadas (R17), gate de consistência BASE↔.claude (R6), compactação de sessão longa coberta (R9), revisão adversarial opcional (R6) e evolução plugin registrada (R18) · v4.1: Varredura universal integrada — R21 expandido para o protocolo executável V0–V9 (produção primeiro, código órfão com mapa por ecossistema, duplicação com julgamento escrito, melhoria dirigida por hotspot, três destinos dos achados), catracas no R6, cadência no R17, skill /varredura substitui /higiene, e Parte 7 nova: matriz capacidade × ecossistema, ferramentas verificadas na doc oficial e armadilhas universais · v4.2: Engenharia de documentação baseada em evidência (DORA/Diátaxis/Google) — R3 reescrito: 8 leis, três ciclos de vida (perene/append-only/efêmero), docs/ com how-to·runbooks·reference·explanation, ADRs imutáveis em decisions/ indexados pelo DECISOES.md, postmortems blameless amarrados ao R15, frontmatter com dono/frescor/validade, README como roteador em camadas, depreciação com banner e gatilhos de escrita; gates de docs ampliados (R6: frescor, frontmatter, comandos citados), execução trimestral de runbook sorteado (R17) e templates novos (Parte 3: README, ADR, runbook, postmortem) · v4.3: FIDEDIGNIDADE como Definition of Done documental — "o que este diff tornou falso?" substitui "atualizei a doc?": MAPA DE GATILHOS mudança→doc no R3, exceção só declarada (trailer Docs-n/a), gate docs-drift + correspondência estrutural no R6 (generalização do gate de env-drift que nunca falhou), RECONCILIAÇÃO DOCUMENTAL no encerramento do R9, campo DOCS TOCADAS no checkpoint (R1), hook Stop ampliado (R19) e amostra de fidedignidade na varredura (R21 V2)**

---

## PARTE 1 — O PROMPT UNIVERSAL v4.3 (preencha e salve como `BASE_<NOME>.md` na raiz do projeto — ver R18)

```markdown
# BASE DO PROJETO — [NOME]

> Base universal: v4.3 · aplicada em [AAAA-MM-DD] · modo: [criação | adoção]
> Arquivo canônico: BASE_<NOME>.md na RAIZ — nome fixo, um por repo (R18)

## PROTOCOLO DE ENTRADA (a IA executa antes de qualquer trabalho)

Detecte o cenário e execute o modo correspondente do R18:

- Não existe código ainda (só a ideia) → MODO CRIAÇÃO
- Existe código, não existe BASE_*.md na raiz → MODO ADOÇÃO
- Existe BASE_<NOME>.md em versão ANTERIOR a esta → MODO UPGRADE
- BASE_<NOME>.md já nesta versão → sessão normal: abrir conforme R9
  Na dúvida entre cenários: PERGUNTAR antes de agir.

## CONTEXTO

- O que faz: [1 linha]
- Usuários: [quantidade e perfil — B2B/B2C]
- Fase: [MVP | Produção]
- Dados sensíveis (LGPD art. 5º, II — saúde, biometria; tratar CPF
  neste nível): [sim | não] → "sim" torna OBRIGATÓRIO o R5 nível 2
- Referência de negócio: ver docs/PROJETO.md (se já existir)

## STACK OBRIGATÓRIA — NÃO SUGERIR ALTERNATIVAS

- Backend: Laravel 13.x + PHP 8.5 (Property Hooks, Asymmetric Visibility)
- UI: Livewire 4.x + Flux Pro 2.x
- Admin: Filament 5.x
- CSS: Tailwind 4.x + Vite 8
- Database: PostgreSQL 18 + extensões pg_trgm e unaccent
- Local: Laravel Sail (Docker)
- Deploy: Dokploy (Docker Swarm) — seguir docs/runbooks/preparar-ambiente-producao-dokploy.md
- Qualidade: Pest 4, PHPStan nível 9 (Larastan), Laravel Pint, Rector
- IA: Laravel Boost (guidelines + MCP), Context7 disponível —
  ferramental de agente segue R19 (permissões versionadas, hooks,
  allowlist explícita, o que é negado)
  QUANDO USAR CADA PEÇA: a stack é fixa, mas a escolha DENTRO dela
  (Livewire ou API, Redis ou database, timestampTz ou DATE...) muda por
  situação — matriz na Parte 6 diz o que usar E o que NÃO usar em cada uma.

## MOBILE (marcar o caminho deste projeto)

- [ ] Só web responsivo
- [ ] PWA (instalável, offline básico, sem lojas)
- [ ] Capacitor (embrulha o app Livewire → publica nas lojas)
- [ ] Nativo real (API Sanctum /api/v1 + Flutter)
      REGRA: independente da escolha, o projeto nasce API-ready
      (Sanctum instalado, rotas /api/v1 versionadas desde o dia 1).

## FUNCIONALIDADES PRINCIPAIS

1. [feature]
2. [feature]
3. [feature]

## MÓDULOS INICIAIS (bounded contexts — ver R10)

1. [Modulo] — [responsabilidade em 1 linha · principais tabelas]
2. [Modulo] — [responsabilidade]
3. [Modulo] — [responsabilidade]

- Shared — kernel mínimo compartilhado
  REGRA: na dúvida, MENOS módulos; divida quando a linguagem do negócio
  separar (nomes diferentes para a mesma coisa = fronteira aparecendo).

---

## REGRAS DE EXECUÇÃO (NÃO ALTERAR ESTA SEÇÃO)

### R1 — ROADMAP E CHECKPOINTS

Ao iniciar, exiba o roadmap completo (fases F0–F8).
Execute UMA fase por vez. Ao final de cada fase:

1. Emita o CHECKPOINT padronizado (template no fim)
2. Atualize ESTADO.md, CHANGELOG.md e o arquivo da SESSÃO atual (R9)
3. AGUARDE meu OK antes de prosseguir
   Nunca pule fases. Nunca execute comandos destrutivos sem confirmação
   — e comando destrutivo também é BLOQUEADO por hook (R19): a regra
   vale em duas camadas, instrução E enforcement.

### R2 — FASES DO PROJETO

F0 · Kickoff: criar documentação viva (R3) — incluindo a PROJEÇÃO
.claude/ (CLAUDE.md enxuto + rules, ver R3) —, mapa de
módulos (R10), registrar decisões iniciais
F1 · Ambiente: Sail up, .env e portas únicas conforme R11, APP_KEY,
extensões PG (pg_trgm, unaccent), verificar PHP 8.5 / Composer /
Node / Docker antes de qualquer código
F2 · Qualidade: Pest 4 + Larastan (nível 9) + Pint + Rector configurados,
composer scripts (test, analyse, format, check), CI GitHub Actions,
hook pre-commit rodando pint + phpstan; hooks de agente +
.claude/settings.json (catálogo do R19), skills de procedimento
(Parte 2) e /run-skill-generator (grava a receita de subir o app —
serve /verify, qualquer sessão e maquina-nova.md); smoke test do
artefato (R15) entra no CI assim que a imagem de produção nascer
F3 · Segurança base (R5): auth, MFA, WebAuthn/YubiKey, headers, rate limit,
auditoria, backup automatizado — TUDO antes da primeira feature
F4 · Features: desenvolvimento iterativo, teste antes do código (TDD),
uma user story por ciclo, sempre dentro do módulo dono (R10),
Filament para back-office
F5 · API v1: Sanctum, versionamento /api/v1, recursos JSON, rate limit próprio
F6 · Observabilidade (R7): Pulse, Sentry, healthcheck, notificações
F7 · Deploy: executar R15 integralmente — build once, smoke do
artefato, staging, promoção gated, pós-deploy com rollback pronto
F8 · Release 1.0: tag git, CHANGELOG consolidado, schema:dump das migrations

### R3 — DOCUMENTAÇÃO VIVA (engenharia de documentação, obrigatória e sempre atualizada)

Evidência antes da regra: a pesquisa DORA mediu que documentação de
qualidade MULTIPLICA o retorno de toda prática técnica (o mesmo
investimento rende ordens de grandeza a mais em times com doc acima
da média). Documentação não é apoio — é multiplicador. As regras
abaixo existem para garantir os três atributos que a DORA mediu:
ENCONTRAR em segundos · CONFIAR sem verificar · USAR sem tradução.

PRINCÍPIOS (as leis — tudo abaixo é consequência delas):

1. Docs-as-code: a documentação vive NO repositório, muda no MESMO
   commit/PR do comportamento que descreve, é revisada, tem dono e
   é testada no CI (gates no R6). Doc que chega depois já nasce errada
2. Um documento, um propósito: se descrever um doc exige "e também",
   ele é dois documentos — separe e linke
3. Minimalismo (Carroll): escreva o MÍNIMO que faz o leitor agir —
   tarefas reais, blocos independentes, suporte ao erro (o momento em
   que o leitor erra é quando ele mais lê); minimalismo não é escrever
   pouco, é não interferir entre o leitor e o objetivo
4. Documente o PORQUÊ; o código já diz o quê. Prosa que descreve
   comportamento compete com o código e perde. Só a doc registra:
   alternativas descartadas, restrição externa, armadilha que custou
   caro, modelo mental do domínio
5. Afirmação de estado carrega data + comando que verifica (CLASSE
   RUNBOOK, abaixo) — e comando citado TEM que existir
6. Todo documento tem UM dono nomeado (frontmatter) — sem dono,
   apodrece em silêncio
7. Uma fonte canônica por assunto; o resto APONTA com link, nunca
   copia — fato em dois lugares é divergência futura garantida
8. Estrutura organizada pela PERGUNTA do leitor, nunca pelo
   organograma nem pelo estado do autor. Pasta só existe se responde
   pergunta distinta + tem ciclo de vida próprio + tem dono; falhou
   em um dos três → é arquivo dentro de outra pasta

FIDEDIGNIDADE — A DEFINITION OF DONE DOCUMENTAL (a regra
operacional; "sempre atualizada" é aspiração, isto é o critério):

- Uma mudança está COMPLETA quando NENHUMA frase da documentação
  ficou FALSA por causa dela. Doc não é anexo da tarefa: é parte
  do DIFF. A pergunta de fechamento nunca é "atualizei a doc?"
  (subjetiva, e sob pressão a resposta é sempre "depois") — é
  "O QUE ESTE DIFF TORNOU FALSO?" (verificável, mecânica)
- MAPA DE GATILHOS — mudança no diff → doc obrigatória no MESMO
  commit/PR (é o que transforma "atualize a doc" em checklist
  determinística; o gate do R6 fiscaliza):

  | Se o diff contém...                      | Então toca junto                                    |
  | ---------------------------------------- | --------------------------------------------------- |
  | migration que cria/renomeia/move tabela  | ARQUITETURA.md § tabelas donas (R10)                |
  | contrato de módulo ou evento novo/mudado | ARQUITETURA.md § expõe/consome + 📢 aviso (R9)      |
  | rota/endpoint público novo ou mudado     | reference/api.md (ou README, enquanto não há)       |
  | env nova ou renomeada                    | .env.example (R11 — o gate-modelo que nunca falhou) |
  | comando/script novo em manifest          | README § comandos + CLAUDE.md § comandos            |
  | procedimento de operação mudado          | runbook correspondente + revisado_em                |
  | decisão cara de reverter                 | DECISOES.md (+ ADR pelo gatilho do R3)              |
  | fase concluída / rumo mudou              | ESTADO.md (no encerramento — R9)                    |
  | incidente de produção                    | postmortem + runbook (R15)                          |
  | regra da base mudada (R18)               | BASE + projeção .claude/ no mesmo commit (R6)       |

- EXCEÇÃO DECLARADA, NUNCA SILENCIOSA: diff que dispara gatilho sem
  a doc correspondente só passa com trailer `Docs-n/a: <motivo>` no
  commit. O encerramento (R9) lista os n/a da sessão; n/a
  RECORRENTE no mesmo gatilho é o mapa errado — ajusta-se o mapa,
  não se acumula exceção
- O OUTRO LADO DA REGRA (por que isso se sustenta): só se mantém
  fidedigno o que MERECE existir —
  · não escrever o que o código já diz (lei 4): prosa espelhando
  comportamento compete com o código e perde sempre
  · número volátil NUNCA em doc permanente: a doc guarda a POLÍTICA
  ("cobertura não cai"); o número do dia vive no DONE da sessão
  · lista que pode ser GERADA não se escreve à mão; lista à mão que
  espelha estrutura ganha gate de correspondência (R6) — ou não
  existe. Cada linha desnecessária é uma promessa de manutenção
  que não será cumprida: APAGAR também é manutenção
- Enforcement em TRÊS camadas (o padrão da casa — instrução é
  pedido, gate é garantia): o checkpoint DECLARA (campo DOCS
  TOCADAS — R1) · o hook Stop PERGUNTA (R19) · o gate docs-drift
  no CI DECIDE (R6)
  TRÊS CICLOS DE VIDA (o princípio organizador — pastas diferentes
  para ciclos diferentes; misturá-los é a origem da bagunça):
- PERENE: reescrito no lugar, sempre reflete o presente (how-to,
  runbook, referência, explicação/arquitetura)
- APPEND-ONLY: nunca editado, só acrescentado — é história (ADRs,
  postmortems, CHANGELOG)
- EFÊMERO: vive e morre no ciclo de trabalho, com status explícito
  no nome e política de arquivamento (ESTADO, SESSOES, sessions/,
  PENDENCIAS, briefings/, ADOCAO)

ESTRUTURA em docs/ (classificada por ciclo):
Âncoras operacionais e navegação (MAIÚSCULAS = âncora do protocolo):

- README.md — 3 linhas: aponta para o MAPA.md e os 2 destinos mais
  comuns (o GitHub renderiza docs/README.md ao abrir a pasta; o
  índice CANÔNICO é o MAPA — lei 7: um canônico, o resto aponta)
- MAPA.md — o ÍNDICE: legenda de toda sigla + tabela "Quero → abro"
  (navegação por INTENÇÃO, o item de maior retorno da documentação
  inteira) + convenção de citação
- PROJETO.md — visão, escopo, regras de negócio (muda raramente)
- ESTADO.md — estado GLOBAL consolidado: fase, feito, próximos [efêmero]
- ARQUITETURA.md — mapa de módulos, dependências permitidas e
  glossário da linguagem ubíqua (R10) [explicação, perene]
- AUDITORIAS.md — agenda viva de auditorias (R17)
- SESSOES.md · sessions/ · PENDENCIAS.md · briefings/ — o sistema de
  trabalho do R9/R20 [efêmeros — status no nome, arquivamento definido]
  Conteúdo por tipo (Diátaxis — kebab-case, minúsculo, sem acento):
- how-to/ — tarefas SEM pressão, título "como <verbo>...": arquivo
  começa com verbo no infinitivo (instalar-ambiente.md,
  maquina-nova.md); se o título não cabe em "Como <verbo>", está no
  tipo errado
- runbooks/ — procedimento SOB PRESSÃO (deploy, rollback, restaurar
  backup, girar chaves, checklist de virada): escrito para quem foi
  acordado às 3h sem contexto — gatilho, diagnóstico em árvore de
  decisão, mitigação, verificação, escalonamento; todo passo com
  COMANDO copiável e saída esperada, nunca instrução abstrata
  ("reinicie o serviço" não é runbook; o comando exato é). Template
  na Parte 3. Runbook nunca executado é ficção: 1 por trimestre é
  EXECUTADO de verdade, sorteado (R17)
- reference/ — consulta pura (tabelas, mesma estrutura sempre, zero
  opinião): api.md, variaveis-ambiente.md... Nasce SOB DEMANDA quando
  o conteúdo não couber mais no canônico atual (.env.example é o
  contrato de env — R11; MAPA cobre siglas; ARQUITETURA cobre o
  glossário de domínio); gerada da fonte sempre que possível
- explanation/ — porquês além da ARQUITETURA.md, sob demanda
- tutorials/ — só quando existir quem aprender (onboarding de
  terceiro); solo, dispensável sem culpa
  Decisões (append-only, imutáveis):
- DECISOES.md — ÍNDICE append-only: UMA linha por decisão
  (D-xxx · data · resumo · link) — é onde o código D-xxx resolve
- decisions/ — decisão CARA DE REVERTER ganha ADR completo
  NNNN-titulo-no-imperativo.md (formato Nygard — padrão Adopt do
  Technology Radar; template na Parte 3): contexto, decisão,
  consequências (o que melhora E o que piora). D-012 = decisions/
  0012-*.md. REGRAS: gatilho obrigatório = cara de reverter, cruza
  módulo, ou será questionada em 6 meses (decisão pequena fica só
  na linha do índice — ADR não é changelog); ADR aceito NUNCA é
  editado — mudou? novo ADR "substitui NNNN" e o antigo ganha
  "substituído por NNNN" (a trilha é o valor)
- postmortems/ — um por incidente de produção, AAAA-MM-DD-sintoma.md,
  BLAMELESS (todos agiram com a melhor informação que tinham — sem
  isso ninguém conta a verdade): resumo, linha do tempo, impacto,
  causa raiz, ações com DONO e PRAZO (ação sem dono e data é desejo).
  Amarrado ao PÓS-INCIDENTE do R15. Template na Parte 3
  Raiz do repo:
- BASE_<NOME>.md — este documento preenchido: identidade, regras
  R1–R21 e versão da base (R18)
- README.md — a PORTA: roteador, não manual. Responde as 5 perguntas
  de chegada nesta ordem: o que é/para quem (1 frase sem jargão) →
  está vivo? (badges que PROVAM: CI, versão, licença) → como rodo?
  (quick start ≤5 comandos, testado em máquina limpa — mais que isso
  é automação faltando) → como uso o básico? → onde está o resto?
  (link para docs/MAPA.md). Toda seção ≤ ~10 linhas terminando em
  link ("→ detalhes em..."); estrutura de pastas só 1º nível;
  passou de ~150 linhas → conteúdo desce para docs/. Template na
  Parte 3. TESTE DO README: máquina limpa + cronômetro até rodar —
  onde travou é o que falta
- CHANGELOG.md — Keep a Changelog + SemVer, escrito para HUMANOS
  (commit é para quem mantém; changelog responde "o que muda para
  mim se eu atualizar"): Added/Changed/Deprecated/Removed/Fixed/
  Security, mais recente primeiro
- SECURITY.md — política de reporte de vulnerabilidade (o GitHub a
  reconhece como arquivo de saúde do projeto)
- CLAUDE.md (raiz) — instruções para o Claude Code, ENXUTO
  (< 200 linhas; acima disso o próprio Claude segue menos — é
  limite documentado da ferramenta, não preferência de estilo):
  stack, comandos, a ordem de leitura obrigatória (1º ESTADO.md →
  2º SESSOES.md → 3º PENDENCIAS.md → 4º arquivo da própria sessão),
  os NUNCA inegociáveis e PONTEIROS — a regra completa vive na
  BASE_<NOME>.md e o detalhe por área em .claude/rules/. Só o que o
  agente NÃO consegue inferir do código (a evidência empírica é
  dura: arquivo de contexto gerado por IA e redundante com a doc
  PIORA o desempenho do agente e encarece cada tarefa — escrito à
  mão, enxuto, só o não-descobrível). Template na Parte 3.
  Comentário HTML (<!-- -->) não entra no contexto do agente

FRONTMATTER (metadados de manutenção — em how-to, runbooks,
reference e explanation; âncoras operacionais e ADRs dispensam):
tipo · dono (UMA pessoa) · revisado_em · validade · status

- revisado_em = data da última CONFERÊNCIA de que está correto,
  NÃO do último commit — corrigir vírgula não renova frescor
- validade por tipo: runbook 30–90d (o que mais apodrece e mais dói)
  · how-to 90–180d · reference a cada release (ou gerada) ·
  explanation 6–12 meses · ADR/postmortem NUNCA (história não vence)
- frescor vencido = doc NÃO verificada: reconferir antes de confiar;
  fila de vencidos é auditoria mensal (R17) e gate no CI (R6)
  DEPRECIAR EM VEZ DE APAGAR: doc que deixou de valer ganha banner no
  topo ("⚠️ DEPRECIADO em <data>. Substituído por <link>. Mantido como
  histórico") e some após 2 releases — alguém tem o link salvo, e o
  git guarda.
  GATILHO DE ESCRITA (não existe "semana de documentação" que
  funcione — documenta-se no momento da dor): decisão cara → ADR ·
  incidente → postmortem + runbook · mesma pergunta 2× → how-to ou
  reference · >30 min p/ entender o próprio sistema → explanation ·
  armadilha descoberta → seção de armadilhas do runbook · alguém novo
  travou → tutorial ganha o tropeço. Pergunta que deveria estar
  documentada É bug de documentação — registre como tal.
  REGRA: código sem documentação atualizada = fase incompleta.
  CRESCIMENTO: comece com arquivos, promova a pasta quando passar de
  ~400 linhas ou 3 assuntos; pasta nasce com 3 docs, não com 1;
  profundidade máxima 2 níveis dentro de docs/; sub-pasta por ASSUNTO,
  nunca por tipo repetido.
  PROJEÇÃO OPERACIONAL (.claude/ — derivada da BASE, versionada):
  A BASE é o CONTRATO e não encolhe; contexto enxuto é papel da
  projeção. O que o agente carrega em toda sessão é o mínimo; o
  resto carrega sob demanda:
- .claude/rules/_.md — as regras fatiadas por tema com frontmatter
  `paths:`: só entram no contexto quando o arquivo tocado bate no
  padrão. Fatias padrão: r13-tempo → database/migrations/\** ·
  r04-migrations → database/\** · r14-assets → resources/**,
  public/** · r10-fronteiras → app/Modules/\** · r11-env → .env_,
  config/**. Regra sem `paths` carrega sempre — poucas (R1 e o
  resumo do R9). Template na Parte 3.
- .claude/skills/ — procedimentos invocáveis por /nome (Parte 2);
  carregam sob demanda, custo ~zero até serem usados
- .claude/hooks/ + .claude/settings.json — enforcement e
  permissões do agente (catálogo no R19)
- .worktreeinclude — o que copiar para cada worktree (R9/R11)
  REGRA DE CONSISTÊNCIA: .claude/ é DERIVADO — delta de versão da
  base (R18) atualiza BASE e projeção NO MESMO commit; gate no CI
  confere versão declarada no CLAUDE.md == versão no topo da
  BASE_<NOME>.md (R6). Projeção divergente mente com autoridade.
  CLASSE RUNBOOK (docs/runbooks/ e todo doc que afirme estado): doc
  que afirma o estado de algo EXTERNO e mutável (ferramenta conectada,
  serviço autenticado, plugin instalado) não é verdade permanente —
  vale pelo dia em que foi verificada:
- Toda afirmação de estado carrega o COMANDO que a verifica e a
  DATA da última verificação ("✔ Connected em `claude mcp list`,
  conferido em AAAA-MM-DD"); "está ativo ✅" sozinho NÃO vale
- Comando citado em doc TEM que existir — doc que manda rodar
  script inexistente é pior que doc ausente: custa a tentativa
  e a descoberta (gate no R6)
- Verificação vencida (cadência no R17) = estado NÃO verificado;
  reconferir antes de confiar
  MÁQUINA NOVA (docs/how-to/maquina-nova.md): setup em três colunas —
  (a) vem do git — agora incluindo skills, hooks, rules e settings
  do .claude/ · (b) por máquina/usuário (plugin de agente, OAuth
  de MCP, .env e credencial local, auto memory) · (c) NÃO faça. A
  coluna (c) é a que economiza tempo e a que ninguém escreve (ex.:
  "não re-baixe o espelho de docs versionado — é git pull; re-baixar
  gera diff em milhares de arquivos sem uma linha de conteúdo novo").

### R4 — VERSIONAMENTO (código + banco + API)

Código:

- SemVer + tags git a cada release
- Conventional Commits (feat:, fix:, docs:, refactor:, test:, chore:)
- main protegida; TODO trabalho em branches próprias: feature/* no
  checkout principal e, em sessões paralelas, a branch do worktree
  (base do R9)
  Banco de dados:
- Migrations = versionamento do schema:
  · NUNCA editar migration já aplicada (bloqueado por hook — R19)
  · forward-only: correção = nova migration
  · down() sempre que reversível · em releases: php artisan schema:dump --prune
- Compatibilidade N-1 (habilita o rollback do R15): toda migration
  compatível com a versão ANTERIOR do código rodando —
  expand → migrate → contract em releases separados; NUNCA dropar
  ou renomear coluna no mesmo release que para de usá-la; NUNCA
  operação que trave tabela grande. Sem isso, "rollback = trocar
  a tag" é mentira
- Índice em tabela JÁ populada em produção: CREATE INDEX
  CONCURRENTLY, em migration com $withinTransaction = false
  (o comando não roda dentro de transação) — índice comum
  bloqueia escrita na tabela inteira durante a criação
- Seeders idempotentes para dados de referência
  API:
- /api/v1 desde o início; breaking change = /api/v2, nunca quebrar v1

### R5 — SEGURANÇA (defesa em camadas)

Autenticação:

- MFA obrigatório para admins (TOTP nativo do Filament)
- WebAuthn/Passkeys via YubiKey (registrar 2 chaves: principal + backup)
- Sessões: timeout, regeneração no login, cookies secure/httponly
  Criptografia e rotação de chaves (CRÍTICO):
  Nível 1 — padrão (todo projeto):
- Campos confidenciais com cast 'encrypted' (usa APP_KEY)
- Rotação SEM corromper dados (nativo do Laravel):
  APP_KEY=nova + APP_PREVIOUS_KEYS=antigas → zero perda
- Criar comando artisan app:reencrypt (regrava registros na chave nova)
  Nível 2 — dado pessoal SENSÍVEL (OBRIGATÓRIO quando o CONTEXTO
  marcar "Dados sensíveis: sim"):
- Chave DEDICADA, separada da APP_KEY: CIPHERSWEET_KEY
  (spatie/laravel-ciphersweet) — criptografia por campo (AES-256-GCM)
  com derivação das chaves de blind index
- Motivo: raio de explosão e rotação independentes — girar a chave
  de sessão não recifra o banco sensível, e vice-versa
- Busca e UNIQUE em campo cifrado SÓ via blind index (HMAC);
  nunca coluna em claro paralela
- Rotação da CIPHERSWEET_KEY via comando do pacote, sem downtime
- Exibição mascarada por padrão (ex.: CPF _**.**_.***-XX); decifrar
  só com necessidade real + trilha de auditoria (activitylog)
  Runbook único das chaves em docs/runbooks/rotacao-de-chaves.md
  Proteção:
- Rate limiting (login 5/min, API por token), headers CSP/HSTS/nosniff,
  FormRequests em toda entrada, composer audit + npm audit no CI,
  spatie/laravel-activitylog para auditoria, WAF/Cloudflare em produção,
  SSH só com chave FIDO2 (YubiKey)
- CSP executável: nonce via Vite::useCspNonce() para scripts e
  styles inline (Livewire/Alpine); política estrita exige Alpine
  em modo CSP — CSP declarado que quebra o app acaba desligado
  Backup:
- spatie/laravel-backup: agendado, integridade verificada, retenção,
  NOTIFICAÇÃO de sucesso/falha, destino S3 off-site criptografado,
  teste de restauração documentado antes do go-live
  Modo teste → go-live:
- Gates de segurança (MFA, secure cookie, enforce de guard-rails)
  só relaxam em fase de TESTE sem dado real, via env com default
  SEGURO (relaxar é explícito, nunca por omissão)
- Todo relaxamento: registrado em DECISOES.md e reversível por env
- docs/runbooks/checklist-virada-teste-para-real.md 100% verde antes
  do primeiro usuário real (inclui relógio/NTP do servidor — R13 —
  e os B-xxx que impedem o go-live — R9)

### R6 — QUALIDADE (gates que quebram o CI)

- pint --test · phpstan nível 9 · pest --coverage --min=80
- Pest 4 browser testing nos fluxos críticos
- Testes de arquitetura Pest (arch) verdes — fronteiras do R10
- Rector dry-run no CI com sets FIXADOS na versão da stack
  (PHP 8.5 + Laravel 13) — sem fixar, refatora para sintaxe de
  outra versão · composer audit limpo
- php -l em todo .php staged no pre-commit — corrupção de arquivo
  quebra o boot inteiro e passa por pint/phpstan; o lint bruto
  pega na hora
- Secret scanning (gitleaks ou trufflehog) no pre-commit e no CI —
  bloqueia credencial vazada na origem. Acompanha .gitleaks.toml
  com allowlist dos falsos-positivos conhecidos (fixtures tipo
  sk_live_x, IDs públicos) e varre a árvore atual (--no-git) para
  ser determinístico — gate vermelho por segredo, nunca por ruído;
  auditoria do histórico é tarefa pontual, fora do gate
- Gate de drift .env ↔ .env.example no PRE-COMMIT (onde existe .env
  real; no CI o .env é cópia do example e a comparação é no-op) —
  toda chave ativa documentada no example; no CI, o boot a partir
  do .env.example valida o contrato (Env::getOrFail — R11)
- Compilação de Blade no CI (php artisan view:cache) — ParseError
  de diretiva/tag Blade não fechada derruba fluxo core em produção
  e PASSA pelo php -l, que só valida PHP puro
- Baseline de análise estática NUNCA CRESCE: o gate é "zero erros
  NOVOS vs. baseline da main" (rodar com e sem o diff e comparar
  contagens), não só "phpstan passa"; meta de REDUÇÃO trimestral
  da baseline registrada (agenda no R17)
- Suíte 100% executável no ambiente CANÔNICO (CI); teste que não
  roda localmente (ex.: binário do Chrome ausente em ARM para PDF)
  fica DOCUMENTADO com o motivo — falha local conhecida ≠ falha
  ignorável no CI
- Ferramental de teste dimensionado: memory_limit e timeouts do
  PHP de dev/CI suportam a suíte COMPLETA — suíte que estoura
  memória no fim esconde o resultado real
- Documentação viva (R3): gate de integridade no CI — zero links
  quebrados (link relativo que não resolve é bug) + todo arquivo
  de docs/ presente no MAPA (e vice-versa) + frontmatter válido
  (tipo, dono, revisado_em) + FRESCOR: revisado_em vencido pela
  validade do tipo avisa e, calibrado, bloqueia + comando citado
  em doc EXISTE no projeto (lei 5 do R3, executável); docs
  auditada 1× e nunca mais é foto velha
- Acompanhamento código↔doc (docs-drift — R3): PR/push que toca
  caminho-gatilho (database/migrations/**, routes/**,
  app/Modules/*/Contracts/**, scripts de manifest...) SEM tocar a
  doc mapeada E sem trailer `Docs-n/a:` → vermelho, com a mensagem
  dizendo QUAL doc falta. É a generalização do gate de env-drift —
  o único pedaço da doc viva que nunca desatualizou, porque tem
  gate. O mapeamento paths→doc vive no script do gate (nasce no
  F2), com o MAPA DE GATILHOS do R3 como fonte; falha vazia =
  falha; trailers aceitos ficam no log para a reconciliação do R9
- Correspondência estrutural mínima: módulo em app/Modules/ sem
  linha na tabela da ARQUITETURA.md (e vice-versa) → vermelho — o
  gate de fidedignidade mais barato que existe, contra a mentira
  mais cara (mapa de módulos que não bate com o código)
- Consistência BASE ↔ projeção (R3): gate no CI confere que a
  versão declarada no CLAUDE.md é a mesma do topo do
  BASE_<NOME>.md — projeção desatualizada mente sobre as regras
  com autoridade de regra
- Integridade do painel de sessões (R9) no pre-commit/CI: todo
  docs/sessions/ATIVA-*.md tem linha na tabela de ativas do
  SESSOES.md, toda linha de ativas tem seu arquivo, e o eco de
  leitura está preenchido — sessão ativa e invisível no painel é
  exatamente o desencontro que o R9 existe para evitar
- Catracas da varredura (R21 · Parte 7): duplicação não CRESCE vs
  baseline medida (jscpd --threshold), cobertura não CAI entre
  varreduras, complexidade nova dentro do teto do projeto (lizard -C
  ou linter nativo), morto não VOLTA (detector do ecossistema no CI)
  — todas entram não-bloqueantes, calibram com o número real e só
  então bloqueiam (caminho do gitleaks)
- Higiene de custo do CI (repo privado = minutos cotados):
  paths-ignore poupa os jobs CAROS (build, testes, smoke) em
  mudança só de docs (docs/**, **.md) — o gate de docs continua
  rodando nelas; concurrency com cancel-in-progress por ref
  cancela runs superados; cobrança é por JOB arredondado para
  cima por minuto — job novo no workflow = custo novo, declarar
  o porquê
- AUTOMAÇÃO QUE IMPLEMENTA REGRA TAMBÉM É GATEADA — guard-rail sem
  teste não é guard-rail, é comentário que roda (mesmo princípio da
  fronteira do R10). Script ou job que SUSTENTA regra (backup do R5,
  guard-rail de agente do R19, retenção do R15, rotação de chave, o
  próprio smoke) escapa dos gates de código de aplicação:
  · PISO, custo zero: checagem de sintaxe em TODO script versionado
  (`bash -n` nos .sh) no pre-commit e no CI; shellcheck como camada
  do CI, no padrão do gitleaks — avisa local, exige no CI
  · FRACASSO SILENCIOSO exige teste de COMPORTAMENTO, não de parse:
  backup prova que gerou E restaurou; guard-rail prova a RECUSA
  (apontar para host remoto → saída não-zero) e também o caminho
  positivo, com hook de dry-run para o teste não pendurar o CI
  · Backup quebrado só apareceria no restore TRIMESTRAL do R17 — até
  três meses sem backup, achando que tem: é o pior modo de falha
  da lista, por isso o teste é do SCRIPT, não da agenda
  · VALIDAR POR MUTAÇÃO, nunca por inspeção: quebrar de propósito e
  exigir vermelho. Cuidado com mutação que PARECE inválida e não é
  (`[ 1 -eq 1 ;` é bash válido — erro de execução, não de sintaxe):
  passa no gate e dá falsa confiança
  · FALHA VAZIA = FALHA: gate que inspecionou ZERO alvos falha, nunca
  passa verde; a lista de alvos une rastreados + não rastreados
  (`git ls-files --others --exclude-standard`), porque em pre-commit
  o arquivo NOVO é justamente o que mais importa
  · Cada gate NOMEIA no título a regra que implementa ("Gate
  timestamptz (R13)") — é o que torna auditável qual regra tem gate
  e qual está no sistema de honra (matriz no R17)
  · HOOK e SKILL do agente (R19) SÃO automação que implementa regra:
  script de hook entra no piso acima (bash -n, shellcheck, mutação
  que prova a recusa); skill que implementa procedimento tem EVAL
  (plugin skill-creator) na criação e a cada mudança — skill que
  dispara não é skill que funciona
- Revisão adversarial (OPCIONAL por projeto — custa tokens e
  minutos; declarar como todo job novo, v3.3): REVIEW.md na raiz
  com o recorte de maior risco (R4 N-1, R5 segredos, R10
  fronteiras, R13 timestamptz) + Code Review de PR por segundo
  agente; entra NÃO-bloqueante (comentário) e só vira gate depois
  de calibrado — mesmo caminho do gitleaks

### R7 — MONITORAMENTO COM NOTIFICAÇÕES

- Laravel Pulse (performance, queries lentas, jobs, exceptions)
- Sentry com alerta imediato em produção
- Rota /up monitorada por uptime externo
- Alertas de: erro crítico, falha de backup, falha de deploy,
  fila parada, falha no smoke test pós-deploy (R15)
  Canal: [e-mail | Telegram | Slack — escolher 1]
- Horizon se houver filas Redis

### R8 — COMPORTAMENTO DO CLAUDE

- Arquiteto sênior e mentor: explique decisões e trade-offs,
  registre em DECISOES.md
- Consulte guidelines do Laravel Boost; use Context7 em dúvidas de API
- Código production-ready (FormRequests, policies, jobs, eventos)
- Em dúvida entre simples e complexo: simples, e registre o porquê
- Investigação pesada (ler um módulo inteiro, diagnóstico, caça a
  referência) roda em SUBAGENTE ou skill com context: fork — o
  resultado volta resumido e o contexto da sessão não incha
  (empurrar a conversa à compactação é perder o combinado — R9)
- Mudança visível no app: valide com /verify (app rodando de
  verdade) além de composer check — teste verde não prova tela
- O que precisa valer SEMPRE não vai em instrução: vai em hook ou
  permissão (R19). Instrução é pedido; hook é garantia
- Toda referência curta citada (F3, R5, D-012, US-07...) deve ser
  localizável via MAPA.md; criou um tipo novo de referência =
  registrar no MAPA.md na hora. Na dúvida, cite completo:
  "arquivo § seção" (ex.: "ver BASE_<NOME>.md § R5")

### R9 — PROTOCOLO DE SESSÕES PARALELAS (múltiplas conversas)

Permite várias conversas simultâneas no mesmo projeto sem conflito.
Comunicação sem confirmação de leitura é esperança: toda sessão
ECOA o que leu ao abrir e escreve para quem NÃO participou ao fechar.
Isolamento em DUAS camadas: worktree isola ARQUIVO (um working
tree do git só sustenta uma branch em checkout — duas sessões no
mesmo diretório disputam os mesmos arquivos, independentemente da
branch "declarada"); o protocolo abaixo isola INTENÇÃO (escopo,
avisos, pendências).

SESSÃO PARALELA NASCE EM WORKTREE:
`claude --worktree [slug]` → checkout isolado em
.claude/worktrees/[slug], branch própria worktree-[slug];
.env e afins chegam automaticamente via .worktreeinclude
versionado (template na Parte 3). A sessão ÚNICA (sem paralelas
ativas) pode rodar no checkout principal em feature/[slug].
O que saber sobre worktrees:

- .claude/worktrees/ entra no .gitignore
- Aprovação de permissão dada num worktree é salva no
  settings.local.json do checkout principal e vale para todos
- `claude --resume` devolve a conversa ao worktree dela
- Worktree é checkout novo: rodar o setup (Sail/composer) nele,
  ou seguir a receita gravada pelo /run-skill-generator (F2)

ABERTURA (obrigatório em TODA conversa, antes de qualquer trabalho —
padronizada na skill /abrir-sessao, que injeta os arquivos abaixo
com dados reais; o hook SessionStart também injeta o essencial, R19):

1. Ler docs/ESTADO.md (estado global)
2. Ler docs/SESSOES.md COMPLETO: sessões ativas, seção 📢 Avisos
   e as últimas 5 linhas do Histórico — o que acabou de concluir
   é onde nasce o desencontro entre chats
3. Ler docs/PENDENCIAS.md (quadro central de pendências abertas)
4. Criar docs/sessions/ATIVA-[AAAA-MM-DD-HHMM]-[slug].md com:
   objetivo, escopo de arquivos/pastas, fora-do-escopo, branch,
   status 🟢 — e o bloco ECO DE LEITURA: sessões ativas vistas,
   últimas conclusões absorvidas, avisos lidos e pendências
   (P-xxx) que esta sessão assume. Eco vazio ou genérico =
   abertura INVÁLIDA
5. Adicionar linha na tabela "Sessões ativas" de SESSOES.md
6. Gravar o escopo em .sessao-escopo no worktree (um prefixo por
   linha) — é o que alimenta o hook que BLOQUEIA edição fora do
   escopo (R19); docs/ e .claude/ ficam sempre permitidos

ISOLAMENTO:

- Cada sessão trabalha SÓ no seu worktree e na sua branch — nunca
  na main
- Escopos de sessões ativas devem ser DISJUNTOS
  (ex.: A = módulo pagamentos · B = documentação · C = testes E2E)
- Se um arquivo necessário está no escopo de outra sessão ativa:
  PARAR, avisar o usuário e propor alternativa
- ESTADO.md global NÃO é editado no meio da sessão — só no encerramento

DURANTE:

- A cada checkpoint, atualizar o arquivo da sessão:
  progresso datado, arquivos alterados, próximo passo
  (assim outra conversa — ou eu — vê em tempo real o que está rodando)
- Objetivo/escopo/fora-do-escopo vivem no ARQUIVO da sessão, nunca
  só na conversa: conversa longa é COMPACTADA pelo Claude Code e o
  combinado do início some do contexto; o hook SessionStart com
  matcher compact reinjeta o arquivo ATIVA- após toda compactação
  (R19) — sem isso, sessão longa deriva sem ninguém perceber
- Decisão ou mudança que AFETA outras sessões (contrato de módulo,
  migration, env nova, rota) → registrar NA HORA na seção
  📢 Avisos de SESSOES.md: data, sessão, o quê, quem precisa saber
- Pendência descoberta FORA do escopo → registrar NA HORA em
  PENDENCIAS.md (P-xxx) e seguir no escopo; não segurar até o fim

ENCERRAMENTO (padronizado na skill /encerrar-sessao):

1. Preencher bloco "Encerramento" do arquivo da sessão:
   commits, status ✅ CONCLUÍDA e RESULTADO escrito para quem
   NÃO participou — teste: outra conversa entende o que foi
   feito sem abrir este arquivo? Não? Reescreva
2. RECONCILIAÇÃO DOCUMENTAL (R3): rodar o diff da sessão
   (git diff --name-only <ponto-de-partida>..HEAD) contra o MAPA
   DE GATILHOS — gatilho disparado sem doc tocada: atualizar
   AGORA ou registrar `Docs-n/a: <motivo>`; os n/a da sessão
   entram no RESULTADO. Encerrar com frase falsa na doc é
   encerrar sessão incompleta
3. TODA pendência do encerramento vira P-xxx em PENDENCIAS.md —
   pendência que fica só no DONE- é pendência enterrada
4. Renomear ATIVA-... → DONE-...
5. Mover a linha em SESSOES.md para "Histórico" preenchendo
   Resultado (1 linha clara) e Pendências (P-xxx ou —);
   Histórico acima de 15 linhas → mover as mais antigas para
   docs/SESSOES_ARQUIVO.md (higiene de contexto da IA)
6. Limpar da seção 📢 Avisos os avisos desta sessão já absorvidos
7. Merge da branch (ou PR) e SÓ ENTÃO atualizar ESTADO.md global
8. Remover o worktree após o merge (ao sair, o Claude pergunta;
   worktree limpo de sessão sem nome some sozinho)
9. Emitir checkpoint final com a frase de retomada

BLOQUEIO EXTERNO (B-xxx) — o que o agente NÃO pode fazer:
Ato que exige o dono ou um terceiro (abrir CNPJ, assinar contrato,
gerar credencial em painel de fornecedor, aprovar OAuth, publicar em
loja, decidir negócio) não é pendência técnica: é BLOQUEIO. Some do
radar porque ninguém é responsável por lembrar — por isso vive em
seção própria no TOPO do PENDENCIAS.md, com id B-xxx.
Cada B-xxx registra, obrigatoriamente:

- AÇÃO no imperativo e específica ("criar conta no gateway e gerar
  chave sandbox"), nunca "resolver pagamento"
- QUEM pode fazer (dono, contador, cliente, fornecedor) e O QUE
  BLOQUEIA (fase, feature, P-xxx, sessão parada)
- O QUE JÁ ESTÁ PRONTO esperando — para a retomada ser imediata
- O QUE DEVOLVER e ONDE, no formato exato ("cole a chave em
  WOOVI_KEY no .env e responda 'B-001 feito'") — pedido vago volta
  como pergunta e queima uma rodada
- CONTORNO em vigor, se houver (stub, sandbox, flag desligada), +
  o P-xxx que o REMOVE ao desbloquear: contorno sem pendência de
  remoção é o caminho para publicar o stub achando que é a integração
- DATAS: pedido em / resolvido em
  Enquanto aberto: sessão NÃO inicia trabalho que dependa de B-xxx
  aberto — planeja em volta ou escolhe outro escopo. TODO checkpoint
  repete os B-xxx abertos (template no fim) e o encerramento também:
  bloqueio que não é dito em voz alta vira bloqueio esquecido.
  Ao desbloquear: o dono responde o que o item pediu → a sessão marca
  resolvido com a data, dispara o P-xxx de remoção do contorno e
  retoma de onde parou.
  B-xxx que impede o go-live entra no CHECKLIST-virada (R5).

SESSÃO INTERROMPIDA (conversa fechada sem concluir):

- O registro permanece 🟢 em SESSOES.md
- Retomar: `claude --resume` (volta ao worktree dela) e
  "Leia docs/sessions/ATIVA-[id].md e continue essa sessão" —
  o resume nativo é o transporte; o arquivo ATIVA- continua sendo
  o registro para humanos e para as outras sessões
- Descartar: marcar ⚠️ ABANDONADA com motivo, liberar o escopo,
  levar as pendências do arquivo para PENDENCIAS.md (P-xxx) e
  remover o worktree — abandono não apaga o que ficou devendo

### R10 — ARQUITETURA: MONOLITO MODULAR + DDD PRAGMÁTICO

Um deploy, vários módulos. Módulo = bounded context com linguagem
ubíqua própria. Fronteira forte hoje = extração barata amanhã.
Módulos da seção MÓDULOS INICIAIS: criados no F0 e mapeados em
docs/ARQUITETURA.md.

ESTRUTURA (cada módulo em app/Modules/<Modulo>/):

- Domain/ → Models (Eloquent como entidade — pragmático), ValueObjects
  (via casts), Enums, Events de domínio, Exceptions, Services de domínio
- Application/ → Actions (1 caso de uso = 1 classe), DTOs, Queries
  (leitura otimizada — CQRS-lite: Action escreve, Query lê)
- Infrastructure/ → Adapters externos (gateways, APIs), Jobs, Listeners;
  Repository SÓ quando trocar implementação for necessidade real
- Presentation/ → Controllers (API), Livewire, Filament, FormRequests,
  routes.php do módulo
- Contracts/ → a ÚNICA porta de entrada para outros módulos
- <Modulo>ServiceProvider registra rotas, migrations, eventos, bindings
- Modules/Shared/ → kernel mínimo (Money, casts, base classes);
  cresce por último e nunca vira depósito de utils

FRONTEIRAS (o que torna o monolito modular de verdade):

- Cada tabela tem UM módulo dono: só ele escreve e cria migrations dela
- Módulo A NUNCA importa Domain/ ou Infrastructure/ de B; comunicação:
  1. contrato público em <Modulo>/Contracts/ + DTOs (síncrono)
  2. evento de domínio + listener no módulo consumidor (assíncrono)
- FK entre módulos: permitida · JOIN de leitura em Queries: permitido
  · escrita em tabela de outro módulo: PROIBIDA
- Transação que cruza módulos = sinal de fronteira errada →
  registrar em DECISOES.md e reavaliar o mapa
- Identidade ≠ domínio: o model User (autenticação) vive no módulo
  de identidade e NÃO acumula lógica de outros módulos; perfis de
  domínio (Paciente, Atleta...) são aggregates do módulo dono,
  ligados ao User por id — nunca o contrário

DDD TÁTICO — usar sem brigar com o Laravel:

- USAR: aggregate root (só a raiz é salva; invariantes em métodos dela),
  ValueObjects, eventos de domínio, exceptions de domínio,
  glossário da linguagem ubíqua em ARQUITETURA.md
- INVARIANTES em 3 camadas, nesta ordem:
  1º constraint no banco (CHECK/UNIQUE/EXCLUDE) · 2º método do aggregate
  · 3º FormRequest (sanitização de entrada)
- PULAR: repositório genérico sobre Eloquent, entidades "puras"
  espelhando models, camadas vazias por cerimônia

ENFORCEMENT (fronteira sem teste é fronteira imaginária):

- Testes de arquitetura Pest (arch()) no CI — gate do R6:
  · Domain não usa Illuminate\Http, Livewire nem Filament
  · nenhum módulo acessa internals de outro (só Contracts/)
- Criar módulo novo exige: linguagem própria + ciclo de vida próprio +
  candidato plausível a serviço no futuro → decisão em DECISOES.md
- Sinergia com R9: escopo de sessão paralela = de preferência 1 módulo

### R11 — VARIÁVEIS DE AMBIENTE (.env)

Contrato e organização:

- .env NUNCA commitado; .env.example é o CONTRATO versionado
- Variável nova entra no .env.example NO MESMO commit —
  sem isso, fase/PR incompleto; gate de drift no pre-commit
  verifica (R6)
- Seções numeradas na ordem canônica (template na Parte 3):
  1 Identidade e runtime · 2 Segurança e sessão · 3 Banco ·
  4 Redis, cache e filas · 5 Tempo real · 6 Arquivos e mídia ·
  7 E-mail · 8 Observabilidade · 9 Terceiros · 10 Frontend (VITE_) ·
  11 Tuning da aplicação (knobs de negócio — não são segredos
  nem feature flags)
- Terceiros: um bloco por serviço, prefixo do serviço (WOOVI__,
  VIDAAS__...), comentário com link da doc e onde obter credenciais
  Uso no código:
- env() SÓ dentro de config/; a aplicação usa config() —
  com config:cache em produção, env() fora de config retorna null
- Obrigatórias: Env::getOrFail() no config → deploy quebra no boot,
  não em runtime de madrugada
- config:cache no deploy (F7)
- Feature flag NÃO é .env — é Pennant (muda sem deploy)
  Segredos:
- No example: valor VAZIO + comentário de onde obter; jamais real
- Produção: injetados como secrets do Dokploy, nunca arquivo no repo
- VITE_* vai para o BROWSER: nunca segredo com esse prefixo
- Rotação conforme R5 (APP_PREVIOUS_KEYS) + runbook em
  docs/runbooks/rotacao-de-chaves.md
- Edição do .env pelo AGENTE: negada em permissão e bloqueada por
  hook (R19) — mudança de env é ato do dono
  Convenções:
- Booleans minúsculos (true/false) · aspas só com espaço/especial
- Valor local (Sail) como default no example; produção difere?
  comentar na linha: `# prod: <valor>`
- Multi-projeto na mesma máquina: portas do docker-compose
  parametrizadas por env com defaults ÚNICOS por projeto
  (APP_PORT, FORWARD_DB_PORT, FORWARD_REDIS_PORT, VITE_PORT...) —
  duas stacks não brigam por 80/5432/6379/5173; overrides locais
  em compose.override.yaml FORA do versionamento (exclude local)
- Worktree é checkout novo (R9): .env, .env.testing e auth.json
  chegam via .worktreeinclude versionado — sem ele, toda sessão
  paralela começa quebrada
- APP_TIMEZONE explícito (ex.: America/Sao_Paulo) — agenda,
  cobrança e relatórios dependem disso. ATENÇÃO: Laravel 11+ traz
  config/app.php com 'timezone' => 'UTC' fixo; a var é NO-OP até
  fiar o config: 'timezone' => env('APP_TIMEZONE', 'America/Sao_Paulo')

### R12 — ACESSIBILIDADE E INCLUSÃO (condicional: UI de usuário final)

Aplica-se a todo projeto com interface de usuário final
(fluxos públicos: obrigatório · painéis internos: recomendado).

- WCAG 2.2 nível AA nos fluxos críticos — no Brasil, acessibilidade
  digital é exigência legal (LBI, Lei 13.146/2015)
- Semântica antes de estilo: HTML correto (landmarks, headings,
  labels, foco visível) antes de qualquer CSS
- Teste automatizado no CI (axe-core ou pa11y nos fluxos críticos)
  - teste manual com leitor de tela antes do go-live
- Conteúdo em linguagem simples; nunca transmitir informação
  SÓ por cor (estado = cor + ícone/texto)

### R13 — TEMPO, FUSO E RELÓGIO

Horário certo é uma corrente de 7 elos: app, coluna, sessão do
banco, containers, scheduler, fronteira JS e relógio do servidor.
Padrão Brazil-only: America/Sao_Paulo ponta-a-ponta.

- App: APP_TIMEZONE fiado no config (ver R11) — sem fiar, tudo UTC
- Coluna de data-hora: timestampTz() SEMPRE (nunca timestamp()) —
  instante absoluto, conversão na leitura; timestamp naive misturado
  corrompe o histórico de forma irrecuperável.
  ESCOPO do gate: migrations de DOMÍNIO (tabelas donas de módulo —
  R10); scaffold de framework/pacotes (users, jobs, cache, sessions,
  permission_tables...) fica FORA — nasce naive e é forward-only (R4)
- Scaffold naive → tz ponta-a-ponta: gerar UMA migration
  forward-only com ALTER COLUMN ... TYPE timestamptz
  (USING ... AT TIME ZONE); NUNCA editar a migration original (R4)
- Data pura (vencimento, dia da reserva, aniversário): coluna DATE +
  cast 'date', SEM conversão de fuso — converter = "um dia antes"
- Postgres: timezone = America/Sao_Paulo na sessão (TZ no container
  do banco) — armazenamento continua absoluto, muda só a renderização
- Containers: TZ=America/Sao_Paulo em app, workers e banco —
  logs e cron alinhados
- Scheduler segue o fuso do app: dailyAt('07:00') = 07:00 de SP
  SÓ com o config fiado
- Fronteira JS/API: API devolve ISO-8601 COM offset; no browser,
  cálculo e formatação de data-hora com a API Temporal (ES2026) —
  polyfill OBRIGATÓRIO enquanto Safari/iOS não suportar (público
  de PWA); aritmética manual com Date é proibida; NUNCA parsear
  string sem offset (new Date sem offset = fuso do dispositivo
  de cada usuário)
- Relógio do servidor: NTP ativo (chrony/timesyncd) — drift quebra
  o TOTP do MFA (R5); token recusado = suspeitar do relógio primeiro
- Multi-região um dia? O dado já é absoluto (timestamptz);
  basta mover a conversão para a borda

### R14 — ASSETS ESTÁTICOS E MÍDIA

Imagem de marca é CÓDIGO, não dado: versionada no git, passa pelo
build. Três moradas, sem mistura:

- resources/images/ → Vite (o padrão): logo, ícones, ilustrações
  da UI. Referência via Vite::asset() — hash no nome = cache
  imutável (1 ano) enquanto não muda, e troca em TODOS os pontos
  no deploy seguinte quando muda (cache busting automático,
  sem ?v= manual)
- public/ → SÓ o que exige URL e nome fixos: favicon.ico, icon.svg,
  apple-touch-icon.png, ícones 192/512 da PWA, robots.txt, og-image
  (crawlers de link preview não rodam JS). Mudou? ?v=N na tag
- storage/ + S3 → SÓ upload de usuário (ex.: logo do tenant) —
  nunca asset da marca do produto
  Fonte única de referência:
- Caminho de logo NUNCA repetido em templates: componente Blade
  <x-brand.logo /> (variantes clara/escura, tamanho por prop) —
  trocar a marca = trocar 1 arquivo + 1 componente
- E-mail transacional: cliente de e-mail não roda build nem aceita
  SVG — logo de e-mail é PNG com URL ABSOLUTA (public/ ou S3),
  referenciado num ÚNICO partial de layout de e-mail
  Formatos:
- Logo: SVG sempre que possível (currentColor/variante para tema
  claro/escuro); PNG só onde SVG não entra (e-mail, og-image,
  apple-touch-icon)
- Foto e ilustração raster: AVIF/WebP com fallback

### R15 — DEPLOY DE EXCELÊNCIA (prioridade máxima — F7 executa esta regra integralmente)

Gates que testam só o CÓDIGO não pegam erro do ARTEFATO: CI 100%
verde já conviveu com produção quebrada por config do servidor web
DENTRO da imagem. O deploy é parte do produto.

PRINCÍPIOS:

1. Paridade: o que se testa é a IMAGEM de produção (nginx,
   entrypoint, supervisor) — não só o código
2. Build once, promote: imagem construída 1× no CI, tag = SHA do
   commit, publicada em registry (GHCR); staging e produção rodam
   A MESMA imagem; rebuild em servidor é PROIBIDO.
   Retenção no registry: publicar por commit SEM retenção é custo
   crescendo em silêncio — storage de Packages em repo privado é
   cotado e, no billing novo, estourar a cota BLOQUEIA o push em
   vez de cobrar (deploy quebra por fatura). Job de retenção no
   próprio CI (actions/delete-package-versions) mantendo as
   últimas N versões, com N ≥ janela de rollback (ex.: 15) —
   NUNCA apagar tag que ainda pode receber rollback
3. Gates bloqueantes — vermelho não passa
4. Todo deploy reversível em minutos
5. Bug de produção nunca se repete (ver PÓS-INCIDENTE)

SMOKE TEST DO ARTEFATO no CI (o gate que faltava):

- Subir a imagem buildada no runner (Postgres/Redis como serviços)
  e validar via HTTP ATRAVÉS do servidor web da imagem:
  · /health ou /up → 200
  · página de login → 200
  · /build/manifest.json (Vite) → 200
  · TODOS os assets servidos por rota → 200
  (/livewire/livewire.js, /flux/flux.js, /flux/editor.min.js,
  /flux/editor.css e equivalentes do Filament)
- REGRA PERMANENTE: dependência nova que serve asset por rota
  entra nesta lista NO MESMO PR
- Mudança em Dockerfile, nginx ou proxy OBRIGA este smoke test —
  "nginx -t" sozinho não basta (classe de erro já ocorreu 2×:
  camada de proxy e servidor web)

STAGING (obrigatório):

- App separada rodando a MESMA imagem do registry
- Deploy automático no merge da main
- Banco com dados SINTÉTICOS — NUNCA dado real (LGPD art. 11)
- Checklist de aceitação dos fluxos críticos antes de promover

PRODUÇÃO:

- Promoção MANUAL/gated da tag validada em staging (GitHub
  Environments com approval ou API do orquestrador disparada
  pelo CI); deploy automático direto em produção é PROIBIDO
- Sequência: pg_dump ANTES das migrations → migrations → rolling
  update com health-gate (/health 200 antes de receber tráfego)
- Graceful shutdown dos workers no rolling update: SIGTERM →
  horizon:terminate (queue:restart se não houver Horizon) → job
  atual termina antes do container cair; stop timeout do
  orquestrador MAIOR que o timeout do job mais longo — senão é
  SIGKILL no meio do job
- Janela de baixo uso

PÓS-DEPLOY:

- Smoke test da lista acima contra o domínio real, automatizado,
  com alerta (R7) e rollback em falha
- Rollback = trocar a tag da imagem (< 5 min), documentado e
  ENSAIADO 1×/trimestre (agenda no R17)

PÓS-INCIDENTE (a garantia do "nunca de novo"):
Todo incidente de produção abre um POSTMORTEM BLAMELESS em
docs/postmortems/AAAA-MM-DD-sintoma.md (template na Parte 3):
resumo, linha do tempo, impacto medido, causa raiz de SISTEMA e
ações com dono e prazo — os itens abaixo são as ações MÍNIMAS.
Bug que chegou em produção só FECHA com:

1. Teste automatizado que o reproduz (vermelho antes, verde depois)
2. Entrada no smoke test, se for infra/asset/rota
3. Parágrafo de runbook: sintoma → causa → detecção → reversão

### R16 — HARDENING DA IMAGEM DE PRODUÇÃO (checklist de build)

Correções nascidas em produção viram checklist permanente:

- Extensões PHP requeridas declaradas e VERIFICADAS no build
  (php -m no CI) — extensão ausente é erro de build, não de runtime
- Entrypoint valida envs obrigatórias no boot e falha ALTO —
  502 silencioso por env ausente é inaceitável (casa com
  Env::getOrFail do R11)
- Permissões de storage/ e bootstrap/cache corrigidas no entrypoint
- Atrás de proxy (Traefik/Cloudflare): trusted proxies
  configurados + URL::forceScheme('https') — mixed content
  quebra assets
- Conexão ao banco no boot com retry/backoff — banco pode subir
  depois do app
- Pacote privado (ex.: Flux Pro): credenciais via secrets no CI E
  no build da imagem, com FALHA EXPLÍCITA e mensagem clara se
  ausentes
- Artefato de comando de setup (ex.: flux:activate cria auth.json
  e altera composer.json) revisado no diff antes do commit —
  auth.json SEMPRE no .gitignore

### R17 — CADÊNCIA DE AUDITORIAS (auditoria sem agenda = auditoria morta)

Auditoria feita 1× e nunca repetida vira foto velha. Toda
auditoria tem dono, cadência e registro:

- CONTÍNUO (todo CI): composer audit · npm audit · secret
  scanning · integridade de docs e consistência BASE↔.claude
  (R6) · gates da varredura (R21: morto, duplicação, complexidade,
  cobertura)
- MENSAL: TRIAGEM dos PRs automatizados de dependência
  (Dependabot ou Renovate para Composer e npm, agrupados por
  semana — respeita a cota de minutos do R6/v3.3; os PRs passam
  pelos gates normais, o mensal é decidir, não detectar; majors
  ficam de fora e caem na auditoria "a cada upgrade") ·
  conferência de cota Actions/Packages (Settings → Billing) ·
  auditoria da auto memory via /memory, se habilitada (R19) ·
  fila de FRESCOR de docs: frontmatter com revisado_em vencido
  (R3) — reconferir ou depreciar, ~20 min se a cadência é mantida
- RUNBOOK (R3): re-rodar os comandos de verificação na ABERTURA de
  sessão que dependa dele, ou MENSAL — o que vier antes; runbook de
  2 dias atrás já mentiu antes
- TRIMESTRAL: auditoria de índices e queries lentas do banco ·
  redução da baseline de análise estática (R6) · TESTE DE RESTORE
  do backup (R5) · ENSAIO de rollback (R15) · matriz regra × gate:
  regra que virou automação e ficou SEM gate (R6) — incluindo
  hooks e skills do agente (R19) · VARREDURA COMPLETA (R21 · V0–V9) · EXECUÇÃO REAL de 1 runbook
  sorteado (R3 — runbook nunca executado é ficção)
- A CADA UPGRADE de framework/major: auditoria de compliance da
  versão (sintaxe, breaking changes, deprecations)
- SEMESTRAL (se "Dados sensíveis: sim"): revisão de campos
  sensíveis vs. criptografia — campo novo sem cast cifrado =
  achado (R5)
- Agenda versionada em docs/AUDITORIAS.md: cada linha com dono,
  última execução e próxima

### R18 — CICLO DE VIDA DA BASE (criação · adoção · upgrade)

Arquivo canônico: BASE_<NOME>.md na RAIZ do repo (ex.: BASE_KOLOS.md,
BASE_TELEMEDICINA.md) — prefixo BASE_ + nome do projeto em
MAIÚSCULAS, um único por repo, primeira linha registra a versão da
base universal aplicada. É a porta de entrada de qualquer IA ou
humano no projeto: ao entrar, procurar BASE_*.md ANTES de qualquer
suposição.

MODO CRIAÇÃO (ideia nova, sem código):

1. Preencher o topo (CONTEXTO → MÓDULOS INICIAIS) com o usuário
2. Salvar como BASE_<NOME>.md na raiz, com versão e data no topo
3. Exibir o roadmap F0–F8 e executar o F0 completo: TODA a
   documentação viva do R3 nasce organizada no primeiro dia —
   incluindo a projeção .claude/ (CLAUDE.md, rules; skills e
   hooks entram no F2)
4. Seguir R1 daí em diante — uma fase por vez, checkpoint, OK

MODO ADOÇÃO (código existe, BASE_*.md não existe):

1. LER antes de mexer: inventário da realidade — stack e versões
   reais, estrutura, testes, CI, deploy atual, docs existentes
2. Criar BASE_<NOME>.md preenchendo o topo com o que o projeto É
   hoje (não com o desejo) · marcar "modo: adoção"
3. DIAGNÓSTICO R1–R21 em docs/ADOCAO.md: tabela regra × status —
   ✅ conforme · 🟡 parcial · 🔴 ausente · ➖ não se aplica —
   cada linha com a evidência (arquivo/config que prova)
4. PLANO DE ADOÇÃO no mesmo docs/ADOCAO.md, em ondas pequenas,
   priorizado por risco: 1º rede de proteção (backup R5; deploy e
   rollback R15/R16 se está em produção) · 2º estancar débito novo
   (gates R6 + contrato R11 + projeção .claude/ com hooks R19) ·
   3º demais regras por risco/valor
5. Executar cada onda como sessão própria (R9), passando pelos
   gates; NUNCA big-bang — produção não para
   REGRAS DO MODO: padrão novo é OBRIGATÓRIO para código novo desde o
   dia 1; legado migra por onda planejada (código tocado sai melhor
   do que entrou); onda concluída atualiza o diagnóstico. Adoção
   FECHA quando o diagnóstico está 100% ✅/➖ — registrar em
   DECISOES.md e arquivar o ADOCAO.md.

MODO UPGRADE (BASE_<NOME>.md existe em versão anterior):

1. Ler a versão no topo do arquivo do projeto vs. a versão desta
   base — o changelog do cabeçalho É o diff: listar os deltas
   exatos entre as duas versões
2. Apresentar os deltas ao usuário e aplicar no BASE_<NOME>.md:
   regras novas/alteradas e templates, PRESERVANDO o preenchimento
   do topo (CONTEXTO, MÓDULOS e afins são do projeto)
3. Delta que exige ação em código/infra (gate novo, smoke do R15,
   coluna tz do R13, projeção .claude/ da v4.0,
   varredura V0–V9 da v4.1 e
   reorganização de docs/ da v4.2 e
   gate docs-drift desta v4.3...) vira item de
   plano — cada um como sessão (R9)
4. Atualizar a PROJEÇÃO .claude/ no MESMO commit do bump (regra de
   consistência do R3; gate no R6)
5. Bump da linha de versão no topo do BASE + registro em
   DECISOES.md ("D-xxx: upgrade da base vX.Y → vZ.W, deltas: ...")
   REGRA: upgrade NUNCA reescreve o preenchimento do projeto —
   só regras, templates e convenções.
   EVOLUÇÃO REGISTRADA (fase 2 — não executar antes de a projeção
   .claude/ estabilizar em 2+ projetos): distribuir a projeção como
   PLUGIN do Claude Code num marketplace git PRIVADO (skills + hooks

- rules num instalável; versão do plugin = versão da base; o
  upgrade vira "atualizar plugin + aplicar deltas de conteúdo").
  O BASE_<NOME>.md permanece: é contrato e preenchimento do projeto.

### R19 — FERRAMENTAL DE IA E AGENTES (MCP, permissões, hooks, skills, memória)

Ferramenta de agente NÃO passa por confirmação humana query a
query: o que ela alcança, ela alcança sozinha. Por isso tem regra
própria — R1 confirma comando destrutivo (não vê a tool), R5 é
segurança da APLICAÇÃO e R11 governa .env, não a config do agente.

CREDENCIAL E ALCANCE:

- Ferramenta de agente que fala com banco: SÓ banco local, SÓ
  leitura, com o MESMO usuário de RLS da aplicação — o agente
  enxerga o que a app enxerga, nem mais
- Wrapper obrigatório que RECUSA host diferente de
  localhost/127.0.0.1 e falha FECHADA — apontar agente para
  staging ou produção viola o R1, porque não há confirmação
  por query
- NENHUM segredo em config versionada: a config (.mcp.json e
  afins) aponta só para o wrapper, que lê a URL do .env em
  runtime — config de agente é o SEGUNDO lugar onde URL de banco
  mora, e esse é versionado: vazamento pior que o do .env
- Ferramenta que dispara deploy ou build PAGO: negada por padrão
  (colide com R15/R16 e com a cota do R17); se entrar, só leitura

ALLOWLIST, NÃO HERANÇA — agora com ARTEFATO (a causa-raiz tinha
mecanismo faltando). O trio versionado por repo:

- .mcp.json — o que EXISTE (servidores do projeto)
- .claude/settings.json — o que é PERMITIDO: permissions
  allow/deny/ask por ferramenta E argumento (Bash(git _),
  Edit(.env), mcp__servidor___). Deny de settings vence hook e
  vence modo de permissão — é a camada que o modelo não contorna
- .claude/hooks/ — o que é FISCALIZADO (bloco abaixo)
  Regras da allowlist:
- Global apontando para outro projeto recebe deny explícito AQUI
  (disabledMcpjsonServers / deny mcp__<servidor>__*): não se
  remove a global (serve outros projetos), bloqueia-se no repo
- Negados por padrão: deploy/build pago · Edit(.env) e caminhos
  protegidos · ferramenta que este projeto não declarou
- Skill de terceiro (que você não escreveu) com execução inline de
  shell: ligar disableSkillShellExecution
- Cada ferramenta habilitada tem, no runbook: para que serve, para
  que NÃO deve ser usada, o comando que prova que está viva e ONDE
  está o allow/deny dela

ENFORCEMENT: REGRA QUE PRECISA VALER SEMPRE TEM HOOK
(instrução em CLAUDE.md/skill é PEDIDO; hook é GARANTIA):

- PreToolUse dispara ANTES de qualquer checagem de permissão, em
  todo modo — deny de hook não é contornável pelo modelo
- Catálogo mínimo do projeto (scripts em .claude/hooks/,
  registrados no settings.json — templates na Parte 3):
  · Edit/Write → bloquear: caminho protegido (.env, auth.json),
  migration JÁ APLICADA (R4) e arquivo FORA do escopo da sessão
  (lê .sessao-escopo do worktree — R9; docs/ e .claude/ sempre
  permitidos)
  · Bash → bloquear: padrão destrutivo (migrate:fresh fora de
  teste, DROP, rm -rf fora de /tmp — R1) e host de banco ≠
  localhost (SEGUNDA camada do wrapper acima — defesa em
  profundidade)
  · PostToolUse (*.php) → pint no arquivo editado: formata na
  hora, antes mesmo do pre-commit
  · SessionStart (startup|resume) → injeta topo do ESTADO.md +
  P/B abertos: passos 1–3 do R9 sem depender de disciplina;
  (compact) → reinjeta o arquivo ATIVA- após compactação (R9)
  · Stop (prompt-based) → confere "arquivo da sessão atualizado?
  pendência nova registrada? gatilho de doc do diff atendido
  (mapa do R3) ou Docs-n/a declarado?" antes de encerrar o turno
  (respeitando stop_hook_active para não travar)
- LIMITE HONESTO (registrado, não escondido): o modelo pode
  escrever arquivo via Bash sem passar pelo hook de Edit, e
  disableAllHooks existe → hook é a PRIMEIRA camada; pre-commit e
  CI continuam a camada inegociável ("avisa local, exige no CI")
- Hook é script e skill é automação: ambos entram no gate do v3.7
  (R6) — bash -n/shellcheck/mutação que prova a recusa; skill que
  implementa procedimento tem eval (skill-creator)

AUTO MEMORY (memória automática do agente — LIGADA por padrão,
LOCAL por máquina, escrita pelo próprio modelo):

- A VERDADE é docs/ versionado; auto memory é cache local —
  conflito → docs/ vence, sempre
- Máquina única no projeto: pode manter ligada, com auditoria
  mensal via /memory (agenda no R17)
- Mais de uma máquina/pessoa: DESLIGAR por repo
  ("autoMemoryEnabled": false no .claude/settings.json) — estado
  que só uma máquina enxerga é o desencontro da v3.4 de volta
- Decisão NUNCA vive só na memória do agente: decisão é
  DECISOES.md; segredo jamais

POR MÁQUINA vs POR REPO (o que some no onboarding — R3):

- Vem do GIT agora: skills, hooks, rules, settings.json,
  .worktreeinclude — máquina nova ganha o ferramental no clone
- Continua por MÁQUINA/usuário: plugin de agente, OAuth de MCP
  (401 em máquina nova é esperado, não é bug de config), auto
  memory
- Espelho de documentação versionado: em máquina nova é git pull

### R20 — BRIEFING: ACHADO QUE CRUZA FRONTEIRA (o loop de volta)

R18 leva a base ao projeto; o briefing traz o aprendizado do
projeto de volta à base. Sessão que descobre algo que não pode
corrigir sozinha — muda a BASE, outro projeto, ou área fora do
escopo (R9) — NÃO edita: escreve o briefing e para. Escrever
briefing é SEMPRE permitido, mesmo fora do escopo; editar não é.

QUANDO ESCREVER (as três, juntas):

1. O achado tem EVIDÊNCIA reproduzível — o que aconteceu + arquivo,
   comando ou log que prova; preferência e "seria bom se" não valem
2. Corrigir exige mexer FORA do escopo declarado da sessão
3. NENHUMA regra existente já cobre — conferir antes; proposta que
   duplica regra é ruído

ONDE: docs/briefings/BRIEFING-<assunto>.md, UM assunto por arquivo,

- linha em PENDENCIAS.md (P-xxx) apontando para ele — briefing que
  ninguém sabe que existe não é comunicação.

ESTRUTURA (template na Parte 3 · teto ~2 páginas): cabeçalho (para
quem, de qual sessão, data, "proposta, não alteração") · por que
existe (1 parágrafo: a área que a regra atual não governa) · um
bloco por achado (P1, P2...) na ordem EVIDÊNCIA → POR QUE AS REGRAS
ATUAIS NÃO PEGAM (citar as candidatas e por que falham) → PROPOSTA
(texto de regra pronto para adaptar) → IMPLEMENTAÇÃO DE REFERÊNCIA,
se já roda · ordem sugerida por risco.

O QUE NÃO ENTRA — é o que faz o briefing atrapalhar em vez de
ajudar: achado sem evidência · reexplicar o que a base já diz ·
log da sessão (isso é o arquivo da sessão) · mais de um assunto no
mesmo arquivo · proposta sem dizer qual regra falhou (se nenhuma
falhou, é aplicação, não proposta) · texto longo por precaução —
o teto é regra, não sugestão.

RECEPÇÃO (dono da base): cada achado é ACEITO, ACEITO COM
REFINAMENTO ou RECUSADO COM MOTIVO, registrado em DECISOES.md.
Alegação sobre ferramenta, versão ou API é VERIFICADA na fonte
antes de virar regra — briefing bem escrito erra menos, mas regra
no alicerce não entra por confiança. Aceito vira delta de versão
da base (R18); briefing atendido é arquivado.

CONTINUIDADE — cada achado é analisado UMA vez (anti-retrabalho):
Briefing é RE-ENVIADO quando ganha achado novo; sem marcação, quem
recebe reanalisa tudo e o dono recopia tudo. Três mecanismos:

- ID PERMANENTE: P1..Pn nunca renumerados nem reaproveitados —
  achado novo pega o próximo número, mesmo que um anterior tenha
  sido recusado (renumerar quebra todo o mapeamento do que já foi)
- CARIMBO DE CORTE no cabeçalho: "rev N · analisado até rev N-1 ·
  base vX.Y · AAAA-MM-DD" + a lista do que é novo NESTA rev —
  uma linha diz onde o trabalho começa
- DUAS ZONAS no arquivo: 🆕 NOVO DESDE A ÚLTIMA ANÁLISE, no topo
  (é o ÚNICO trecho a copiar e analisar) e 📜 JÁ ANALISADO, onde
  cada achado vira UMA linha com o veredito — o texto integral
  fica no histórico do git, não no arquivo

STATUS (vocabulário fixo): 🆕 novo · ✅ aceito (base vX.Y + regra) ·
🔁 aceito com refinamento (vX.Y + o que mudou) · ❌ recusado (motivo

- D-xxx) · 🔄 reaberto — reabrir EXIGE evidência que não existia
  antes; sem isso é ruído, não revisão.

RECIBO DE ANÁLISE (fecha o ciclo · template na Parte 3): o dono
devolve uma linha por achado; a sessão aplica o recibo, move os
achados para a zona 📜 e sobe a rev. Briefing sem achado novo NÃO
é reenviado. A linha P-xxx em PENDENCIAS.md registra a rev atual
e até onde foi analisado.

CANDIDATO DESCARTADO TAMBÉM SE REGISTRA: ideia examinada e recusada
por falta de evidência fica na seção 🚫 do briefing, com o motivo —
sem isso ela volta na rev seguinte e consome análise de novo. Voltar
ao assunto exige evidência NOVA, colhida dentro de um projeto que
usa a base; generalizar de um caso único, ou de fora, é achismo.

### R21 — VARREDURA E HIGIENE DE CÓDIGO (protocolo executável V0–V9)

Código morto não é neutro: é lido, mantido, copiado como exemplo e
mente sobre o que o sistema faz. Mas remover sem prova é pior que
manter — este protocolo existe para gerar a prova. A varredura passa
TODO o ferramental de investigação e melhoria pelo projeto, conserta
NA HORA o que for defeito com prova, e transforma em P-xxx o que for
estrutural. Nenhum achado morre em silêncio.
Gatilho: o dono pedir ("faz a análise", "varredura completa", "roda
todas as ferramentas", "deixa tudo redondo") ou /varredura (Parte 2).
Cadência mínima: TRIMESTRAL (R17); os gates que nascem dela (R6)
rodam em todo CI. Marcas de universalidade (referência na Parte 7):
🌍 vale em qualquer linguagem · 🧰 SÓ no ecossistema indicado ·
🏗️ cada projeto preenche o seu. Capacidade sem ferramenta no
ecossistema NÃO se pula: aplica-se o método manual 🌍 da mesma fase.

PRINCÍPIOS (🌍 — valem a varredura inteira):

- Nunca achismo: todo veredito cita comando + output, arquivo:linha
  ou doc oficial. "Parece ok" não é resultado; "EXIT=0, saída X" é
- Número volátil não se cristaliza: contagens se reportam como "o que
  o comando imprimiu HOJE", comparadas com a última varredura; o
  documento permanente guarda a POLÍTICA, o DONE guarda o número
- Prova por mutação quando um conserto entra: quebrar de propósito e
  ver o vermelho antes de confiar (cuidado com mutação que PARECE
  inválida e não é — v3.7/R6)
- Produção primeiro: ferramentas de ERRO antes de qualquer teoria
- Todo achado termina em UM de TRÊS destinos (V8) — nunca em silêncio
- Diff-alvo: revisões de qualidade (V7) varrem o que entrou na main
  desde a última varredura; morto e duplicação varrem o repo inteiro
  (referência cruzada exige visão total)
- Falha vazia = falha: ferramenta que inspecionou ZERO alvos falha
- Entry points declarados ANTES de rodar qualquer detector (V5)
- Credencial reservada a terceiro (revisor de loja, auditor) NUNCA
  prova saúde — conta de prova dedicada do projeto
- A varredura não muda comportamento: remoção, deduplicação e
  padronização preservam o observável; refactor funcional e major de
  dependência viram P-xxx com sessão própria (exceção única: defeito
  com prova — destino 1 do V8)
- Auto-fix nunca no primeiro passe: ferramenta com --fix só roda
  DEPOIS do diagnóstico revisado e do OK, por tipo, em commits atômicos
- Versão de ferramenta não se fixa em doc: usa-se a última ESTÁVEL na
  data, verificada na doc oficial, registrada no DONE

V0 — ABERTURA E DIFF-ALVO (🌍 · R9 inegociável):

- Abertura completa do R9 (eco real); worktree/branch próprio — a
  varredura conflita com toda sessão por definição (escopo largo):
  janela sem outras sessões, ou por módulo em ondas (R10)
- Definir o DIFF-ALVO: git log --oneline <marco-da-última-varredura>
  ..main; primeira varredura da vida do projeto = repo inteiro,
  declarado no arquivo da sessão
- Registrar a LISTA de ferramentas com a versão do dia; instalar
  ferramenta fora da lista exige pedir antes
- O diagnóstico de leitura (V5–V7) roda em subagente Explore
  (context: fork): somente-leitura por construção, sem inchar o
  contexto da sessão principal (R8); a execução volta à principal

V1 — PRODUÇÃO PRIMEIRO (🌍 capacidades · 🏗️ instâncias):
A pergunta: algo está quebrando para usuário real AGORA? Só depois
de respondida com prova se olha para o código.

- 1.1 Rastreador de exceções (🏗️ ex.: Sentry/GlitchTip): zero evento
  NOVO desde a última varredura
- 1.2 Uptime externo (🏗️): todos os monitores verdes, sem incidente
- 1.3 Smoke de produção (script versionado contra o domínio real):
  rotas críticas 200 + certificado válido
- 1.4 Smoke de staging: idem
- 1.5 Logs do orquestrador (SÓ se 1.1–1.4 acusarem): diagnóstico
  ancorado no LOG, não em teoria
- Evento novo no rastreador = defeito: entra ANTES de qualquer
  melhoria estética · Smoke MANUAL conta contra rate limits reais
  (o automatizado usa conta/rota próprias) · Projeto sem 1.1–1.3:
  a AUSÊNCIA é o primeiro achado (P-xxx de observabilidade — R7)

V2 — MECÂNICA LOCAL (🌍 princípio · 🏗️ comando):

- BATERIA ÚNICA: todo projeto tem UM comando que roda tudo (composer
  check · pnpm check · make check/tox). Se não existe, CRIÁ-LO é o
  primeiro conserto — sem ele, "rodei tudo" é inverificável. A lista
  viva de gates é o próprio script; o documento aponta, não duplica
- Bateria completa: EXIT=0 (se falhar, repetir gate a gate p/ isolar)
- E2E/navegador real (quando há UI) contra o app rodando: 100% verde,
  reportando o NÚMERO do dia
- CATRACA DE COBERTURA: cobertura não CAI entre varreduras — queda é
  teste removido indevidamente (investigar) ou código novo sem teste
  (P-xxx); meta de subida é política do projeto, não deste protocolo
- FIDEDIGNIDADE DA DOC (amostra): sortear 10 afirmações
  VERIFICÁVEIS da documentação (comandos, caminhos, tabela de
  módulos, estados com data) e conferir contra a realidade —
  afirmação falsa é DEFEITO (destino 1 do V8): a doc conserta na
  hora, e a CAUSA (gatilho do R3 sem gate que o cubra) vira P-xxx

V3 — SAÚDE DO APP E DA IMAGEM:

- Doctor do framework: 🧰 php artisan about + composer validate
  (PHP/Laravel) · expo-doctor (Expo/RN) · equivalente do ecossistema;
  🌍 fallback: checklist de versões declaradas × instaladas (runtime,
  gerenciador, SDKs) — sem doctor não se pula, se confere na mão
- Imagem: docker build --check . sem warning (🌍 quando há Dockerfile)
- Smoke do ARTEFATO pela imagem (R15), quando existe imagem de produção

V4 — DEPENDÊNCIAS (conflitos + vulnerabilidades + frescor):

- Conflitos/peers: 🧰 pnpm peers/npm ls · composer validate + install
  seco · pip check — zero conflito
- Auditoria COMPLETA, SEM filtro de severidade (o gate do CI pode
  barrar só high; na varredura as moderadas também contam):
  composer audit · pnpm audit · pip-audit
- Segunda opinião 🧰 multi: OSV-Scanner (Google) — manifests/lockfiles
  de 11+ ecossistemas contra a base OSV.dev, + imagem de container e
  licenças; divergência entre as duas auditorias → investigar
- Frescor: triagem dos PRs Dependabot/Renovate (R17); majors = P-xxx
  com sessão própria — upgrade não é escopo da varredura
- OVERRIDE/PIN mora onde a versão ATUAL do gerenciador lê — conferir
  na doc da versão instalada, não no costume (gerenciador muda o
  local entre majors e ignora o antigo em silêncio); todo override
  com comentário de motivo + data; depois: reinstalar e repetir a
  auditoria · Vulnerabilidade sem correção upstream: P-xxx com data
  de reavaliação + mitigação — nunca ignore silencioso sem comentário

V5 — CÓDIGO ÓRFÃO E MORTO (o núcleo):
O MÉTODO (🌍 — o mesmo com ou sem ferramenta):

1. DECLARAR OS ENTRY POINTS antes de rodar qualquer coisa: bootstrap,
   rotas, comandos, workers e jobs, listeners, hooks de framework,
   scheduled tasks, seeds, configs lidos em runtime, testes. Entry
   point esquecido = "morto" falso; a lista é 🏗️, versionada junto
   da config da ferramenta
2. CONSTRUIR O ALCANCE a partir deles: candidatos = universo −
   (entry points + alcançáveis)
3. SUBTRAIR O DINÂMICO (lista "o que NÃO é morto", abaixo)
4. CLASSIFICAR cada candidato, sempre com a evidência:
   A remoção segura (zero referência, provada por ferramenta com
   entry points completos + busca textual negativa) · B suspeito
   (contexto + decisão do DONO, nunca do executor) · C falso positivo
   (ignore CONFIGURADO com comentário do porquê) · D desvio de padrão
   (código vivo fora do padrão → P-xxx, não remoção)
5. OK do dono sobre a lista B antes de remover qualquer coisa
6. REMOVER (A + B aprovados) em commits atômicos por tema, suíte
   COMPLETA verde após cada lote, e instalar o GATE permanente (R6)
   para o morto não voltar
   FERRAMENTAS (mapa completo e notas na Parte 7): 🧰 knip (JS/TS) ·
   shipmonk/dead-code-detector + unused-public + class-leak +
   composer-dependency-analyser + Rector DEAD_CODE dry-run (PHP) ·
   vulture + deptry + ruff (Python) · 🌍 sem ferramenta: o método acima
   na mão, símbolo a símbolo
   VARREDURA GUIADA (🌍 — o que ferramenta nenhuma cobre inteiro):

- Resíduos: código comentado (o git é o histórico), TODO/FIXME
  antigos (🏗️ teto sugerido: 6 meses), log de depuração, flag de
  experimento encerrado
- Contratos sem consumidor: rota sem chamador interno E fora da
  superfície pública, evento sem listener, job nunca enfileirado,
  DTO que nada instancia, comando que nada agenda
- CONFIRMAÇÃO TEXTUAL antes de toda remoção A: busca no repo INTEIRO
  pelo nome — templates, configs, YAML/JSON, CI e STRINGS (resolução
  dinâmica vive em string); ferramenta disse zero + grep achou numa
  string = reclassificar para B na hora
- Pares órfãos entre mundos: chave de env no example que nenhum
  config lê (e o inverso — R11), tradução sem chave, asset sem
  referência (R14), script de manifest que nada chama, seed de
  feature removida
- Teste órfão: cobre só código listado como morto → sai JUNTO (é o
  que o modo production/excluder-de-testes das ferramentas acha)
- Coverage por módulo e dependências desatualizadas: só REGISTRO
  O QUE NÃO É CÓDIGO MORTO (🌍 — a lista que evita o estrago):
- Resolvido DINAMICAMENTE: classe vinda do container por string,
  view por nome, listener registrado por convenção, auto-discovery —
  e job cujo nome de classe está em payload serializado NA FILA:
  apagar a classe com job pendente = falha depois do deploy
- Superfície PÚBLICA: endpoint de /api/v1 que cliente instalado
  ainda chama (R4 nunca quebra v1), SDK consumido por outro repo,
  webhook de terceiro — sai por depreciação com data, não por remoção
- Código atrás de flag Pennant não lançada: parece morto, é futuro
- Código de compatibilidade N-1 esperando a fase contract (R4) —
  remover cedo mata o rollback (R15)
- Migration já aplicada (R4), scaffold de framework, seed de dados
  de referência, chave de rotação (APP_PREVIOUS_KEYS — R5),
  tradução de idioma ainda não ativado
- Asset com URL fixa consumido de FORA: favicon, ícones da PWA,
  og-image (R14) — nenhum código referencia, e todos são usados
- 🧰 registrar no 🏗️ os padrões do ecossistema: facades e magic
  methods (PHP), **getattr**/decorators de registro (Python),
  injeção por token e side-effect imports (JS/TS)
  MÉTODO DO CARIMBO (🌍 — para suspeito B que a estática não decide):
  instrumentar o caminho com marcador de log dedicado ("MORTO? <id>"),
  deployar, janela de observação 🏗️ (mínimo um ciclo COMPLETO de
  negócio: fechamento de mês, rotina semestral) e só então decidir:
  nunca disparou → remoção com prova de runtime; disparou → vivo. O
  marcador nasce com a P-xxx da própria remoção — carimbo esquecido é
  resíduo novo.

V6 — DUPLICAÇÃO (detectar é fácil; o difícil é decidir):
TAXONOMIA (🌍): tipo 1 cópia exata · tipo 2 com renomes · tipo 3 com
lacunas · tipo 4 mesma SEMÂNTICA em sintaxe diferente (ferramenta não
pega com confiança — sai da revisão humana do V7 e do domínio)
DETECÇÃO: 🧰 multi jscpd (223+ formatos, threshold que quebra o
build, git blame — detalhes na Parte 7); calibrar min-tokens para não
acusar boilerplate; exclusões (lockfile, snapshot, gerado, migration,
vendored) SEMPRE com comentário do porquê
JULGAMENTO (🌍 — a parte que ferramenta NENHUMA faz; por clone, nesta
ordem, ANTES de qualquer extração):

1. Mesmo CONHECIMENTO ou só o mesmo TEXTO? Deduplicar vale quando os
   trechos mudam JUNTOS por definição do negócio; iguais por
   COINCIDÊNCIA (mesma fórmula hoje, evolução independente) ficam
   separados — fundir acopla o que o negócio quer independente
2. Cruza fronteira de módulo (R10)? Duplicação entre bounded contexts
   é frequentemente LEGÍTIMA: cada contexto é dono da sua versão da
   regra. Extrair para Shared acopla módulos e vira depósito — só
   sobe o que é conhecimento do NEGÓCIO INTEIRO (dinheiro, documento
   fiscal, datas)
3. REGRA DOS TRÊS: na 2ª ocorrência anota; extrai na 3ª — com duas
   ainda não se conhece a variação real, e duplicação é mais barata
   que a abstração errada. Abstração errada detectada (parâmetros-
   bandeira acumulando, callers contorcidos): o caminho é RE-INLINE
   (duplicar de novo) e redesenhar — remendar só encarece
4. É TESTE? Legibilidade vence DRY: cenário explícito e repetido é
   preferível a helper genérico que esconde o que o teste prova;
   deduplicar só o setup mecânico (builders/factories), nunca o cenário
5. A extração muda comportamento observável (arredondamento, ordem de
   efeitos, mensagens)? Então NÃO é deduplicação, é refactor
   funcional → P-xxx com sessão própria
   REMOÇÃO SEGURA DE CLONE APROVADO (🌍): 1. cobrir o comportamento
   ATUAL de todas as cópias com teste (caracterização) · 2. extrair para
   o lugar da decisão acima, com a justificativa escrita · 3. substituir
   UMA cópia por commit, suíte completa verde entre commits · 4. prova
   por mutação na unidade extraída: quebrar a regra → TODOS os antigos
   pontos de uso vermelhos (prova de que uniu de verdade) · 5. registrar
   no DONE os removidos E os MANTIDOS com motivo — manter com motivo
   escrito é resultado tão válido quanto remover

V7 — MELHORIA DIRIGIDA (onde gastar o esforço):
Melhoria sem direção vira retoque aleatório. Três bússolas, na ordem:
HOTSPOTS (🌍 — churn × complexidade): melhorar primeiro o que é
MEXIDO com frequência E difícil de entender.

1. Churn (🏗️ janela sugerida 12 meses):
   git log --since="12 months ago" --format= --name-only | sort |
   uniq -c | sort -rg | head -30
2. Complexidade por função: 🧰 multi lizard (15+ linguagens, -C teto
   com exit ≠ 0 — Parte 7) ou o linter nativo (ESLint complexity,
   phpstan/phpmd, ruff C901) — UM por projeto, registrado no 🏗️
3. Hotspot = interseção dos dois rankings; os 5 piores viram os alvos;
   melhoria fora de hotspot só com justificativa escrita
   SEGURANÇA sobre o diff-alvo: 🧰 Claude Code: /security-review
   (comando embutido oficial — cobre as mudanças da branch atual:
   injeção, XSS, authn/authz, dados inseguros, com nível de confiança);
   repo INTEIRO (1ª varredura): plugin oficial security-guidance (scan
   multi-agente profundo); contínuo: a GitHub Action nos PRs; recorte
   🏗️ do projeto entra no prompt customizável. 🌍 fora do Claude Code:
   checklist manual no diff — entrada não confiável até
   parametrização/escape, authz em TODO caminho novo (SSE/websocket/
   webhook incluídos), segredo fora do diff, headers/proxy confiável,
   upload/desserialização. Esperado: zero HIGH/MEDIUM sem veredito
   SIMPLIFICAÇÃO EM 4 DIMENSÕES sobre o diff-alvo (🌍 — por trecho,
   exatamente estas perguntas):
4. REUSO: já existe no projeto (helper, action, componente)?
   Reimplementação paralela casa com o V6
5. SIMPLIFICAÇÃO: dizer o mesmo com menos (early return, camada
   vazia fora, condicional achatada) SEM mudar comportamento?
6. EFICIÊNCIA: desperdício evidente no caminho quente (N+1, trabalho
   repetido em loop, estrutura errada)? Otimização especulativa NÃO
   entra — só o que a evidência (hotspot, observabilidade) aponta
7. ALTITUDE: nível certo? Regra de negócio em template/controller
   desce para o domínio; infra vazando para cima vira achado D do V5
   Aplicação: o que preserva comportamento e passa nos gates entra na
   hora (commits atômicos); o que mudaria comportamento é RECUSADO AQUI
   com motivo escrito — e o motivo entra no DONE

V8 — TRATAMENTO DOS ACHADOS (🌍 — a regra de ouro dos 3 destinos):
Todo achado de QUALQUER fase termina de UM destes jeitos — nunca em
silêncio:

1. DEFEITO de correção → conserto pontual NA HORA, no escopo, com
   teste que o prova POR MUTAÇÃO
2. ESTRUTURAL / de altitude / muda produto ou comportamento → P-xxx
   no quadro central NA HORA, com a evidência; não se corrige na
   varredura sem OK do dono
3. Sugestão RECUSADA → recusa com MOTIVO escrito no DONE
   consertos + P-xxx + recusas = TODOS os achados — a conta fecha no
   reporte final (formato na Parte 7), ou a varredura não terminou.
   GATE NOVO: conserto que cria risco de regressão sem guarda (classe de
   erro que nenhum gate captura) → o gate nasce JUNTO do conserto,
   nomeando a regra no título, falha vazia = falha, provado por mutação
   (R6/v3.7). Achado que pede mudança NA BASE → briefing (R20), nunca
   edição direta.

V9 — ENCERRAMENTO (🌍 · R9):

1. RE-RODAR após os consertos: bateria única EXIT=0 + E2E verde — os
   consertos não podem sujar o que estava limpo
2. Código foi para a main e vai ao ar: DEPLOY VIGIADO — sozinho,
   nunca junto de feature; staging → produção pelo protocolo (R15),
   smoke pós-deploy e rastreador de exceções limpo por janela 🏗️.
   O resolvido "por string" só se prova em produção. PROVA DE DEPLOY
   é o AMBIENTE mudado (digest da imagem no log + container recriado
   healthy) — nunca o job verde: pipeline já terminou verde com
   webhook mudo e com imagem puxada sem recriar o container
3. DONE com os números MEDIDOS do dia (testes, cobertura, % de
   duplicação, morto removido/mantido, hotspots restantes)
   comparados com a varredura anterior; P-xxx novas no quadro; linha
   no histórico do SESSOES.md; UMA linha no ESTADO.md; momento
   natural de REDUZIR a baseline de análise estática (R6)
4. Conventional Commits; merge conforme o fluxo; remover o worktree

### TEMPLATE DE CHECKPOINT (emitir ao fim de cada fase)

✅ CHECKPOINT — FASE [X] · SESSÃO [id]
O QUE FOI FEITO: [lista objetiva]
ARQUIVOS CRIADOS/ALTERADOS: [caminhos]
PACOTES ADICIONADOS: [nome + versão + motivo]
DECISÕES REGISTRADAS: [refs no DECISOES.md]
COMANDOS PARA VALIDAR: [ex.: composer check · /verify se a
mudança é visível no app]
CLASSE DE ERRO INTRODUZÍVEL E GATE QUE A CAPTURA: [obrigatório —
se nenhum gate existente captura, criar o gate ANTES de prosseguir]
BLOQUEADO EM VOCÊ: [B-xxx abertos que me impedem de seguir, ou —]
DOCS TOCADAS PELO DIFF: [docs alteradas · ou "nenhuma — <motivo>"]
(obrigatório — conferir contra o MAPA DE GATILHOS do R3)
SESSÃO ATUALIZADA: sim · ESTADO.md: [sim, se encerramento]
PARA CONTINUAR EM NOVA CONVERSA:
"Leia docs/ESTADO.md e docs/SESSOES.md e continue da fase [X+1]"
```

---

## PARTE 2 — SKILLS DO PROJETO E FRASES DE ENTRADA

As frases prontas de sessões viraram SKILLS versionadas em
`.claude/skills/` (nascem no F2; carregam sob demanda — custo ~zero
até serem usadas). Todas com `disable-model-invocation: true`:
quem dispara é você, nunca o modelo por conta própria.

| Skill                       | O que faz                                                                                                                         | Regra |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `/abrir-sessao [escopo]`    | ABERTURA do R9 com ESTADO/SESSOES/PENDENCIAS injetados com dados reais; cria o ATIVA- com eco de leitura e grava `.sessao-escopo` | R9    |
| `/encerrar-sessao`          | ENCERRAMENTO do R9 completo (passos 1–9, com a reconciliação documental) + checkpoint final                                       | R9    |
| `/checkpoint [fase]`        | Emite o template de checkpoint do R1                                                                                              | R1    |
| `/varredura [escopo]`       | Protocolo V0–V9 do R21: diagnóstico em subagente Explore, nada removido sem OK do dono                                            | R21   |
| `/briefing [assunto]`       | Abre/atualiza briefing pelo template, com carimbo e zonas                                                                         | R20   |
| `/adocao` · `/upgrade-base` | Executam os modos do R18                                                                                                          | R18   |

**Entrar num projeto — 1ª conversa (antes de a projeção existir · protocolo do R18):**

> Projeto novo: "Base universal em anexo. Não existe código —
> execute o MODO CRIAÇÃO do R18 para: [ideia em 1 linha]."
>
> Projeto existente sem o padrão: "Base universal em anexo. O projeto
> já existe e não tem BASE_*.md — execute o MODO ADOÇÃO do R18."
>
> Atualizar a base: "Base universal v4.3 em anexo. O projeto está na
> base vX.Y — execute o MODO UPGRADE do R18."

**Abrir conversa paralela (2ª, 3ª...):**

> No terminal: `claude --worktree [slug]` → na conversa:
> "/abrir-sessao [ex.: escrever testes do módulo X]"

**Retomar sessão interrompida:**

> `claude --resume` (volta ao worktree) →
> "Leia docs/sessions/ATIVA-[id].md e continue exatamente de onde parou."

**Encerrar a sessão atual:**

> "/encerrar-sessao"

**Varredura completa (R21):**

> Em janela sem outras sessões (ou por módulo):
> "/varredura [escopo · vazio = repo inteiro]" → revisar o diagnóstico,
> OK sobre a lista B e sobre cada extração de clone → só então a
> execução remove.

**Ver o panorama geral (em qualquer conversa):**

> "Leia docs/SESSOES.md e me diga o que cada sessão está fazendo agora."

---

## PARTE 3 — TEMPLATES DOS ARQUIVOS

### `CLAUDE.md` (raiz — ENXUTO, < 200 linhas · R3)

```markdown
# [NOME] — instruções para o Claude Code

> Base universal v4.3 · fonte completa das regras: BASE_<NOME>.md (raiz)
> Detalhe por área: .claude/rules/ · procedimentos: /abrir-sessao,
> /encerrar-sessao, /checkpoint, /varredura, /briefing (Parte 2 da base)

## Stack (fixa — não sugerir alternativas)

Laravel 13 · PHP 8.5 · Livewire 4 + Flux Pro 2 · Filament 5 ·
Tailwind 4 + Vite 8 · PostgreSQL 18 · Sail · Dokploy ·
Pest 4 · PHPStan 9 · Pint · Rector

## Comandos

- composer test | analyse | format | check
- /verify — validar mudança visível no app rodando

<!-- manter curto: o resto vive em rules e skills (custo de contexto) -->

## Abertura de TODA conversa (R9)

1º docs/ESTADO.md → 2º docs/SESSOES.md (ativas + avisos + últimas 5)
→ 3º docs/PENDENCIAS.md → 4º arquivo da própria sessão.
Sessão paralela nasce em worktree: /abrir-sessao.

## NUNCA (enforcement em hooks/permissões — R19; a regra completa na BASE)

- editar migration já aplicada — correção = nova migration (R4)
- timestamp() naive em tabela de domínio — timestampTz (R13)
- escrever em tabela de outro módulo — Contracts/eventos (R10)
- env() fora de config/ · segredo no repo ou com VITE_ (R11)
- comando destrutivo sem confirmação (R1)
- tocar arquivo no escopo de outra sessão ativa (R9)
- editar fora do escopo — achado vira briefing + P-xxx (R20)

## Referências

Sigla desconhecida → docs/MAPA.md · decisões → docs/DECISOES.md ·
regra completa: "BASE_<NOME>.md § R<n>".
```

### `.claude/rules/r13-tempo.md` (exemplo de fatia com escopo — R3)

```markdown
---
paths:
  - 'database/migrations/**'
---

# R13 — Tempo (recorte para migrations · completo: BASE § R13)

- Data-hora: timestampTz() SEMPRE; timestamp() naive é proibido em
  tabela de domínio (escopo e exceções de scaffold: BASE § R13)
- Data pura (vencimento, dia, aniversário): DATE + cast 'date' — sem fuso
- NUNCA editar migration aplicada; correção = nova migration (R4)
- Índice em tabela populada: CREATE INDEX CONCURRENTLY +
  $withinTransaction = false (R4)
```

Fatias padrão (mesmo formato): r04-migrations → `database/**` ·
r14-assets → `resources/**, public/**` · r10-fronteiras →
`app/Modules/**` · r11-env → `.env*, config/**`.

### `.claude/settings.json` (permissões + hooks — R19)

```json
{
  "permissions": {
    "deny": [
      "Edit(.env)",
      "Edit(.env.*)",
      "Edit(auth.json)",
      "Bash(php artisan migrate:fresh*)",
      "Bash(git push --force*)"
    ],
    "ask": ["Bash(php artisan migrate*)"]
  },
  "disabledMcpjsonServers": [],
  "autoMemoryEnabled": true,
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protecao-arquivos.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guarda-bash.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pint-arquivo.sh"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "sed -n '1,30p' docs/ESTADO.md 2>/dev/null; grep -E '^### B-.*aberto|🔴 aberta' docs/PENDENCIAS.md 2>/dev/null | head -20"
          }
        ]
      },
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "head -40 docs/sessions/ATIVA-*.md 2>/dev/null"
          }
        ]
      }
    ]
  }
}
```

Notas: multi-máquina/multi-pessoa → `"autoMemoryEnabled": false`
(R19) · repo que recebe skill de terceiro →
`"disableSkillShellExecution": true` · MCP global de outro projeto
→ nome em `disabledMcpjsonServers`.

### `.claude/hooks/protecao-arquivos.sh` (esboço de referência — R19)

```bash
#!/bin/bash
# Bloqueia (exit 2) edição fora das regras — gatear conforme R6/v3.7
# (bash -n + shellcheck + mutação que prova a recusa)
INPUT=$(cat)
F=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$F" ] && exit 0

# 1) Caminhos protegidos (R11/R16)
for p in ".env" "auth.json"; do
  case "$F" in *"$p"*) echo "Bloqueado: $F é protegido ($p) — R11" >&2; exit 2;; esac
done

# 2) Escopo da sessão (R9) — docs/ e .claude/ sempre permitidos
if [ -f .sessao-escopo ]; then
  case "$F" in docs/*|.claude/*|*/docs/*|*/.claude/*) exit 0;; esac
  ok=1
  while IFS= read -r prefixo; do
    [ -z "$prefixo" ] && continue
    case "$F" in "$prefixo"*|*"/$prefixo"*) ok=0;; esac
  done < .sessao-escopo
  if [ "$ok" = 1 ]; then
    echo "Bloqueado: $F fora do escopo desta sessão (R9) — registre P-xxx ou briefing (R20)" >&2
    exit 2
  fi
fi

# 3) Migration já aplicada (R4): comparar com database/schema/*.sql
#    ou consultar a tabela migrations — gerar a checagem no F2
exit 0
```

Os demais (`guarda-bash.sh`, `pint-arquivo.sh`) nascem no F2
seguindo o catálogo do R19 — e TODOS passam pelo gate do v3.7.

### `.claude/skills/abrir-sessao/SKILL.md` (procedimento do R9)

```markdown
---
name: abrir-sessao
description: Abre sessão de trabalho conforme R9, com eco de leitura sobre dados reais
disable-model-invocation: true
---

## Estado real do projeto (injetado agora — não é memória)

### ESTADO.md

!`sed -n '1,40p' docs/ESTADO.md`

### Sessões ativas, avisos e últimas conclusões

!`sed -n '1,60p' docs/SESSOES.md`

### Pendências e bloqueios abertos

!`cat docs/PENDENCIAS.md`

## Sua tarefa (R9 — ABERTURA)

Escopo pedido: $ARGUMENTS

1. Confira colisão com sessões ativas acima. Colidiu → PARE e
   proponha alternativa.
2. Crie docs/sessions/ATIVA-[AAAA-MM-DD-HHMM]-[slug].md pelo
   template, com o ECO DE LEITURA preenchido a partir dos dados
   acima (eco vazio ou genérico = abertura inválida).
3. Adicione a linha na tabela "Sessões ativas" do SESSOES.md.
4. Grave o escopo em .sessao-escopo (um prefixo de caminho por
   linha) — alimenta o hook de proteção (R19).
5. Emita o resumo de abertura e AGUARDE meu OK antes de trabalhar.
```

`/encerrar-sessao`, `/checkpoint`, `/briefing`, `/adocao` e
`/upgrade-base` seguem o mesmo formato (o corpo é o procedimento da
regra correspondente); diagnósticos somente-leitura rodam com
`context: fork` + `agent: Explore` (R8/R21).

### `.claude/skills/varredura/SKILL.md` (protocolo V0–V9 do R21)

```markdown
---
name: varredura
description: Varredura completa V0–V9 do R21 — órfãos, duplicação e melhoria com prova
disable-model-invocation: true
---

## Estado real do projeto (injetado agora)

### Estado global

!`sed -n '1,30p' docs/ESTADO.md`

### Sessões ativas e avisos

!`sed -n '1,50p' docs/SESSOES.md`

### Pendências e bloqueios abertos

!`cat docs/PENDENCIAS.md`

### Última varredura (diff-alvo e comparação de números)

!`ls -t docs/sessions/DONE-*varredura* 2>/dev/null | head -1 | xargs -r sed -n '1,60p'`

## Sua tarefa (R21 — V0–V9)

Recorte: $ARGUMENTS (vazio = repo inteiro).

1. V0: abra a sessão (R9, eco real), worktree próprio, declare o
   diff-alvo e a lista de ferramentas com a versão do dia.
2. V1–V4 na ordem; produção primeiro; defeito ativo interrompe.
3. V5–V6: entry points declarados ANTES de qualquer detector;
   diagnóstico de leitura em subagente Explore (context: fork);
   classifique A/B/C/D com evidência; NADA é removido antes do meu
   OK sobre a lista B e sobre cada extração de clone (julgamento
   V6 escrito, clone a clone).
4. V7 sobre o diff-alvo + os 5 piores hotspots.
5. V8: todo achado com destino (conserto provado · P-xxx · recusa
   com motivo). V9: re-rode tudo e monte o reporte da Parte 7.
   Inegociáveis: princípios do R21; comportamento não muda; auto-fix
   só depois do OK; a conta dos achados fecha.
```

### `.worktreeinclude` (raiz — o que copia para cada worktree · R9/R11)

```text
.env
.env.testing
auth.json
```

### `README.md` (raiz — a PORTA: roteador em camadas, não manual · R3)

````markdown
# [Projeto]

> Uma frase: o que faz, para quem. Sem jargão interno — colega de
> outra área tem que entender.

[![CI](badge)](link) [![versão](badge)](link) [![licença](badge)](link)

## Início rápido

```bash
git clone <url> && cd [projeto]
cp .env.example .env
composer setup   # ou o comando único do projeto
composer dev
```
````

Acesse http://localhost:8080

## Requisitos

PHP 8.5 · Composer · Docker (Sail) · Node — versões exatas em
composer.json/engines. Divergiu? O doctor acusa (R21 · V3).

## Comandos do dia a dia

| Comando          | O que faz                                      |
| ---------------- | ---------------------------------------------- |
| `composer check` | bateria única: formata, analisa, testa, audita |
| `composer test`  | só os testes                                   |

## Estrutura (1º nível apenas)

`app/Modules/` domínio por módulo · `docs/` documentação (índice:
[MAPA](docs/MAPA.md)) · `database/` migrations · `.claude/` projeção
do agente

## Documentação

- [MAPA — índice completo](docs/MAPA.md)
- [Como o sistema é montado](docs/ARQUITETURA.md)
- [Deploy](docs/runbooks/deploy.md) · [O que mudou](CHANGELOG.md)

## Segurança

Vulnerabilidade? → [SECURITY.md](SECURITY.md)

````
Regras do template: badge que PROVA (CI/versão/licença), nunca
decoração · quick start ≤5 comandos testado em máquina limpa · toda
seção ≤ ~10 linhas terminando em link · biblioteca/API pública
acrescenta camadas: Instalação por gerenciador, Uso mínimo copiável
(exemplo que não roda é pior que ausente — teste no CI), API (5 mais
usados + link), Limitações (o que o projeto NÃO faz — a seção mais
subestimada), Compatibilidade.

### `docs/README.md` (espelho de entrada — 3 linhas · R3)

```markdown
# Documentação — [Projeto]
Índice canônico: **[MAPA.md](MAPA.md)** (toda sigla + "Quero → abro").
Mais lidos: [ESTADO](ESTADO.md) · [ARQUITETURA](ARQUITETURA.md) ·
[runbooks/](runbooks/)
````

### `docs/decisions/NNNN-titulo.md` (ADR — formato Nygard · R3)

```markdown
# 0007 — Adotar PostgreSQL como banco único

Data: 2026-08-05 · D-007 no índice DECISOES.md

## Status

Aceito <!-- Proposto | Aceito | Depreciado | Substituído por 0012 -->

## Contexto

A força que empurra a decisão: restrição, problema, requisito.
Fatos e números, não opinião. 3–8 linhas.

## Decisão

"Nós vamos ..." — uma frase, voz ativa. Alternativas descartadas e
o porquê em 1 linha cada.

## Consequências

O que fica mais FÁCIL e o que fica mais DIFÍCIL. As duas, sempre —
consequência só positiva é propaganda, não registro.
```

Linha correspondente no índice `DECISOES.md`:
`D-007 · 2026-08-05 · PostgreSQL como banco único → decisions/0007-adotar-postgres.md`
(decisão pequena/reversível: SÓ a linha no índice, sem arquivo)

### `docs/runbooks/<sintoma-ou-operacao>.md` (procedimento sob pressão · R3)

```markdown
---
tipo: runbook
dono: [pessoa]
revisado_em: 2026-08-05
validade: 90d
status: ativo
---

# Runbook: [sintoma como aparece no alerta, ou operação]

**Gatilho:** o alerta/situação que traz alguém até aqui
**Impacto:** quem é afetado e quão grave

## Diagnóstico (árvore de decisão)

1. `comando exato` → saída esperada: `...`
   - Se X → vá ao passo 2 · Se Y → vá à Mitigação B
2. `comando exato` → ...

## Mitigação (parar a dor AGORA, antes da causa raiz)

A. `comando copiável`
B. `comando copiável`

## Verificação (provar que resolveu)

`comando` → esperado `...` · monitor verde em [link]

## Escalonamento

Não resolveu em [N min] → parar e acionar [quem/canal]

## Armadilhas conhecidas

- [data] sintoma enganoso → verdade
```

Regras: comando copiável, NUNCA instrução abstrata · escrito para
quem não tem contexto (zero "como sempre fazemos", zero sigla sem
link) · 1 runbook por trimestre é EXECUTADO de verdade (R17).

### `docs/postmortems/AAAA-MM-DD-sintoma.md` (blameless · R3/R15)

```markdown
# Postmortem: [sintoma] — AAAA-MM-DD

> BLAMELESS: todos agiram com boa intenção e a melhor informação
> disponível. O alvo é o sistema, nunca a pessoa.

## Resumo (3 linhas)

O quê, por quanto tempo, impacto em uma frase cada.

## Linha do tempo

| Hora | Evento (detecção, ações, resolução) |
| ---- | ----------------------------------- |

## Impacto

Quem · quanto tempo · quanto (números medidos, não impressão)

## Causa raiz

A cadeia até a causa de SISTEMA (não "fulano errou" — por que o
sistema deixou o erro passar?)

## O que funcionou / o que não funcionou na resposta

## Ações (sem dono e prazo não é ação, é desejo)

| Ação                                      | Dono | Prazo | Status |
| ----------------------------------------- | ---- | ----- | ------ |
| Teste que reproduz o bug (R15 §1)         |      |       |        |
| Entrada no smoke, se infra/asset (R15 §2) |      |       |        |
| Runbook: sintoma→causa→reversão (R15 §3)  |      |       |        |
```

Append-only: postmortem não se reescreve — é história.

### `docs/SESSOES.md`

```markdown
# 🔀 SESSÕES DE TRABALHO — [Projeto]

> Painel de conversas paralelas. Toda sessão se registra aqui ao abrir.

## 🟢 Sessões ativas

| ID                  | Início      | Objetivo       | Escopo                  | Branch/Worktree |
| ------------------- | ----------- | -------------- | ----------------------- | --------------- |
| 2026-07-10-1430-pix | 10/07 14:30 | Integração Pix | app/Modules/Financeiro/ | worktree-pix    |

## 📢 Avisos entre sessões (leitura obrigatória na abertura — R9)

| Data  | Sessão | Aviso                                        | Quem precisa saber      |
| ----- | ------ | -------------------------------------------- | ----------------------- |
| 10/07 | pix    | contrato GerarCobranca ganhou parâmetro novo | quem consome Financeiro |

## ✅ Histórico (mais recente primeiro — as 5 do topo são leitura obrigatória na abertura)

| ID                  | Período  | Resultado (para quem não participou)                               | Pendências | Branch/PR    |
| ------------------- | -------- | ------------------------------------------------------------------ | ---------- | ------------ |
| 2026-07-10-1430-pix | 10–11/07 | Pix gera e concilia cobrança de reserva; webhook coberto por teste | P-004      | worktree-pix |
```

### `docs/sessions/ATIVA-[id].md`

```markdown
# Sessão: [slug]

- **Status:** 🟢 ATIVA
- **Início:** [data hora]
- **Objetivo:** [o que ESTA conversa vai entregar]
- **Escopo (pode tocar):** [pastas/arquivos — espelhado em .sessao-escopo]
- **Fora do escopo (não tocar):** [pastas/arquivos]
- **Branch/Worktree:** worktree-[slug]

## Eco de leitura (abertura — R9 · vazio ou genérico = abertura inválida)

- **Sessões ativas vistas:** [ids ou "nenhuma"]
- **Últimas conclusões lidas:** [ids + 1 linha do que absorveu de cada]
- **Avisos lidos:** [quais ou "nenhum"]
- **Pendências assumidas:** [P-xxx ou "nenhuma"]

## Progresso

- [10/07 14:45] PixService criado — 8 testes passando
- [10/07 15:10] Webhook de confirmação implementado

## Encerramento (preencher ao concluir)

- **Fim:** — · **Commits:** —
- **Resultado (para quem NÃO participou):** —
- **Pendências → PENDENCIAS.md:** [P-xxx criadas ou "nenhuma"]
```

### `docs/PENDENCIAS.md`

```markdown
# 📌 PENDÊNCIAS — [Projeto]

> Quadro CENTRAL (R9). Pendência que não está aqui não existe —
> leitura obrigatória na abertura de TODA sessão.

## 🚧 BLOQUEADO EM MIM OU EM TERCEIRO (B-xxx — só o dono resolve)

### B-001 · 🔴 aberto · pedido em 26/07

- **Ação:** criar conta no gateway e gerar chave de sandbox
- **Quem:** dono · **Bloqueia:** F5 · P-007 · sessão pagamentos
- **Pronto esperando:** integração codada atrás da flag `pagamentos`
- **Devolver:** colar a chave em `WOOVI_KEY` no .env e responder
  "B-001 feito"
- **Contorno:** stub de cobrança ativo → remover em P-012

### B-002 · ✅ resolvido em 25/07 (mantido como histórico)

- **Ação:** aprovar OAuth do MCP nesta máquina · **Quem:** dono
- **Devolvido:** `claude mcp list` mostrando ✔ Connected

## 📋 Pendências técnicas (P-xxx — qualquer sessão assume)

| ID    | Origem     | Pendência                         | Contexto/arquivo | Prioridade | Status                        |
| ----- | ---------- | --------------------------------- | ---------------- | ---------- | ----------------------------- |
| P-001 | sessão pix | tratar estorno parcial no webhook | WooviGateway.php | alta       | 🔴 aberta                     |
| P-002 | sessão pix | doc do fluxo de conciliação       | docs/how-to/     | baixa      | 🟡 em andamento · sessão docs |

Status: 🔴 aberta · 🟡 em andamento · sessão [id] · ✅ concluída (sessão [id] + commit)
REGRAS: assumir pendência = marcar 🟡 com o id da sessão (evita duas
sessões na mesma pendência) · concluir = marcar ✅ com referência ·
NUNCA apagar a linha — o quadro também é histórico.
```

### `docs/briefings/BRIEFING-<assunto>.md` (R20 · teto ~2 páginas)

```markdown
# BRIEFING — <assunto> · rev <N>

> **Para:** dono da base / <área> · **De:** sessão <id> · **Data:** AAAA-MM-DD
> **Natureza:** proposta, NÃO alteração (R20) — nada foi editado fora do escopo.
> **Analisado até:** rev <N-1> · base v<X.Y> · AAAA-MM-DD
> **Novo nesta rev:** P5, P6 — copiar e analisar SÓ a seção 🆕

## Por que existe

<1 parágrafo, escrito na rev 1 e mantido intacto depois: a área que a
regra atual não governa; citar a linha/regra que hoje é tudo o que existe>

## 🆕 NOVO DESDE A ÚLTIMA ANÁLISE

### P5 — <achado em 1 linha>

**Evidência:** <o que aconteceu + arquivo, comando ou log que reproduz>
**Por que as regras atuais não pegam:** <regras candidatas e por que falham>
**Proposta:** <texto de regra, pronto para adaptar à voz do documento>
**Implementação de referência:** <caminho, se já roda; senão "nenhuma">

### P6 — <...>

## 📜 JÁ ANALISADO — não reanalisar (1 linha por achado)

- P1 ✅ ACEITO na base v3.5 → R19
- P2 🔁 REFINADO na v3.5 → R3 classe runbook (limiar mudou)
- P3 ❌ RECUSADO — <motivo em 1 linha> (D-014)
- P4 🔄 REABERTO na rev <N> com evidência nova → ver 🆕

## 🚫 EXAMINADO E DESCARTADO — não repropor sem evidência nova

- <ideia> — descartada em rev <N>: <motivo, ex.: sem EP neste projeto;
  evidência vive em outro repo> · reabrir só com evidência nova AQUI

## Ordem sugerida por risco (só dos 🆕)

<P6 → P5, com 1 linha de justificativa cada>
```

### Recibo de análise (o dono devolve; a sessão aplica — R20)

```text
RECIBO — BRIEFING-<assunto> rev <N> · base v<X.Y> · AAAA-MM-DD
P5 ✅ ACEITO      → <regra que recebeu> (entra na v<X.Y+1>)
P6 🔁 REFINADO    → <o que mudou na proposta e por quê>
P7 ❌ RECUSADO    → <motivo> (D-xxx)
Próximo passo da sessão: mover P5–P7 para 📜, subir para rev <N+1>,
atualizar a linha P-xxx em PENDENCIAS.md.
```

### `docs/how-to/maquina-nova.md` (R3)

```markdown
# 💻 MÁQUINA NOVA — [Projeto]

> Três colunas. A (c) é a que economiza tempo e a que ninguém escreve.

| (a) vem do git                                                                                               | (b) por máquina/usuário                                             | (c) NÃO faça                                                                |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| código, docs versionadas, espelho de referência, .claude/ (rules, skills, hooks, settings), .worktreeinclude | .env local, plugin do agente, OAuth de MCP, credencial, auto memory | re-baixar o que já vem no git (diff em milhares de arquivos, zero conteúdo) |

## Verificações (rodar e datar — R3 classe runbook)

- [ ] `<comando>` → esperado `<saída>` · conferido em AAAA-MM-DD
```

### `docs/ARQUITETURA.md`

```markdown
# 🧱 ARQUITETURA — [Projeto]

> Monolito modular + DDD pragmático (R10). Documento vivo.

## Mapa de módulos

| Módulo     | Responsabilidade               | Tabelas donas       | Expõe (Contracts) | Consome           |
| ---------- | ------------------------------ | ------------------- | ----------------- | ----------------- |
| Financeiro | ledger, cobranças, conciliação | ledger_*, cobrancas | GerarCobranca     | eventos da Agenda |

## Regras de dependência

- Permitido: Presentation → Application → Domain · qualquer camada → Shared
- Proibido: Domain → HTTP/Livewire/Filament · módulo → internals de outro

## Linguagem ubíqua (glossário)

| Termo | Significado no domínio |
| ----- | ---------------------- |
|       |                        |

## Decisões de fronteira

- [D-xxx] [resumo — detalhes no DECISOES.md]
```

### `docs/MAPA.md`

```markdown
# 🧭 MAPA — [Projeto]

> Guia de navegação das referências. Toda sigla usada no projeto
> tem entrada aqui. Referência sem entrada no MAPA = referência inválida.

## Legenda de siglas

| Sigla              | O que é                                                       | Onde encontrar                                                  |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------------------- |
| F0–F8              | Fases do roadmap                                              | BASE_<NOME>.md § R2 · status atual em ESTADO.md                 |
| R1–R21             | Regras de execução                                            | BASE_<NOME>.md § REGRAS DE EXECUÇÃO                             |
| vX.Y (base)        | Versão da base universal aplicada                             | topo do BASE_<NOME>.md                                          |
| D-xxx              | Decisão registrada                                            | DECISOES.md (índice) → ADR completo em docs/decisions/NNNN-*.md |
| US-xx              | User story                                                    | PROJETO.md § user stories                                       |
| ATIVA-/DONE-[id]   | Sessão de trabalho                                            | docs/sessions/ · painel em SESSOES.md                           |
| P-xxx              | Pendência registrada                                          | PENDENCIAS.md (quadro central)                                  |
| B-xxx              | Bloqueio em ação humana/terceiro                              | PENDENCIAS.md § topo (R9)                                       |
| BRIEFING-<assunto> | Proposta que cruza fronteira                                  | docs/briefings/ (R20)                                           |
| CP F[x]            | Checkpoint da fase x                                          | arquivo da sessão · consolidado em ESTADO.md                    |
| V0–V9              | Fases da varredura de código                                  | BASE_<NOME>.md § R21 · referência na Parte 7                    |
| .claude/           | Projeção operacional da base (rules, skills, hooks, settings) | raiz · derivada da BASE (R3/R19) — mudou a base, muda junto     |

## Quero... → abro...

| Preciso de                                            | Arquivo                       |
| ----------------------------------------------------- | ----------------------------- |
| O que fazer agora / onde parei                        | ESTADO.md                     |
| Por que algo foi decidido                             | DECISOES.md                   |
| Quem está mexendo em quê agora                        | SESSOES.md                    |
| O que ficou pendente e o que depende de MIM           | PENDENCIAS.md (P-xxx e B-xxx) |
| Base aplicada, regras, stack e fases                  | BASE_<NOME>.md (raiz)         |
| Como o agente é governado (permissões, hooks, skills) | .claude/ + BASE § R19         |
| Fronteiras de módulos e glossário                     | ARQUITETURA.md                |
| Regras de negócio e user stories                      | PROJETO.md                    |
| Como rodar / instalar                                 | README.md                     |
| Histórico de versões                                  | CHANGELOG.md                  |
| Agenda de auditorias                                  | AUDITORIAS.md                 |
| Diagnóstico e plano de adoção                         | ADOCAO.md (temporário — R18)  |
| Proposta de mudança na base                           | docs/briefings/ (R20)         |
| Setup em máquina nova                                 | docs/how-to/maquina-nova.md   |
| Operar sob pressão (deploy, rollback, backup, chaves) | docs/runbooks/                |
| Tarefas sem pressão (como fazer X)                    | docs/how-to/                  |
| O que aprendemos de um incidente                      | docs/postmortems/             |
| Consulta pura (api, env além do example)              | docs/reference/               |

## Convenção de citação

Sigla resolve? Use a sigla. Não resolve? Cite completo:
"arquivo § seção" — ex.: "ver BASE_<NOME>.md § R5".
```

### `docs/AUDITORIAS.md`

```markdown
# 🔎 AUDITORIAS — [Projeto]

> Agenda viva (R17). Auditoria sem agenda = auditoria morta.

| Auditoria                                            | Cadência     | Dono | Última     | Próxima    |
| ---------------------------------------------------- | ------------ | ---- | ---------- | ---------- |
| composer/npm audit · secrets · docs · BASE↔.claude   | todo CI      | CI   | automático | automático |
| Triagem de PRs de dependências (Dependabot/Renovate) | mensal       | —    | —          | —          |
| Cota Actions/Packages (Settings → Billing)           | mensal       | —    | —          | —          |
| Auto memory via /memory (se habilitada — R19)        | mensal       | —    | —          | —          |
| Índices e queries lentas do banco                    | trimestral   | —    | —          | —          |
| Redução da baseline estática                         | trimestral   | —    | —          | —          |
| Teste de restore do backup                           | trimestral   | —    | —          | —          |
| Ensaio de rollback (R15)                             | trimestral   | —    | —          | —          |
| Matriz regra × gate (inclui hooks/skills — R19)      | trimestral   | —    | —          | —          |
| Varredura completa (R21 · V0–V9)                     | trimestral   | —    | —          | —          |
| Execução real de 1 runbook sorteado (R3)             | trimestral   | —    | —          | —          |
| Fila de frescor de docs (frontmatter vencido — R3)   | mensal       | —    | —          | —          |
| Compliance de versão do framework                    | a cada major | —    | —          | —          |
| Campos sensíveis × criptografia*                     | semestral    | —    | —          | —          |

*obrigatória se o CONTEXTO marcar "Dados sensíveis: sim"
```

### `docs/ADOCAO.md` (temporário — só no modo adoção do R18)

```markdown
# 🚧 ADOÇÃO DO PADRÃO — [Projeto]

> Diagnóstico + plano de ondas (R18 · modo adoção). Arquivar quando
> o diagnóstico estiver 100% ✅/➖ e registrar em DECISOES.md.

## Diagnóstico R1–R21

| Regra                     | Status | Evidência                      | Onda |
| ------------------------- | ------ | ------------------------------ | ---- |
| R5 Segurança              | 🔴     | sem backup automatizado        | 1    |
| R6 Qualidade              | 🟡     | pint ok; sem phpstan nem CI    | 2    |
| R19 Ferramental de agente | 🔴     | sem .claude/settings nem hooks | 2    |

Legenda: ✅ conforme · 🟡 parcial · 🔴 ausente · ➖ não se aplica

## Ondas (prioridade por risco — ver R18)

| Onda | Escopo                                            | Sessão/branch         | Status   |
| ---- | ------------------------------------------------- | --------------------- | -------- |
| 1    | Backup (R5) + rollback (R15)                      | feature/adocao-onda-1 | 🟢       |
| 2    | Gates R6 + contrato R11 + projeção .claude/ (R19) | —                     | pendente |
```

### `.env.example` (raiz do projeto — o contrato do R11)

```bash
# ==========================================
# 1. IDENTIDADE E RUNTIME
# ==========================================
APP_NAME=Projeto
APP_ENV=local                    # prod: production
APP_DEBUG=true                   # prod: false
APP_URL=http://localhost
APP_TIMEZONE=America/Sao_Paulo   # fiar no config/app.php — ver R11
TZ=America/Sao_Paulo             # containers app/workers/banco — R13
APP_LOCALE=pt_BR
APP_FALLBACK_LOCALE=pt_BR
APP_FAKER_LOCALE=pt_BR

# Portas ÚNICAS por projeto (multi-stack na mesma máquina — R11)
APP_PORT=8080                    # nunca 80 compartilhado
FORWARD_DB_PORT=5433             # nunca 5432 compartilhado
FORWARD_REDIS_PORT=6380          # nunca 6379 compartilhado
VITE_PORT=5174                   # nunca 5173 compartilhado

# ==========================================
# 2. SEGURANÇA E SESSÃO
# ==========================================
APP_KEY=                         # php artisan key:generate
APP_PREVIOUS_KEYS=               # rotação sem perda de dados — ver R5
SESSION_DRIVER=redis             # MVP sem Redis: database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=false      # prod: true
SANCTUM_STATEFUL_DOMAINS=localhost

# --- R5 nível 2 · obrigatório se "Dados sensíveis: sim" ---
CIPHERSWEET_PROVIDER=string
CIPHERSWEET_KEY=                 # secret · dedicada aos campos sensíveis

# ==========================================
# 3. BANCO DE DADOS (POSTGRESQL)
# ==========================================
DB_CONNECTION=pgsql
DB_HOST=pgsql                    # Sail · prod: host do Dokploy
DB_PORT=5432
DB_DATABASE=app
DB_USERNAME=sail
DB_PASSWORD=password             # prod: secret do Dokploy

# ==========================================
# 4. REDIS, CACHE E FILAS
# ==========================================
# MVP sem Redis ainda? session/cache/queue aceitam driver
# database (zero infra extra); migrar para redis depois é 1 env
REDIS_CLIENT=phpredis
REDIS_HOST=redis                 # Sail
REDIS_PASSWORD=null              # prod: secret do Dokploy
REDIS_PORT=6379
CACHE_STORE=redis
QUEUE_CONNECTION=redis           # workers via Horizon

# ==========================================
# 5. TEMPO REAL (REVERB)
# ==========================================
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=               # secret
REVERB_HOST=localhost            # prod: ws.dominio.com.br
REVERB_PORT=8080                 # prod: 443
REVERB_SCHEME=http               # prod: https

# ==========================================
# 6. ARQUIVOS E MÍDIA
# ==========================================
FILESYSTEM_DISK=local            # prod: s3
AWS_ACCESS_KEY_ID=               # secret
AWS_SECRET_ACCESS_KEY=           # secret
AWS_DEFAULT_REGION=sa-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# ==========================================
# 7. E-MAIL
# ==========================================
MAIL_MAILER=log                  # prod: smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=                   # secret
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=nao-responder@dominio.com.br
MAIL_FROM_NAME="${APP_NAME}"

# ==========================================
# 8. OBSERVABILIDADE
# ==========================================
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=debug                  # prod: warning
SENTRY_LARAVEL_DSN=              # prod: obrigatório (R7)
SENTRY_TRACES_SAMPLE_RATE=0.2

# ==========================================
# 9. INTEGRAÇÕES DE TERCEIROS
# ==========================================
# Um bloco por serviço · prefixo do serviço · link da doc:
# https://developers.exemplo.com — credenciais no painel do serviço
EXEMPLO_CLIENT_ID=
EXEMPLO_CLIENT_SECRET=           # secret

# ==========================================
# 10. FRONTEND (VITE_ = PÚBLICO NO BROWSER)
# ==========================================
VITE_APP_NAME="${APP_NAME}"
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
# NUNCA colocar segredo com prefixo VITE_

# ==========================================
# 11. TUNING DA APLICAÇÃO
# ==========================================
# Knobs de negócio: default no config/, um bloco por domínio,
# sempre comentados. Não são segredos nem feature flags
# (flag = Pennant). Exemplos:
# AGENDA_JANELA_CANCELAMENTO_HORAS=24
# COBRANCA_DIAS_ANTES_VENCIMENTO=5
```

---

## PARTE 4 — POR QUE FUNCIONA

O isolamento real vem de três camadas que se completam:
**worktrees** separam os ARQUIVOS (duas sessões nunca disputam o
mesmo working tree), **branches git** separam o código (sessões
nunca se sobrescrevem no histórico) e os **arquivos de sessão**
separam o contexto (cada conversa conhece seu escopo e enxerga o
das outras — inclusive depois de uma compactação, porque o hook
reinjeta o combinado). O enforcement também tem camadas: hooks e
permissões agem no CLIENTE (antes de o modelo executar), pre-commit
avisa LOCAL e o CI EXIGE. ESTADO.md continua sendo a única fonte da
verdade consolidada — só recebe atualização no merge, então nunca
fica "meio atualizado" por uma sessão em andamento. Como tudo é
arquivo dentro do repo — docs, regras, skills, hooks, permissões —
o próprio protocolo é versionado: máquina nova ganha o ferramental
no clone, sem servidor, sem complexidade nova.

---

## PARTE 5 — ARQUITETURA DE REFERÊNCIA (MONOLITO MODULAR + DDD)

### A árvore anotada de um módulo

```
app/Modules/Financeiro/
├── Domain/
│   ├── Models/Cobranca.php                  # aggregate root — invariantes aqui
│   ├── ValueObjects/Money.php               # imutável, plugado via cast
│   ├── Enums/StatusCobranca.php
│   ├── Events/CobrancaPaga.php              # fato do negócio, nome no passado
│   ├── Exceptions/CobrancaJaPagaException.php
│   └── Services/ConciliadorService.php      # regra que cruza entidades do módulo
├── Application/
│   ├── Actions/GerarCobrancaDaReserva.php   # 1 caso de uso = 1 classe
│   ├── DTOs/CobrancaDto.php
│   └── Queries/ExtratoDaArenaQuery.php      # leitura otimizada, pode JOIN
├── Infrastructure/
│   ├── Adapters/WooviGateway.php            # mundo externo isolado aqui
│   ├── Listeners/GerarCobrancaAoConfirmarReserva.php
│   └── Jobs/ConciliarPagamentosJob.php
├── Presentation/
│   ├── Controllers/  Livewire/  Filament/  Requests/
│   └── routes.php
├── Contracts/
│   └── GerarCobranca.php                    # a ÚNICA porta p/ outros módulos
└── FinanceiroServiceProvider.php            # rotas, migrations, eventos, bindings
```

### Comunicação entre módulos — os dois únicos caminhos

```php
// 1) SÍNCRONO — quando o chamador precisa da resposta agora.
//    Agenda depende só do contrato, nunca do internals do Financeiro:
$cobranca = app(GerarCobranca::class)->paraReserva($reservaDto);

// 2) ASSÍNCRONO — quando é reação a um fato do negócio.
//    Agenda dispara o evento; Financeiro escuta e age:
ReservaConfirmada::dispatch($reservaId);
// → Financeiro/Infrastructure/Listeners/GerarCobrancaAoConfirmarReserva
```

### Fronteira executável (Pest arch — vai no CI, gate do R6)

```php
arch('domínio não conhece a camada de entrega')
    ->expect('App\Modules\*\Domain')
    ->not->toUse(['Illuminate\Http', 'Livewire', 'Filament']);

arch('módulos só se falam por contratos')
    ->expect('App\Modules\Agenda')
    ->not->toUse('App\Modules\Financeiro\Domain');
// gerar os pares módulo × módulo no F2 — um loop resolve
```

### Quando criar (ou dividir) um módulo

Três "sim" ao mesmo tempo: **linguagem própria** (o negócio usa termos
que só existem ali), **ciclo de vida próprio** (muda por motivos
diferentes dos vizinhos) e **candidato plausível a serviço** um dia.
Um "sim" só não basta — na dúvida, deixe dentro do módulo atual e anote
a suspeita em DECISOES.md. Dividir cedo demais custa mais caro que
dividir tarde.

### Por que este formato

O monolito modular entrega o que microserviço promete (fronteiras,
trabalho paralelo, extração futura) sem pagar o que microserviço cobra
(rede, deploy distribuído, consistência eventual obrigatória). O DDD
entra na dose pragmática: bounded contexts e invariantes fortes sim,
cerimônia de camada vazia não — Eloquent é a entidade, o banco é a
primeira linha dos invariantes (CHECK/UNIQUE/EXCLUDE), e o repositório
só nasce quando existem duas implementações reais. E o encaixe com o R9
é direto: escopos disjuntos de sessões paralelas viram simplesmente
"uma sessão = um módulo" — a arquitetura e o protocolo de trabalho
passam a desenhar a mesma fronteira.

---

## PARTE 6 — MATRIZ DE DECISÃO DA STACK (o que usar · o que NÃO usar)

A stack é fixa (Parte 1); o que muda por situação é a escolha dentro
dela. Esta tabela existe para não reabrir a mesma discussão em cada
projeto — e para deixar explícito o lado que costuma ficar implícito:
**o que NÃO usar**. Coluna "Regra" leva ao texto que governa.

| Situação                                           | USAR                                                       | NÃO usar                                                     | Regra         |
| -------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ | ------------- |
| UI web de gestão e painéis                         | Livewire 4 + Flux Pro                                      | SPA JS separada                                              | Stack         |
| Back-office / CRUD administrativo                  | Filament 5                                                 | tela Livewire na mão                                         | Stack · R10   |
| Offline real no celular                            | PWA/app sobre `/api/v1`                                    | Livewire (server-driven não faz offline)                     | Mobile        |
| Publicar em loja                                   | Capacitor sobre o app Livewire, ou nativo                  | PWA                                                          | Mobile        |
| Coluna de data-hora                                | `timestampTz()`                                            | `timestamp()` naive                                          | R13           |
| Data pura (vencimento, dia)                        | `DATE` + cast `date`                                       | timestamptz (vira "um dia antes")                            | R13           |
| Data-hora no browser                               | Temporal (com polyfill)                                    | `new Date` sem offset · aritmética com Date                  | R13           |
| Ligar/desligar funcionalidade                      | Pennant                                                    | variável no `.env`                                           | R11           |
| Knob de negócio (prazo, limite)                    | `config/` + env seção 11                                   | valor hardcoded no código                                    | R11           |
| Segredo                                            | secret do Dokploy · vazio no example                       | valor real no repo · prefixo `VITE_`                         | R11           |
| MVP sem infra extra                                | driver `database` p/ session/cache/queue                   | subir Redis antes de precisar                                | R11           |
| Fila em produção                                   | Redis + Horizon                                            | driver `sync`/`database`                                     | R7 · R15      |
| Busca/UNIQUE em campo sensível cifrado             | blind index (CipherSweet)                                  | coluna em claro paralela · `WHERE` no campo cifrado          | R5            |
| Um módulo precisa de outro                         | contrato em `Contracts/` ou evento de domínio              | importar `Domain/` do vizinho · escrever na tabela dele      | R10           |
| Persistência dentro do módulo                      | Eloquent como aggregate root                               | repositório genérico sobre Eloquent                          | R10           |
| Autenticação vs. perfil de negócio                 | `User` no módulo de identidade + aggregate no módulo dono  | lógica de domínio dentro do `User`                           | R10           |
| Logo, ícone e ilustração da UI                     | `resources/images/` via `Vite::asset()`                    | storage/S3 · caminho repetido em template                    | R14           |
| Favicon, ícones da PWA, og-image                   | `public/` (URL fixa)                                       | Vite (hash muda a URL)                                       | R14           |
| Upload de usuário (logo do tenant)                 | `storage/` + S3                                            | `resources/` ou `public/`                                    | R14           |
| Logo em e-mail transacional                        | PNG com URL absoluta                                       | SVG · asset com hash                                         | R14           |
| Índice em tabela grande em produção                | `CREATE INDEX CONCURRENTLY` (`$withinTransaction = false`) | `CREATE INDEX` comum                                         | R4            |
| Remover/renomear coluna                            | expand → migrate → contract em releases                    | drop no mesmo release que parou de usar                      | R4            |
| Mudou Dockerfile, nginx ou proxy                   | smoke do artefato pela imagem                              | `nginx -t` sozinho · confiar em CI verde de código           | R15           |
| Subir versão para produção                         | promover tag já validada em staging                        | rebuild no servidor · deploy automático direto               | R15           |
| Staging                                            | dados sintéticos                                           | cópia de dado real (LGPD art. 11)                            | R15           |
| Agente/MCP que lê banco                            | wrapper local read-only, usuário de RLS                    | apontar para staging/produção · segredo em config versionada | R19           |
| Regra que precisa valer SEMPRE                     | hook PreToolUse + deny em permissão versionada             | instrução no CLAUDE.md/skill (pedido, não garantia)          | R19           |
| Procedimento repetível (abrir/encerrar/checkpoint) | skill versionada (`/nome`)                                 | colar frase no chat · reler a base inteira                   | R19 · Parte 2 |
| Sessão paralela                                    | worktree próprio (`claude --worktree`)                     | segunda conversa no mesmo diretório                          | R9            |
| Investigação pesada / diagnóstico                  | subagente ou skill `context: fork` (Explore)               | ler dezenas de arquivos na conversa principal                | R21 · R9      |
| Conhecimento por área do código                    | `.claude/rules/` com `paths:`                              | inchar o CLAUDE.md                                           | R3            |
| Estado entre sessões e máquinas                    | `docs/` versionado                                         | auto memory como verdade                                     | R19 · R3      |
| Atualização de dependências                        | PRs Dependabot/Renovate pelos gates                        | `composer outdated` manual como única linha                  | R17           |
| Achado fora do escopo da sessão                    | briefing + P-xxx                                           | editar a base ou o projeto vizinho por conta própria         | R20 · R9      |
| Ferramenta apontou código sem uso                  | classificar A/B/C/D com evidência · gate no CI             | remover porque a ferramenta disse                            | R21           |
| Endpoint público que ninguém chama internamente    | depreciar com data                                         | remover (cliente instalado ainda usa)                        | R21 · R4      |
| Código atrás de flag não lançada ou de compat N-1  | manter                                                     | remover como morto (mata o rollback)                         | R21 · R4      |
| Duplicação detectada entre módulos                 | cada módulo dono da sua cópia (ou contrato)                | extrair para Shared e acoplar contextos                      | R21 · R10     |
| Mesma regra copiada DENTRO do módulo               | extrair na 3ª ocorrência, com teste + mutação              | abstração na 2ª (variação ainda desconhecida)                | R21           |
| Melhoria de código sem direção                     | hotspot: churn (git) × complexidade                        | retoque aleatório fora de hotspot                            | R21           |
| Vulnerabilidade de dependências                    | audit nativo + OSV-Scanner (2ª opinião)                    | confiar numa base única de advisories                        | R21 · R17     |
| Decisão cara de reverter                           | ADR imutável em decisions/ + linha no índice               | editar decisão antiga · deixar só no chat/commit             | R3            |
| Procedimento de operação sob pressão               | runbook com comando copiável e árvore de decisão           | how-to genérico · "reinicie o serviço"                       | R3            |
| Afirmar estado de algo externo                     | data + comando que verifica                                | "está ativo ✅"                                              | R3            |
| Mesmo fato em dois documentos                      | UMA fonte canônica; o resto linka                          | copiar o conteúdo                                            | R3            |
| Documento que deixou de valer                      | banner DEPRECIADO + remoção em 2 releases                  | apagar na hora · deixar mentindo                             | R3            |
| Onde a documentação mora                           | docs-as-code no repositório                                | wiki/Notion paralelo como fonte                              | R3            |
| Diff que muda comportamento                        | doc do gatilho no MESMO commit (mapa R3)                   | "documento depois" (depois não existe)                       | R3 · R6       |
| Diff que genuinamente não afeta doc                | trailer `Docs-n/a: <motivo>`                               | passar em silêncio pelo gate                                 | R3            |
| Doc difícil de manter fidedigna                    | apagar/gerar/ganhar gate de correspondência                | insistir na lista à mão                                      | R3 · R6       |

---

## PARTE 7 — VARREDURA UNIVERSAL (R21): MATRIZ POR ECOSSISTEMA, FERRAMENTAS E ARMADILHAS

Material de referência do R21. O R21 é o CONTRATO (fases e
julgamentos, 🌍); esta parte é o mapa de execução — que ferramenta
usar em cada ecossistema, as notas verificadas na doc oficial e as
armadilhas que custaram tempo real. A base padrão é Laravel (Parte 1),
mas projetos da casa existem em outras stacks — esta matriz cobre
todos com a mesma régua.

### Como ler (a regra da universalidade)

- 🌍 NÚCLEO — vale em qualquer linguagem: processo, critérios,
  métodos manuais. Se a ferramenta não existe no ecossistema, o
  método 🌍 SEMPRE existe — a capacidade nunca se pula; a falta vira
  achado ("ecossistema X sem detector maduro: método manual aplicado,
  reavaliar em N meses")
- 🧰 ECOSSISTEMA — ferramenta concreta, usada SÓ onde o ecossistema
  bate; ferramenta de ecossistema errado não é adaptável, é ruído.
  `multi` = cobre várias linguagens de uma vez (as mais valiosas)
- 🏗️ PROJETO — cada projeto preenche o seu: entry points, comando de
  bateria, URLs, tetos, armadilhas locais
- Linguagem fora da matriz (Go, Rust, Java, C#...): coluna 🌍 +
  pesquisar UMA equivalente nativa por capacidade na doc oficial do
  ecossistema e registrar no 🏗️ com data — a pesquisa é parte da
  primeira varredura, não pré-requisito
- Versões NUNCA fixadas aqui: última ESTÁVEL na data da varredura,
  conferida na doc oficial, registrada no DONE

### Matriz consolidada: capacidade × ecossistema

| Capacidade                        | 🌍 Qualquer linguagem                                    | PHP / Laravel                             | JS / TS / Node                         | Python                        |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------- | -------------------------------------- | ----------------------------- |
| Bateria única (V2)                | comando único versionado (make/tox)                      | `composer check`                          | `pnpm check`                           | `make check` / `tox`          |
| Morto: arquivos/exports/deps (V5) | método V5 + busca textual                                | shipmonk/dead-code-detector (PHPStan)     | **knip**                               | vulture (+ deadcode p/ --fix) |
| Morto: públicos/classes órfãs     | idem                                                     | unused-public + class-leak                | knip (exports)                         | vulture                       |
| Deps declaradas × usadas          | grep bidirecional import×manifest                        | shipmonk/composer-dependency-analyser     | knip                                   | deptry                        |
| Morto intra-arquivo               | leitura dirigida (V5)                                    | Rector DEAD_CODE (dry-run)                | ESLint/Biome                           | ruff                          |
| Duplicação tipos 1–3 (V6)         | **jscpd** (223+ formatos) ou lizard/CPD                  | jscpd                                     | jscpd                                  | jscpd                         |
| Duplicação tipo 4 (semântica)     | julgamento humano V6 + V7                                | idem                                      | idem                                   | idem                          |
| Complexidade / hotspot (V7)       | git churn + **lizard** (`-C` gate-ável)                  | + phpstan/phpmd                           | + ESLint `complexity`                  | + ruff C901                   |
| Vulnerabilidades de deps (V4)     | **OSV-Scanner** (11+ ecossistemas, containers, licenças) | + `composer audit`                        | + `pnpm audit`                         | + `pip-audit`                 |
| Revisão de segurança do diff (V7) | checklist V7 (± Semgrep OSS)                             | `/security-review`                        | idem                                   | idem                          |
| Mutação (prova de teste/gate)     | quebra manual de propósito                               | Infection (opcional, no diff)             | StrykerJS (opcional, no diff)          | mutmut (opcional, no diff)    |
| Doctor / saúde (V3)               | versões declaradas × instaladas                          | `php artisan about` + `composer validate` | doctor do framework (ex.: expo-doctor) | `pip check` + versões         |
| Cobertura comparada (V2)          | catraca: não cai entre varreduras                        | Pest `--coverage`                         | vitest/jest `--coverage`               | coverage.py                   |

Mutação automatizada é cara: quando adotada, roda sobre o DIFF ou o
módulo alvo, nunca o repo inteiro em todo CI; a prova manual por
mutação é a obrigação mínima e universal.

### Notas por ferramenta (verificadas na doc oficial em 05/08/2026 — reconferir a doc da versão do dia ao adotar)

- **knip** (🧰 JS/TS) — knip.dev: grafo a partir de entry points
  refinados por 150+ plugins de frameworks; monorepo de 1ª classe;
  modo `--production` acha código vivo só por causa de teste (o teste
  sai junto); `--fix` por tipo de item; a fórmula da própria doc:
  unused = projeto − (entry + resolvidos). Uso dinâmico se DECLARA na
  config com comentário — "esconder um resultado não é resolvê-lo"
- **shipmonk/dead-code-detector** (🧰 PHP) — extensão PHPStan: métodos,
  constantes, propriedades e enum cases sem uso; detecta CICLOS
  mortos (A usa B usa A, ninguém usa os dois); excluder de testes
  (equivale ao --production do knip); chamada mágica do projeto ganha
  um MemberUsageProvider próprio (a versão executável do "declarar o
  dinâmico"); remoção automática opcional
- **tomasvotruba/unused-public + class-leak** (🧰 PHP) — públicos sem
  uso com tolerância % para adoção gradual; `template_paths` cobre
  chamadas em Blade/Twig; class-leak acha classes inteiras órfãs
- **shipmonk/composer-dependency-analyser** (🧰 PHP) — sucessor
  moderno de composer-unused + composer-require-checker num passe só
  (deps sobrando E faltando)
- **vulture** (🧰 Python) — `--min-confidence` calibra,
  `--sort-by-size` prioriza, whitelist versionada p/ falsos
  positivos; limite honesto da própria doc: a natureza dinâmica do
  Python garante morto que a estática não vê e vivo-implícito que ela
  acusa — o veredito final é humano sobre a evidência
- **jscpd** (🧰 multi) — jscpd.dev: detector por token (Rabin-Karp)
  para 223+ formatos, binário nativo (motor Rust na v5), `--threshold`
  quebra o build acima do limite (é o gate de catraca do R6),
  reporters para CI (SARIF/JSON/HTML/badge) e autoria por git blame;
  calibrar min-tokens/min-lines para não acusar boilerplate
- **lizard** (🧰 multi) — complexidade ciclomática para 15+ linguagens
  (PHP, JS/TS, Python, Go, Rust, Java, C#...) sem build/headers;
  `-C <teto>` sai com código ≠ 0 (gate-ável), `-a` acusa excesso de
  parâmetros; respeita .gitignore; tem extensão de detecção de
  duplicado (fallback do jscpd)
- **OSV-Scanner** (🧰 multi) — Google: varre recursivamente
  manifests/lockfiles de 11+ ecossistemas (npm, composer, pip,
  cargo, go.mod...) contra a base OSV.dev; escaneia imagem de
  container e licenças; segunda opinião obrigatória da varredura
  (bases de advisories divergem)
- **/security-review** (🧰 Claude Code) — comando embutido oficial:
  cobre as MUDANÇAS da branch atual (injeção, XSS, authn/authz,
  dados inseguros) com nível de confiança por achado; repo inteiro:
  plugin oficial `security-guidance` (scan multi-agente profundo);
  contínuo: GitHub Action nos PRs; prompt customizável por projeto
  (o recorte 🏗️ entra aí)
- **Rector SetList::DEAD_CODE** (🧰 PHP) — em `--dry-run` na
  varredura (reporta padrões mortos intra-arquivo); a remoção entra
  pelos commits atômicos do V5, nunca pelo auto-fix direto

### Catracas da varredura (gates permanentes — leis do R6/v3.7)

Todo gate nascido da varredura: nomeia a regra no título · falha
vazia = falha · provado por mutação antes de entrar · entra
NÃO-bloqueante, calibra com o número real, só então bloqueia (o
caminho do gitleaks). Baseline é CATRACA: compara com o melhor número
já medido e só aceita igual ou melhor — a redução ativa é agenda
trimestral (R17), não pressão do CI diário.

| Gate                      | O que trava                                    | Ferramenta típica                         |
| ------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Morto não volta           | candidato novo classificável como A            | knip / dead-code-detector / vulture no CI |
| Duplicação não cresce     | % acima da baseline MEDIDA (não número mágico) | jscpd `--threshold`                       |
| Complexidade orçada       | função nova acima do teto 🏗️                   | lizard `-C` / linter nativo               |
| Cobertura não cai         | % abaixo da última varredura                   | flag de coverage da suíte                 |
| Vulnerabilidade conhecida | severidade ≥ política 🏗️                       | audit nativo + OSV-Scanner                |

### Armadilhas universais (🌍 — cada uma custou tempo real antes de virar regra)

1. **O sintoma aponta para o mensageiro; a verdade está no
   compilador.** Suíte E2E que "não sobe o servidor" raramente é o
   runner — rodar typecheck/compilação PRIMEIRO no diagnóstico de
   falha estranha. (Origem 🧰 JS/TS: crase em comentário dentro de
   template literal quebra o arquivo; o runner acusa "webServer não
   iniciou", quem dizia a verdade era o typecheck — 2× no mesmo dia)
2. **Config mora onde a versão ATUAL da ferramenta lê.** Gerenciadores
   mudam o local entre majors e ignoram o antigo em silêncio —
   conferir na doc da versão instalada, nunca no costume. (Origem:
   pnpm 11 ignora `pnpm.overrides` do package.json; override vive no
   pnpm-workspace.yaml)
3. **Prova de deploy é o ambiente mudado, não o job verde.** Digest
   da imagem no log + container recriado healthy — pipeline verde já
   conviveu com webhook mudo e com imagem puxada sem recriar container
4. **Smoke manual consome limites reais de produção** — o smoke
   automatizado usa conta/rota próprias e conhece os limites; login
   manual repetido na varredura pode se auto-bloquear e virar falso
   incidente
5. **Runtime se prova no artefato executado** — declaração de tipo,
   stub, interface e header MENTEM sobre valor de runtime; conferir
   no .js/.pyc/binário que roda, não no .d.ts/.pyi/assinatura
6. **Credencial reservada a terceiro é intocável** — saúde de
   produção se prova com a conta de prova dedicada do projeto

Armadilhas LOCAIS: cada projeto mantém a sua tabela em
docs/ARMADILHAS.md (Data · Armadilha · Sintoma enganoso · Verdade ·
Custou), citada pelo MAPA.md — armadilha local que vale para qualquer
projeto sobe para esta lista via briefing (R20).

### Formato do reporte final da varredura (🌍)

Tabela com UMA linha por ferramenta/passo executado (V1–V7):
| Fase.passo | Ferramenta (versão do dia) | Resultado MEDIDO | Δ vs varredura anterior | Ação |

Fechamento obrigatório (a conta do V8):

- Consertos aplicados (cada um com a prova: teste + mutação)
- P-xxx abertas (id + 1 linha + evidência)
- Recusas (sugestão + motivo escrito)
- Clones mantidos (local + motivo do julgamento V6)
- Números do dia comparados com a varredura anterior
- Gates novos instalados (ou "nenhum necessário")
  consertos + P-xxx + recusas = todos os achados — se a conta não
  fecha, a varredura não terminou.

### Fontes oficiais das ferramentas (verificadas em 05/08/2026)

knip.dev · jscpd.dev · google.github.io/osv-scanner · repositórios
oficiais de shipmonk/dead-code-detector, tomasvotruba/unused-public e
class-leak, shipmonk/composer-dependency-analyser, jendrikseipp/vulture,
terryyin/lizard · getrector.com/documentation · code.claude.com/docs e
support.claude.com (/security-review e security-guidance). Ao adotar
qualquer uma: reconferir a doc da versão do dia (princípio do R21).
