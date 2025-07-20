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
        // Fetch actual Uniswap V3 positions containing KILT token (using working endpoint)
        const response = await fetch(`/api/positions/wallet/${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }
        
        const walletPositions = await response.json();
        
        // Get already registered positions to filter them out
        // First get/create user to get userId
        const userResponse = await fetch(`/api/users/${address}`);
        let userId;
        if (!userResponse.ok) {
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
          });
          const userData = await createResponse.json();
          userId = userData.id;
        } else {
          const userData = await userResponse.json();
          userId = userData.id;
        }
        
        const registeredResponse = await fetch(`/api/positions/user/${userId}`);
        const registeredPositions = registeredResponse.ok ? await registeredResponse.json() : [];
        
        // Get both app-created and manually registered positions
        // CRITICAL FIX: Ensure string comparison by converting to string
        const appCreatedNftIds = new Set(registeredPositions.filter((p: any) => p.createdViaApp === true).map((p: any) => p.nftTokenId.toString()));
        const manuallyRegisteredNftIds = new Set(registeredPositions.filter((p: any) => p.createdViaApp === false).map((p: any) => p.nftTokenId.toString()));
        
        // Filter logic: Only show positions that aren't app-created and aren't manually registered
        
        // Filter out app-created positions (they're automatically enrolled) and manually registered positions
        // Also filter out out-of-range positions since they don't earn rewards
        const eligiblePositions = walletPositions
          .filter((pos: any) => {
            // Must not be app-created or manually registered
            if (appCreatedNftIds.has(pos.tokenId.toString()) || manuallyRegisteredNftIds.has(pos.tokenId.toString())) {
              return false;
            }
            // Must be in-range to earn rewards (critical fix)
            if (!pos.isInRange) {
              return false;
            }
            return true;
          })
          .map((pos: any) => ({
            nftTokenId: pos.tokenId.toString(),
            poolAddress: pos.poolAddress,
            token0Address: pos.token0,
            token1Address: pos.token1,
            amount0: pos.token0Amount,
            amount1: pos.token1Amount,
            liquidity: pos.liquidity,
            currentValueUSD: pos.currentValueUSD,
            feeTier: pos.feeTier,
            tickLower: pos.tickLower,
            tickUpper: pos.tickUpper,
            isActive: pos.isActive,
            fees: pos.fees,
            // Add additional fields for registration
            minPrice: pos.tickLower,
            maxPrice: pos.tickUpper,
            createdAt: new Date().toISOString()
          }));
        
        return {
          eligiblePositions,
          totalPositions: walletPositions.length,
          appCreatedCount: appCreatedNftIds.size,
          manuallyRegisteredCount: manuallyRegisteredNftIds.size,
          message: eligiblePositions.length > 0 ? `Found ${eligiblePositions.length} unregistered positions` : ''
        };
      } catch (error) {
        // Error fetching unregistered positions
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
          <Alert className="border-[#ff0066]/30 bg-black/40 backdrop-blur-sm">
            <Gift className="h-3 w-3 text-[#ff0066]" />
            <AlertDescription className="text-white text-xs leading-relaxed">
              <div className="font-semibold mb-2 text-white">
                Already have KILT liquidity positions on Uniswap? Register them here to start earning treasury rewards!
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2 pl-1">
                  <span className="text-[#ff0066] font-bold text-sm leading-none mt-0.5">•</span>
                  <span className="text-white font-medium">Immediate reward accrual upon registration</span>
                </div>
                <div className="flex items-start gap-2 pl-1">
                  <span className="text-[#ff0066] font-bold text-sm leading-none mt-0.5">•</span>
                  <span className="text-white font-medium">Smart contract security with historical validation</span>
                </div>
                <div className="flex items-start gap-2 pl-1">
                  <span className="text-[#ff0066] font-bold text-sm leading-none mt-0.5">•</span>
                  <span className="text-white font-medium">Auto-validation for full range positions</span>
                </div>
                <div className="flex items-start gap-2 pl-1">
                  <span className="text-[#ff0066] font-bold text-sm leading-none mt-0.5">•</span>
                  <span className="text-white font-medium">Complete transaction history verification</span>
                </div>
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
                className="bg-[#ff0066] hover:bg-[#e6005c] text-xs py-1 px-2 h-6"
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
              <Loader2 className="h-4 w-4 animate-spin text-[#ff0066]" />
              <span className="ml-2 text-white/60 text-xs">Scanning for positions...</span>
            </div>
          ) : unregisteredPositions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
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
                      className="bg-[#ff0066] hover:bg-[#e6005c] text-xs py-1 px-2 h-6"
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
                  <CheckCircle className="h-6 w-6 text-[#ff0066] mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-3 text-lg">All Set!</h3>
                  <p className="text-white/60 text-sm max-w-xs">
                    All your KILT positions are already registered and earning rewards.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {unregisteredPositions.map((position) => (
                <div 
                  key={position.nftTokenId}
                  className="bg-gradient-to-br from-gray-900/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-gray-600/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:border-gray-500/50 hover:from-gray-900/95 hover:to-gray-800/80"
                >
                  {/* Header Section - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <input
                        type="checkbox"
                        checked={selectedPositions.includes(position.nftTokenId)}
                        onChange={() => handleToggleSelection(position.nftTokenId)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                      />
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-white font-bold text-sm sm:text-lg">Position</span>
                        <div className="px-1 sm:px-2 py-0.5 sm:py-1 bg-black/20 backdrop-blur-sm rounded-full border border-white/10">
                          <span className="text-emerald-300 text-xs sm:text-sm font-medium">In Range</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-3xl font-bold text-white">
                        ${position.currentValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400">Position Value</div>
                    </div>
                  </div>

                  {/* Token Amounts Section - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-black/20 backdrop-blur-xl rounded-lg p-3 sm:p-4 border border-white/10">
                      <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                        <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-[#ff0066] to-[#ff0066] rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">E</span>
                        </div>
                        <span className="text-white font-medium text-sm sm:text-base">WETH</span>
                      </div>
                      <div className="text-base sm:text-xl font-bold text-white">
                        {(parseFloat(position.amount0 || '0') / 1e18).toFixed(4)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400">
                        ${((parseFloat(position.amount0 || '0') / 1e18) * 2500).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-black/20 backdrop-blur-xl rounded-lg p-3 sm:p-4 border border-white/10">
                      <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                        <img src={kiltLogo} alt="KILT" className="w-4 h-4 sm:w-6 sm:h-6" />
                        <span className="text-pink-300 font-medium text-sm sm:text-base">KILT</span>
                      </div>
                      <div className="text-base sm:text-xl font-bold text-white">
                        {(parseFloat(position.amount1 || '0') / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400">
                        ${((parseFloat(position.amount1 || '0') / 1e18) * 0.018).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Position Details - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">NFT ID</div>
                      <div className="text-white font-bold text-sm sm:text-base">#{position.nftTokenId}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Fee Tier</div>
                      <div className="text-white font-bold text-sm sm:text-base">{(position.feeTier / 10000)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Range</div>
                      <div className="text-white font-bold text-sm sm:text-base">Full Range</div>
                    </div>
                  </div>

                  {/* Action Button - Mobile Optimized */}
                  <Button
                    onClick={() => registerMutation.mutate(position)}
                    disabled={registerMutation.isPending}
                    className="w-full bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-10 sm:h-12 text-sm sm:text-base font-medium"
                  >
                    {registerMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span className="text-sm sm:text-base">Registering...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-sm sm:text-base">Register Position</span>
                      </div>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}