FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Build stage ───────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
# Generate the custom-output Prisma client for notification-service
RUN pnpm --filter @crewsync/notification-service exec prisma generate
RUN pnpm --filter @crewsync/notification-service build
RUN pnpm deploy --filter @crewsync/notification-service --prod /deploy

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /deploy .
EXPOSE 3003
CMD ["node", "dist/main.js"]
