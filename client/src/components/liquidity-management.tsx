import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Flame,
  AlertCircle,
  Coins,
  Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/wallet-context';
import { useLiquidityManager } from '@/hooks/use-liquidity-manager';

interface LiquidityAction {
  type: 'add' | 'increase' | 'decrease' | 'collect' | 'burn';
  tokenId?: string;
  amount0?: string;
  amount1?: string;
  liquidity?: string;
}

export function LiquidityManagement() {
  const [action, setAction] = useState<LiquidityAction>({ type: 'add' });
  const { address: walletAddress, isConnected } = useWallet();
  const { toast } = useToast();
  const {
    isProcessing,
    collectFees,
    addLiquidity,
    increaseLiquidity,
    decreaseLiquidity,
    burnPosition
  } = useLiquidityManager();

  const handleLiquidityAction = async () => {
    if (!isConnected || !walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to manage liquidity"
      });
      return;
    }

    try {
      let success = false;

      switch (action.type) {
        case 'add':
          if (!action.amount0 || !action.amount1) {
            toast({
              variant: "destructive",
              title: "Missing Amounts",
              description: "Please enter both WETH and KILT amounts"
            });
            return;
          }
          success = await addLiquidity(
            action.amount0,
            action.amount1,
            -887220, // Full range tick lower
            887220   // Full range tick upper
          );
          break;
        case 'increase':
          if (!action.tokenId || !action.amount0 || !action.amount1) {
            toast({
              variant: "destructive",
              title: "Missing Parameters",
              description: "Please enter token ID and amounts"
            });
            return;
          }
          success = await increaseLiquidity(action.tokenId, action.amount0, action.amount1);
          break;
        case 'decrease':
          if (!action.tokenId || !action.liquidity) {
            toast({
              variant: "destructive",
              title: "Missing Parameters",
              description: "Please enter token ID and liquidity amount"
            });
            return;
          }
          success = await decreaseLiquidity(action.tokenId, action.liquidity);
          break;
        case 'collect':
          if (!action.tokenId) {
            toast({
              variant: "destructive",
              title: "Missing Token ID",
              description: "Please enter the position token ID"
            });
            return;
          }
          success = await collectFees(action.tokenId);
          break;
        case 'burn':
          if (!action.tokenId) {
            toast({
              variant: "destructive",
              title: "Missing Token ID",
              description: "Please enter the position token ID"
            });
            return;
          }
          success = await burnPosition(action.tokenId);
          break;
      }

      if (success) {
        // Reset form on success
        setAction({ type: action.type });
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  const ActionCard = ({ 
    icon: Icon, 
    title, 
    description, 
    actionType,
    variant = "default" 
  }: {
    icon: any;
    title: string;
    description: string;
    actionType: LiquidityAction['type'];
    variant?: "default" | "destructive";
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:scale-105 ${
        action.type === actionType 
          ? 'ring-2 ring-pink-500 bg-pink-50/10' 
          : 'hover:bg-white/5'
      }`}
      onClick={() => setAction({ type: actionType })}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${
            variant === "destructive" ? "text-red-400" : "text-pink-400"
          }`} />
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Uniswap V3 Liquidity Management
          </CardTitle>
          <CardDescription>
            Complete liquidity management for your KILT/ETH positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <Alert className="mb-6">
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to access liquidity management features
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="actions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="actions">Liquidity Actions</TabsTrigger>
              <TabsTrigger value="recovery">Fee Recovery</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ActionCard
                  icon={Plus}
                  title="Add Liquidity"
                  description="Create new KILT/ETH position"
                  actionType="add"
                />
                <ActionCard
                  icon={TrendingUp}
                  title="Increase Liquidity"
                  description="Add more tokens to position"
                  actionType="increase"
                />
                <ActionCard
                  icon={TrendingDown}
                  title="Decrease Liquidity"
                  description="Remove liquidity from position"
                  actionType="decrease"
                />
                <ActionCard
                  icon={DollarSign}
                  title="Collect Fees"
                  description="Harvest earned trading fees"
                  actionType="collect"
                />
                <ActionCard
                  icon={Flame}
                  title="Burn Position"
                  description="Close position completely"
                  actionType="burn"
                  variant="destructive"
                />
              </div>

              {action.type && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {action.type === 'add' && 'Add New Liquidity'}
                      {action.type === 'increase' && 'Increase Liquidity'}
                      {action.type === 'decrease' && 'Decrease Liquidity'}
                      {action.type === 'collect' && 'Collect Fees'}
                      {action.type === 'burn' && 'Burn Position'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(action.type === 'increase' || action.type === 'decrease' || 
                      action.type === 'collect' || action.type === 'burn') && (
                      <div className="space-y-2">
                        <Label htmlFor="tokenId">Position Token ID</Label>
                        <Input
                          id="tokenId"
                          placeholder="e.g. 3576733"
                          value={action.tokenId || ''}
                          onChange={(e) => setAction({...action, tokenId: e.target.value})}
                        />
                      </div>
                    )}

                    {(action.type === 'add' || action.type === 'increase') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount0">WETH Amount</Label>
                          <Input
                            id="amount0"
                            placeholder="0.001"
                            value={action.amount0 || ''}
                            onChange={(e) => setAction({...action, amount0: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount1">KILT Amount</Label>
                          <Input
                            id="amount1"
                            placeholder="100"
                            value={action.amount1 || ''}
                            onChange={(e) => setAction({...action, amount1: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    {action.type === 'decrease' && (
                      <div className="space-y-2">
                        <Label htmlFor="liquidity">Liquidity Amount to Remove</Label>
                        <Input
                          id="liquidity"
                          placeholder="Amount of liquidity to remove"
                          value={action.liquidity || ''}
                          onChange={(e) => setAction({...action, liquidity: e.target.value})}
                        />
                      </div>
                    )}

                    <Button 
                      onClick={handleLiquidityAction}
                      disabled={isProcessing || !isConnected}
                      className="w-full"
                    >
                      {isProcessing ? 'Processing...' : `${action.type.charAt(0).toUpperCase() + action.type.slice(1)} Liquidity`}
                    </Button>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This will prepare the transaction parameters. You'll need to confirm the actual transaction in your wallet.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recovery" className="space-y-4">
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  <strong>Fee Recovery Tool</strong><br />
                  If you have uncollected fees in closed positions, use this tool to recover them.
                  Your friend's position 3576733 has ~500 KILT + 0.0024 WETH stuck as uncollected fees.
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recoveryTokenId">Position Token ID</Label>
                    <Input
                      id="recoveryTokenId"
                      placeholder="3576733"
                      value={action.tokenId || ''}
                      onChange={(e) => setAction({...action, tokenId: e.target.value, type: 'collect'})}
                    />
                  </div>

                  <Button 
                    onClick={handleLiquidityAction}
                    disabled={isProcessing || !isConnected}
                    className="w-full"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Preparing Recovery...' : 'Recover Uncollected Fees'}
                  </Button>

                  <div className="text-sm text-gray-400 space-y-1">
                    <p><strong>Steps:</strong></p>
                    <p>1. Enter the position token ID</p>
                    <p>2. Click "Recover Uncollected Fees"</p>
                    <p>3. Confirm the transaction in your wallet</p>
                    <p>4. Tokens will appear in your wallet balance</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}