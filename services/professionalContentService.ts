/**
 * Professional Content Service
 * Advanced content generation with professional quality standards
 */

import { generateContent } from './geminiService';
import type { Platform, Tone } from '../types';

// ============================================
// PROFESSIONAL POST TEMPLATES
// ============================================

const PROFESSIONAL_HOOKS = {
  LinkedIn: [
    "Here's what nobody tells you about {topic}:",
    "I made a mistake that cost me {consequence}. Here's what I learned:",
    "99% of people get {topic} wrong. Here's why:",
    'After {timeframe}, I finally figured out {insight}:',
    "The truth about {topic}? It's not what you think.",
    '{number} lessons from {experience}:',
    'Stop doing {common_mistake}. Do this instead:',
  ],
  Twitter: [
    'Hot take:',
    'Unpopular opinion:',
    'Thread: {topic} 🧵',
    'Real talk about {topic}:',
    "Everyone is doing {topic} wrong. Here's why:",
  ],
  Instagram: [
    'POV: {situation}',
    "Let's talk about {topic}",
    '{emotion} story time:',
    'The truth about {topic} that nobody shares:',
    'Save this for later 📌',
  ]
};

// ============================================
// PROFESSIONAL CONTENT STRUCTURE
// ============================================

interface ContentBlueprint {
  hook: string;
  body: string[];
  cta: string;
  structure: 'story' | 'listicle' | 'howto' | 'insight' | 'question';
}

export const generateProfessionalPost = async (
  topic: string,
  platform: Platform,
  tone: Tone,
  audience: string,
  userId: string
): Promise<{ text: string; structure: string }> => {

  const prompt = `You are an ELITE social media copywriter. Generate a HIGH-CONVERTING ${platform} post.

🎯 TOPIC: ${topic}
👥 AUDIENCE: ${audience}
🎨 TONE: ${tone}

📝 CONTENT FRAMEWORK (Follow strictly):

${platform === 'LinkedIn' ? `
LINKEDIN POST STRUCTURE:
1. HOOK (Line 1): Attention-grabbing statement or question
   - Must create curiosity or promise value
   - Examples: "Here's what nobody tells you about...", "After 5 years, I finally realized..."
   
2. CONTEXT (Lines 2-3): Brief setup
   - Share relevant background
   - Establish credibility or relatability
   
3. CORE VALUE (Lines 4-10): Main insights
   - 3-5 specific, actionable points
   - Use bullets or numbered lists
   - Each point should be concrete, not vague
   
4. PROOF/STORY (Lines 11-15): Evidence or example
   - Data, personal experience, or case study
   - Make it memorable and specific
   
5. CTA (Last line): Engaging question or call-to-action
   - Encourage comments and discussion
   - Not salesy, conversational

FORMATTING:
- Short paragraphs (2-3 lines max)
- Line breaks for readability
- 2-3 emojis total (strategic placement)
- NO hashtags in body (add separately)
` : platform === 'X' ? `
TWITTER POST STRUCTURE:
1. HOOK (First 10 words): Grab attention immediately
2. VALUE: Deliver insight quickly
3. PROOF: Back it up (if space)
4. CTA: End with question or thought

RULES:
- 250-280 characters optimal
- Front-load value
- No wasted words
- Make it quotable
- 1-2 emojis max
` : platform === 'Instagram' ? `
INSTAGRAM CAPTION STRUCTURE:
1. HOOK (First line): Only 125 chars show before "more"
   - Must be compelling enough to make them tap "more"
   
2. STORY/VALUE (Middle): Engage with story or tips
   - Use line breaks (space out text)
   - 3-5 short paragraphs
   - Visual descriptions
   
3. CTA (End): Clear action
   - Save, share, comment
   - Or thoughtful question

FORMATTING:
- Emojis at start of paragraphs
- Space between sections
- 2-4 emojis total
- Conversational tone
` : ''}

✨ QUALITY CHECKLIST:
✓ Hook creates curiosity
✓ Specific, not generic
✓ Actionable insights
✓ Conversational, human tone
✓ Platform-optimized length
✓ Strong ending

🚫 AVOID:
✗ "I'm excited to announce..."
✗ "In today's digital age..."
✗ Generic buzzwords
✗ All caps (except emphasis)
✗ Too many emojis

Generate the post NOW. Make it scroll-stopping!`;

  const response = await generateContent({
    model: 'gemini-pro-latest',
    contents: prompt
  }, userId);

  return {
    text: response.text,
    structure: 'professional'
  };
};

// ============================================
// PROFESSIONAL HASHTAG RESEARCH
// ============================================

export const generateStrategicHashtags = async (
  content: string,
  platform: Platform,
  niche: string,
  userId: string
): Promise<{
  hashtags: string[];
  strategy: string;
  tiers: {
    highTraffic: string[];
    medium: string[];
    niche: string[];
  }
}> => {
  const prompt = `You are a HASHTAG STRATEGIST. Analyze this content and suggest STRATEGIC hashtags.

CONTENT: ${content.substring(0, 300)}
PLATFORM: ${platform}
NICHE: ${niche}

🎯 HASHTAG STRATEGY:

${platform === 'Instagram' ? `
INSTAGRAM: 10-15 hashtags in 3 tiers
- HIGH-TRAFFIC (3): 500K-2M posts (discoverability)
- MEDIUM (5): 50K-500K posts (sweet spot)
- NICHE (4): 5K-50K posts (engaged audience)
- BRANDED (1): Your unique branded tag
` : platform === 'LinkedIn' ? `
LINKEDIN: 3-5 hashtags
- Focus on professional, industry-specific
- Mix broad (#Marketing) and specific (#B2BSaaS)
- Avoid overly trendy
` : platform === 'X' ? `
TWITTER: 1-2 hashtags MAX
- Only if trending or highly relevant
- Don't waste character count
` : ''}

📊 RESEARCH CRITERIA:
- Relevance to content (9/10 minimum)
- Current popularity (not dead)
- Competition level (avoid oversaturated)
- Audience alignment
- Trending potential

Return JSON:
{
  "hashtags": ["#HashtagList"],
  "strategy": "Brief explanation of approach",
  "tiers": {
    "highTraffic": ["#Popular"],
    "medium": ["#Sweet", "#Spot"],
    "niche": ["#Specific"]
  }
}`;

  const response = await generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  }, userId);

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error('Error parsing strategic hashtags:', response.text);
    throw new Error('Failed to generate strategic hashtags');
  }
};

// ============================================
// PROFESSIONAL IMAGE CONCEPTS
// ============================================

export const generateImageConcept = async (
  postContent: string,
  platform: Platform,
  visualStyle: string,
  tone: Tone,
  userId: string
): Promise<{
  concept: string;
  detailedPrompt: string;
  colorPalette: string[];
  composition: string;
}> => {
  const prompt = `You are a CREATIVE DIRECTOR. Design a PROFESSIONAL image concept for this post.

POST CONTENT: ${postContent.substring(0, 400)}
PLATFORM: ${platform}
STYLE: ${visualStyle}
TONE: ${tone}

🎨 CREATIVE BRIEF:

1. CONCEPT: One sentence description of the image idea
   - Visual metaphor that represents the message
   - Unique, not cliché
   - Platform-appropriate

2. DETAILED PROMPT: Professional photography/design description
   - Specific subject, lighting, composition
   - Art direction details
   - Mood and atmosphere
   - Technical specs (if relevant)

3. COLOR PALETTE: 3-5 colors
   - Hex codes
   - Psychology behind choices
   - How they support tone

4. COMPOSITION: Layout and framing
   - Rule of thirds, symmetry, etc.
   - Focal point
   - Text space (if needed)

QUALITY STANDARDS:
- Stop-scroll worthy
- Professional photography quality
- Brand-safe
- Technically excellent
- Emotionally resonant

Return JSON:
{
  "concept": "One-line concept",
  "detailedPrompt": "Full image generation prompt",
  "colorPalette": ["#HEX1", "#HEX2", "#HEX3"],
  "composition": "Composition description"
}`;

  const response = await generateContent({
    model: 'gemini-pro-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  }, userId);

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error('Error parsing image concept:', response.text);
    throw new Error('Failed to generate image concept');
  }
};

// ============================================
// VIDEO SCRIPT GENERATOR
// ============================================

export const generateVideoScript = async (
  topic: string,
  duration: number,
  platform: Platform,
  tone: Tone,
  userId: string
): Promise<{
  hook: string;
  scenes: Array<{
    timestamp: string;
    visualDescription: string;
    narration: string;
    textOverlay?: string;
  }>;
  music: string;
  style: string;
}> => {
  const prompt = `You are a PROFESSIONAL VIDEO PRODUCER. Create a VIRAL video script.

TOPIC: ${topic}
DURATION: ${duration} seconds
PLATFORM: ${platform}
TONE: ${tone}

🎬 VIDEO SCRIPT FRAMEWORK:

STRUCTURE (Timing is critical):
- 0-3s: HOOK (Must grab attention IMMEDIATELY)
- 3-${duration - 5}s: VALUE (Core content, visual storytelling)
- ${duration - 5}-${duration}s: CTA (Clear call-to-action)

SCENES:
Break down into ${Math.ceil(duration / 5)} scenes
Each scene needs:
- Timestamp (e.g., "0:00-0:03")
- Visual description (What we see)
- Narration (What we hear/read)
- Text overlay (if any)

${platform === 'TikTok' || platform === 'Instagram' ? `
VIRAL REQUIREMENTS:
- Pattern interrupt in first second
- Fast cuts (2-3s max per scene)
- Text overlays for sound-off viewing
- Trend-aware aesthetics
` : ''}

ENGAGEMENT:
- First 3 seconds determine success
- Visual variety (not static)
- Clear narrative flow
- Memorable ending

Return JSON:
{
  "hook": "Opening hook concept",
  "scenes": [{
    "timestamp": "0:00-0:03",
    "visualDescription": "What we see",
    "narration": "What is said/shown",
    "textOverlay": "Optional text"
  }],
  "music": "Music/audio style recommendation",
  "style": "Overall video style"
}`;

  const response = await generateContent({
    model: 'gemini-pro-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  }, userId);

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error('Error parsing video script:', response.text);
    throw new Error('Failed to generate video script');
  }
};

// ============================================
// CONTENT IMPROVEMENT ANALYZER
// ============================================

export const analyzeAndImproveContent = async (
  currentContent: string,
  platform: Platform,
  goals: string[],
  userId: string
): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  rewrittenVersion: string;
}> => {
  const prompt = `You are a SENIOR CONTENT STRATEGIST. Analyze and improve this content.

CURRENT CONTENT:
"${currentContent}"

PLATFORM: ${platform}
GOALS: ${goals.join(', ')}

📊 ANALYSIS FRAMEWORK:

1. SCORE (0-100): Overall quality rating

2. STRENGTHS: What's working well (3 points)
   - Be specific
   - Reference exact elements

3. IMPROVEMENTS: What needs work (3-5 points)
   - Specific, actionable feedback
   - Prioritized by impact

4. REWRITTEN VERSION: Your improved version
   - Apply all improvements
   - Maintain voice
   - Optimize for platform

SCORING CRITERIA:
- Hook effectiveness (20 points)
- Value delivery (25 points)
- Readability (15 points)
- Platform optimization (20 points)
- Engagement potential (20 points)

Return JSON:
{
  "score": 85,
  "strengths": ["Specific strength 1", "..."],
  "improvements": ["Actionable feedback 1", "..."],
  "rewrittenVersion": "Improved version of content"
}`;

  const response = await generateContent({
    model: 'gemini-pro-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  }, userId);

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error('Error parsing content analysis:', response.text);
    throw new Error('Failed to analyze content');
  }
};

export default {
  generateProfessionalPost,
  generateStrategicHashtags,
  generateImageConcept,
  generateVideoScript,
  analyzeAndImproveContent
};
