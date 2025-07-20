import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Real-time admin synchronization hook
 * Automatically detects admin panel changes and triggers blazing fast cache invalidation
 */
export function useAdminSync() {
  const queryClient = useQueryClient();
  const lastUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    const checkForAdminUpdates = async () => {
      try {
        // Check for recent admin operations
        const response = await fetch('/api/admin/operations');
        if (response.ok) {
          const operations = await response.json();
          
          if (operations.length > 0) {
            const latestOperation = operations[0];
            const operationTime = new Date(latestOperation.timestamp).getTime();
            
            // If there's a new admin operation since last check
            if (operationTime > lastUpdateRef.current) {
              console.log('🚀 Admin change detected - triggering blazing fast cache refresh');
              
              // Invalidate all admin-dependent queries for instant updates
              queryClient.invalidateQueries({ queryKey: ['maxAPR'] });
              queryClient.invalidateQueries({ queryKey: ['programAnalytics'] });
              queryClient.invalidateQueries({ queryKey: ['/api/rewards/maximum-apr'] });
              queryClient.invalidateQueries({ queryKey: ['/api/rewards/program-analytics'] });
              queryClient.invalidateQueries({ queryKey: ['personalAPR'] });
              queryClient.invalidateQueries({ queryKey: ['rewardStats'] });
              
              // Force immediate refetch for blazing fast updates
              queryClient.refetchQueries({ queryKey: ['maxAPR'] });
              queryClient.refetchQueries({ queryKey: ['programAnalytics'] });
              
              lastUpdateRef.current = operationTime;
            }
          }
        }
      } catch (error) {
        // Silent fail - we don't want to spam console with sync errors
      }
    };
    
    // Check for admin updates every 2 seconds for blazing fast synchronization
    const interval = setInterval(checkForAdminUpdates, 2000);
    
    // Initial check
    checkForAdminUpdates();
    
    return () => clearInterval(interval);
  }, [queryClient]);
}