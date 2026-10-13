"""FAISS-based vector store for document chunks."""

import json
import pickle
from dataclasses import dataclass, field
from pathlib import Path

import faiss
import numpy as np


STORE_DIR = Path(".rag_store")
STORE_DIR.mkdir(exist_ok=True)


@dataclass
class DocumentChunk:
    """A chunk of text + its source metadata."""
    chunk_id: int
    document_id: str
    document_name: str
    page: int
    text: str


@dataclass
class VectorStore:
    """In-memory FAISS index + chunk metadata, persisted to disk."""
    dimension: int = 384
    index: faiss.Index | None = None
    chunks: list[DocumentChunk] = field(default_factory=list)

    def __post_init__(self):
        if self.index is None:
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner product (cosine on normalized vectors)

    def add(self, embeddings: list[list[float]], chunk_metadata: list[DocumentChunk]) -> None:
        """Add embeddings and their chunk metadata to the index."""
        if not embeddings:
            return
        vectors = np.array(embeddings, dtype=np.float32)
        # Normalize for cosine similarity via inner product
        faiss.normalize_L2(vectors)
        self.index.add(vectors)
        self.chunks.extend(chunk_metadata)

    def search(self, query_vector: list[float], top_k: int = 5) -> list[tuple[DocumentChunk, float]]:
        """Return top_k most similar chunks + scores."""
        if self.index.ntotal == 0:
            return []
        qv = np.array([query_vector], dtype=np.float32)
        faiss.normalize_L2(qv)
        scores, indices = self.index.search(qv, min(top_k, self.index.ntotal))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.chunks):
                continue
            results.append((self.chunks[idx], float(score)))
        return results

    def save(self, name: str = "default") -> None:
        """Persist index + chunk metadata to disk."""
        faiss.write_index(self.index, str(STORE_DIR / f"{name}.index"))
        with open(STORE_DIR / f"{name}.chunks", "wb") as f:
            pickle.dump(self.chunks, f)
        with open(STORE_DIR / f"{name}.meta.json", "w") as f:
            json.dump({"dimension": self.dimension, "total": self.index.ntotal}, f)

    @classmethod
    def load(cls, name: str = "default") -> "VectorStore":
        """Load a saved index or create a new one."""
        index_path = STORE_DIR / f"{name}.index"
        chunks_path = STORE_DIR / f"{name}.chunks"
        if not index_path.exists() or not chunks_path.exists():
            return cls()
        store = cls()
        store.index = faiss.read_index(str(index_path))
        with open(chunks_path, "rb") as f:
            store.chunks = pickle.load(f)
        return store

    def clear(self) -> None:
        """Remove all vectors + chunks."""
        self.index = faiss.IndexFlatIP(self.dimension)
        self.chunks = []


# Process-wide singleton
_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    """Get the shared vector store, loading from disk on first access."""
    global _store
    if _store is None:
        _store = VectorStore.load("default")
    return _store


def save_vector_store() -> None:
    """Persist the current vector store to disk."""
    if _store is not None:
        _store.save("default")