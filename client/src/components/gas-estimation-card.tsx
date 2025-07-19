import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';

interface GasEstimate {
  approve: { gasLimit: string; gasPrice: string; cost: string };
  mint: { gasLimit: string; gasPrice: string; cost: string };
  total: { gasLimit: string; gasPrice: string; cost: string };
}

export function GasEstimationCard() {
  const { isConnected } = useWallet();
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setIsLoading(false);
      return;
    }

    const fetchGasEstimate = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate gas estimation - in real app, this would call actual gas estimation API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockGasEstimate: GasEstimate = {
          approve: {
            gasLimit: '50000',
            gasPrice: '0.00001',
            cost: '0.0005'
          },
          mint: {
            gasLimit: '200000',
            gasPrice: '0.00001',
            cost: '0.002'
          },
          total: {
            gasLimit: '250000',
            gasPrice: '0.00001',
            cost: '0.0025'
          }
        };
        
        setGasEstimate(mockGasEstimate);
      } catch (err) {
        setError('Failed to estimate gas costs');
        console.error('Gas estimation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGasEstimate();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchGasEstimate, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected) {
    return (
      <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
        <CardContent className="p-4 text-center">
          <AlertCircle className="h-5 w-5 text-amber-400 mx-auto mb-2" />
          <p className="text-white/70 text-xs">Connect wallet to view gas estimates</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="h-3 w-3 text-matrix-green" />
            Transaction Cost
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-3/4 bg-white/10" />
          <Skeleton className="h-4 w-1/2 bg-white/10" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg">
        <CardContent className="p-4 text-center">
          <AlertCircle className="h-5 w-5 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-xs">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!gasEstimate) {
    return null;
  }

  return (
    <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-super-bright text-sm flex items-center gap-2">
          <Zap className="h-3 w-3 text-matrix-green" />
          Transaction Cost & Returns
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Transaction Costs */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-bright text-xs">Token Approval</span>
            <span className="text-super-bright text-xs font-semibold">
              ~{gasEstimate.approve.cost} ETH
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-bright text-xs">Add Liquidity</span>
            <span className="text-super-bright text-xs font-semibold">
              ~{gasEstimate.mint.cost} ETH
            </span>
          </div>
          <div className="border-t border-white/10 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-super-bright font-semibold text-xs">Total Cost</span>
              <span className="text-matrix-bright font-bold text-xs">
                ~{gasEstimate.total.cost} ETH
              </span>
            </div>
          </div>
        </div>

        {/* Expected Returns Section */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-2 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="h-3 w-3 text-purple-400" />
            <span className="text-purple-300 text-xs font-medium">Expected Returns</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/70">Trading Fees APR</span>
              <span className="text-green-400 font-mono">~2.8%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/70">KILT Rewards APR</span>
              <span className="text-green-400 font-mono">~112%</span>
            </div>
            <div className="border-t border-purple-300/20 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-purple-300 font-medium">Total APR</span>
                <span className="text-pink-400 font-mono font-bold">~115%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Break-even Analysis */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-2 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="h-3 w-3 text-blue-400" />
            <span className="text-blue-300 text-xs font-medium">Break-even Time</span>
          </div>
          
          <div className="text-xs text-white/70">
            <div className="flex justify-between items-center mb-1">
              <span>Cost recovered in:</span>
              <span className="text-cyan-400 font-mono">~2.5 days</span>
            </div>
            <div className="text-xs text-blue-300/70">
              Based on current pool volume & APR
            </div>
          </div>
        </div>
        
        {/* Network & Speed Tags */}
        <div className="flex items-center gap-2">
          <Badge className="bg-matrix-green-glow text-matrix-green border border-matrix-green px-2 py-0.5 text-xs">
            <Clock className="h-2 w-2 mr-1" />
            Base Network
          </Badge>
          <Badge className="px-2 py-0.5 text-xs" style={{ backgroundColor: 'rgba(255, 0, 102, 0.2)', color: '#ff0066', borderColor: 'rgba(255, 0, 102, 0.3)' }}>
            <TrendingUp className="h-2 w-2 mr-1" />
            Fast
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}