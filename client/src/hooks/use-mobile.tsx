import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      if (typeof window === 'undefined') return false;
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    const checkScreenSize = () => {
      if (typeof window === 'undefined') return false;
      return window.innerWidth < 768; // Tailwind 'md' breakpoint
    };

    const updateMobileStatus = () => {
      setIsMobile(checkIsMobile() || checkScreenSize());
    };

    updateMobileStatus();
    window.addEventListener('resize', updateMobileStatus);

    return () => {
      window.removeEventListener('resize', updateMobileStatus);
    };
  }, []);

  return isMobile;
}

export function useWalletConnect() {
  const [hasWalletApp, setHasWalletApp] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for injected wallet providers
    const checkWalletProviders = () => {
      const hasMetaMask = typeof window.ethereum !== 'undefined';
      const hasCoinbase = typeof (window as any).coinbaseWalletExtension !== 'undefined';
      const hasTrustWallet = typeof (window as any).trustWallet !== 'undefined';
      
      setHasWalletApp(hasMetaMask || hasCoinbase || hasTrustWallet);
    };

    checkWalletProviders();

    // Listen for wallet injections (some wallets inject asynchronously)
    const interval = setInterval(checkWalletProviders, 1000);
    
    // Clear interval after 5 seconds
    setTimeout(() => clearInterval(interval), 5000);

    return () => clearInterval(interval);
  }, []);

  return { isMobile, hasWalletApp };
}

export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...viewport,
    isMobile: viewport.width < 768,
    isTablet: viewport.width >= 768 && viewport.width < 1024,
    isDesktop: viewport.width >= 1024,
  };
}