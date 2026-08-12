# 📌 PENDÊNCIAS — ConexoZenvo

> Quadro central (R9 · v4.3). Toda pendência descoberta em sessão entra AQUI na
> hora (não fica só no DONE-). Bloqueio que depende do dono/terceiro é B-xxx e
> vive no topo; pendência técnica é P-xxx e qualquer sessão pode assumir.
> Criado em 12/08/2026 (sessão `adocao-base-v43`), semeado com as pendências
> vivas do ESTADO.md e dos DONE- recentes.

## 🚧 BLOQUEADO EM MIM OU EM TERCEIRO (B-xxx — só o dono resolve)

### B-001 · 🔴 aberto · pedido em 22/07 (sessão hardening-antiban)

- **Ação:** concluir a migração para proxy RESIDENCIAL BR: importar os 20 IPs
  Webshare static residential em massa no painel (`user:pass@ip:porta`, source
  MANUAL), atribuir 1 IP/sessão (Proxy fixo), ligar `WA_REQUIRE_PROXY=true` no
  Dokploy e re-vincular as sessões.
- **Quem:** Diogo (ação operacional no painel + Dokploy — R0).
- **O que bloqueia:** eficácia do hardening anti-flag entregue em 22/07 (o código
  está em produção, mas sem proxy residencial + guard ligado a proteção é parcial).
- **Pronto esperando:** fingerprint por sessão, log de conexão sem proxy e o guard
  `WA_REQUIRE_PROXY` (default false) — tudo em produção desde 22/07.
- **Devolver:** responder "B-001 feito" com a data em que `WA_REQUIRE_PROXY=true`
  entrou no Dokploy (vira registro em DECISOES.md).
- **Contorno em vigor:** `WA_REQUIRE_PROXY=false` (default seguro reverso — sessão
  conecta sem proxy e só LOGA) → removido por [P-002] ao desbloquear.

## 📋 Pendências técnicas (P-xxx — qualquer sessão assume)

| ID    | Pendência                                                                                                                                                | Origem                                   | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| P-001 | Estabilidade de sessão P1/P2: watchdog de conexão, auto-heal DEGRADED, tratamento granular de DisconnectReason, reconexão wwebjs                          | DONE-2026-07-21-estabilidade (backlog)   | aberta |
| P-002 | Health-tester de proxies só testa ipify — não prova reputação junto ao WhatsApp; avaliar teste de reputação + remover contorno do B-001 quando resolvido | DONE-2026-07-22-hardening-antiban        | aberta |
| P-003 | Node n8n (repo `n8n-nodes-conexozenvo-gateway`): parâmetro `proxyId` opcional na criação de sessão + picker de `/proxies/available` (aditivo, minor)      | D-008                                    | aberta |
| P-004 | Lint local: `apps/gateway/auth/` nos ignores · normalizar Prettier · `format:check` no CI                                                                 | ESTADO.md § próximos passos (entra na M3) | aberta |
| P-005 | Job de purge de `refresh_tokens` expirados (índice em `expiresAt` já existe)                                                                              | D-009 (backlog)                          | aberta |
| P-006 | Ondas de adoção v4.3: A8 projeção `.claude/` · A9 gates de docs · A10 bateria única + catracas · A11 reorganização docs/ — plano em `ADOCAO.md`            | D-011 (sessão adocao-base-v43)           | aberta |
