// 🎨 CONTENT TEMPLATES & PRESETS
// Szablony dla szybkiego tworzenia contentu

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  tone: string;
  style: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:5';
  includeMusic: boolean;
  includeHashtags: boolean;
  hashtagCount: number;
  videoLength?: 'short' | 'medium' | 'long'; // 5s, 15s, 30s
  icon: string;
  category: 'social' | 'professional' | 'marketing' | 'educational' | 'industry';
  /** Prefill topic / niche hint for PL industry packs */
  topicHint?: string;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  // 🎵 VIRAL SOCIAL MEDIA
  {
    id: 'viral-tiktok',
    name: 'Viral TikTok Pack',
    description: 'Krótkie, dynamiczne video z muzyką i trendy hashtagami',
    platform: 'TikTok',
    tone: 'Casual',
    style: 'Bold',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 8,
    videoLength: 'short',
    icon: '🎵',
    category: 'social'
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    description: 'Estetyczne, wysokiej jakości reels z subtelną muzyką',
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Aesthetic',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 10,
    videoLength: 'short',
    icon: '📸',
    category: 'social'
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    description: 'Krótkie, angażujące filmy pionowe',
    platform: 'YouTube',
    tone: 'Enthusiastic',
    style: 'Dynamic',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'short',
    icon: '📹',
    category: 'social'
  },

  // 💼 PROFESSIONAL CONTENT
  {
    id: 'linkedin-professional',
    name: 'LinkedIn Professional',
    description: 'Formalny, biznesowy content bez muzyki',
    platform: 'LinkedIn',
    tone: 'Formal',
    style: 'Professional',
    aspectRatio: '16:9',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 3,
    videoLength: 'medium',
    icon: '💼',
    category: 'professional'
  },
  {
    id: 'linkedin-thought-leader',
    name: 'LinkedIn Thought Leader',
    description: 'Ekspercki content z insights i case studies',
    platform: 'LinkedIn',
    tone: 'Professional',
    style: 'Authoritative',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'long',
    icon: '🎓',
    category: 'professional'
  },

  // 🛍️ MARKETING & PROMOTIONAL
  {
    id: 'facebook-ad',
    name: 'Facebook Ad Campaign',
    description: 'Promocyjny content z CTA i wyraźnym przekazem',
    platform: 'Facebook',
    tone: 'Persuasive',
    style: 'Bold',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: false,
    hashtagCount: 0,
    videoLength: 'short',
    icon: '🎯',
    category: 'marketing'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story Blitz',
    description: 'Szybkie, dynamiczne stories z quick cuts',
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Dynamic',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: false,
    hashtagCount: 0,
    videoLength: 'short',
    icon: '⚡',
    category: 'marketing'
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Prezentacja produktu z detalami i benefitami',
    platform: 'Instagram',
    tone: 'Professional',
    style: 'Clean',
    aspectRatio: '4:5',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 6,
    videoLength: 'medium',
    icon: '🛍️',
    category: 'marketing'
  },

  // 📚 EDUCATIONAL
  {
    id: 'tutorial-quick',
    name: 'Quick Tutorial',
    description: 'Krótki tutorial lub how-to guide',
    platform: 'YouTube',
    tone: 'Friendly',
    style: 'Educational',
    aspectRatio: '16:9',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 4,
    videoLength: 'medium',
    icon: '📚',
    category: 'educational'
  },
  {
    id: 'explainer-video',
    name: 'Explainer Video',
    description: 'Wyjaśnienie koncepcji lub procesu',
    platform: 'YouTube',
    tone: 'Professional',
    style: 'Clear',
    aspectRatio: '16:9',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'long',
    icon: '💡',
    category: 'educational'
  },

  // 🇵🇱 BRANŻE PL — starter packs
  {
    id: 'pl-fryzjer',
    name: 'Fryzjer / beauty',
    description: 'Promocje, metamorfozy, tipy pielęgnacyjne — Instagram + Stories',
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Aesthetic',
    aspectRatio: '4:5',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 12,
    videoLength: 'short',
    icon: '💇',
    category: 'industry',
    topicHint: 'Salon fryzjerski: pokaż metamorfozę / promocję sezonową / tip pielęgnacyjny dla klientek w PL',
  },
  {
    id: 'pl-lokal',
    name: 'Lokal / gastronomia',
    description: 'Menu dnia, atmosfera, wydarzenia — Facebook + Instagram',
    platform: 'Facebook',
    tone: 'Friendly',
    style: 'Warm',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 8,
    videoLength: 'short',
    icon: '🍽️',
    category: 'industry',
    topicHint: 'Lokal gastronomiczny w Polsce: menu dnia, nowość w karcie lub zaproszenie na event',
  },
  {
    id: 'pl-b2b-saas',
    name: 'B2B SaaS',
    description: 'Thought leadership, case study, CTA demo — LinkedIn',
    platform: 'LinkedIn',
    tone: 'Professional',
    style: 'Authoritative',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'medium',
    icon: '🚀',
    category: 'industry',
    topicHint: 'Polski SaaS B2B: insight rynkowy, mini case study lub zaproszenie na demo z konkretną korzyścią',
  },
  {
    id: 'pl-ecom',
    name: 'E-commerce',
    description: 'Produkt, benefit, social proof — Instagram / TikTok',
    platform: 'Instagram',
    tone: 'Persuasive',
    style: 'Bold',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 10,
    videoLength: 'short',
    icon: '🛒',
    category: 'industry',
    topicHint: 'Sklep online PL: wyróżnij produkt, 3 benefity i CTA z linkiem do oferty',
  },
];

// Helper functions
export function getTemplateById(id: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesByPlatform(platform: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(t => t.platform === platform);
}

export function applyTemplate(template: ContentTemplate, userInput: Partial<ContentTemplate>): ContentTemplate {
  return {
    ...template,
    ...userInput
  };
}
