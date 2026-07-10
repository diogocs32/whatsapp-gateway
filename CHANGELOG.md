# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).
Histórico anterior a 10/07/2026 (F1–F9 do blueprint + auditoria 07/2026) está no `git log` e em
[docs/auditoria-2026-07.md](docs/auditoria-2026-07.md) — este arquivo passa a valer a partir da onda M0.

## [Unreleased]

### Adicionado

- **M0 · Doc viva**: `docs/ESTADO.md`, `docs/SESSOES.md`, `docs/DECISOES.md`, `docs/ARQUITETURA.md`
  (tabelas donas validadas contra o schema.prisma — divergências em D-002/D-003), `docs/PROJETO.md`,
  `docs/sessions/`, `CLAUDE.md` (raiz) e este `CHANGELOG.md`.
- `DOCUMENTO_CONEXOZENVO_NESTJS.md` (processo de ondas M0–M6) adicionado ao versionamento.

### Alterado

- `docs/auditoria-2026-07.md`: item O4 (S3 em prod) marcado ✅ — resolvido em 04/07/2026
  (Cloudflare R2, bucket `conexozenvo-wa-media`, `storage: true` confirmado no `/health`).
- **M1 · Destravar produção (10/07/2026)**: O1 (re-sync Webshare — todos os proxies ALIVE,
  sessões WORKING), O2 (Memory Limit no Dokploy — `memoryUsedPct` 0→0.27 no `/health`) e
  O3 (Validate DNS verde) concluídos → **auditoria 07/2026 100% encerrada (código + operacional)**.
  Sem mudança de código — onda operacional; produção roda `808c175` desde 13:28 UTC.
