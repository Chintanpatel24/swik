# ⬡ AgentOffice

A visual multi-agent AI office that runs as a **Linux desktop app** (Electron).  
Plug in a USB, open it, and your whole team of AI agents is ready to work — **no internet, no cloud, no API keys required**.

---

## What it is

AgentOffice is an open-source desktop application where you create a team of AI agents, give each one a name, role, skills, and a local AI model, then watch them collaborate on tasks in a visual office environment. Agents sit at desks, communicate with each other, use tools like web search and a sandboxed file system, and produce real output.

```
┌─────────────────────────────────────────────────────────────────┐
│ ⬡ AGENTOFFICE                              12:34:56  ─  □  ✕  │
├──────────┬───────────────────────────────────────┬──────────────┤
│  TEAM    │                                       │ 💬 CHAT      │
│          │   ╔══════╗      ╔══════╗              │              │
│  BOSS    │   ║ Rex  ║      ║ Nova ║              │  Messages    │
│  ● Rex   │   ║ boss ║──────║ dev  ║              │  stream here │
│          │   ╚══════╝      ╚══════╝              │              │
│  DEV     │                                       │ ⚡ TASKS     │
│  ● Nova  │   ╔══════╗      ╔══════╗              │              │
│          │   ║Pixel ║      ║Scout ║              │  Task list   │
│  DESIGN  │   ║design║      ║ res  ║              │  + results   │
│  ● Pixel │   ╚══════╝      ╚══════╝              │              │
│          │                                       │              │
│ + NEW    │  Alt+drag to pan · Click to select    │              │
└──────────┴───────────────────────────────────────┴──────────────┘
```

---

## Features

- **Visual office** — agents sit at draggable desks, connection lines appear when they communicate
- **Named agents** — give any agent a name, role, avatar, and custom colour
- **Role system** — Boss (orchestrates), Developer, Designer, Researcher, Writer, or any custom role
- **Skill assignment** — each agent has a skills list the AI uses to stay in-character
- **Multi-model** — each agent can use a different AI: Ollama (local/free), LM Studio, Groq, OpenAI, or any OpenAI-compatible API
- **Tool use** — agents can search the web (DuckDuckGo, free) and read/write files
- **Isolated workspace** — each agent gets a sandboxed folder; they cannot touch your system files
- **Boss orchestration** — give a task to the team; Boss breaks it down, delegates to the right agents, synthesises results
- **Direct chat** — talk to any agent one-on-one
- **USB portable** — place a `.agentoffice-portable` file next to the AppImage; all data stays on the USB

---

## Quickstart

### 1. Install Ollama (free local AI)

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull llama3.2          # 2 GB — recommended
```

### 2. Install & run

```bash
# Clone / unzip
cd agentoffice
npm install

# Development mode (Electron + Vite + backend all start together)
npm run dev
```

### 3. Build portable AppImage (USB mode)

```bash
npm run portable
# → dist/AgentOffice-portable.AppImage

# To use USB mode: copy to USB, then:
touch /path/to/usb/.agentoffice-portable
# All data (agents, tasks, workspaces) stays on the USB
```

---

## Adding agents

Click **+ NEW AGENT** in the sidebar or hit the **+** button in the office.

| Field | Description |
|-------|-------------|
| Name | What the agent is called (e.g. "Zara", "Dev-01") |
| Role | boss / developer / designer / researcher / writer / custom |
| Avatar | Visual character style |
| Colour | Desk accent colour |
| AI Provider | Ollama · LM Studio · Groq · OpenAI · Any compatible |
| API URL | Where the AI runs (default: http://localhost:11434 for Ollama) |
| API Key | Leave blank for Ollama/LM Studio; required for Groq/OpenAI |
| Model | llama3.2, gpt-4o, mixtral, phi3, etc. |
| System Prompt | The agent's personality, expertise, and instructions |
| Skills | Comma-separated skills shown to the AI and in the UI |

---

## Dispatching tasks

1. Click **⚡ NEW TASK** in the chat panel
2. Write a title and detailed description
3. Click **DISPATCH TO TEAM**

The Boss agent:
1. Analyses the task
2. Breaks it into subtasks
3. Assigns each subtask to the best-suited agent
4. Each agent works (with tool use if needed)
5. Boss synthesises all results into a final summary

---

## Agent tools

| Tool | Description | Free? |
|------|-------------|-------|
| `web_search` | DuckDuckGo search | ✓ |
| `file_write` | Write files to agent's workspace | ✓ |
| `file_read` | Read files from agent's workspace | ✓ |
| `file_list` | List files in workspace | ✓ |

Agents call tools automatically when needed. Workspace files are stored in:
- **Normal mode**: `~/.config/agentoffice/agentoffice-data/workspaces/`
- **USB mode**: `<usb>/agentoffice-data/workspaces/`

---

## Architecture

```
agentoffice/
├── electron/
│   ├── main.js          ← Electron shell, window, IPC, USB detection
│   └── preload.js       ← Secure bridge to renderer
│
├── backend/src/
│   ├── server.js        ← Express + WebSocket, all REST endpoints
│   ├── db.js            ← SQLite: agents, tasks, messages, workspaces
│   ├── agents/
│   │   ├── orchestrator.js   ← Boss agent task coordination
│   │   ├── agentExecutor.js  ← Single agent runs task with tools
│   │   └── aiRunner.js       ← Ollama + OpenAI-compat AI calls
│   └── tools/
│       ├── webSearch.js      ← DuckDuckGo (free, no key)
│       └── fileSystem.js     ← Sandboxed per-agent workspace
│
└── src/
    ├── App.jsx               ← Root layout
    ├── hooks/useOffice.js    ← WebSocket state + API calls
    ├── components/
    │   ├── Office/
    │   │   ├── TitleBar.jsx       ← Frameless window controls
    │   │   ├── Sidebar.jsx        ← Agent roster
    │   │   └── OfficeCanvas.jsx   ← Visual desk layout + connections
    │   ├── Agent/
    │   │   └── AgentDesk.jsx      ← Individual agent desk + avatar SVGs
    │   ├── Chat/
    │   │   └── ChatPanel.jsx      ← Messages + task creation
    │   ├── Task/
    │   │   └── TaskPanel.jsx      ← Task list + results
    │   └── Settings/
    │       └── AgentEditor.jsx    ← Create/edit agent modal
    └── styles/main.css            ← Full design system
```

---

## Supported AI providers

| Provider | Type | Cost | Setup |
|----------|------|------|-------|
| Ollama | Local | Free | `ollama serve && ollama pull llama3.2` |
| LM Studio | Local | Free | Run LM Studio, enable local server |
| Groq | Cloud | Free tier | Get key at console.groq.com |
| OpenAI | Cloud | Paid | Get key at platform.openai.com |
| llama.cpp | Local | Free | Run with `--server` flag |
| Any OpenAI-compat | Any | Varies | Set URL + key |

---

## USB Portable Mode

1. Build: `npm run portable` → `AgentOffice-portable.AppImage`
2. Copy AppImage to USB drive
3. Create trigger file: `touch /mnt/usb/.agentoffice-portable`
4. Run from USB — all data (SQLite DB, agent workspaces) stays on the USB
5. Plug into any Linux machine and your agents are exactly where you left them

---

## Open Source

MIT License. Fork it, extend it, add more agents, more tools, more roles.
