#!/bin/sh
# Lint JS: wymaga Node i dostępu do npm (eslint pobierany tymczasowo do katalogu tymczasowego).
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); D=$(mktemp -d)
(cd "$D" && npm init -y >/dev/null 2>&1 && npm i eslint@9 globals@15 >/dev/null 2>&1)
cp "$ROOT/eslint.config.mjs" "$D/eslint.config.mjs"
cd "$ROOT" && "$D/node_modules/.bin/eslint" -c "$D/eslint.config.mjs" js tests 2>&1
