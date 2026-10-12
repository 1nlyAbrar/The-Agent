# THE AGENT

> **One Agent. Infinite Possibilities.**

A next-generation AI operating environment powered by DeepSeek — combining conversational AI, voice interaction, document intelligence, research, and productivity tools into a single immersive experience.

![THE AGENT Logo](./frontend/public/logo.png)

---

## ✨ Features

- 🧠 **Conversational AI** — Real-time streaming chat powered by DeepSeek
- 🎙️ **Voice Assistant** — Speech recognition + text-to-speech with animated AI orb
- 📄 **Document Intelligence** — Upload PDFs, DOCX, CSV, XLSX and chat with them (RAG)
- 🔍 **Research Center** — Web search, summarization, and source citations
- 💻 **Code Assistant** — Generation, debugging, explanation, optimization
- 📊 **Data Analyst** — CSV/Excel analysis with interactive charts
- 🛠️ **Productivity Tools** — Summarizer, translator, JSON formatter, prompt enhancer

---

## 🧱 Technology Stack

### Frontend
- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Framer Motion** for animations
- **Zustand** for state
- **Recharts** for data visualization

### Backend
- **FastAPI** + Uvicorn
- **Python 3.13**
- **Pydantic** for validation
- **SQLAlchemy** + SQLite (dev) / PostgreSQL (prod)

### AI & Data
- **DeepSeek API** (chat + reasoning)
- **Sentence Transformers** for embeddings
- **FAISS** for vector search
- **PyMuPDF / python-docx / pandas** for document parsing
- **Web Speech API** + optional local Whisper

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11 – 3.13
- Git

### 1. Clone & enter
```bash
git clone <your-repo-url>
cd the-agent