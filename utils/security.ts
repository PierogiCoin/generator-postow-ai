import DOMPurify from 'dompurify';

/**
 * Security utilities for input validation and XSS protection
 */

// ============================================
// XSS PROTECTION
// ============================================

/**
 * Sanitize HTML to prevent XSS attacks
 * @param dirty - Potentially unsafe HTML string
 * @returns Safe HTML string
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof dirty !== 'string') return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize text - strip all HTML tags
 * @param dirty - Text with potential HTML
 * @returns Plain text only
 */
export function sanitizeText(dirty: string): string {
  if (typeof dirty !== 'string') return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Escape HTML special characters
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHTML(text: string): string {
  if (typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validation rules and limits
 */
export const VALIDATION_LIMITS = {
  TOPIC_MIN: 3,
  TOPIC_MAX: 200,
  KEYWORDS_MAX: 100,
  HASHTAG_MAX: 30,
  BRAND_NAME_MAX: 50,
  BRAND_DESCRIPTION_MAX: 500,
  POST_TEXT_MAX: 5000,
  COMMENT_MAX: 1000,
} as const;

/**
 * Validate topic/prompt input
 */
export function validateTopic(topic: string): { valid: boolean; error?: string } {
  if (!topic || typeof topic !== 'string') {
    return { valid: false, error: 'Temat jest wymagany' };
  }

  const trimmed = topic.trim();
  
  if (trimmed.length < VALIDATION_LIMITS.TOPIC_MIN) {
    return { valid: false, error: `Temat musi mieć minimum ${VALIDATION_LIMITS.TOPIC_MIN} znaki` };
  }
  
  if (trimmed.length > VALIDATION_LIMITS.TOPIC_MAX) {
    return { valid: false, error: `Temat nie może być dłuższy niż ${VALIDATION_LIMITS.TOPIC_MAX} znaków` };
  }

  // Check for suspicious patterns
  if (containsSuspiciousPatterns(trimmed)) {
    return { valid: false, error: 'Temat zawiera niedozwolone znaki lub wzorce' };
  }

  return { valid: true };
}

/**
 * Validate keywords input
 */
export function validateKeywords(keywords: string): { valid: boolean; error?: string } {
  if (!keywords) return { valid: true }; // Optional field

  if (typeof keywords !== 'string') {
    return { valid: false, error: 'Słowa kluczowe muszą być tekstem' };
  }

  if (keywords.length > VALIDATION_LIMITS.KEYWORDS_MAX) {
    return { valid: false, error: `Słowa kluczowe nie mogą przekraczać ${VALIDATION_LIMITS.KEYWORDS_MAX} znaków` };
  }

  return { valid: true };
}

/**
 * Validate hashtag
 */
export function validateHashtag(hashtag: string): { valid: boolean; error?: string } {
  if (!hashtag || typeof hashtag !== 'string') {
    return { valid: false, error: 'Hashtag jest wymagany' };
  }

  const trimmed = hashtag.trim();
  
  if (trimmed.length > VALIDATION_LIMITS.HASHTAG_MAX) {
    return { valid: false, error: `Hashtag nie może być dłuższy niż ${VALIDATION_LIMITS.HASHTAG_MAX} znaków` };
  }

  // Hashtag should only contain alphanumeric, underscore and unicode letters (including Polish chars)
  if (!/^#?[\p{L}\p{N}_]+$/u.test(trimmed)) {
    return { valid: false, error: 'Hashtag może zawierać tylko litery, cyfry i podkreślnik' };
  }

  return { valid: true };
}

/**
 * Check for suspicious patterns (SQL injection, XSS attempts, etc.)
 */
function containsSuspiciousPatterns(input: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /eval\(/i,
    /expression\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /--/g, // SQL comments
    /;.*drop/i,
    /;.*delete/i,
    /union.*select/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize and validate user input
 */
export function sanitizeAndValidate(
  input: string,
  maxLength: number,
  fieldName: string = 'Pole'
): { valid: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: `${fieldName} musi być tekstem` };
  }

  // Sanitize
  const sanitized = sanitizeText(input.trim());

  // Validate length
  if (sanitized.length > maxLength) {
    return {
      valid: false,
      sanitized,
      error: `${fieldName} nie może być dłuższe niż ${maxLength} znaków`,
    };
  }

  // Check for suspicious patterns
  if (containsSuspiciousPatterns(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: `${fieldName} zawiera niedozwolone znaki lub wzorce`,
    };
  }

  return { valid: true, sanitized };
}

// ============================================
// RATE LIMITING (Frontend)
// ============================================

/**
 * Simple rate limiter for frontend
 */
export class RateLimiter {
  private lastCallTime: number = 0;
  private callCount: number = 0;
  private resetTime: number = 0;

  constructor(
    private maxCalls: number = 5,
    private windowMs: number = 60000, // 1 minute
    private cooldownMs: number = 1000 // 1 second between calls
  ) {}

  /**
   * Check if action is allowed
   */
  canProceed(): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();

    // Reset counter if window expired
    if (now > this.resetTime) {
      this.callCount = 0;
      this.resetTime = now + this.windowMs;
    }

    // Check cooldown
    if (now - this.lastCallTime < this.cooldownMs) {
      return {
        allowed: false,
        retryAfter: this.cooldownMs - (now - this.lastCallTime),
      };
    }

    // Check rate limit
    if (this.callCount >= this.maxCalls) {
      return {
        allowed: false,
        retryAfter: this.resetTime - now,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a call
   */
  recordCall(): void {
    this.lastCallTime = Date.now();
    this.callCount++;
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.lastCallTime = 0;
    this.callCount = 0;
    this.resetTime = 0;
  }
}

// ============================================
// SAFE RENDERING
// ============================================

/**
 * Safely render user-generated content
 * Use this when displaying content from users or AI
 */
export function renderSafeContent(content: string): string {
  if (!content) return '';
  
  // Sanitize HTML
  const sanitized = sanitizeHTML(content);
  
  // Convert URLs to links (but sanitized)
  return linkifyText(sanitized);
}

/**
 * Convert URLs in text to clickable links
 */
function linkifyText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    const sanitizedUrl = escapeHTML(url);
    return `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">${sanitizedUrl}</a>`;
  });
}

// ============================================
// CONTENT SECURITY POLICY
// ============================================

/**
 * Check if content meets security requirements
 */
export function validateContentSecurity(content: string): {
  safe: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for suspicious patterns
  if (containsSuspiciousPatterns(content)) {
    issues.push('Wykryto potencjalnie niebezpieczne wzorce');
  }

  // Check length
  if (content.length > VALIDATION_LIMITS.POST_TEXT_MAX) {
    issues.push('Treść przekracza maksymalną długość');
  }

  // Check for excessive special characters
  const specialCharCount = (content.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > content.length * 0.3) {
    issues.push('Zbyt wiele znaków specjalnych');
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
