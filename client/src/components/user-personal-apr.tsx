import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface UserPersonalAPRProps {
  address: string;
}

export function UserPersonalAPR({ address }: UserPersonalAPRProps) {
  const { data: userAPR, isLoading } = useQuery({
    queryKey: ['/api/rewards/user-apr', address],
    queryFn: async () => {
      // Get user's positions and calculate their ranking-based APR
      const response = await fetch(`/api/rewards/user-apr/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user APR');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!address,
  });

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (!userAPR) {
    return (
      <div className="text-center">
        <span className="text-white/50">0.0%</span>
        <div className="text-white/40 text-xs mt-1">No ranking</div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <span className="text-numbers">
        {userAPR.effectiveAPR.toFixed(1)}%
      </span>
      <div className="text-white/60 text-xs mt-1">
        {userAPR.rank ? `#${userAPR.rank} of ${userAPR.totalParticipants}` : 'Not ranked'}
      </div>
    </div>
  );
}