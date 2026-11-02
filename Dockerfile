FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:vps

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 AUTH_MODE=supabase
COPY --from=build --chown=node:node /app/.next-vps/standalone ./
COPY --from=build --chown=node:node /app/.next-vps/static ./.next-vps/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/content ./content
COPY --chown=node:node scripts/validate-vps-env.mjs ./scripts/validate-vps-env.mjs
COPY --chown=node:node deploy/entrypoint.sh ./entrypoint.sh
RUN chmod 755 ./entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
