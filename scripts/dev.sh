#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  if [ -x "$PWD/.tools/node-v22.19.0-darwin-x64/bin/node" ]; then
    PATH="$PWD/.tools/node-v22.19.0-darwin-x64/bin:$PATH"
    export PATH
  else
    echo 'Install Node.js 22.12+ first, then run npm install.' >&2
    exit 1
  fi
fi
exec npm run dev -- --host 127.0.0.1 "$@"
