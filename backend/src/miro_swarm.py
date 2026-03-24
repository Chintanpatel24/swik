import os
import json
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from openai import AsyncOpenAI

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

AGENTS_DIR = "data/agents"
os.makedirs(AGENTS_DIR, exist_ok=True)

class AgentData(BaseModel):
    id: str
    name: str
    role: str
    provider: str
    api_url: str
    api_key: str
    model: str
    system_prompt: str
    color: str
    floor: int

# --- FOLDER-BASED STORAGE ---
def load_agents():
    agents =[]
    for file in os.listdir(AGENTS_DIR):
        if file.endswith(".json"):
            with open(os.path.join(AGENTS_DIR, file), "r") as f:
                agents.append(json.load(f))
    return agents

@app.get("/api/agents")
def get_agents():
    return load_agents()

@app.post("/api/agents")
def save_agent(agent: AgentData):
    agent_dict = agent.dict()
    file_path = os.path.join(AGENTS_DIR, f"{agent.id}.json")
    with open(file_path, "w") as f:
        json.dump(agent_dict, f, indent=4)
    return {"status": "saved", "agent": agent_dict}

# --- MIROFISH SWARM LOGIC ---
async def call_llm(agent, prompt, context=""):
    client = AsyncOpenAI(
        base_url=agent["api_url"],
        api_key=agent["api_key"] or "local",
    )
    sys_prompt = agent["system_prompt"]
    if context:
        sys_prompt += f"\n\nContext from other agents:\n{context}"
        
    try:
        response = await client.chat.completions.create(
            model=agent["model"],
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error connecting to {agent['provider']}: {str(e)}"

async def run_miro_swarm(task_description, agent_ids, websocket: WebSocket):
    all_agents = {a["id"]: a for a in load_agents()}
    team = [all_agents[aid] for aid in agent_ids if aid in all_agents]
    
    if not team:
        await websocket.send_json({"type": "error", "content": "No valid agents selected for swarm."})
        return

    await websocket.send_json({
        "type": "planning", 
        "from_agent": "system",
        "content": f"Initializing MiroFish Swarm with {len(team)} agents. Phase 1: Parallel Ideation."
    })

    # PHASE 1: Parallel Execution (Multiplying Strength)
    tasks =[call_llm(agent, task_description) for agent in team]
    results = await asyncio.gather(*tasks)
    
    swarm_memory =[]
    for agent, result in zip(team, results):
        swarm_memory.append(f"--- {agent['name']} ---\n{result}\n")
        await websocket.send_json({
            "type": "result",
            "from_agent": agent["id"],
            "content": result
        })

    # PHASE 2: Cross-Reference & Critique
    await websocket.send_json({
        "type": "delegation", 
        "from_agent": "system",
        "content": "Phase 2: Agents cross-referencing each other's work."
    })
    
    cross_context = "\n".join(swarm_memory)
    critique_prompt = f"Original Task: {task_description}\nReview the work of your peers and improve upon it. Provide a final, polished contribution."
    
    critique_tasks =[call_llm(agent, critique_prompt, cross_context) for agent in team]
    final_results = await asyncio.gather(*critique_tasks)

    for agent, result in zip(team, final_results):
        await websocket.send_json({
            "type": "summary",
            "from_agent": agent["id"],
            "content": f"Refined Output:\n{result}"
        })

    await websocket.send_json({"type": "done", "from_agent": "system", "content": "Swarm task completed successfully."})

# --- WEBSOCKET FOR REALTIME CHAT & DISPATCH ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "dispatch_swarm":
                asyncio.create_task(run_miro_swarm(
                    data["task"]["description"], 
                    data["task"]["agent_ids"], 
                    websocket
                ))
    except Exception:
        pass

if __name__ == "__main__":
    uvicorn.run("miro_swarm:app", host="0.0.0.0", port=7843, reload=True)
