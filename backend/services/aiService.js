const OpenAI = require('openai');

const primaryApiKey = process.env.OPENAI_API_KEY;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || primaryApiKey;

const getProviderConfig = (apiKey, envBaseUrl, envModel) => {
  let baseURL = envBaseUrl;
  let model = envModel;

  if (apiKey && apiKey.startsWith('nvapi-')) {
    if (!baseURL || baseURL.includes('googleapis')) baseURL = 'https://integrate.api.nvidia.com/v1';
    if (!model || model.includes('gemini') || model.includes('llama-3.2-11b')) model = 'deepseek-ai/deepseek-v4-flash-0731';
  } else if (apiKey && (apiKey.startsWith('AIzaSy') || apiKey.startsWith('AQ.'))) {
    if (!baseURL || baseURL.includes('nvidia')) baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
    if (!model || model.includes('llama') || model.includes('deepseek')) model = 'gemini-3.6-flash';
  }

  return { baseURL: baseURL || undefined, model: model || 'gemini-3.6-flash' };
};

const primaryConfig = getProviderConfig(primaryApiKey, process.env.OPENAI_BASE_URL, process.env.AI_MODEL);
const deepseekConfig = getProviderConfig(deepseekApiKey, process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL, process.env.DEEPSEEK_MODEL || process.env.AI_MODEL);

const openai = new OpenAI({
  apiKey: primaryApiKey || 'dummy-key',
  baseURL: primaryConfig.baseURL,
});

const deepseekClient = new OpenAI({
  apiKey: deepseekApiKey || 'dummy-key',
  baseURL: deepseekConfig.baseURL,
});

const DEFAULT_MODEL = primaryConfig.model;
const DEEPSEEK_MODEL = deepseekConfig.model;

/**
 * Utility to parse JSON safely from model responses (handles markdown codeblocks and thinking tags)
 */
const parseModelJson = (rawContent, fallback) => {
  if (!rawContent) return fallback;
  try {
    // Remove thinking tags if present
    let cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Remove markdown codeblock wrapper
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    // Extract JSON object or array substring if surrounded by extra text
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('Failed to parse AI JSON response, using fallback:', err.message);
    return fallback;
  }
};

/**
 * AI-assisted email composition
 */
const composeAssist = async (prompt, tone = 'professional', context = '', model = DEFAULT_MODEL) => {
  const systemPrompt = `You are an expert email writing assistant. Write emails that are ${tone} in tone.
${context ? `Context: ${context}` : ''}
Write only the email body content. Do not include subject lines, greetings headers like "Subject:" or signature blocks unless asked.
Keep the email concise, clear, and well-structured.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};

/**
 * Generate smart reply suggestions
 */
const generateSmartReplies = async (emailContent, senderName, model = DEFAULT_MODEL) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are an email assistant. Generate exactly 3 short, contextually appropriate reply suggestions for the given email. 
Return ONLY a valid JSON array of 3 strings. Example: ["Thanks for the update!", "I'll review this and get back to you.", "Sounds good, let's schedule a call."]`,
      },
      {
        role: 'user',
        content: `Email from ${senderName}:\n${emailContent}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  const parsed = parseModelJson(content, null);
  if (parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.replies)) return parsed.replies;
    if (Array.isArray(parsed.suggestions)) return parsed.suggestions;
    const values = Object.values(parsed);
    if (values.length > 0 && Array.isArray(values[0])) return values[0];
  }
  return ['Thanks for your email!', 'I\'ll look into this.', 'Got it, thanks!'];
};

/**
 * Summarize email content
 */
const summarizeEmail = async (emailContent, model = DEFAULT_MODEL) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'Summarize the following email in 1-2 concise sentences. Focus on the key points and any action items.',
      },
      { role: 'user', content: emailContent },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};

/**
 * Analyze email sentiment
 */
const analyzeSentiment = async (emailContent, model = DEFAULT_MODEL) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Analyze the sentiment of the following email. Return ONLY a JSON object with:
- "sentiment": one of "positive", "neutral", or "negative"
- "score": a number from -1 (very negative) to 1 (very positive)
- "explanation": a brief one-sentence explanation`,
      },
      { role: 'user', content: emailContent },
    ],
    max_tokens: 500,
    temperature: 0.2,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return parseModelJson(
    content,
    { sentiment: 'neutral', score: 0, explanation: 'Unable to analyze sentiment' }
  );
};

/**
 * Detect spam
 */
const detectSpam = async (emailContent, subject, model = DEFAULT_MODEL) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Analyze if the following email is spam. Return ONLY a JSON object with:
- "isSpam": boolean
- "confidence": number from 0 to 1
- "reason": brief explanation`,
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\n${emailContent}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return parseModelJson(
    content,
    { isSpam: false, confidence: 0, reason: 'Unable to analyze' }
  );
};

/**
 * Generate email subject line
 */
const generateSubject = async (emailBody, model = DEFAULT_MODEL) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'Generate a concise, professional email subject line for the following email body. Return only the plain text subject line, nothing else.',
      },
      { role: 'user', content: emailBody },
    ],
    max_tokens: 300,
    temperature: 0.6,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^Subject:\s*/i, '').trim();
};

/**
 * Categorize email
 */
const categorizeEmail = async (emailContent, subject, model = DEFAULT_MODEL) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Categorize the following email into exactly one category. Return ONLY a JSON object with:
- "category": one of "primary", "social", "promotions", "updates", "forums"
- "confidence": number from 0 to 1`,
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\n${emailContent}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.2,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return parseModelJson(
    content,
    { category: 'primary', confidence: 0.5 }
  );
};

/**
 * Generate email template
 */
const generateTemplate = async (description, category = 'business', model = DEFAULT_MODEL) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Generate a reusable email template for the "${category}" category. Return ONLY a JSON object with:
- "name": a short template name
- "subject": email subject line with [PLACEHOLDER] for dynamic content
- "body": email body with [PLACEHOLDER] markers for dynamic content
Make it professional and well-structured.`,
      },
      { role: 'user', content: description },
    ],
    max_tokens: 800,
    temperature: 0.7,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return parseModelJson(
    content,
    { name: 'Custom Template', subject: '', body: description }
  );
};

/**
 * Run agent task with DeepSeek model
 */
const runAgentTask = async (prompt, systemInstruction = '', model = DEEPSEEK_MODEL) => {
  const response = await deepseekClient.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemInstruction || 'You are an intelligent email agent.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  return response.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};

/**
 * Analyze an email for job/internship opportunities, trust score, and application deadlines
 */
const analyzeJobOpportunity = async (emailSubject, emailBody, model = DEFAULT_MODEL) => {
  const prompt = `Analyze the following email to determine if it is a job, internship, fellowship, or career opportunity.
Return ONLY a valid JSON object with:
- "isJobOpportunity": boolean (true if it represents a hiring opportunity, job alert, or internship)
- "companyName": string (name of the organization/company, or "Unknown Company")
- "jobTitle": string (e.g. "Software Engineer Intern", "Product Designer", "Data Analyst")
- "roleType": string ("Internship", "Full-time", "Part-time", "Contract", "Fellowship", or "Other")
- "deadline": string or null (ISO 8601 timestamp or date string if mentioned, or null)
- "isGenuine": boolean (true if the opportunity looks authentic, trustworthy, and from a legitimate employer)
- "trustScore": number (integer 0 to 100 assessing trustworthiness)
- "trustReasons": array of strings (bullet points explaining why it is genuine or highlighting red flags like requests for money, suspicious domains, vague descriptions)
- "applyUrl": string or null (application link if present)
- "applyEmail": string or null (application or HR contact email if present)
- "summary": string (2-sentence summary of the role and key requirements)

Email Subject: ${emailSubject}
Email Body:
${emailBody.substring(0, 3000)}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert career intelligence and fraud detection agent. Analyze opportunities carefully for authenticity and return valid JSON only.'
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1000,
    temperature: 0.2
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return parseModelJson(content, {
    isJobOpportunity: false,
    companyName: 'Unknown',
    jobTitle: 'Opportunity',
    roleType: 'Other',
    deadline: null,
    isGenuine: true,
    trustScore: 70,
    trustReasons: ['Standard job description structure'],
    applyUrl: null,
    applyEmail: null,
    summary: 'Career opportunity mentioned in email.'
  });
};

/**
 * Generate a personalized cover letter and application response for a detected job opportunity
 */
const draftJobApplication = async (jobDetails, candidateName = 'Mohil', model = DEFAULT_MODEL) => {
  const prompt = `Write a compelling, professional cover letter and application email for the following position:
Candidate Name: ${candidateName}
Company: ${jobDetails.companyName}
Role: ${jobDetails.jobTitle} (${jobDetails.roleType})
Job Summary: ${jobDetails.summary || ''}

Write a structured, persuasive application highlighting enthusiasm, technical skills, problem solving, and why the candidate is a strong fit. Keep it professional and concise (under 250 words).`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a professional career coach and email copywriter specializing in high-conversion job applications.'
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1000,
    temperature: 0.7
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};

module.exports = {
  openai,
  deepseekClient,
  composeAssist,
  generateSmartReplies,
  summarizeEmail,
  analyzeSentiment,
  detectSpam,
  generateSubject,
  categorizeEmail,
  generateTemplate,
  runAgentTask,
  analyzeJobOpportunity,
  draftJobApplication,
};
