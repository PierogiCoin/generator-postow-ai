import { callApi } from './apiClient';
import { Platform, Tone, ContentType } from '../types';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  fileData?: { mimeType: string; fileUri: string };
  executableCode?: { code: string };
  codeExecutionResult?: { output: string };
  functionCall?: { name: string; args: Record<string, unknown> };
}

interface GeminiGroundingChunk {
  web?: { title?: string; uri?: string };
}

interface GeminiResponse {
  text?: string;
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: GeminiGroundingChunk[];
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * Google Gemini 2.0 (Omni) Advanced Integration
 * Full multimodal capabilities: text, image, video, audio
 */

export type GeminiModel = 
  | 'gemini-2.5-flash' 
  | 'gemini-2.5-pro'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash';

export interface GeminiOmniConfig {
  model: GeminiModel;
  temperature: number;
  topK?: number;
  topP?: number;
  maxOutputTokens: number;
  enableGrounding?: boolean; // Google Search
  enableCodeExecution?: boolean;
  responseFormat?: 'text' | 'json';
}

export interface MultimodalInput {
  text?: string;
  images?: string[]; // base64 or URLs
  videoUrl?: string;
  audioUrl?: string;
  fileUri?: string; // Google Cloud Storage URI
}

export interface OmniGenerationRequest {
  prompt: string;
  mode: 'text' | 'image' | 'video' | 'audio' | 'multimodal_chat';
  platform?: Platform;
  tone?: Tone;
  contentType?: ContentType;
  referenceImage?: string;
  referenceVideo?: string;
  audioDescription?: string;
  config?: Partial<GeminiOmniConfig>;
}

export interface OmniGenerationResult {
  text: string;
  images?: {
    base64: string;
    mimeType: string;
    prompt: string;
  }[];
  videos?: {
    url: string;
    duration: number;
    resolution: string;
  }[];
  audio?: {
    url: string;
    duration: number;
    format: string;
  };
  groundingInfo?: {
    searchesUsed: number;
    sources: {
      title: string;
      url: string;
      snippet: string;
    }[];
  };
  codeExecution?: {
    code: string;
    output: string;
    logs: string[];
  };
  functionCalls?: {
    name: string;
    arguments: Record<string, any>;
  }[];
  modelUsed: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  finishReason: string;
}

// --- Core Capabilities ---

/**
 * Generate with any modality using Gemini 2.0
 */
export async function generateWithOmni(
  request: OmniGenerationRequest,
  userId: string
): Promise<OmniGenerationResult> {
  const config: GeminiOmniConfig = {
    model: request.config?.model || 'gemini-2.5-flash',
    temperature: request.config?.temperature ?? 0.7,
    maxOutputTokens: request.config?.maxOutputTokens || 8192,
    enableGrounding: request.config?.enableGrounding || false,
    enableCodeExecution: request.config?.enableCodeExecution || false,
    responseFormat: request.config?.responseFormat || 'text',
    ...request.config,
  };

  const systemInstruction = buildSystemInstruction(request.mode, request.platform, request.tone);

  const contents = buildMultimodalContents(request);

  const response = await callApi("generate-content", {
    model: config.model,
    contents,
    systemInstruction,
    config: {
      temperature: config.temperature,
      topK: config.topK,
      topP: config.topP,
      maxOutputTokens: config.maxOutputTokens,
      responseMimeType: config.responseFormat === 'json' ? 'application/json' : 'text/plain',
      ...(config.enableGrounding && { tools: [{ googleSearch: {} }] }),
      ...(config.enableCodeExecution && { tools: [{ codeExecution: {} }] }),
    },
  }, userId);

  return parseOmniResponse(response, config.model);
}

/**
 * Native image generation using Gemini + Imagen
 */
export async function generateImageOmni(
  prompt: string,
  style: 'photorealistic' | 'anime' | 'digital_art' | 'oil_painting' | 'watercolor' | '3d' | 'sketch',
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3',
  count: number = 1,
  userId: string
): Promise<OmniGenerationResult> {
  const enhancedPrompt = `Generate ${count} image(s) in ${style} style, ${aspectRatio} aspect ratio:
${prompt}

Requirements:
- High quality, professional output
- ${style === 'photorealistic' ? 'Photorealistic, detailed, cinematic lighting' : 
    style === 'anime' ? 'Anime/manga style, vibrant colors, clean lines' : 
    style === 'digital_art' ? 'Digital art style, vibrant colors, modern aesthetic' :
    style === 'oil_painting' ? 'Oil painting style, rich textures, classical composition' :
    style === 'watercolor' ? 'Watercolor style, soft, ethereal, painterly' :
    style === '3d' ? '3D rendered style, photorealistic materials, studio lighting' :
    'Sketch style, hand-drawn, pencil/ink feel'}
- Aspect ratio: ${aspectRatio}
- No text/watermarks unless requested`;

  return generateWithOmni({
    prompt: enhancedPrompt,
    mode: 'image',
    config: {
      model: 'gemini-2.5-flash',
      temperature: 0.9,
      maxOutputTokens: 4096,
    },
  }, userId);
}

/**
 * Native video generation using Gemini + Veo
 */
export async function generateVideoOmni(
  prompt: string,
  duration: 4 | 8 | 10,
  aspectRatio: '16:9' | '9:16',
  motionStrength: 'low' | 'medium' | 'high',
  userId: string
): Promise<OmniGenerationResult> {
  const enhancedPrompt = `Generate a ${duration}-second video, ${aspectRatio}:
${prompt}

Video specifications:
- Duration: ${duration} seconds
- Aspect ratio: ${aspectRatio}
- Motion: ${motionStrength} (camera movement and subject motion)
- High quality, smooth motion
- Cinematic composition
- Professional color grading`;

  return generateWithOmni({
    prompt: enhancedPrompt,
    mode: 'video',
    config: {
      model: 'gemini-2.5-flash',
      temperature: 0.8,
      maxOutputTokens: 4096,
    },
  }, userId);
}

/**
 * Analyze video content natively
 */
export async function analyzeVideoOmni(
  videoUrl: string,
  analysisType: 'summary' | 'scenes' | 'transcription' | 'insights' | 'all',
  userId: string
): Promise<OmniGenerationResult> {
  const prompts: Record<string, string> = {
    summary: 'Provide a detailed summary of this video. Describe the main content, key moments, and overall message.',
    scenes: 'Break down this video scene by scene. For each scene, describe: timestamp, visual elements, actions, objects, people, and mood.',
    transcription: 'Transcribe all spoken content in this video. Include timestamps for each segment. Identify speakers if possible.',
    insights: 'Analyze this video for: key insights, emotional tone, target audience, content strategy suggestions, and optimization tips.',
    all: 'Provide a comprehensive analysis: summary, scene breakdown, transcription, insights, and strategic recommendations.',
  };

  return generateWithOmni({
    prompt: prompts[analysisType],
    mode: 'multimodal_chat',
    referenceVideo: videoUrl,
    config: {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  }, userId);
}

/**
 * Analyze image with deep understanding
 */
export async function analyzeImageOmni(
  imageBase64: string,
  analysisType: 'describe' | 'extract_text' | 'analyze_style' | 'compare' | 'creative_brief',
  userId: string,
  compareImage?: string
): Promise<OmniGenerationResult> {
  const prompts: Record<string, string> = {
    describe: 'Describe this image in extreme detail. Include: subject, composition, colors, lighting, mood, style, technical quality, and artistic elements.',
    extract_text: 'Extract all text visible in this image. Provide exact text and its location/context.',
    analyze_style: 'Analyze the visual style of this image. Identify: art style, color palette, composition technique, lighting style, and similar artists/works.',
    compare: 'Compare these two images. Identify similarities, differences, and which is better for social media.',
    creative_brief: 'Analyze this image and create a creative brief for recreating or improving it. Include: concept, target audience, color scheme, composition notes, and AI generation prompt.',
  };

  return generateWithOmni({
    prompt: prompts[analysisType],
    mode: 'multimodal_chat',
    referenceImage: imageBase64,
    config: {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  }, userId);
}

/**
 * Grounded generation with Google Search
 */
export async function generateWithGrounding(
  prompt: string,
  platform: Platform,
  tone: Tone,
  contentType: ContentType,
  userId: string
): Promise<OmniGenerationResult> {
  return generateWithOmni({
    prompt: `${prompt}

Use Google Search to find current information, trends, and data. Cite sources. Ensure information is up-to-date and accurate.`,
    mode: 'text',
    platform,
    tone,
    contentType,
    config: {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 8192,
      enableGrounding: true,
    },
  }, userId);
}

/**
 * Code generation and execution
 */
export async function generateAndExecuteCode(
  description: string,
  language: 'python' | 'javascript' | 'typescript' | 'sql',
  userId: string
): Promise<OmniGenerationResult> {
  return generateWithOmni({
    prompt: `Write and execute ${language} code for:
${description}

Provide the complete code and the execution results.`,
    mode: 'text',
    config: {
      model: 'gemini-2.5-flash',
      temperature: 0.2,
      maxOutputTokens: 8192,
      enableCodeExecution: true,
    },
  }, userId);
}

/**
 * Long-context document analysis (up to 2M tokens)
 */
export async function analyzeDocument(
  documentContent: string,
  analysisType: 'summarize' | 'extract_insights' | 'q_and_a' | 'compare',
  questions?: string[],
  userId?: string
): Promise<OmniGenerationResult> {
  const prompts: Record<string, string> = {
    summarize: 'Summarize this document concisely. Include key points, conclusions, and action items.',
    extract_insights: 'Extract all key insights, data points, trends, and strategic recommendations from this document.',
    q_and_a: `Answer the following questions based on this document:
${questions?.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
    compare: 'Compare and contrast the key points in this document. Identify agreements, contradictions, and gaps.',
  };

  if (!userId) throw new Error('User ID required');

  return generateWithOmni({
    prompt: `${prompts[analysisType]}\n\nDocument:\n${documentContent.slice(0, 500000)}`, // Up to 2M tokens supported
    mode: 'text',
    config: {
      model: 'gemini-2.5-pro',
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  }, userId);
}

/**
 * Multimodal chat (text + image + video + audio)
 */
export async function multimodalChat(
  messages: { role: 'user' | 'model'; content: MultimodalInput }[],
  userId: string
): Promise<OmniGenerationResult> {
  const formattedMessages = messages.map(msg => {
    const parts: GeminiPart[] = [];
    if (msg.content.text) parts.push({ text: msg.content.text });
    if (msg.content.images) {
      msg.content.images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: img.split(',')[1] || img,
          },
        });
      });
    }
    return {
      role: msg.role,
      parts,
    };
  });

  const response = await callApi("generate-content", {
    model: 'gemini-2.5-flash',
    contents: formattedMessages,
    config: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  }, userId);

  return parseOmniResponse(response, 'gemini-2.5-flash');
}

/**
 * Batch process multiple items
 */
export async function batchProcessOmni(
  items: { id: string; prompt: string; mode: OmniGenerationRequest['mode'] }[],
  config: Partial<GeminiOmniConfig>,
  userId: string
): Promise<{ id: string; result: OmniGenerationResult | null; status: 'success' | 'error'; error?: string }[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const result = await generateWithOmni(
          { prompt: item.prompt, mode: item.mode, config },
          userId
        );
        return { id: item.id, result, status: 'success' as const };
      } catch (error: unknown) {
        return { id: item.id, result: null, status: 'error' as const, error: error instanceof Error ? error.message : String(error) };
      }
    })
  );
  return results;
}

// --- Helper Functions ---

function buildSystemInstruction(
  mode: string,
  platform?: Platform,
  tone?: Tone
): string {
  const base = `You are Gemini 2.0, Google's most advanced AI. You can understand and generate text, images, video, and audio natively.`;
  
  const modeInstructions: Record<string, string> = {
    text: `Generate high-quality, engaging content. Be creative and professional.`,
    image: `Generate high-quality, visually stunning images. Pay attention to composition, lighting, and detail.`,
    video: `Generate cinematic, smooth, high-quality video content. Consider motion, pacing, and visual storytelling.`,
    audio: `Generate clear, natural audio content with appropriate tone and pacing.`,
    multimodal_chat: `Analyze and understand all provided media. Respond with detailed, accurate insights.`,
  };

  let instruction = `${base}\n${modeInstructions[mode] || modeInstructions.text}`;

  if (platform) {
    instruction += `\nTarget platform: ${platform}. Optimize content for this platform's format and audience.`;
  }
  if (tone) {
    instruction += `\nTone: ${tone}.`;
  }

  return instruction;
}

function buildMultimodalContents(request: OmniGenerationRequest): { role: string; parts: GeminiPart[] }[] {
  const parts: GeminiPart[] = [{ text: request.prompt }];

  if (request.referenceImage) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: request.referenceImage.split(',')[1] || request.referenceImage,
      },
    });
  }

  if (request.referenceVideo) {
    parts.push({
      fileData: {
        mimeType: 'video/mp4',
        fileUri: request.referenceVideo,
      },
    });
  }

  if (request.audioDescription) {
    parts.push({
      fileData: {
        mimeType: 'audio/mp3',
        fileUri: request.audioDescription,
      },
    });
  }

  return [{ role: 'user', parts }];
}

function parseOmniResponse(response: GeminiResponse, model: string): OmniGenerationResult {
  const text = response.text || 
    response.candidates?.[0]?.content?.parts?.[0]?.text || 
    JSON.stringify(response);

  // Extract grounding info
  const groundingInfo = response.candidates?.[0]?.groundingMetadata ? {
    searchesUsed: response.candidates[0].groundingMetadata.webSearchQueries?.length || 0,
    sources: (response.candidates[0].groundingMetadata.groundingChunks || []).map((chunk: GeminiGroundingChunk) => ({
      title: chunk.web?.title || 'Unknown',
      url: chunk.web?.uri || '',
      snippet: chunk.web?.title || '',
    })),
  } : undefined;

  // Extract code execution
  const codeExecution = response.candidates?.[0]?.content?.parts?.find(
    (p: GeminiPart) => p.executableCode || p.codeExecutionResult
  ) ? {
    code: response.candidates[0].content!.parts!.find((p: GeminiPart) => p.executableCode)?.executableCode?.code || '',
    output: response.candidates[0].content!.parts!.find((p: GeminiPart) => p.codeExecutionResult)?.codeExecutionResult?.output || '',
    logs: [] as string[],
  } : undefined;

  // Extract function calls
  const functionCalls = response.candidates?.[0]?.content?.parts
    ?.filter((p: GeminiPart) => p.functionCall)
    .map((p: GeminiPart) => ({
      name: p.functionCall!.name,
      arguments: p.functionCall!.args,
    }));

  // Token usage
  const tokensUsed = {
    input: response.usageMetadata?.promptTokenCount || 0,
    output: response.usageMetadata?.candidatesTokenCount || 0,
    total: response.usageMetadata?.totalTokenCount || 0,
  };

  return {
    text,
    groundingInfo,
    codeExecution,
    functionCalls,
    modelUsed: model,
    tokensUsed,
    finishReason: response.candidates?.[0]?.finishReason || 'UNKNOWN',
  };
}

// --- Capabilities Info ---

export function getOmniCapabilities() {
  return [
    {
      id: 'text_generation',
      name: 'Text Generation',
      description: 'Generate any text content with reasoning',
      models: ['gemini-2.5-flash'],
      maxTokens: 8192,
    },
    {
      id: 'image_generation',
      name: 'Image Generation (Imagen 3)',
      description: 'Generate photorealistic and artistic images',
      models: ['gemini-2.5-flash'],
      supportedStyles: ['photorealistic', 'anime', 'digital_art', 'oil_painting', 'watercolor', '3d', 'sketch'],
    },
    {
      id: 'video_generation',
      name: 'Video Generation (Veo 2)',
      description: 'Generate cinematic videos',
      models: ['gemini-2.5-flash'],
      maxDuration: 10,
      supportedRatios: ['16:9', '9:16'],
    },
    {
      id: 'image_analysis',
      name: 'Image Understanding',
      description: 'Deep analysis of any image',
      models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
      features: ['OCR', 'style analysis', 'object detection', 'scene understanding'],
    },
    {
      id: 'video_analysis',
      name: 'Video Understanding',
      description: 'Native video analysis without frames extraction',
      models: ['gemini-2.5-flash'],
      features: ['Scene detection', 'Transcription', 'Content analysis', 'Highlights extraction'],
    },
    {
      id: 'audio_analysis',
      name: 'Audio Understanding',
      description: 'Transcribe and analyze audio content',
      models: ['gemini-2.5-flash'],
      features: ['Speech-to-text', 'Sentiment analysis', 'Speaker identification'],
    },
    {
      id: 'grounding',
      name: 'Google Search Grounding',
      description: 'Real-time information with citations',
      models: ['gemini-2.5-flash'],
      features: ['Real-time data', 'Source citations', 'Fact checking'],
    },
    {
      id: 'code_execution',
      name: 'Code Execution',
      description: 'Generate, execute, and debug code',
      models: ['gemini-2.5-flash'],
      languages: ['python', 'javascript', 'typescript', 'sql', 'go', 'java'],
    },
    {
      id: 'long_context',
      name: 'Long Context (2M tokens)',
      description: 'Process entire books, codebases, or video libraries',
      models: ['gemini-2.5-pro', 'gemini-1.5-pro'],
      contextWindow: 2000000,
    },
    {
      id: 'multimodal_chat',
      name: 'Multimodal Chat',
      description: 'Chat with text, images, video, and audio together',
      models: ['gemini-2.5-flash'],
      features: ['Mixed media input', 'Cross-modal reasoning'],
    },
  ];
}

export function getModelInfo(model: GeminiModel) {
  const info: Record<GeminiModel, { name: string; description: string; strengths: string[] }> = {
    'gemini-2.5-flash': {
      name: 'Gemini 2.0 Flash',
      description: 'Fast, multimodal model',
      strengths: ['Speed', 'Multimodal', 'Image gen', 'Video gen'],
    },
    'gemini-2.5-pro': {
      name: 'Gemini 2.5 Pro',
      description: 'Most capable model, largest context',
      strengths: ['Long context', 'Complex tasks', 'Code', 'Analysis', 'Reasoning'],
    },
    'gemini-1.5-pro': {
      name: 'Gemini 1.5 Pro',
      description: 'Mature model with 1M context',
      strengths: ['Stability', 'Document analysis', 'Production ready'],
    },
    'gemini-1.5-flash': {
      name: 'Gemini 1.5 Flash',
      description: 'Fast and cost-effective',
      strengths: ['Speed', 'Cost efficiency', 'High volume'],
    },
  };
  return info[model];
}

export default {
  generateWithOmni,
  generateImageOmni,
  generateVideoOmni,
  analyzeVideoOmni,
  analyzeImageOmni,
  generateWithGrounding,
  generateAndExecuteCode,
  analyzeDocument,
  multimodalChat,
  batchProcessOmni,
  getOmniCapabilities,
  getModelInfo,
};
