#!/usr/bin/env bash
# Idempotent bootstrap for the FoG Cueing Dashboard (FastAPI + Next.js).
# Safe to run repeatedly: it refreshes dependencies without rebuilding from scratch.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Backend: Python virtualenv + dependencies"
cd "$repo_root/backend"
# The base image may ship Python without venv/ensurepip support; install it once.
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  echo "    python venv support missing; installing python3-venv"
  sudo -n apt-get update -qq && sudo -n apt-get install -y -qq python3-venv || \
    echo "    WARNING: could not install python3-venv automatically"
fi
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt
deactivate

echo "==> Frontend: Node dependencies"
cd "$repo_root/frontend"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "==> Install complete"
