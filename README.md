# 🤖 Swik Agent

A **24/7 self-running tech intelligence agent** — 100% free, no paid APIs, no accounts.

Scrapes Hacker News, GitHub Trending, Dev.to, and Reddit every 30 minutes, then uses a **local Ollama AI** to generate personalised digests saved to a private summary window. Streams live to a React dashboard over WebSocket. Persists everything in SQLite.

---

## Features

- **Zero cost** — Ollama runs the LLM locally; all data sources are free public APIs
- **Personalised** — set your interests (Rust, AI, DevOps…) and every digest is tailored to them
- **24/7 agent loop** — node-cron scheduler, auto-restarts via Docker
- **Real-time dashboard** — live activity log + private summary window over WebSocket
- **Persistent** — SQLite stores all digests, logs, interests, and settings across restarts
- **Configurable** — scan interval, model choice, timezone — all via UI or env vars
- **Docker-ready** — one command brings up Ollama + backend + frontend

---

## Architecture

```
techscan-agent/
├── docker-compose.yml          ← Full stack: Ollama + backend + frontend
├── .env.example                ← Environment variable reference
├── start.sh                    ← Dev mode launcher (no Docker needed)
│
├── backend/
│   ├── Dockerfile
│   ├── package.json            ← Zero paid dependencies
│   └── src/
│       ├── server.js           ← Express + WebSocket server
│       ├── agent.js            ← Core 24/7 agent loop + cron scheduler
│       ├── ai.js               ← Ollama integration (local free AI)
│       ├── db.js               ← SQLite: summaries, interests, settings, logs
│       ├── config.js           ← Central config from env vars
│       └── sources/
│           ├── hackernews.js   ← HN Firebase API
│           ├── github.js       ← GitHub Search API (trending repos)
│           ├── devto.js        ← Dev.to public API
│           └── reddit.js       ← Reddit JSON API
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf              ← Proxies /api and /ws to backend
    └── src/
        ├── App.jsx / App.css
        ├── components/
        │   ├── Header.jsx          ← Status bar, controls, model pill
        │   ├── OllamaStatus.jsx    ← Live Ollama health indicator
        │   ├── ActivityLog.jsx     ← Real-time agent log panel
        │   ├── SummaryPanel.jsx    ← Digest list with interests bar
        │   ├── SummaryCard.jsx     ← Collapsible digest (delete support)
        │   ├── SettingsPanel.jsx   ← Interests + scan interval config
        │   └── StatsPanel.jsx      ← KPIs, source breakdown, scan history
        └── hooks/
            ├── useAgentSocket.js   ← WebSocket state + all API calls
            └── useCountdown.js     ← Next-scan countdown timer
```

---

## Option A — Docker (recommended for 24/7)

```bash
# 1. Clone / unzip the project
cd swik
# 2. Copy env file (optional — defaults work fine)
cp .env.example .env

# 3. Start everything (Ollama + model pull + backend + frontend)
docker compose up -d

# 4. Watch logs
docker compose logs -f backend

# 5. Open the dashboard
open http://localhost:5173
```

First run downloads the Ollama image and pulls the model (~2GB for llama3.2).  
Subsequent starts are instant — model weights are cached in a Docker volume.

**To stop:**
```bash
docker compose down
```

**To change model:**
```bash
# Edit .env
OLLAMA_MODEL=mistral

# Restart
docker compose up -d
```

---

## Option B — Local dev (no Docker)

### Requirements
- Node.js 18+
- Ollama installed and running

### 1. Install Ollama

| Platform | Command |
|----------|---------|
| macOS    | `brew install ollama` |
| Linux    | `curl -fsSL https://ollama.com/install.sh \| sh` |
| Windows  | Download from ollama.com/download/windows |

```bash
ollama serve
ollama pull llama3.2     # 2GB — recommended
```

### 2. Run

```bash
./start.sh
# or manually:
cd backend && npm install && npm start &
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**

---

## Configuration

### Environment variables

| Variable                | Default                  | Description                   |
|-------------------------|--------------------------|-------------------------------|
| `OLLAMA_URL`            | http://localhost:11434   | Ollama API endpoint            |
| `OLLAMA_MODEL`          | llama3.2                 | Model to use for summaries     |
| `SCAN_INTERVAL_MINUTES` | 30                       | How often to scan              |
| `TIMEZONE`              | Asia/Kolkata             | Timestamp timezone             |
| `PORT`                  | 3001                     | Backend HTTP/WS port           |
| `FRONTEND_URL`          | http://localhost:5173    | CORS origin for backend        |

### In-app settings (via ⚙ button)

- **Interests** — add/toggle/remove topics; AI personalises every digest around them
- **Scan interval** — change frequency live without restarting

---

## API Reference

| Method | Path                  | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | /api/health           | Health check + uptime                |
| GET    | /api/status           | Agent state (scanning, next scan…)   |
| GET    | /api/ollama           | Ollama connectivity + model list     |
| GET    | /api/summaries        | All saved digests                    |
| DELETE | /api/summaries/:id    | Delete a digest                      |
| GET    | /api/logs             | Activity log entries                 |
| DELETE | /api/logs             | Clear all logs                       |
| POST   | /api/scan             | Trigger a manual scan                |
| GET    | /api/interests        | List all interests                   |
| POST   | /api/interests        | Add an interest `{ topic }`          |
| PATCH  | /api/interests/:id    | Toggle interest `{ enabled }`        |
| DELETE | /api/interests/:id    | Remove an interest                   |
| GET    | /api/settings         | All settings key/value               |
| POST   | /api/settings         | Save setting `{ key, value }`        |
| GET    | /api/stats            | Scan stats, source breakdown         |

---

## Choosing a Model

| Model      | Size  | Speed   | Quality  | Best for               |
|------------|-------|---------|----------|------------------------|
| llama3.2   | 2GB   | ★★★★★  | ★★★★☆   | Recommended default    |
| phi3       | 1.7GB | ★★★★★  | ★★★☆☆   | Low RAM / fast machine |
| mistral    | 4GB   | ★★★☆☆  | ★★★★★   | Best summary quality   |
| gemma2     | 5GB   | ★★★☆☆  | ★★★★★   | Google's top model     |

---

## Cost Breakdown

| Component            | Cost    |
|----------------------|---------|
| Ollama + models      | Free    |
| Hacker News API      | Free    |
| GitHub API           | Free    |
| Dev.to API           | Free    |
| Reddit API           | Free    |
| SQLite               | Free    |
| Node.js / React      | Free    |
| **Total**            | **$0**  |
