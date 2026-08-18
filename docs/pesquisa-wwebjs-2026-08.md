# Pesquisa wwebjs — Store travado pós-QR + panorama de ferramentas (13-14/08/2026)

> Investigação de fontes primárias (GitHub API, npm registry, docs oficiais, source code) feita em
> 13-14/08/2026 na sessão `wwebjs-store-travado`, POR EXIGÊNCIA de investigação precisa antes de
> implementar. Complementa `analise-wwebjs-2026-08.md`. Todas as afirmações têm URL.

## 0. Correções de premissa (o que a gente achava e estava errado)

1. **O repo mudou de dono**: `pedroslopez/whatsapp-web.js` → **`wwebjs/whatsapp-web.js`** (org própria;
   npm ainda aponta o repo antigo). Issues novas estão na faixa `#201xxx`.
2. **A issue #3505** (citada no comentário do nosso `withStoreReady`) NÃO discute causa raiz — é um
   report fechado sem análise. Não serve de evidência.
3. **`1.34.7` é a última versão do npm** (24/04/2026) — mas a `main` tem **5 commits depois dela**,
   e um deles é exatamente o fix do nosso sintoma (ver §2).
4. **O "bisect por build estável ≤1044.x" (plano antigo do B-002) tem premissa furada**: o
   `wa-version` NÃO tem curadoria de estabilidade — `expire` = `released + 60 dias` mecânico,
   `currentVersion` = "a mais recente que o scraper pegou", zero issues de usuários sobre builds.
   Nada sustenta que a `1044967578` seja mais segura que a `1045101284`.
   https://github.com/wppconnect-team/wa-version/blob/main/versions.json

## 1. Dois modos de falha distintos na comunidade

### Modo A — HANG até o protocolTimeout (o NOSSO caso)

Sintoma: pós-QR, `loading_screen` completa (ou trava em 99%), `ready` dispara, WS vivo, mas os
evaluates penduram até o `protocolTimeout` → `Runtime.callFunctionOn timed out`.

- **#127050** (fechada, 02/2026): trace idêntico ao nosso; workaround validado = delay de ~3s pós-ready.
  https://github.com/wwebjs/whatsapp-web.js/issues/127050
- **#3485** (fechada, 03/2025): a mecânica — `getChats()` usa `window.Store.Chat`, que só contém os
  chats JÁ sincronizados; numa conta pesada o sync leva MINUTOS após `ready` (o `ready` não significa
  Store populado). **`getChatById` NÃO passa por `Store.Chat._models` e responde mesmo durante o sync.**
  https://github.com/wwebjs/whatsapp-web.js/issues/3485
- **#5758** (fechada 01/2026, 36 comentários): loading trava em 99% por race no `AppState.hasSynced`
  — fix JÁ INCLUÍDO na 1.34.6 (nós temos). Mas a thread registra o quadro "página 100% carregada,
  `Store.Chat.models` = 0 com ~195 chats no DOM" — Store morto com UI viva.
  https://github.com/wwebjs/whatsapp-web.js/issues/5758

### ⭐ O fix do NOSSO sintoma existe e NÃO está em release: commit `1780711`

**PR #201653 — "fix: prevent duplicate ready events on SPA re-injection" — MERGED 25/06/2026**,
DOIS MESES depois do release 1.34.7 (24/04). Ausente de qualquer versão do npm.
https://github.com/wwebjs/whatsapp-web.js/pull/201653

Causa raiz (palavras do autor): `framenavigated` dispara para IFRAMES também; o `inject()` roda a
cada evento sem filtrar → **injeções concorrentes disputando recursos, listeners Backbone
empilhando (3-4 sets por scan de QR)**, ready duplicado/lento. O autor reproduziu EM PRODUÇÃO
"after a QR scan + destroy + re-init cycle" — literalmente o nosso gatilho. O fix filtra main
frame, evita re-inject com WWebJS já carregado, serializa inject, faz `.off()` dos listeners antes
de re-registrar. Testado inclusive no cenário "QR scan after destroy()".
Precedente de produção: terceiro rodando `"whatsapp-web.js": "github:wwebjs/whatsapp-web.js#1780711a1c86dfeca7c5ba6a66f950eac93dde28"`.
Complemento ainda aberto: PR #201893 (serializa inject; evita crash de processo por exposeFunction duplicado).

### Modo B — throw RÁPIDO `r: r` / `t: t` (o que a build 1045 fez com a gente em 13/08)

WA Web `2.3000.104x` **renomeou `_serialized` → `$1`** nas message keys → a lib lê `undefined` →
`DataError` minificado `r`. **NÃO é o nosso hang** (é determinístico e instantâneo; aumentar
protocolTimeout comprovadamente não muda — #201845). Issues abertas SEM fix mergeado: #201845,
#201841, #201852, #201862, #201884, #201833. **O nosso `downloadMedia` com erro `"r"` na build
1045 (13/08) é exatamente isto.**
Patch comunitário VALIDADO em produção (1.34.7 + build 2.3000.1043890899): receita patch-package de
@choudharyabdullah em https://github.com/wwebjs/whatsapp-web.js/issues/201852 (helper `getMsgKeyId()`
aceitando `_serialized` OU `$1` + try/catch no exposeFunction). Confirmação de terceiro em produção
(@leftprazz): de "todas as mensagens na DLQ por 3h" para "entrega em 725ms, 0 retries".

## 2. Estado do wwebjs e prazo duro

- 1.34.7 (24/04/2026) é a última; main tem só 5 commits desde (o `1780711` é um deles; outro é
  `2dc9466` refactor auth store). 99 issues abertas; issues `issued high` de julho sem resposta de
  maintainer; ~3,5 meses sem release. Sem fork comunitário relevante.
- **PRAZO DURO: nossa build pinada `2.3000.1042271047-alpha` expira 28/08/2026.** Depois disso o
  fallback `live` traria build nova → Modo B (sem patch `$1`, quebra).
- A feature de que dependemos (LID+PN de contatos desconhecidos) nasceu na 1.34.0 (PR #3702 de
  @alechkos): https://github.com/wwebjs/whatsapp-web.js/releases/tag/v1.34.0

## 3. Panorama de ferramentas (números GitHub API 13/08/2026)

| Projeto                      | Stars  | Issues abertas | Último release                                              |
| ---------------------------- | ------ | -------------- | ----------------------------------------------------------- |
| whatsapp-web.js (org wwebjs) | 22.398 | 99             | 1.34.7 — 24/04/2026                                         |
| **wa-js (wppconnect)**       | 783    | **11**         | **4.5.0 — 31/07/2026** (release ~semanal)                   |
| wppconnect (lib)             | —      | —              | 2.2.7 — 10/08/2026                                          |
| Baileys                      | 10.698 | 349            | **7.0.0-rc14 — 29/07/2026** (nós: rc13)                     |
| venom                        | 6.571  | 63             | 5.3.0 — 11/2024 (hiato 26 meses; v6 não lançada)            |
| open-wa                      | 3.641  | 181            | 5.0.0-alpha.8 (licença paga £10/mês/número p/ função-chave) |

- **wa-js/wppconnect**: único com API LID↔PN explícita e versionada — `lidPnCache` (7 funções),
  `WPP.contact.getPnLidEntry` (com fallback `queryExists` NO SERVIDOR), `WPP.chat.requestPhoneNumber`
  (mensagem de protocolo), participantes por LID-ou-PN (v4.5.0, PR #3546). Compat fixes para
  WA Web ≥ 2.3000.1044096409 lançados em 30/07 (v4.4.3). O `wa-version` deles commita builds DE HORA
  EM HORA (inclusive as 1045.x que nos quebraram — com HTML servido).
  https://wppconnect.io/wa-js/ · https://github.com/wppconnect-team/wa-js
- **Baileys (doc oficial)**: LID→PN reverso **"não é suportado pelo WhatsApp"**; `getPNForLID` só
  resolve se o mapping já foi visto; orientação oficial é migrar índices para LID.
  https://baileys.wiki/concepts/jids — **conclusão: a engine browser não é redundância, é a ÚNICA
  via confiável de PN. Baileys nunca vai substituí-la.**
- Baileys 7.0.0 stable: sem cronograma (busca em issues/milestones = 0). rc14 sem release notes.

## 4. Plano recomendado — GO do dono em 14/08: **foco SOMENTE wwebjs** (D-012)

1. ✅ **EXECUTADO 14/08 (D-012)** — dep pinada no commit `1780711` via **tarball**
   (`https://github.com/wwebjs/whatsapp-web.js/archive/1780711a1c86dfeca7c5ba6a66f950eac93dde28.tar.gz`)
   — sem `git` no build Docker e sem rodar o `prepare` da lib. Verificado no código instalado:
   filtro main-frame + `_framenavigatedRegistered` + `_wwjsListeners`. 34/34 testes · tsc · eslint.
   Complemento pendente (barato, com evidência #3485): preferir `getChatById` a `getChats` onde couber.
2. **Antes de 28/08 (B-002 reformulado)** — abandonado o "bisect de build estável" (premissa morta).
   Caminho com evidência: build nova (ex.: a atual do wa-version) **+ patch `$1` via patch-package**
   (receita validada em produção por terceiros, issue #201852) — testar PN/leads + sync numa sessão
   de teste. É o PRÓXIMO passo depois de validar o item 1 em produção.
3. ~~Migração wa-js/wppconnect~~ e ~~upgrade Baileys rc14~~ — **FORA DE ESCOPO por decisão do dono
   (14/08, D-012: foco somente wwebjs)**. Registrados aqui como opções futuras com a evidência.

## Não encontrado (registrado para não re-pesquisar à toa)

- Consenso de comunidade (Discord/Reddit/SO) sobre extração de participantes com PN — não há.
- Roadmap do Baileys 7 stable — não há.
- Curadoria/estabilidade de builds no wa-version — não existe (é espelho automático).
- Fonte primária sobre detecção de headless a nível WebSocket — só marketing de vendedores de proxy.
