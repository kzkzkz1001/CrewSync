FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Build stage ───────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
# Generate Prisma client (outputs into node_modules/.prisma/client)
RUN pnpm --filter @crewsync/shift-service exec prisma generate
RUN pnpm --filter @crewsync/shift-service build
RUN pnpm deploy --filter @crewsync/shift-service --prod /deploy

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /deploy .
# Prisma schema needed by migrate deploy at startup
COPY --from=builder /app/services/shift-service/prisma ./prisma
EXPOSE 3001
# Run DB migrations then start the service
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
