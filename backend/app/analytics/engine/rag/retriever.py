import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

try:
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer

    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logging.warning("FAISS or sentence-transformers not installed. RAG won't work optimally.")

logger = logging.getLogger(__name__)

_RETRIEVER_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}


class RAGRetriever:
    def __init__(self, kb_path: str = None, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        """
        Initializes the retriever with a multilingual sentence transformer to support French/English.
        The embedding model and FAISS index are cached per worker process so enrichment doesn't cold-start every time.
        """
        if kb_path is None:
            kb_path = os.path.join(os.path.dirname(__file__), "knowledge_base.json")

        self.kb_path = kb_path
        self.model_name = model_name
        self.documents: List[Dict[str, Any]] = []
        self.index = None
        self.model: Optional["SentenceTransformer"] = None

        if FAISS_AVAILABLE:
            self._load_cached_resources()

    def _cache_key(self) -> Tuple[str, str]:
        return (os.path.abspath(self.kb_path), self.model_name)

    def _load_cached_resources(self):
        cache_key = self._cache_key()
        cached = _RETRIEVER_CACHE.get(cache_key)
        if cached is not None:
            self.documents = cached["documents"]
            self.index = cached["index"]
            self.model = cached["model"]
            logger.info("Reusing cached RAG resources for %s", self.model_name)
            return

        if not os.path.exists(self.kb_path):
            logger.error("Knowledge base not found at %s", self.kb_path)
            return

        with open(self.kb_path, "r", encoding="utf-8") as file:
            self.documents = json.load(file)

        if not self.documents:
            logger.warning("Knowledge base is empty.")
            return

        # Silence huggingface and urllib3 logs
        logging.getLogger("urllib3").setLevel(logging.WARNING)
        logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
        
        logger.info("Loading SentenceTransformer model: %s", self.model_name)
        self.model = SentenceTransformer(self.model_name)

        texts_to_embed: List[str] = []
        for doc in self.documents:
            text_parts = [
                str(doc.get("category", "")),
                str(doc.get("title", "")),
                " ".join(doc.get("problem_keywords", [])),
                str(doc.get("content", "")),
            ]
            texts_to_embed.append(" ".join(part for part in text_parts if part).strip())

        logger.info("Generating embeddings for %s documents...", len(texts_to_embed))
        embeddings = self.model.encode(texts_to_embed, convert_to_numpy=True, show_progress_bar=False)
        faiss.normalize_L2(embeddings)

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)
        logger.info("FAISS index built successfully with %s vectors.", self.index.ntotal)

        _RETRIEVER_CACHE[cache_key] = {
            "documents": self.documents,
            "index": self.index,
            "model": self.model,
        }

    def retrieve(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        if self.index is None or self.model is None or not self.documents:
            logger.warning("RAG Retriever not properly initialized.")
            return []

        query_emb = self.model.encode([query], convert_to_numpy=True, show_progress_bar=False)
        faiss.normalize_L2(query_emb)

        distances, indices = self.index.search(query_emb, top_k)
        logger.info("RAG retrieval distances: %s", distances[0].tolist() if len(distances) else [])

        results: List[Dict[str, Any]] = []
        for idx in indices[0]:
            if idx != -1:
                results.append(self.documents[idx])
        return results

    def release(self):
        """
        Keep resources warm between tasks for latency. This becomes a no-op intentionally.
        """
        logger.info("Keeping RAG resources warm in cache for reuse.")

    @classmethod
    def clear_cache(cls):
        _RETRIEVER_CACHE.clear()
        logger.info("RAG retriever cache cleared.")
