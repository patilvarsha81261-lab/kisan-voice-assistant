"""MCP Server for Government Schemes RAG Search."""

import logging
from typing import Any, Dict, List
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mcp_servers.schemes")

mcp = FastMCP("schemes_server")


@mcp.tool()
async def search_schemes(query: str, top_k: int = 3) -> Dict[str, Any]:
    """Search official government scheme guidelines (PM-KISAN, PMFBY crop insurance) for eligibility, amounts, and rules.

    Args:
        query: Specific scheme inquiry (e.g., 'PM-KISAN installment amount', 'eKYC rules', 'income tax exclusion').
        top_k: Maximum number of relevant chunks to retrieve (default: 3).

    Returns:
        Structured search results with source document name, page number, and authoritative text.
    """
    clean_query = query.strip()
    if not clean_query:
        return {
            "success": False,
            "error": "Query cannot be empty",
            "chunks": [],
        }

    try:
        # Dynamically import HybridRetriever
        from src.rag.retriever import HybridRetriever

        retriever = HybridRetriever(collection_name="govt_schemes")
        results = retriever.retrieve(clean_query, top_k=top_k)

        formatted_chunks: List[Dict[str, Any]] = []
        for r in results:
            formatted_chunks.append({
                "source": r.source,
                "page": r.page,
                "citation": r.format_citation(),
                "score": round(r.score, 4),
                "content": r.text,
            })

        return {
            "success": True,
            "query": clean_query,
            "count": len(formatted_chunks),
            "chunks": formatted_chunks,
        }
    except Exception as e:
        logger.error(f"Schemes RAG error for query '{query}': {e}")
        return {
            "success": False,
            "error": f"Failed to retrieve scheme documents: {str(e)}",
            "chunks": [],
        }


if __name__ == "__main__":
    mcp.run()
