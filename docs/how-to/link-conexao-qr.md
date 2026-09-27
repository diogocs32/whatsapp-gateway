---
tipo: runbook
dono: Diogo
revisado_em: 2026-09-27
validade: 2026-10-27
status: ativo
origem: etapa E27 do roteiro (Onda 9) — P-086 (link público de conexão) + P-089 (filtro de sessões) — D-037
---

# 🔗 Link para conectar de outro lugar (E27): deploy, teste com chip e uso

> **Para quem:** o dono (nada disto é executado por chat — R0). **Auto-deploy desligado (D-027):** o
> merge não publica nada; gateway e dashboard sobem quando você clica **Deploy** em cada um.
> **Os DOIS apps mudam.** **1 migration aditiva** (aplicada sozinha no boot do gateway —
> `prisma migrate deploy`): `20260927013000_link_conexao_qr` (tabela nova `wa_connect_links` +
> coluna `wa_sessions.lastMeJid` com backfill). Nenhuma env nova.

## 1. Deploy (gateway antes do painel)

1. CI verde no PR da E27 (`ci`, `imagens`, `advisories`).
2. **Gateway primeiro** (a página nova do painel chama rotas que só existem no gateway novo). Se
   houver deploys anteriores pendentes (A/G/W/B), eles sobem juntos — siga os runbooks deles na
   mesma janela. O deploy reinicia o gateway: não faça em rajada com sessão real conectada
   (start-first até o B-004 — [deploy-a-onda1.md](deploy-a-onda1.md) §3).
3. Conferir: `/health` ok e uptime resetado; no log do boot, `Migration … 20260927013000_link_conexao_qr` aplicada.
4. **Dashboard** em seguida. Conferir que `https://<painel>/conectar` abre a página "Conectar
   WhatsApp" (sem link, ela diz "Link inválido ou incompleto").

## 2. Aceite com chip de teste (antes de mandar link para cliente)

Use uma sessão **Baileys de teste** e um celular de teste — nada com número de cliente.

1. **Criar:** Sessões → linha da sessão de teste → **Link** → validade 1 h → número que vai conectar
   (o do celular de teste) → **Gerar link** → **Copiar mensagem pronta**.
2. **O `#` sobrevive ao WhatsApp? (não verificado por documentação — é o teste principal):** mande a
   mensagem para você mesmo pelo WhatsApp; toque no link no **Android** e no **iPhone**, no navegador
   de dentro do WhatsApp e em "abrir no navegador". A página deve mostrar o estado da conexão, não
   "Link inválido". Se falhar em algum, anote aparelho/navegador e avise no chat seguinte (plano B:
   trocar o formato do token).
3. **Ler o QR** com o celular de teste a partir de OUTRA tela (computador): a página deve ir para
   "Pronto! Seu WhatsApp foi conectado" e o diálogo do painel para "Conectado pelo link em dd/mm às hh:mm".
4. **Número errado:** faça **Logout** da sessão de teste (ela vai para Parado, sem login salvo —
   com a sessão conectada o painel não deixa gerar link, e o logout cancela qualquer link ativo).
   **Só depois** abra **Link**, gere um link com o número do celular de teste, abra-o no computador,
   toque **Mostrar QR** e leia com **outro** WhatsApp de teste. Esperado: a sessão volta para Parado
   com o erro "Conectado com número diferente do esperado…", o aparelho some de "Aparelhos
   conectados" do celular que leu, e a página mostra "O WhatsApp lido não é o número esperado". Nos
   1–2 s entre conectar e desfazer, o n8n pode receber `session.status WORKING` desse número (e
   depois um `STOPPED` com o motivo) — confira se algum fluxo reage a isso.
5. **Revogar:** com um link ativo aberto no computador, clique **Revogar** (com "também parar a
   sessão"): a página muda para "cancelado" em até ~3 s com o QR na tela (até ~5 s se ninguém tocou
   em "Mostrar QR") e o QR some.
6. **Mesmo celular:** abra o link no próprio celular de teste — a página deve avisar para abrir em
   outra tela e oferecer "Enviar para outro aparelho".

## 3. Como usar no dia a dia

- **Sessão caiu porque o celular desconectou (401 — "Desconectada pelo celular"):** Sessões →
  **Link** → confirme o número → envie a mensagem pronta à pessoa. Ela abre no computador (ou em
  outro celular), toca **Mostrar QR** e lê com o celular do WhatsApp.
- **Sessão caiu por instabilidade (ainda tem login salvo):** o painel recusa o link ("ainda tem login
  salvo") — use **Reiniciar** primeiro. Se precisar mesmo conectar do zero, o diálogo oferece "Gerar
  novo QR agora e criar o link" (descarta o login atual).
- **Sessão nova:** crie a sessão e use **Link para conectar de outro lugar** no próprio modal do QR.
- O link vale até a validade escolhida (1 h, 24 h ou 72 h), serve para **uma** conexão e morre
  quando a sessão conecta, quando você gera outro, revoga, para ou faz logout da sessão. A pessoa pode
  pedir até 5 QRs novos pelo link (30 s entre eles).
- O link só aparece na hora de gerar (o sistema guarda só um código embaralhado). Se perder, gere
  outro — o anterior deixa de valer.
- **Filtro de sessões (P-089):** a barra acima da tabela filtra por nome, status ("Desconectadas" =
  tudo que não está Conectado) e número (com ou sem +55, com ou sem o 9); acha também sessões caídas
  pelo último número conectado.

## 4. Como voltar

- Rollback do gateway/painel pelo Dokploy como nos outros deploys ([rollback-gateway.md](rollback-gateway.md)).
  A migration é aditiva: o código anterior ignora a tabela e a coluna novas (não precisa desfazer).
- Para desligar só o link sem rollback: não há env — basta não gerar links; os existentes podem ser
  revogados no diálogo (ou expiram sozinhos).
