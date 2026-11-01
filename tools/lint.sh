#!/bin/sh
# Lint JS: wymaga Node i dostępu do npm (pobiera eslint tymczasowo do katalogu tymczasowego).
set -e
D=$(mktemp -d); cd "$(dirname "$0")/.."
(cd "$D" && npm init -y >/dev/null 2>&1 && npm i eslint@9 globals@15 >/dev/null 2>&1)
NODE_PATH="$D/node_modules" "$D/node_modules/.bin/eslint" -c eslint.config.mjs js tests 2>&1
