import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  Gift
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

interface ExternalPosition {
  nftTokenId: string;
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  amount0: string;
  amount1: string;
  minPrice: string;
  maxPrice: string;
  liquidity: string;
  currentValueUSD: number;
  feeTier: number;
  createdAt: string;
  isKiltPosition: boolean;
  // Historical validation data
  creationBlockNumber?: number;
  creationTransactionHash?: string;
}

interface RegistrationResult {
  success: boolean;
  message: string;
  positionId?: number;
  eligibilityStatus: string;
  validationResult?: {
    isValid: boolean;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    details: {
      isFullRange: boolean;
      priceAtCreation: number;
      balanceRatio: number;
      expectedRatio: number;
      tolerance: number;
    };
  };
  rewardInfo?: {
    dailyRewards: number;
    estimatedAPR: number;
    lockPeriodDays: number;
  };
}

export function PositionRegistration() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  // Get user for registration
  const { data: user } = useQuery({
    queryKey: ['user', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/users/${address}`);
      if (!response.ok) {
        // Create user if doesn't exist
        const createResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });
        return createResponse.json();
      }
      return response.json();
    },
    enabled: !!address
  });

  // Get unregistered positions from real Uniswap V3 contracts
  const { data: unregisteredPositionsData, isLoading: loadingPositions } = useQuery({
    queryKey: ['unregistered-positions', address],
    queryFn: async () => {
      if (!address) return { eligiblePositions: [], totalPositions: 0, message: '' };
      
      try {
        // Fetch actual Uniswap V3 positions containing KILT token
        const response = await fetch(`/api/positions/unregistered/${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }
        
        const data = await response.json();
        
        // Also get total positions to differentiate between "no positions" and "no unregistered positions"
        const totalPositionsResponse = await fetch(`/api/positions/user-total/${address}`);
        const totalPositions = totalPositionsResponse.ok ? (await totalPositionsResponse.json()).count : 0;
        
        return {
          eligiblePositions: data.eligiblePositions || [],
          totalPositions,
          message: data.message || ''
        };
      } catch (error) {
        console.error('Error fetching unregistered positions:', error);
        return { eligiblePositions: [], totalPositions: 0, message: '' };
      }
    },
    enabled: !!address
  });

  const unregisteredPositions = unregisteredPositionsData?.eligiblePositions || [];
  const totalPositions = unregisteredPositionsData?.totalPositions || 0;

  // Register position mutation
  const registerMutation = useMutation({
    mutationFn: async (position: ExternalPosition) => {
      if (!user?.id || !address) throw new Error('User not found');
      
      const response = await fetch('/api/positions/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userAddress: address,
          nftTokenId: position.nftTokenId,
          poolAddress: position.poolAddress,
          token0Address: position.token0Address,
          token1Address: position.token1Address,
          amount0: position.amount0,
          amount1: position.amount1,
          minPrice: position.minPrice,
          maxPrice: position.maxPrice,
          liquidity: position.liquidity,
          currentValueUSD: position.currentValueUSD,
          feeTier: position.feeTier,
          originalCreationDate: position.createdAt,
          // Historical validation data
          creationBlockNumber: position.creationBlockNumber,
          creationTransactionHash: position.creationTransactionHash
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      return response.json() as Promise<RegistrationResult>;
    },
    onSuccess: (result) => {
      toast({
        title: "Position Registered!",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ['unregistered-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Bulk register mutation
  const bulkRegisterMutation = useMutation({
    mutationFn: async (positions: ExternalPosition[]) => {
      if (!user?.id || !address) throw new Error('User not found');
      
      const response = await fetch('/api/positions/bulk-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userAddress: address,
          positions: positions.map(pos => ({
            nftTokenId: pos.nftTokenId,
            poolAddress: pos.poolAddress,
            token0Address: pos.token0Address,
            token1Address: pos.token1Address,
            amount0: pos.amount0,
            amount1: pos.amount1,
            minPrice: pos.minPrice,
            maxPrice: pos.maxPrice,
            liquidity: pos.liquidity,
            currentValueUSD: pos.currentValueUSD,
            feeTier: pos.feeTier,
            createdAt: pos.createdAt
          }))
        })
      });

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Bulk Registration Complete",
        description: `Successfully registered ${result.successCount} positions`,
      });
      queryClient.invalidateQueries({ queryKey: ['unregistered-positions'] });
      queryClient.invalidateQueries({ queryKey: ['user-positions'] });
      setSelectedPositions([]);
    }
  });

  const handleToggleSelection = (nftTokenId: string) => {
    setSelectedPositions(prev => 
      prev.includes(nftTokenId) 
        ? prev.filter(id => id !== nftTokenId)
        : [...prev, nftTokenId]
    );
  };

  const handleBulkRegister = () => {
    const positionsToRegister = unregisteredPositions.filter(pos => 
      selectedPositions.includes(pos.nftTokenId)
    );
    bulkRegisterMutation.mutate(positionsToRegister);
  };

  if (!isConnected) {
    return (
      <Card className="cluely-card">
        <CardContent className="p-3">
          <div className="text-center text-white/60 text-xs">
            Connect your wallet to register existing positions
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Compact Header */}
      <Card className="cluely-card">
        <CardContent className="p-3">
          <Alert className="bg-emerald-900/20 border-emerald-400/30">
            <Gift className="h-3 w-3 text-emerald-400" />
            <AlertDescription className="text-emerald-100 text-xs">
              Already have KILT liquidity positions on Uniswap? Register them here to start earning treasury rewards!
              <div className="mt-1.5 text-xs text-emerald-200/80">
                <div>• Immediate reward accrual • Smart contract security • Historical validation</div>
                <div>• Auto-validation for full range positions • Historical verification</div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Unregistered Positions */}
      <Card className="cluely-card flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-heading text-sm">
              Eligible Positions
            </CardTitle>
            {selectedPositions.length > 0 && (
              <Button 
                onClick={handleBulkRegister}
                disabled={bulkRegisterMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs py-1 px-2 h-6"
              >
                {bulkRegisterMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Register ({selectedPositions.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingPositions ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span className="ml-2 text-white/60 text-xs">Scanning for positions...</span>
            </div>
          ) : unregisteredPositions.length === 0 ? (
            <div className="text-center py-3">
              {totalPositions === 0 ? (
                <>
                  <Plus className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-2 text-xs">No KILT Positions Found</h3>
                  <p className="text-white/60 mb-3 text-xs">
                    You don't have any KILT liquidity positions yet. Create your first position to start earning treasury rewards!
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => {
                        // Navigate to liquidity tab using proper callback
                        if (window.navigateToTab) {
                          window.navigateToTab('liquidity');
                        } else {
                          // Fallback to querySelector
                          const liquidityTabButton = document.querySelector('[data-value="liquidity"]') as HTMLElement;
                          liquidityTabButton?.click();
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs py-1 px-2 h-6"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Liquidity
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://app.uniswap.org/', '_blank')}
                      className="border-white/20 hover:bg-white/5 text-xs py-1 px-2 h-6"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit Uniswap
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-white font-semibold mb-2 text-xs">All Set!</h3>
                  <p className="text-white/60 text-xs">
                    All your KILT positions are already registered and earning rewards.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {unregisteredPositions.map((position) => (
                <div 
                  key={position.nftTokenId}
                  className="border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedPositions.includes(position.nftTokenId)}
                        onChange={() => handleToggleSelection(position.nftTokenId)}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
                          <span className="text-white font-semibold">KILT/ETH Position</span>
                          <Badge variant="outline" className="text-xs">
                            NFT #{position.nftTokenId}
                          </Badge>
                        </div>
                        <div className="text-sm text-white/60">
                          Value: ${position.currentValueUSD.toLocaleString()} • 
                          Created: {new Date(position.createdAt).toLocaleDateString()} • 
                          Fee Tier: {(position.feeTier / 10000)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-white font-bold tabular-nums">
                          ${position.currentValueUSD.toLocaleString()}
                        </div>
                        <div className="text-xs text-emerald-400">
                          ~25% Est. APR
                        </div>
                        {position.minPrice === "0.005" && position.maxPrice === "0.030" && (
                          <div className="text-xs text-blue-400 mt-1">
                            ⚡ Full Range - Auto-validates
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => registerMutation.mutate(position)}
                        disabled={registerMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {registerMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}