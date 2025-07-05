import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { Plus, Info } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function LiquidityProvision() {
  const [kiltAmount, setKiltAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addLiquidityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/positions', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Liquidity Added",
        description: "Your LP NFT position has been created successfully.",
      });
      setKiltAmount('');
      setEthAmount('');
      setMinPrice('');
      setMaxPrice('');
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add liquidity",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to add liquidity.",
        variant: "destructive",
      });
      return;
    }

    if (!kiltAmount || !ethAmount || !minPrice || !maxPrice) {
      toast({
        title: "Missing data",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    // Create user first if needed
    try {
      await apiRequest('POST', '/api/users', { address });
    } catch (error) {
      // User might already exist
    }

    const userData = await apiRequest('GET', `/api/users/${address}`);
    const user = await userData.json();

    const positionData = {
      userId: user.id,
      nftId: Math.floor(Math.random() * 10000) + 1000,
      poolAddress: "0x1234567890123456789012345678901234567890",
      tokenIds: JSON.stringify({ kilt: kiltAmount, eth: ethAmount }),
      minPrice,
      maxPrice,
      liquidity: (parseFloat(kiltAmount) * parseFloat(ethAmount)).toString(),
    };

    addLiquidityMutation.mutate(positionData);
  };

  const setMaxKilt = () => setKiltAmount('1250.00');
  const setMaxEth = () => setEthAmount('0.847');
  const setFullRange = () => {
    setMinPrice('0.0012');
    setMaxPrice('0.0018');
  };

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5 text-kilt-500" />
          <span>Add Liquidity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kilt-amount">KILT Amount</Label>
              <div className="relative">
                <Input
                  id="kilt-amount"
                  type="number"
                  placeholder="0.0"
                  value={kiltAmount}
                  onChange={(e) => setKiltAmount(e.target.value)}
                  className="pr-20"
                />
                <div className="absolute right-3 top-2.5 flex items-center space-x-2">
                  <span className="text-sm text-slate-400">KILT</span>
                  <div className="w-5 h-5 kilt-gradient rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Balance: 1,250.00 KILT</span>
                <button
                  type="button"
                  onClick={setMaxKilt}
                  className="text-kilt-500 hover:text-kilt-400"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eth-amount">ETH Amount</Label>
              <div className="relative">
                <Input
                  id="eth-amount"
                  type="number"
                  placeholder="0.0"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  className="pr-20"
                />
                <div className="absolute right-3 top-2.5 flex items-center space-x-2">
                  <span className="text-sm text-slate-400">ETH</span>
                  <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Balance: 0.847 ETH</span>
                <button
                  type="button"
                  onClick={setMaxEth}
                  className="text-kilt-500 hover:text-kilt-400"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Price Range</Label>
                <button
                  type="button"
                  onClick={setFullRange}
                  className="text-kilt-500 hover:text-kilt-400 text-sm"
                >
                  Full Range
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="min-price" className="text-xs text-slate-400">Min Price</Label>
                  <Input
                    id="min-price"
                    type="number"
                    placeholder="0.0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="max-price" className="text-xs text-slate-400">Max Price</Label>
                  <Input
                    id="max-price"
                    type="number"
                    placeholder="0.0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-slate-600 border-slate-500">
              <CardContent className="p-4">
                <h3 className="font-medium text-white mb-3">Position Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pool Share</span>
                    <span className="text-white">0.0847%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Price</span>
                    <span className="text-white">0.00142 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. APR</span>
                    <span className="text-emerald-500">47.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Network Fee</span>
                    <span className="text-slate-300">~$2.50</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-kilt-500/10 to-purple-500/10 border-kilt-500/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="h-4 w-4 text-kilt-500" />
                  <span className="text-kilt-500 font-medium">LP NFT Position</span>
                </div>
                <p className="text-sm text-slate-300">
                  Your liquidity will be represented as an NFT position. This NFT will track your rewards and must be held to earn KILT incentives.
                </p>
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full kilt-gradient hover:from-kilt-600 hover:to-kilt-700"
              disabled={addLiquidityMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {addLiquidityMutation.isPending ? 'Adding Liquidity...' : 'Add Liquidity'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
