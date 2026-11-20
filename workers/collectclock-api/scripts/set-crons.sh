#!/bin/sh
# Adds the every-minute push cron next to the existing */15 one (PUT replaces the whole list).
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/6604734f6224c90d45b3d817f9dfab23/workers/scripts/collectclock-api/schedules" \
 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
 -d '[{"cron":"*/15 * * * *"},{"cron":"* * * * *"}]' | jq -c '{success,errors,schedules:.result.schedules}'
