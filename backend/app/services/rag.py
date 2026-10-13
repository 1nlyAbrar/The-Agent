"""RAG pipeline — retrieve relevant chunks and build augmented prompts."""

import uuid
from pathlib import Path

from app.services.embeddings import chunk_text, embed_query, embed_texts
from app.services.parsers import ParseError, parse_document
from app.services.vector_store import DocumentChunk, get_vector_store, save_vector_store

MAX_CONTEXT_CHARS = 4000


def ingest_document(file_path: Path, document_id: str | None = None) -> dict:
    """
    Parse a document, chunk it, embed chunks, and store in the vector store.

    Returns: {document_id, name, pages_parsed, chunks_added}
    """
    doc_id = document_id or str(uuid.uuid4())

    try:
        pages = parse_document(file_path)
    except ParseError:
        raise

    if not pages:
        raise ParseError("No text extracted from document")

    store = get_vector_store()

    all_chunks: list[str] = []
    all_metadata: list[DocumentChunk] = []
    chunk_counter = 0

    for page_data in pages:
        page_num = page_data["page"]
        text = page_data["text"]
        for chunk in chunk_text(text):
            all_chunks.append(chunk)
            all_metadata.append(
                DocumentChunk(
                    chunk_id=chunk_counter,
                    document_id=doc_id,
                    document_name=file_path.name,
                    page=page_num,
                    text=chunk,
                )
            )
            chunk_counter += 1

    if not all_chunks:
        raise ParseError("No chunks generated from document")

    embeddings = embed_texts(all_chunks)
    store.add(embeddings, all_metadata)
    save_vector_store()

    return {
        "document_id": doc_id,
        "name": file_path.name,
        "pages_parsed": len(pages),
        "chunks_added": len(all_chunks),
    }


def retrieve_context(query: str, top_k: int = 5) -> list[tuple[DocumentChunk, float]]:
    """Retrieve most relevant chunks for a query."""
    store = get_vector_store()
    if store.index.ntotal == 0:
        return []
    query_vector = embed_query(query)
    return store.search(query_vector, top_k=top_k)


def build_augmented_prompt(query: str, top_k: int = 5) -> tuple[str, list[dict]]:
    """
    Build a RAG-augmented prompt.

    Returns: (augmented_system_context, sources_list)
    """
    results = retrieve_context(query, top_k=top_k)

    if not results:
        return "", []

    context_parts = []
    sources = []
    total_chars = 0

    for chunk, score in results:
        header = f"[Source: {chunk.document_name}, page {chunk.page}, relevance {score:.2f}]"
        piece = f"{header}\n{chunk.text}"
        if total_chars + len(piece) > MAX_CONTEXT_CHARS:
            break
        context_parts.append(piece)
        total_chars += len(piece)
        sources.append({
            "document": chunk.document_name,
            "page": chunk.page,
            "score": round(score, 3),
            "preview": chunk.text[:120] + ("..." if len(chunk.text) > 120 else ""),
        })

    if not context_parts:
        return "", []

    context_block = (
        "You are THE AGENT. Answer the user's question using ONLY the document excerpts below. "
        "If the answer is not in the excerpts, say so clearly. "
        "Cite the document name and page when referencing information.\n\n"
        "DOCUMENT EXCERPTS:\n"
        "────────────────\n"
        + "\n\n".join(context_parts)
        + "\n────────────────\n"
    )

    return context_block, sources


def get_document_list() -> list[dict]:
    """Return a list of all ingested documents with chunk counts."""
    store = get_vector_store()
    docs: dict[str, dict] = {}
    for chunk in store.chunks:
        if chunk.document_id not in docs:
            docs[chunk.document_id] = {
                "document_id": chunk.document_id,
                "name": chunk.document_name,
                "chunks": 0,
            }
        docs[chunk.document_id]["chunks"] += 1
    return list(docs.values())


def delete_document(document_id: str) -> int:
    """Remove all chunks of a document. Returns number removed."""
    store = get_vector_store()
    before = len(store.chunks)
    store.chunks = [c for c in store.chunks if c.document_id != document_id]

    # Rebuild index from remaining chunks
    if store.chunks:
        from app.services.embeddings import embed_texts
        texts = [c.text for c in store.chunks]
        embeddings = embed_texts(texts)
        import faiss
        import numpy as np
        store.index = faiss.IndexFlatIP(store.dimension)
        vectors = np.array(embeddings, dtype=np.float32)
        faiss.normalize_L2(vectors)
        store.index.add(vectors)
    else:
        store.clear()

    save_vector_store()
    return before - len(store.chunks)
