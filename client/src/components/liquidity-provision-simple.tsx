import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Info, AlertCircle } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';

export function LiquidityProvisionSimple() {
  const { address } = useWallet();
  const [kiltAmount, setKiltAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-heading text-2xl flex items-center gap-2">
            <Plus className="h-6 w-6" />
            Add Liquidity
          </h2>
          <p className="text-white/70 text-sm mt-1">
            Choose the tokens you want to provide liquidity for.
          </p>
        </div>
      </div>

      {/* Pool Information */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">KILT/ETH Pool</CardTitle>
          <p className="text-white/70 text-sm">
            Add liquidity to the existing KILT/ETH 0.3% fee tier pool
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-gray-800">
                  <span className="text-white font-bold text-sm">Ξ</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center border-2 border-gray-800">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
              </div>
              <div>
                <div className="text-white font-medium">KILT/ETH</div>
                <div className="text-white/60 text-sm">0.3% Fee Tier</div>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-0">Active Pool</Badge>
          </div>
        </CardContent>
      </Card>





      {/* Set Price Range */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">Set price range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="default" className="bg-emerald-500/20 border-emerald-500/30 text-emerald-300">
              Full range
            </Button>
            <Button variant="outline" className="border-white/20 hover:bg-white/10">
              Custom range
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-white/70 text-sm">Min price</label>
              <Input
                type="number"
                value="0"
                className="bg-white/5 border-white/10 text-white text-2xl font-light h-16"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <label className="text-white/70 text-sm">Max price</label>
              <Input
                type="number"
                value="∞"
                className="bg-white/5 border-white/10 text-white text-2xl font-light h-16"
                readOnly
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Tokens */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">Deposit tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="0"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-4xl font-light h-20"
            />
            <div className="flex items-center justify-between">
              <div className="text-white/60 text-sm">0.044 ETH</div>
              <Badge className="bg-blue-500/20 text-blue-300 border-0">ETH</Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="0"
              value={kiltAmount}
              onChange={(e) => setKiltAmount(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-4xl font-light h-20"
            />
            <div className="flex items-center justify-between">
              <div className="text-white/60 text-sm">0 KILT</div>
              <Badge className="bg-purple-500/20 text-purple-300 border-0">KILT</Badge>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full border-white/20 hover:bg-white/10 h-12"
            disabled
          >
            Enter an amount
          </Button>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <Button
        size="lg"
        disabled
        className="w-full bg-white/10 hover:bg-white/20 text-white border-0 h-14 text-lg font-medium rounded-2xl"
      >
        Continue
      </Button>
    </div>
  );
}