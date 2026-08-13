---
tipo: runbook
dono: Diogo
revisado_em: 2026-08-13
validade: 2026-09-13
status: ativo
---

# 🧪 Smoke test em produção — W8 (perfil + grupos avançados) e qualidade/desempenho

> Complemento do [smoke-test-wwebjs-w1-w6.md](smoke-test-wwebjs-w1-w6.md). Cobre o que
> entrou DEPOIS daquele checklist e já está em produção no deploy de **13/08/2026**
> (origin/main `9cb5686`, `/health` = `ok`, `memoryUsedPct: 0.28`): o **perfil da conta**
> (W8), os **grupos avançados** (W8 — fila de entrada / travas admin / foto) e as melhorias
> de **qualidade/desempenho** da sessão `wwebjs-qualidade-max` (leads em LOTE, presença
> global, pairing, UA anti-flag por sessão).
>
> Base: `{API}` = `https://api.conexozenvo.com` · auth: header `X-Api-Key: <SUA_CHAVE>`.
> `{S}` = sessão **WWEBJS** de teste (WORKING) · `{SB}` = sessão **BAILEYS** de teste ·
> `{G}` = `<id-de-grupo>@g.us` onde a sessão é **admin**.
>
> ⚠️ Como o deploy 13/08 já subiu (build ✅ + `/health` ok), **não** há passo de push aqui.
> Estes passos são **funcionais** e mexem em conta WhatsApp de verdade → use sessão e
> números **de teste**. Escreve em grupo (foto, travas, aprovar entrada) tem custo de
> reputação; trate como envio e respeite o guard-rail.

## 0. Pré-checagem (o código novo está no ar?)

- [ ] `GET {API}/health` → `status: ok`, `checks.database/redis/storage: true`,
      `memoryUsedPct < 0.9`. `uptimeSeconds` baixo = container do deploy novo.
- [ ] **Prova de que as rotas W8 subiram** (antes do deploy davam 404/501): numa sessão
      WWEBJS conectada, `GET {API}/api/sessions/{S}/groups/{G}/membership-requests` deve
      responder **200** (array, mesmo que vazio). 404/"Cannot GET" = deploy não subiu.

---

## 1. Perfil da conta (W8) — nas 2 engines

Roda em `{S}` e, se puder, repita em `{SB}` (tudo funciona nas duas):

- [ ] **1.1 Recado/status:** `POST {API}/api/sessions/{S}/profile/status`
      `{"status":"Atendimento 9h-18h"}` → `200 {ok:true}`. Confira no WhatsApp (Recado).
      (≤139 chars.)
- [ ] **1.2 Nome de exibição:** `POST {API}/api/sessions/{S}/profile/name`
      `{"name":"Loja Teste"}` → `200 {ok:true}`. (≤25 chars.)
- [ ] **1.3 Foto de perfil por URL:** `POST {API}/api/sessions/{S}/profile/photo`
      `{"url":"https://.../foto.jpg"}` → `200 {ok:true}` (o gateway baixa a imagem, ≤10 MB).
      URL inválida/imagem >10 MB → **400** com motivo.

## 2. W8 — grupos avançados (fila de entrada / travas admin / foto)

Num grupo `{G}` onde `{S}` é **admin**. Funciona nas 2 engines.

- [ ] **2.1 Fila de entrada (listar):** `GET {API}/api/sessions/{S}/groups/{G}/membership-requests`
      → `200` com `[{id, phone, requestedAt}]` (vazio se ninguém pediu para entrar). Para
      gerar um pedido: com o grupo em "aprovar novos membros", peça a alguém para entrar
      pelo link de convite.
- [ ] **2.2 Aprovar/rejeitar:** `POST {API}/api/sessions/{S}/groups/{G}/membership-requests`
      `{"action":"approve"}` (sem `participants` = toda a fila) → `200 {ok:true}`. Para um
      só: `{"action":"reject","participants":["5511999999999"]}`. ⚠️ há **anti-flood**
      embutido (250–500 ms entre um e outro) — aprovar muitos leva alguns segundos, é o
      esperado. `action` fora de approve/reject → **400**.
- [ ] **2.3 Travar o grupo (settings):**
      `POST {API}/api/sessions/{S}/groups/{G}/settings` `{"announce":true}` → só admins
      enviam mensagem. `{"restrict":true}` → só admins editam a info. Pode mandar os dois
      juntos. Corpo `{}` (nenhum dos dois) → **400** "informe announce e/ou restrict".
      Confirme no WhatsApp e **destrave** depois (`{"announce":false,"restrict":false}`).
- [ ] **2.4 Confirma que o `GET groups` reflete a trava:** após o 2.3,
      `GET {API}/api/sessions/{S}/groups/{G}` → `announce`/`restrict` devem bater com o que
      você setou (não mais `false` fixo — é a correção da P-012).
- [ ] **2.5 Foto do grupo por URL:** `POST {API}/api/sessions/{S}/groups/{G}/photo`
      `{"url":"https://.../grupo.jpg"}` → `200 {ok:true}` (baixa a imagem, ≤10 MB).

## 3. Qualidade / desempenho (sessão `wwebjs-qualidade-max`)

- [ ] **3.1 Leads em LOTE (o ganho principal):** num grupo **grande** (centenas de
      membros) numa sessão WWEBJS, `GET {API}/api/sessions/{S}/groups/{G}/leads` → deve
      voltar em **poucos segundos** (antes: até minutos, 1 ida ao Chromium por membro).
      Confirme que os leads ainda vêm com `phone` + `name` preenchidos (o lote não pode
      ter degradado a resolução). Se quiser medir: `curl -w '%{time_total}s\n' -o /dev/null`.
- [ ] **3.2 Presença global real:** `POST {API}/api/sessions/{S}/presence`
      `{"to":"5511999999999","type":"available"}` → `200 {ok:true}` e o contato vê a conta
      **online**. `{"type":"unavailable"}` → offline. (Antes esses 2 estados não faziam
      nada — só respondiam ok.) `composing`/`recording` seguem como "digitando/gravando".
- [ ] **3.3 Pairing code com status certo:** numa sessão WWEBJS parada, peça login por
      código: `POST {API}/api/sessions/{S}/pairing-code` `{"phoneNumber":"5511999999999"}`
      → devolve o código E `GET {API}/api/sessions/{S}` deve mostrar status
      **`PAIRING_CODE`** (antes ficava genérico). O código renovado (a cada ~3 min) aparece
      nos **logs** do container (evento `code`).
- [ ] **3.4 UA anti-flag por sessão (P-012):** conecte 2 sessões WWEBJS diferentes e olhe
      no celular **WhatsApp → Aparelhos conectados**: cada uma deve aparecer como um
      Chrome/Linux plausível e recente (não "navegador desatualizado"). A verificação fina
      do UA é no log de conexão / no header enviado; o objetivo é **não** ter a frota toda
      com UA idêntico. (Override global via `WWEBJS_USER_AGENT` no Dokploy, se algum dia
      precisar forçar um UA único.)
- [ ] **3.5 Diagnóstico de queda (change_state):** se uma sessão cair, os logs do container
      devem mostrar `wwebjs: estado da conexão mudou` (CONFLICT/UNPAIRED/TIMEOUT) ANTES do
      `disconnected` — ajuda a saber o PORQUÊ (ex.: desvinculada pelo celular).

## 4. Regressão rápida (não quebrou o que já existia)

- [ ] `GET {API}/api/sessions/{S}/groups` e `.../groups/{G}/leads` → seguem trazendo
      número+nome (o diferencial do wwebjs) — agora mais rápido.
- [ ] Enviar texto/mídia numa sessão WWEBJS e numa BAILEYS → `200`; ACK chega; `engine`
      no webhook bate com a engine real.
- [ ] `/health` continua `ok` e `memoryUsedPct < 0.9` depois dos testes (cada sessão WWEBJS
      ≈ 1 Chromium; vigie a RAM se subir várias).

## ✅ Critério de "W8/qualidade validado"

§1–§3 verdes numa sessão WWEBJS de teste (perfil, grupos avançados, presença, pairing,
leads em lote rápido), §1/§2 também numa BAILEYS quando aplicável, `/health` ok e memória
sob controle. Anote aqui a data e o resultado; se algo falhar, use o §9 (rollback) do
[smoke W1–W6](smoke-test-wwebjs-w1-w6.md) — o rollback de código basta (sem migration).
