# 🎯 PROJETO — ConexoZenvo

> Visão, escopo e regras de negócio. Documento vivo (M0).
> Fontes detalhadas: [agent-whatzapp_api.md](agent-whatzapp_api.md) (base de conhecimento operacional) e
> [`PROMPT-MESTRE-WHATSAPP-GATEWAY.md`](../PROMPT-MESTRE-WHATSAPP-GATEWAY.md) (blueprint original) — este arquivo resume e LINKA, não duplica.

## O que é

Plataforma **self-hosted multi-sessão de WhatsApp** (produto comercial): envio/recepção de mensagens,
webhooks assinados, guard-rail anti-ban, extração de leads de grupos, campanhas — operada via
API REST (`X-Api-Key`) e painel web, **em produção** em conexozenvo.com + api.conexozenvo.com (Dokploy).

## Usuários e contrato público

- **B2B — integradores**: consomem a API REST diretamente ou via community node
  **`n8n-nodes-conexozenvo-gateway`** (PUBLICADO no npm, v0.4.1) → **a API `/api` atual é a v1 de fato**:
  mudança aditiva ok; breaking change exige `/api/v1` novo mantendo o contrato antigo (R0/R4).
- **Operadores do painel**: dashboard React (sessões, QR/pairing, inbox, contatos, grupos, campanhas,
  proxies, webhooks, usuários/seats, branding white-label).
- Contrato detalhado para integradores: [INTEGRACAO.md](INTEGRACAO.md).

## Regras de negócio centrais

1. **Não quebrar produção nem o contrato da API** (R0) — regra número 1 de qualquer mudança.
2. **Anti-ban em camadas (guard-rail G1–G8)**: idempotência de envio (G1), origem api|phone (G2),
   ack (G3), reply-rate por janela com maturação de 72h (G4), máquina de estados de saúde com
   quarentena e HTTP 423 (G5 — enforce documentado em produção desde 13/08; default do código
   `GUARDRAIL_ENFORCE=false` para instalação nova, D-017), eventos OUT +
   dead-letter (G6), REST de saúde/override (G7), config por sessão + presence + markRead (G8).
   Espelho no node n8n: N1–N8 (repo separado).
3. **Multi-engine atrás de um contrato único**: Baileys 7 (principal, leve) e whatsapp-web.js
   (Store oficial — única fonte confiável de número em massa para leads de grupo); META_CLOUD
   (API oficial) planejada na M6. Trade-offs: [motores-whatsapp.md](motores-whatsapp.md).
4. **LID (rollout de privacidade da Meta)**: grupos podem esconder o telefone; o gateway mantém
   diretório LID↔PN com merge retroativo. Números em massa = wwebjs/Store; Baileys resolve só quem
   já conversou/diretório.
5. **Humanização**: ritmo de digitação, presença, espaçamento aleatório e cap diário em campanhas.
6. **Webhooks confiáveis**: HMAC, retries com dead-letter e reentrega; dedup por jobId (SEM `:` —
   gotcha histórico, auditoria item 25).
7. **Licenciamento**: licença Ed25519 + seats + white-label (IAM F9) — produto vendável self-hosted.

## Escopo atual vs. roadmap

- **Entregue e em produção**: tudo acima (F1–F9 do blueprint + auditoria 07/2026 100% em código).
- **Roadmap (ondas M1–M6)**: ver [ESTADO.md](ESTADO.md) — destravar operacional, ligar enforce,
  qualidade/fronteiras, segurança, alertas e, na M6: engine META_CLOUD, multi-tenant + RLS,
  multi-engine não-oficial (WAHA, Evolution), `/api/v1`.

## Onde está cada coisa

| Assunto                                        | Documento                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Estado global + roadmap                        | [ESTADO.md](ESTADO.md)                                                  |
| Arquitetura, módulos, tabelas donas, glossário | [ARQUITETURA.md](ARQUITETURA.md)                                        |
| Decisões (append-only)                         | [DECISOES.md](DECISOES.md)                                              |
| Contrato da API p/ integradores                | [INTEGRACAO.md](INTEGRACAO.md)                                          |
| Gargalos, armadilhas, operação (dev e prod)    | [agent-whatzapp_api.md](agent-whatzapp_api.md)                          |
| Deploy no Dokploy                              | [deploy-dokploy.md](deploy-dokploy.md)                                  |
| Backlog/histórico da auditoria 07/2026         | [auditoria-2026-07.md](auditoria-2026-07.md)                            |
| Sessões de trabalho paralelas                  | [SESSOES.md](SESSOES.md)                                                |
| Processo (ondas M0–M6, regras R0–R10)          | [`DOCUMENTO_CONEXOZENVO_NESTJS.md`](../DOCUMENTO_CONEXOZENVO_NESTJS.md) |
