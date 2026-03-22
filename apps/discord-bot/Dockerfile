# TiltCheck Discord Bot - Production Container (Assumes prebuilt dist/)
FROM node:20-alpine AS base
RUN npm install -g pnpm@10 && npm cache clean --force
WORKDIR /app

FROM base AS dependencies
ENV CI=true
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
RUN pnpm install --no-frozen-lockfile --prod

FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
USER node
EXPOSE 8081

FROM runtime AS production
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node apps/discord-bot/dist ./apps/discord-bot/dist
COPY --chown=node:node package.json ./
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/discord-bot/dist/index.js"]
