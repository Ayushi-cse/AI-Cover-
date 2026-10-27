/**
 * Phase 1: Base MVP & Data Simulation Controller
 * 
 * Provides deterministic, offline template interpolation fulfilling the mandatory
 * Phase 1 engineering deliverable when an active API key is not configured or when
 * the user toggles "Simulation Mode".
 */

/**
 * Controller function that interpolates state variables into structured template strings.
 * 
 * @param {Object} payload
 * @param {string} payload.candidateName - Candidate's full name
 * @param {string} payload.jobRole - Target job title
 * @param {string} payload.targetCompany - Target hiring company
 * @param {string} payload.keySkills - Comma-separated or listed skills
 * @param {string} [payload.tone] - Selected tone (professional, confident, startup, executive)
 * @param {string} [payload.resumeSummary] - Optional extracted resume excerpt
 * @returns {string} Formatted markdown cover letter string
 */
export function simulateCoverLetterGeneration({
  candidateName = 'Jane Doe',
  jobRole = 'Software Engineer',
  targetCompany = 'Acme Corp',
  keySkills = 'JavaScript, React, Node.js',
  tone = 'professional',
  resumeSummary = ''
}) {
  const skillsArray = keySkills
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const primarySkill = skillsArray[0] || 'Modern Software Engineering';
  const secondarySkills = skillsArray.slice(1, 4).join(', ') || 'distributed systems and UI architecture';

  const today = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  // Template Variation: Modern Professional (Default)
  if (tone === 'professional') {
    return `${today}

**Dear Hiring Team at ${targetCompany},**

I am writing to express my enthusiastic interest in the **${jobRole}** role at **${targetCompany}**. Having followed your team's recent product innovations and engineering culture, I am eager to contribute my expertise in **${primarySkill}** to help accelerate your upcoming product roadmap.

Throughout my software engineering career, I have specialized in building robust, performant, and scalable applications. My core technical toolkit centers around **${keySkills}**. In my previous projects, I have consistently focused on writing clean, maintainable code, optimizing runtime latency, and collaborating across multidisciplinary teams to turn ambitious product roadmaps into production reality.${resumeSummary ? `\n\nReviewing your requirements against my hands-on background—particularly my track record with ${resumeSummary.slice(0, 140)}...—I am confident I can step in and deliver immediate technical leverage.` : ''}

What excites me most about **${targetCompany}** is your commitment to engineering rigor and customer-centric design. I thrive in environments where engineers are encouraged to take end-to-end ownership—from initial architectural discussions through CI/CD deployment and production monitoring. Bringing hands-on familiarity with ${secondarySkills}, I am prepared to tackle challenging technical bottlenecks alongside your talented team.

Thank you for your time, consideration, and dedication to building exceptional software. I welcome the opportunity to discuss how my technical background and problem-solving mindset align with your goals for the **${jobRole}** position.

Warm regards,

**${candidateName}**  
*${jobRole} Applicant*`;
  }

  // Template Variation: High-Energy Startup / Growth
  if (tone === 'startup') {
    return `${today}

**Dear ${targetCompany} Team,**

When I discovered the opening for **${jobRole}** at **${targetCompany}**, I knew I had to reach out immediately. The pace at which your engineering organization ships and iterates is unmatched, and I am eager to bring my background in **${keySkills}** to your fast-growing engineering stack.

As an engineer who thrives in high-velocity, zero-to-one settings, my focus has always been on delivering tangible product outcomes. Whether architecting scalable workflows using **${primarySkill}** or rapidly prototyping user interfaces with ${secondarySkills}, I pride myself on shipping pragmatic solutions that move the needle.${resumeSummary ? `\n\nMy hands-on experience includes: ${resumeSummary.slice(0, 160)}...` : ''}

I am drawn to **${targetCompany}** because you solve hard problems without bloated bureaucracy. I am excited by the prospect of rolling up my sleeves, owning key features, and collaborating closely with your engineering and product leaders to build delightful experiences for your users.

I would love to jump on a brief call to share ideas and explore how I can make an immediate impact on your sprint goals as your next **${jobRole}**.

Best regards,

**${candidateName}**`;
  }

  // Template Variation: Confident & Results-Driven
  return `${today}

**Dear Hiring Manager at ${targetCompany},**

If you are seeking a high-performing **${jobRole}** with proven execution capability across **${keySkills}**, I am confident that my technical track record will make an immediate impression on your team.

Over the past several years, I have engineered systems with a relentless focus on performance, fault-tolerance, and clean code principles. With specialized mastery in **${primarySkill}**, I have repeatedly turned ambiguous technical requirements into high-throughput, maintainable software systems.${resumeSummary ? `\n\nNotably, my background includes: ${resumeSummary.slice(0, 180)}...` : ''}

**${targetCompany}** stands out as a market leader where technical standards are held high. I am eager to deploy my capabilities in **${secondarySkills}** to optimize your existing pipelines, mentor peers, and deliver world-class software that scales effortlessly.

I look forward to discussing the strategic priorities for the **${jobRole}** position and demonstrating how my skill set will directly benefit **${targetCompany}**.

Sincerely,

**${candidateName}**`;
}
