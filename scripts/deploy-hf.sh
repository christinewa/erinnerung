#!/usr/bin/env bash
# Build ERINNERUNG and publish dist/ to a Hugging Face static Space.
#
#   ./scripts/deploy-hf.sh <user>/<space>
#
# Static Spaces do not run a build step, so we push the built output as the
# Space repo root. Auth comes from `hf auth login` (or `huggingface-cli login`),
# which installs a git credential helper for huggingface.co.
set -euo pipefail

SPACE="${1:-}"
if [ -z "$SPACE" ]; then
  echo "usage: $0 <user>/<space>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R dist/. "$STAGE"/

# The Space card. The frontmatter is what tells HF to serve this as a static
# site; everything under it is the description shown on the Space page.
cat > "$STAGE/README.md" <<'CARD'
---
title: ERINNERUNG
emoji: 🎭
colorFrom: gray
colorTo: green
sdk: static
app_file: index.html
pinned: false
---

# ERINNERUNG

A browser game built with Three.js, in the spirit of the visuals from the
Moderat "Reminder" video (SEHSUCHT Berlin / Pfadfinderei, dir. Mate Steinforth).

Harvest crystals from the grey wasteland, carry them to the shrine, survive the
drones, earn the mask, and empty the sky.

WASD move · SHIFT run · mouse look · E takes the mask · CLICK strikes with it.

Runs on a silent timer — no soundtrack ships with it.
CARD

cd "$STAGE"
git init -q
git checkout -q -b main
git add -A
git commit -q -m "Deploy ERINNERUNG"
git push -q --force "https://huggingface.co/spaces/$SPACE" main

echo "deployed -> https://huggingface.co/spaces/$SPACE"
