"""
NEXUS Python Agent Runner
FastAPI server on port 8765
Handles agent execution, orchestration, and user-created Python agents.
Inspired by MiroFish LLMClient (MIT) and SWIK orchestrator (MIT)
"""

import os
import sys
import json
import time
import asyncio
import importlib.util
import traceback
from pathlib import Path
from typing import Optional, List, Dict, Any

# Add agents dir to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError:
    print("\n❌ Missing Python dependencies. Run: pip install -r agents/requirements.txt\n")
    sys.exit(1)

from core.llm_client import LLMClient
from core.orchestrator import NexusOrchestrator
from core.tools import ToolRegistry

app = FastAPI(title="NEXUS Python Agent Runner", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

USER_AGENTS_DIR = Path(__file__).parent / "user_agents"
USER_AGENTS_DIR.mkdir(exist_ok=True)

# Create __init__.py so it's importable
(USER_AGENTS_DIR / "__init__.py").touch(exist_ok=True)


# ── Models ────────────────────────────────────────────────────
class AgentDef(BaseModel):
    id: str
    name: str
    role: str = "developer"
    provider: str = "groq"
    api_url: str = "https://api.groq.com/openai"
    api_key: str = ""
    model: str = "llama-3.3-70b-versatile"
    system_prompt: str = ""
    skills: Any = []
    strength: int = 1

class TaskDef(BaseModel):
    id: str
    title: str
    description: str = ""

class RunRequest(BaseModel):
    task: TaskDef
    agents: List[AgentDef]

class DirectRunRequest(BaseModel):
    agent: AgentDef
    message: str
    history: List[Dict] = []


# ── Health ────────────────────────────────────────────────────
@app.get("/status")
async def status():
    user_agents = list_user_agents()
    return {
        "ok": True,
        "version": "1.0.0",
        "user_agents": len(user_agents),
        "python": sys.version,
    }


# ── List user-created agent scripts ──────────────────────────
@app.get("/agents")
async def get_agents():
    return {"agents": list_user_agents()}


def list_user_agents():
    agents = []
    for f in USER_AGENTS_DIR.glob("*.py"):
        if f.name.startswith("_"):
            continue
        try:
            spec = importlib.util.spec_from_file_location(f.stem, f)
            mod  = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            meta = getattr(mod, "AGENT_META", {})
            agents.append({
                "file": f.name,
                "name": meta.get("name", f.stem),
                "role": meta.get("role", "custom"),
                "description": meta.get("description", ""),
                "skills": meta.get("skills", []),
            })
        except Exception as e:
            agents.append({"file": f.name, "error": str(e)})
    return agents


# ── Orchestrate multi-agent task ──────────────────────────────
@app.post("/orchestrate")
async def orchestrate(req: RunRequest):
    try:
        orch = NexusOrchestrator()
        result = await orch.run(req.task.dict(), [a.dict() for a in req.agents])
        return result
    except Exception as e:
        return {"ok": False, "error": str(e), "trace": traceback.format_exc()}


# ── Run single agent ──────────────────────────────────────────
@app.post("/run")
async def run_agent(req: DirectRunRequest):
    try:
        client = LLMClient(
            api_key=req.agent.api_key,
            base_url=req.agent.api_url,
            model=req.agent.model,
            provider=req.agent.provider,
        )
        messages = []
        if req.agent.system_prompt:
            messages.append({"role": "system", "content": req.agent.system_prompt})
        for h in req.history[-10:]:
            messages.append(h)
        messages.append({"role": "user", "content": req.message})

        response = await client.chat_async(messages)
        return {"ok": True, "response": response, "agent": req.agent.name}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Load and run a user Python agent ─────────────────────────
@app.post("/run_custom/{agent_file}")
async def run_custom_agent(agent_file: str, req: DirectRunRequest):
    agent_path = USER_AGENTS_DIR / agent_file
    if not agent_path.exists():
        raise HTTPException(status_code=404, detail=f"Agent file not found: {agent_file}")
    try:
        spec = importlib.util.spec_from_file_location("custom_agent", agent_path)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        if hasattr(mod, "run"):
            result = await asyncio.to_thread(mod.run, req.message, req.agent.dict(), req.history)
            return {"ok": True, "response": str(result)}
        elif hasattr(mod, "async_run"):
            result = await mod.async_run(req.message, req.agent.dict(), req.history)
            return {"ok": True, "response": str(result)}
        else:
            return {"ok": False, "error": "Agent must define run(message, agent, history) or async_run(...)"}
    except Exception as e:
        return {"ok": False, "error": str(e), "trace": traceback.format_exc()}


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_PORT", 8765))
    print(f"\n🐍 NEXUS Python Agent Runner starting on port {port}")
    print(f"📂 User agents directory: {USER_AGENTS_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
