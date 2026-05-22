from fastapi import APIRouter, HTTPException
from app.rag.schemas import SearchRequest, SearchResponse
from app.rag.retriever import retrieve_tools, _get_tools
from app.rag.generator import generate_response

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/tools")
def get_all_tools():
    try:
        tools = _get_tools()
        formatted = [
            {
                "tool_name": tool["tool_name"],
                "reasoning": tool.get("description", ""),
                "confidence": 1.0,
                "citations": tool.get("features", [])[:3],
                "logo_url": tool.get("logo_url"),
                "website": tool.get("website"),
                "category": tool.get("category"),
                "pricing": tool.get("pricing"),
            }
            for tool in tools
        ]
        return {"tools": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tools: {str(e)}")


@router.post("/search", response_model=SearchResponse)
def search_tools(payload: SearchRequest):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    try:
        retrieval_data = retrieve_tools(query)
        response_data  = generate_response(query, retrieval_data)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal search error: {str(e)}")
