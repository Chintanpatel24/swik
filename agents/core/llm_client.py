"""
NEXUS LLM Client
Unified OpenAI-compatible client supporting:
- Groq (free tier) — fastest
- OpenRouter (free models)  
- Ollama (local)
- LM Studio (local)
- Any OpenAI-compatible API

Inspired by MiroFish LLMClient (MIT) — https://github.com/666ghj/MiroFish
"""

import re
import json
import asyncio
from typing import Optional, List, Dict, Any

try:
    import httpx
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    raise ImportError("Run: pip install openai httpx")


# Free providers catalogue
FREE_PROVIDERS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "free": True,
        "free_models": [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
        ],
        "notes": "Fastest free LLM API. Get key at console.groq.com",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "free": True,
        "free_models": [
            "meta-llama/llama-3-8b-instruct:free",
            "mistralai/mistral-7b-instruct:free",
            "google/gemma-2-9b-it:free",
            "microsoft/phi-3-mini-128k-instruct:free",
        ],
        "notes": "Many free models. Get key at openrouter.ai",
    },
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "free": True,
        "free_models": ["llama3.2", "mistral", "gemma2", "phi3"],
        "notes": "Fully local. Install at ollama.ai",
    },
    "lmstudio": {
        "base_url": "http://localhost:1234/v1",
        "free": True,
        "free_models": ["local-model"],
        "notes": "Local GUI. Install at lmstudio.ai",
    },
}


class LLMClient:
    """Unified LLM client - always free, always local-first."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        provider: str = "groq",
    ):
        self.provider = provider.lower()
        pinfo = FREE_PROVIDERS.get(self.provider, {})

        self.api_key  = api_key or "ollama"   # ollama doesn't need a key
        self.base_url = (base_url or pinfo.get("base_url", "https://api.groq.com/openai/v1")).rstrip("/")
        if not self.base_url.endswith("/v1"):
            self.base_url = self.base_url + "/v1"
        self.model = model or (pinfo.get("free_models", ["llama-3.3-70b-versatile"])[0])

        self._sync_client  = None
        self._async_client = None

    @property
    def sync_client(self) -> OpenAI:
        if not self._sync_client:
            self._sync_client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        return self._sync_client

    @property
    def async_client(self) -> AsyncOpenAI:
        if not self._async_client:
            self._async_client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        return self._async_client

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.6,
        max_tokens: int = 2048,
    ) -> str:
        """Synchronous chat."""
        resp = self.sync_client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = resp.choices[0].message.content or ""
        # Strip <think> tags (some models include chain-of-thought)
        content = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()
        return content

    async def chat_async(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.6,
        max_tokens: int = 2048,
    ) -> str:
        """Async chat."""
        resp = await self.async_client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = resp.choices[0].message.content or ""
        content = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()
        return content

    def chat_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """Chat expecting JSON response."""
        text = self.chat(messages, temperature, max_tokens)
        clean = re.sub(r"^```(?:json)?\s*\n?", "", text.strip(), flags=re.I)
        clean = re.sub(r"\n?```\s*$", "", clean).strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            # Try to extract JSON from text
            m = re.search(r"\{[\s\S]*\}", clean)
            if m:
                return json.loads(m.group())
            raise ValueError(f"Invalid JSON from LLM: {clean[:200]}")

    async def chat_json_async(self, messages, temperature=0.3, max_tokens=2048):
        text = await self.chat_async(messages, temperature, max_tokens)
        clean = re.sub(r"^```(?:json)?\s*\n?", "", text.strip(), flags=re.I)
        clean = re.sub(r"\n?```\s*$", "", clean).strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            m = re.search(r"\{[\s\S]*\}", clean)
            if m:
                return json.loads(m.group())
            raise ValueError(f"Invalid JSON: {clean[:200]}")

    @classmethod
    def from_agent(cls, agent: Dict) -> "LLMClient":
        """Create client from an agent dict."""
        return cls(
            api_key=agent.get("api_key") or "ollama",
            base_url=agent.get("api_url", ""),
            model=agent.get("model", "llama-3.3-70b-versatile"),
            provider=agent.get("provider", "groq"),
        )
