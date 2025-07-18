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
          Transaction Cost
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
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
        
        <div className="flex items-center gap-2">
          <Badge className="bg-matrix-green-glow text-matrix-green border border-matrix-green px-2 py-0.5 text-xs">
            <Clock className="h-2 w-2 mr-1" />
            Base Network
          </Badge>
          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 text-xs">
            <TrendingUp className="h-2 w-2 mr-1" />
            Fast
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}