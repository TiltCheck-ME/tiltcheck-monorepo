# TiltCheck Control Room - Production Container (Assumes prebuilt dist/)
FROM node:20-alpine AS base
RUN npm install -g pnpm@10 && npm cache clean --force
WORKDIR /app

FROM base AS dependencies
ENV CI=true
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
RUN pnpm install --no-frozen-lockfile --filter @tiltcheck/control-room...

FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
USER node
EXPOSE 3001

FROM runtime AS production
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node apps/control-room/src ./apps/control-room/src
COPY --chown=node:node apps/control-room/public ./apps/control-room/public
COPY --chown=node:node package.json ./
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/control-room/src/server-trust-auth.js"]
