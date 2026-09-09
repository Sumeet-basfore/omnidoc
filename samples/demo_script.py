"""
OmniDoc Studio - Demo Python Script
Utility to demonstrate code syntax highlighting, line numbers, and AI code explanation.
"""

import sys
import json
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class DocumentRecord:
    id: str
    name: str
    format: str
    word_count: int

def analyze_document_corpus(records: List[DocumentRecord]) -> dict:
    total_words = sum(r.word_count for r in records)
    formats = {}
    for r in records:
        formats[r.format] = formats.get(r.format, 0) + 1

    return {
        "total_documents": len(records),
        "total_words": total_words,
        "format_distribution": formats,
        "average_length": total_words // len(records) if records else 0
    }

if __name__ == "__main__":
    sample_docs = [
        DocumentRecord("doc-1", "Product_Roadmap.md", "markdown", 1420),
        DocumentRecord("doc-2", "Quarterly_Review.pdf", "pdf", 3200),
        DocumentRecord("doc-3", "Financial_Model.csv", "csv", 850)
    ]
    summary = analyze_document_corpus(sample_docs)
    print(json.dumps(summary, indent=2))
