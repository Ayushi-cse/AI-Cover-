/**
 * Main Application Controller (app.js)
 * 
 * Orchestrates form state, LLM API calls, template simulation fallback,
 * PDF resume extraction, DOM manipulation, and export utilities.
 */

import { buildCoverLetterPrompt } from './promptBuilder.js';
import { simulateCoverLetterGeneration } from './templateService.js';
import { generateCoverLetterWithGemini, getActiveApiKey, saveLocalApiKey } from './geminiService.js';
import { extractResumeText } from './pdfParser.js';
import { parseMarkdownToHtml } from './markdownFormatter.js';

// Application State Store
const state = {
  mode: 'ai', // 'ai' (Gemini) or 'simulation' (Phase 1 Template)
  isGenerating: false,
  activeAbortController: null,
  resumeData: {
    fileName: '',
    text: '',
    wordCount: 0,
    charCount: 0
  },
  lastGeneratedMarkdown: '',
  isEditing: false
};

// DOM Element Registry
const elements = {
  // Mode switcher
  modeToggleAi: document.getElementById('mode-ai'),
  modeToggleSim: document.getElementById('mode-simulation'),
  apiKeyBadge: document.getElementById('api-key-badge'),
  
  // Form inputs
  form: document.getElementById('cover-letter-form'),
  candidateName: document.getElementById('candidate-name'),
  jobRole: document.getElementById('job-role'),
  targetCompany: document.getElementById('target-company'),
  keySkills: document.getElementById('key-skills'),
  jobDescription: document.getElementById('job-description'),
  toneSelect: document.getElementById('tone-select'),
  lengthSelect: document.getElementById('length-select'),
  
  // Action buttons
  submitBtn: document.getElementById('generate-btn'),
  loadDemoBtn: document.getElementById('load-demo-btn'),
  clearFormBtn: document.getElementById('clear-form-btn'),
  cancelBtn: document.getElementById('cancel-generation-btn'),
  
  // Resume dropzone
  dropzone: document.getElementById('resume-dropzone'),
  fileInput: document.getElementById('resume-file-input'),
  uploadPrompt: document.getElementById('upload-prompt'),
  uploadProgress: document.getElementById('upload-progress-container'),
  progressBar: document.getElementById('upload-progress-bar'),
  progressLabel: document.getElementById('upload-progress-label'),
  resumeBadge: document.getElementById('resume-badge'),
  resumeFileName: document.getElementById('resume-file-name'),
  resumeWordCount: document.getElementById('resume-word-count'),
  removeResumeBtn: document.getElementById('remove-resume-btn'),
  
  // Output view
  emptyState: document.getElementById('output-empty-state'),
  loadingState: document.getElementById('output-loading-state'),
  loadedState: document.getElementById('output-loaded-state'),
  loadingStatusText: document.getElementById('loading-status-text'),
  loadingProgressBar: document.getElementById('loading-progress-bar'),
  
  // Letter content
  renderedContent: document.getElementById('letter-rendered-content'),
  rawEditor: document.getElementById('letter-raw-editor'),
  toggleEditBtn: document.getElementById('toggle-edit-btn'),
  copyBtn: document.getElementById('copy-letter-btn'),
  downloadTxtBtn: document.getElementById('download-txt-btn'),
  downloadMdBtn: document.getElementById('download-md-btn'),
  printBtn: document.getElementById('print-letter-btn'),
  
  // Metrics
  outputWordCount: document.getElementById('output-word-count'),
  outputReadTime: document.getElementById('output-read-time'),
  outputLatency: document.getElementById('output-latency'),
  generationModeTag: document.getElementById('generation-mode-tag'),
  
  // Settings modal
  settingsBtn: document.getElementById('open-settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  saveApiKeyBtn: document.getElementById('save-api-key-btn'),
  apiKeyInput: document.getElementById('custom-api-key-input'),
  apiKeyStatusDisplay: document.getElementById('api-key-status-display'),
  
  // Theme toggle
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  
  // Toast container
  toastContainer: document.getElementById('toast-container')
};

/**
 * Initialization lifecycle
 */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
  checkApiKeyStatus();
});

/**
 * Wire up all DOM events
 */
function initEventListeners() {
  // Form submission
  elements.form.addEventListener('submit', handleFormSubmit);

  // Mode toggle buttons
  elements.modeToggleAi.addEventListener('click', () => setGenerationMode('ai'));
  elements.modeToggleSim.addEventListener('click', () => setGenerationMode('simulation'));

  // Quick Action Buttons
  elements.loadDemoBtn.addEventListener('click', loadDemoData);
  elements.clearFormBtn.addEventListener('click', clearForm);
  elements.cancelBtn.addEventListener('click', handleCancelGeneration);

  // Resume File Upload & Dropzone
  elements.dropzone.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      processResumeFile(e.target.files[0]);
    }
  });

  // Drag and drop events
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('border-primary', 'bg-blue-50/50');
  });

  elements.dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('border-primary', 'bg-blue-50/50');
  });

  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('border-primary', 'bg-blue-50/50');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResumeFile(e.dataTransfer.files[0]);
    }
  });

  elements.removeResumeBtn.addEventListener('click', removeResume);

  // Output utilities
  elements.copyBtn.addEventListener('click', copyLetterToClipboard);
  elements.toggleEditBtn.addEventListener('click', toggleEditMode);
  elements.rawEditor.addEventListener('input', handleEditorInput);
  elements.downloadTxtBtn.addEventListener('click', () => downloadFile('txt'));
  elements.downloadMdBtn.addEventListener('click', () => downloadFile('md'));
  elements.printBtn.addEventListener('click', () => window.print());

  // Settings Modal
  elements.settingsBtn.addEventListener('click', openSettingsModal);
  elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
  elements.saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettingsModal();
  });

  // Theme toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);
}

/**
 * Updates the active generation mode (AI vs Template Simulation)
 */
function setGenerationMode(mode) {
  state.mode = mode;
  if (mode === 'ai') {
    elements.modeToggleAi.classList.add('active-tab');
    elements.modeToggleSim.classList.remove('active-tab');
    elements.submitBtn.innerHTML = `
      <svg class="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Generate with Gemini AI
    `;
  } else {
    elements.modeToggleSim.classList.add('active-tab');
    elements.modeToggleAi.classList.remove('active-tab');
    elements.submitBtn.innerHTML = `
      <svg class="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Generate Template (Phase 1 MVP)
    `;
  }
}

/**
 * Inspects whether an API key is available in .env or localStorage
 */
function checkApiKeyStatus() {
  const activeKey = getActiveApiKey();
  if (activeKey) {
    elements.apiKeyBadge.innerHTML = `
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
        <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
        API Key Configured
      </span>
    `;
  } else {
    elements.apiKeyBadge.innerHTML = `
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
        <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
        Simulation Mode / No Key
      </span>
    `;
  }
}

/**
 * Handles resume file extraction workflow (Phase 3)
 */
async function processResumeFile(file) {
  // Show progress state inside dropzone
  elements.uploadPrompt.classList.add('hidden');
  elements.uploadProgress.classList.remove('hidden');
  elements.resumeBadge.classList.add('hidden');

  try {
    const result = await extractResumeText(file, (percent, label) => {
      elements.progressBar.style.width = `${percent}%`;
      elements.progressLabel.textContent = label;
    });

    // Update application state
    state.resumeData = {
      fileName: result.fileName,
      text: result.text,
      wordCount: result.wordCount,
      charCount: result.charCount
    };

    // Update UI elements
    elements.resumeFileName.textContent = result.fileName;
    elements.resumeWordCount.textContent = `${result.wordCount} words (${result.pageCount} ${result.pageCount === 1 ? 'page' : 'pages'})`;

    elements.uploadProgress.classList.add('hidden');
    elements.resumeBadge.classList.remove('hidden');

    showToast(`Successfully extracted ${result.wordCount} words from resume!`, 'success');

  } catch (err) {
    console.error('Resume extraction failure:', err);
    elements.uploadProgress.classList.add('hidden');
    elements.uploadPrompt.classList.remove('hidden');
    showToast(err.message || 'Failed to extract text from resume.', 'error');
  }
}

/**
 * Clears uploaded resume from memory and resets UI dropzone
 */
function removeResume(e) {
  if (e) e.stopPropagation();
  state.resumeData = { fileName: '', text: '', wordCount: 0, charCount: 0 };
  elements.fileInput.value = '';
  elements.resumeBadge.classList.add('hidden');
  elements.uploadPrompt.classList.remove('hidden');
  elements.uploadProgress.classList.add('hidden');
  showToast('Resume removed.', 'info');
}

/**
 * Main form submission handler
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate required Phase 1 fields
  const candidateName = elements.candidateName.value.trim();
  const jobRole = elements.jobRole.value.trim();
  const targetCompany = elements.targetCompany.value.trim();
  const keySkills = elements.keySkills.value.trim();
  const jobDescription = elements.jobDescription.value.trim();
  const tone = elements.toneSelect.value;
  const length = elements.lengthSelect.value;

  if (!candidateName || !jobRole || !targetCompany || !keySkills) {
    showToast('Please fill in all required fields (Name, Role, Company, Skills).', 'warning');
    return;
  }

  // Check if user is in AI mode but has no key
  if (state.mode === 'ai' && !getActiveApiKey()) {
    showToast('No Gemini API key found. Defaulting to Phase 1 Template Simulation mode.', 'info');
    setGenerationMode('simulation');
  }

  // Enter loading state
  setLoadingState(true);

  // Setup abort controller for cancel capability
  state.activeAbortController = new AbortController();

  const startTime = performance.now();

  try {
    let resultMarkdown = '';
    let latencyMs = 0;
    let usedMode = state.mode;

    if (state.mode === 'ai') {
      // Phase 2 & 3: Programmatic prompt engineering + Gemini API call
      updateLoadingStep(1, 'Constructing system prompt & context injection...');
      const engineeredPrompt = buildCoverLetterPrompt({
        candidateName,
        jobRole,
        targetCompany,
        keySkills,
        jobDescription,
        resumeText: state.resumeData.text,
        tone,
        length
      });

      updateLoadingStep(2, 'Connecting to Google Gemini API (gemini-1.5-flash)...');
      
      const apiResult = await generateCoverLetterWithGemini(engineeredPrompt, {
        signal: state.activeAbortController.signal,
        model: 'gemini-1.5-flash',
        temperature: tone === 'confident' ? 0.8 : 0.7
      });

      updateLoadingStep(3, 'Parsing returned markdown into semantic paragraphs...');
      resultMarkdown = apiResult.text;
      latencyMs = apiResult.latencyMs;

    } else {
      // Phase 1: Deterministic template interpolation (Data Simulation)
      updateLoadingStep(1, 'Interpolating state parameters into template...');
      await delay(600); // Realistic visual transition for MVP simulation

      resultMarkdown = simulateCoverLetterGeneration({
        candidateName,
        jobRole,
        targetCompany,
        keySkills,
        tone,
        resumeSummary: state.resumeData.text.slice(0, 200)
      });

      latencyMs = Math.round(performance.now() - startTime);
    }

    // Render output
    displayGeneratedOutput(resultMarkdown, latencyMs, usedMode);
    showToast('Cover letter generated successfully!', 'success');

  } catch (err) {
    if (err.code === 'USER_ABORTED') {
      showToast('Generation cancelled.', 'info');
    } else {
      console.error('Generation error:', err);
      showToast(err.message || 'Failed to generate cover letter.', 'error');

      // If AI failed due to key/rate limit, offer fallback to simulation
      if (state.mode === 'ai') {
        const fallback = confirm('Gemini API call failed. Would you like to generate with Phase 1 Template Simulation instead?');
        if (fallback) {
          setGenerationMode('simulation');
          elements.submitBtn.click();
        }
      }
    }
  } finally {
    setLoadingState(false);
    state.activeAbortController = null;
  }
}

/**
 * Displays the finished cover letter and computes metrics
 */
function displayGeneratedOutput(markdown, latencyMs, mode) {
  state.lastGeneratedMarkdown = markdown;

  // Render HTML via markdown parser
  const cleanHtml = parseMarkdownToHtml(markdown);
  elements.renderedContent.innerHTML = cleanHtml;
  elements.rawEditor.value = markdown;

  // Compute metrics
  const words = countWords(markdown);
  const readTimeMinutes = Math.max(1, Math.ceil(words / 200));

  elements.outputWordCount.textContent = `${words} words`;
  elements.outputReadTime.textContent = `~${readTimeMinutes} min read`;
  elements.outputLatency.textContent = `${latencyMs}ms latency`;
  elements.generationModeTag.textContent = mode === 'ai' ? 'Gemini 1.5 Flash' : 'Phase 1 Template MVP';

  // Toggle UI visibility
  elements.emptyState.classList.add('hidden');
  elements.loadingState.classList.add('hidden');
  elements.loadedState.classList.remove('hidden');

  // Reset editor view to rendered mode
  state.isEditing = false;
  elements.renderedContent.classList.remove('hidden');
  elements.rawEditor.classList.add('hidden');
  elements.toggleEditBtn.textContent = 'Edit Markdown';

  // Smooth scroll output into view on mobile
  if (window.innerWidth < 768) {
    elements.loadedState.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Manages loading spinners and multi-step progress indicators
 */
function setLoadingState(isLoading) {
  state.isGenerating = isLoading;
  elements.submitBtn.disabled = isLoading;

  if (isLoading) {
    elements.emptyState.classList.add('hidden');
    elements.loadedState.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');
    elements.loadingProgressBar.style.width = '15%';
    elements.loadingStatusText.textContent = 'Initializing generation pipeline...';
  } else {
    elements.loadingState.classList.add('hidden');
  }
}

function updateLoadingStep(stepIndex, message) {
  const percentages = [20, 50, 80, 100];
  elements.loadingProgressBar.style.width = `${percentages[stepIndex] || 60}%`;
  elements.loadingStatusText.textContent = message;
}

function handleCancelGeneration() {
  if (state.activeAbortController) {
    state.activeAbortController.abort();
  }
}

/**
 * Phase 1 UX Polish: Robust "Copy to Clipboard" utility
 */
async function copyLetterToClipboard() {
  const textToCopy = state.isEditing ? elements.rawEditor.value : state.lastGeneratedMarkdown;

  if (!textToCopy) {
    showToast('No text available to copy.', 'warning');
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      // Fallback for older browsers or non-HTTPS local setups
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // Visual feedback on button
    const originalText = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = `
      <svg class="w-4 h-4 mr-1.5 inline text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Copied!
    `;
    elements.copyBtn.classList.add('bg-emerald-600/20', 'text-emerald-400', 'border-emerald-500/30');

    setTimeout(() => {
      elements.copyBtn.innerHTML = originalText;
      elements.copyBtn.classList.remove('bg-emerald-600/20', 'text-emerald-400', 'border-emerald-500/30');
    }, 2200);

    showToast('Cover letter copied to clipboard!', 'success');

  } catch (err) {
    console.error('Clipboard copy failed:', err);
    showToast('Failed to copy. Please manually select and copy the text.', 'error');
  }
}

/**
 * Toggles between clean rendered HTML view and raw Markdown editor
 */
function toggleEditMode() {
  state.isEditing = !state.isEditing;

  if (state.isEditing) {
    elements.renderedContent.classList.add('hidden');
    elements.rawEditor.classList.remove('hidden');
    elements.rawEditor.value = state.lastGeneratedMarkdown;
    elements.toggleEditBtn.textContent = 'Preview Rendered';
    elements.rawEditor.focus();
  } else {
    // Re-render HTML from updated raw editor text
    state.lastGeneratedMarkdown = elements.rawEditor.value;
    elements.renderedContent.innerHTML = parseMarkdownToHtml(state.lastGeneratedMarkdown);
    elements.renderedContent.classList.remove('hidden');
    elements.rawEditor.classList.add('hidden');
    elements.toggleEditBtn.textContent = 'Edit Markdown';

    // Recalculate word count
    const words = countWords(state.lastGeneratedMarkdown);
    elements.outputWordCount.textContent = `${words} words`;
  }
}

function handleEditorInput() {
  state.lastGeneratedMarkdown = elements.rawEditor.value;
}

/**
 * Downloads output as file (.txt or .md)
 */
function downloadFile(extension) {
  const content = state.lastGeneratedMarkdown;
  if (!content) return;

  const candidate = elements.candidateName.value.trim().replace(/\s+/g, '_') || 'Candidate';
  const company = elements.targetCompany.value.trim().replace(/\s+/g, '_') || 'Company';
  const filename = `${candidate}_Cover_Letter_${company}.${extension}`;

  const blob = new Blob([content], { type: extension === 'md' ? 'text/markdown;charset=utf-8;' : 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Downloaded as ${filename}`, 'success');
}

/**
 * Populates realistic developer demo data for rapid QA evaluation
 */
function loadDemoData() {
  elements.candidateName.value = 'Alex Morgan';
  elements.jobRole.value = 'Senior Full-Stack Engineer';
  elements.targetCompany.value = 'Stripe';
  elements.keySkills.value = 'TypeScript, React, Node.js, GraphQL, PostgreSQL, System Design, Microservices, CI/CD';
  elements.jobDescription.value = `We are looking for a Senior Full-Stack Engineer to join Stripe's Global Payments infrastructure team.
Key Responsibilities:
- Design, build, and maintain high-volume, mission-critical financial APIs with five-nines reliability.
- Collaborate with product designers and engineers to create intuitive, responsive developer dashboards.
- Mentor junior engineers and champion code quality, automated testing, and observability.
Requirements:
- 5+ years of software engineering experience building scalable web applications.
- Strong proficiency in modern JavaScript/TypeScript, React, and server-side runtimes.
- Experience with relational databases and distributed transactional architecture.`;

  elements.toneSelect.value = 'confident';
  elements.lengthSelect.value = 'medium';

  showToast('Demo data loaded! Ready to generate.', 'info');
}

function clearForm() {
  elements.form.reset();
  removeResume();
  elements.emptyState.classList.remove('hidden');
  elements.loadedState.classList.add('hidden');
  elements.loadingState.classList.add('hidden');
  state.lastGeneratedMarkdown = '';
  showToast('Form cleared.', 'info');
}

/**
 * Settings Modal for Local Development API Key Configuration
 */
function openSettingsModal() {
  const currentKey = getActiveApiKey();
  elements.apiKeyInput.value = currentKey;
  updateModalStatusDisplay(currentKey);
  elements.settingsModal.classList.remove('hidden');
  elements.settingsModal.classList.add('flex');
}

function closeSettingsModal() {
  elements.settingsModal.classList.add('hidden');
  elements.settingsModal.classList.remove('flex');
}

function handleSaveApiKey() {
  const key = elements.apiKeyInput.value.trim();
  saveLocalApiKey(key);
  checkApiKeyStatus();
  updateModalStatusDisplay(key);
  showToast(key ? 'API key saved to local session!' : 'Custom API key cleared.', 'success');
  closeSettingsModal();
}

function updateModalStatusDisplay(key) {
  if (key) {
    const masked = key.slice(0, 6) + '...' + key.slice(-4);
    elements.apiKeyStatusDisplay.innerHTML = `
      <span class="text-emerald-500 font-mono text-sm">Active Key: ${masked}</span>
    `;
  } else {
    elements.apiKeyStatusDisplay.innerHTML = `
      <span class="text-amber-500 text-sm">No key active. Set VITE_GEMINI_API_KEY in .env or paste below.</span>
    `;
  }
}

/**
 * Toast notification dispatcher
 */
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-emerald-900/90 border-emerald-500 text-emerald-100',
    error: 'bg-rose-900/90 border-rose-500 text-rose-100',
    warning: 'bg-amber-900/90 border-amber-500 text-amber-100',
    info: 'bg-slate-800/90 border-slate-600 text-slate-100'
  };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg backdrop-blur text-sm transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `<span>${message}</span>`;

  elements.toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

/**
 * Dark / Light theme management
 */
function initTheme() {
  const saved = localStorage.getItem('THEME') || 'dark';
  document.documentElement.classList.toggle('dark', saved === 'dark');
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('THEME', isDark ? 'dark' : 'light');
}

// Helper utilities
function countWords(str) {
  if (!str) return 0;
  const matches = str.match(/\b\w+\b/g);
  return matches ? matches.length : 0;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
