/**
 * Resume Parsing & Text Extraction Module
 * 
 * Uses Mozilla's PDF.js to extract raw text streams from client-uploaded PDF resumes,
 * cleans noisy character sequences, and generates preview metrics for LLM injection.
 */

// Configure PDF.js worker source if library is loaded globally
function setupPdfJsWorker() {
  if (typeof window !== 'undefined' && window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

/**
 * Extracts raw textual content from an uploaded resume file (PDF or TXT).
 * 
 * @param {File} file - Browser File object from input[type="file"] or drop event
 * @param {Function} [onProgress] - Optional progress callback: (percent: number, step: string) => void
 * @returns {Promise<{
 *   text: string,
 *   fileName: string,
 *   fileSizeKb: number,
 *   pageCount: number,
 *   wordCount: number,
 *   charCount: number,
 *   summarySnippet: string
 * }>}
 */
export async function extractResumeText(file, onProgress = () => {}) {
  if (!file) {
    throw new Error('No file provided for extraction.');
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isTxt = file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md');

  if (!isPdf && !isTxt) {
    throw new Error(`Unsupported file type (${file.type || 'unknown'}). Please upload a PDF or plain text (.txt) resume.`);
  }

  // Size sanity check (max 10MB to avoid browser heap exhaustion)
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Resume file exceeds the 10MB limit. Please upload a smaller document.');
  }

  onProgress(10, 'Reading file buffer...');

  if (isTxt) {
    return extractTextFile(file);
  }

  return extractPdfFile(file, onProgress);
}

/**
 * Handles plain text file reading using native FileReader API
 */
async function extractTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target.result || '';
      const cleaned = cleanExtractedText(rawText);
      resolve({
        text: cleaned,
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        pageCount: 1,
        wordCount: countWords(cleaned),
        charCount: cleaned.length,
        summarySnippet: cleaned.slice(0, 160) + '...'
      });
    };
    reader.onerror = () => reject(new Error('Failed to read plain text resume file.'));
    reader.readAsText(file);
  });
}

/**
 * Extracts text from PDF pages using PDF.js
 */
async function extractPdfFile(file, onProgress) {
  setupPdfJsWorker();

  if (typeof window === 'undefined' || !window.pdfjsLib) {
    throw new Error('PDF.js library is not available in the current browser session. Ensure CDN script is loaded or upload a .txt file.');
  }

  const arrayBuffer = await file.arrayBuffer();
  onProgress(30, 'Parsing PDF document structure...');

  let loadingTask;
  try {
    loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  } catch (initErr) {
    throw new Error('Could not initialize PDF parser: ' + initErr.message);
  }

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const extractedPages = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pagePercent = 30 + Math.round((pageNum / numPages) * 60);
    onProgress(pagePercent, `Extracting page ${pageNum} of ${numPages}...`);

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruct lines preserving basic word separation
    let lastY = null;
    let pageText = '';

    for (const item of textContent.items) {
      if (!item.str) continue;

      // Detect line break when Y coordinate shifts significantly
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
        pageText += ' ';
      }

      pageText += item.str;
      lastY = item.transform[5];
    }

    extractedPages.push(pageText);
  }

  onProgress(95, 'Cleaning and normalizing extracted text...');
  const combinedRawText = extractedPages.join('\n\n');
  const cleaned = cleanExtractedText(combinedRawText);

  if (!cleaned || cleaned.length < 30) {
    throw new Error('The PDF appears to be empty or contains scanned images without selectable text. Consider saving your resume as searchable text.');
  }

  return {
    text: cleaned,
    fileName: file.name,
    fileSizeKb: Math.round(file.size / 1024),
    pageCount: numPages,
    wordCount: countWords(cleaned),
    charCount: cleaned.length,
    summarySnippet: cleaned.slice(0, 180) + '...'
  };
}

/**
 * Sanitizes raw PDF text by removing excessive whitespace, null bytes,
 * and normalizing bullet characters.
 */
function cleanExtractedText(text) {
  if (!text) return '';

  return text
    // Replace non-standard bullets with clean hyphens
    .replace(/[•●▪◆►]/g, '-')
    // Replace multiple spaces with a single space
    .replace(/[ \t]+/g, ' ')
    // Replace 3+ consecutive line breaks with 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove control characters (except newline and carriage return)
    .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Utility word counter
 */
function countWords(str) {
  if (!str) return 0;
  const matches = str.match(/\b\w+\b/g);
  return matches ? matches.length : 0;
}
