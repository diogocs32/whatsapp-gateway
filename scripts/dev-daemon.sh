#!/usr/bin/env bash
# Lança a stack dev (gateway + dashboard) REALMENTE desacoplada da sessão WSL/harness.
# Usa setsid para nova sessão + nohup + redireciona p/ log, e retorna na hora.
# Sobrevive ao fim da ponte wsl.exe (igual aos containers Docker da distro).
set -u
REPO="/home/diogocs32/projetos/whatzapp_api"
LOG="/tmp/wa-dev.log"
PIDFILE="/tmp/wa-dev.pid"

# Se já houver dev rodando, não duplica.
if pgrep -f "concurrently -n gateway,dashboard" >/dev/null 2>&1; then
  echo "JA RODANDO (concurrently ativo) — nada a fazer"
  exit 0
fi

cd "$REPO" || exit 1
setsid nohup bash "$REPO/scripts/dev.sh" >"$LOG" 2>&1 </dev/null &
disown
echo $! >"$PIDFILE"
echo "lancado: pid=$(cat "$PIDFILE") log=$LOG"
