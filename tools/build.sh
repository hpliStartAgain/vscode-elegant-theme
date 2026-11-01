#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/generate.mjs
bash tools/build-jetbrains.sh
bash tools/build-vscode.sh
