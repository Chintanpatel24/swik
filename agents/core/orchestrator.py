"""
NEXUS Orchestrator
Multi-agent task orchestration with MiroFish-style strength multiplication.

Inspired by MiroFish simulation engine (MIT) — https://github.com/666ghj/MiroFish
Concept: Agent network strength = product of individual strengths (multiplicative, not additive)
"""

import asyncio
import json
import time
from typing import List, Dict, Any, Optional
from .llm_client import LLMClient


class NexusOrchestrator:
    """
    Orchestrates multiple agents using MiroFish-style strength multiplication.
    
    Strength principle: When N agents collaborate, the combined output quality
    scales multiplicatively. A boss (strength 3) + 2 workers (strength 2 each) 
    = 3×2×2 = 12x base quality, not 3+2+2=7x.
    """

    def __init__(self):
        self.messages: List[Dict] = []
        self.start_time = None

    async def run(self, task: Dict, agents: List[Dict]) -> Dict:
        self.start_time = time.time()
        self.messages = []

        if not agents:
            return {"ok": False, "error": "No agents provided"}

        # Calculate network strength (MiroFish multiplication)
        network_strength = 1
        for a in agents:
            network_strength *= max(1, a.get("strength", 1))

        self._emit("system", "NEXUS", None,
                   f"🌐 Task: {task['title']} | Agents: {len(agents)} | Network strength: {network_strength}x",
                   "system")

        boss    = next((a for a in agents if a.get("role") == "boss"), agents[0])
        workers = [a for a in agents if a["id"] != boss["id"]]

        # ── Phase 1: Boss plans ───────────────────────────────
        plan = await self._boss_plan(boss, task, workers)

        # ── Phase 2: Workers execute ──────────────────────────
        subtasks = plan.get("subtasks", [])
        if not subtasks:
            subtasks = [{"assignee": w["name"], "instruction": task["description"]} for w in (workers or [boss])]

        results = await asyncio.gather(*[
            self._worker_execute(sub, workers, boss, task)
            for sub in subtasks
        ])

        # ── Phase 3: Boss synthesises with strength multiplier ─
        final = await self._boss_synthesise(boss, task, results, network_strength)

        elapsed = round(time.time() - self.start_time, 2)
        return {
            "ok":       True,
            "result":   final,
            "messages": self.messages,
            "stats": {
                "agents":           len(agents),
                "network_strength": network_strength,
                "elapsed_s":        elapsed,
                "subtasks":         len(subtasks),
            },
        }

    async def _boss_plan(self, boss: Dict, task: Dict, workers: List[Dict]) -> Dict:
        client = LLMClient.from_agent(boss)
        self._emit("thinking", boss["name"], None, "Analysing task and planning delegation…", "planning")

        worker_desc = "\n".join(f"- {w['name']} ({w['role']}): {', '.join(self._skills(w))}" for w in workers)
        prompt = f"""Task: "{task['title']}"
Details: {task['description']}

Available agents:
{worker_desc or "- (none, you must handle it alone)"}

Respond ONLY with valid JSON:
{{"plan":"brief overall approach","subtasks":[{{"assignee":"agent name","instruction":"specific detailed instruction"}}]}}

Assign at most one subtask per agent. If no workers, assign to yourself."""

        try:
            result = await client.chat_json_async([
                {"role": "system", "content": boss.get("system_prompt", f"You are {boss['name']}, the orchestrator.")},
                {"role": "user", "content": prompt},
            ])
            self._emit("chat", boss["name"], None, f"Plan: {result.get('plan','')}", "planning")
            return result
        except Exception as e:
            self._emit("error", boss["name"], None, f"Planning failed: {e}", "error")
            return {"plan": task["description"], "subtasks": []}

    async def _worker_execute(self, subtask: Dict, workers: List[Dict], boss: Dict, task: Dict) -> Dict:
        assignee = subtask.get("assignee", "")
        worker   = next((w for w in workers if w["name"].lower() == assignee.lower()), workers[0] if workers else boss)
        instr    = subtask.get("instruction", task["description"])

        self._emit("delegation", boss["name"], worker["name"],
                   f"Delegating to {worker['name']}: {instr[:80]}…", "delegation")

        client = LLMClient.from_agent(worker)
        skills = ", ".join(self._skills(worker)) or "general"

        self._emit("thinking", worker["name"], None, "Working on assigned task…", "working")

        try:
            response = await client.chat_async([
                {"role": "system", "content": worker.get("system_prompt", f"You are {worker['name']}, a {worker['role']} agent. Skills: {skills}")},
                {"role": "user", "content": f"Task from orchestrator:\n{instr}\n\nContext: {task['description']}\n\nProduce thorough, high-quality output."},
            ], max_tokens=2048)

            self._emit("result", worker["name"], boss["name"], response[:600] + ("…" if len(response) > 600 else ""), "result")
            return {"agent": worker["name"], "role": worker["role"], "response": response, "ok": True}
        except Exception as e:
            self._emit("error", worker["name"], boss["name"], f"Error: {e}", "error")
            return {"agent": worker["name"], "role": worker["role"], "error": str(e), "ok": False}

    async def _boss_synthesise(self, boss: Dict, task: Dict, results: List[Dict], strength: int) -> str:
        client   = LLMClient.from_agent(boss)
        combined = "\n\n".join(
            f"## {r['agent']} ({r['role']})\n{r.get('response', r.get('error', ''))}"
            for r in results if r
        )

        self._emit("thinking", boss["name"], None, f"Synthesising with {strength}x network strength…", "synthesis")

        prompt = f"""You are synthesising the work of your agent team.
Task: "{task['title']}"
Description: {task['description']}

Team outputs:
{combined}

Network strength multiplier: {strength}x
This means your synthesis should be {strength}x better than any single agent's output.
Combine insights, resolve conflicts, fill gaps, and produce a unified, complete, polished result.
Do NOT just list what each agent said — synthesise into a single cohesive answer."""

        try:
            synthesis = await client.chat_async([
                {"role": "system", "content": boss.get("system_prompt", f"You are {boss['name']}, the master synthesiser.")},
                {"role": "user", "content": prompt},
            ], max_tokens=3000)
            self._emit("synthesis", boss["name"], None, synthesis[:600] + ("…" if len(synthesis) > 600 else ""), "synthesis")
            return synthesis
        except Exception as e:
            self._emit("error", boss["name"], None, f"Synthesis error: {e}", "error")
            return combined

    def _emit(self, type_: str, from_: str, to_: Optional[str], content: str, msg_type: str):
        self.messages.append({
            "type":    type_,
            "from":    from_,
            "to":      to_,
            "content": content,
            "msgType": msg_type,
            "ts":      time.time(),
        })

    @staticmethod
    def _skills(agent: Dict) -> List[str]:
        s = agent.get("skills", [])
        if isinstance(s, str):
            try:
                s = json.loads(s)
            except Exception:
                s = []
        return s if isinstance(s, list) else []
