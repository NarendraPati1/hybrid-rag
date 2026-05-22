import json
import os
import pandas as pd
from dotenv import load_dotenv
import sys
from pathlib import Path

# Add project root to Python path so it can find the 'app' module
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load env before importing app modules
load_dotenv()

from app.rag.retriever import retrieve_tools
from app.rag.generator import generate_response

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

def run_eval():
    print("Loading test queries...")
    with open("evaluation/test_queries.json", "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    data = {
        "user_input": [],
        "response": [],
        "retrieved_contexts": [],
        "reference": []
    }

    # Limit to 3 queries for quick testing locally, evaluating takes time and money
    num_tests = 2
    # num_tests = len(test_cases)
    print(f"Running RAG pipeline on {num_tests} queries...")
    
    for i, case in enumerate(test_cases[:num_tests]):
        query = case["question"]
        print(f"[{i+1}/{num_tests}] Processing: '{query}'")
        
        # 1. Retrieve
        retrieval_data = retrieve_tools(query)
        
        # 2. Generate
        response_data = generate_response(query, retrieval_data)
        
        # 3. Format answer
        # The app returns a list of tools with reasoning. We combine them to form a cohesive "answer".
        answer_parts = []
        for tool in response_data.get("tools", []):
            answer_parts.append(f"{tool['tool_name']}: {tool.get('reasoning', '')}")
        answer = "\n".join(answer_parts)
        
        # 4. Format contexts
        contexts = []
        for t in retrieval_data.get("results", []):
            contexts.append(f"{t['tool_name']} - {t.get('category', '')}: {t.get('description', '')}. Features: {', '.join(t.get('features', []))}")
            
        data["user_input"].append(query)
        data["response"].append(answer)
        data["retrieved_contexts"].append(contexts)
        data["reference"].append(case["ground_truth"])
        
    dataset = Dataset.from_dict(data) 
    
    print("\nInitializing Ragas evaluator with Google Gemini...")
    # Ragas requires LLM and Embeddings to score the metrics
    # We use Gemini 2.5 Flash as a fast, cheap judge
    eval_llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    eval_embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2")
    
    ragas_llm = LangchainLLMWrapper(eval_llm)
    ragas_emb = LangchainEmbeddingsWrapper(eval_embeddings)
    
    print("Running RAGAS evaluation metrics...")
    try:
        result = evaluate(
            dataset=dataset,
            metrics=[
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall,
            ],
            llm=ragas_llm,
            embeddings=ragas_emb
        )
        
        df = result.to_pandas()
        df.to_csv("evaluation/ragas_results.csv", index=False)
        print("\n=== Evaluation Results ===")
        print(result)
        print("\nDetailed results saved to evaluation/ragas_results.csv")
    except Exception as e:
        print(f"\nError during Ragas evaluation: {e}")

if __name__ == "__main__":
    run_eval()
