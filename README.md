# ⬡ AgentOffice

A visual multi-agent AI office that runs as a **desktop app on Linux**. Inspired by The Delegation — using the same `office.glb` + `character.glb` 3D assets, OrbitControls camera, and React screen-space overlay architecture.

**100% local. No cloud. No accounts. No API keys required** (using Ollama).

---

## What it looks like

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⬡ AGENTOFFICE          Rex · Nova · Pixel · Scout · Quill    12:34:56  │
├───────────┬────────────────────────────────────────┬────────────────────┤
│  TEAM     │                                        │  💬  ⚡  📁        │
│           │   [3D Office Room — three.js]          │                    │
│  BOSS     │                                        │  Message bubbles,  │
│  ● Rex    │   Agents sit at desks as 3D characters │  task dispatch,    │
│           │   and animate (sit_work, talk, happy)  │  workspace files   │
│  DEV      │                                        │                    │
│  ● Nova ✎ │   Name/status bubbles float above      │                    │
│           │   each agent's head in screen-space    │                    │
│  DESIGN   │                                        │                    │
│  ● Pixel✎ │   Connection lines between talking     │                    │
│           │   agents                               │                    │
│ + ADD     │   Drag to orbit · Scroll to zoom       │                    │
└───────────┴────────────────────────────────────────┴────────────────────┘
```

---

## Features

| Feature | Detail |
|---------|--------|
| **3D office** | Real `office.glb` + animated `character.glb` via Three.js |
| **OrbitControls** | Drag to orbit, scroll to zoom, camera follows selected agent |
| **React overlay** | Screen-projected name/status bubbles above each character |
| **Agent animations** | `Sit_Idle`, `Sit_Work`, `Talk`, `Happy` based on live status |
| **5 default agents** | Rex (boss), Nova (dev), Pixel (designer), Scout (researcher), Quill (writer) |
| **Custom agents** | Create unlimited agents with any name, role, color, model |
| **Multi-AI support** | Ollama, LM Studio, Groq, OpenAI, any OpenAI-compatible API |
| **Boss orchestration** | Boss breaks down tasks → delegates to team → synthesises results |
| **Direct chat** | Talk to any individual agent one-on-one |
| **Web search tool** | Agents use DuckDuckGo search (free, no key) |
| **Sandboxed files** | Each agent has an isolated workspace; cannot touch your system |
| **File browser** | See and read files agents produce, with copy button |
| **Toast notifications** | Live pop-ups when tasks complete or fail |
| **USB portable** | Drop `.agentoffice-portable` next to AppImage → data stays on USB |

---

## Quickstart (Browser Dev Mode)

```bash
# 1. Install Ollama and pull a model
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull llama3.2      # 2 GB — recommended

# 2. Run
cd agentoffice
./start.sh
# → opens http://localhost:5174
```

## Quickstart (Electron Desktop App)

```bash
cd agentoffice
npm install
npm run dev    # Electron window opens automatically
```

---

## Project Structure

```
agentoffice/
│
├── electron/
│   ├── main.js           ← Electron shell, window, USB detection
│   └── preload.js        ← Secure IPC bridge
│
├── backend/src/
│   ├── server.js         ← Express + WebSocket (port 7842)
│   ├── db.js             ← SQLite: agents, tasks, messages
│   ├── agents/
│   │   ├── orchestrator.js    ← Boss coordinates the team
│   │   ├── agentExecutor.js   ← Single agent runs task with tools
│   │   └── aiRunner.js        ← Ollama + OpenAI-compat AI calls
│   └── tools/
│       ├── webSearch.js       ← DuckDuckGo (free, no key)
│       └── fileSystem.js      ← Sandboxed per-agent workspace
│
├── public/
│   ├── models/
│   │   ├── office.glb         ← 3D office room (from The Delegation)
│   │   └── character.glb      ← Animated character (from The Delegation)
│   └── vendor/draco/          ← DRACO decoders for compressed GLB
│
└── src/
    ├── App.jsx
    ├── three/
    │   ├── SceneManager.js    ← Orchestrates all Three.js subsystems
    │   ├── Stage.js           ← Camera (45°, pos 10/8/15), OrbitControls, lights
    │   ├── WorldManager.js    ← Loads office.glb + DRACO, theme color
    │   ├── CharacterManager.js ← SkeletonUtils.clone, AnimationMixer per agent
    │   └── InputManager.js    ← Raycasts clicks/hovers → agentId
    ├── components/
    │   ├── Office/
    │   │   ├── OfficeCanvas.jsx   ← Mounts Three.js + React bubble overlay
    │   │   ├── Sidebar.jsx        ← Agent roster with edit buttons
    │   │   ├── TitleBar.jsx       ← Frameless window controls
    │   │   └── ToastStack.jsx     ← Pop-up notifications
    │   ├── Chat/ChatPanel.jsx     ← Messages + task dispatch form
    │   ├── Task/
    │   │   ├── TaskPanel.jsx      ← Task list + results
    │   │   └── WorkspacePanel.jsx ← File browser for agent output
    │   └── Settings/
    │       └── AgentEditor.jsx    ← Tabbed create/edit modal
    └── hooks/useOffice.js         ← WebSocket state + all API calls
```

---

## Adding Agents

Click **+ ADD AGENT** in the sidebar. Configure:

| Tab | Fields |
|-----|--------|
| **Identity** | Name, role, colour, skills list |
| **AI Model** | Provider (Ollama/Groq/OpenAI/etc), API URL, API key, model |
| **Behaviour** | System prompt (or use a preset) |

---

## Dispatching Tasks

1. Click **⚡ TASKS** → **NEW TASK** (or use the Chat panel)
2. Write a title and description
3. Hit **DISPATCH TO TEAM**

The Boss agent (Rex by default) plans, delegates to the right agents, each works (with web search + file I/O if needed), and Rex synthesises the final result.

---

## AI Providers

| Provider | Type | Cost | Setup |
|----------|------|------|-------|
| Ollama | Local | **Free** | `ollama serve && ollama pull llama3.2` |
| LM Studio | Local | **Free** | Enable local server in LM Studio |
| Groq | Cloud | **Free tier** | `console.groq.com` |
| OpenAI | Cloud | Paid | `platform.openai.com` |
| llama.cpp | Local | **Free** | Run with `--server` flag |

Each agent can use a **different provider and model** — mix and match.

---

## USB Portable Mode

```bash
npm run portable          # builds AgentOffice.AppImage

# Enable USB mode:
touch /path/to/usb/.agentoffice-portable

# Copy AppImage to same USB — all data (SQLite, workspaces) stays on USB
```

---

## Credits

3D assets (`office.glb`, `character.glb`) and Three.js architecture patterns from [The Delegation](https://github.com/google-gemini/the-delegation) — Apache 2.0 License.
