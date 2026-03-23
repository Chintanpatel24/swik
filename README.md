<div align="center">

# ⬡ SWIK
### AI Agent Headquarters

**A visual multi-agent AI office that runs on your desktop, from a USB drive, or as a web app.**
Built for developers who want a permanent AI team working alongside them — local, private, and free.

[![GitHub](https://img.shields.io/badge/GitHub-Chintanpatel24%2Fswik-blue?style=flat-square&logo=github)](https://github.com/Chintanpatel24/swik)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18+-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![Three.js](https://img.shields.io/badge/Three.js-r163-black?style=flat-square&logo=threedotjs)](https://threejs.org)

</div>

---

## What is SWIK?

SWIK is an AI agent headquarters where each agent has a **physical presence** in a 3D building. Agents live on different floors, animate when they're thinking or working, and show status bubbles above their heads in real time.

You give the team a task. The Boss agent on Floor 3 (Penthouse) plans it, delegates subtasks to workers on Floors 1 and 2, each agent works with tools (web search, file I/O), and the Boss synthesises a final result — all visible as live activity in the 3D office.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⬡ SWIK HQ  ● LIVE  5 AGENTS  1 RUNNING                12:34:56  ─  □  ✕  │
├──────────────────────────────────────────────────────────────────────────┤
│ ⬡ OLLAMA — llama3.2, mistral                                             │
├──────────┬──────────────────────────────────────────┬────────────────────┤
│ FLOOR 3  │                                          │ 💬 CHAT            │
│ Penthouse│  ┌──────────────────────────────────┐    │                    │
│ ● Rex    │  │  3D Building — Three.js WebGL    │    │ Messages stream    │
│          │  │                                  │    │ between agents in  │
│ FLOOR 2  │  │  Floor 3 ── Rex (Boss) 💭thinking│    │ real time          │
│ Mid      │  │  Floor 2 ── Pixel · Scout        │    ├────────────────────┤
│ ● Pixel  │  │  Floor 1 ── Nova  · Axel ⚙working│    │    ⚡ TASKS         │
│ ● Scout  │  │                                  │    │                    │
│          │  │  Drag to orbit · Scroll to zoom  │    │ Task cards with    │
│ FLOOR 1  │  └──────────────────────────────────┘    │ live results       │
│ Ground   │                                          ├────────────────────┤
│ ● Nova   │  Rex  ·  Floor 3  ·  llama3.2            │     📁 FILES       │
│ ● Axel   │  planning  delegation  leadership        │                    │
│          │  [planning][delegation][synthesis]       │ Browse workspace   │
│ + ADD    │                          ✎ EDIT          │ files per agent    │
└──────────┴──────────────────────────────────────────┴────────────────────┘
```

---

## Features

| Feature | Detail |
|---------|--------|
| **3D HQ Building** | Real `office.glb` + animated `character.glb` rendered with Three.js WebGL |
| **Multi-floor layout** | Floor 1 (Dev/Research), Floor 2 (Design/Strategy), Floor 3 (Boss/Penthouse) |
| **Live animations** | Characters animate `Sit_Work`, `Talk`, `Happy` etc. based on real agent status |
| **Screen-space bubbles** | React name/status labels projected from 3D world → screen pixels each frame |
| **5 default agents** | Rex (boss/F3), Nova + Axel (devs/F1), Pixel + Scout (design+research/F2) |
| **Unlimited agents** | Add as many agents as you want, assign to any floor and desk |
| **Named agents** | Give each agent a name, role, colour, floor, and custom personality |
| **Boss orchestration** | Boss plans → workers execute in parallel → Boss synthesises results |
| **Direct chat** | Talk to any individual agent one-on-one |
| **Tool use** | Agents search the web (DuckDuckGo, free) and read/write sandboxed files |
| **Multi-AI support** | Ollama (local/free) · Groq (cloud/free) · OpenAI · LM Studio · any OpenAI-compatible |
| **Per-agent models** | Each agent can use a completely different AI provider and model |
| **File browser** | See and read every file an agent has produced, with copy button |
| **Toast notifications** | Live pop-ups when tasks complete, fail, or agents join |
| **USB portable** | Place `.swik-portable` next to the binary — all data stays on the USB |
| **Web deployment** | Deploy with Docker and use from any browser with any cloud AI API |
| **Desktop app** | Electron builds for Linux (AppImage/deb) and Windows |

---

## Quick Start

### Option 1 — Web browser (simplest)

```bash
# 1. Install Ollama (free local AI) — or configure a cloud API in .env
curl -fsSL https://ollama.com/install.sh | sh
ollama serve & ollama pull llama3.2

# 2. Clone and run
git clone https://github.com/Chintanpatel24/swik
cd swik
./start.sh web
```

Open **http://localhost:5175**

### Option 2 — Desktop Electron app

```bash
cd swik
npm install
npm run dev       # opens Electron window automatically
```

### Option 3 — Docker (production / web deployment)

```bash
cd swik
cp .env.example .env
# Edit .env — set your AI provider keys

docker compose up -d
```

Open **http://localhost:7843**

With local AI (Ollama inside Docker):
```bash
docker compose --profile local-ai up -d
```

### Option 4 — USB Portable

```bash
# Build portable AppImage
npm run package:linux

# Enable USB mode
touch /path/to/usb/.swik-portable
cp dist/SWIK-*.AppImage /path/to/usb/

# Plug into any Linux machine — all data (agents, tasks, files) stays on the USB
```

---

## Building Layout

```
Floor 3 — Penthouse  ← Boss agents (planning, delegation, synthesis)
Floor 2 — Mid Floor  ← Design, research, analysis
Floor 1 — Ground     ← Development, engineering, DevOps
```

Assign any agent to any floor. The 3D building stacks all three floors so you can orbit the camera to see all levels simultaneously.

---

## Project Structure

```
swik/
│
├── start.sh                    ← One-command launcher (web/desktop/docker)
├── docker-compose.yml          ← Full web deployment with optional Ollama
├── Dockerfile                  ← Multi-stage production build
├── .env.example                ← All configuration options documented
│
├── electron/
│   ├── main.js                 ← Window, USB portable detection, IPC
│   └── preload.js              ← Secure bridge to renderer
│
├── backend/src/
│   ├── server.js               ← Express + WebSocket + static serving
│   ├── db.js                   ← SQLite (floors, agents, tasks, messages)
│   ├── config.js               ← Centralised config from .env
│   ├── agents/
│   │   ├── orchestrator.js     ← Boss plans → delegates → synthesises
│   │   ├── agentExecutor.js    ← Single agent + tool-use loop
│   │   └── aiRunner.js         ← Ollama + OpenAI-compat API calls
│   └── tools/
│       ├── webSearch.js        ← DuckDuckGo (free) + SerpAPI fallback
│       └── fileSystem.js       ← Sandboxed per-agent workspace
│
├── public/
│   ├── models/
│   │   ├── office.glb          ← 3D office room (from The Delegation)
│   │   └── character.glb       ← Animated character (from The Delegation)
│   └── vendor/draco/           ← DRACO mesh decoders
│
└── src/
    ├── App.jsx                 ← Root layout
    ├── hooks/useSwik.js        ← WebSocket state + all API helpers
    ├── three/
    │   ├── Stage.js            ← Camera (45°), OrbitControls, lights
    │   ├── BuildingManager.js  ← Loads office.glb × 3 floors, fallback procedural
    │   ├── CharacterManager.js ← SkeletonUtils.clone, AnimationMixer per agent
    │   └── SceneManager.js     ← Orchestrates render loop + bubble projection
    ├── components/
    │   ├── Building/
    │   │   ├── TitleBar.jsx    ← Frameless window bar, USB badge, clock
    │   │   ├── Sidebar.jsx     ← Floor-grouped agent roster
    │   │   └── BuildingCanvas.jsx ← Three.js mount + React bubble overlay
    │   ├── Chat/
    │   │   └── ChatPanel.jsx   ← DM + task dispatch form
    │   ├── Task/
    │   │   └── TaskPanels.jsx  ← Task list + workspace file browser
    │   ├── Settings/
    │   │   └── AgentEditor.jsx ← Tabbed create/edit modal with floor selector
    │   └── Common/
    │       ├── ToastStack.jsx  ← Slide-in notifications
    │       └── AIStatusBar.jsx ← Live AI provider health check
    └── styles/main.css         ← Full dark HQ design system
```

---

## Configuration

Copy `.env.example` to `.env` and set your values:

```bash
cp .env.example .env
```

Key settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `SWIK_DEFAULT_PROVIDER` | `ollama` | AI provider for new agents |
| `SWIK_DEFAULT_MODEL` | `llama3.2` | Default model name |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `GROQ_API_KEY` | — | Groq cloud API key |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `SWIK_DATA_DIR` | `~/.config/swik` | Where data is stored (set to USB path for portable mode) |
| `PORT` | `7843` | Backend port |

---

## Web Deployment

SWIK can be deployed as a full web app for use from any device:

```bash
# Build and serve with Docker
docker compose up -d

# Access from any browser on your network
open http://your-server-ip:7843
```

For production with a custom domain, put nginx in front:

```nginx
server {
    listen 80;
    server_name swik.yourdomain.com;
    location / { proxy_pass http://localhost:7843; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
}
```

---

## Open Source & Credits

SWIK is MIT licensed and fully open source.
**Repo:** [github.com/Chintanpatel24/swik](https://github.com/Chintanpatel24/swik)

### Built on the shoulders of giants

| Project | Use in SWIK | License |
|---------|-------------|---------|
| [**The Delegation**](https://github.com/google-gemini/the-delegation) by Google Gemini | `office.glb` + `character.glb` 3D assets, Three.js architecture patterns (Stage/WorldManager/CharacterManager/OrbitControls setup) | Apache 2.0 |
| [**MiroFish**](https://github.com/666ghj/MiroFish) by 666ghj | Multi-agent orchestration patterns, LLM client design (OpenAI-compatible wrapper), agent tool-use loop | MIT |
| [**Three.js**](https://threejs.org) | 3D WebGL rendering engine | MIT |
| [**Ollama**](https://ollama.com) | Local AI model runner | MIT |
| [**better-sqlite3**](https://github.com/WiseLibs/better-sqlite3) | SQLite database | MIT |
| [**Electron**](https://www.electronjs.org) | Desktop app shell | MIT |

### Contributing

PRs welcome! Ideas for contributions:
- More floor types (server room, meeting room, reception)
- Agent-to-agent real-time conversation visualization
- Custom 3D avatar skins per role
- Plugin system for new tools (GitHub, Jira, Slack)
- Memory system (vector DB for long-term agent memory)
- Export task results as PDF/Markdown

---

<div align="center">
Made with ❤️ by <a href="https://github.com/Chintanpatel24">Chintan Patel</a> · 
<a href="https://github.com/Chintanpatel24/swik">github.com/Chintanpatel24/swik</a>
</div>
