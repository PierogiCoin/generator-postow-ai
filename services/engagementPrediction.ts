import { callApi } from './apiClient';
import { STORAGE_KEYS } from '../utils/storageUtils';

/**
 * Engagement Prediction Service
 * Predicts which post will get the most comments, likes, shares
 * Analyzes content patterns that drive engagement
 */

export interface EngagementPrediction {
  postId?: string;
  overallScore: number; // 1-10
  confidence: 'high' | 'medium' | 'low';
  predictedMetrics: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    engagementRate: number; // percentage
  };
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  comparativeAnalysis: {
    vsAverage: 'above' | 'average' | 'below';
    percentile: number; // what % of similar content this outperforms
  };
  viralPotential: {
    score: number; // 0-100
    triggers: string[];
    timeline: string; // when viral potential peaks
  };
  bestEngagementWindow: {
    startHour: number;
    endHour: number;
    reasoning: string;
  };
}

export interface ContentComparison {
  posts: {
    id: string;
    preview: string;
    prediction: EngagementPrediction;
    ranking: number;
  }[];
  winner: string; // post ID with highest predicted engagement
  analysis: string;
}

export interface EngagementFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  currentValue: string;
  optimalValue: string;
  improvement: string;
}

/**
 * Predicts engagement for a single post
 */
export async function predictEngagement(
  postText: string,
  imageDescription: string,
  platform: string,
  niche: string,
  postingTime: string,
  userId: string
): Promise<EngagementPrediction> {
  const predictionPrompt = `Analyze this post and predict engagement:

POST TEXT: "${postText}"
${imageDescription ? `IMAGE: ${imageDescription}` : ''}
PLATFORM: ${platform}
NICHE: ${niche}
POSTING TIME: ${postingTime}

Predict:
1. OVERALL SCORE (1-10)
2. CONFIDENCE (high/medium/low)
3. ESTIMATED METRICS:
   - Likes range
   - Comments range  
   - Shares range
   - Saves range
   - Estimated reach
   - Engagement rate %
4. CONTENT STRENGTHS (3-5 factors)
5. CONTENT WEAKNESSES (2-3 factors)
6. IMPROVEMENT SUGGESTIONS (3 specific changes)
7. COMPARISON: Is this above/below average for this niche?
8. VIRAL POTENTIAL (0-100 score, triggers, timeline)
9. BEST ENGAGEMENT WINDOW (hours after posting)

Be realistic with predictions based on typical performance for this niche/platform.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: predictionPrompt,
    systemInstruction: "You are a social media prediction expert. Provide realistic, data-informed engagement predictions. Don't inflate numbers - accuracy matters.",
  }, userId);

  return parseEngagementPrediction(response.text || response, postText);
}

/**
 * Compares multiple posts to predict which will perform best
 */
export async function comparePosts(
  posts: { id: string; text: string; imageDesc?: string }[],
  platform: string,
  niche: string,
  userId: string
): Promise<ContentComparison> {
  const comparisonPrompt = `Compare these ${posts.length} posts and predict which will get most engagement:

PLATFORM: ${platform}
NICHE: ${niche}

POSTS:
${posts.map((p, i) => `POST ${i + 1} (ID: ${p.id}):
${p.text.substring(0, 200)}${p.text.length > 200 ? '...' : ''}
${p.imageDesc ? `Image: ${p.imageDesc}` : ''}`).join('\n\n')}

For each post:
1. Predict engagement score (1-10)
2. Estimated comments, likes, shares
3. Key strengths and weaknesses
4. Viral potential

Then rank them and explain why the winner will perform best.
Identify common patterns across top performers.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: comparisonPrompt,
    systemInstruction: "You are a content comparison expert. Be objective and specific about why one piece of content will outperform another.",
  }, userId);

  return parseContentComparison(response.text || response, posts);
}

/**
 * Analyzes what engagement factors a post has/doesn't have
 */
export async function analyzeEngagementFactors(
  postText: string,
  platform: string,
  userId: string
): Promise<EngagementFactor[]> {
  const factorsPrompt = `Analyze engagement factors in this post:

POST: "${postText}"
PLATFORM: ${platform}

Evaluate these factors:
1. Hook strength (first 2 sentences)
2. Call-to-action presence and quality
3. Emotional trigger (curiosity, FOMO, inspiration, etc.)
4. Question or poll element
5. Storytelling element
6. Value proposition clarity
7. Visual description potential
8. Controversy/debate potential (balanced)
9. Relatability factor
10. Shareability (would someone share this?)

For each:
- Rate impact (high/medium/low)
- Current state in this post
- What would be optimal
- Specific improvement suggestion`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: factorsPrompt,
    systemInstruction: "You are an engagement factor analyst. Be thorough and specific about what's working and what's missing.",
  }, userId);

  return parseEngagementFactors(response.text || response);
}

/**
 * Predicts comment volume and types
 */
export async function predictComments(
  postText: string,
  platform: string,
  audienceType: string,
  userId: string
): Promise<{
  estimatedCount: number;
  commentTypes: { type: string; percentage: number; examples: string[] }[];
  likelyQuestions: string[];
  controversialPoints: string[];
  engagementHooks: string[];
}> {
  const commentsPrompt = `Predict comment patterns for this post:

POST: "${postText}"
PLATFORM: ${platform}
AUDIENCE: ${audienceType}

Predict:
1. ESTIMATED COMMENT COUNT (realistic range)
2. COMMENT TYPE BREAKDOWN:
   - Agreement/support %
   - Questions %
   - Personal stories %
   - Debate/disagreement %
   - Spam/irrelevant %
3. LIKELY QUESTIONS people will ask (3-5)
4. POTENTIALLY CONTROVERSIAL points (2-3)
5. ENGAGEMENT HOOKS to add (to get more comments)

Be realistic about comment volume and types.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: commentsPrompt,
    systemInstruction: "You are a comment pattern expert. Predict what real people would actually say.",
  }, userId);

  return parseCommentPrediction(response.text || response);
}

/**
 * Suggests A/B test for engagement optimization
 */
export async function suggestEngagementABTest(
  postText: string,
  goal: 'more-comments' | 'more-likes' | 'more-shares',
  userId: string
): Promise<{ variantA: string; variantB: string; hypothesis: string; testDuration: string }> {
  const abPrompt = `Create A/B test variants for engagement:

ORIGINAL POST: "${postText}"
GOAL: ${goal}

Create 2 variants:
VARIANT A: Optimize for ${goal} through specific psychological trigger
VARIANT B: Different approach to same goal

Provide:
- Full text for both variants
- Hypothesis: Why variant A vs B might win
- Test duration recommendation
- Success metrics

Make them meaningfully different, not just word tweaks.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: abPrompt,
    systemInstruction: "You are an A/B testing strategist. Create meaningful variations to test engagement hypotheses.",
  }, userId);

  return parseABTest(response.text || response, postText);
}

// Parser helper functions
function parseEngagementPrediction(text: string, postText: string): EngagementPrediction {
  const lines = text.split('\n');
  
  const findValue = (keywords: string[]): string => {
    for (const keyword of keywords) {
      const line = lines.find(l => l.toLowerCase().includes(keyword.toLowerCase()));
      if (line) {
        const match = line.match(/[:\-]\s*(.+)/);
        return match ? match[1].trim() : line.trim();
      }
    }
    return '';
  };

  const findNumber = (keywords: string[]): number => {
    const value = findValue(keywords);
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const findRange = (keywords: string[]): { min: number; max: number } => {
    const value = findValue(keywords);
    const matches = value.match(/(\d+[KMB]?)/g);
    if (matches && matches.length >= 2) {
      return { min: parseMetric(matches[0]), max: parseMetric(matches[1]) };
    }
    return { min: 50, max: 200 };
  };

  const score = findNumber(['OVERALL', 'SCORE']) || 6;
  const likes = findRange(['LIKE']);
  const comments = findRange(['COMMENT']);
  const shares = findRange(['SHARE']);
  const saves = findRange(['SAVE']);
  const reach = findRange(['REACH']);
  const engagementRate = findNumber(['ENGAGEMENT RATE', 'RATE %']) || 3;

  const extractList = (header: string): string[] => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
    if (idx === -1) return [];
    const items: string[] = [];
    for (let i = idx + 1; i < lines.length && items.length < 5; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        items.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      } else if (lines[i].includes('WEAKNESS') || lines[i].includes('IMPROVEMENT')) {
        break;
      }
    }
    return items;
  };

  const viralScore = findNumber(['VIRAL', 'POTENTIAL']) || 30;
  const viralTriggers: string[] = [];
  const viralSection = lines.findIndex(l => l.toLowerCase().includes('viral'));
  if (viralSection !== -1) {
    for (let i = viralSection + 1; i < lines.length && viralTriggers.length < 3; i++) {
      if (lines[i].includes('trigger') || lines[i].includes('factor')) {
        viralTriggers.push(lines[i].split(':')[1]?.trim() || lines[i]);
      }
    }
  }

  return {
    overallScore: score,
    confidence: (findValue(['CONFIDENCE']).toLowerCase() as EngagementPrediction['confidence']) || 'medium',
    predictedMetrics: {
      likes: (likes.min + likes.max) / 2,
      comments: (comments.min + comments.max) / 2,
      shares: (shares.min + shares.max) / 2,
      saves: (saves.min + saves.max) / 2,
      reach: (reach.min + reach.max) / 2,
      engagementRate,
    },
    strengths: extractList('strength'),
    weaknesses: extractList('weakness'),
    improvementSuggestions: extractList('improvement').slice(0, 3),
    comparativeAnalysis: {
      vsAverage: score > 6 ? 'above' : score > 4 ? 'average' : 'below',
      percentile: 30 + (score * 7),
    },
    viralPotential: {
      score: viralScore,
      triggers: viralTriggers.length > 0 ? viralTriggers : ['Emotional hook', 'Shareable format'],
      timeline: findValue(['TIMELINE', 'PEAK']) || '24-48 hours',
    },
    bestEngagementWindow: {
      startHour: 0,
      endHour: 2,
      reasoning: 'First 2 hours are critical for algorithm boost',
    },
  };
}

function parseMetric(value: string): number {
  if (value.includes('K')) return parseInt(value) * 1000;
  if (value.includes('M')) return parseInt(value) * 1000000;
  return parseInt(value) || 0;
}

function parseContentComparison(
  text: string,
  posts: { id: string; text: string }[]
): ContentComparison {
  const lines = text.split('\n');
  
  const comparison: ContentComparison['posts'] = posts.map((p, i) => ({
    id: p.id,
    preview: p.text.substring(0, 50) + '...',
    prediction: {
      overallScore: 6,
      confidence: 'medium',
      predictedMetrics: {
        likes: 150,
        comments: 20,
        shares: 10,
        saves: 5,
        reach: 1000,
        engagementRate: 4,
      },
      strengths: [],
      weaknesses: [],
      improvementSuggestions: [],
      comparativeAnalysis: { vsAverage: 'average', percentile: 50 },
      viralPotential: { score: 30, triggers: [], timeline: '24h' },
      bestEngagementWindow: { startHour: 0, endHour: 2, reasoning: '' },
    },
    ranking: i + 1,
  }));

  // Find rankings in text
  for (let i = 0; i < posts.length; i++) {
    const rankMatch = text.match(new RegExp(`post ${i + 1}.*?(\\d)/10`, 'i'));
    if (rankMatch) {
      comparison[i].prediction.overallScore = parseInt(rankMatch[1]);
    }
  }

  // Sort by score
  comparison.sort((a, b) => b.prediction.overallScore - a.prediction.overallScore);
  comparison.forEach((p, i) => { p.ranking = i + 1; });

  return {
    posts: comparison,
    winner: comparison[0].id,
    analysis: lines.find(l => l.toLowerCase().includes('winner') || l.toLowerCase().includes('why'))?.split(':')[1]?.trim() || 'Winner has strongest engagement factors.',
  };
}

function parseEngagementFactors(text: string): EngagementFactor[] {
  const factors: EngagementFactor[] = [];
  const lines = text.split('\n');
  
  const factorKeywords = [
    'Hook', 'CTA', 'Emotional', 'Question', 'Story', 'Value', 'Visual', 'Controversy', 'Relatable', 'Shareable'
  ];
  
  for (const keyword of factorKeywords) {
    const idx = lines.findIndex(l => l.toLowerCase().includes(keyword.toLowerCase()));
    if (idx !== -1) {
      const line = lines[idx];
      const impact = line.includes('high') ? 'high' : line.includes('medium') ? 'medium' : 'low';
      factors.push({
        factor: keyword,
        impact,
        currentValue: 'Present',
        optimalValue: 'Strong',
        improvement: lines[idx + 1]?.trim() || 'Strengthen this element',
      });
    }
  }

  return factors.length > 0 ? factors : [
    { factor: 'Hook', impact: 'high', currentValue: 'Present', optimalValue: 'Stronger', improvement: 'Add stronger opening' },
    { factor: 'CTA', impact: 'medium', currentValue: 'Weak', optimalValue: 'Clear', improvement: 'Add specific call-to-action' },
  ];
}

function parseCommentPrediction(text: string): {
  estimatedCount: number;
  commentTypes: { type: string; percentage: number; examples: string[] }[];
  likelyQuestions: string[];
  controversialPoints: string[];
  engagementHooks: string[];
} {
  const lines = text.split('\n');
  
  const countMatch = text.match(/(\d+)[-\s]*(\d+)?\s*comment/i);
  const estimatedCount = countMatch ? parseInt(countMatch[2] || countMatch[1]) : 25;

  const extractList = (header: string): string[] => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
    if (idx === -1) return [];
    const items: string[] = [];
    for (let i = idx + 1; i < lines.length && items.length < 5; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        items.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      }
    }
    return items;
  };

  return {
    estimatedCount,
    commentTypes: [
      { type: 'Agreement', percentage: 40, examples: ['Love this!', 'So true'] },
      { type: 'Questions', percentage: 25, examples: ['How do you...?', 'What about...?'] },
      { type: 'Stories', percentage: 20, examples: ['This reminds me of...', 'I had similar...'] },
      { type: 'Debate', percentage: 10, examples: ['But what if...', 'I disagree...'] },
      { type: 'Spam', percentage: 5, examples: ['Check my bio', 'DM me'] },
    ],
    likelyQuestions: extractList('question'),
    controversialPoints: extractList('controversy').slice(0, 3),
    engagementHooks: extractList('hook').slice(0, 3),
  };
}

function parseABTest(text: string, original: string): { variantA: string; variantB: string; hypothesis: string; testDuration: string } {
  const lines = text.split('\n');
  
  const findVariant = (label: string): string => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(label.toLowerCase()));
    if (idx === -1) return original;
    const content: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].includes('VARIANT') || lines[i].includes('HYPOTHESIS')) break;
      content.push(lines[i]);
    }
    return content.join('\n').trim() || original;
  };

  return {
    variantA: findVariant('variant a'),
    variantB: findVariant('variant b'),
    hypothesis: lines.find(l => l.toLowerCase().includes('hypothesis'))?.split(':')[1]?.trim() || 'Variant A will perform better due to stronger hook.',
    testDuration: lines.find(l => l.toLowerCase().includes('duration'))?.split(':')[1]?.trim() || '48 hours',
  };
}

// Storage helpers
const PREDICTION_HISTORY_KEY = STORAGE_KEYS.ENGAGEMENT_PREDICTIONS;

export function savePrediction(postId: string, prediction: EngagementPrediction): void {
  if (typeof window === 'undefined') return;
  const history = JSON.parse(localStorage.getItem(PREDICTION_HISTORY_KEY) || '{}');
  history[postId] = { prediction, timestamp: Date.now() };
  localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(history));
}

export function getPrediction(postId: string): EngagementPrediction | null {
  if (typeof window === 'undefined') return null;
  const history = JSON.parse(localStorage.getItem(PREDICTION_HISTORY_KEY) || '{}');
  return history[postId]?.prediction || null;
}

export default {
  predictEngagement,
  comparePosts,
  analyzeEngagementFactors,
  predictComments,
  suggestEngagementABTest,
  savePrediction,
  getPrediction,
};
