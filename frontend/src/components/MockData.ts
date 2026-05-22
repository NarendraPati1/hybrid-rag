export interface ToolRecommendation {
  tool_name: string;
  reasoning: string;
  confidence: number;
  citations: string[];
  logo_url?: string;
  website?: string;
  category?: string;
  pricing?: string;
}

export interface SearchResponse {
  query: string;
  strategy: string;
  filters: Record<string, any>;
  tools: ToolRecommendation[];
}

export const MOCK_RESPONSES: Record<string, SearchResponse> = {
  "low-code visual builder for langchain": {
    query: "low-code visual builder for langchain",
    strategy: "hybrid",
    filters: {
      category: "LLM Framework",
      tags: ["low-code", "visual builder"]
    },
    tools: [
      {
        tool_name: "Flowise",
        reasoning: "Flowise is a low-code visual builder specifically designed for LangChain and LLM workflows, making it a direct match for the user's query. Its features such as drag-and-drop interface, LangChain integration, and API deployment align well with the requirements of a low-code visual builder for LangChain.",
        confidence: 0.95,
        citations: [
          "Low-code visual builder for LangChain and LLM workflows",
          "drag-and-drop interface",
          "LangChain integration",
          "API deployment"
        ],
        logo_url: "https://cdn.simpleicons.org/flowise",
        website: "https://flowiseai.com"
      },
      {
        tool_name: "Langflow",
        reasoning: "Langflow is another strong match as it offers a visual builder and low-code IDE for building LangChain-based AI applications. Its features like visual flow editor, component library, and RAG support are highly relevant to the query, although it might be slightly more focused on the development aspect compared to Flowise.",
        confidence: 0.90,
        citations: [
          "Visual builder and low-code IDE for building LangChain-based AI applications",
          "visual flow editor",
          "component library",
          "RAG support"
        ],
        logo_url: "https://avatars.githubusercontent.com/langflow-ai?s=128",
        website: "https://www.langflow.org"
      },
      {
        tool_name: "Dify",
        reasoning: "Dify, while being an open-source platform for building and operating LLM-powered applications, does offer a visual workflow. However, its primary focus seems to be broader than just low-code visual building for LangChain, including aspects like prompt IDE, RAG pipeline, and model management, making it a less direct match compared to Flowise and Langflow.",
        confidence: 0.70,
        citations: [
          "Open-source platform for building and operating LLM-powered applications",
          "visual workflow"
        ],
        logo_url: "https://cdn.simpleicons.org/dify",
        website: "https://dify.ai"
      }
    ]
  },
  "what vector database is written in rust": {
    query: "what vector database is written in rust",
    strategy: "bm25",
    filters: {
      category: "Vector Database"
    },
    tools: [
      {
        tool_name: "Qdrant",
        reasoning: "Qdrant is a vector database written in Rust, which matches the user's query. It is a high-performance vector similarity search engine and database, making it a suitable choice for applications that require efficient vector search and filtering capabilities.",
        confidence: 0.99,
        citations: [
          "High-performance vector similarity search engine and database written in Rust",
          "vector search",
          "filtering"
        ],
        logo_url: "https://cdn.simpleicons.org/qdrant",
        website: "https://qdrant.tech"
      }
    ]
  },
  "free agent frameworks": {
    query: "free agent frameworks",
    strategy: "dense",
    filters: {
      pricing: "free",
      category: "LLM Framework"
    },
    tools: [
      {
        tool_name: "CrewAI",
        reasoning: "CrewAI is a powerful open-source agent framework that operates on a role-playing, collaborative agent model. It allows building complex multi-agent setups for automation tasks, and is fully free to self-host and run.",
        confidence: 0.92,
        citations: [
          "Open-source collaborative agent framework",
          "Role-playing multi-agent systems",
          "Automation and tool use integrations"
        ],
        logo_url: "https://avatars.githubusercontent.com/crewAIInc?s=128",
        website: "https://www.crewai.com"
      },
      {
        tool_name: "AutoGen",
        reasoning: "AutoGen is a free Microsoft framework enabling conversational multi-agent applications. It allows agents to interact with each other to solve tasks, utilizing human feedback or LLM capabilities.",
        confidence: 0.88,
        citations: [
          "Multi-agent conversation framework by Microsoft",
          "Customizable agent behaviors",
          "LLM orchestration and code execution"
        ],
        logo_url: "https://avatars.githubusercontent.com/microsoft?s=128",
        website: "https://microsoft.github.io/autogen/"
      }
    ]
  }
};

// Fallback search mock for any query
export const getFallbackMockResponse = (query: string): SearchResponse => {
  return {
    query: query,
    strategy: "dense",
    filters: {},
    tools: [
      {
        tool_name: "LangChain",
        reasoning: `Found relevant matches for "${query}". LangChain is a framework for building context-aware LLM applications, AI agents, and RAG pipelines. It provides the building blocks for memory, tool calling, and workflow sequencing.`,
        confidence: 0.85,
        citations: ["Framework for context-aware LLM applications", "AI agents", "RAG pipelines"],
        logo_url: "https://cdn.simpleicons.org/langchain",
        website: "https://langchain.com"
      },
      {
        tool_name: "LlamaIndex",
        reasoning: `Highly relevant matching tool for "${query}". LlamaIndex is a data framework for connecting custom data sources with large language models, featuring structured indexing, vector stores, and custom retrievers.`,
        confidence: 0.82,
        citations: ["Data framework for connecting custom data sources", "vector indexing", "retrieval pipelines"],
        logo_url: "https://cdn.simpleicons.org/llamaindex",
        website: "https://llamaindex.ai"
      }
    ]
  };
};

export const getMockResponse = (query: string): SearchResponse => {
  const normalized = query.toLowerCase().trim();
  if (MOCK_RESPONSES[normalized]) {
    return MOCK_RESPONSES[normalized];
  }
  
  // Try partial matching
  const keys = Object.keys(MOCK_RESPONSES);
  for (const key of keys) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return MOCK_RESPONSES[key];
    }
  }
  
  return getFallbackMockResponse(query);
};
