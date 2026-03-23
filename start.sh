#!/usr/bin/env bash
# TechScan Agent — dev launcher (no Docker required)
set -e

GREEN='\033[0;32m'; AMBER='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   TECHSCAN AGENT — Local Dev Mode            ║"
echo "║   100% Free · Powered by Ollama              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Check Ollama ──
if ! command -v ollama &>/dev/null; then
  echo -e "${RED}✗ Ollama not found.${NC}"
  echo "  macOS:  brew install ollama"
  echo "  Linux:  curl -fsSL https://ollama.com/install.sh | sh"
  echo "  Win:    https://ollama.com/download/windows"
  exit 1
fi
echo -e "${GREEN}✓ Ollama found${NC}"

# ── Start Ollama if not running ──
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
  echo -e "${AMBER}⚠  Starting Ollama server...${NC}"
  ollama serve &>/dev/null &
  OLLAMA_PID=$!
  sleep 3
fi

# ── Pull model if needed ──
MODEL="${OLLAMA_MODEL:-llama3.2}"
if ! ollama list 2>/dev/null | grep -q "^${MODEL}"; then
  echo -e "${AMBER}⚠  Model '${MODEL}' not found. Pulling now (~2GB)...${NC}"
  ollama pull "$MODEL"
fi
echo -e "${GREEN}✓ Model ready: ${MODEL}${NC}"
echo ""

# ── Install deps ──
echo "▶ Backend dependencies..."
cd backend && npm install --silent && cd ..

echo "▶ Frontend dependencies..."
cd frontend && npm install --silent && cd ..

echo ""
echo "▶ Starting backend on http://localhost:3001 ..."
(cd backend && OLLAMA_MODEL="$MODEL" node src/server.js) &
BACKEND_PID=$!

sleep 2

echo "▶ Starting frontend on http://localhost:5173 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✓ TechScan Agent is LIVE                    ║"
echo "║                                              ║"
echo "║  Dashboard  →  http://localhost:5173         ║"
echo "║  Backend    →  http://localhost:3001         ║"
echo "║  Model      →  ${MODEL}                      ║"
echo "║                                              ║"
echo "║  Press Ctrl+C to stop all services           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID ${OLLAMA_PID:-} 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM
wait $BACKEND_PID $FRONTEND_PID
