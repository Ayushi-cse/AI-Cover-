# ⚡ CoverCraft AI — SaaS AI Cover Letter Generator

[![Sprint](https://img.shields.io/badge/Sprint_04-AI_Engineering-6366f1?style=flat-square)](./SPRINT_04.md)
[![Phase 1](https://img.shields.io/badge/Phase_1-Base_MVP_P0-10b981?style=flat-square)](#phase-1-base-mvp--data-simulation)
[![Phase 2](https://img.shields.io/badge/Phase_2-Gemini_1.5_Flash-3b82f6?style=flat-square)](#phase-2-llm-integration--security)
[![Phase 3](https://img.shields.io/badge/Phase_3-PDF_Resume_Parser-8b5cf6?style=flat-square)](#phase-3-saas-capabilities--file-parsing)
[![Security](https://img.shields.io/badge/Security-Strict_Env_Isolation-emerald?style=flat-square)](#-security-architecture--api-key-protection)

> A production-grade Software-as-a-Service (SaaS) utility that dynamically generates tailored, high-converting professional cover letters. Ingests candidate parameters, target company context, and raw resume PDF streams to construct contextualized prompts for the **Google Gemini 1.5 Flash API**.

---

## 🌟 Key Features

### Phase 1: Base MVP & Data Simulation (P0)
- **Candidate Ingestion Form**: Captures Candidate Name, Target Role, Target Company, Key Skills, and Job Description.
- **Offline Data Simulation**: Built-in template interpolation engine (`templateService.js`) generating realistic cover letters with zero API dependencies.
- **Copy to Clipboard Utility**: One-click clipboard export with visual checkmark feedback and legacy browser fallback.
- **Rapid Demo Preset**: One-click **"⚡ Demo Data"** button to instantly populate form fields for QA evaluation.

### Phase 2: LLM Integration & Security Architecture (P1)
- **Google Gemini 1.5 Flash API**: Live connection to Google's high-speed generative model with optimized temperature and safety configurations.
- **Programmatic Prompt Engineering**: Context injection builder (`promptBuilder.js`) with tone selection (*Corporate Professional*, *Confident & Bold*, *High-Growth Startup*, *Executive Leadership*) and length controls (*Short*, *Standard*, *In-Depth*).
- **Latency & State Management**: Multi-stage animated loader with pulsating spinner and dynamic status updates handling 2–5s network latency.
- **Cancellation Control**: Native `AbortController` support allowing users to halt inflight requests at any moment.
- **Strict Security Protocol**: API keys managed strictly via `.env` (`VITE_GEMINI_API_KEY`) and git-ignored to prevent public exposure.

### Phase 3: SaaS Level Capabilities (P2)
- **Client-Side PDF Extraction**: Integrated Mozilla `pdfjs-dist` to parse uploaded resume PDFs directly in the browser—no backend server required.
- **Spatial Linebreak Reconstruction**: Intelligently transforms PDF layout streams into readable text without truncated words or disjointed formatting.
- **Semantic Markdown Parser**: Custom markdown-to-HTML parser rendering clean, accessible paragraphs (`<p class="cl-paragraph">`), bulleted lists, and bold headings instead of an unformatted text blob.
- **Export & Editing Suite**:
  - Live toggling between formatted preview and raw Markdown editor.
  - Download as Plain Text (`.txt`) and Markdown (`.md`).
  - Print/PDF stylesheet (`@media print`) rendering clean documents without UI chrome.
  - Reading time and word count calculators.

---

## 🏗️ Project Architecture & File Hierarchy

```
ai-cover-letter-generator/
├── .env.example              # Blueprint template for environment secrets
├── .gitignore                # Strict exclusion for .env, node_modules, and dist
├── package.json              # NPM package metadata and build scripts
├── vite.config.js            # Vite development server configuration
├── index.html                # Semantic HTML5 layout and modal dialogs
├── SPRINT_04.md              # Official sprint requirements and rubric specification
├── Prompts.md                # AI engineering log, prompt iterations & 3-min QA demo script
├── README.md                 # Complete system documentation
└── src/
    ├── css/
    │   └── style.css         # Modern SaaS design system (dark/light themes, print CSS)
    └── js/
        ├── app.js            # Main controller, state management, and DOM event wiring
        ├── geminiService.js  # Google Gemini API client with error handling & key resolution
        ├── promptBuilder.js  # Programmatic prompt engineering & context injection
        ├── templateService.js# Phase 1 offline template simulation controller
        ├── pdfParser.js      # Mozilla PDF.js client-side text extractor & cleaner
        └── markdownFormatter.js # Markdown to semantic HTML paragraph converter
```

---

## 🔒 Security Architecture & API Key Protection

> [!IMPORTANT]
> In compliance with Sprint 4 CI/CD protocols, live API keys must **NEVER** be committed to GitHub.

1. **Environment Setup**:
   Create a `.env` file in the project root based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. **Add Your Free Gemini API Key**:
   Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey) and insert it into `.env`:
   ```env
   VITE_GEMINI_API_KEY=AIzaSyYourSecretKeyHere
   ```

3. **Verify Git Protection**:
   The root `.gitignore` excludes all `.env` files:
   ```gitignore
   .env
   .env.local
   .env.*.local
   *.env
   ```
   Before pushing, verify that Git is not tracking your `.env` file:
   ```bash
   git status --ignored
   ```

---

## 🚀 Quickstart & How to Run

### Method 1: Vite Development Server (Recommended)
```bash
# 1. Navigate to the project root
cd C:\Users\kriay\.gemini\antigravity\scratch\ai-cover-letter-generator

# 2. Install dependencies
npm install

# 3. Launch local Vite server
npm run dev
```
The application will launch automatically at `http://localhost:5173`.

### Method 2: VS Code Live Server / Static File
1. Open the project folder in VS Code.
2. Right-click `index.html` and select **"Open with Live Server"**.
3. If running without a Vite environment, click the **Settings (Gear Icon)** in the top navigation to paste your Gemini API key directly into your browser's session storage, or toggle **"Simulation (MVP)"** mode to test offline.

---

## 🧪 QA Evaluation & Verification Checklist

| Deliverable | Test Method | Expected Behavior |
| :--- | :--- | :--- |
| **P0: Form State** | Enter data or click "⚡ Demo Data" | All candidate and target fields populate cleanly. |
| **P0: Simulation** | Toggle "Simulation (MVP)", click Generate | Instant, high-quality template generated without API calls. |
| **P0: Clipboard** | Click "Copy" | Letter copied to clipboard; button displays green "Copied!" badge. |
| **P1: Gemini API** | Toggle "AI Mode", enter key in `.env` | Programmatic prompt sent to Gemini 1.5 Flash; returns custom output. |
| **P1: Latency UX** | Observe generation phase | Animated loader with status updates and working cancel button. |
| **P1: Security** | Inspect `.gitignore` & Git history | `.env` is ignored; zero exposed keys in repo. |
| **P2: PDF Parsing**| Drop resume PDF into dropzone | Text extracted client-side via PDF.js; word count displayed. |
| **P2: Context Ingestion** | Generate with uploaded resume | Extracted skills & achievements woven into cover letter narrative. |
| **P2: Clean HTML** | Inspect rendered output | Formatted as semantic `<p>` paragraphs rather than raw text blocks. |

---

## 🎥 3-Minute QA Video Demonstration
A complete second-by-second walkthrough script with technical voiceover narration is documented in [Prompts.md](./Prompts.md#part-3-3-minute-qa-demo-script-voiceover--action-protocol).
