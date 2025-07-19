import { memo } from 'react';

// Memoized skeleton components to prevent unnecessary re-renders
export const OptimizedSkeleton = memo(({ className }: { className: string }) => (
  <div className={`animate-pulse bg-white/10 rounded ${className}`} />
));

export const CardSkeleton = memo(() => (
  <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4 space-y-3">
    <OptimizedSkeleton className="h-4 w-1/3" />
    <OptimizedSkeleton className="h-3 w-full" />
    <OptimizedSkeleton className="h-3 w-3/4" />
    <OptimizedSkeleton className="h-3 w-1/2" />
  </div>
));

OptimizedSkeleton.displayName = 'OptimizedSkeleton';
CardSkeleton.displayName = 'CardSkeleton';