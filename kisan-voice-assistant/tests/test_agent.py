
"""Kisan Voice Assistant - AI Agent Orchestrator."""

import json
import logging
import time
from typing import Any, Dict, List, Optional

from src.language import (
    LanguageCode,
    detect_language,
    get_system_prompt,
)
from src.llm import get_llm_client
from src.mcp_client import MCPClient

logger = logging.getLogger("agent")


class KisanAgent:
    """Agricultural assistant with MCP tools and Gemini LLM."""

    def __init__(self):
        self.mcp_client = MCPClient()
        self.llm_client = get_llm_client()
        self.max_iterations = 5

    async def execute(
        self,
        user_query: str,
        language: Optional[LanguageCode] = None,
    ) -> Dict[str, Any]:

        start_time = time.time()

        detected_lang = language or detect_language(user_query)
        system_prompt = get_system_prompt(detected_lang)

        tool_logs: List[Dict[str, Any]] = []
        sources: List[Dict[str, Any]] = []

        final_answer = ""
        tools_duration_total = 0.0

        # Reject unrelated questions politely.
        if not self._is_agriculture_query(user_query):
            final_answer = self._out_of_scope_response(detected_lang)

            return {
                "query": user_query,
                "answer": final_answer,
                "language": detected_lang,
                "tool_calls": [],
                "sources": [],
                "timings": {
                    "agent_ms": round((time.time() - start_time) * 1000, 2),
                    "tools_ms": 0,
                    "total_ms": round((time.time() - start_time) * 1000, 2),
                },
            }

        try:
            tools = await self.mcp_client.list_tools()
        except Exception as exc:
            logger.exception("Could not load MCP tools: %s", exc)
            tools = []

        messages = [
            {"role": "user", "content": user_query}
        ]

        for iteration in range(1, self.max_iterations + 1):

            logger.info(
                "Agent iteration %s/%s",
                iteration,
                self.max_iterations,
            )

            try:
                response = await self.llm_client.generate_with_tools(
                    system_prompt=system_prompt,
                    messages=messages,
                    tools=tools,
                )

            except Exception as exc:
                logger.exception("LLM request failed: %s", exc)
                break

            # No tool calls means the model has generated its answer.
            if not response.tool_calls:
                final_answer = response.content.strip()
                break

            # Execute requested tools.
            for call in response.tool_calls:

                tool_name = call.get("name")
                tool_args = call.get("arguments", {})

                if isinstance(tool_args, str):
                    try:
                        tool_args = json.loads(tool_args)
                    except json.JSONDecodeError:
                        tool_args = {}

                if not isinstance(tool_args, dict):
                    tool_args = {}

                t0 = time.time()

                try:
                    tool_result = await self.mcp_client.call_tool(
                        tool_name,
                        tool_args,
                    )

                except Exception as exc:
                    logger.exception("Tool execution failed: %s", tool_name)
                    tool_result = {
                        "success": False,
                        "error": str(exc),
                    }

                duration = time.time() - t0
                tools_duration_total += duration

                tool_logs.append({
                    "iteration": iteration,
                    "tool_name": tool_name,
                    "arguments": tool_args,
                    "result": tool_result,
                    "duration_ms": round(duration * 1000, 2),
                })

                # Collect RAG citations.
                if tool_name in (
                    "search_advisories",
                    "search_schemes",
                ):
                    if isinstance(tool_result, dict):
                        for chunk in tool_result.get("chunks", []):
                            sources.append({
                                "source": chunk.get("source", "unknown"),
                                "page": chunk.get("page", 1),
                                "citation": chunk.get("citation", ""),
                                "score": chunk.get("score", 0),
                            })

                # Send tool result back to the LLM.
                messages.append({
                    "role": "assistant",
                    "content": (
                        f"Tool Call: {tool_name}\n"
                        f"Arguments: {json.dumps(tool_args, ensure_ascii=False)}"
                    ),
                })

                messages.append({
                    "role": "user",
                    "content": (
                        f"Tool Result [{tool_name}]: "
                        f"{json.dumps(tool_result, ensure_ascii=False, default=str)}\n"
                        "Use this result to answer the farmer. "
                        "If more tools are needed, call them. "
                        "Otherwise provide the complete final answer."
                    ),
                })

        # If Gemini did not generate an answer, use fallback.
        if not final_answer:
            final_answer = self._generate_fallback_response(
                detected_lang,
                tool_logs,
            )

        total_time = time.time() - start_time

        return {
            "query": user_query,
            "answer": final_answer.strip(),
            "language": detected_lang,
            "tool_calls": tool_logs,
            "sources": sources,
            "timings": {
                "agent_ms": round(
                    max(0, total_time - tools_duration_total) * 1000,
                    2,
                ),
                "tools_ms": round(tools_duration_total * 1000, 2),
                "total_ms": round(total_time * 1000, 2),
            },
        }

    @staticmethod
    def _is_agriculture_query(query: str) -> bool:
        """Basic filter for unrelated questions."""

        text = query.lower()

        agriculture_keywords = [
            "crop", "farming", "farmer", "agriculture",
            "wheat", "rice", "soybean", "sugarcane",
            "onion", "grapes", "cotton", "maize",
            "fertilizer", "fertiliser", "pesticide",
            "insect", "disease", "pest", "soil",
            "irrigation", "water", "weather", "rain",
            "mandi", "price", "market", "harvest",
            "seed", "production", "yield", "scheme",
            "pm-kisan", "insurance", "spray",
            "शेती", "शेतकरी", "पीक", "पिक", "खत",
            "पाणी", "पाऊस", "हवामान", "भाव", "बाजार",
            "गहू", "कांदा", "ऊस", "सोयाबीन", "द्राक्ष",
            "कृषि", "किसान", "फसल", "मौसम", "बारिश",
            "गेहूं", "धान", "खाद", "बीज", "सिंचाई",
            "मंडी", "योजना", "कीटनाशक",
            "sheti", "shetkari", "pik", "pani",
            "paus", "bhav", "kisan", "fasal",
            "kheti", "mausam", "sinchai",
        ]

        return any(word in text for word in agriculture_keywords)

    @staticmethod
    def _out_of_scope_response(lang: LanguageCode) -> str:
        """Politely decline unrelated questions."""

        if lang == "mr":
            return (
                "माफ करा, मी किसान व्हॉइस असिस्टंट आहे. "
                "मी फक्त शेती, पिके, हवामान, बाजारभाव आणि "
                "शासकीय कृषी योजनांबद्दल माहिती देऊ शकतो. "
                "कृपया शेतीसंबंधित प्रश्न विचारा."
            )

        if lang == "hi":
            return (
                "क्षमा कीजिए, मैं किसान वॉइस असिस्टेंट हूँ। "
                "मैं केवल खेती, फसल, मौसम, मंडी भाव और "
                "सरकारी कृषि योजनाओं के बारे में जानकारी दे सकता हूँ। "
                "कृपया कृषि से संबंधित प्रश्न पूछें।"
            )

        return (
            "I am Kisan Voice Assistant. "
            "I can help with agriculture, crops, farming, weather, "
            "mandi prices and government agricultural schemes. "
            "Please ask me an agriculture-related question."
        )

    @staticmethod
    def _generate_fallback_response(
        lang: LanguageCode,
        tool_logs: List[Dict[str, Any]],
    ) -> str:
        """Generate a response when the LLM is unavailable."""

        sentences = []

        for log in tool_logs:
            name = log["tool_name"]
            result = log["result"]

            if not isinstance(result, dict):
                continue

            if not result.get("success"):
                continue

            if name == "get_mandi_price":
                district = result.get("district", "")
                commodity = result.get("commodity", "")
                price = result.get("modal_price", "N/A")
                minimum = result.get("min_price", "N/A")
                maximum = result.get("max_price", "N/A")

                if lang == "mr":
                    sentences.append(
                        f"{district} बाजार समितीत {commodity} चा "
                        f"सरासरी भाव ₹{price} प्रति क्विंटल आहे. "
                        f"किमान भाव ₹{minimum} आणि कमाल भाव ₹{maximum} आहे."
                    )
                elif lang == "hi":
                    sentences.append(
                        f"{district} मंडी में {commodity} का औसत भाव "
                        f"₹{price} प्रति क्विंटल है। न्यूनतम ₹{minimum} "
                        f"और अधिकतम ₹{maximum} है।"
                    )
                else:
                    sentences.append(
                        f"In {district}, {commodity} modal price is "
                        f"₹{price} per quintal. Minimum: ₹{minimum}, "
                        f"maximum: ₹{maximum}."
                    )

            elif name == "get_weather_forecast":
                forecast = result.get("forecast", [])

                if not forecast:
                    continue

                day = forecast[0]
                location = result.get("location", "")

                if lang == "mr":
                    sentences.append(
                        f"{location} येथे कमाल तापमान "
                        f"{day.get('max_temperature_c', 'N/A')}°C "
                        f"आणि पावसाची शक्यता "
                        f"{day.get('precipitation_probability_pct', 'N/A')}% आहे."
                    )
                elif lang == "hi":
                    sentences.append(
                        f"{location} में अधिकतम तापमान "
                        f"{day.get('max_temperature_c', 'N/A')}°C "
                        f"और बारिश की संभावना "
                        f"{day.get('precipitation_probability_pct', 'N/A')}% है।"
                    )
                else:
                    sentences.append(
                        f"In {location}, maximum temperature is "
                        f"{day.get('max_temperature_c', 'N/A')}°C "
                        f"and rain probability is "
                        f"{day.get('precipitation_probability_pct', 'N/A')}%."
                    )

            elif name in ("search_advisories", "search_schemes"):
                chunks = result.get("chunks", [])

                if not chunks:
                    continue

                for chunk in chunks[:3]:
                    content = chunk.get("content", "")
                    citation = chunk.get("citation", "")

                    if content:
                        sentences.append(
                            f"{content} {citation}".strip()
                        )

        if sentences:
            return " ".join(sentences)

        if lang == "mr":
            return (
                "माफ करा, सध्या खात्रीशीर माहिती उपलब्ध नाही. "
                "कृपया पुन्हा प्रयत्न करा किंवा जवळच्या कृषी विज्ञान केंद्राशी संपर्क साधा."
            )

        if lang == "hi":
            return (
                "क्षमा करें, अभी सत्यापित जानकारी उपलब्ध नहीं है। "
                "कृपया दोबारा प्रयास करें या नजदीकी कृषि विज्ञान केंद्र से संपर्क करें।"
            )

        return (
            "Sorry, I could not retrieve verified information right now. "
            "Please try again or contact your nearest Krishi Vigyan Kendra."
        )
