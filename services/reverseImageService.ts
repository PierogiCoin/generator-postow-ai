import { callApi } from './apiClient';

/**
 * Reverse Image Prompting Service
 * Analyzes viral/competitor images to understand why they work
 * and generates similar but unique concepts
 */

export interface ImageAnalysisResult {
  visualStyle: string;
  colorPalette: string[];
  composition: string;
  mood: string;
  typography: string;
  whyItWorks: string;
  viralElements: string[];
  targetEmotion: string;
  platformOptimizedFor: string;
}

export interface ReverseImagePrompt {
  originalAnalysis: ImageAnalysisResult;
  generatedPrompt: string;
  variationPrompts: string[]; // 3 variations
  suggestedCaptions: string[];
  keyElementsToPreserve: string[];
  elementsToChange: string[];
}

/**
 * Analyzes an image to understand its viral potential and visual elements
 */
export async function analyzeViralImage(
  imageBase64: string,
  mimeType: string,
  platform: string,
  userId: string
): Promise<ImageAnalysisResult> {
  const analysisPrompt = `Analyze this image as a viral social media post. Provide detailed breakdown:

1. VISUAL STYLE: Describe the aesthetic (e.g., "minimalist lifestyle", "maximalist product showcase", "authentic candid", "polished professional")
2. COLOR PALETTE: List dominant colors and their emotional impact
3. COMPOSITION: Describe layout, rule of thirds, focal points, negative space usage
4. MOOD/ATMOSPHERE: What feeling does it evoke?
5. TYPOGRAPHY: Font styles, text placement, hierarchy (if text present)
6. WHY IT WORKS: Psychological triggers that make this engaging
7. VIRAL ELEMENTS: Specific elements that drive shares (humor, shock, aspiration, relatability)
8. TARGET EMOTION: Primary emotion targeted (FOMO, joy, curiosity, envy, inspiration)
9. PLATFORM OPTIMIZATION: Which platform is this best suited for and why

Be specific and actionable. Focus on elements that can be replicated or adapted.`;

  const response = await callApi("analyze-image", {
    model: "gemini-2.5-flash",
    image: { imageBytes: imageBase64, mimeType },
    prompt: analysisPrompt,
  }, userId);

  // Parse the analysis into structured format
  return parseImageAnalysis(response.text || response);
}

/**
 * Generates similar but unique image prompts based on analysis
 */
export async function generateReversePrompts(
  analysis: ImageAnalysisResult,
  originalTopic: string,
  userBrandVoice?: string,
  userId?: string
): Promise<ReverseImagePrompt> {
  const promptGeneration = `Based on this viral image analysis, create 4 unique image generation prompts:

ANALYSIS:
- Style: ${analysis.visualStyle}
- Colors: ${analysis.colorPalette.join(', ')}
- Composition: ${analysis.composition}
- Mood: ${analysis.mood}
- Viral elements: ${analysis.viralElements.join(', ')}
- Target emotion: ${analysis.targetEmotion}

ORIGINAL TOPIC: ${originalTopic}
${userBrandVoice ? `BRAND VOICE: ${userBrandVoice}` : ''}

Create:
1. MASTER PROMPT: One detailed prompt that captures the essence but is original
2. VARIATION A: More dramatic/emotional version
3. VARIATION B: More minimal/clean version  
4. VARIATION C: More playful/creative version

Also suggest 3 caption ideas that match the visual style.

Format as:
MASTER: [prompt]
VAR_A: [prompt]
VAR_B: [prompt]
VAR_C: [prompt]
CAPTIONS:
1. [caption]
2. [caption]
3. [caption]
KEY_ELEMENTS: [elements to preserve]
CHANGES: [elements to change to avoid copying]`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: promptGeneration,
    systemInstruction: "You are an expert visual content strategist. Create prompts that capture the SUCCESS PATTERNS of viral images while ensuring the output is completely original and unique.",
  }, userId);

  return parseReversePrompts(response.text || response, analysis);
}

/**
 * Extracts image from URL and converts to base64
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Przekroczono czas pobierania obrazu (15s). Sprawdź URL i spróbuj ponownie.');
    }
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions to parse API responses
function parseImageAnalysis(text: string): ImageAnalysisResult {
  const lines = text.split('\n');

  const getValue = (prefix: string): string => {
    // Matches: "1. Visual Style: value", "**Visual Style**: value", "Visual Style - value", "Visual Style: value: with colons"
    const re = new RegExp(`^\\s*(?:\\d+\\.?)?\\s*\\*?\\b${prefix.replace(/\s+/g, '\\s*')}\\b\\*?\\s*[:\\-]\\s*(.+)$`, 'i');
    const match = lines.find(l => re.test(l));
    return match ? (match.match(re)?.[1] ?? '').trim() : '';
  };

  const getList = (prefix: string): string[] => {
    const re = new RegExp(`^\\s*(?:\\d+\\.?)?\\s*\\*?\\b${prefix.replace(/\s+/g, '\\s*')}\\b\\*?\\s*[:\\-]\\s*(.+)$`, 'i');
    const match = lines.find(l => re.test(l));
    if (!match) return [];
    const value = (match.match(re)?.[1] ?? '');
    return value.split(',').map(s => s.trim()).filter(s => s);
  };

  return {
    visualStyle: getValue('visual style') || getValue('style') || 'Modern minimalist',
    colorPalette: getList('color palette') || getList('color') || ['Blue', 'White', 'Gold'],
    composition: getValue('composition') || 'Centered subject with rule of thirds',
    mood: getValue('mood') || getValue('atmosphere') || 'Professional and aspirational',
    typography: getValue('typography') || 'Clean sans-serif, minimal text',
    whyItWorks: getValue('why it works') || getValue('works') || 'Creates strong visual impact',
    viralElements: getList('viral elements') || getList('viral') || ['Bold colors', 'Clear message', 'Relatable content'],
    targetEmotion: getValue('target emotion') || getValue('emotion') || 'Inspiration',
    platformOptimizedFor: getValue('platform') || getValue('platform optimization') || 'Instagram',
  };
}

function parseReversePrompts(text: string, analysis: ImageAnalysisResult): ReverseImagePrompt {
  const lines = text.split('\n');

  const getPrompt = (prefix: string): string => {
    // Matches: "MASTER: prompt", "**MASTER**: prompt", "1. MASTER: prompt"
    const re = new RegExp(`^\\s*(?:\\d+\\.?)?\\s*\\*?\\b${prefix}\\b\\*?\\s*[:\\-]\\s*(.+)$`, 'i');
    const match = lines.find(l => re.test(l));
    return match ? (match.match(re)?.[1] ?? '').trim() : '';
  };

  const getCaptions = (): string[] => {
    const startIdx = lines.findIndex(l => /CAPTIONS/i.test(l));
    if (startIdx === -1) return [];
    return lines
      .slice(startIdx + 1)
      .filter(l => /^\s*(?:\d+\.|[-*])\s+/.test(l))
      .map(l => l.replace(/^\s*(?:\d+\.|[-*])\s+/, '').trim())
      .filter(Boolean);
  };

  const masterPrompt = getPrompt('MASTER') || text.substring(0, 500);

  return {
    originalAnalysis: analysis,
    generatedPrompt: masterPrompt,
    variationPrompts: [
      getPrompt('VAR_A') || getPrompt('VARIATION A') || masterPrompt,
      getPrompt('VAR_B') || getPrompt('VARIATION B') || masterPrompt,
      getPrompt('VAR_C') || getPrompt('VARIATION C') || masterPrompt,
    ],
    suggestedCaptions: getCaptions().slice(0, 3),
    keyElementsToPreserve: analysis.viralElements,
    elementsToChange: ['Specific subject', 'Exact colors', 'Exact layout'],
  };
}

// Convenience function for complete reverse image workflow
export async function reverseImageWorkflow(
  imageUrl: string,
  platform: string,
  originalTopic: string,
  userId: string,
  userBrandVoice?: string
): Promise<ReverseImagePrompt> {
  // Step 1: Fetch and convert image
  const { base64, mimeType } = await fetchImageAsBase64(imageUrl);
  
  // Step 2: Analyze the image
  const analysis = await analyzeViralImage(base64, mimeType, platform, userId);
  
  // Step 3: Generate reverse prompts
  const prompts = await generateReversePrompts(analysis, originalTopic, userBrandVoice, userId);
  
  return prompts;
}

export default {
  analyzeViralImage,
  generateReversePrompts,
  fetchImageAsBase64,
  reverseImageWorkflow,
};
