"""Provider-agnostic LLM interface supporting Anthropic Claude and local Ollama with tool calling."""

import json
import logging
from typing import Any, Dict, List, Optional
import httpx

from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("llm")


class LLMResponse:
    """Standardized response from LLM."""

    def __init__(
        self,
        content: str = "",
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        raw: Any = None,
    ):
        self.content = content
        self.tool_calls = tool_calls or []
        self.raw = raw


class BaseLLMClient:
    """Base interface for LLM client with function calling."""

    async def generate_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
    ) -> LLMResponse:
        raise NotImplementedError


class OllamaClient(BaseLLMClient):
    """Client for local Ollama server (e.g. qwen2.5 or llama3.1)."""

    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, model: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
    ) -> LLMResponse:
        url = f"{self.base_url}/api/chat"

        # Format tools into Ollama schema
        ollama_tools = []
        for t in tools:
            ollama_tools.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t.get("parameters", {}),
                },
            })

        formatted_msgs = [{"role": "system", "content": system_prompt}] + messages

        payload = {
            "model": self.model,
            "messages": formatted_msgs,
            "tools": ollama_tools,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error(f"Ollama request error: {e}")
            raise

        msg = data.get("message", {})
        raw_tool_calls = msg.get("tool_calls", [])

        normalized_calls = []
        for call in raw_tool_calls:
            func = call.get("function", {})
            normalized_calls.append({
                "id": call.get("id", f"call_{len(normalized_calls)}"),
                "name": func.get("name"),
                "arguments": func.get("arguments", {}),
            })

        return LLMResponse(
            content=msg.get("content", ""),
            tool_calls=normalized_calls,
            raw=data,
        )


class AnthropicClient(BaseLLMClient):
    """Client for Anthropic Claude API."""

    def __init__(self, api_key: str = settings.ANTHROPIC_API_KEY):
        self.api_key = api_key
        try:
            import anthropic
            self.client = anthropic.AsyncAnthropic(api_key=api_key)
        except Exception as e:
            logger.warning(f"Anthropic library initialization note: {e}")
            self.client = None

    async def generate_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
    ) -> LLMResponse:
        if not self.client:
            raise ValueError("Anthropic client is not configured or missing ANTHROPIC_API_KEY")

        # Format tools to Anthropic format
        anthropic_tools = []
        for t in tools:
            anthropic_tools.append({
                "name": t["name"],
                "description": t["description"],
                "input_schema": t.get("parameters", {}),
            })

        # Convert message history
        anthropic_msgs = []
        for m in messages:
            anthropic_msgs.append({
                "role": m["role"] if m["role"] != "system" else "user",
                "content": m["content"],
            })

        resp = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            system=system_prompt,
            messages=anthropic_msgs,
            tools=anthropic_tools,
        )

        content_text = ""
        tool_calls = []

        for block in resp.content:
            if block.type == "text":
                content_text += block.text
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "arguments": block.input,
                })

        return LLMResponse(content=content_text, tool_calls=tool_calls, raw=resp)


def get_llm_client() -> BaseLLMClient:
    """Factory creating configured LLM client from settings."""
    if settings.LLM_PROVIDER == "anthropic":
        return AnthropicClient()
    return OllamaClient()
