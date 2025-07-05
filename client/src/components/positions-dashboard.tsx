import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target,
  ExternalLink,
  Settings,
  Eye,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { TOKENS, UNISWAP_V3_CONTRACTS } from '@/lib/uniswap-v3';
import { UserPositions } from './user-positions';

export function PositionsDashboard() {
  const { address, isConnected } = useWallet();
  const {
    kiltEthPositions,
    poolExists,
    formatTokenAmount,
    calculatePositionValue,
    isPositionInRange
  } = useUniswapV3();
  const { data: kiltData } = useKiltTokenData();

  // Calculate metrics
  const totalPositionValue = kiltEthPositions.reduce((total, position) => {
    return total + calculatePositionValue(position);
  }, 0);
  const inRangePositions = kiltEthPositions.filter(position => isPositionInRange(position));

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-12 text-center">
          <Target className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-white font-heading text-xl mb-2">Connect Wallet</h3>
          <p className="text-white/60">Connect your wallet to view and manage liquidity positions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pool Status Header */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <CardTitle className="text-white font-heading">Liquidity Management</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-green-400/20 text-green-400">
                Pool Pending
              </Badge>
              <div className="text-purple-400 font-mono">
                ${kiltData?.price.toFixed(4) || '0.0289'} KILT
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Position Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cluely-card rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-heading text-lg">Total Value</h3>
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-2xl font-mono text-white">
              ${totalPositionValue.toFixed(2)}
            </div>
            <div className="text-sm text-white/60 mt-1">
              {kiltEthPositions.length} positions
            </div>
          </CardContent>
        </Card>

        <Card className="cluely-card rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-heading text-lg">In Range</h3>
              <Target className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-2xl font-mono text-white">
              {inRangePositions.length}
            </div>
            <div className="text-sm text-white/60 mt-1">
              {kiltEthPositions.length > 0 ? `${Math.round((inRangePositions.length / kiltEthPositions.length) * 100)}% active` : 'No positions'}
            </div>
          </CardContent>
        </Card>

        <Card className="cluely-card rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-heading text-lg">Pool Status</h3>
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-2xl font-mono text-white">
              {poolExists ? 'Active' : 'Pending'}
            </div>
            <div className="text-sm text-white/60 mt-1">
              KILT/ETH 0.3%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Positions */}
      <UserPositions />

      {/* Empty State */}
      {kiltEthPositions.length === 0 && (
        <Card className="cluely-card rounded-2xl">
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-white font-heading text-xl mb-2">No Positions Yet</h3>
            <p className="text-white/60 mb-6">Create your first liquidity position to start earning fees and rewards</p>
            <div className="text-sm text-white/40">
              Use the "Add Liquidity" tab to create your first position
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}