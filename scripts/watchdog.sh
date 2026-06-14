#!/bin/bash
while true; do
  echo "Starting email worker..."
  cd /home/agent-lead-engineer/audit-owl/server && NODE_PATH=./node_modules node ../scripts/worker.cjs >> /tmp/email-worker.log 2>&1
  echo "Worker crashed with exit code $?. Respawning..."
  sleep 5
done
