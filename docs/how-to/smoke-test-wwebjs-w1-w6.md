---
tipo: runbook
dono: Diogo
revisado_em: 2026-08-12
validade: 2026-09-12
status: ativo
---

# 🧪 Smoke test em produção — push das ondas wwebjs W1–W6

> Checklist para validar em PRODUÇÃO o push das 7 ondas de código de 12/08 (W1–W6 do
> plano `analise-wwebjs-2026-08.md`). Nenhuma tem migration/env nova; todas exigem deploy.
> Base: `https://api.conexozenvo.com` · auth: header `X-Api-Key: <SUA_CHAVE>`.
> Placeholders: `{S}` = nome ou id da sessão WWEBJS de teste · `{SB}` = sessão BAILEYS de
> teste · `{API}` = `https://api.conexozenvo.com`.

## ⚠️ 0. ANTES DE DAR O PUSH (R0 — não quebrar produção)

- [ ] **O push reinicia o gateway.** Toda sessão WhatsApp REAL conectada CAI e precisa
      reconectar. **NÃO** faça o push em horário de campanha ativa nem com sessão real
      no meio de um envio. Escolha uma janela de baixo uso.
- [ ] Confirme que **não há sessão wwebjs real conectada** fazendo trabalho agora
      (`GET {API}/api/sessions` → nenhuma WORKING crítica no meio de disparo).
- [ ] **Backup:** produção ainda não tem backup automatizado do banco (A1 pendente). Se
      possível, tire um `pg_dump` manual do Postgres ANTES (a mudança não tem migration,
      mas o deploy mexe no runtime).
- [ ] Tenha em mãos o **commit anterior** (`git log --oneline` na main) para rollback.
- [ ] Use uma **sessão de TESTE** (não a de produção real) para os passos funcionais —
      criar grupo, bloquear, reagir etc. mexem em conta WhatsApp de verdade.

## 1. DAR O PUSH E PROVAR O DEPLOY (R15 — prova = ambiente mudado, não job verde)

- [ ] `git push origin main` (dispara o webhook do Dokploy → rebuild, ~4–5 min).
- [ ] **Webhook do Dokploy é intermitente** (já falhou mudo 2× em 03/07). Se em ~5 min o
      deploy não subir: **GitHub → repo → Settings → Webhooks → Recent Deliveries**
      (ver se entregou) e, se preciso, **deploy manual no painel do Dokploy**.
- [ ] `GET {API}/health` → `status: ok` e `checks` (database/redis/storage true).
      Confira `memoryUsedPct` (Chromium do wwebjs pesa; deve estar < 0.9 — se subir,
      confirmar o **Memory Limit** ativo no Dokploy, O2 da auditoria).
- [ ] **PROVA DE QUE O CÓDIGO NOVO SUBIU** (antes do deploy isto dava HTTP 400/501; depois
      responde 200 com dados): numa sessão WWEBJS conectada, rode o W4-checkNumbers abaixo
      (passo 4.1). Se ainda der 501/400 "não suportado na engine WWEBJS", **o deploy NÃO
      subiu** — volte ao passo do webhook.

## 2. RECONECTAR AS SESSÕES (pós-restart)

- [ ] `GET {API}/api/sessions` → veja o estado. Sessões que estavam WORKING vão precisar
      voltar. As Baileys reconectam sozinhas; **as wwebjs também agora (W1)** — mas o
      efeito só vale para quedas NOVAS (após o deploy).
- [ ] Se uma sessão wwebjs ficou DEGRADED/parada: `POST {API}/api/sessions/{S}/restart`.
      (Lembrete: `/start` sozinho já não é mais no-op — W1 — mas `restart` é o caminho
      garantido de recuperação.)

---

## 3. W1 — Estabilidade e segurança do motor

- [ ] **Reconexão automática (P0-1):** com uma sessão wwebjs de teste WORKING, force uma
      queda (ex.: no celular, _Aparelhos conectados → desconectar_ essa sessão, OU derrube
      a rede do proxy). Observe `GET {API}/api/sessions/{S}` → deve ir a DEGRADED com
      "reconectando (tentativa n/5)" e **voltar sozinha** (ou parar em DEGRADED após 5
      tentativas, aí `restart`). Antes desta onda ficava DEGRADED para sempre.
- [ ] **`start` não é mais no-op:** numa sessão wwebjs caída, `POST {API}/api/sessions/{S}/start`
      → deve efetivamente subir (status muda), não responder 200 sem fazer nada.
- [ ] **Guard de proxy (P0-2)** — só se você usa `WA_REQUIRE_PROXY=true`: crie/inicie uma
      sessão wwebjs SEM proxy vivo atribuído → deve ir a **FAILED** com a mensagem "Sem
      proxy vivo e WA_REQUIRE_PROXY ligado…" (antes conectava e vazava o IP do datacenter).
      Ver **B-001** (§8).
- [ ] **B-002 (webVersion)** — ver §8. Fazer ANTES do uso intenso.

## 4. W4 — Grupos / contatos / canais (os 14 métodos que davam "não suportado")

Todos numa sessão **WWEBJS** conectada (`{S}`):

- [ ] **4.1 checkNumbers** (também é a prova de deploy §1):
      `POST {API}/api/sessions/{S}/contacts/check` body `{"numbers":["5511999999999"]}`
      → 200 com `[{number, exists, jid}]` (antes: 400 "não suportado").
- [ ] **4.2 profilePicture:** `GET {API}/api/sessions/{S}/contacts/5511999999999@c.us/profile-picture`
      → 200 `{jid, url}` (url pode ser null se sem foto/privado).
- [ ] **4.3 bloquear/desbloquear:** `POST {API}/api/sessions/{S}/contacts/block`
      `{"jid":"5511999999999@c.us","action":"block"}` → 200 `{ok:true}`. Depois `unblock`.
- [ ] **4.4 listar grupos + leads:** `GET {API}/api/sessions/{S}/groups` e
      `GET {API}/api/sessions/{S}/groups/{groupId}/leads` → membros com número+nome (o
      diferencial do wwebjs). Grupo grande pode levar segundos (sequencial, esperado).
- [ ] **4.5 criar grupo:** `POST {API}/api/sessions/{S}/groups`
      `{"subject":"Teste WZ","participants":["5511999999999"]}` → 200 com o GroupInfo.
      ⚠️ cria grupo DE VERDADE — use números seus. Depois `.../groups/{id}/leave`.
- [ ] **4.6 assunto/descrição/convite:** num grupo de teste onde você é admin,
      `POST .../groups/{id}/subject {"subject":"Novo"}`, `.../description`, `GET .../invite`,
      `POST .../invite/revoke` → todos 200.
- [ ] **4.7 canais (beta):** `POST {API}/api/sessions/{S}/channels {"name":"Canal Teste"}`
      → 200 (ou erro claro da lib). `GET .../channels/{jid}`, follow/unfollow.

## 5. W2 — Mídia no S3 (as duas direções) + engine no webhook

- [ ] **5.1 Enviar mídia (wwebjs):** `POST {API}/api/sessions/{S}/messages/media-url`
      `{"to":"5511999999999","url":"https://.../foto.jpg","type":"image","caption":"oi"}`
      → 200 `{id}`. Guarde o `id`.
- [ ] **5.2 Baixar a mídia enviada:** `GET {API}/api/sessions/{S}/messages/{id}/media`
      → **200 com o binário** (antes desta onda: 404 para toda mídia wwebjs).
- [ ] **5.3 Receber mídia:** peça para o celular do contato mandar uma imagem/áudio para a
      sessão wwebjs. No webhook (ou no inbox) deve chegar `type: image|audio|...` com
      `mediaUrl` preenchido; `GET .../messages/{msgId}/media` → 200 (antes: `type:'other'`,
      404). Confirme que o binário abre.
- [ ] **5.4 Engine no webhook (P1-1):** confira num evento de webhook de uma sessão WWEBJS
      que o campo **`engine` = `"wwebjs"`** (antes vinha `"baileys"` para tudo). Num
      evento de sessão BAILEYS deve vir `"baileys"`.

## 6. W3 — Ciclo de vida (new-qr, DELETE, robustez)

- [ ] **6.1 new-qr recupera wwebjs (P1-2):** numa sessão wwebjs desconectada pelo celular,
      `POST {API}/api/sessions/{S}/new-qr` → deve **gerar QR novo** (`GET .../qr` traz um
      QR válido) e permitir re-parear. Antes era no-op (voltava sem QR).
- [ ] **6.2 DELETE não vaza perfil (P1-3):** crie uma sessão wwebjs de teste, conecte,
      `DELETE {API}/api/sessions/{S}` → no volume `/data/wwebjs` do container o diretório
      `session-{id}` deve **sumir** (antes ficava órfão para sempre). Verificação de disco
      é no servidor/Dokploy.

## 7. W5 / W5b / W6 — Mensagens ricas e reação recebida

Sessão WWEBJS e, se puder, repita numa BAILEYS (`{SB}`) — tudo funciona nas duas:

- [ ] **7.1 Menções (W5):** `POST {API}/api/sessions/{S}/messages/text`
      `{"to":"<grupo>@g.us","text":"aviso @fulano","mentions":["5511999999999"]}` → o
      contato aparece marcado (@) na mensagem no WhatsApp.
- [ ] **7.2 Reagir a uma mensagem (W5):** `POST {API}/api/sessions/{S}/messages/{msgId}/reaction`
      `{"emoji":"👍"}` → a reação aparece no WhatsApp. `{"emoji":""}` remove.
      (`{msgId}` = keyId de uma mensagem conhecida da sessão.)
- [ ] **7.3 Localização (W5b):** `POST {API}/api/sessions/{S}/messages/location`
      `{"to":"5511999999999","latitude":-23.5505,"longitude":-46.6333,"name":"SP"}` → chega
      como mapa/localização.
- [ ] **7.4 Enquete (W5b):** `POST {API}/api/sessions/{S}/messages/poll`
      `{"to":"5511999999999","name":"Prefere?","options":["Manhã","Tarde"],"multi":false}`
      → chega como enquete. (Os votos ainda NÃO vêm por webhook — veja no app.)
- [ ] **7.5 Reação RECEBIDA (W6):** peça ao contato para reagir a uma mensagem sua com um
      emoji. No webhook deve chegar o evento **`message.reaction`** com
      `{keyId, chatJid, senderJid, emoji, fromMe:false, timestamp}`. Emoji vazio = removida.
      ⚠️ o webhook precisa assinar `*` ou `message.reaction` para receber o evento novo.

---

## 8. AÇÕES OPERACIONAIS (dependem de você — bloqueios abertos)

- [ ] **B-002 — revalidar `WWEBJS_WEB_VERSION` (URGENTE, ~fim de agosto):** a versão fixada
      no código expira em ~2 meses; expirada, o fallback traz build que ESCONDE o número
      dos leads. Escolha uma versão nova em `github.com/wppconnect-team/wa-version` que
      ainda exponha o PN, confirme numa extração de leads real e fixe em
      `WWEBJS_WEB_VERSION` no Dokploy. Responda "B-002 feito" com a versão.
- [ ] **B-001 — proxy residencial:** importe os 20 IPs residenciais, atribua 1/sessão
      (Proxy fixo), ligue `WA_REQUIRE_PROXY=true` no Dokploy e re-vincule. Agora o guard
      (W1/P0-2) protege o wwebjs de verdade. Responda "B-001 feito".

## 9. SE ALGO QUEBRAR — rollback

- [ ] Sintoma: `/health` unhealthy, sessões não sobem, 502 no Traefik, ou um fluxo crítico
      falhando. **Diagnóstico rápido:** logs do container no Dokploy + `GET {API}/health`.
- [ ] **Rollback:** no Dokploy, redeploy do **commit anterior** ao push (o do topo do
      `git log` de antes — hoje o rollback é rebuild do commit anterior, ~alguns min; alvo
      futuro = trocar tag de imagem, A5). Como não há migration, o rollback de código basta.
- [ ] Registre o incidente: sintoma → causa → o que reverteu, e (se for infra) abra o
      runbook/postmortem (R15).

## ✅ Critério de "push validado"

Todos os itens de §3–§7 verdes numa sessão WWEBJS de teste (e os transversais 5.4/7.x
também numa BAILEYS), `/health` ok e memória sob controle, B-001/B-002 encaminhados.
