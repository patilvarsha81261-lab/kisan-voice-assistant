"""MCP Client to discover and execute tools across Weather, Mandi, and Schemes servers."""

import logging
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mcp_client")


class MCPClient:
    """Unified MCP Client managing connections to MCP servers."""

    def __init__(self):
        self._tools_cache: Dict[str, Dict[str, Any]] = {}
        self._register_local_servers()

    def _register_local_servers(self):
        """Register tool schemas from available MCP servers."""
        self._tools_cache = {
            "get_weather_forecast": {
                "server": "weather_server",
                "name": "get_weather_forecast",
                "description": "Fetch daily weather forecast including temperature, precipitation probability, and wind speed using Open-Meteo.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "City or district name (e.g. 'Kolhapur', 'Pune', 'Sangli')"},
                        "days": {"type": "integer", "description": "Forecast horizon (1 to 7 days, default 3)"},
                    },
                    "required": ["location"],
                },
            },
            "get_mandi_price": {
                "server": "mandi_server",
                "name": "get_mandi_price",
                "description": "Get official APMC Mandi daily arrival prices (modal, minimum, maximum price per quintal).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "commodity": {"type": "string", "description": "Crop name (e.g. 'sugarcane', 'soybean', 'grapes', 'onion')"},
                        "district": {"type": "string", "description": "District name (e.g. 'Kolhapur', 'Pune', 'Nashik', 'Sangli')"},
                        "state": {"type": "string", "description": "State name (default 'Maharashtra')"},
                    },
                    "required": ["commodity", "district"],
                },
            },
            "search_schemes": {
                "server": "schemes_server",
                "name": "search_schemes",
                "description": "Search official government scheme guidelines (PM-KISAN, PMFBY crop insurance) for eligibility, amounts, and rules.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Inquiry about government scheme"},
                        "top_k": {"type": "integer", "description": "Maximum number of chunks to retrieve"},
                    },
                    "required": ["query"],
                },
            },
            "search_advisories": {
                "server": "advisories_retriever",
                "name": "search_advisories",
                "description": "Search crop production advisories (ICAR, MPKV Rahuri) for pest, disease, nutrition, and spray dosages.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Pest, disease, or crop cultivation question"},
                        "top_k": {"type": "integer", "description": "Maximum number of chunks to return"},
                    },
                    "required": ["query"],
                },
            },
        }

    async def list_tools(self) -> List[Dict[str, Any]]:
        """List all available MCP tools and their JSON schemas."""
        return list(self._tools_cache.values())

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch tool invocation to the appropriate MCP server implementation."""
        if name not in self._tools_cache:
            raise ValueError(f"Unknown MCP tool: '{name}'. Available: {list(self._tools_cache.keys())}")

        logger.info(f"MCP Call: {name} with args: {arguments}")

        if name == "get_weather_forecast":
            from src.mcp_servers.weather_server import get_weather_forecast
            return await get_weather_forecast(**arguments)

        elif name == "get_mandi_price":
            from src.mcp_servers.mandi_server import get_mandi_price
            return await get_mandi_price(**arguments)

        elif name == "search_schemes":
            from src.mcp_servers.schemes_server import search_schemes
            return await search_schemes(**arguments)

        elif name == "search_advisories":
            from src.rag.retriever import HybridRetriever
            query = arguments.get("query", "")
            top_k = arguments.get("top_k", 3)
            retriever = HybridRetriever(collection_name="crop_advisories")
            chunks = retriever.retrieve(query, top_k=top_k)
            return {
                "success": True,
                "count": len(chunks),
                "chunks": [
                    {
                        "source": c.source,
                        "page": c.page,
                        "citation": c.format_citation(),
                        "score": round(c.score, 4),
                        "content": c.text,
                    }
                    for c in chunks
                ],
            }

        raise NotImplementedError(f"No execution handler configured for {name}")


if __name__ == "__main__":
    import asyncio

    async def test_client():
        client = MCPClient()
        tools = await client.list_tools()
        print(f"Registered MCP Tools ({len(tools)}):", [t["name"] for t in tools])

        print("\n--- Testing get_weather_forecast ---")
        w_res = await client.call_tool("get_weather_forecast", {"location": "Kolhapur", "days": 2})
        print("Weather Result:", w_res)

        print("\n--- Testing get_mandi_price ---")
        m_res = await client.call_tool("get_mandi_price", {"commodity": "sugarcane", "district": "Kolhapur"})
        print("Mandi Result:", m_res)

    asyncio.run(test_client())
