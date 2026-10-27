# AI Engineering Pair Programming Log & QA Protocol (`Prompts.md`)

This document records the prompt engineering iterations, architectural problem-solving sessions, testing matrix, and the complete 3-minute QA demo video script for **Sprint 4: AI Cover Letter Generator**.

---

## 🧠 Part 1: AI Pair Programming & Prompt Engineering Iterations

### 🤖 Prompt 1: Architecture of Phase 1 MVP & Deterministic State Simulation
**Engineer Query:**
> "I am designing Phase 1 of our AI Cover Letter SaaS. Before integrating external LLM APIs, I need a deterministic controller function that captures candidate name, job title, target company, and key skills, interpolating them into a cohesive cover letter template. How should I structure the controller so it mimics the final AI output structure and provides a seamless fallback if the API is offline?"

**Engineering Analysis & Takeaways:**
- **Decoupled Architecture**: Created `simulateCoverLetterGeneration()` in `templateService.js`. By decoupling template logic from the DOM, we can test state interpolation independently.
- **Tone Flexibility**: Added multiple template variations (`professional`, `startup`, `confident`) allowing the MVP to feel dynamic even before calling an active LLM.
- **Skills Array Processing**: Parsed comma-delimited skill strings using regex `split(/[,;\n]+/)` to dynamically highlight a primary skill in the opening hook and secondary skills in the body paragraphs.

---

### 🤖 Prompt 2: Programmatic System Prompt Construction for Gemini API
**Engineer Query:**
> "For Phase 2, how do I structure a programmatic prompt builder that injects user parameters (name, role, company, skills, job description, resume text) into Google Gemini 1.5 Flash without hallucination or generic clichés like 'I am writing to express my interest'?"

**Engineering Analysis & Takeaways:**
- **System Persona & Directives**: Instructed the model as an *"elite Silicon Valley executive career coach and technical hiring director"*.
- **Structural Guardrails**: Explicitly broke the required response into 6 logical components:
  1. Targeted Salutation
  2. Compelling Hook (forbidding generic clichés)
  3. Concrete Value Proposition connecting candidate skills to company challenges
  4. Contextual Resume Integration (incorporating actual metrics from the uploaded file)
  5. Actionable Call to Action with candidate sign-off
- **Format Constraint**: Enforced *"Return ONLY clean GitHub-flavored markdown paragraphs. No conversational meta-commentary, placeholders, or intro/outro text."* This ensures clean parsing by our frontend parser.

---

### 🤖 Prompt 3: Client-Side PDF Parsing using Mozilla PDF.js
**Engineer Query:**
> "In Phase 3, we need to extract text from an uploaded PDF resume on the frontend. Node libraries like `pdf-parse` don't run in the browser without serverless backends. How can we use Mozilla's `pdfjs-dist` on the client side to extract text page-by-page while maintaining paragraph order and preventing UI freezes?"

**Engineering Analysis & Takeaways:**
- **Worker Configuration**: Configured `pdfjsLib.GlobalWorkerOptions.workerSrc` pointing to the official CDN worker to run text extraction off the main UI thread.
- **Spatial Heuristic Reconstruction**: PDF streams do not inherently store linebreaks—they store absolute coordinate transforms (`item.transform[5]`). Implemented a coordinate check: when the delta between consecutive vertical positions exceeds 5 units, we inject a newline `\n`.
- **Text Normalization**: Created `cleanExtractedText()` to strip non-standard bullet characters (`•`, `●`), remove null control characters, and collapse multiple blank lines into clean paragraph breaks.

---

### 🤖 Prompt 4: API Security & Environment Variable Isolation
**Engineer Query:**
> "Our QA pipeline marks any commit containing an exposed API key as an Automatic Fail. How do we ensure Vite environment variables (`VITE_GEMINI_API_KEY`) stay secure during development and never leak to GitHub?"

**Engineering Analysis & Takeaways:**
- **Strict Git Exclusion**: Added `.env`, `.env.local`, and `*.env` to `.gitignore` prior to the initial repository commit.
- **Sample Blueprint**: Authored `.env.example` containing dummy variable keys (`your_google_gemini_api_key_here`) for reviewers to safely clone without leaking live secrets.
- **Multi-Tier Key Resolution**: Built `getActiveApiKey()` in `geminiService.js` checking:
  1. `import.meta.env.VITE_GEMINI_API_KEY`
  2. `import.meta.env.VITE_API_KEY`
  3. `localStorage.getItem('GEMINI_API_KEY_OVERRIDE')` (allowing evaluators to test live API calls directly in browser modals without touching environment files).

---

### 🤖 Prompt 5: Markdown to Semantic HTML Paragraph Conversion
**Engineer Query:**
> "The LLM returns raw markdown with double newlines. If we simply inject this into a `<div>`, it collapses into a giant wall of text. How do we parse it into semantic HTML paragraphs with sanitized XSS protection?"

**Engineering Analysis & Takeaways:**
- **Sanitization First**: Built `escapeHtml()` replacing `<`, `>`, `&`, `"`, and `'` with their respective HTML entities to prevent malicious injection.
- **Block Splitting**: Split sanitized text across double newlines `\n\s*\n` and wrapped each segment in semantic `<p class="cl-paragraph">` tags.
- **Rich Elements**: Integrated regex replacers for `**bold**`, `*italics*`, `### headings`, and unordered bullet lists (`<ul class="cl-list">`).

---

## 🧪 Part 2: QA Test Cases & Verification Matrix

| Test ID | Test Scenario | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | **Form Field Validation** | Submit form with empty `Target Company` and `Candidate Name`. | Form blocks submission; toast displays warning asking user to fill required fields. | Pass ✅ |
| **TC-02** | **Phase 1 Simulation Mode** | Select "Simulation (MVP)" tab, load demo data, and click Generate. | Generates structured cover letter in under 1 second without calling external network APIs. | Pass ✅ |
| **TC-03** | **Gemini AI API Call** | Select "AI Mode (Gemini)" with valid key, click Generate. | Successfully sends HTTP POST to `generativelanguage.googleapis.com` and renders personalized letter. | Pass ✅ |
| **TC-04** | **Latency & Progress State** | Click Generate on a throttled 3G connection. | Loading state displays spinner, multi-step progress bar, and active status updates ("Connecting to Gemini API..."). | Pass ✅ |
| **TC-05** | **Request Abort / Cancel** | Click Generate, then click "Cancel Generation" within 1 second. | AbortController halts network fetch; toast notifies "Generation cancelled" without app errors. | Pass ✅ |
| **TC-06** | **PDF Resume Text Extraction** | Drag and drop a multi-page resume PDF into the dropzone. | PDF.js parses pages, displays extraction progress, shows extracted word count badge, and injects context into prompt. | Pass ✅ |
| **TC-07** | **Copy to Clipboard Utility** | Click "Copy" on a generated cover letter. | Letter markdown copied to clipboard; button transforms to green "Copied!" badge for 2.2 seconds. | Pass ✅ |
| **TC-08** | **Document Export & Print** | Click `.MD`, `.TXT`, and `Print/PDF`. | Downloads formatted files with standardized naming (`Name_Cover_Letter_Company.ext`); print preview styles document cleanly without UI chrome. | Pass ✅ |

---

## 🎥 Part 3: 3-Minute QA Demo Script (Voiceover & Action Protocol)

*Maximum Time Limit: 3:00 Minutes | Evaluation Focus: Architecture, Security, and Live Feature Demonstration.*

### ⏱️ [0:00 – 0:35] Introduction & Security Architecture (Phase 2 Critical Check)
- **On Screen**: VS Code open showing `.gitignore` and `.env.example`.
- **Narration**:
  > *"Hello QA evaluation team. Today I am presenting Sprint 4: The AI Cover Letter Generator SaaS. Before demonstrating live functionality, let's address our mandatory security compliance. As you can see in our root directory, `.env` is explicitly declared inside `.gitignore`, alongside all local environment variations. In accordance with corporate security standards, our live API key is never committed to GitHub. We provide a clean `.env.example` blueprint showing how `VITE_GEMINI_API_KEY` is ingested via Vite's `import.meta.env` interface."*

### ⏱️ [0:35 – 1:15] Phase 1: Base MVP & Template Simulation (Mandatory P0)
- **On Screen**: Switch to browser (`http://localhost:5173`). Highlight the Mode Switcher set to **"Simulation (MVP)"**.
- **Narration**:
  > *"Let's examine our Phase 1 MVP deliverables. If an engineer is running in an air-gapped environment or has no active API key, CoverCraft AI provides a deterministic simulation controller. Clicking 'Demo Data' instantly populates our form fields: Candidate Name, Target Company, Role, and Key Skills. When I click 'Generate Template', our `templateService` interpolates these state variables into a structured, professional letter in under 50 milliseconds. Notice our Phase 1 UX polish: clicking 'Copy' writes the letter directly to the clipboard with an emerald confirmation badge and feedback toast."*

### ⏱️ [1:15 – 2:05] Phase 2: Google Gemini Integration & Prompt Engineering (P1)
- **On Screen**: Switch toggle to **"✨ AI Mode (Gemini)"**. Show the API Key configured badge. Click Generate.
- **Narration**:
  > *"Now transitioning into Phase 2: Live AI Engineering. We switch to AI Mode connected to Google Gemini 1.5 Flash. Under the hood, `promptBuilder.js` constructs a multi-stage system prompt injecting our candidate attributes, tone parameters, and formatting constraints. As I click Generate, notice our state management: an animated pulsating spinner and multi-step progress bar handle the 2-to-3 second LLM network latency without freezing the DOM. The returned markdown is parsed by our custom sanitizer into clean semantic HTML paragraphs rather than a raw text blob."*

### ⏱️ [2:05 – 2:40] Phase 3: SaaS Level Capabilities & PDF Resume Extraction (P2)
- **On Screen**: Drag and drop a sample resume PDF into the dropzone. Show the extraction progress bar and badge.
- **Narration**:
  > *"For Phase 3 top-tier SaaS capabilities, we implemented client-side document ingestion. I drag and drop a PDF resume into the dropzone. Using Mozilla's `pdfjs-dist` worker, the application parses the document structure, normalizes spacing, and extracts 450 words of career context without any backend server. Now, when we trigger generation, the extracted resume text is appended to the Gemini payload, producing a hyper-contextualized letter that weaves the candidate's actual project accomplishments into the value proposition."*

### ⏱️ [2:40 – 3:00] Output Utilities, Editing & Conclusion
- **On Screen**: Click **"Edit Markdown"**, modify a sentence, switch back to preview, click **".MD"** download, and trigger **"Print/PDF"**.
- **Narration**:
  > *"Finally, our SaaS editing suite allows candidates to toggle between raw Markdown and rendered preview, tweak sentences directly, and export clean `.txt`, `.md`, or print-ready PDF formats. Thank you for reviewing Sprint 4: CoverCraft AI. All code is modular, fully humanized, secure, and ready for deployment."*
