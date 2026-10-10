# Local-development image for `app`, `worker` and `migrate` (VIT-104).
# This is NOT the production image: the optimized standalone, non-root image
# with size budget belongs to the deploy work (Sprint 2+).

ARG NODE_IMAGE=node:22.22.0-alpine
FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm build

# One-off migrations: drizzle-kit (dev dependency) applies drizzle/migrations as migrator.
FROM deps AS migrate
COPY . .
USER node
CMD ["node_modules/.bin/drizzle-kit", "migrate"]

FROM base AS app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
# next start writes .next/cache at runtime, so the app user must own .next.
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/next.config.ts ./next.config.ts
# Static files (demo product photos, VIT-182).
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]

FROM ${NODE_IMAGE} AS worker
WORKDIR /app
COPY infra/docker/worker/ ./
USER node
CMD ["node", "placeholder.mjs"]
