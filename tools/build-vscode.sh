#!/usr/bin/env bash
# Packages the VS Code extension into dist/elegant-theme-<version>.vsix
set -euo pipefail
cd "$(dirname "$0")/../vscode"
VERSION=$(node -p "require('./package.json').version")
[ -n "$VERSION" ] || { echo "could not read vscode version"; exit 1; }
mkdir -p ../dist
npx --yes @vscode/vsce@latest package --no-dependencies -o "../dist/elegant-theme-${VERSION}.vsix"
echo "built dist/elegant-theme-${VERSION}.vsix"
