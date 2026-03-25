"""
NEXUS Tool Registry
Tools available to Python agents (all free).
"""

import re
import json
import urllib.request
import urllib.parse
from typing import Any, Dict, Optional


class ToolRegistry:
    """Registry of tools agents can use."""

    @staticmethod
    def web_search(query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Search the web using DuckDuckGo (no API key needed).
        """
        try:
            encoded = urllib.parse.quote(query)
            url     = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_redirect=1&no_html=1"
            req     = urllib.request.Request(url, headers={"User-Agent": "NEXUS/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())

            results = []
            if data.get("AbstractText"):
                results.append({"title": data.get("Heading", ""), "snippet": data["AbstractText"], "url": data.get("AbstractURL", "")})
            for t in (data.get("RelatedTopics") or [])[:max_results]:
                if isinstance(t, dict) and t.get("Text"):
                    results.append({"title": t.get("FirstURL", ""), "snippet": t["Text"], "url": t.get("FirstURL", "")})
            return {"ok": True, "results": results[:max_results], "query": query}
        except Exception as e:
            return {"ok": False, "error": str(e), "results": []}

    @staticmethod
    def calculate(expression: str) -> Dict[str, Any]:
        """
        Safe math evaluation.
        """
        allowed = set("0123456789+-*/().%, ")
        if not all(c in allowed for c in expression):
            return {"ok": False, "error": "Invalid characters in expression"}
        try:
            result = eval(expression, {"__builtins__": {}}, {})  # noqa: S307
            return {"ok": True, "result": result, "expression": expression}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @staticmethod
    def extract_json(text: str) -> Dict[str, Any]:
        """
        Extract JSON from text — useful for parsing LLM outputs.
        """
        clean = re.sub(r"^```(?:json)?\s*\n?", "", text.strip(), flags=re.I)
        clean = re.sub(r"\n?```\s*$", "", clean).strip()
        try:
            return {"ok": True, "data": json.loads(clean)}
        except Exception:
            m = re.search(r"\{[\s\S]*\}", clean)
            if m:
                try:
                    return {"ok": True, "data": json.loads(m.group())}
                except Exception:
                    pass
            return {"ok": False, "error": "No valid JSON found"}
