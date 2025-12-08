#!/bin/zsh
source .env.local

NODE_ENV=${NODE_ENV:-development}
DISCORD_TOKEN=${DISCORD_TOKEN}
DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
DISCORD_GUILD_ID=${DISCORD_GUILD_ID}

echo "[INFO] Environment Configuration Check"
echo "========================================"

check_var() {
  local var_name=$1
  local var_value=${(P)var_name}
  if [ -z "$var_value" ]; then
    echo "[✗] Missing: $var_name"
    return 1
  else
    if [ ${#var_value} -gt 20 ]; then
      echo "[✓] $var_name: ${var_value:0:20}..."
    else
      echo "[✓] $var_name: $var_value"
    fi
    return 0
  fi
}

all_ok=true
check_var DISCORD_TOKEN || all_ok=false
check_var DISCORD_CLIENT_ID || all_ok=false
check_var DISCORD_GUILD_ID || all_ok=false
check_var NODE_ENV || all_ok=false

echo "========================================"
if [ "$all_ok" = true ]; then
  echo "[✓] All environment variables configured!"
  echo ""
  echo "Next steps:"
  echo "  1. To run the Discord bot locally:"
  echo "     pnpm --filter @tiltcheck/discord-bot dev"
  echo ""
  echo "  2. To test wallet registration:"
  echo "     pnpm --filter @tiltcheck/justthetip test"
  echo ""
  echo "  3. To deploy to Railway/Fly:"
  echo "     git push origin main"
else
  echo "[✗] Some environment variables are missing!"
  echo "     Check .env.local file"
fi
