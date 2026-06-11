FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY ecosystem.config.cjs ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/migrations ./dist/src/database/migrations
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/ecosystem.config.cjs ./

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => {process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
