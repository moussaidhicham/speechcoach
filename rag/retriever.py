import os
import json
import logging
from typing import List, Dict, Any

try:
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logging.warning("FAISS or sentence-transformers not installed. RAG won't work optimally.")

logger = logging.getLogger(__name__)

class RAGRetriever:
    def __init__(self, kb_path: str = "rag/knowledge_base.json", model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        """
        Initializes the retriever with a multilingual sentence transformer to support French/English.
        `paraphrase-multilingual-MiniLM-L12-v2` is relatively small and fast.
        """
        self.kb_path = kb_path
        self.model_name = model_name
        self.documents: List[Dict[str, Any]] = []
        self.index = None
        self.model = None
        
        if FAISS_AVAILABLE:
            self._load_and_index()

    def _load_and_index(self):
        """Loads documents from json and builds the FAISS index."""
        if not os.path.exists(self.kb_path):
            logger.error(f"Knowledge base not found at {self.kb_path}")
            return

        with open(self.kb_path, 'r', encoding='utf-8') as f:
            self.documents = json.load(f)

        if not self.documents:
            logger.warning("Knowledge base is empty.")
            return

        # Load embedding model
        logger.info(f"Loading SentenceTransformer model: {self.model_name}")
        self.model = SentenceTransformer(self.model_name)
        
        # Build sentences to embed (Combine Title + problem_keywords for vector indexing)
        texts_to_embed = []
        for doc in self.documents:
            # Combining title and keywords makes the semantic search heavily targeted
            text = f"{doc['title']} " + " ".join(doc.get('problem_keywords', []))
            texts_to_embed.append(text)

        # Generate embeddings
        logger.info(f"Generating embeddings for {len(texts_to_embed)} documents...")
        embeddings = self.model.encode(texts_to_embed, convert_to_numpy=True)
        
        # Normalize vectors for Cosine Similarity
        faiss.normalize_L2(embeddings)

        # Build FAISS Index
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim) # Inner Product matching cosine similarity since normalized
        self.index.add(embeddings)
        logger.info(f"FAISS index built successfully with {self.index.ntotal} vectors.")

    def retrieve(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Embeds the query and fetches the top-k most relevant documents.
        """
        if not self.index or not self.model or not self.documents:
            logger.warning("RAG Retriever not properly initialized.")
            return []

        # Embed query
        query_emb = self.model.encode([query], convert_to_numpy=True)
        faiss.normalize_L2(query_emb)

        # Search
        distances, indices = self.index.search(query_emb, top_k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1: # valid index
                results.append(self.documents[idx])

        return results

    def release(self):
        """
        Explicitly frees the SentenceTransformer model from RAM.
        Call this after retrieval is done to reclaim memory before 
        loading a large LLM (e.g., Ollama Mistral/phi3).
        """
        if self.model is not None:
            import gc
            del self.model
            self.model = None
            gc.collect()
            try:
                import torch
                torch.cuda.empty_cache()
            except Exception:
                pass
            logger.info("RAG embedding model released from RAM.")
