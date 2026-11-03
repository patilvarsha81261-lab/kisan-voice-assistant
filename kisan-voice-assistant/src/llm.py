
"""Provider-agnostic LLM interface for Gemini, Anthropic and Ollama."""

import logging
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger("llm")


class LLMResponse:
    """Standardized response from an LLM."""

    def __init__(
        self,
        content: str = "",
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        raw: Any = None,
    ):
        self.content = content or ""
        self.tool_calls = tool_calls or []
        self.raw = raw


class BaseLLMClient:

    async def generate_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
    ) -> LLMResponse:
        raise NotImplementedError


class GeminiClient(BaseLLMClient):
    """Google Gemini client with native function calling."""

    def __init__(self):
        from google import genai

        self.client = None
        self.model = settings.GEMINI_MODEL

        # Allow initialization without an API key for unit tests.
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(
                api_key=settings.GEMINI_API_KEY
            )

    async def generate_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
    ) -> LLMResponse:

        if self.client is None:
            raise ValueError(
                "GEMINI_API_KEY is missing. "
                "Configure it in your .env file."
            )

        from google.genai import types

        declarations = []

        for tool in tools:
            declarations.append(
                types.FunctionDeclaration(
                    name=tool["name"],
                    description=tool["description"],
                    parameters_json_schema=tool.get(
                        "parameters",
                        {
                            "type": "object",
                            "properties": {}
                        }
                    ),
                )
            )

        gemini_tools = (
            [types.Tool(function_declarations=declarations)]
            if declarations else None
        )

        contents = []

        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")

            if role == "system":
                continue

            if role == "assistant":
                role = "model"

            elif role == "tool":
                role = "user"

            if not isinstance(content, str):
                content = str(content)

            if content.strip():
                contents.append(
                    types.Content(
                        role=role,
                        parts=[
                            types.Part.from_text(text=content)
                        ],
                    )
                )

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=gemini_tools,
            temperature=0.3,
            max_output_tokens=4096,
        )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=contents,
            config=config,
        )

        calls = []

        for call in response.function_calls or []:
            calls.append({
                "id": getattr(call, "id", None),
                "name": call.name,
                "arguments": dict(call.args or {}),
            })

        return LLMResponse(
            content=response.text or "",
            tool_calls=calls,
            raw=response,
        )


class OllamaClient(BaseLLMClient):
    """Local Ollama client."""

    def __init__(self):
        import httpx

        self.httpx = httpx
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL

    async def generate_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
    ) -> LLMResponse:

        ollama_tools = [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool.get("parameters", {}),
                },
            }
            for tool in tools
        ]

        formatted_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "tools": ollama_tools,
            "stream": False,
        }

        async with self.httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        msg = data.get("message", {})
        calls = []

        for call in msg.get("tool_calls", []):
            function = call.get("function", {})

            calls.append({
                "id": call.get("id"),
                "name": function.get("name"),
                "arguments": function.get("arguments", {}),
            })

        return LLMResponse(
            content=msg.get("content", ""),
            tool_calls=calls,
            raw=data,
        )


class AnthropicClient(BaseLLMClient):
    """Anthropic Claude client."""

    def __init__(self):
        import anthropic

        self.client = None

        if settings.ANTHROPIC_API_KEY:
            self.client = anthropic.AsyncAnthropic(
                api_key=settings.ANTHROPIC_API_KEY
            )

    async def generate_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
    ) -> LLMResponse:

        if self.client is None:
            raise ValueError("ANTHROPIC_API_KEY is missing.")

        anthropic_tools = [
            {
                "name": tool["name"],
                "description": tool["description"],
                "input_schema": tool.get("parameters", {}),
            }
            for tool in tools
        ]

        anthropic_messages = []

        for message in messages:
            role = message.get("role", "user")

            if role not in ("user", "assistant"):
                continue

            anthropic_messages.append({
                "role": role,
                "content": message.get("content", ""),
            })

        response = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            system=system_prompt,
            messages=anthropic_messages,
            tools=anthropic_tools or None,
        )

        content = ""
        calls = []

        for block in response.content:
            if block.type == "text":
                content += block.text

            elif block.type == "tool_use":
                calls.append({
                    "id": block.id,
                    "name": block.name,
                    "arguments": block.input,
                })

        return LLMResponse(
            content=content,
            tool_calls=calls,
            raw=response,
        )


def get_llm_client() -> BaseLLMClient:
    """Create the configured LLM provider."""

    provider = settings.LLM_PROVIDER.lower()

    if provider == "gemini":
        return GeminiClient()

    elif provider == "ollama":
        return OllamaClient()

    elif provider == "anthropic":
        return AnthropicClient()

    raise ValueError(
        f"Unsupported LLM provider: {provider}"
    )
