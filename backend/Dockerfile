FROM node:20-alpine

RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY src/ ./src/

# Data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV OLLAMA_URL=http://ollama:11434
ENV OLLAMA_MODEL=llama3.2
ENV SCAN_INTERVAL_MINUTES=30
ENV TIMEZONE=Asia/Kolkata
ENV FRONTEND_URL=http://localhost:5173

CMD ["node", "src/server.js"]
