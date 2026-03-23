#!/usr/bin/env bash
# AgentOffice — start in dev mode (no Electron, just browser)
set -e

GREEN='\033[0;32m'; AMBER='\033[0;33m'; NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ⬡  AGENTOFFICE                         ║"
echo "║   Visual Multi-Agent AI Office           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Node
if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found. Install from nodejs.org"
  exit 1
fi
NODE_VER=$(node -e "process.stdout.write(process.version.split('.')[0].slice(1))")
if [ "$NODE_VER" -lt 18 ]; then
  echo "✗ Node.js 18+ required (found v$NODE_VER)"
  exit 1
fi

# Check Ollama
if command -v ollama &>/dev/null; then
  if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${AMBER}⚠  Starting Ollama...${NC}"
    ollama serve &>/dev/null &
    sleep 3
  fi
  if ! ollama list 2>/dev/null | grep -q "llama3.2"; then
    echo -e "${AMBER}⚠  Pulling llama3.2 model...${NC}"
    ollama pull llama3.2
  fi
  echo -e "${GREEN}✓ Ollama ready${NC}"
else
  echo -e "${AMBER}⚠  Ollama not found — agents won't have AI. Install from ollama.com${NC}"
fi

echo ""
echo "▶ Installing dependencies..."
npm install --silent

echo ""
echo "▶ Starting backend on http://localhost:7842 ..."
node backend/src/server.js &
BACKEND_PID=$!
sleep 2

echo "▶ Starting frontend on http://localhost:5174 ..."
npx vite --port 5174 &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ AgentOffice running!                  ║${NC}"
echo -e "${GREEN}║  Open: http://localhost:5174             ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

cleanup() {
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  echo "Stopped."
}
trap cleanup EXIT INT TERM
wait $BACKEND_PID $FRONTEND_PID
