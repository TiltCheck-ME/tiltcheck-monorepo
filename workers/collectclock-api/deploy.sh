#!/bin/sh
# Code-only deploy: replaces script content, leaves bindings/secrets/vars untouched.
# Never connect a Git build to this Worker. Run ./build.sh first (this script does it).
set -e
cd "$(dirname "$0")"
./build.sh
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/6604734f6224c90d45b3d817f9dfab23/workers/scripts/collectclock-api/content" \
 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
 -F 'metadata={"main_module":"index.js"};type=application/json' \
 -F "index.js=@dist/index.js;filename=index.js;type=application/javascript+module" | jq -c '{success,errors}'
