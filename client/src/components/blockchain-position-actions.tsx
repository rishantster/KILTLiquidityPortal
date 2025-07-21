import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, DollarSign, Flame, Loader2 } from 'lucide-react';
import { usePositionManager } from '@/hooks/use-position-manager';
import { useToast } from '@/hooks/use-toast';

interface BlockchainPositionActionsProps {
  position: {
    tokenId: string;
    liquidity: string;
    currentValueUSD: string;
    feesEarned: string;
    token0Amount?: string;
    token1Amount?: string;
  };
  onTransactionStart?: (operation: string, txHash?: string) => void;
  onTransactionComplete?: () => void;
}

export function BlockchainPositionActions({ 
  position, 
  onTransactionStart, 
  onTransactionComplete 
}: BlockchainPositionActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<'increase' | 'decrease' | 'collect' | 'burn' | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [liquidityPercentage, setLiquidityPercentage] = useState('25');
  
  const positionManager = usePositionManager();
  const { toast } = useToast();

  const handleAction = async () => {
    if (!activeAction) return;
    
    try {
      onTransactionStart?.(activeAction);
      let result;
      
      switch (activeAction) {
        case 'increase':
          if (!amount0 || !amount1) {
            throw new Error('Please enter both token amounts');
          }
          
          result = await positionManager.increaseLiquidity({
            tokenId: position.tokenId,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: (parseFloat(amount0) * 0.95).toString(), // 5% slippage tolerance
            amount1Min: (parseFloat(amount1) * 0.95).toString(),
          });
          
          onTransactionStart?.(activeAction, result.hash);
          break;
          
        case 'decrease':
          const percentage = parseFloat(liquidityPercentage) / 100;
          const liquidityToRemove = (BigInt(position.liquidity) * BigInt(Math.floor(percentage * 100)) / BigInt(100)).toString();
          
          result = await positionManager.decreaseLiquidity({
            tokenId: position.tokenId,
            liquidity: liquidityToRemove,
            amount0Min: '0',
            amount1Min: '0',
          });
          
          onTransactionStart?.(activeAction, result.hash);
          break;
          
        case 'collect':
          result = await positionManager.collectFees({
            tokenId: position.tokenId,
          });
          
          onTransactionStart?.(activeAction, result.hash);
          break;
          
        case 'burn':
          // Burn completely removes the position
          result = await positionManager.burnPosition(position.tokenId);
          
          onTransactionStart?.(activeAction, result.hash);
          break;
      }
      
      // Reset form and close dialog
      setAmount0('');
      setAmount1('');
      setLiquidityPercentage('25');
      setActiveAction(null);
      setIsDialogOpen(false);
      
      onTransactionComplete?.();
      
    } catch (error) {
      console.error('Transaction failed:', error);
      toast({
        title: "Transaction Failed",
        description: (error as Error).message || 'Transaction could not be completed',
        variant: "destructive",
      });
    }
  };

  const ActionButton = ({ action, icon: Icon, label, variant = "outline" }: {
    action: typeof activeAction;
    icon: any;
    label: string;
    variant?: "outline" | "destructive" | "default";
  }) => (
    <button
      onClick={() => {
        setActiveAction(action);
        setIsDialogOpen(true);
      }}
      disabled={positionManager.isLoading}
      className={`cyber-action-btn ${
        action === 'increase' ? 'add' : 
        action === 'decrease' ? 'remove' : 
        action === 'collect' ? 'collect' : 'burn'
      } ${positionManager.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {positionManager.isLoading && positionManager.currentOperation === action ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Icon className="w-3 h-3 mr-1" />
      )}
      {label}
    </button>
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        <ActionButton action="increase" icon={Plus} label="+ Add" />
        <ActionButton action="decrease" icon={Minus} label="- Remove" />
        <ActionButton action="collect" icon={DollarSign} label="$ Collect" />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-black/90 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              {activeAction === 'increase' && <Plus className="h-5 w-5 text-green-400" />}
              {activeAction === 'decrease' && <Minus className="h-5 w-5 text-yellow-400" />}
              {activeAction === 'collect' && <DollarSign className="h-5 w-5 text-blue-400" />}
              {activeAction === 'burn' && <Flame className="h-5 w-5 text-red-400" />}
              <span>
                {activeAction === 'increase' && 'Add Liquidity'}
                {activeAction === 'decrease' && 'Remove Liquidity'}
                {activeAction === 'collect' && 'Collect Fees'}
                {activeAction === 'burn' && 'Burn Position'}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-300">Position #{position.tokenId}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Value:</span>
                  <span className="text-white">${position.currentValueUSD}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fees Earned:</span>
                  <span className="text-green-400">${position.feesEarned}</span>
                </div>
              </CardContent>
            </Card>

            {activeAction === 'increase' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">ETH Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">KILT Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            )}

            {activeAction === 'decrease' && (
              <div className="space-y-3">
                <Label className="text-gray-300">Liquidity to Remove (%)</Label>
                <div className="flex space-x-2">
                  {['25', '50', '75', '100'].map((percent) => (
                    <Button
                      key={percent}
                      variant={liquidityPercentage === percent ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLiquidityPercentage(percent)}
                      className="flex-1"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="25"
                  value={liquidityPercentage}
                  onChange={(e) => setLiquidityPercentage(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  min="1"
                  max="100"
                />
              </div>
            )}

            {activeAction === 'collect' && (
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  This will collect all accumulated trading fees from your position.
                </p>
              </div>
            )}

            {activeAction === 'burn' && (
              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                <p className="text-red-300 text-sm font-medium mb-2">⚠️ Warning</p>
                <p className="text-red-300 text-sm">
                  This will completely remove your position and burn the NFT. This action cannot be undone.
                </p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={positionManager.isLoading}
                className="flex-1 bg-pink-600 hover:bg-pink-700"
              >
                {positionManager.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirm {activeAction === 'increase' ? 'Add' : 
                         activeAction === 'decrease' ? 'Remove' :
                         activeAction === 'collect' ? 'Collect' : 'Burn'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}