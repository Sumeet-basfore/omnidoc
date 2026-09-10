# OmniDoc Studio

<div align="center">

![OmniDoc Studio](https://img.shields.io/badge/OmniDoc%20Studio-v2.0.0-0ea5e9?style=for-the-badge&logo=electron&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33.0.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

**Unified Multi-Format Desktop Document Studio & Autonomous AI Research Partner**

[Features](#-core-features) • [Installation](#-getting-started) • [Building Releases](#-building-apps-for-github-releases) • [Shortcuts](#-keyboard-shortcuts) • [API Setup](#-ai-configuration--api-keys) • [Tech Stack](#-tech-stack)

</div>

---

## 📖 Overview

**OmniDoc Studio** is an open-source, cross-platform desktop application designed to eliminate context-switching across diverse document workflows. Built with **Electron 33**, **React 18**, and **TypeScript**, OmniDoc unifies document viewing, WYSIWYG editing, data manipulation, deep web research, and collaborative workspace management inside a refined, high-contrast **Midnight Instrument** environment.

Whether reading scientific papers in PDF, authoring technical documentation in Markdown with live KaTeX math, editing DOCX memos, analyzing CSV/JSON datasets in an interactive grid, or conducting autonomous deep research with synthesis citations, OmniDoc Studio handles it all locally with zero latency.

---

## ✨ Core Features

### 📄 Multi-Format Document Engine
- **Markdown Studio (`.md`, `.markdown`)**:
  - Live split preview with synchronized bi-directional scrolling.
  - Full **KaTeX** mathematical formula rendering and **Mermaid** diagram visualizer.
  - Markdown table creator, task lists, blockquotes, and quick formatting action bar.
- **High-Performance PDF Viewer (`.pdf`)**:
  - Native **PDF.js 4.x** rendering with hardware-accelerated canvas output.
  - Selectable text layer for precise selection and inline AI assistant prompts.
  - Zoom controls (fit-to-width, fit-to-page, custom scaling) and quick page navigation.
- **DOCX Word Processor (`.docx`)**:
  - Rapid document parsing via **Mammoth.js** into a **Tiptap v2** WYSIWYG editor.
  - Full text styling, head-level formatting, and bullet/numbered lists.
  - Native DOCX document serialization preserving styling and structure on export.
- **Interactive Data Grid (`.csv`, `.json`)**:
  - Tabular spreadsheet editor with instant cell editing and keyboard navigation.
  - Multi-column sort, dynamic row/column addition, and schema validation.
  - Seamless bidirectional conversion between CSV and JSON formats.
- **Code Studio (`.ts`, `.py`, `.rs`, `.go`, `.cpp`, `.json`, etc.)**:
  - Syntax highlighting powered by **Shiki** with themes like `one-dark-pro`.
  - Line counter, code folding, and in-file regex search.

### 🤖 Omni AI Assistant & Deep Research
- **Multi-Provider LLM Gateway**: Connect seamlessly to **Google Gemini** (2.5 Flash / Pro), **Anthropic Claude** (3.5 Sonnet / Haiku), **OpenAI** (GPT-4o), or 100% local, private endpoints (**LM Studio**, **llama.cpp**, **Ollama**) with 1-click server presets and auto-model discovery.
- **Autonomous Deep Web Research**: Powered by **Tavily** and **Exa** search engines to extract real-time web intelligence, cross-verify claims, and compile synthesized reports complete with live citations and domain filters.
- **Save to Workspace or Device**: Flexibility to save generated research briefs straight into an active team workspace or download them directly to your disk.
- **Inline Selection Assistant**: Highlight any paragraph or snippet in your document to trigger quick rewrites, explanations, translations, or technical proofs.
- **Persona Modes**: Adapt Omni's persona on the fly (Co-writer, Researcher, Technical Proofreader, Brainstormer).

### 👥 Team Hub & Collaborative Workspaces
- **Team Workspaces & Invite Codes**: Create isolated collaborative workspaces and generate share codes for teammates to join instantly.
- **Git Sync Integration**: Pull, commit, and push updates directly to remote Git branches with conflict detection.
- **Team Kanban Board**: Manage project progress with customizable columns (Backlog, In Progress, Review, Done) and priority tags.
- **Review Inbox & Threaded Comments**: Leave highlighted feedback, resolve comments, and track reviewer approvals across documents.

### ⚡ Midnight Instrument UI/UX
- Ergonomic dark aesthetic with high-contrast typography designed for long reading and writing sessions.
- Tab management with change detection (`•` unsaved indicator) and format-coded accents.
- Recent files quick access with individual hover dismiss (`✕`) and bulk clear.
- Contextual Command Palette (`Ctrl+K` / `⌘K`) and Shortcuts cheat sheet (`?` / `⌘/`).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **Git**: Installed and configured

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Sumeet-basfore/omnidoc.git
cd omnidoc

# 2. Install dependencies
npm install

# 3. Launch in development mode with Hot Module Replacement (HMR)
npm run dev
```

### Static Analysis & Verification

```bash
# Type check both Node (Electron main/preload) and Web (React renderer)
npm run typecheck

# Verify zero violations on UI design system guardrails
npm run guard:ui

# Full production build bundle check
npm run build
```

---

## 📦 Building Apps for GitHub Releases

OmniDoc Studio is pre-configured with **`electron-builder`** to produce production-ready desktop installers for Linux, Windows, and macOS.

### Option 1: Automated Builds via GitHub Actions (Recommended)

A pre-configured GitHub Actions workflow (`.github/workflows/release.yml`) compiles binaries across **Ubuntu, macOS, and Windows** simultaneously and creates a draft release on GitHub with all binaries attached.

1. **Tag your release** with semantic versioning:
   ```bash
   git tag v2.0.0
   git push origin v2.0.0
   ```
2. Navigate to your repository's **Actions** tab on GitHub:
   - The **Release** workflow will execute automatically.
   - It runs UI guard checks, TypeScript checks, builds the app, and publishes to GitHub Releases.
3. Once finished, visit your repository's **Releases** page (`https://github.com/Sumeet-basfore/omnidoc/releases`):
   - Review the generated release draft.
   - Edit the release notes if desired, and click **Publish Release**!

---

### Option 2: Local Packaging & Manual GitHub Upload

You can compile installers locally on your machine and upload them manually to your GitHub Release.

#### 1. Compile Installers Locally

- **Linux** (produces `.AppImage`, `.deb`, `.rpm`):
  ```bash
  npm run build:linux
  ```
- **Windows** (produces `.exe` NSIS installer and portable executable):
  ```bash
  npm run build:win
  ```
- **macOS** (produces `.dmg` and `.zip` for Intel and Apple Silicon):
  ```bash
  npm run build:mac
  ```
- **Unpacked Directory** (for quick local testing without creating an installer):
  ```bash
  npm run build:unpack
  ```

All compiled binaries and installers will be generated in the **`dist-electron/`** folder:
```
dist-electron/
├── OmniDoc Studio-2.0.0.AppImage
├── omnidoc-studio_2.0.0_amd64.deb
├── omnidoc-studio-2.0.0.x86_64.rpm
├── OmniDoc Studio Setup 2.0.0.exe
└── OmniDoc Studio-2.0.0.dmg
```

#### 2. Create the GitHub Release & Upload Files

1. Go to your repository on GitHub: `https://github.com/Sumeet-basfore/omnidoc/releases`
2. Click **Draft a new release**.
3. In **Choose a tag**, enter a new version tag (e.g., `v2.0.0`) and select `Create new tag on publish`.
4. Add a release title (e.g., `OmniDoc Studio v2.0.0 - Official Release`).
5. In the description, summarize key additions or improvements.
6. Drag and drop the compiled files from your local `dist-electron/` directory into the **Attach binaries** box:
   - For Linux users: `.AppImage` and `.deb`
   - For Windows users: `.exe`
   - For macOS users: `.dmg`
7. Click **Publish release**.

---

### Option 3: Direct CLI Publish with GitHub Personal Access Token

You can publish directly from your terminal using a GitHub Personal Access Token (`GH_TOKEN`):

```bash
# 1. Export your GitHub Personal Access Token with 'repo' scope
export GH_TOKEN="ghp_yourPersonalAccessTokenHere"

# 2. Build and publish automatically
npm run release
```
`electron-builder` will upload the binaries directly to GitHub and create a draft release for you.

---

## 🔑 AI Configuration & API Keys

OmniDoc Studio works out-of-the-box as a local document viewer and editor. To enable AI assistance and deep research, configure your preferred providers in **Settings**:

| Provider | Purpose | Where to Get API Key |
| :--- | :--- | :--- |
| **Google Gemini** | Chat, document editing, high-speed reasoning | [Google AI Studio](https://aistudio.google.com/) |
| **Anthropic Claude** | In-depth analysis, document critique, coding | [Anthropic Console](https://console.anthropic.com/) |
| **OpenAI** | General intelligence, GPT-4o synthesis | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Tavily Search** | Real-time deep web search and fact extraction | [Tavily AI](https://tavily.com/) |
| **Exa Search** | Neural and semantic web scraping | [Exa AI](https://exa.ai/) |
| **Local AI (LM Studio / llama.cpp / Ollama)** | 100% offline, privacy-first local LLM inference | [LM Studio](https://lmstudio.ai/) (`:1234`), [Ollama](https://ollama.ai/) (`:11434`), [llama.cpp](https://github.com/ggerganov/llama.cpp) (`:8080`) |

> **Note**: API keys are encrypted and stored exclusively in your local application data storage. They are never transmitted to any third-party telemetry servers.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Windows / Linux | macOS | Action |
| :--- | :--- | :--- | :--- |
| **Command Palette** | `Ctrl + K` | `⌘ + K` | Open universal command palette |
| **Open File** | `Ctrl + O` | `⌘ + O` | Open file picker from local disk |
| **New Document** | `Ctrl + N` | `⌘ + N` | Create a new Markdown document |
| **Save Document** | `Ctrl + S` | `⌘ + S` | Save active file to disk |
| **Export Document** | `Ctrl + E` | `⌘ + E` | Open format export modal |
| **Toggle Sidebar** | `Ctrl + B` | `⌘ + B` | Show / hide navigation sidebar |
| **Toggle AI Companion** | `Ctrl + Shift + R` | `⌘ + Shift + R` | Open / close Omni AI research drawer |
| **Close Active Tab** | `Ctrl + W` | `⌘ + W` | Close currently focused tab |
| **Shortcuts Reference** | `?` or `Ctrl + /` | `?` or `⌘ + /` | View full keyboard shortcuts dialog |

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Runtime** | [Electron 33](https://www.electronjs.org/) with secure IPC streaming |
| **Frontend Framework** | [React 18](https://react.dev/), [TypeScript 5.6](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/) |
| **Build Tooling** | [electron-vite 3](https://electron-vite.org/), [electron-builder 25](https://www.electron.build/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com), [Lucide React Icons](https://lucide.dev/) |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) with persistent local storage |
| **Document Processors** | [Tiptap v2](https://tiptap.dev/), [PDF.js 4.x](https://mozilla.github.io/pdf.js/), [Mammoth.js](https://github.com/mwilliamson/mammoth.js), [docx](https://docx.js.org/), [KaTeX](https://katex.org/), [Shiki](https://shiki.style/) |
| **AI & Research SDKs** | `@google/generative-ai`, `@anthropic-ai/sdk`, `openai`, `@tavily/core`, `exa-js` |

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports are warmly welcomed!

1. Fork the repository (`https://github.com/Sumeet-basfore/omnidoc/fork`)
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m "feat: add amazing feature"`)
4. Ensure all checks pass (`npm run typecheck && npm run guard:ui`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with care by the OmniDoc Studio Community.
</div>
