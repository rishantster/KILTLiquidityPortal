/**
 * Mobile Blazing Fast Performance Hook - Simplified
 * Optimized for mobile devices with basic performance settings
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Simple mobile detection
export function useMobileBlazingFast() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile };
}

// Dashboard hook for mobile
export function useMobileDashboard(address?: string) {
  return useQuery({
    queryKey: ['/api/rewards/program-analytics'],
    enabled: !!address,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}