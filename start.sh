#!/usr/bin/env bash
# NEXUS — Start script
set -e

echo ""
echo "🔮 NEXUS — AI Agent Platform"
echo "================================"
echo ""

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# Install npm deps if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node dependencies..."
  npm install
fi

# Check Python
if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
else
  echo "⚠️  Python not found — running without Python agent server"
  npm run start:no-python
  exit 0
fi

# Install Python deps if needed
if ! $PYTHON -c "import fastapi" &>/dev/null 2>&1; then
  echo "📦 Installing Python dependencies..."
  $PYTHON -m pip install -r agents/requirements.txt --quiet
fi

echo "✅ All dependencies ready"
echo ""
echo "Starting NEXUS..."
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo "  Python:   http://localhost:8765"
echo ""

npm start
