# ── Stage 1: Build client ─────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json client/.npmrc ./
RUN npm install --registry https://registry.npmjs.org
COPY client/ ./
RUN npm run build

# ── Stage 2: Build server ─────────────────────────────────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json server/.npmrc ./
RUN npm install --registry https://registry.npmjs.org
COPY server/ ./
RUN npx tsc

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Server runtime deps only
COPY server/package*.json server/.npmrc ./server/
RUN cd server && npm install --omit=dev --registry https://registry.npmjs.org

# Compiled server
COPY --from=server-build /app/server/dist ./server/dist

# Built client (served as static files by the server)
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
