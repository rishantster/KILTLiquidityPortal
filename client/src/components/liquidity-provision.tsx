import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { Plus, Info } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useKiltTokenData } from '@/hooks/use-kilt-data';

export function LiquidityProvision() {
  const [kiltAmount, setKiltAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [positionSizePercent, setPositionSizePercent] = useState([25]);
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: kiltData } = useKiltTokenData();

  // Mock user balances (in real app, these would come from wallet)
  const kiltBalance = 1250.00;
  const ethBalance = 0.847;

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

  // Helper functions for percentage-based amounts
  const calculateKiltFromPercent = (percent: number) => {
    return ((kiltBalance * percent) / 100).toFixed(2);
  };

  const calculateEthFromPercent = (percent: number) => {
    return ((ethBalance * percent) / 100).toFixed(4);
  };

  const setMaxKilt = () => setKiltAmount(kiltBalance.toString());
  const setMaxEth = () => setEthAmount(ethBalance.toString());
  const setFullRange = () => {
    const currentPrice = kiltData?.price || 0.0289;
    setMinPrice((currentPrice * 0.8).toFixed(6)); // 20% below current
    setMaxPrice((currentPrice * 1.2).toFixed(6)); // 20% above current
  };

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    setPositionSizePercent(value);
    const percent = value[0];
    setKiltAmount(calculateKiltFromPercent(percent));
    setEthAmount(calculateEthFromPercent(percent));
  };

  // Handle manual input changes
  const handleKiltChange = (value: string) => {
    setKiltAmount(value);
    const amount = parseFloat(value) || 0;
    const percent = Math.min((amount / kiltBalance) * 100, 100);
    setPositionSizePercent([percent]);
  };

  const handleEthChange = (value: string) => {
    setEthAmount(value);
    const amount = parseFloat(value) || 0;
    const percent = Math.min((amount / ethBalance) * 100, 100);
    setPositionSizePercent([percent]);
  };

  return (
    <Card className="cluely-card rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-white font-heading text-lg">
          <Plus className="h-4 w-4 text-blue-400" />
          <span>Add Liquidity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Position Size Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white font-heading text-sm">Position Size</Label>
              <span className="text-blue-400 font-medium text-sm">{positionSizePercent[0].toFixed(0)}%</span>
            </div>
            
            <div className="space-y-2">
              <Slider
                value={positionSizePercent}
                onValueChange={handleSliderChange}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              
              {/* Key percentage buttons */}
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleSliderChange([0])}
                  className="text-white/60 hover:text-white transition-colors font-body"
                >
                  0%
                </button>
                <button
                  type="button"
                  onClick={() => handleSliderChange([25])}
                  className="text-white/60 hover:text-white transition-colors font-body"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handleSliderChange([75])}
                  className="text-white/60 hover:text-white transition-colors font-body"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => handleSliderChange([100])}
                  className="text-white/60 hover:text-white transition-colors font-body"
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* KILT Amount */}
          <div className="space-y-2">
            <Label className="text-white font-heading text-sm">KILT Amount</Label>
            <div className="relative">
              <Input
                type="number"
                value={kiltAmount}
                onChange={(e) => handleKiltChange(e.target.value)}
                placeholder="0.0"
                step="0.01"
                className="cluely-button h-10 pl-3 pr-16 text-white placeholder:text-white/40"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <span className="text-white/60 font-body text-sm">KILT</span>
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60 font-body">Balance: {kiltBalance.toFixed(2)} KILT</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={setMaxKilt}
                className="text-blue-400 hover:text-blue-300 font-body text-xs h-auto p-0"
              >
                Max
              </Button>
            </div>
          </div>

          {/* ETH Amount */}
          <div className="space-y-2">
            <Label className="text-white font-heading text-sm">ETH Amount</Label>
            <div className="relative">
              <Input
                type="number"
                value={ethAmount}
                onChange={(e) => handleEthChange(e.target.value)}
                placeholder="0.0"
                step="0.001"
                className="cluely-button h-10 pl-3 pr-16 text-white placeholder:text-white/40"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <span className="text-white/60 font-body text-sm">ETH</span>
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60 font-body">Balance: {ethBalance.toFixed(3)} ETH</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={setMaxEth}
                className="text-blue-400 hover:text-blue-300 font-body text-xs h-auto p-0"
              >
                Max
              </Button>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white font-heading text-sm">Price Range</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={setFullRange}
                className="text-blue-400 hover:text-blue-300 font-body text-xs h-auto p-0"
              >
                Full Range
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-white/60 text-xs font-body">Min Price</Label>
                <Input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0.0"
                  step="0.000001"
                  className="cluely-button h-9 text-white placeholder:text-white/40 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs font-body">Max Price</Label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="0.0"
                  step="0.000001"
                  className="cluely-button h-9 text-white placeholder:text-white/40 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-10 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-heading rounded-xl text-sm"
              disabled={!isConnected || addLiquidityMutation.isPending}
            >
              {addLiquidityMutation.isPending ? 'Adding Liquidity...' : 'Add Liquidity'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
