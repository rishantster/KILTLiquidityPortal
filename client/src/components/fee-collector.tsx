import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/wallet-context';
import { useLiquidityManager } from '@/hooks/use-liquidity-manager';

export function FeeCollector() {
  const [tokenId, setTokenId] = useState('');
  const [positionDetails, setPositionDetails] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { address: walletAddress, isConnected } = useWallet();
  const { toast } = useToast();
  const { isProcessing, collectFees } = useLiquidityManager();

  const checkPosition = async () => {
    if (!tokenId) {
      toast({
        variant: "destructive",
        title: "Missing Token ID",
        description: "Please enter a position token ID"
      });
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch(`/api/liquidity/position/${tokenId}/details`);
      if (response.ok) {
        const data = await response.json();
        setPositionDetails(data);
        
        if (data.hasUncollectedFees) {
          toast({
            title: "Uncollected Fees Found!",
            description: `Position ${tokenId} has fees ready to collect`
          });
        } else {
          toast({
            title: "No Uncollected Fees",
            description: `Position ${tokenId} has no fees to collect`
          });
        }
      } else {
        throw new Error('Position not found');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Checking Position",
        description: error instanceof Error ? error.message : "Failed to check position"
      });
      setPositionDetails(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCollectFees = async () => {
    if (!tokenId) {
      toast({
        variant: "destructive",
        title: "Missing Token ID",
        description: "Please enter a position token ID"
      });
      return;
    }

    const success = await collectFees(tokenId);
    
    if (success) {
      // Refresh position details after successful collection
      setTimeout(() => {
        checkPosition();
      }, 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Uniswap V3 Fee Collection Tool
          </CardTitle>
          <CardDescription>
            Recover uncollected fees from your Uniswap V3 positions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected && (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to collect fees from your positions
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tokenId">Position Token ID</Label>
              <div className="flex gap-2">
                <Input
                  id="tokenId"
                  placeholder="e.g. 3576733 (your friend's position)"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={checkPosition}
                  disabled={isChecking || !tokenId}
                  variant="outline"
                >
                  {isChecking ? 'Checking...' : 'Check'}
                </Button>
              </div>
            </div>

            {positionDetails && (
              <Card className="border-pink-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Position {tokenId}</h3>
                    <Badge variant={positionDetails.hasUncollectedFees ? "destructive" : "secondary"}>
                      {positionDetails.hasUncollectedFees ? 'Fees Available' : 'No Fees'}
                    </Badge>
                  </div>

                  {positionDetails.hasUncollectedFees && (
                    <div className="space-y-2 bg-pink-50/10 p-3 rounded-lg">
                      <h4 className="font-medium text-pink-400">Uncollected Fees:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-400">WETH:</span>
                          <span className="font-mono ml-2">
                            {positionDetails.uncollectedFees.token0Formatted} ETH
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">KILT:</span>
                          <span className="font-mono ml-2">
                            {positionDetails.uncollectedFees.token1Formatted} KILT
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Alert className={positionDetails.hasUncollectedFees ? "border-pink-200" : "border-gray-200"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {positionDetails.hasUncollectedFees 
                        ? "This position has uncollected trading fees that can be recovered to your wallet."
                        : "This position has no uncollected fees to collect."
                      }
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={handleCollectFees}
              disabled={isProcessing || !isConnected || !tokenId || (positionDetails && !positionDetails.hasUncollectedFees)}
              className="w-full"
              size="lg"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              {isProcessing ? 'Collecting Fees...' : 'Collect Uncollected Fees'}
            </Button>

            <div className="text-sm text-gray-400 space-y-1">
              <p><strong>How it works:</strong></p>
              <p>1. Enter the position token ID (NFT ID from Uniswap)</p>
              <p>2. Check if there are uncollected fees</p>
              <p>3. Click "Collect Fees" to recover tokens to your wallet</p>
              <p>4. Confirm the transaction in your wallet</p>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Friend's Position Recovery:</strong><br />
                Your friend can use position ID <code>3576733</code> to recover their ~500 KILT + 0.0024 WETH 
                that's stuck as uncollected fees in their closed position.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}