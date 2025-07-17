import { useState, useEffect } from 'react';

interface MobileResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

export const useMobileResponsive = (): MobileResponsiveState => {
  const [state, setState] = useState<MobileResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height,
      });
    };

    // Initial check
    updateResponsiveState();

    // Listen for resize events
    window.addEventListener('resize', updateResponsiveState);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateResponsiveState);
    };
  }, []);

  return state;
};

// Utility hook for mobile-specific configurations
export const useMobileConfig = () => {
  const { isMobile, isTablet, isDesktop } = useMobileResponsive();

  return {
    isMobile,
    isTablet,
    isDesktop,
    // Grid configurations
    gridCols: isMobile ? 1 : isTablet ? 2 : 3,
    cardPadding: isMobile ? 'p-2' : 'p-3',
    textSize: isMobile ? 'text-xs' : 'text-sm',
    iconSize: isMobile ? 'w-4 h-4' : 'w-5 h-5',
    buttonSize: isMobile ? 'sm' : 'default',
    spacing: isMobile ? 'space-y-2' : 'space-y-4',
    // Modal configurations
    modalSize: isMobile ? 'sm' : 'md',
    // Tab configurations
    tabSize: isMobile ? 'sm' : 'default',
    // Animation configurations
    animationDuration: isMobile ? 200 : 300,
  };
};