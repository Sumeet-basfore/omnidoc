# Welcome to DocsViewer (OmniDoc Studio) v2.0 🚀

**DocsViewer (OmniDoc Studio)** is a unified cross-platform desktop studio designed for viewing, editing, converting, and AI-assisted creation across all major document formats.

---

## 1. Supported Document Formats

| Document Format | Adapter Engine | Viewing | Editing | AI Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Markdown (`.md`)** | marked + KaTeX + highlight.js | Live preview, TOC, Math | Split-screen raw & preview | Auto-expand outline, rewrite section, format math |
| **PDF (`.pdf`)** | pdfjs-dist | Virtual multi-page, zoom (50%-300%) | View & search | AI text extraction to structured Markdown |
| **DOCX (`.docx`)** | mammoth + Tiptap v2 + docx | Headings, lists, tables, styles | Full WYSIWYG editor | Polish writing, rephrase tone, export to PDF/DOCX |
| **Data (`.csv`, `.json`)** | Interactive Data Grid | Tabular view, sort, filter | Inline cell edit, add/del row/col | AI Data Analyst, auto-clean, export CSV/JSON |
| **Code / Text** | Syntax viewer | Read-only syntax, line numbers | Fast copy & search | Code explanation, logic summary, architecture audit |

---

## 2. Interactive KaTeX Math Support

OmniDoc Studio natively parses both inline and block KaTeX math equations:

$$e^{i\pi} + 1 = 0$$

$$\mathcal{L} = \mathbb{E}_{x, y} \left[ -\log P_\theta(y \mid x) \right]$$

---

## 3. Deep Research & AI Companion

- **AI Friend**: Switch personas between *Friendly Co-Writer*, *Deep Researcher*, *Strict Proofreader*, and *Brainstormer*.
- **Universal BYOK**: Plug in keys for Google Gemini, Anthropic Claude, OpenAI, OpenRouter, or run 100% offline with local Ollama (`http://localhost:11434/v1`).
- **OS Keychain Security**: All API keys are encrypted at rest using OS Keychain (`electron.safeStorage`).
