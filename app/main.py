from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.routes.search import router as search_router

app = FastAPI(
    title="AI Tools RAG API",
    description="Hybrid search + LLM-powered AI tool recommender",
    version="1.0.0",
)

# Allow all origins (tighten after you have a CloudFront domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)

@app.get("/")
def root():
    return {"message": "AI Tools RAG API running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# AWS Lambda entrypoint — MUST be named `handler`
handler = Mangum(app)
