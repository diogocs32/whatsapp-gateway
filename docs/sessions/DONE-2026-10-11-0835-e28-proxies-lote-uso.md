# Sessão: e28-proxies-lote-uso

- **Status:** ✅ DONE — E28/P-107 (Onda 9, produto) em código; PR/CI/merge ao fim no PR desta feature; sem deploy.
- **Início:** 11/10/2026 08:35 BRT.
- **Objetivo:** P-107 — (1) excluir vários proxies de uma vez (marcar + uma confirmação só);
  (2) no seletor de proxy da sessão já criada, verde = livre e vermelho = já em uso, com quantas
  sessões usam cada proxy, sem impedir o uso compartilhado; (3) o mesmo no formulário "Nova sessão".
- **Pedido literal do dono (11/10):** "crie uma opção de marcar os proxis que quero excluir, pois
  quando tenho que excluir varios excluir e confirmar um por um demora muito. quando o a sessão já foi
  criada e eu quero adicionar um proxy ao clicar no prox deixe verde o que não esta sendo usado e
  vermelho se já esta sendo usado, não me limita de usar em outra sessão e aparece quantas sessões
  estão utilizando aquele proxy. na frente faça o mesmo na criação, aparece em vermelho e quantas
  sessões estão usando aquele proxy."
- **Escopo:** módulo `proxies` (uso por proxy no `GET /api/proxies`, rota aditiva
  `POST /api/proxies/bulk-delete`, opt-in `allowSharedProxy` no PUT SINGLE), `sessions.controller.ts`
  (create com `allowSharedProxy`), `sessions/interface/dto.ts`, `packages/contracts`, painel
  (`routes/Proxies.tsx`, `routes/Sessions.tsx`, `lib/api.ts`, `lib/proxy-suggestion.ts`, lib pura nova
  `lib/proxy-usage.ts`, componente novo `components/proxies/ProxyPicker.tsx`), testes, docs R9 e PR.
  Ponto global: `packages/contracts`. Sem migration.
- **Fora do escopo:** `GET /api/proxies/available` e `GET /api/proxies/suggestion` (semântica
  preservada), runtime do `ProxyResolver`, RANGE/GLOBAL, node n8n (P-003), exclusão unitária (o botão
  "Excluir" da linha continua igual), deploy.
- **Branch:** `feature/onda9-e28-proxies-lote-uso`, criada da `origin/main=b9b4eb1` (merge do PR #44).

## ECO DE LEITURA (R9 v4.3)

- **ESTADO:** E21/P-106 braces triada (PR #44 mergeado em `b9b4eb1`); produção no último SHA
  **documentado** `768fb26`, sem consulta ao vivo; deploys C/D/E/F/W/B/G e B-004/B-005/B-007
  manuais pendentes com o dono; auto-deploy desligado (D-027).
- **SESSOES:** única ativa alheia é `lid-envio-wwebjs` (engine WWEBJS — disjunta desta). Avisos a
  preservar: E26/D-038 (linhas órfãs carimbadas são registro intencional; formulário "Nova sessão"
  deriva a escolha — "o que se vê é o que se envia"; Enter segura até a sugestão), E15/D-041 (PUT
  SINGLE validado e serializado por `FOR UPDATE`; GET/PUT resolvem nome vivo, P-097), E27 (lock de
  ciclo de vida; filtro P-089 no `Sessions.tsx`), E4 (rota resolvida), D-018 (fronteiras no CI).
- **PENDENCIAS:** crio **P-107** (este pedido). Relacionadas: P-003 (node n8n com `proxyId`, aberta —
  não muda aqui), P-084 ✅ (E26), P-097 ✅ (E15). B-001 (1 IP residencial por sessão) é a política
  operacional atual: o compartilhamento passa a ser escolha explícita do dono, sinalizada em vermelho.
- **ROTEIRO:** E28 nova na Onda 9 (produto), mesma lógica de E26/E27 (pedido do dono, 1 chat, PR
  próprio, merge ao fim após CI verde, deploy manual depois).
- **D-008/D-041:** exclusividade do SINGLE checada na aplicação (`ensureAvailable` + revalidação sob
  lock no repositório); RANGE/GLOBAL já compartilham o pool; "em uso" = `currentProxyId` de atribuição
  `mode ≠ NONE` de sessão viva (órfãs não contam).

## Achados da leitura do código (11/10, antes de mexer)

- Exclusão hoje: só `DELETE /api/proxies/:id`, um por vez, com `confirm()` nativo por linha
  (`Proxies.tsx:415-423`). `proxies` não tem FK com `session_proxy_assignments` (schema
  `Proxy`/`SessionProxyAssignment`): apagar proxy deixa `currentProxyId` pendurado → SINGLE falha ao
  conectar (`proxy-resolver.service.ts:43-53`, E15) e RANGE/GLOBAL escolhem outro.
- Sessão existente: o seletor fica em **Proxies → Atribuição por sessão** (`AssignmentRow`,
  `<select>` nativo com TODOS os proxies, sem indicar uso, `Proxies.tsx:568-583`); proxy de outra
  sessão volta 400 "Proxy já está em uso por outra sessão" (`proxy.service.ts:238-254` e revalidação
  `prisma-proxy.repository.ts:208-236`).
- Criação: `Sessions.tsx:668-689` lista só `GET /proxies/available` (livres), via `suggestionView`
  (`lib/proxy-suggestion.ts`, E26). O POST revalida (`sessions.controller.ts:126-152`).
- `<option>` nativo não tem cor confiável no Chrome/Safari do macOS → o seletor colorido precisa ser
  componente próprio (padrão APG "select-only combobox"); o painel já tem padrão APG em
  `components/chat/MessageMenu.tsx` (portal no body, posição fixa, fecha em clique fora/rolagem).

## Desenho (decisão em D-051)

- **API (aditiva):** `GET /api/proxies` ganha `sessionCount` e `sessions[{id,name}]` por item (mesma
  régua do "em uso"); `POST /api/proxies/bulk-delete {ids}` → `{deleted, notFound}`;
  `allowSharedProxy?: boolean` no `PUT /api/sessions/:id/proxy` e no `POST /api/sessions`. Sem o
  campo (ou `false`), a exclusividade D-008/D-041 continua igual (400 "em uso") — o contrato publicado
  não muda para quem já integra. Com `true`, SINGLE aceita proxy usado por outra sessão; continua
  exigindo proxy existente, habilitado e não-DEAD, sob o mesmo `FOR UPDATE`.
- **Painel:** checkbox por proxy + "marcar todos" + barra "N selecionados · Excluir selecionados" com
  UMA confirmação na própria página (lista os que estão em uso e o efeito nas sessões); coluna
  "Sessões" no pool; `ProxyPicker` (verde livre / vermelho em uso + "em uso por N sessões", nomes no
  title) no `AssignmentRow` e no "Nova sessão". O painel só manda `allowSharedProxy: true` quando o
  dono escolheu um proxy que estava VERMELHO na tela — corrida "estava verde, outra sessão pegou"
  continua voltando 400 e a lista recarrega (o que se vê é o que se envia).

## Fontes conferidas (documentation-first)

- Versões instaladas: React/ReactDOM 19.3.0 e Tailwind 4.3.3 (painel), zod 3.25.76 e Prisma/client
  7.10.0 (gateway), puppeteer(-core) 24.38.0 — `npm ls`/`require.resolve` em 11/10.
- Prisma 7.10 instalado: `deleteMany` → `PrismaPromise<BatchPayload>` (`{count}`), sem variante que
  devolva linhas (`src/generated/prisma/models/Proxy.ts:956`; `BatchPayload` em
  `internal/prismaNamespace.ts:3144`); `Prisma.join` exportado (`prismaNamespace.ts:52`) e já usado
  em `prisma-refresh-token.repository.ts:141`; Context7 `/prisma/web` (IN-list com `Prisma.join`).
- zod 3.25.76: `RawCreateParams.message` (`apps/gateway/node_modules/zod/v3/types.d.ts:26-32`).
- React 19: ref como prop, `forwardRef` desnecessário (Context7 `/websites/react_dev_reference`,
  react.dev/reference/react/forwardRef).
- WAI-ARIA APG select-only combobox (teclado e papéis) —
  https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/ (11/10).
- MDN `<option>` "Styling with CSS": estilo legado "depends on the browser and operating system" —
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/option (11/10).
- Tailwind 4: `w-<number>` = `calc(var(--spacing) * <number>)` (espelho local
  `~/dioggo-agents/agentes/docs/tailwind/4/width.mdx:31`); cores `red-300/400` e `emerald-300/400` em
  `node_modules/tailwindcss/theme.css:13-14,85-86` (o harness confere o oklch exato).
- PostgreSQL 18: `SELECT … ORDER BY … FOR UPDATE` trava na ordem do resultado (mesmo padrão do
  `FOR UPDATE` do PUT SINGLE da E15/D-041).

## Progresso

- 08:35 — leitura R9 (ESTADO, SESSOES completo, PENDENCIAS B-xxx + proxies, ROTEIRO regras/quadro,
  DECISOES D-008/D-038/D-041, MAPA-CODIGO proxies, INTEGRACAO §11); branch da `origin/main=b9b4eb1`;
  não rastreados preexistentes (`.codex/`, `AGENTS.md`, `seed-mock*`) preservados.
- 08:45 — gateway: domínio `proxy-usage.ts` (régua única do "em uso"), repositório (`proxyUsage`,
  `deleteMany` com `FOR UPDATE` ordenado, `setAssignment` com `allowShared`), serviço
  (`listWithUsage`, `removeMany`, `ensureAvailable`/`assignSingle`/`setAssignment` com opt-in), rota
  `POST /api/proxies/bulk-delete`, `GET /api/proxies` com uso, `allowSharedProxy` no PUT e no create;
  contracts aditivos. 31 unit novos verdes.
- 08:47 — e2e `test/proxies-lote-uso.e2e-spec.ts` (Postgres/Redis locais, banco em dia — 35
  migrations): 23/23 verdes (uso, opt-in nos dois corpos, `false` = ausente, DEAD/desabilitado, PUT
  por nome vivo, régua RANGE/NONE/órfã, 401/403/400, lote com repetidos/inexistentes/200,
  atribuição pendurada e PUT no apagado → 400).
- 08:55 — painel: `lib/proxy-usage.ts` (+33), `components/proxies/ProxyPicker.tsx`, `Proxies.tsx`
  (seleção, confirmação única inline, coluna Sessões, seletor por sessão), `Sessions.tsx` +
  `lib/proxy-suggestion.ts` (lista selecionável, consentimento no clique/espera), `lib/api.ts`.
- 09:04 — validação completa: lint/format (só os `seed-mock` preexistentes), depcruise, tsc
  gateway/contracts/painel, `npm run test` = gateway 1955/1955 (121 arquivos, unit+e2e) + painel
  329/329; builds dos dois apps; `mapa-codigo` regenerado e `--check` em dia.
- 09:10 — harness visual (Chrome do Mac headless via puppeteer-core + gateway FALSO local no
  scratchpad, sem login/credencial/produção): 37/37 verificações (cores oklch exatas, foco/teclado
  APG, um só POST de lote, corpos com/sem `allowSharedProxy`). Achados e corrigidos: (1) o clique
  sintético do puppeteer rola a página e fecha a lista — artefato do teste (por teclado/toque a lista
  fica aberta), mas o `scrollIntoView` foi trocado por rolagem só da lista (padrão APG) porque em
  tela baixa ele rolaria a página; (2) rótulo truncado → seletor 26rem; (3) em 390px o item flex não
  encolhia (layout 457px) → largura no contêiner + `w-full`, sem rolagem horizontal; (4) aviso de
  compartilhado em presente na sessão já salva ("esta sessão sai pelo mesmo IP"); (5) painel novo +
  gateway velho quebraria (`sessions` ausente) → lib tolera e trata como livre (teste).
- 09:15 — revisão independente do diff (2 revisores céticos em paralelo, só leitura; o do gateway
  rodou e2e de rascunho fora do repo provocando as corridas). **Procedentes e corrigidos:**
  - **Painel, alto:** o consentimento de compartilhar era a cor NA HORA DE SALVAR — duas linhas
    escolhendo o mesmo verde, salvar a 1ª deixava a 2ª vermelha e o "Salvar" compartilhava; a
    pré-seleção da sugestão E26 (resposta velha) podia compartilhar sem toque. Agora o consentimento
    é registrado NO CLIQUE da opção (`onChange(id, opção)` → `consentFromPick`/`shareFromConsent`);
    pré-seleção, valor herdado e "Usar este proxy" nunca contam; `suggestionView` não pré-seleciona
    um sugerido que a lista (mais nova) mostra em uso; o 400 "em uso" ganha a dica de reescolher.
  - **Gateway, médio:** depois de compartilhado, repetir o PRÓPRIO SINGLE sem a flag dava 400
    (contrato "repetir o próprio proxy é permitido"). Agora `liveSinglePin` dispensa a checagem de dono
    para o mesmo pin de sessão viva, no serviço e de novo sob o lock.
  - **Gateway, baixos:** uso do aviso do lote lido fora da transação (um PUT que gravou segurando o lock
    sumia do WARN) → lido dentro, depois do `FOR UPDATE`; `proxyUsage` com duas leituras → uma consulta
    com `JOIN`; byte NUL em `ids` dava 500 → regex de id (400).
  - **Painel, médio/baixos:** gateway antigo mostrava "livre" falso → tom `unknown` ("uso
    indisponível") e criação recua para `/proxies/available`; confirmação do lote reaparecia sozinha →
    caixas travadas durante a confirmação + reset; clique na margem da lista roubava o foco →
    `preventDefault` no contêiner; rolagem encadeada fechava a lista → `overscroll-contain`; foco
    perdido em erro/sem proxies → Cancelar / contagem do pool; resposta velha sobrescrevia a nova →
    sequência das cargas; clicar no rótulo foca o seletor; teclado extraído para `lib/combobox-keys.ts`
    (testado no CI).
  - **Fora do escopo, registrado:** P-108 (`proxyId` com NUL → 500 no PUT, anterior à E28; sonda
    e2e temporária confirmou PUT=500 e POST=400 com mensagem crua do banco; arquivo removido).
  - **Não aplicado:** busca por digitação no seletor (APG opcional) — documentado em `combobox-keys.ts`.
- 09:40 — provas pós-revisão: gateway e2e do arquivo 29/29 (novos: próprio SINGLE dividido, RANGE→
  SINGLE exige flag, RANGE/GLOBAL ignoram flag, flag inválida no POST, NUL/espaço → 400, lote esperando
  um lock segurado por transação manual com o WARN enxergando a atribuição gravada); **4 mutações
  recusadas** (sem `FOR UPDATE`; sem próprio pin no serviço; sem próprio pin sob o lock; sem regex);
  painel 351/351; harness 1 37/37 (regressão), harness 2 12/12 (duas linhas com o mesmo verde,
  sugestão velha em uso, caixas travadas, margem da lista, rótulo), gateway antigo 3/3, 390px sem
  rolagem horizontal.
- 09:47 — revalidação final: `npm run test` = gateway **1966/1966** (121 arquivos, unit+e2e) + painel
  **351/351** (16 arquivos); lint/format só acusam os `seed-mock` não versionados pré-existentes;
  depcruise sem violação; tsc gateway/contracts/painel; builds dos dois apps; `mapa-codigo --check`
  em dia; banco de dev sem sobras do e2e (consulta só-leitura).

## Encerramento e checkpoint R9

- **Resultado para quem não participou:** na tela **Proxies**, cada proxy tem uma caixa de marcar
  (+ "marcar todos") e uma barra "N selecionados · Excluir selecionados"; a exclusão pede **uma**
  confirmação na própria página, que diz quais estão em uso e por quais sessões. A coluna **Sessões**
  mostra "livre" ou "em uso por N sessões" com os nomes. Os seletores de proxy fixo — da sessão já
  criada (Proxies → Atribuição por sessão) e do "Nova sessão" — pintam **verde** o livre e
  **vermelho** o já usado, com "em uso por N sessões" (na sessão existente: "N outras sessões" e "só
  esta sessão" para o próprio), sem bloquear: escolher um vermelho compartilha o IP, com aviso âmbar
  de com quem. O gateway só compartilha com `allowSharedProxy: true`, que o painel manda apenas
  quando o dono **escolheu** um vermelho naquela hora.
- **Arquivos criados/alterados:** gateway — `proxies/domain/proxy-usage.ts` (+spec),
  `proxies/domain/proxy.repository.ts`, `proxies/infrastructure/prisma-proxy.repository.ts`,
  `proxies/application/proxy.service.ts` (+`proxy.service.usage.spec.ts`),
  `proxies/interface/{dto,proxies.controller}.ts`, `sessions/interface/{dto,sessions.controller}.ts`,
  `sessions/interface/sessions-license.spec.ts`, e2e `test/proxies-lote-uso.e2e-spec.ts`; contracts —
  `ProxySessionRefDto`, `ProxyListItemDto`, `BulkDeleteProxies*`, `allowSharedProxy`; painel —
  `lib/proxy-usage.ts` (+spec), `lib/combobox-keys.ts` (+spec), `components/proxies/ProxyPicker.tsx`,
  `lib/proxy-suggestion.ts` (+spec), `lib/api.ts` (+spec), `routes/Proxies.tsx`, `routes/Sessions.tsx`.
- **Decisões registradas:** D-051.
- **Provas:** ver Progresso (unit/e2e, 4 mutações recusadas, suíte completa, builds, mapa, harnesses
  visuais no Chrome com gateway falso — 37/37, 12/12, legado 3/3, 390px). Harness e gateway falso
  ficaram no scratchpad (não versionados), como na E26.
- **Revisões:** independente em 2 frentes (gateway e painel), 4 achados do gateway e 9 do painel;
  todos os procedentes corrigidos e travados em teste; busca por digitação no seletor não aplicada
  (APG opcional); P-108 registrada (anterior à E28).
- **Classe de erro introduzível e gate:** compartilhar sem escolha explícita → `shareFromConsent`
  (vitest) + harness 2 (duas linhas/sugestão velha); exclusividade quebrada para quem não manda o
  campo → e2e "sem flag = 400" e "false = ausente"; próprio pin bloqueado → e2e + mutações; uso errado
  no aviso do lote → e2e com lock segurado + mutação sem `FOR UPDATE`; NUL → e2e + mutação; teclado do
  seletor → `combobox-keys.spec.ts`; painel com gateway antigo → `proxy-usage.spec.ts` + harness legado.
- **Efeito de deploy:** os dois apps mudam; deploy manual (D-027), **gateway antes do painel** (painel
  novo com gateway velho não quebra: mostra "uso indisponível", a criação volta aos livres, escolher
  ocupado volta 400 e o lote volta 404). Sem migration, sem env nova. Sem deploy nesta sessão; último
  SHA de produção documentado `768fb26`, sem consulta ao vivo.
- **Reconciliação documental (diff × R3):** INTEGRACAO §11 (subseção E28 e bullets de exclusividade),
  DECISOES (D-051), ARQUITETURA (proxies), PENDENCIAS (P-107 ✅ código, P-108 nova), MAPA-CODIGO
  (tabelas, fluxos, rotas, "Onde mexer") + referência gerada, CHANGELOG, ESTADO, SESSOES (aviso,
  histórico; linha mais antiga para o arquivo), ROTEIRO (E28, diário, mensagem da próxima etapa).
  `Docs-n/a`: env examples (nenhuma env), runbook de deploy (segue o padrão gateway → painel).
- **Pendências:** P-108 (baixa). P-003 (node n8n com `proxyId`) segue aberta; se for feita, o node
  pode expor `allowSharedProxy` e a contagem de uso.
- **BLOQUEADO EM VOCÊ:** deploy manual dos 2 apps no Dokploy (gateway primeiro, depois o painel) e
  conferir no painel: marcar 2+ proxies de teste e excluir com uma confirmação; abrir o seletor de uma
  sessão e ver verde/vermelho com o nº de sessões; compartilhar um proxy de propósito (escolhendo o
  vermelho) só se fizer sentido operacional — a recomendação continua 1 IP por sessão (B-001).
- **DOCS TOCADAS PELO DIFF:** `CHANGELOG.md`, `docs/ESTADO.md`, `docs/SESSOES.md`,
  `docs/SESSOES_ARQUIVO.md`, `docs/PENDENCIAS.md`, `docs/DECISOES.md`, `docs/ARQUITETURA.md`,
  `docs/INTEGRACAO.md`, `docs/MAPA-CODIGO.md`, `docs/reference/mapa-codigo/`,
  `docs/ROTEIRO-ONDAS-2026-09.md` e este DONE.
- **Para continuar:** a fila do roteiro volta para E21/P-022 (reconciliação da baseline agregada e uma
  lacuna restante comprovada) — mensagem pronta no roteiro, já com a baseline local desta sessão.
