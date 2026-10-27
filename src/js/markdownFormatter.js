/**
 * Markdown to Clean Semantic HTML Parser
 * 
 * Converts raw LLM markdown output into well-structured, styled HTML paragraphs,
 * headings, and bullet points. Guarantees output renders as readable paragraphs
 * rather than a single contiguous text blob.
 */

/**
 * Escapes unsafe HTML characters to prevent XSS injection from LLM output
 */
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Parses markdown text into semantic HTML
 * 
 * @param {string} markdown - Raw markdown string from Gemini or template generator
 * @returns {string} Sanitized HTML string
 */
export function parseMarkdownToHtml(markdown) {
  if (!markdown) return '';

  // Step 1: Escape raw HTML tags to prevent cross-site scripting
  let text = escapeHtml(markdown.trim());

  // Step 2: Parse headings
  text = text.replace(/^### (.*$)/gim, '<h3 class="cl-h3">$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2 class="cl-h2">$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1 class="cl-h1">$1</h1>');

  // Step 3: Parse bold and italics
  text = text.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  text = text.replace(/___(.*?)___/gim, '<strong><em>$1</em></strong>');
  text = text.replace(/__(.*?)__/gim, '<strong>$1</strong>');
  text = text.replace(/_(.*?)_/gim, '<em>$1</em>');

  // Step 4: Parse blockquotes
  text = text.replace(/^\> (.*$)/gim, '<blockquote class="cl-blockquote">$1</blockquote>');

  // Step 5: Split by double newlines into block elements
  const blocks = text.split(/\n\s*\n/);

  const formattedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // Check if block is already an HTML tag (heading, blockquote)
    if (/^<(h[1-6]|blockquote)/.test(trimmed)) {
      return trimmed;
    }

    // Check if block is an unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed
        .split('\n')
        .map(line => line.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean)
        .map(item => `<li>${item}</li>`)
        .join('');
      return `<ul class="cl-list">${items}</ul>`;
    }

    // Check if block is an ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = trimmed
        .split('\n')
        .map(line => line.replace(/^\d+\.\s+/, '').trim())
        .filter(Boolean)
        .map(item => `<li>${item}</li>`)
        .join('');
      return `<ol class="cl-ordered-list">${items}</ol>`;
    }

    // Convert single newlines inside paragraph to <br> for addresses/sign-offs
    const withBreaks = trimmed.replace(/\n/g, '<br />');
    return `<p class="cl-paragraph">${withBreaks}</p>`;
  });

  return formattedBlocks.filter(Boolean).join('\n');
}
