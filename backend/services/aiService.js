const OpenAI = require('openai');

// Helper to determine base URL based on API key or environment variable
const getBaseUrl = (apiKey) => {
  if (process.env.OPENAI_BASE_URL) return process.env.OPENAI_BASE_URL;
  if (process.env.AI_BASE_URL) return process.env.AI_BASE_URL;
  if (apiKey && apiKey.startsWith('nvapi-')) {
    return 'https://integrate.api.nvidia.com/v1';
  }
  return undefined;
};

// Primary AI Client
const primaryApiKey = process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY;
const openai = new OpenAI({
  apiKey: primaryApiKey || 'dummy-key',
  baseURL: getBaseUrl(primaryApiKey),
});

// DeepSeek / Secondary Agent Client
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || primaryApiKey;
const deepseekClient = new OpenAI({
  apiKey: deepseekApiKey || 'dummy-key',
  baseURL: process.env.DEEPSEEK_BASE_URL || getBaseUrl(deepseekApiKey) || 'https://integrate.api.nvidia.com/v1',
});

// Default models
const DEFAULT_MODEL = process.env.AI_MODEL || process.env.OPENAI_MODEL || (primaryApiKey?.startsWith('nvapi-') ? 'deepseek-ai/deepseek-v4-flash-0731' : 'gpt-4o-mini');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-ai/deepseek-v4-flash-0731';

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

  return response.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
Return them as a JSON array of strings or a JSON object with a "replies" array. Each reply should be 1-2 sentences max.
Example output format: {"replies": ["Thanks for the update!", "I'll review this and get back to you.", "Sounds good, let's schedule a call."]}`,
      },
      {
        role: 'user',
        content: `Email from ${senderName}:\n${emailContent}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.8,
  });

  const parsed = parseModelJson(response.choices[0].message.content, null);
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
    max_tokens: 150,
    temperature: 0.3,
  });

  return response.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
        content: `Analyze the sentiment of the following email. Return a JSON object with:
- "sentiment": one of "positive", "neutral", or "negative"
- "score": a number from -1 (very negative) to 1 (very positive)
- "explanation": a brief one-sentence explanation`,
      },
      { role: 'user', content: emailContent },
    ],
    max_tokens: 150,
    temperature: 0.2,
  });

  return parseModelJson(
    response.choices[0].message.content,
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
        content: `Analyze if the following email is spam. Return a JSON object with:
- "isSpam": boolean
- "confidence": number from 0 to 1
- "reason": brief explanation`,
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\n${emailContent}`,
      },
    ],
    max_tokens: 150,
    temperature: 0.1,
  });

  return parseModelJson(
    response.choices[0].message.content,
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
          'Generate a concise, professional email subject line for the following email body. Return only the subject line text, nothing else.',
      },
      { role: 'user', content: emailBody },
    ],
    max_tokens: 50,
    temperature: 0.6,
  });

  return response.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
        content: `Categorize the following email into exactly one category. Return a JSON object with:
- "category": one of "primary", "social", "promotions", "updates", "forums"
- "confidence": number from 0 to 1`,
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\n${emailContent}`,
      },
    ],
    max_tokens: 100,
    temperature: 0.2,
  });

  return parseModelJson(
    response.choices[0].message.content,
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
        content: `Generate a reusable email template for the "${category}" category. Return a JSON object with:
- "name": a short template name
- "subject": email subject line with [PLACEHOLDER] for dynamic content
- "body": email body with [PLACEHOLDER] markers for dynamic content
Make it professional and well-structured.`,
      },
      { role: 'user', content: description },
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return parseModelJson(
    response.choices[0].message.content,
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
};
