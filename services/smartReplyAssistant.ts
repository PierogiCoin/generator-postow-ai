import { callApi } from './apiClient';

/**
 * Smart Reply Assistant Service
 * AI-powered comment response suggestions
 * Analyzes sentiment and context to generate appropriate replies
 */

export interface CommentAnalysis {
  commentText: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'question' | 'troll';
  intent: 'praise' | 'complaint' | 'question' | 'engagement' | 'spam' | 'constructive-feedback';
  urgency: 'immediate' | 'soon' | 'whenever';
  requiresExpertise: boolean;
  containsSensitiveTopic: boolean;
  suggestedReplyTone: 'grateful' | 'professional' | 'friendly' | 'apologetic' | 'firm' | 'playful';
}

export interface ReplySuggestion {
  id: string;
  originalComment: string;
  tone: string;
  replyOptions: ReplyOption[];
  engagementOpportunity: string; // how to turn this into more engagement
  followUpSuggestions?: string[]; // if they reply back
  warning?: string; // if comment requires caution
}

export interface ReplyOption {
  id: string;
  text: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  emoji: boolean;
  cta: string; // does it encourage further engagement?
  appropriatenessScore: number; // 1-10
}

export interface BatchReplyAnalysis {
  highPriority: ReplySuggestion[]; // negative comments, questions
  engagementOpportunities: ReplySuggestion[]; // positive comments to amplify
  communityBuilding: ReplySuggestion[]; // conversations to foster
  ignoreOrDelete: string[]; // spam/troll comments
}

/**
 * Analyzes a single comment and generates reply suggestions
 */
export async function analyzeComment(
  commentText: string,
  postContext: string,
  brandVoice: string,
  userId: string
): Promise<ReplySuggestion> {
  const analysisPrompt = `Analyze this comment and suggest replies:

COMMENT: "${commentText}"
POST CONTEXT: "${postContext}"
${brandVoice ? `BRAND VOICE: ${brandVoice}` : ''}

Provide analysis:
1. SENTIMENT: positive | neutral | negative | question | troll
2. INTENT: praise | complaint | question | engagement | spam | constructive-feedback
3. URGENCY: immediate | soon | whenever
4. REQUIRES EXPERTISE: yes/no
5. SENSITIVE TOPIC: yes/no
6. SUGGESTED TONE: grateful | professional | friendly | apologetic | firm | playful

Generate 3 reply options:
- SHORT: Quick, punchy response
- MEDIUM: Balanced response with personality
- LONG: Detailed, value-packed response

For each include:
- Full reply text (including emojis if appropriate)
- Tone used
- Does it include a CTA for further engagement?
- Appropriateness score (1-10)

Also suggest:
- How to turn this into more engagement (question, poll, etc.)
- Follow-up responses if they reply back
- Any warnings if this requires caution`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: analysisPrompt,
    systemInstruction: "You are a community manager expert. Create replies that build relationships, not just respond. Match brand voice while being authentic.",
  }, userId);

  return parseReplySuggestion(response.text || response, commentText);
}

/**
 * Analyzes multiple comments and prioritizes responses
 */
export async function analyzeCommentBatch(
  comments: { id: string; text: string; author: string }[],
  postContext: string,
  brandVoice: string,
  userId: string
): Promise<BatchReplyAnalysis> {
  const batchPrompt = `Analyze ${comments.length} comments and prioritize:

POST CONTEXT: ${postContext}
${brandVoice ? `BRAND VOICE: ${brandVoice}` : ''}

COMMENTS:
${comments.map((c, i) => `${i + 1}. ${c.author}: "${c.text}"`).join('\n')}

Categorize each:
- HIGH PRIORITY: Questions, complaints, negative sentiment
- ENGAGEMENT OPPORTUNITIES: Praise, positive comments worth amplifying
- COMMUNITY BUILDING: Conversations worth continuing
- IGNORE/DELETE: Spam, trolls, irrelevant

For high priority and engagement opportunities, suggest quick reply options.
Provide specific strategy for each category.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: batchPrompt,
    systemInstruction: "You are a community management strategist. Prioritize effectively and identify engagement opportunities others miss.",
  }, userId);

  return parseBatchAnalysis(response.text || response, comments);
}

/**
 * Generates engagement-boosting reply strategies
 */
export async function generateEngagementHooks(
  successfulReply: string,
  goal: 'more-comments' | 'more-shares' | 'more-saves' | 'more-follows',
  userId: string
): Promise<string[]> {
  const hooksPrompt = `Based on this successful reply:
"${successfulReply}"

GOAL: ${goal}

Generate 5 follow-up engagement hooks:
- Questions that encourage more comments
- Call-to-actions that drive the specific goal
- Conversation continuers that keep them engaged
- Value-adds that make them want to save/share

Make them feel natural, not pushy.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: hooksPrompt,
  }, userId);

  return parseEngagementHooks(response.text || response);
}

/**
 * Suggests canned responses for common scenarios
 */
export async function generateCannedResponses(
  scenarios: string[],
  brandVoice: string,
  userId: string
): Promise<Record<string, string[]>> {
  const cannedPrompt = `Create canned responses for these scenarios:

SCENARIOS: ${scenarios.join(', ')}
BRAND VOICE: ${brandVoice}

For each scenario, provide:
1. Short version (under 50 chars)
2. Medium version (50-150 chars)
3. Long version (150+ chars with value-add)

Maintain brand voice while being helpful and authentic.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: cannedPrompt,
    systemInstruction: "You are a customer service trainer. Create responses that feel personal, not robotic.",
  }, userId);

  return parseCannedResponses(response.text || response, scenarios);
}

/**
 * Analyzes reply patterns for optimization
 */
export async function analyzeReplyPerformance(
  replies: { comment: string; reply: string; engagement: number }[],
  userId: string
): Promise<{
  bestPerformingPatterns: string[];
  toneRecommendations: string;
  optimalLength: string;
  improvementAreas: string[];
}> {
  const analysisPrompt = `Analyze these reply-engagement pairs:

${replies.map((r, i) => `Pair ${i + 1}:
Comment: "${r.comment}"
Reply: "${r.reply}"
Engagement: ${r.engagement} reactions`).join('\n\n')}

Identify:
1. Patterns in high-engagement replies
2. What tone works best for this audience
3. Optimal reply length
4. Common mistakes in low-engagement replies

Provide actionable recommendations.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: analysisPrompt,
    systemInstruction: "You are a social media analytics expert. Identify patterns that drive engagement.",
  }, userId);

  return parseReplyPerformance(response.text || response);
}

// Parser helper functions
function parseReplySuggestion(text: string, originalComment: string): ReplySuggestion {
  const lines = text.split('\n');
  
  const findValue = (keywords: string[]): string => {
    for (const keyword of keywords) {
      const line = lines.find(l => l.toLowerCase().includes(keyword.toLowerCase()));
      if (line) {
        return line.split(/[:\-]/).pop()?.trim() || '';
      }
    }
    return '';
  };

  const sentiment = (findValue(['SENTIMENT']).toLowerCase() as CommentAnalysis['sentiment']) || 'neutral';
  const intent = (findValue(['INTENT']).toLowerCase() as CommentAnalysis['intent']) || 'engagement';
  const urgency = (findValue(['URGENCY']).toLowerCase() as CommentAnalysis['urgency']) || 'whenever';
  const tone = findValue(['SUGGESTED TONE', 'TONE']) || 'friendly';
  
  const replyOptions: ReplyOption[] = [];
  const lengths = ['SHORT', 'MEDIUM', 'LONG'];
  
  for (const length of lengths) {
    const idx = lines.findIndex(l => l.includes(length));
    if (idx !== -1) {
      const replyText = lines[idx + 1]?.trim() || '';
      if (replyText) {
        replyOptions.push({
          id: `${length.toLowerCase()}-${Date.now()}`,
          text: replyText,
          tone: tone,
          length: length.toLowerCase() as ReplyOption['length'],
          emoji: replyText.includes('😊') || replyText.includes('🙏') || replyText.includes('❤️'),
          cta: lines.find(l => l.includes('CTA') && l.includes(length))?.split(':')[1]?.trim() || 'Thanks!',
          appropriatenessScore: 8,
        });
      }
    }
  }

  if (replyOptions.length === 0) {
    replyOptions.push({
      id: `default-${Date.now()}`,
      text: 'Dziękujemy za komentarz! 🙏',
      tone: 'grateful',
      length: 'short',
      emoji: true,
      cta: 'Let us know what you think!',
      appropriatenessScore: 9,
    });
  }

  return {
    id: `suggestion-${Date.now()}`,
    originalComment,
    tone,
    replyOptions,
    engagementOpportunity: findValue(['ENGAGEMENT', 'OPPORTUNITY']) || 'Ask follow-up question',
    followUpSuggestions: [],
    warning: findValue(['WARNING', 'CAUTION']) || undefined,
  };
}

function parseBatchAnalysis(
  text: string, 
  comments: { id: string; text: string; author: string }[]
): BatchReplyAnalysis {
  const lines = text.split('\n');
  
  const findSection = (header: string): string[] => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
    if (idx === -1) return [];
    const items: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        items.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      } else if (lines[i].includes('PRIORITY') || lines[i].includes('ENGAGEMENT') || lines[i].includes('COMMUNITY')) {
        break;
      }
    }
    return items;
  };

  const highPriorityTexts = findSection('high priority');
  const engagementTexts = findSection('engagement');
  const communityTexts = findSection('community');
  const ignoreTexts = findSection('ignore');

  const createSuggestions = (texts: string[]): ReplySuggestion[] => {
    return texts.map((t, i) => ({
      id: `batch-${i}-${Date.now()}`,
      originalComment: t,
      tone: 'friendly',
      replyOptions: [{
        id: `option-${i}`,
        text: 'Dziękujemy za Twój komentarz! 🙏',
        tone: 'grateful',
        length: 'short',
        emoji: true,
        cta: 'Czekamy na więcej!',
        appropriatenessScore: 8,
      }],
      engagementOpportunity: 'Odpowiedz i zadaj pytanie',
    }));
  };

  return {
    highPriority: createSuggestions(highPriorityTexts),
    engagementOpportunities: createSuggestions(engagementTexts),
    communityBuilding: createSuggestions(communityTexts),
    ignoreOrDelete: ignoreTexts,
  };
}

function parseEngagementHooks(text: string): string[] {
  const lines = text.split('\n');
  const hooks: string[] = [];
  
  for (const line of lines) {
    if (line.match(/^\d+\./) || line.match(/^-/)) {
      hooks.push(line.replace(/^\d+\.\s*|-\s*/, '').trim());
    }
  }
  
  return hooks.length > 0 ? hooks.slice(0, 5) : [
    'A jakie jest Twoje doświadczenie?',
    'Co o tym myślisz?',
    'Podziel się w komentarzu!',
    'Zgadzasz się?',
    'Daj znać! 👇',
  ];
}

function parseCannedResponses(text: string, scenarios: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  for (const scenario of scenarios) {
    const scenarioSection = text.split('\n\n').find(s => 
      s.toLowerCase().includes(scenario.toLowerCase())
    );
    
    if (scenarioSection) {
      const lines = scenarioSection.split('\n');
      const responses: string[] = [];
      
      for (const line of lines) {
        if (line.includes('Short') || line.includes('short')) {
          responses.push(lines[lines.indexOf(line) + 1]?.trim() || 'Dziękujemy!');
        }
        if (line.includes('Medium') || line.includes('medium')) {
          responses.push(lines[lines.indexOf(line) + 1]?.trim() || 'Dziękujemy za komentarz!');
        }
        if (line.includes('Long') || line.includes('long')) {
          responses.push(lines[lines.indexOf(line) + 1]?.trim() || 'Bardzo dziękujemy za Twój komentarz! Cieszymy się, że jesteś z nami.');
        }
      }
      
      result[scenario] = responses.length > 0 ? responses : ['Dziękujemy!', 'Dziękujemy za komentarz!', 'Bardzo dziękujemy za Twój komentarz!'];
    } else {
      result[scenario] = ['Dziękujemy!', 'Dziękujemy za komentarz!', 'Bardzo dziękujemy!'];
    }
  }
  
  return result;
}

function parseReplyPerformance(text: string): {
  bestPerformingPatterns: string[];
  toneRecommendations: string;
  optimalLength: string;
  improvementAreas: string[];
} {
  const lines = text.split('\n');
  
  const extractList = (header: string): string[] => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
    if (idx === -1) return [];
    const items: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        items.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      } else if (lines[i].trim() && !lines[i].includes(':')) {
        break;
      }
    }
    return items;
  };

  return {
    bestPerformingPatterns: extractList('pattern'),
    toneRecommendations: lines.find(l => l.toLowerCase().includes('tone'))?.split(':')[1]?.trim() || 'Friendly and authentic',
    optimalLength: lines.find(l => l.toLowerCase().includes('length'))?.split(':')[1]?.trim() || 'Medium (50-150 chars)',
    improvementAreas: extractList('improvement'),
  };
}

export default {
  analyzeComment,
  analyzeCommentBatch,
  generateEngagementHooks,
  generateCannedResponses,
  analyzeReplyPerformance,
};
