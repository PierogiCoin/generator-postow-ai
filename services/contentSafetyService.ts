import { callApi } from './apiClient';
import { STORAGE_KEYS } from '../utils/storageUtils';

/**
 * Content Safety & Protection Service
 * Comprehensive content scanning for:
 * - Shadowban risk detection
 * - Platform compliance checking
 * - Brand safety monitoring
 */

export interface ShadowbanRisk {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: {
    spamIndicators: string[];
    overusedHashtags: string[];
    restrictedKeywords: string[];
    aggressiveCTA: boolean;
    repetitivePatterns: string[];
    automationSignals: string[];
  };
  platformSpecific: {
    instagram: { risk: string; issues: string[] };
    facebook: { risk: string; issues: string[] };
    twitter: { risk: string; issues: string[] };
    tiktok: { risk: string; issues: string[] };
    linkedin: { risk: string; issues: string[] };
  };
  mitigationSteps: string[];
  safeVersion?: string; // suggested safe rewrite
}

export interface ComplianceCheck {
  platform: string;
  overallStatus: 'compliant' | 'warning' | 'violation';
  violations: {
    severity: 'low' | 'medium' | 'high';
    category: string;
    description: string;
    guidelineReference: string;
    suggestedFix: string;
  }[];
  warnings: {
    category: string;
    description: string;
    recommendation: string;
  }[];
  sensitiveContent: {
    type: string;
    detected: boolean;
    confidence: number;
    context: string;
  }[];
  advertisingCompliance: {
    isAd: boolean;
    missingDisclaimers: string[];
    disclosureRequirements: string[];
  };
}

export interface BrandSafetyCheck {
  overallRisk: 'safe' | 'caution' | 'risky' | 'unsafe';
  riskScore: number; // 0-100
  concerns: {
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedPhrases: string[];
    alternativeSuggestions: string[];
  }[];
  sentimentRisks: {
    negativeAssociations: string[];
    potentialMisinterpretations: string[];
    controversyTriggers: string[];
  };
  competitorMentions: {
    mentioned: boolean;
    competitors: string[];
    risk: string;
  };
  culturalSensitivity: {
    potentialIssues: string[];
    recommendedChanges: string[];
  };
  safeAlternatives: {
    original: string;
    safer: string;
    reasoning: string;
  }[];
}

export interface ContentSafetyReport {
  timestamp: string;
  contentHash: string;
  shadowban: ShadowbanRisk;
  compliance: ComplianceCheck;
  brandSafety: BrandSafetyCheck;
  overallRecommendation: 'publish' | 'edit' | 'review' | 'reject';
  priorityActions: string[];
}

/**
 * Comprehensive content safety scan
 */
export async function scanContentSafety(
  postText: string,
  imageDescription: string,
  hashtags: string[],
  platform: string,
  isPromotional: boolean,
  userId: string
): Promise<ContentSafetyReport> {
  const safetyPrompt = `Perform comprehensive content safety scan:

CONTENT TO SCAN:
Text: "${postText}"
${imageDescription ? `Image: ${imageDescription}` : ''}
Hashtags: ${hashtags.join(', ')}
Platform: ${platform}
Is Promotional/Ad: ${isPromotional}

Perform 3-layer analysis:

## 1. SHADOWBAN RISK ANALYSIS
Check for:
- Spam indicators (excessive hashtags, repetitive text)
- Overused/"banned" hashtags
- Restricted keywords (even if innocent, they trigger filters)
- Aggressive CTAs ("link in bio" patterns)
- Repetitive patterns that look bot-like
- Signals that look like automation

Provide:
- Overall risk level (low/medium/high/critical)
- Risk score 0-100
- Specific factors found
- Platform-specific issues
- Mitigation steps
- Safe rewritten version

## 2. COMPLIANCE CHECK
Check against ${platform} guidelines:
- Hate speech, harassment
- Misinformation/Fake news indicators
- Violent or dangerous content
- Adult content signals
- Child safety issues
- Privacy violations
- Platform manipulation (engagement bait)
- Impersonation
- Illegal activities
- Self-harm content
- Eating disorder triggers

Also check advertising compliance:
- Missing disclaimers
- Disclosure requirements
- Misleading claims

Provide:
- Compliance status
- Violations with severity
- Guideline references
- Fixes needed

## 3. BRAND SAFETY ANALYSIS
Check for:
- Negative associations (words that could link to controversies)
- Potential misinterpretations (innocent phrases that could be read wrong)
- Controversy triggers (political, religious, divisive topics)
- Competitor mentions (might be risky)
- Cultural sensitivity issues
- Tone-deaf potential
- Cancel culture risks

Provide:
- Overall brand risk
- Specific concerns with alternatives
- Cultural sensitivity check
- Safe phrasing suggestions

## FINAL RECOMMENDATION
Overall: publish/edit/review/reject
Priority actions (top 3)`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: safetyPrompt,
    systemInstruction: "You are a content safety expert with deep knowledge of social media algorithms, platform guidelines, and brand reputation management. Be thorough but practical - flag real issues but don't be overly cautious.",
  }, userId);

  return parseSafetyReport(response.text || response, postText);
}

/**
 * Quick shadowban risk check
 */
export async function quickShadowbanCheck(
  postText: string,
  hashtags: string[],
  platform: string,
  userId: string
): Promise<ShadowbanRisk> {
  const quickPrompt = `Quick shadowban risk check for ${platform}:

POST: "${postText}"
HASHTAGS: ${hashtags.join(' ')}

Check for immediate red flags:
1. Banned/restricted hashtags
2. Spam patterns
3. Overposting signals
4. Automation indicators
5. Aggressive promotional language

Return risk level and specific issues found.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: quickPrompt,
  }, userId);

  return parseShadowbanRisk(response.text || response);
}

/**
 * Brand safety pre-flight check
 */
export async function brandSafetyCheck(
  content: string,
  brandValues: string[],
  industry: string,
  userId: string
): Promise<BrandSafetyCheck> {
  const brandPrompt = `Brand safety check for ${industry} industry:

CONTENT: "${content}"
BRAND VALUES: ${brandValues.join(', ')}

Analyze:
1. Any phrases that could be misinterpreted?
2. Controversy triggers?
3. Cultural sensitivity issues?
4. Competitor mentions?
5. Tone-deaf potential?
6. Cancel culture risks?

Suggest safer alternatives for risky phrases.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: brandPrompt,
    systemInstruction: "You are a brand reputation expert. Protect brands from unintentional controversies while maintaining authentic voice.",
  }, userId);

  return parseBrandSafety(response.text || response);
}

/**
 * Platform-specific compliance check
 */
export async function checkPlatformCompliance(
  content: string,
  contentType: 'post' | 'ad' | 'story' | 'reel' | 'live',
  platform: string,
  userId: string
): Promise<ComplianceCheck> {
  const compliancePrompt = `Check ${platform} ${contentType} compliance:

CONTENT: "${content}"

Review against ${platform} Community Guidelines:
- Authentic behavior
- Safety
- Privacy
- Dignity/authentic identity
- Intellectual property
- Content monetization policies (if applicable)

Also check ${contentType === 'ad' ? 'advertising policies and disclosure requirements' : 'content-specific policies'}.

List any violations or warnings with specific fixes.`;

  const response = await callApi("generate-content", {
    model: "gemini-2.5-flash",
    contents: compliancePrompt,
  }, userId);

  return parseComplianceCheck(response.text || response, platform);
}

// Parser helper functions
function parseSafetyReport(text: string, originalContent: string): ContentSafetyReport {
  return {
    timestamp: new Date().toISOString(),
    contentHash: btoa(originalContent).slice(0, 20),
    shadowban: parseShadowbanRisk(text),
    compliance: parseComplianceCheck(text, 'general'),
    brandSafety: parseBrandSafety(text),
    overallRecommendation: determineOverallRecommendation(text),
    priorityActions: extractPriorityActions(text),
  };
}

function parseShadowbanRisk(text: string): ShadowbanRisk {
  const lines = text.split('\n');
  
  const findRiskLevel = (): 'low' | 'medium' | 'high' | 'critical' => {
    const riskLine = lines.find(l => l.toLowerCase().includes('risk') && (l.includes('low') || l.includes('medium') || l.includes('high') || l.includes('critical')));
    if (riskLine?.includes('critical')) return 'critical';
    if (riskLine?.includes('high')) return 'high';
    if (riskLine?.includes('medium')) return 'medium';
    return 'low';
  };

  const findScore = (): number => {
    const scoreMatch = text.match(/score[:\s]+(\d+)/i) || text.match(/(\d+)[\/\s]*100/);
    return scoreMatch ? parseInt(scoreMatch[1]) : 25;
  };

  const extractList = (header: string): string[] => {
    const idx = lines.findIndex(l => l.toLowerCase().includes(header.toLowerCase()));
    if (idx === -1) return [];
    const items: string[] = [];
    for (let i = idx + 1; i < lines.length && items.length < 5; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        items.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      } else if (lines[i].includes(':') && !lines[i].includes(header)) {
        break;
      }
    }
    return items.slice(0, 5);
  };

  const risk = findRiskLevel();
  const score = findScore();

  return {
    overallRisk: risk,
    riskScore: score,
    factors: {
      spamIndicators: extractList('spam'),
      overusedHashtags: extractList('hashtag'),
      restrictedKeywords: extractList('restricted') || extractList('banned'),
      aggressiveCTA: text.toLowerCase().includes('cta') && text.toLowerCase().includes('aggressive'),
      repetitivePatterns: extractList('repetitive'),
      automationSignals: extractList('automation') || extractList('bot'),
    },
    platformSpecific: {
      instagram: { risk: score > 50 ? 'high' : 'low', issues: extractList('instagram') },
      facebook: { risk: score > 50 ? 'high' : 'low', issues: extractList('facebook') || extractList('meta') },
      twitter: { risk: score > 50 ? 'high' : 'low', issues: extractList('twitter') || extractList('x') },
      tiktok: { risk: score > 50 ? 'high' : 'low', issues: extractList('tiktok') },
      linkedin: { risk: score > 50 ? 'high' : 'low', issues: extractList('linkedin') },
    },
    mitigationSteps: extractList('mitigation') || extractList('fix') || ['Review hashtags', 'Vary posting times'],
    safeVersion: lines.find(l => l.toLowerCase().includes('safe version') || l.toLowerCase().includes('rewrite'))?.split(':')[1]?.trim(),
  };
}

function parseComplianceCheck(text: string, platform: string): ComplianceCheck {
  const lines = text.split('\n');
  
  const status = text.toLowerCase().includes('violation') ? 'violation' : 
                 text.toLowerCase().includes('warning') ? 'warning' : 'compliant';

  const extractViolations = () => {
    const violations: ComplianceCheck['violations'] = [];
    const violationSection = lines.findIndex(l => l.toLowerCase().includes('violation'));
    if (violationSection !== -1) {
      for (let i = violationSection + 1; i < lines.length && violations.length < 3; i++) {
        if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
          violations.push({
            severity: lines[i].toLowerCase().includes('high') ? 'high' : 
                     lines[i].toLowerCase().includes('medium') ? 'medium' : 'low',
            category: 'General',
            description: lines[i].replace(/^\d+\.\s*|-\s*/, '').trim(),
            guidelineReference: 'Platform Guidelines',
            suggestedFix: 'Review and revise content',
          });
        }
      }
    }
    return violations;
  };

  return {
    platform,
    overallStatus: status,
    violations: extractViolations(),
    warnings: [],
    sensitiveContent: [],
    advertisingCompliance: {
      isAd: text.toLowerCase().includes('ad') || text.toLowerCase().includes('promotional'),
      missingDisclaimers: [],
      disclosureRequirements: [],
    },
  };
}

function parseBrandSafety(text: string): BrandSafetyCheck {
  const lines = text.split('\n');
  
  const riskLevel = text.toLowerCase().includes('unsafe') ? 'unsafe' :
                    text.toLowerCase().includes('risky') ? 'risky' :
                    text.toLowerCase().includes('caution') ? 'caution' : 'safe';

  const extractConcerns = () => {
    const concerns: BrandSafetyCheck['concerns'] = [];
    const concernSection = lines.findIndex(l => l.toLowerCase().includes('concern'));
    if (concernSection !== -1) {
      for (let i = concernSection + 1; i < lines.length && concerns.length < 3; i++) {
        if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
          concerns.push({
            category: 'General',
            severity: 'medium',
            description: lines[i].replace(/^\d+\.\s*|-\s*/, '').trim(),
            affectedPhrases: [],
            alternativeSuggestions: [],
          });
        }
      }
    }
    return concerns;
  };

  return {
    overallRisk: riskLevel,
    riskScore: riskLevel === 'unsafe' ? 80 : riskLevel === 'risky' ? 60 : riskLevel === 'caution' ? 40 : 15,
    concerns: extractConcerns(),
    sentimentRisks: {
      negativeAssociations: [],
      potentialMisinterpretations: [],
      controversyTriggers: [],
    },
    competitorMentions: {
      mentioned: text.toLowerCase().includes('competitor'),
      competitors: [],
      risk: 'low',
    },
    culturalSensitivity: {
      potentialIssues: [],
      recommendedChanges: [],
    },
    safeAlternatives: [],
  };
}

function determineOverallRecommendation(text: string): 'publish' | 'edit' | 'review' | 'reject' {
  if (text.toLowerCase().includes('reject') || text.toLowerCase().includes('critical') || text.toLowerCase().includes('unsafe')) return 'reject';
  if (text.toLowerCase().includes('edit') || text.toLowerCase().includes('high risk')) return 'edit';
  if (text.toLowerCase().includes('review') || text.toLowerCase().includes('caution')) return 'review';
  return 'publish';
}

function extractPriorityActions(text: string): string[] {
  const lines = text.split('\n');
  const actions: string[] = [];
  
  const prioritySection = lines.findIndex(l => l.toLowerCase().includes('priority') || l.toLowerCase().includes('action'));
  if (prioritySection !== -1) {
    for (let i = prioritySection + 1; i < lines.length && actions.length < 3; i++) {
      if (lines[i].match(/^\d+\./) || lines[i].match(/^-/)) {
        actions.push(lines[i].replace(/^\d+\.\s*|-\s*/, '').trim());
      }
    }
  }
  
  return actions.length > 0 ? actions : ['Review content carefully', 'Check platform guidelines'];
}

// Storage helpers
const SAFETY_CACHE_KEY = STORAGE_KEYS.SAFETY_CACHE;

export function cacheSafetyReport(contentHash: string, report: ContentSafetyReport): void {
  if (typeof window === 'undefined') return;
  const cache = JSON.parse(localStorage.getItem(SAFETY_CACHE_KEY) || '{}');
  cache[contentHash] = { report, timestamp: Date.now() };
  localStorage.setItem(SAFETY_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedSafetyReport(contentHash: string): ContentSafetyReport | null {
  if (typeof window === 'undefined') return null;
  const cache = JSON.parse(localStorage.getItem(SAFETY_CACHE_KEY) || '{}');
  const entry = cache[contentHash];
  if (!entry) return null;
  // Cache expires after 1 hour
  if (Date.now() - entry.timestamp > 60 * 60 * 1000) return null;
  return entry.report;
}

export default {
  scanContentSafety,
  quickShadowbanCheck,
  brandSafetyCheck,
  checkPlatformCompliance,
  cacheSafetyReport,
  getCachedSafetyReport,
};
