"""Unit tests for Kisan Agent tool calling loop and language detection."""

import pytest
from src.agent import KisanAgent
from src.language import detect_language


def test_language_detection():
    """Verify Marathi, Hindi, and English auto-detection."""
    # Marathi with Devanagari
    assert detect_language("कोल्हापुरात आज उसाचा दर काय आहे?") == "mr"
    # Marathi transliterated Latin
    assert detect_language("Kolhapur madhe aaj sugarcane cha bhav kay aahe?") == "mr"
    # Hindi with Devanagari
    assert detect_language("पुणे में कल बारिश होगी क्या?") == "hi"
    # English
    assert detect_language("Will it rain tomorrow in Kolhapur?") == "en"


@pytest.mark.asyncio
async def test_agent_out_of_scope():
    """Verify out-of-scope queries are politely declined."""
    agent = KisanAgent()
    res = await agent.execute("How do I buy bitcoin?")
    assert "शेती" in res["answer"] or "agriculture" in res["answer"].lower() or "कृषि" in res["answer"]
    assert len(res["tool_calls"]) == 0
