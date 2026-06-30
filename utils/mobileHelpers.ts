/**
 * Mobile-specific utilities and helpers
 */

/**
 * Prevent body scroll (useful for modals on mobile)
 */
export function lockScroll() {
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.height = '100%';
}

/**
 * Restore body scroll
 */
export function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.height = '';
}

/**
 * Detect if running as PWA
 */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Get optimal input type for mobile keyboard
 */
export function getInputType(fieldType: 'email' | 'tel' | 'number' | 'url' | 'text' = 'text'): string {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (!isMobile) return 'text';
  
  return fieldType;
}

/**
 * Smooth scroll to element (mobile-friendly)
 */
export function scrollToElement(
  element: HTMLElement,
  offset: number = 0,
  behavior: ScrollBehavior = 'smooth'
) {
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  
  window.scrollTo({
    top: targetPosition,
    behavior,
  });
}

/**
 * Add safe area insets CSS variables
 */
export function setupSafeAreaInsets() {
  // iOS Safari safe area insets
  const root = document.documentElement;
  
  if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
    root.style.setProperty('--sat', 'env(safe-area-inset-top)');
    root.style.setProperty('--sar', 'env(safe-area-inset-right)');
    root.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--sal', 'env(safe-area-inset-left)');
  } else {
    root.style.setProperty('--sat', '0px');
    root.style.setProperty('--sar', '0px');
    root.style.setProperty('--sab', '0px');
    root.style.setProperty('--sal', '0px');
  }
}

/**
 * Prevent zoom on double tap (iOS)
 */
export function preventDoubleTapZoom() {
  let lastTouchEnd = 0;
  
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

/**
 * Detect network connection quality
 */
export function getNetworkQuality(): 'slow' | 'medium' | 'fast' | 'unknown' {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  if (!connection) return 'unknown';
  
  const effectiveType = connection.effectiveType;
  
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'medium';
  return 'slow';
}

/**
 * Optimize image loading for mobile
 */
export function getOptimalImageSize(): 'small' | 'medium' | 'large' {
  const width = window.innerWidth;
  const networkQuality = getNetworkQuality();
  
  if (width < 768) {
    return networkQuality === 'slow' ? 'small' : 'medium';
  }
  
  if (width < 1024) {
    return 'medium';
  }
  
  return 'large';
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Format file size for mobile display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Detect if element is in viewport (mobile-optimized)
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Copy to clipboard (mobile-friendly)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    return false;
  }
}
