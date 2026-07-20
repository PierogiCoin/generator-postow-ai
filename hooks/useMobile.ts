import { useState, useEffect } from 'react';

/**
 * Hook to detect if user is on mobile device
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const isMobileDevice = width < 768;
      const isTabletDevice = width >= 768 && width < 1024;

      setIsMobile(isMobileDevice);
      setIsTablet(isTabletDevice);
      
      if (isMobileDevice) {
        setScreenSize('mobile');
      } else if (isTabletDevice) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenSize,
  };
}

/**
 * Hook to detect touch device
 */
export function useTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const hasTouchScreen = 
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      ((navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0;

    setIsTouch(hasTouchScreen);
  }, []);

  return isTouch;
}

/**
 * Hook for keyboard visibility on mobile
 */
export function useKeyboardVisible() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard shows, viewport height decreases
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const isVisible = visualViewport.height < window.innerHeight;
        setIsKeyboardVisible(isVisible);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return isKeyboardVisible;
}

/**
 * Hook for safe area insets (notch support)
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const style = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(style.getPropertyValue('--sat') || '0'),
        right: parseInt(style.getPropertyValue('--sar') || '0'),
        bottom: parseInt(style.getPropertyValue('--sab') || '0'),
        left: parseInt(style.getPropertyValue('--sal') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);

    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
}

/**
 * Hook for orientation detection
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation(isPortrait ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return orientation;
}

/**
 * Haptic feedback utility
 */
export function vibrate(pattern: number | number[] = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Hook for haptic feedback on actions
 */
export function useHaptic() {
  const vibrateLight = () => vibrate(10);
  const vibrateMedium = () => vibrate(20);
  const vibrateHeavy = () => vibrate([30, 10, 30]);
  const vibrateSuccess = () => vibrate([10, 10, 10]);
  const vibrateError = () => vibrate([20, 10, 20, 10, 20]);

  return {
    vibrateLight,
    vibrateMedium,
    vibrateHeavy,
    vibrateSuccess,
    vibrateError,
  };
}
