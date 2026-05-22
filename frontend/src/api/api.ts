/**
 * API helper — all calls to the AWS API Gateway backend go through here.
 * Base URL is injected at build time via the VITE_API_BASE env variable.
 */

const BASE_URL = import.meta.env.VITE_API_BASE as string;

// ── Types ──────────────────────────────────────────────────────────────────

export interface ToolResult {
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
  tools: ToolResult[];
  strategy: string;
  filters?: Record<string, unknown>;
}

export interface ToolsResponse {
  tools: ToolResult[];
}

export interface HealthResponse {
  status: string;
}

// ── Health check ───────────────────────────────────────────────────────────

export async function healthCheck(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// ── Get all tools (directory / browse view) ────────────────────────────────

export async function getTools(): Promise<ToolsResponse> {
  const res = await fetch(`${BASE_URL}/api/tools`);
  if (!res.ok) throw new Error(`getTools failed: ${res.status}`);
  return res.json();
}

// ── Semantic / hybrid search ───────────────────────────────────────────────

export async function searchTools(query: string): Promise<SearchResponse> {
  const res = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`searchTools failed: ${res.status}`);
  return res.json();
}
