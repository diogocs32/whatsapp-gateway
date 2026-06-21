#!/usr/bin/env bash
# Poll das portas do dev (gateway 3000, dashboard 5173) ate ambas responderem.
for i in $(seq 1 40); do
  g=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000/health)
  d=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:5173)
  echo "tentativa ${i} (~$((i*3))s): gateway=${g} dashboard=${d}"
  if [ "$g" != "000" ] && [ "$d" != "000" ]; then
    echo "AMBOS DE PE"
    exit 0
  fi
  sleep 3
done
echo "TIMEOUT - ver /tmp/wa-dev.log"
exit 1
