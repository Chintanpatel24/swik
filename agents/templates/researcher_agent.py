"""
NEXUS User Agent: Deep Researcher
A template agent that can be customised by users.

To use: copy this file to agents/user_agents/ and edit to your needs.
The AGENT_META dict tells NEXUS what this agent can do.
"""

AGENT_META = {
    "name":        "Deep Researcher",
    "role":        "researcher",
    "description": "A research agent that breaks down topics into sub-questions and answers each thoroughly.",
    "skills":      ["research", "analysis", "summarisation", "fact-checking"],
}

# Import the LLM client (available when running inside NEXUS)
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.llm_client import LLMClient


def run(message: str, agent: dict, history: list = None) -> str:
    """
    Main entry point.
    
    Args:
        message: The task or question to handle
        agent:   Agent config dict (includes api_key, model, etc.)
        history: Previous messages (optional)
    
    Returns:
        String response
    """
    client = LLMClient.from_agent(agent)

    # Step 1: Break down the question
    breakdown = client.chat([
        {"role": "system", "content": "You are a research planning assistant. Given a research question, list 3-5 specific sub-questions to investigate. Respond with a JSON array of strings."},
        {"role": "user", "content": f"Break down this research question: {message}"},
    ])

    # Step 2: Answer each sub-question
    answers = client.chat([
        {"role": "system", "content": agent.get("system_prompt", "You are a thorough researcher. Answer questions with citations and clear reasoning.")},
        {"role": "user", "content": f"Research question: {message}\n\nSub-questions to address: {breakdown}\n\nProvide a comprehensive, well-structured research report."},
    ])

    return answers


async def async_run(message: str, agent: dict, history: list = None) -> str:
    """Async version — preferred when available."""
    client = LLMClient.from_agent(agent)

    breakdown = await client.chat_async([
        {"role": "system", "content": "List 3-4 specific sub-questions for this research topic. JSON array only."},
        {"role": "user", "content": f"Research topic: {message}"},
    ])

    report = await client.chat_async([
        {"role": "system", "content": agent.get("system_prompt", "You are a thorough researcher.")},
        {"role": "user", "content": f"Research: {message}\n\nAngles to cover: {breakdown}\n\nWrite a comprehensive report."},
    ])

    return report
