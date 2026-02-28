# TiltCheck Game Arena - Standalone Container
FROM node:20-alpine AS build

RUN npm install -g pnpm@10
ENV CI=true
ENV SKIP_ENV_VALIDATION=1

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/ ./apps/

RUN pnpm install --no-frozen-lockfile
RUN pnpm -r build

FROM node:20-alpine
RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app

EXPOSE 3010
CMD ["node", "apps/game-arena/dist/server.js"]
