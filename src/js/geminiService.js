/**
 * Google Gemini API Integration Layer
 * 
 * Handles secure communication with the Google Generative Language REST API.
 * Adheres to 2026 security requirements: environment variable resolution
 * (VITE_GEMINI_API_KEY / VITE_API_KEY) with optional runtime fallback.
 */

// Primary model: gemini-1.5-flash provides the best blend of speed, free-tier quota, and markdown coherence.
const DEFAULT_MODEL = 'gemini-1.5-flash';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Resolves the active Gemini API key from environment variables or local storage overrides.
 * 
 * Priority order:
 * 1. Vite environment variable: import.meta.env.VITE_GEMINI_API_KEY
 * 2. Vite generic variable: import.meta.env.VITE_API_KEY
 * 3. Session / LocalStorage override (configured by developer via UI Settings)
 * 
 * @returns {string} The resolved API key or empty string
 */
export function getActiveApiKey() {
  // Vite injects environment variables prefixed with VITE_
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env)
    ? (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '')
    : '';

  if (envKey && envKey.trim().length > 0 && !envKey.includes('your_')) {
    return envKey.trim();
  }

  // Fallback to locally stored key if user supplied one in the UI
  try {
    const localKey = localStorage.getItem('GEMINI_API_KEY_OVERRIDE') || '';
    if (localKey && localKey.trim().length > 0) {
      return localKey.trim();
    }
  } catch (e) {
    // LocalStorage may be blocked in some private browsing modes
    console.warn('LocalStorage access blocked, using environment variable only.', e);
  }

  return '';
}

/**
 * Saves a user-provided API key to localStorage for convenient browser testing
 * without needing to rebuild or restart the Vite dev server.
 * 
 * @param {string} key 
 */
export function saveLocalApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem('GEMINI_API_KEY_OVERRIDE', key.trim());
    } else {
      localStorage.removeItem('GEMINI_API_KEY_OVERRIDE');
    }
  } catch (e) {
    console.error('Failed to save API key to local storage', e);
  }
}

/**
 * Executes a generation request to the Gemini API with structured prompt injection.
 * 
 * @param {string} prompt - Programmatically engineered prompt string
 * @param {Object} [options]
 * @param {string} [options.model=DEFAULT_MODEL]
 * @param {number} [options.temperature=0.7] - Creativity parameter (0.0 to 1.0)
 * @param {AbortSignal} [options.signal] - For user-initiated cancellation
 * @returns {Promise<{ text: string, latencyMs: number, model: string }>}
 */
export async function generateCoverLetterWithGemini(prompt, options = {}) {
  const apiKey = getActiveApiKey();

  if (!apiKey) {
    const err = new Error('No API key detected. Please configure VITE_GEMINI_API_KEY in your .env file or enter a key in Settings.');
    err.code = 'MISSING_API_KEY';
    throw err;
  }

  const model = options.model || DEFAULT_MODEL;
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.7;
  const endpoint = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Construct official Google Generative Language request payload
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: temperature,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1200
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };

  const startTime = performance.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let errorData = null;
      try {
        errorData = await response.json();
      } catch (parseErr) {
        // Fall back to HTTP status text if body isn't JSON
        throw new Error(`Gemini API Error (HTTP ${response.status}): ${response.statusText}`);
      }

      const errorMessage = errorData?.error?.message || response.statusText;
      const errorCode = errorData?.error?.status || `HTTP_${response.status}`;

      // Developer-friendly error translation for common failure scenarios
      if (response.status === 400 && errorMessage.toLowerCase().includes('api key')) {
        const keyErr = new Error('Invalid Gemini API Key. Please verify the key in your .env file.');
        keyErr.code = 'INVALID_API_KEY';
        throw keyErr;
      }

      if (response.status === 429) {
        const rateErr = new Error('Gemini API Free Tier rate limit reached. Please wait 30 seconds or switch to Simulation Mode.');
        rateErr.code = 'RATE_LIMIT_EXCEEDED';
        throw rateErr;
      }

      const apiErr = new Error(`Gemini API Error: ${errorMessage}`);
      apiErr.code = errorCode;
      throw apiErr;
    }

    const data = await response.json();

    // Verify candidate text response structure
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('The generation was flagged by safety filters. Please refine the input parameters.');
      }
      throw new Error('Gemini API returned an empty response. Please try again.');
    }

    const generatedText = candidate.content.parts[0].text.trim();

    return {
      text: generatedText,
      latencyMs: elapsedMs,
      model: model
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      const abortErr = new Error('Generation was cancelled by the user.');
      abortErr.code = 'USER_ABORTED';
      throw abortErr;
    }
    // Re-throw for upstream handling
    throw error;
  }
}
