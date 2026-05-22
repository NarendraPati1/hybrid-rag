# Stackwise — AI Tools Directory

> Hybrid search (Dense + BM25) + LLM-powered AI tool recommender, deployed on AWS Lambda.

---

## Project Structure

```
Project/
├── app/                        # FastAPI backend (deployed to AWS Lambda)
│   ├── main.py                 # App entry + Mangum Lambda handler
│   ├── ai_tools_dataset.json   # Master tool dataset
│   ├── bm25_index.pkl          # Generated — see pipeline/ (not in git)
│   ├── db/
│   │   └── pinecone_client.py
│   ├── rag/
│   │   ├── retriever.py        # Hybrid search (dense + BM25 + RRF fusion)
│   │   ├── generator.py        # LLM response generation (Gemini/Groq)
│   │   ├── prompts.py
│   │   └── schemas.py
│   ├── routes/
│   │   └── search.py
│   └── utils/
│       └── helpers.py
│
├── pipeline/                   # Offline data ingestion (run locally)
│   ├── ingest.py               # Embed + upsert to Pinecone + rebuild BM25
│   └── merge.py                # Merge new tools into master dataset safely
│
├── frontend/                   # React + Vite frontend
│   ├── src/
│   ├── .env.example            # Copy to .env with your API Gateway URL
│   └── ...
│
├── Dockerfile                  # Lambda-compatible Docker image
├── requirements.txt            # Backend Python dependencies
├── .env.example                # Copy to .env — fill in your API keys
└── README.md
```

---

## Setup

### 1. Backend

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux

pip install -r requirements.txt

# Copy and fill in secrets
cp .env.example .env
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env          # set VITE_API_BASE to your API Gateway URL
npm run dev
```

---

## Data Pipeline (Adding New Tools)

```bash
# 1. Merge new tools into master dataset (deduplicates automatically)
python -m pipeline.merge --new new_tools.json

# 2. Push new vectors to Pinecone (incremental — no redeploy needed)
python -m pipeline.ingest --mode incremental

# 3. Rebuild BM25 index (then redeploy Lambda for it to take effect)
python -m pipeline.ingest --mode rebuild-bm25
```

| Mode | What it does |
|---|---|
| `incremental` | Only adds new tools — safe to run anytime |
| `full` | Wipes Pinecone and reindexes everything |
| `rebuild-bm25` | Rebuilds BM25 pickle only |

---

## Deployment

```bash
# Build and push to AWS ECR
docker build -t rag-backend .
docker tag rag-backend <account-id>.dkr.ecr.<region>.amazonaws.com/rag-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/rag-backend:latest

# Then update Lambda function to use the new image
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Mangum (AWS Lambda) |
| Vector DB | Pinecone |
| Dense Embedding | `fastembed` — `BAAI/bge-small-en-v1.5` |
| Sparse Search | BM25 (rank-bm25) |
| Fusion | Reciprocal Rank Fusion (RRF) |
| LLM | Groq (Llama 3.3 70B) + Google Gemini |
| Frontend | React + Vite + TypeScript |
| Hosting | AWS Lambda + API Gateway + (Vercel/Netlify) |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PINECONE_API_KEY` | ✅ | Pinecone project API key |
| `GROQ_API_KEY` | ✅ | Groq API key (LLM router) |
| `GOOGLE_API_KEY` | ✅ | Google Gemini API key |
| `PINECONE_INDEX` | Optional | Index name, defaults to `rag-demo` |
