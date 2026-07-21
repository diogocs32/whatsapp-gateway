# 📘 DOCUMENTO UNIVERSAL DE PROJETOS — v3.2
### Laravel 13 · PHP 8.5 · Livewire 4 · Filament 5 · PostgreSQL 18 · Claude Code
**v2.0: Sessões Paralelas (R9) · v2.1: Monolito Modular + DDD (R10) · v2.2: MAPA.md (navegação) · v2.3: Protocolo de .env (R11) · v2.4: Criptografia em 2 níveis (R5) · v2.5: Gates de qualidade (R6), teste→go-live (R5), tuning (R11), Acessibilidade (R12) · v2.6: Tempo, fuso e relógio (R13) · v2.7: Assets estáticos e mídia (R14) · v2.8: Calibragem dos gates em produção (R6, R11, R13) · v3.0: Deploy de Excelência (R15), Hardening da imagem (R16), Cadência de auditorias (R17) e reforços R4/R6/R11 — lições de incidentes reais de produção · v3.1: Ciclo de vida da base — BASE_<NOME>.md e modos criação/adoção/upgrade (R18) · v3.2: Auditoria externa validada — CONCURRENTLY (R4), CSP nonce (R5), Rector fixado (R6), arquivamento de sessões (R9), identidade×domínio (R10), Temporal (R13), graceful shutdown (R15)**

---

## PARTE 1 — O PROMPT UNIVERSAL v3.2 (preencha e salve como `BASE_<NOME>.md` na raiz do projeto — ver R18)

```markdown
# BASE DO PROJETO — [NOME]
> Base universal: v3.1 · aplicada em [AAAA-MM-DD] · modo: [criação | adoção]
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
- Deploy: Dokploy (Docker Swarm) — seguir docs/how-to/preparar-ambiente-producao-dokploy.md
- Qualidade: Pest 4, PHPStan nível 9 (Larastan), Laravel Pint, Rector
- IA: Laravel Boost instalado (guidelines + MCP), Context7 disponível

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
+ Shared — kernel mínimo compartilhado
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
Nunca pule fases. Nunca execute comandos destrutivos sem confirmação.

### R2 — FASES DO PROJETO
F0 · Kickoff: criar documentação viva (R3), mapa de módulos (R10),
     registrar decisões iniciais
F1 · Ambiente: Sail up, .env e portas únicas conforme R11, APP_KEY,
     extensões PG (pg_trgm, unaccent), verificar PHP 8.5 / Composer /
     Node / Docker antes de qualquer código
F2 · Qualidade: Pest 4 + Larastan (nível 9) + Pint + Rector configurados,
     composer scripts (test, analyse, format, check), CI GitHub Actions,
     hook pre-commit rodando pint + phpstan; smoke test do artefato
     (R15) entra no CI assim que a imagem de produção nascer
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

### R3 — DOCUMENTAÇÃO VIVA (obrigatória, sempre atualizada)
Estrutura permanente em docs/:
- PROJETO.md — visão, escopo, regras de negócio (muda raramente)
- ESTADO.md — estado GLOBAL consolidado: fase atual, feito, próximos passos
- MAPA.md — guia de navegação das referências: o que significa cada
  sigla (F#, R#, D-xxx, US-xx...) e em qual arquivo/seção encontrá-la
- DECISOES.md — log append-only: data, decisão, motivo, alternativas
- ARQUITETURA.md — mapa de módulos, dependências permitidas e
  glossário da linguagem ubíqua (ver R10)
- AUDITORIAS.md — agenda viva de auditorias: cadência, dono,
  última execução e próxima (ver R17)
- SESSOES.md — painel de conversas paralelas (ver R9)
- sessions/ — um arquivo por sessão de trabalho (ver R9)
- BASE_<NOME>.md (raiz) — este documento preenchido: identidade do
  projeto, regras R1–R18 e versão da base aplicada (ver R18)
- CLAUDE.md (raiz) — instruções para o Claude Code: aponta
  BASE_<NOME>.md como fonte das regras; stack, convenções,
  comandos, o que NUNCA fazer, e a ordem de leitura obrigatória:
  1º ESTADO.md → 2º SESSOES.md → 3º arquivo da própria sessão
- README.md — versão no topo, quick start, badges de CI
- CHANGELOG.md — Keep a Changelog, SemVer
REGRA: código sem documentação atualizada = fase incompleta.

### R4 — VERSIONAMENTO (código + banco + API)
Código:
- SemVer + tags git a cada release
- Conventional Commits (feat:, fix:, docs:, refactor:, test:, chore:)
- main protegida; TODO trabalho em branches feature/* (base do R9)
Banco de dados:
- Migrations = versionamento do schema:
  · NUNCA editar migration já aplicada · forward-only: correção = nova migration
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
- Exibição mascarada por padrão (ex.: CPF ***.***.***-XX); decifrar
  só com necessidade real + trilha de auditoria (activitylog)
Runbook único das chaves em docs/how-to/rotacao-de-chaves.md
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
- docs/how-to/CHECKLIST-virada-teste-para-real.md 100% verde antes
  do primeiro usuário real (inclui relógio/NTP do servidor — R13)

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
- Documentação viva com índice/links (R3): gate de integridade no
  CI — índice regenerado + zero links quebrados; docs auditada 1×
  e nunca mais é foto velha

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
- Toda referência curta citada (F3, R5, D-012, US-07...) deve ser
  localizável via MAPA.md; criou um tipo novo de referência =
  registrar no MAPA.md na hora. Na dúvida, cite completo:
  "arquivo § seção" (ex.: "ver BASE_<NOME>.md § R5")

### R9 — PROTOCOLO DE SESSÕES PARALELAS (múltiplas conversas)
Permite várias conversas simultâneas no mesmo projeto sem conflito.

ABERTURA (obrigatório em TODA conversa, antes de qualquer trabalho):
1. Ler docs/ESTADO.md (estado global)
2. Ler docs/SESSOES.md (o que as outras conversas estão fazendo AGORA)
3. Criar docs/sessions/ATIVA-[AAAA-MM-DD-HHMM]-[slug].md com:
   objetivo, escopo de arquivos/pastas, fora-do-escopo, branch, status 🟢
4. Adicionar linha na tabela "Sessões ativas" de SESSOES.md
5. Criar branch própria: feature/[slug]

ISOLAMENTO:
- Cada sessão trabalha SÓ na sua branch — nunca na main
- Escopos de sessões ativas devem ser DISJUNTOS
  (ex.: A = módulo pagamentos · B = documentação · C = testes E2E)
- Se um arquivo necessário está no escopo de outra sessão ativa:
  PARAR, avisar o usuário e propor alternativa
- ESTADO.md global NÃO é editado no meio da sessão — só no encerramento

DURANTE:
- A cada checkpoint, atualizar o arquivo da sessão:
  progresso datado, arquivos alterados, próximo passo
  (assim outra conversa — ou eu — vê em tempo real o que está rodando)

ENCERRAMENTO:
1. Preencher bloco "Encerramento" do arquivo da sessão:
   entregue, commits, pendências · status ✅ CONCLUÍDA
2. Renomear ATIVA-... → DONE-...
3. Mover a linha em SESSOES.md de "Ativas" para "Histórico";
   Histórico acima de 15 linhas → mover as mais antigas para
   docs/SESSOES_ARQUIVO.md (higiene de contexto da IA)
4. Merge da branch (ou PR) e SÓ ENTÃO atualizar ESTADO.md global
5. Emitir checkpoint final com a frase de retomada

SESSÃO INTERROMPIDA (conversa fechada sem concluir):
- O registro permanece 🟢 em SESSOES.md
- Retomar: "Leia docs/sessions/ATIVA-[id].md e continue essa sessão"
- Descartar: marcar ⚠️ ABANDONADA com motivo e liberar o escopo

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
  1) contrato público em <Modulo>/Contracts/ + DTOs (síncrono)
  2) evento de domínio + listener no módulo consumidor (assíncrono)
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
- Terceiros: um bloco por serviço, prefixo do serviço (WOOVI_*,
  VIDAAS_*...), comentário com link da doc e onde obter credenciais
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
  docs/how-to/rotacao-de-chaves.md
Convenções:
- Booleans minúsculos (true/false) · aspas só com espaço/especial
- Valor local (Sail) como default no example; produção difere?
  comentar na linha: `# prod: <valor>`
- Multi-projeto na mesma máquina: portas do docker-compose
  parametrizadas por env com defaults ÚNICOS por projeto
  (APP_PORT, FORWARD_DB_PORT, FORWARD_REDIS_PORT, VITE_PORT...) —
  duas stacks não brigam por 80/5432/6379/5173; overrides locais
  em compose.override.yaml FORA do versionamento (exclude local)
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
  + teste manual com leitor de tela antes do go-live
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
   A MESMA imagem; rebuild em servidor é PROIBIDO
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
  scanning · integridade de docs (R6)
- MENSAL: revisão de dependências desatualizadas (composer outdated)
- TRIMESTRAL: auditoria de índices e queries lentas do banco ·
  redução da baseline de análise estática (R6) · TESTE DE RESTORE
  do backup (R5) · ENSAIO de rollback (R15)
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
   documentação viva do R3 nasce organizada no primeiro dia
4. Seguir R1 daí em diante — uma fase por vez, checkpoint, OK

MODO ADOÇÃO (código existe, BASE_*.md não existe):
1. LER antes de mexer: inventário da realidade — stack e versões
   reais, estrutura, testes, CI, deploy atual, docs existentes
2. Criar BASE_<NOME>.md preenchendo o topo com o que o projeto É
   hoje (não com o desejo) · marcar "modo: adoção"
3. DIAGNÓSTICO R1–R17 em docs/ADOCAO.md: tabela regra × status —
   ✅ conforme · 🟡 parcial · 🔴 ausente · ➖ não se aplica —
   cada linha com a evidência (arquivo/config que prova)
4. PLANO DE ADOÇÃO no mesmo docs/ADOCAO.md, em ondas pequenas,
   priorizado por risco: 1º rede de proteção (backup R5; deploy e
   rollback R15/R16 se está em produção) · 2º estancar débito novo
   (gates R6 + contrato R11) · 3º demais regras por risco/valor
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
   coluna tz do R13...) vira item de plano — cada um como
   sessão (R9)
4. Bump da linha de versão no topo do BASE + registro em
   DECISOES.md ("D-xxx: upgrade da base vX.Y → vZ.W, deltas: ...")
REGRA: upgrade NUNCA reescreve o preenchimento do projeto —
só regras, templates e convenções.

### TEMPLATE DE CHECKPOINT (emitir ao fim de cada fase)
✅ CHECKPOINT — FASE [X] · SESSÃO [id]
O QUE FOI FEITO: [lista objetiva]
ARQUIVOS CRIADOS/ALTERADOS: [caminhos]
PACOTES ADICIONADOS: [nome + versão + motivo]
DECISÕES REGISTRADAS: [refs no DECISOES.md]
COMANDOS PARA VALIDAR: [ex.: composer check]
CLASSE DE ERRO INTRODUZÍVEL E GATE QUE A CAPTURA: [obrigatório —
se nenhum gate existente captura, criar o gate ANTES de prosseguir]
SESSÃO ATUALIZADA: sim · ESTADO.md: [sim, se encerramento]
PARA CONTINUAR EM NOVA CONVERSA:
"Leia docs/ESTADO.md e docs/SESSOES.md e continue da fase [X+1]"
```

---

## PARTE 2 — FRASES PRONTAS PARA MÚLTIPLAS CONVERSAS

**Entrar num projeto — 1ª conversa (protocolo do R18):**
> Projeto novo: "Base universal em anexo. Não existe código —
> execute o MODO CRIAÇÃO do R18 para: [ideia em 1 linha]."
>
> Projeto existente sem o padrão: "Base universal em anexo. O projeto
> já existe e não tem BASE_*.md — execute o MODO ADOÇÃO do R18."
>
> Atualizar a base: "Base universal v3.1 em anexo. O projeto está na
> base vX.Y — execute o MODO UPGRADE do R18."

**Abrir conversa paralela (2ª, 3ª...):**
> "Leia docs/ESTADO.md e docs/SESSOES.md. Inicie uma SESSÃO PARALELA
> conforme R9 com escopo: [ex.: escrever testes do módulo X].
> Não toque em arquivos de sessões ativas."

**Retomar sessão interrompida:**
> "Leia docs/sessions/ATIVA-[id].md e continue exatamente de onde parou."

**Encerrar a sessão atual:**
> "Encerre esta sessão conforme R9 e emita o checkpoint final."

**Ver o panorama geral (em qualquer conversa):**
> "Leia docs/SESSOES.md e me diga o que cada sessão está fazendo agora."

---

## PARTE 3 — TEMPLATES DOS ARQUIVOS

### `docs/SESSOES.md`

```markdown
# 🔀 SESSÕES DE TRABALHO — [Projeto]
> Painel de conversas paralelas. Toda sessão se registra aqui ao abrir.

## 🟢 Sessões ativas
| ID | Início | Objetivo | Escopo | Branch |
|----|--------|----------|--------|--------|
| 2026-07-10-1430-pix | 10/07 14:30 | Integração Pix | app/Services/Payments/ | feature/pix |

## ✅ Histórico (mais recente primeiro)
| ID | Período | Entregue | Branch/PR |
|----|---------|----------|-----------|
```

### `docs/sessions/ATIVA-[id].md`

```markdown
# Sessão: [slug]
- **Status:** 🟢 ATIVA
- **Início:** [data hora]
- **Objetivo:** [o que ESTA conversa vai entregar]
- **Escopo (pode tocar):** [pastas/arquivos]
- **Fora do escopo (não tocar):** [pastas/arquivos]
- **Branch:** feature/[slug]

## Progresso
- [10/07 14:45] PixService criado — 8 testes passando
- [10/07 15:10] Webhook de confirmação implementado

## Encerramento (preencher ao concluir)
- **Fim:** — · **Entregue:** — · **Commits:** —
- **Pendências para próxima sessão:** —
```

### `docs/ARQUITETURA.md`

```markdown
# 🧱 ARQUITETURA — [Projeto]
> Monolito modular + DDD pragmático (R10). Documento vivo.

## Mapa de módulos
| Módulo | Responsabilidade | Tabelas donas | Expõe (Contracts) | Consome |
|---|---|---|---|---|
| Financeiro | ledger, cobranças, conciliação | ledger_*, cobrancas | GerarCobranca | eventos da Agenda |

## Regras de dependência
- Permitido: Presentation → Application → Domain · qualquer camada → Shared
- Proibido: Domain → HTTP/Livewire/Filament · módulo → internals de outro

## Linguagem ubíqua (glossário)
| Termo | Significado no domínio |
|---|---|
|  |  |

## Decisões de fronteira
- [D-xxx] [resumo — detalhes no DECISOES.md]
```

### `docs/MAPA.md`

```markdown
# 🧭 MAPA — [Projeto]
> Guia de navegação das referências. Toda sigla usada no projeto
> tem entrada aqui. Referência sem entrada no MAPA = referência inválida.

## Legenda de siglas
| Sigla | O que é | Onde encontrar |
|---|---|---|
| F0–F8 | Fases do roadmap | BASE_<NOME>.md § R2 · status atual em ESTADO.md |
| R1–R18 | Regras de execução | BASE_<NOME>.md § REGRAS DE EXECUÇÃO |
| vX.Y (base) | Versão da base universal aplicada | topo do BASE_<NOME>.md |
| D-xxx | Decisão registrada | DECISOES.md (buscar pelo código) |
| US-xx | User story | PROJETO.md § user stories |
| ATIVA-/DONE-[id] | Sessão de trabalho | docs/sessions/ · painel em SESSOES.md |
| CP F[x] | Checkpoint da fase x | arquivo da sessão · consolidado em ESTADO.md |

## Quero... → abro...
| Preciso de | Arquivo |
|---|---|
| O que fazer agora / onde parei | ESTADO.md |
| Por que algo foi decidido | DECISOES.md |
| Quem está mexendo em quê agora | SESSOES.md |
| Base aplicada, regras, stack e fases | BASE_<NOME>.md (raiz) |
| Fronteiras de módulos e glossário | ARQUITETURA.md |
| Regras de negócio e user stories | PROJETO.md |
| Como rodar / instalar | README.md |
| Histórico de versões | CHANGELOG.md |
| Agenda de auditorias | AUDITORIAS.md |
| Diagnóstico e plano de adoção | ADOCAO.md (temporário — R18) |
| Runbooks e passo-a-passo | docs/how-to/ |

## Convenção de citação
Sigla resolve? Use a sigla. Não resolve? Cite completo:
"arquivo § seção" — ex.: "ver BASE_<NOME>.md § R5".
```

### `docs/AUDITORIAS.md`

```markdown
# 🔎 AUDITORIAS — [Projeto]
> Agenda viva (R17). Auditoria sem agenda = auditoria morta.

| Auditoria | Cadência | Dono | Última | Próxima |
|---|---|---|---|---|
| composer/npm audit · secrets · docs | todo CI | CI | automático | automático |
| Dependências desatualizadas | mensal | — | — | — |
| Índices e queries lentas do banco | trimestral | — | — | — |
| Redução da baseline estática | trimestral | — | — | — |
| Teste de restore do backup | trimestral | — | — | — |
| Ensaio de rollback (R15) | trimestral | — | — | — |
| Compliance de versão do framework | a cada major | — | — | — |
| Campos sensíveis × criptografia* | semestral | — | — | — |

*obrigatória se o CONTEXTO marcar "Dados sensíveis: sim"
```

### `docs/ADOCAO.md` (temporário — só no modo adoção do R18)

```markdown
# 🚧 ADOÇÃO DO PADRÃO — [Projeto]
> Diagnóstico + plano de ondas (R18 · modo adoção). Arquivar quando
> o diagnóstico estiver 100% ✅/➖ e registrar em DECISOES.md.

## Diagnóstico R1–R17
| Regra | Status | Evidência | Onda |
|---|---|---|---|
| R5 Segurança | 🔴 | sem backup automatizado | 1 |
| R6 Qualidade | 🟡 | pint ok; sem phpstan nem CI | 2 |

Legenda: ✅ conforme · 🟡 parcial · 🔴 ausente · ➖ não se aplica

## Ondas (prioridade por risco — ver R18)
| Onda | Escopo | Sessão/branch | Status |
|---|---|---|---|
| 1 | Backup (R5) + rollback (R15) | feature/adocao-onda-1 | 🟢 |
| 2 | Gates R6 + contrato R11 | — | pendente |
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

O isolamento real vem de duas camadas já existentes no fluxo:
**branches git** separam o código (sessões nunca se sobrescrevem) e os
**arquivos de sessão** separam o contexto (cada conversa conhece seu
escopo e enxerga o das outras). ESTADO.md continua sendo a única fonte
da verdade consolidada — só recebe atualização no merge, então nunca
fica "meio atualizado" por uma sessão em andamento. Como tudo é arquivo
dentro do repo, o próprio protocolo é versionado: sem ferramenta extra,
sem servidor, sem complexidade nova.

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
