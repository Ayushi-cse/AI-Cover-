/**
 * Prompt Engineering Module for Cover Letter SaaS
 * 
 * Programmatically constructs the system instruction and dynamic user payload
 * sent to the LLM (Google Gemini / OpenAI).
 */

/**
 * Builds the comprehensive prompt sent to Google Gemini
 * 
 * @param {Object} formData 
 * @param {string} formData.candidateName - Full name of the candidate
 * @param {string} formData.jobRole - Target job title (e.g. Senior Frontend Engineer)
 * @param {string} formData.targetCompany - Target hiring company
 * @param {string} formData.keySkills - Comma-separated or bullet list of core skills
 * @param {string} [formData.jobDescription] - Full or excerpted job description
 * @param {string} [formData.resumeText] - Extracted text from uploaded PDF resume
 * @param {string} [formData.tone] - Selected tone (professional, confident, startup, executive)
 * @param {string} [formData.length] - Desired letter length (short, medium, detailed)
 * @returns {string} Fully engineered prompt string
 */
export function buildCoverLetterPrompt({
  candidateName,
  jobRole,
  targetCompany,
  keySkills,
  jobDescription = '',
  resumeText = '',
  tone = 'professional',
  length = 'medium'
}) {
  // Map tone options to specific stylistic guidelines
  const toneDirectives = {
    professional: 'Maintain a polished, articulate, and respectful corporate tone. Emphasize reliability, methodical problem-solving, and professional maturity.',
    confident: 'Write with bold conviction, decisive phrasing, and an energetic, results-driven voice. Highlight measurable business impact.',
    startup: 'Adopt a modern, entrepreneurial, fast-paced voice. Emphasize agility, adaptability, zero-to-one ownership, and passion for the product vision.',
    executive: 'Use high-level strategic vocabulary suitable for leadership or staff-level roles. Emphasize cross-functional influence, system design, and organizational leverage.'
  };

  // Map length options to approximate word targets
  const lengthDirectives = {
    short: 'Keep the cover letter concise and punchy (approximately 180 to 240 words, 3 compact paragraphs). Focus strictly on top accomplishments.',
    medium: 'Standard cover letter length (approximately 300 to 380 words, 4 well-structured paragraphs). Balanced narrative.',
    detailed: 'Comprehensive, in-depth cover letter (approximately 420 to 520 words, 4-5 detailed paragraphs with bullet points for key achievements).'
  };

  const selectedToneDirective = toneDirectives[tone] || toneDirectives.professional;
  const selectedLengthDirective = lengthDirectives[length] || lengthDirectives.medium;

  // Assemble system-level prompt guidelines
  return `You are an elite Silicon Valley executive career coach and technical hiring director.
Your mission is to write an exceptionally compelling, customized, and authentic cover letter that helps the candidate stand out from hundreds of applicants.

### CORE PARAMETERS:
- Candidate Name: ${candidateName.trim()}
- Target Company: ${targetCompany.trim()}
- Target Position: ${jobRole.trim()}
- Core Skills & Competencies: ${keySkills.trim()}

### WRITING & STRUCTURAL REQUIREMENTS:
1. Salutation: "Dear Hiring Team at ${targetCompany.trim()}," (or "Dear Hiring Manager,").
2. The Hook: Open with a captivating first paragraph that expresses genuine enthusiasm for ${targetCompany.trim()} and clearly connects the candidate's background to the ${jobRole.trim()} position without generic cliches like "I am writing to express my interest".
3. The Value Proposition: Connect the candidate's skills (${keySkills.trim()}) directly to solving real-world challenges at ${targetCompany.trim()}.
${resumeText ? `4. Resume Context Integration: Seamlessly incorporate specific career highlights, projects, or metrics from the candidate's resume provided below, while maintaining narrative cohesion.` : `4. Experience Storytelling: Craft plausible, high-impact scenarios showcasing how these skills delivered measurable business value.`}
${jobDescription ? `5. Job Alignment: Tailor the narrative specifically to address the core requirements, mission, and terminology mentioned in the Job Description below.` : ''}
6. Call to Action: Conclude with a confident, forward-looking closing paragraph inviting a conversation, followed by a professional sign-off ("Sincerely," or "Best regards,") and the candidate's name (${candidateName.trim()}).
7. Tone Directive: ${selectedToneDirective}
8. Length Directive: ${selectedLengthDirective}
9. Output Formatting: Format the letter in clean GitHub-flavored Markdown paragraphs. Do NOT include markdown meta-commentary, placeholders like "[Insert Date]", or conversational intro/outro text. Return ONLY the finished cover letter content.

${resumeText ? `### EXTRACTED CANDIDATE RESUME TEXT:\n"""\n${resumeText.trim().slice(0, 4000)}\n"""\n` : ''}
${jobDescription ? `### TARGET JOB DESCRIPTION:\n"""\n${jobDescription.trim().slice(0, 3000)}\n"""\n` : ''}

Generate the final cover letter now:`;
}
