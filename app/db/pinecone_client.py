import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

def get_pinecone_index(index_name: str = None):
    """
    Returns a Pinecone Index object.
    index_name priority: argument > INDEX_NAME env var > "rag-demo"
    """
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")

    resolved_index = index_name or os.getenv("INDEX_NAME", "rag-demo")
    pc = Pinecone(api_key=api_key)
    return pc.Index(resolved_index)
