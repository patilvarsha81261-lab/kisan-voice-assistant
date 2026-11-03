"""Unit tests for MCP Tools (Weather, Mandi, Schemes)."""

import pytest
from src.mcp_servers.weather_server import get_weather_forecast
from src.mcp_servers.mandi_server import get_mandi_price


@pytest.mark.asyncio
async def test_weather_tool_valid():
    """Verify weather forecast tool returns structure with rain and temp."""
    result = await get_weather_forecast("Kolhapur", days=2)
    assert result["success"] is True
    assert "Kolhapur" in result["location"]
    assert len(result["forecast"]) == 2
    first_day = result["forecast"][0]
    assert "max_temperature_c" in first_day
    assert "precipitation_probability_pct" in first_day


@pytest.mark.asyncio
async def test_mandi_price_tool_cached():
    """Verify mandi price tool returns modal price and APMC market."""
    result = await get_mandi_price("sugarcane", "Kolhapur", "Maharashtra")
    assert result["success"] is True
    assert result["commodity"] == "Sugarcane"
    assert result["district"] == "Kolhapur"
    assert result["modal_price"] > 0
    assert "Kolhapur APMC" in result["market"]


@pytest.mark.asyncio
async def test_mandi_price_tool_unknown_crop():
    """Verify unknown crop returns failure without inventing prices."""
    result = await get_mandi_price("nonexistent_exotic_crop", "Kolhapur")
    assert result["success"] is False
    assert "Never invent" in result["error"]
