FROM node:20-alpine AS builder

WORKDIR /app

# Install build deps for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Install all deps
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# ── Production image ──────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache sqlite wget

# Copy built assets and backend
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/backend      ./backend
COPY --from=builder /app/public       ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create data directory
RUN mkdir -p /data

ENV NODE_ENV=production
ENV SWIK_DATA_DIR=/data
ENV PORT=7843

EXPOSE 7843

CMD ["node", "backend/src/server.js"]
