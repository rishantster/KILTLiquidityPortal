import { useQuery } from '@tanstack/react-query';
import { KILT_ETH_POOL_ADDRESS } from '@/lib/constants';

export function usePoolData() {
  return useQuery({
    queryKey: [`/api/pool/${KILT_ETH_POOL_ADDRESS}`],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useUserPositions(userId: number | null) {
  return useQuery({
    queryKey: [`/api/positions/user/${userId}`],
    enabled: !!userId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useUserRewards(userId: number | null) {
  return useQuery({
    queryKey: [`/api/rewards/user/${userId}`],
    enabled: !!userId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
