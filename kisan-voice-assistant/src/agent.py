"""Agent orchestrator running a transparent MCP tool-calling loop (Max 5 iterations)."""

import json
import logging
import time
from typing import Any, Dict, List, Optional

from src.language import LanguageCode, detect_language, get_system_prompt
from src.llm import get_llm_client
from src.mcp_client import MCPClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("agent")


class KisanAgent:
    """Voice Assistant Agent executing tool calling and synthesis."""

    def __init__(self):
        self.mcp_client = MCPClient()
        self.llm_client = get_llm_client()
        self.max_iterations = 5

    async def execute(self, user_query: str, language: Optional[LanguageCode] = None) -> Dict[str, Any]:
        """Run transparent agent execution loop on user query."""
        start_time = time.time()
        detected_lang = language or detect_language(user_query)
        system_prompt = get_system_prompt(detected_lang)
        tools = await self.mcp_client.list_tools()

        messages: List[Dict[str, Any]] = [
            {"role": "user", "content": user_query}
        ]

        tool_logs: List[Dict[str, Any]] = []
        sources: List[Dict[str, Any]] = []
        final_answer = ""
        tools_duration_total = 0.0

        iteration = 0
        while iteration < self.max_iterations:
            iteration += 1
            logger.info(f"Agent Iteration {iteration}/{self.max_iterations}")

            # Send prompt + messages + tools to LLM
            try:
                response = await self.llm_client.generate_with_tools(
                    system_prompt=system_prompt,
                    messages=messages,
                    tools=tools,
                )
            except Exception as e:
                logger.warning(f"LLM tool generation error: {e}. Executing heuristic tool fallback.")
                break

            # If no tools requested, we have the final answer
            if not response.tool_calls:
                final_answer = response.content
                break

            # Execute tool calls
            for call in response.tool_calls:
                tool_name = call["name"]
                tool_args = call["arguments"]
                call_id = call.get("id", f"call_{iteration}")

                t0 = time.time()
                try:
                    tool_result = await self.mcp_client.call_tool(tool_name, tool_args)
                except Exception as ex:
                    tool_result = {"error": f"Tool execution failed: {str(ex)}"}
                dur = time.time() - t0
                tools_duration_total += dur

                tool_logs.append({
                    "iteration": iteration,
                    "tool_name": tool_name,
                    "arguments": tool_args,
                    "result": tool_result,
                    "duration_ms": round(dur * 1000, 2),
                })

                # Capture citations if RAG tool
                if tool_name in ("search_advisories", "search_schemes") and isinstance(tool_result, dict):
                    chunks = tool_result.get("chunks", [])
                    for ch in chunks:
                        sources.append({
                            "source": ch.get("source", "unknown"),
                            "page": ch.get("page", 1),
                            "citation": ch.get("citation", ""),
                            "score": ch.get("score", 0),
                        })

                # Append tool response back to conversation
                messages.append({
                    "role": "assistant",
                    "content": f"Tool Call: {tool_name}({json.dumps(tool_args)})",
                })
                messages.append({
                    "role": "user",
                    "content": f"Tool Result [{tool_name}]: {json.dumps(tool_result)}",
                })

        # Fallback synthesis if final answer was not populated
        if not final_answer:
            final_answer = self._generate_fallback_response(user_query, detected_lang, tool_logs)

        total_time = time.time() - start_time
        agent_time = max(0.0, total_time - tools_duration_total)

        return {
            "query": user_query,
            "answer": final_answer.strip(),
            "language": detected_lang,
            "tool_calls": tool_logs,
            "sources": sources,
            "timings": {
                "agent_ms": round(agent_time * 1000, 2),
                "tools_ms": round(tools_duration_total * 1000, 2),
                "total_ms": round(total_time * 1000, 2),
            },
        }

    def _generate_fallback_response(
        self, query: str, lang: LanguageCode, tool_logs: List[Dict[str, Any]]
    ) -> str:
        """Deterministic factual synthesis when LLM generation is unavailable."""
        sentences: List[str] = []

        for log in tool_logs:
            t_name = log["tool_name"]
            res = log["result"]

            if t_name == "get_mandi_price" and res.get("success"):
                if lang == "mr":
                    sentences.append(f"{res['district']} कृषी उत्पन्न बाजार समितीत आज {res['commodity']} चा सरासरी भाव ₹{res['modal_price']} प्रति क्विंटल आहे (किमान ₹{res['min_price']}, कमाल ₹{res['max_price']}).")
                elif lang == "hi":
                    sentences.append(f"{res['district']} मंडी में आज {res['commodity']} का औसत भाव ₹{res['modal_price']} प्रति क्विंटल है (न्यूनतम ₹{res['min_price']}, अधिकतम ₹{res['max_price']})।")
                else:
                    sentences.append(f"In {res['district']} APMC, {res['commodity']} modal price today is ₹{res['modal_price']} per quintal (Min: ₹{res['min_price']}, Max: ₹{res['max_price']}).")

            elif t_name == "get_weather_forecast" and res.get("success"):
                forecast = res.get("forecast", [])
                if forecast:
                    day = forecast[1] if len(forecast) > 1 else forecast[0]
                    if lang == "mr":
                        sentences.append(f"{res['location']} परिसरात तापमान कमाल {day['max_temperature_c']}°C राहील व पावसाची शक्यता {day['precipitation_probability_pct']}% आहे ({day['condition']}).")
                    elif lang == "hi":
                        sentences.append(f"{res['location']} में अधिकतम तापमान {day['max_temperature_c']}°C रहेगा और बारिश की संभावना {day['precipitation_probability_pct']}% है।")
                    else:
                        sentences.append(f"In {res['location']}, maximum temperature will be {day['max_temperature_c']}°C with {day['precipitation_probability_pct']}% rain probability.")

            elif t_name in ("search_advisories", "search_schemes") and res.get("chunks"):
                top_chunk = res["chunks"][0]
                source_cite = top_chunk.get("citation", f"[Document: {top_chunk.get('source')}, Page: {top_chunk.get('page')}]")
                if lang == "mr":
                    sentences.append(f"अधिकृत कृषी दस्तऐवजानुसार माहिती उपलब्ध आहे. कृपया {source_cite} चा संदर्भ घ्यावा.")
                elif lang == "hi":
                    sentences.append(f"आधिकारिक कृषि परामर्श अनुसार सलाह उपलब्ध है। कृपया {source_cite} देखें।")
                else:
                    sentences.append(f"Based on agricultural guidelines, please refer to {source_cite} for details.")

        if not sentences:
            if lang == "mr":
                return "माफ करा, या प्रश्नासाठी खात्रीशीर माहिती उपलब्ध नाही. कृपया जवळच्या कृषी विज्ञान केंद्राशी (KVK) संपर्क साधा."
            elif lang == "hi":
                return "क्षमा करें, इस विषय पर आधिकारिक जानकारी उपलब्ध नहीं है। कृपया नजदीकी कृषि विज्ञान केंद्र से संपर्क करें।"
            return "I apologize, but no verified data was found in the advisory documents. Please consult your local Krishi Vigyan Kendra."

        return " ".join(sentences)
