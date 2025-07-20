import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Zap, 
  CreditCard, 
  ArrowUpDown, 
  Shield, 
  Users, 
  Sparkles,
  Brain,
  TrendingUp,
  Globe,
  Mail,
  Smartphone,
  CheckCircle2,
  Info,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { useReownFeatures, useGasSponsorship, useOnRamp, useSwaps } from '@/services/reown-features-service';
import { useToast } from '@/hooks/use-toast';

export function ReownFeaturesShowcase() {
  const { isConnected, address } = useWallet();
  const { features, enabledFeatures } = useReownFeatures();
  const { checkEligibility, sponsorTransaction } = useGasSponsorship();
  const { getProviders } = useOnRamp();
  const { getQuote, executeSwap } = useSwaps();
  const { toast } = useToast();

  const [activeFeature, setActiveFeature] = useState('gasSponsorship');
  const [gasEligible, setGasEligible] = useState<boolean | null>(null);
  const [onRampProviders, setOnRampProviders] = useState<any[]>([]);
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load feature data when component mounts
  useEffect(() => {
    if (isConnected && address) {
      loadFeatureData();
    }
  }, [isConnected, address]);

  const loadFeatureData = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Check gas sponsorship eligibility
      const eligible = await checkEligibility(address, {});
      setGasEligible(eligible);

      // Load on-ramp providers
      const providers = await getProviders();
      setOnRampProviders(providers);

      // Get sample swap quote
      const quote = await getQuote('ETH', 'KILT', '0.1');
      setSwapQuote(quote);

      // Load user analytics
      const analytics = await features.getUserAnalytics(address);
      setUserAnalytics(analytics);
    } catch (error) {
      console.error('Error loading feature data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGasSponsorship = async () => {
    if (!address) return;

    try {
      setLoading(true);
      const sponsored = await sponsorTransaction(address, {
        to: '0x...',
        data: '0x...',
        value: '0'
      });
      
      toast({
        title: "Gas Sponsorship Applied! ⚡",
        description: sponsored.message,
      });
    } catch (error: any) {
      toast({
        title: "Gas Sponsorship Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOnRampClick = (provider: any) => {
    window.open(provider.url, '_blank');
    toast({
      title: `Opening ${provider.name}`,
      description: "Complete your crypto purchase securely",
    });
  };

  const handleSwapDemo = async () => {
    if (!swapQuote) return;

    try {
      setLoading(true);
      const result = await executeSwap(swapQuote);
      
      toast({
        title: "Swap Demo Executed! 🔄",
        description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
      });
    } catch (error: any) {
      toast({
        title: "Swap Demo Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="bg-black/40 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Enhanced Features Awaiting</h3>
          <p className="text-gray-400 text-sm">
            Connect your wallet to unlock advanced Reown AppKit features including gas sponsorship, 
            crypto purchases, token swaps, and smart account capabilities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-pink-400 mr-3" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Enhanced with Reown AppKit
          </h2>
        </div>
        <p className="text-gray-400 text-sm mb-2">
          Advanced DeFi features powered by next-generation wallet infrastructure
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {enabledFeatures.map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs border-blue-600 text-blue-400 bg-blue-500/10">
              {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </Badge>
          ))}
        </div>
      </div>

      <Tabs value={activeFeature} onValueChange={setActiveFeature}>
        <TabsList className="grid w-full grid-cols-4 bg-black/40 backdrop-blur-sm">
          <TabsTrigger value="gasSponsorship" className="text-xs">
            <Zap className="h-4 w-4 mr-1" />
            Gas Sponsor
          </TabsTrigger>
          <TabsTrigger value="onRamp" className="text-xs">
            <CreditCard className="h-4 w-4 mr-1" />
            Buy Crypto
          </TabsTrigger>
          <TabsTrigger value="swaps" className="text-xs">
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Swaps
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            <TrendingUp className="h-4 w-4 mr-1" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Gas Sponsorship Tab */}
        <TabsContent value="gasSponsorship" className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-400">
                <Zap className="h-5 w-5 mr-2" />
                Gas Sponsorship
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Eligibility Status</p>
                    <p className="text-gray-400 text-sm">Daily transaction limit: 10</p>
                  </div>
                  <div className="text-right">
                    {gasEligible === null ? (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Checking
                      </Badge>
                    ) : gasEligible ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Eligible
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Limit Reached
                      </Badge>
                    )}
                  </div>
                </div>

                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-blue-200">
                    KILT treasury sponsors your transaction gas fees! Save ~$0.02 per transaction on Base network.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-black/30 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Transactions Today</p>
                    <p className="text-white font-bold text-lg">2 / 10</p>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Gas Saved</p>
                    <p className="text-green-400 font-bold text-lg">$0.04</p>
                  </div>
                </div>

                <Button 
                  onClick={handleGasSponsorship}
                  disabled={!gasEligible || loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Test Gas Sponsorship
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* On-Ramp Tab */}
        <TabsContent value="onRamp" className="space-y-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-green-400">
                <CreditCard className="h-5 w-5 mr-2" />
                Buy Crypto with Fiat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-green-500/50 bg-green-500/10">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-green-200">
                    Purchase ETH, USDC, and other tokens directly with credit/debit card or bank transfer.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-3">
                  {onRampProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleOnRampClick(provider)}
                      className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{provider.icon}</span>
                        <div className="text-left">
                          <p className="text-white font-medium">{provider.name}</p>
                          <p className="text-gray-400 text-sm">Fees: {provider.fees}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {provider.supported.join(', ')}
                        </Badge>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-black/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Purchase Limits:</span>
                    <span className="text-white">$10 - $10,000</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400">Processing Time:</span>
                    <span className="text-white">Instant - 30 minutes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Swaps Tab */}
        <TabsContent value="swaps" className="space-y-4">
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-400">
                <ArrowUpDown className="h-5 w-5 mr-2" />
                Token Swaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {swapQuote && (
                  <div className="p-4 bg-black/30 rounded-lg border border-purple-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Sample Quote: ETH → KILT</h4>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {swapQuote.provider}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">You Pay</p>
                        <p className="text-white font-bold">{swapQuote.amountIn} {swapQuote.tokenIn}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">You Receive</p>
                        <p className="text-white font-bold">{swapQuote.amountOut} {swapQuote.tokenOut}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-400">Rate:</span>
                      <span className="text-white">1 ETH = {swapQuote.rate.toFixed(2)} KILT</span>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-400">Slippage:</span>
                      <span className="text-green-400">{swapQuote.slippage}</span>
                    </div>

                    <Button 
                      onClick={handleSwapDemo}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Executing Demo
                        </>
                      ) : (
                        <>
                          <ArrowUpDown className="h-4 w-4 mr-2" />
                          Execute Demo Swap
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <Alert className="border-purple-500/50 bg-purple-500/10">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-purple-200">
                    Swap between 1000+ tokens with best price routing across multiple DEXs.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-emerald-400">
                <TrendingUp className="h-5 w-5 mr-2" />
                User Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userAnalytics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-black/30 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">Total Transactions</p>
                      <p className="text-white font-bold text-xl">{userAnalytics.totalTransactions}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">Gas Sponsored</p>
                      <p className="text-green-400 font-bold text-xl">{userAnalytics.gasSponsored}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">Total Volume</p>
                      <p className="text-white font-bold text-xl">${userAnalytics.totalVolume}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">Avg Gas Price</p>
                      <p className="text-blue-400 font-bold text-xl">${userAnalytics.averageGasPrice}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-black/30 rounded-lg">
                    <p className="text-gray-400 text-sm mb-2">Favorite Tokens</p>
                    <div className="flex space-x-2">
                      {userAnalytics.favoriteTokens.map((token: string) => (
                        <Badge key={token} variant="outline" className="text-emerald-400 border-emerald-500/30">
                          {token}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Alert className="border-emerald-500/50 bg-emerald-500/10">
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription className="text-emerald-200">
                      <strong>Carbon Offset:</strong> {userAnalytics.carbonFootprint} - Your transactions are climate positive!
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <Button 
          onClick={loadFeatureData}
          variant="outline" 
          size="sm"
          disabled={loading}
          className="border-gray-600 hover:border-pink-500/50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Feature Data
        </Button>
      </div>
    </div>
  );
}