# Stackwise — AI Tools Directory

> Hybrid RAG-powered AI tool recommender with semantic search, BM25 keyword search, LLM-generated recommendations, and a React frontend deployed on Vercel.

---

## Table of Contents

1. [How the System Works](#how-the-system-works)
2. [Phase 1 — Data Ingestion & Embedding](#phase-1--data-ingestion--embedding)
3. [Phase 2 — Search Request Flow](#phase-2--search-request-flow)
4. [Phase 3 — LLM Generation](#phase-3--llm-generation)
5. [Phase 4 — API Layer (AWS)](#phase-4--api-layer-aws)
6. [Phase 5 — Frontend & Vercel Deployment](#phase-5--frontend--vercel-deployment)
7. [Project Structure](#project-structure)
8. [Local Setup](#local-setup)
9. [Data Pipeline — Adding New Tools](#data-pipeline--adding-new-tools)
10. [Deployment Guide](#deployment-guide)
11. [Environment Variables](#environment-variables)
12. [Tech Stack](#tech-stack)

---

## How the System Works

Stackwise is a **Retrieval-Augmented Generation (RAG)** system. When a user types a query like *"free tool for building AI agents"*, the system:

1. **Routes** the query using an LLM to decide the best search strategy
2. **Retrieves** relevant tools via dense vector search (Pinecone) and/or keyword search (BM25)
3. **Fuses** both result sets using Reciprocal Rank Fusion (RRF)
4. **Generates** a structured recommendation with reasoning using Groq LLM
5. **Returns** the JSON response to the React frontend

```
User types query
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  (React + Vite, deployed on Vercel)                   │
│  User types a search query → POST /api/search                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTPS request
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  AWS API GATEWAY                                                 │
│  Receives HTTP request, routes it to Lambda                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │  invokes
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  AWS LAMBDA  (Docker image — FastAPI + Mangum)                  │
│                                                                  │
│  1. LLM Router   → decides: dense / bm25 / hybrid + filters     │
│  2. Dense Search → fastembed query → Pinecone vector search      │
│  3. BM25 Search  → tokenize query → BM25 index search            │
│  4. RRF Fusion   → merge + rerank both result sets               │
│  5. LLM Generate → Groq LLM writes recommendation reasoning      │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │  JSON response
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND renders tool cards with name, reasoning, confidence   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Data Ingestion & Embedding

This is the **offline pipeline** that runs locally before deployment. It only needs to run again when you add new tools.

### Step 1 — The Dataset

All tools live in `app/ai_tools_dataset.json`. Each tool looks like:

```json
{
  "tool_name": "LangChain",
  "category": "AI Frameworks",
  "description": "A framework for building LLM-powered applications...",
  "pricing": "Open-source",
  "website": "https://langchain.com",
  "github": "https://github.com/langchain-ai/langchain",
  "tags": ["agents", "chains", "llm"],
  "features": ["tool calling", "memory", "streaming"],
  "use_cases": ["chatbots", "RAG pipelines", "agents"],
  "problems_solved": ["LLM orchestration", "context management"],
  "similar_to": ["LlamaIndex", "Haystack"],
  "keywords": ["langchain", "llm framework"],
  "logo_url": "https://..."
}
```

### Step 2 — Building Embed Text

Before embedding, `pipeline/ingest.py` constructs a rich descriptive sentence from each tool's fields:

```
"LangChain is an AI tool. Category: AI Frameworks.
 A framework for building LLM-powered applications...
 Key features include tool calling, memory, streaming.
 Common use cases are chatbots, RAG pipelines, agents.
 Pricing model: Open-source."
```

This ensures the embedding captures all semantic dimensions of the tool.

### Step 3 — Generating Embeddings

Model: **`BAAI/bge-small-en-v1.5`** via `sentence-transformers`

- Produces a **384-dimensional vector** for each tool's embed text
- Batch size: 32 tools at a time

### Step 4 — Uploading to Pinecone

Each vector is upserted into Pinecone with its full metadata:

```python
{
  "id": "langchain",              # tool_name lowercased + hyphenated
  "values": [0.021, -0.041, ...], # 384-dim float vector
  "metadata": {
    "tool_name": "LangChain",
    "category": "AI Frameworks",
    "pricing": "Open-source",
    "website": "...",
    ...
  }
}
```

Pinecone stores these vectors in a cloud index (`rag-demo`) for fast approximate nearest-neighbor search.

### Step 5 — Building the BM25 Index

A separate sparse index is built from keyword tokens of each tool using `rank-bm25`:

```python
# tokens for LangChain:
["langchain", "ai", "frameworks", "agents", "chains", "tool", "calling", ...]
```

The BM25 index is saved as `app/bm25_index.pkl` and **baked into the Docker image** at build time, so Lambda can load it instantly on cold start.

---

## Phase 2 — Search Request Flow

When a user submits a query, Lambda processes it through 4 stages:

### Stage 1 — LLM Router (`app/rag/retriever.py`)

Before searching, **Groq LLM (Llama 3.3 70B)** analyses the query and returns a routing decision:

```json
{
  "strategy": "hybrid",
  "filters": {
    "pricing": "free",
    "category": "AI Frameworks"
  },
  "semantic_query": "building AI agents"
}
```

| Strategy | Used when |
|---|---|
| `dense` | Conceptual or abstract queries — *"tools for debugging chatbots"* |
| `bm25` | Keyword/tool-name lookups — *"LangChain"*, *"Pinecone vector DB"* |
| `hybrid` | Mixed — *"free open-source framework for agents"* |

Filters (pricing, category, tags, use_cases, features) are extracted and applied to narrow results before search.

### Stage 2 — Dense Vector Search

The `semantic_query` is embedded using **`fastembed`** (`BAAI/bge-small-en-v1.5`, ONNX runtime):

```python
embedding = [float(x) for x in next(iter(model.embed([semantic_query])))]
```

> **Why fastembed and not sentence-transformers?**
> fastembed uses ONNX Runtime instead of PyTorch — no GPU dependency, ~300MB smaller Docker image, faster Lambda cold start. Both libraries produce **identical vectors** for the same model.

The 384-dim query vector is sent to Pinecone with any filters:

```python
index.query(vector=embedding, top_k=20, filter={"pricing": {"$eq": "free"}})
```

Pinecone returns the top-K most similar tool vectors by cosine similarity.

### Stage 3 — BM25 Keyword Search

In parallel, the raw query is tokenized and scored against the BM25 index:

```python
tokens = clean_tokens("free framework for building AI agents")
# → ["free", "framework", "build", "ai", "agent"]

scores = bm25.get_scores(tokens)
```

BM25 ranks all tools by keyword frequency/relevance. Filters are applied after scoring.

### Stage 4 — Reciprocal Rank Fusion (RRF)

Both result lists are merged using **RRF** — a rank-based fusion that doesn't depend on raw scores (which aren't comparable between dense and sparse):

```
RRF_score(tool) = 1/(60 + dense_rank) + 1/(60 + bm25_rank)
```

Tools appearing high in **both** lists get the highest combined score. The top 10 are passed to the LLM.

---

## Phase 3 — LLM Generation

The top retrieved tools are formatted into a context block and sent to **Groq (Llama 3.3 70B)**:

```
[1] Tool Name: LangChain
Category: AI Frameworks
Pricing: Open-source
Description: A framework for building LLM-powered applications...
Features: tool calling, memory, streaming
Use Cases: chatbots, RAG pipelines, agents
```

The LLM returns a structured JSON response:

```json
{
  "tools": [
    {
      "tool_name": "LangChain",
      "reasoning": "LangChain is ideal for building stateful AI agents because it provides...",
      "confidence": 0.95,
      "citations": ["tool calling", "memory", "agent support"],
      "logo_url": "https://...",
      "website": "https://langchain.com",
      "category": "AI Frameworks",
      "pricing": "Open-source"
    }
  ],
  "query": "free framework for building AI agents",
  "strategy": "hybrid",
  "filters": { "pricing": "free" }
}
```

If the LLM call fails, a **fallback** response is returned automatically using the raw retrieval data.

---

## Phase 4 — API Layer (AWS)

### FastAPI + Mangum

The backend is a **FastAPI** app wrapped with **Mangum** to run inside AWS Lambda:

```python
# app/main.py
handler = Mangum(app)   # ← Lambda calls this function
```

Mangum translates the AWS API Gateway HTTP event into a standard ASGI request that FastAPI understands.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{"status": "ok"}` |
| `GET` | `/api/tools` | Returns all tools (for browse/directory view) |
| `POST` | `/api/search` | Hybrid RAG search with LLM recommendation |

### Docker → ECR → Lambda

The app is packaged as a Docker image based on `public.ecr.aws/lambda/python:3.12`:

1. **Dependencies installed** — `pip install -r requirements.txt`
2. **Model pre-warmed** — `BAAI/bge-small-en-v1.5` ONNX model is downloaded and baked into the image at build time so Lambda doesn't download it on every cold start
3. **App code copied** — `app/` folder (includes `bm25_index.pkl` and `ai_tools_dataset.json`)
4. **Lambda handler set** — `CMD ["app.main.handler"]`

The image is pushed to **AWS ECR** and Lambda pulls it from there.

### AWS API Gateway

API Gateway sits in front of Lambda:
- Acts as the public HTTPS endpoint
- Routes all `{proxy+}` requests to Lambda
- CORS headers are configured to allow requests from the Vercel frontend domain

```
https://ijjedtz7y5.execute-api.ap-south-1.amazonaws.com
                    ↓
              Lambda Function
```

---

## Phase 5 — Frontend & Vercel Deployment

### React + Vite + TypeScript

The frontend lives in `frontend/`. It communicates with the backend via a centralized API layer:

```typescript
// frontend/src/api/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE;

export async function searchTools(query: string): Promise<SearchResponse> {
  const res = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}
```

`VITE_API_BASE` is the API Gateway URL, injected at **build time** via environment variable — so no secrets are ever hardcoded.

### Vercel Deployment

1. Push `frontend/` to GitHub (already done ✅)
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   VITE_API_BASE = https://ijjedtz7y5.execute-api.ap-south-1.amazonaws.com
   ```
5. Vercel auto-detects Vite and builds with `npm run build`
6. Every `git push` to `main` triggers an automatic redeploy

```
Developer pushes code
        │
        ▼
   GitHub (main branch)
        │
        ▼ (webhook)
   Vercel Build
   npm run build
        │
        ▼
   Static files deployed
   to Vercel CDN (global edge)
        │
        ▼
   https://your-app.vercel.app
```

### Frontend → Backend Call Flow

```
User types "best free AI agents framework"
              │
              ▼
     React component calls searchTools()
              │
              ▼
     POST https://<api-gateway>/api/search
     Body: { "query": "best free AI agents framework" }
              │
              ▼ (crosses the internet)
     API Gateway → Lambda cold/warm start
              │
              ▼
     LLM Router → Dense + BM25 → RRF → LLM Generate
              │
              ▼
     JSON response with tool recommendations
              │
              ▼
     React renders ToolCard components
```

---

## Project Structure

```
Project/
│
├── app/                            # FastAPI backend — deployed to AWS Lambda
│   ├── main.py                     # App entry point + Mangum Lambda handler
│   ├── ai_tools_dataset.json       # Master dataset (source of truth)
│   ├── bm25_index.pkl              # Generated BM25 index (not in git, baked into Docker)
│   │
│   ├── db/
│   │   └── pinecone_client.py      # Pinecone connection helper
│   │
│   ├── rag/
│   │   ├── retriever.py            # LLM router + dense + BM25 + RRF fusion
│   │   ├── generator.py            # LLM recommendation generation (Groq)
│   │   ├── prompts.py              # System prompts for router + generator
│   │   └── schemas.py              # Pydantic models for request/response
│   │
│   ├── routes/
│   │   └── search.py               # /api/search and /api/tools endpoints
│   │
│   └── utils/
│       └── helpers.py              # Text tokenization, cleaning utilities
│
├── pipeline/                       # Offline data ingestion — runs locally only
│   ├── ingest.py                   # Embed tools + upsert Pinecone + rebuild BM25
│   └── merge.py                    # Merge new JSON files into master dataset safely
│
├── frontend/                       # React + Vite frontend — deployed to Vercel
│   ├── src/
│   │   ├── api/api.ts              # All HTTP calls to backend (centralized)
│   │   ├── components/             # ToolCard, Header, Filters components
│   │   ├── App.tsx                 # Root component + routing
│   │   └── index.css               # Global styles
│   ├── .env.example                # Template — copy to .env with your API Gateway URL
│   └── package.json
│
├── Dockerfile                      # Lambda-compatible Docker image
├── requirements.txt                # Backend Python dependencies
├── .env.example                    # Template for backend secrets
└── README.md
```

---

## Local Setup

### Backend

```bash
# 1. Create virtual environment
python -m venv rag
.\rag\Scripts\activate        # Windows
source rag/bin/activate       # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set secrets
cp .env.example .env
# Edit .env with your real API keys

# 4. Build BM25 index (first time only)
python -m pipeline.ingest --mode rebuild-bm25

# 5. Run locally
uvicorn app.main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE=https://<your-api-gateway-url>

npm run dev
# → http://localhost:5173
```

---

## Data Pipeline — Adding New Tools

```bash
# 1. Create a JSON file with new tools (same schema as ai_tools_dataset.json)

# 2. Merge into master dataset (deduplicates by tool_name automatically)
python -m pipeline.merge --new new_tools.json

# 3. Push new vectors to Pinecone — NO REDEPLOY NEEDED
python -m pipeline.ingest --mode incremental

# 4. Rebuild BM25 index — requires Docker rebuild + Lambda redeploy
python -m pipeline.ingest --mode rebuild-bm25
```

| Mode | What it does | Needs redeploy? |
|---|---|---|
| `incremental` | Only adds new tools to Pinecone | ❌ No |
| `full` | Wipes Pinecone, reindexes everything | ❌ No |
| `rebuild-bm25` | Rebuilds BM25 pickle | ✅ Yes |

---

## Deployment Guide

### Backend (AWS Lambda)

```bash
# 1. Authenticate Docker to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com

# 2. Build image
docker build -t rag-backend .

# 3. Tag and push to ECR
docker tag rag-backend <account-id>.dkr.ecr.ap-south-1.amazonaws.com/rag-backend:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/rag-backend:latest

# 4. Update Lambda to use new image (AWS Console or CLI)
aws lambda update-function-code \
  --function-name stackwise-backend \
  --image-uri <account-id>.dkr.ecr.ap-south-1.amazonaws.com/rag-backend:latest
```

### Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import `NarendraPati1/hybrid-rag` from GitHub
3. Set **Root Directory** → `frontend`
4. Add environment variable: `VITE_API_BASE` = your API Gateway URL
5. Click **Deploy** — done. Every `git push` to `main` auto-redeploys.

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `PINECONE_API_KEY` | ✅ | Pinecone project API key |
| `GROQ_API_KEY` | ✅ | Groq API key (LLM router + generator) |
| `GOOGLE_API_KEY` | ✅ | Google Gemini API key |
| `PINECONE_INDEX` | Optional | Index name, defaults to `rag-demo` |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE` | ✅ | Full URL of your AWS API Gateway endpoint |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend framework | FastAPI | REST API |
| Lambda adapter | Mangum | Translates API Gateway events to ASGI |
| Dense embedding (query) | fastembed + ONNX | `BAAI/bge-small-en-v1.5` — no PyTorch |
| Dense embedding (index) | sentence-transformers | Same model, used offline in pipeline |
| Vector database | Pinecone | Approximate nearest-neighbor search |
| Sparse search | rank-bm25 | Keyword frequency scoring |
| Result fusion | RRF (custom) | Rank-based merging of dense + sparse |
| LLM router | Groq — Llama 3.3 70B | Decides search strategy + extracts filters |
| LLM generator | Groq — Llama 3.3 70B | Writes structured tool recommendations |
| Containerization | Docker | Lambda-compatible image |
| Container registry | AWS ECR | Hosts Docker image for Lambda |
| Compute | AWS Lambda | Serverless, scales to zero |
| API layer | AWS API Gateway | Public HTTPS endpoint |
| Frontend | React + Vite + TypeScript | User interface |
| Frontend hosting | Vercel | Global CDN, auto-deploys from GitHub |
