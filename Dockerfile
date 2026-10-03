# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Dependências de compilação para módulos nativos (better-sqlite3, sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Instala todas as dependências
COPY package*.json ./
RUN npm ci

# Copia configurações e código-fonte
COPY tsconfig.json tsup.config.ts ./
COPY src/ ./src/

# Compila o projeto com tsup -> dist/server.js
RUN npm run build

# Remove devDependencies para manter apenas o necessário em produção
RUN npm prune --production && npm cache clean --force

# ── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DASHBOARD_PORT=3001

# Dependências mínimas de runtime (curl para healthcheck, openssl para Baileys/crypto)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    openssl \
  && rm -rf /var/lib/apt/lists/*

# Copia dependências de produção e artefatos compilados
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Cria diretório de sessões persistentes com permissão para o usuário node
RUN mkdir -p /app/sessions && chown -R node:node /app

USER node

# Portas da aplicação (3000: API REST, 3001: EcoHub Dashboard)
EXPOSE 3000 3001

# Volume para persistir as sessões SQLite do WhatsApp
VOLUME ["/app/sessions"]

# Verificação de saúde da aplicação
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
