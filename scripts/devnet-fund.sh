#!/usr/bin/env bash
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
# Fund devnet wallet for Cooldown program deployment.
set -euo pipefail

WALLET=${1:-$(solana address)}
RPC="https://api.devnet.solana.com"

echo "Requesting airdrop for $WALLET on devnet..."
curl -sf \
  -X POST "$RPC" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"requestAirdrop\",\"params\":[\"$WALLET\",2000000000]}"
echo ""
sleep 5
echo "Balance:"
solana balance --url devnet
