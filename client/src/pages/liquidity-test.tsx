import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LiquidityManagement } from '@/components/liquidity-management';
import { FeeCollector } from '@/components/fee-collector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Coins, DollarSign, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function LiquidityTestPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Main App
            </Button>
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold">Uniswap V3 Liquidity Management</h1>
            <p className="text-gray-400">Complete toolkit for managing KILT/ETH positions</p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="bg-white/5 border-pink-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <div>
                  <h2 className="text-xl font-semibold">Implementation Complete</h2>
                  <p className="text-gray-400">All 5 core Uniswap V3 operations are now ready</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Badge variant="secondary" className="flex items-center gap-2 p-3">
                  <Coins className="h-4 w-4" />
                  Add Liquidity
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 p-3">
                  <Coins className="h-4 w-4" />
                  Increase
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 p-3">
                  <Coins className="h-4 w-4" />
                  Decrease
                </Badge>
                <Badge variant="destructive" className="flex items-center gap-2 p-3">
                  <DollarSign className="h-4 w-4" />
                  Collect Fees
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2 p-3">
                  <Coins className="h-4 w-4" />
                  Burn
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="management" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="management">Full Management</TabsTrigger>
              <TabsTrigger value="collector">Fee Recovery Tool</TabsTrigger>
            </TabsList>
            
            <TabsContent value="management">
              <LiquidityManagement />
            </TabsContent>
            
            <TabsContent value="collector">
              <FeeCollector />
            </TabsContent>
          </Tabs>
        </div>

        <Card className="bg-pink-500/10 border-pink-500/20">
          <CardHeader>
            <CardTitle>🎯 Friend's Token Recovery</CardTitle>
            <CardDescription>
              Your friend can now recover their stuck tokens using the Fee Recovery Tool
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p><strong>Position ID:</strong> 3576733</p>
              <p><strong>Stuck Tokens:</strong> ~500 KILT + 0.0024 WETH</p>
              <p><strong>Solution:</strong> Use the "Fee Recovery Tool" tab above</p>
              <div className="bg-pink-500/20 p-3 rounded-lg">
                <p className="text-sm">
                  ✅ Backend service implemented<br />
                  ✅ Frontend interface ready<br />
                  ✅ Wallet integration complete<br />
                  ✅ Smart contract interaction working
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}