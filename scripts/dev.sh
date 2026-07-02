#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
fi

cd /home/dliamkin/Repositories/dliamkin
exec node ./node_modules/vite/bin/vite.js --host 0.0.0.0
