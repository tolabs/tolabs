FROM node:20.4.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

FROM base AS builder
RUN apk add --no-cache libc6-compat && corepack enable && corepack prepare pnpm@8.9.0 --activate

#编译packages
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store [ -f pnpm-lock.yaml ] && pnpm fetch || (echo "Lockfile not found." && exit 1)
COPY ./tsconfig.json ./tsconfig.json
COPY ./packages/tsconfig.deps.json ./tsconfig.deps.json
COPY ./packages/tsconfig.base.json ./tsconfig.base.json
COPY ./packages/tsconfig.web.json ./tsconfig.web.json
COPY ./packages ./packages
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm -r --offline --filter=./packages/* install && pnpm -r --filter=./packages/* run build

#编译程序
ENV NEXT_TELEMETRY_DISABLED=1
COPY ./ ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --frozen-lockfile install && pnpm run build

# Production image, copy all the files and run next
#FROM base AS runner
FROM node:current-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN apk add curl && apk add ca-certificates && update-ca-certificates && apk add --no-cache dumb-init

USER nextjs

# You only need to copy next.config.js if you are NOT using the default configuration
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

EXPOSE 3000

ENTRYPOINT ["dumb-init", "sh", "-c", "node server.js"]
