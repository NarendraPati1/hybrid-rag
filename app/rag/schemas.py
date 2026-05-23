from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# --- Router Input/Output Schemas ---

class RouterFilters(BaseModel):
    pricing: Optional[str] = Field(default=None, description="One of: free, freemium, paid, open-source")
    category: Optional[str] = Field(default=None, description="Exact category name matched from available categories")
    tags: Optional[List[str]] = Field(default=None, description="Tags associated with the tools")
    features: Optional[List[str]] = Field(default=None, description="Features of the tools")
    use_cases: Optional[List[str]] = Field(default=None, description="Use cases of the tools")

class RouterOutput(BaseModel):
    strategy: str = Field(description="dense, bm25, or hybrid")
    filters: RouterFilters = Field(default_factory=RouterFilters, description="Query filters parsed from the query")
    semantic_query: str = Field(description="Cleaned search query with filter keywords removed")

# --- Search Request/Response Schemas ---

class SearchRequest(BaseModel):
    query: str = Field(description="The natural language user query to search and recommend tools for")

class ToolRecommendation(BaseModel):
    tool_name: str = Field(description="Name of the recommended tool")
    reasoning: str = Field(description="Detailed reason explaining why this tool is recommended based on query and context features")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0 showing recommendation match quality")
    citations: List[str] = Field(description="Sources, features, or context details cited as basis for the recommendation")
    logo_url: Optional[str] = Field(default=None, description="Logo URL of the tool if available in the context")
    website: Optional[str] = Field(default=None, description="Website URL of the tool if available in the context")
    category: Optional[str] = Field(default=None, description="Category of the tool")
    pricing: Optional[str] = Field(default=None, description="Pricing model of the tool")

class SearchResponse(BaseModel):
    query: str = Field(description="The original user query")
    strategy: str = Field(description="The retrieval strategy used (dense, bm25, or hybrid)")
    filters: Dict[str, Any] = Field(description="Filters applied to retrieval")
    tools: List[ToolRecommendation] = Field(description="Ranked list of tool recommendations with generated reasoning")
    debug_info: Optional[Dict[str, Any]] = Field(default=None, description="Diagnostic information for the entire RAG pipeline")
