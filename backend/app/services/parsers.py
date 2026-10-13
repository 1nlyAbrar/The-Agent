"""Document parsers for PDF, DOCX, TXT, CSV, XLSX, JSON."""

from pathlib import Path

import fitz  # PyMuPDF
import pandas as pd
from docx import Document


class ParseError(Exception):
    """Raised when a document cannot be parsed."""


def parse_pdf(path: Path) -> list[dict]:
    """Extract text from a PDF, one entry per page."""
    try:
        doc = fitz.open(path)
        pages = []
        for i, page in enumerate(doc):
            text = page.get_text().strip()
            if text:
                pages.append({"page": i + 1, "text": text})
        doc.close()
        return pages
    except Exception as e:
        raise ParseError(f"PDF parse failed: {e}") from e


def parse_docx(path: Path) -> list[dict]:
    """Extract text from a DOCX file, grouped into chunks."""
    try:
        doc = Document(str(path))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        text = "\n\n".join(paragraphs)
        return [{"page": 1, "text": text}]
    except Exception as e:
        raise ParseError(f"DOCX parse failed: {e}") from e


def parse_txt(path: Path) -> list[dict]:
    """Read plain text file."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        return [{"page": 1, "text": text}]
    except Exception as e:
        raise ParseError(f"TXT parse failed: {e}") from e


def parse_csv(path: Path) -> list[dict]:
    """Parse CSV — produce a readable summary + row count."""
    try:
        df = pd.read_csv(path)
        header = " | ".join(df.columns.astype(str))
        sample = df.head(50).to_string(index=False)
        summary = (
            f"CSV FILE: {path.name}\n"
            f"Rows: {len(df)} | Columns: {len(df.columns)}\n"
            f"Column names: {header}\n\n"
            f"First 50 rows:\n{sample}"
        )
        return [{"page": 1, "text": summary}]
    except Exception as e:
        raise ParseError(f"CSV parse failed: {e}") from e


def parse_xlsx(path: Path) -> list[dict]:
    """Parse Excel — one entry per sheet."""
    try:
        sheets = pd.read_excel(path, sheet_name=None)
        results = []
        for name, df in sheets.items():
            header = " | ".join(df.columns.astype(str))
            sample = df.head(50).to_string(index=False)
            text = (
                f"SHEET: {name}\n"
                f"Rows: {len(df)} | Columns: {len(df.columns)}\n"
                f"Columns: {header}\n\n"
                f"First 50 rows:\n{sample}"
            )
            results.append({"page": 1, "text": text})
        return results
    except Exception as e:
        raise ParseError(f"XLSX parse failed: {e}") from e


def parse_json_file(path: Path) -> list[dict]:
    """Parse JSON file — dump as pretty string."""
    try:
        import json
        data = json.loads(path.read_text(encoding="utf-8"))
        text = json.dumps(data, indent=2, ensure_ascii=False)
        return [{"page": 1, "text": text}]
    except Exception as e:
        raise ParseError(f"JSON parse failed: {e}") from e


PARSERS = {
    ".pdf": parse_pdf,
    ".docx": parse_docx,
    ".txt": parse_txt,
    ".md": parse_txt,
    ".csv": parse_csv,
    ".xlsx": parse_xlsx,
    ".xls": parse_xlsx,
    ".json": parse_json_file,
}


def parse_document(path: Path) -> list[dict]:
    """Dispatch to the right parser based on file extension."""
    ext = path.suffix.lower()
    parser = PARSERS.get(ext)
    if not parser:
        raise ParseError(f"Unsupported file type: {ext}")
    return parser(path)