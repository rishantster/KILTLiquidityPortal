import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, DollarSign, Coins } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export function FeeCollector() {
  const [tokenId, setTokenId] = useState('3576733');
  const [isCollecting, setIsCollecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState('0xcd9e4Df3b05e1006B7DC933dE2234b397cd2aD22');
  const { toast } = useToast();

  const handleCollectFees = async () => {
    if (!tokenId || !walletAddress) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both wallet address and position token ID"
      });
      return;
    }

    setIsCollecting(true);
    
    try {
      // This would connect to the user's wallet and call the collect function
      toast({
        title: "Collect Fees Instructions",
        description: "Connect your wallet and go to the Positions tab. Find your closed position and click 'Collect Fees' to retrieve your uncollected tokens.",
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Collection Failed",
        description: error instanceof Error ? error.message : "Failed to collect fees"
      });
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fee Recovery Tool
          </CardTitle>
          <CardDescription>
            Collect uncollected fees from closed Uniswap V3 positions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Found uncollected fees in position 3576733:</strong>
              <br />
              • ~500 KILT tokens
              <br />
              • ~0.0024 WETH
              <br />
              These tokens are not lost - they're sitting as uncollected fees!
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet Address</Label>
              <Input
                id="wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenId">Position Token ID</Label>
              <Input
                id="tokenId"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="3576733"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Recovery Steps:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <span>Connect your wallet to this app</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                <span>Go to the "Positions" tab</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                <span>Toggle "Show closed positions" if needed</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                <span>Find position 3576733 and click "Collect Fees"</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">5</Badge>
                <span>Confirm the transaction to recover your tokens</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCollectFees}
            disabled={isCollecting}
            className="w-full"
          >
            <Coins className="mr-2 h-4 w-4" />
            {isCollecting ? 'Collecting...' : 'Get Recovery Instructions'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}