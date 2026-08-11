/**
 * Utility functions for HTML sanitization to prevent XSS attacks
 */

// Basic HTML sanitization - removes dangerous tags and attributes
export const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  
  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous tags
    .replace(/<(\/?(?:script|iframe|object|embed|form|input|button|link|meta|style|base|head|html|body))[^>]*>/gi, '')
    // Remove on* event handlers
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    // Remove javascript: protocols
    .replace(/javascript:/gi, '')
    // Remove data: URLs (except for images)
    .replace(/data:(?!image\/)/gi, 'data-blocked:')
    // Remove vbscript: protocols
    .replace(/vbscript:/gi, '')
    // Remove dangerous attributes
    .replace(/\s+(?:src|href|action|formaction|background|dynsrc|lowsrc|ping|poster|srcset|usemap|cite|longdesc|xlink:href|xml:base|formtarget|manifest|archive|codebase|classid|data|code|value|type|autofocus|autoplay|controls|defer|async|hidden|loop|open|readonly|required|reversed|scoped|seamless|selected|spellcheck|translate|draggable|dropzone|hidden|itemscope|itemtype|itemid|itemref|itemprop|content|accesskey|contextmenu|draggable|dropzone|hidden|spellcheck|tabindex|translate)="[^"]*"/gi, '')
    // Keep only safe attributes
    .replace(/\s+(?:class|id|style|title|alt|width|height|align|valign|border|cellpadding|cellspacing|colspan|rowspan|nowrap|clear|color|face|size|dir|lang|xml:lang)="[^"]*"/gi, (match) => {
      // Additional validation for style attribute
      if (match.includes('style=')) {
        const styleValue = match.match(/style="([^"]*)"/)?.[1] || '';
        const safeStyle = sanitizeCSS(styleValue);
        return match.replace(/style="[^"]*"/, `style="${safeStyle}"`);
      }
      return match;
    });
};

// CSS sanitization - removes dangerous CSS properties
export const sanitizeCSS = (css: string): string => {
  if (!css) return '';
  
  return css
    // Remove javascript: and data: URLs
    .replace(/javascript:/gi, '')
    .replace(/data:(?!image\/)/gi, 'data-blocked:')
    // Remove dangerous CSS functions
    .replace(/expression\s*\(/gi, 'expression-blocked(')
    .replace(/url\s*\(\s*["']?(?:javascript:|data:|vbscript:)/gi, 'url(blocked:')
    // Remove @import with dangerous protocols
    .replace(/@import\s+(?:url\s*\()?["']?(?:javascript:|data:|vbscript:)/gi, '@import blocked')
    // Remove binding behaviors
    .replace(/behavior\s*:/gi, 'behavior-blocked:');
};

// Enhanced sanitization for rich text editors - allows safe formatting tags
export const sanitizeRichText = (html: string): string => {
  if (!html) return '';
  
  return html
    // First apply basic sanitization
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<(\/?(?:script|iframe|object|embed|form|input|button|link|meta|style|base|head|html|body))[^>]*>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    // Allow safe tags but remove dangerous attributes from them
    .replace(/<(\/?(?:b|i|em|strong|u|s|strike|sub|sup|br|p|div|span|h[1-6]|ul|ol|li|blockquote|pre|code|a|img))\b([^>]*)>/gi, (match, tag, attrs) => {
      // Clean attributes for allowed tags
      const cleanAttrs = attrs
        .replace(/\s+on\w+="[^"]*"/gi, '')
        .replace(/\s+on\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:(?!image\/)/gi, 'data-blocked:');
      
      // For links, only allow href, title, target attributes
      if (tag.startsWith('a') && !tag.startsWith('/')) {
        const hrefMatch = cleanAttrs.match(/href="([^"]*)"/);
        const titleMatch = cleanAttrs.match(/title="([^"]*)"/);
        const targetMatch = cleanAttrs.match(/target="([^"]*)"/);
        
        let newAttrs = '';
        if (hrefMatch && !hrefMatch[1].match(/^(javascript:|vbscript:|data:)/)) {
          newAttrs += ` href="${hrefMatch[1]}"`;
        }
        if (titleMatch) {
          newAttrs += ` title="${titleMatch[1]}"`;
        }
        if (targetMatch && targetMatch[1] === '_blank') {
          newAttrs += ` target="_blank" rel="noopener noreferrer"`;
        }
        
        return `<${tag}${newAttrs}>`;
      }
      
      // For images, only allow src, alt, width, height attributes
      if (tag.startsWith('img') && !tag.startsWith('/')) {
        const srcMatch = cleanAttrs.match(/src="([^"]*)"/);
        const altMatch = cleanAttrs.match(/alt="([^"]*)"/);
        const widthMatch = cleanAttrs.match(/width="([^"]*)"/);
        const heightMatch = cleanAttrs.match(/height="([^"]*)"/);
        
        let newAttrs = '';
        if (srcMatch && !srcMatch[1].match(/^(javascript:|vbscript:|data:)/)) {
          newAttrs += ` src="${srcMatch[1]}"`;
        }
        if (altMatch) {
          newAttrs += ` alt="${altMatch[1]}"`;
        }
        if (widthMatch) {
          newAttrs += ` width="${widthMatch[1]}"`;
        }
        if (heightMatch) {
          newAttrs += ` height="${heightMatch[1]}"`;
        }
        
        return `<${tag}${newAttrs}>`;
      }
      
      // For other tags, allow only class, id, style attributes
      if (!tag.startsWith('/')) {
        const classMatch = cleanAttrs.match(/class="([^"]*)"/);
        const idMatch = cleanAttrs.match(/id="([^"]*)"/);
        const styleMatch = cleanAttrs.match(/style="([^"]*)"/);
        
        let newAttrs = '';
        if (classMatch) {
          newAttrs += ` class="${classMatch[1]}"`;
        }
        if (idMatch) {
          newAttrs += ` id="${idMatch[1]}"`;
        }
        if (styleMatch) {
          const safeStyle = sanitizeCSS(styleMatch[1]);
          newAttrs += ` style="${safeStyle}"`;
        }
        
        return `<${tag}${newAttrs}>`;
      }
      
      return `<${tag}>`;
    })
    // Remove any remaining dangerous tags
    .replace(/<[^>]+>/g, (tag) => {
      // Allow only the safe tags we've processed
      const safeTags = /^(<\/?(?:b|i|em|strong|u|s|strike|sub|sup|br|p|div|span|h[1-6]|ul|ol|li|blockquote|pre|code|a|img)\b[^>]*>|<\/?(?:b|i|em|strong|u|s|strike|sub|sup|br|p|div|span|h[1-6]|ul|ol|li|blockquote|pre|code|a|img)>)$/;
      return safeTags.test(tag) ? tag : '';
    });
};

// Text-only sanitization - removes all HTML tags
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

// URL validation and sanitization
export const sanitizeURL = (url: string): string => {
  if (!url) return '';
  
  try {
    // Allow only http, https, mailto, tel protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    const parsed = new URL(url, window.location.origin);
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '#';
    }
    
    // Prevent javascript: and data: URLs
    if (url.toLowerCase().includes('javascript:') || 
        url.toLowerCase().includes('data:') || 
        url.toLowerCase().includes('vbscript:')) {
      return '#';
    }
    
    return parsed.toString();
  } catch {
    // Invalid URL, return safe fallback
    return '#';
  }
};
