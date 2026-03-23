#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════╗
# ║   SWIK — AI Agent Headquarters                       ║
# ║   https://github.com/Chintanpatel24/swik             ║
# ╚═══════════════════════════════════════════════════════╝
set -e

GREEN='\033[0;32m'; AMBER='\033[0;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ███████╗██╗    ██╗██╗██╗  ██╗"
  echo "  ██╔════╝██║    ██║██║██║ ██╔╝"
  echo "  ███████╗██║ █╗ ██║██║█████╔╝ "
  echo "  ╚════██║██║███╗██║██║██╔═██╗ "
  echo "  ███████║╚███╔███╔╝██║██║  ██╗"
  echo "  ╚══════╝ ╚══╝╚══╝ ╚═╝╚═╝  ╚═╝"
  echo -e "${NC}${BOLD}  AI Agent Headquarters${NC}"
  echo -e "  ${CYAN}github.com/Chintanpatel24/swik${NC}"
  echo ""
}

banner

# ── Mode selection ────────────────────────────────────────────
MODE=${1:-"web"}

case $MODE in
  web)
    echo -e "${BOLD}Mode: Web Browser${NC} (http://localhost:5175)"
    ;;
  desktop)
    echo -e "${BOLD}Mode: Electron Desktop App${NC}"
    ;;
  docker)
    echo -e "${BOLD}Mode: Docker${NC}"
    docker compose up -d
    echo -e "${GREEN}✓ SWIK running at http://localhost:7843${NC}"
    exit 0
    ;;
  docker-local)
    echo -e "${BOLD}Mode: Docker + Local AI (Ollama)${NC}"
    docker compose --profile local-ai up -d
    echo -e "${GREEN}✓ SWIK + Ollama running at http://localhost:7843${NC}"
    exit 0
    ;;
  *)
    echo "Usage: ./start.sh [web|desktop|docker|docker-local]"
    exit 1
    ;;
esac

# ── Node check ────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from nodejs.org${NC}"; exit 1
fi
NODE_MAJ=$(node -e "process.stdout.write(process.version.split('.')[0].slice(1))")
if [ "$NODE_MAJ" -lt 18 ]; then
  echo -e "${RED}✗ Node.js 18+ required (found $(node -v))${NC}"; exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── .env ─────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${AMBER}⚠  Created .env from .env.example — edit it to configure your AI provider${NC}"
fi

# ── AI provider setup ─────────────────────────────────────────
PROVIDER=$(grep '^SWIK_DEFAULT_PROVIDER' .env 2>/dev/null | cut -d= -f2 | tr -d ' "')
PROVIDER=${PROVIDER:-ollama}

if [ "$PROVIDER" = "ollama" ]; then
  if command -v ollama &>/dev/null; then
    if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
      echo -e "${AMBER}⚠  Starting Ollama...${NC}"
      ollama serve &>/dev/null & sleep 3
    fi
    MODEL=$(grep '^SWIK_DEFAULT_MODEL' .env 2>/dev/null | cut -d= -f2 | tr -d ' "')
    MODEL=${MODEL:-llama3.2}
    if ! ollama list 2>/dev/null | grep -q "^${MODEL}"; then
      echo -e "${AMBER}⚠  Pulling ${MODEL} (~2GB, first run only)...${NC}"
      ollama pull "$MODEL"
    fi
    echo -e "${GREEN}✓ Ollama ready — model: ${MODEL}${NC}"
  else
    echo -e "${AMBER}⚠  Ollama not found. Install from ollama.com or set a different provider in .env${NC}"
  fi
else
  echo -e "${GREEN}✓ AI provider: ${PROVIDER}${NC}"
fi

# ── USB portable mode ─────────────────────────────────────────
if [ -f .swik-portable ]; then
  echo -e "${AMBER}💾 USB portable mode active — data stays in this directory${NC}"
  export SWIK_DATA_DIR="$(pwd)/swik-data"
fi

# ── Dependencies ──────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "▶ Installing dependencies..."
  npm install --silent
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# ── Launch ────────────────────────────────────────────────────
cleanup() { kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; echo "Stopped."; }
trap cleanup EXIT INT TERM

echo "▶ Starting backend on http://localhost:7843 ..."
node backend/src/server.js &
BACKEND_PID=$!
sleep 2

if [ "$MODE" = "desktop" ]; then
  echo "▶ Starting Electron desktop app..."
  npx vite --port 5175 &
  FRONTEND_PID=$!
  sleep 2
  npx electron . &
  ELECTRON_PID=$!
  echo ""
  echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║  ✓ SWIK Desktop App is running        ║${NC}"
  echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════╝${NC}"
else
  echo "▶ Starting frontend on http://localhost:5175 ..."
  npx vite --port 5175 &
  FRONTEND_PID=$!
  echo ""
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║  ✓ SWIK HQ is LIVE                         ║${NC}"
  echo -e "${GREEN}${BOLD}║                                            ║${NC}"
  echo -e "${GREEN}${BOLD}║  Open: http://localhost:5175               ║${NC}"
  echo -e "${GREEN}${BOLD}║  API:  http://localhost:7843               ║${NC}"
  echo -e "${GREEN}${BOLD}║                                            ║${NC}"
  echo -e "${GREEN}${BOLD}║  Press Ctrl+C to stop                      ║${NC}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════╝${NC}"
fi
echo ""
wait
