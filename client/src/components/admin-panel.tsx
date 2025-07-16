import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  DollarSign, 
  Timer, 
  Calendar, 
  ShieldCheck,
  Settings,
  History,
  AlertCircle,
  TrendingUp,
  Users,
  Wallet,
  Activity,
  LogOut,
  ExternalLink,
  Code2,
  Zap,
  Globe,
  Lock,
  Copy,
  CheckCircle,
  Database,
  Network
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { apiRequest } from '@/lib/queryClient';

interface AdminStats {
  treasury: {
    balance: number;
    address: string;
    programBudget: number;
    dailyRewardsCap: number;
    programDuration: number;
    isActive: boolean;
    totalDistributed: number;
    treasuryRemaining: number;
  };
  settings: {
    maxLiquidityBoost: number;
    minimumPositionValue: number;
    lockPeriod: number;
    inRangeRequirement: boolean;
  };
  operationHistory: any[];
}

interface BlockchainConfig {
  kiltTokenAddress: string;
  wethTokenAddress: string;
  poolAddress: string;
  poolFeeRate: number;
  networkId: number;
  isActive: boolean;
}

export function AdminPanel() {
  const queryClient = useQueryClient();
  const { address, isConnected, connect, disconnect } = useWallet();
  
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem('admin-token')
  );
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Treasury configuration form
  const [treasuryConfigForm, setTreasuryConfigForm] = useState({
    treasuryWalletAddress: '',
    programBudget: 500000,
    programDuration: 90,
    programStartDate: '2025-07-16',
    programEndDate: '2025-10-14',
    isActive: true
  });

  // Program settings form
  const [programSettingsForm, setProgramSettingsForm] = useState({
    maxLiquidityBoost: 0.6,
    minimumPositionValue: 10,
    lockPeriod: 7,
    inRangeRequirement: true
  });

  // Blockchain configuration form
  const [blockchainConfigForm, setBlockchainConfigForm] = useState({
    kiltTokenAddress: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
    wethTokenAddress: '0x4200000000000000000000000000000000000006',
    poolAddress: '0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb',
    poolFeeRate: 3000,
    networkId: 8453,
    isActive: true
  });

  // Check if wallet is authorized
  useEffect(() => {
    if (address) {
      const authorizedWallets = [
        '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
        '0x861722f739539CF31d86F1221460Fa96C9baB95C'
      ];
      setIsAuthorized(authorizedWallets.some(wallet => 
        wallet.toLowerCase() === address.toLowerCase()
      ));
    }
  }, [address]);

  // Admin stats query
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: !!adminToken,
    refetchInterval: 30000
  });

  // Blockchain config query
  const { data: blockchainConfig } = useQuery<BlockchainConfig>({
    queryKey: ['/api/admin/blockchain-config'],
    enabled: !!adminToken
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      console.log('Mutation executing with address:', address);
      if (!address) {
        throw new Error('No wallet address available');
      }
      const response = await apiRequest('/api/admin/login-wallet', {
        method: 'POST',
        data: { walletAddress: address }
      });
      return response;
    },
    onSuccess: (data) => {
      console.log('Login successful:', data);
      setAdminToken(data.token);
      localStorage.setItem('admin-token', data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error) => {
      console.error('Login error:', error);
    }
  });

  // Treasury config mutation
  const treasuryConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/treasury/config', {
        method: 'POST',
        data: treasuryConfigForm
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    }
  });

  // Program settings mutation
  const settingsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/settings', {
        method: 'POST',
        data: programSettingsForm
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    }
  });

  // Blockchain config mutation
  const blockchainConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/blockchain-config', {
        method: 'POST',
        data: blockchainConfigForm
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blockchain-config'] });
    }
  });

  // Update forms when data loads
  useEffect(() => {
    if (adminStats) {
      setTreasuryConfigForm({
        treasuryWalletAddress: adminStats.treasury.address || '',
        programBudget: adminStats.treasury.programBudget || 500000,
        programDuration: adminStats.treasury.programDuration || 90,
        programStartDate: '2025-07-16',
        programEndDate: '2025-10-14',
        isActive: adminStats.treasury.isActive
      });
      setProgramSettingsForm({
        maxLiquidityBoost: adminStats.settings.maxLiquidityBoost || 0.6,
        minimumPositionValue: adminStats.settings.minimumPositionValue || 10,
        lockPeriod: adminStats.settings.lockPeriod || 7,
        inRangeRequirement: adminStats.settings.inRangeRequirement
      });
    }
  }, [adminStats]);

  useEffect(() => {
    if (blockchainConfig) {
      setBlockchainConfigForm(blockchainConfig);
    }
  }, [blockchainConfig]);

  const handleLogin = async () => {
    console.log('Login attempt with state:', { isConnected, isAuthorized, address });
    if (!isConnected || !isAuthorized || !address) {
      console.error('Login requirements not met:', { isConnected, isAuthorized, address });
      return;
    }
    try {
      console.log('Attempting login with address:', address);
      await loginMutation.mutateAsync();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin-token');
    disconnect();
  };

  const handleTreasuryConfigUpdate = async () => {
    await treasuryConfigMutation.mutateAsync();
  };

  const handleSettingsUpdate = async () => {
    await settingsMutation.mutateAsync();
  };

  const handleBlockchainConfigUpdate = async () => {
    await blockchainConfigMutation.mutateAsync();
  };

  // Login UI
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Glassmorphism Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.1),rgba(255,255,255,0))]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_80%_80%,rgba(16,185,129,0.05),rgba(255,255,255,0))]"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Admin Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-emerald-400/10 border-emerald-400/30">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <AlertDescription className="text-gray-300">
                  Connect with your authorized admin wallet to access the admin panel.
                </AlertDescription>
              </Alert>
              
              {!isConnected ? (
                <Button 
                  onClick={connect} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 backdrop-blur-sm border border-emerald-400/30 transition-all duration-200"
                >
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                  {isAuthorized ? (
                    <Badge variant="default" className="bg-emerald-600/20 border-emerald-400/30 text-emerald-300">
                      Authorized Wallet
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-600/20 border-red-400/30 text-red-300">
                      Unauthorized Wallet
                    </Badge>
                  )}
                </div>
              )}

              <Button 
                onClick={handleLogin} 
                disabled={loginMutation.isPending || !isConnected || !isAuthorized}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 backdrop-blur-sm border border-emerald-400/30 transition-all duration-200"
              >
                {loginMutation.isPending ? 'Authenticating...' : 'Login'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Admin Panel UI
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Ultra-Modern Glassmorphism Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_120%_at_30%_-20%,rgba(16,185,129,0.2),rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_120%_at_70%_80%,rgba(56,189,248,0.15),rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(16,185,129,0.08),rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_20%,rgba(236,72,153,0.1),rgba(255,255,255,0))]"></div>
      </div>
      
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Premium Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-emerald-400/40 shadow-2xl shadow-emerald-500/20">
                  <Shield className="w-9 h-9 text-white drop-shadow-lg" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-black"></div>
              </div>
              <div className="space-y-2">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  KILT Admin Panel
                </h1>
                <p className="text-gray-400 text-lg">Advanced DeFi Treasury Management System</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Network className="w-4 h-4" />
                  <span>Base Network</span>
                  <span className="mx-2">•</span>
                  <Globe className="w-4 h-4" />
                  <span>Mainnet</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="px-6 py-3 bg-emerald-500/20 backdrop-blur-xl border border-emerald-400/40 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="space-y-1">
                    <p className="text-emerald-300 text-sm font-medium">Wallet Authenticated</p>
                    <p className="text-emerald-400/70 text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleLogout}
                className="bg-red-500/20 backdrop-blur-xl border border-red-400/40 text-red-300 hover:bg-red-500/30 hover:border-red-400/60 transition-all duration-300 px-6 py-3 rounded-2xl group"
              >
                <LogOut className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                Logout
              </Button>
            </div>
          </div>

          {/* Premium Stats Overview */}
          {statsLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-emerald-400 text-xl">Loading admin data...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Program Budget */}
              <Card className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl hover:scale-105 transition-all duration-300 group">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/70 text-base mb-2">Treasury Budget</p>
                  <p className="text-white font-bold text-3xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {((adminStats?.treasury?.programBudget || 500000) / 1000000).toFixed(1)}M KILT
                  </p>
                  <p className="text-white/40 text-sm mt-2">Total Allocation</p>
                </CardContent>
              </Card>

              {/* Daily Budget */}
              <Card className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl hover:scale-105 transition-all duration-300 group">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300">
                    <Timer className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/70 text-base mb-2">Daily Distribution</p>
                  <p className="text-white font-bold text-3xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {(adminStats?.treasury?.dailyRewardsCap || 5556).toFixed(0)} KILT
                  </p>
                  <p className="text-white/40 text-sm mt-2">Per Day</p>
                </CardContent>
              </Card>

              {/* Program Duration */}
              <Card className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl hover:scale-105 transition-all duration-300 group">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/70 text-base mb-2">Program Duration</p>
                  <p className="text-white font-bold text-3xl bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                    {adminStats?.treasury?.programDuration || 90} days
                  </p>
                  <p className="text-white/40 text-sm mt-2">Total Period</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ultra-Modern Tab Navigation */}
          <Tabs defaultValue="program-config" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl h-20 p-2 mb-8">
              <TabsTrigger 
                value="program-config" 
                className="text-white data-[state=active]:bg-emerald-600/40 data-[state=active]:text-emerald-200 data-[state=active]:shadow-2xl data-[state=active]:shadow-emerald-500/30 font-medium rounded-2xl transition-all duration-300 px-6 py-4 hover:bg-emerald-600/20 flex items-center gap-3"
              >
                <Settings className="w-5 h-5" />
                <span className="text-lg">Program Configuration</span>
              </TabsTrigger>
              <TabsTrigger 
                value="blockchain-config" 
                className="text-white data-[state=active]:bg-blue-600/40 data-[state=active]:text-blue-200 data-[state=active]:shadow-2xl data-[state=active]:shadow-blue-500/30 font-medium rounded-2xl transition-all duration-300 px-6 py-4 hover:bg-blue-600/20 flex items-center gap-3"
              >
                <Database className="w-5 h-5" />
                <span className="text-lg">Blockchain Configuration</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-white data-[state=active]:bg-purple-600/40 data-[state=active]:text-purple-200 data-[state=active]:shadow-2xl data-[state=active]:shadow-purple-500/30 font-medium rounded-2xl transition-all duration-300 px-6 py-4 hover:bg-purple-600/20 flex items-center gap-3"
              >
                <History className="w-5 h-5" />
                <span className="text-lg">Operation History</span>
              </TabsTrigger>
            </TabsList>

            {/* Program Configuration Tab */}
            <TabsContent value="program-config" className="space-y-8 mt-8">
              {/* Current Formula Display */}
              <Card className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                      <Code2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl">Current Reward Formula</span>
                  </CardTitle>
                  <div className="text-gray-400 text-lg">
                    Mathematical implementation of the reward distribution system
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/20">
                    <div className="font-mono text-emerald-300 text-lg mb-4">
                      R_u = (L_u/L_T) × (1 + ((D_u/P)×b_time)) × IRM × FRB × (R/P)
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="text-gray-400">Where:</div>
                        <div className="text-white">R_u = Daily user rewards</div>
                        <div className="text-white">L_u = User liquidity share</div>
                        <div className="text-white">L_T = Total pool liquidity</div>
                        <div className="text-white">D_u = Days position active</div>
                        <div className="text-white">P = Program duration</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-gray-400">Parameters:</div>
                        <div className="text-white">b_time = Time boost weight ({adminStats?.settings?.maxLiquidityBoost || 0.6})</div>
                        <div className="text-white">IRM = In-range multiplier ({adminStats?.settings?.inRangeRequirement ? '1.0' : '0.0'})</div>
                        <div className="text-white">FRB = Full range bonus (1.2x)</div>
                        <div className="text-white">R = Total reward pool</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl">
                <CardHeader className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl">Program Configuration</span>
                  </CardTitle>
                  <div className="text-gray-400 text-lg">
                    Configure treasury settings and reward formula parameters
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <Alert className="bg-emerald-400/10 border-emerald-400/30 rounded-2xl">
                    <Shield className="h-5 w-5 text-emerald-400" />
                    <AlertDescription className="text-emerald-200 text-lg">
                      Treasury operations are secure and do not require private keys. All configurations are wallet-based.
                    </AlertDescription>
                  </Alert>

                  {/* Treasury Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Treasury Configuration</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="programBudget" className="text-white">Program Budget (KILT)</Label>
                        <Input
                          id="programBudget"
                          type="number"
                          value={treasuryConfigForm.programBudget}
                          onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programBudget: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                          placeholder="500000"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="programDuration" className="text-white">Program Duration (Days)</Label>
                        <Input
                          id="programDuration"
                          type="number"
                          value={treasuryConfigForm.programDuration}
                          onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programDuration: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                          placeholder="90"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleTreasuryConfigUpdate}
                      disabled={treasuryConfigMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 backdrop-blur-sm border border-emerald-400/30 transition-all duration-200"
                    >
                      {treasuryConfigMutation.isPending ? 'Updating...' : 'Update Treasury Configuration'}
                    </Button>
                  </div>

                  {/* Program Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Formula Parameters</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="maxLiquidityBoost" className="text-white">Max Liquidity Boost</Label>
                        <Input
                          id="maxLiquidityBoost"
                          type="number"
                          step="0.1"
                          value={programSettingsForm.maxLiquidityBoost}
                          onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, maxLiquidityBoost: parseFloat(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                          placeholder="0.6"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="minimumPositionValue" className="text-white">Minimum Position Value ($)</Label>
                        <Input
                          id="minimumPositionValue"
                          type="number"
                          value={programSettingsForm.minimumPositionValue}
                          onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, minimumPositionValue: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                          placeholder="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="lockPeriod" className="text-white">Lock Period (Days)</Label>
                        <Input
                          id="lockPeriod"
                          type="number"
                          value={programSettingsForm.lockPeriod}
                          onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, lockPeriod: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                          placeholder="7"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="inRangeRequirement"
                          checked={programSettingsForm.inRangeRequirement}
                          onCheckedChange={(checked) => setProgramSettingsForm({ ...programSettingsForm, inRangeRequirement: checked })}
                        />
                        <Label htmlFor="inRangeRequirement" className="text-white">In-Range Requirement</Label>
                      </div>
                    </div>

                    <Button
                      onClick={handleSettingsUpdate}
                      disabled={settingsMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 backdrop-blur-sm border border-blue-400/30 transition-all duration-200"
                    >
                      {settingsMutation.isPending ? 'Updating...' : 'Update Program Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Blockchain Configuration Tab */}
            <TabsContent value="blockchain-config" className="space-y-8 mt-8">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl">
                <CardHeader className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl">Blockchain Configuration</span>
                  </CardTitle>
                  <div className="text-gray-400 text-lg">
                    Advanced token and network management for Base network
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <Alert className="bg-blue-400/10 border-blue-400/30 rounded-2xl">
                    <Activity className="h-5 w-5 text-blue-400" />
                    <AlertDescription className="text-blue-200 text-lg">
                      Changes to blockchain configuration will restart price monitoring services. Network ID 8453 = Base Mainnet.
                    </AlertDescription>
                  </Alert>

                  {/* Token Configuration */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Token Configuration
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Label htmlFor="kiltTokenAddress" className="text-white text-lg">KILT Token Address</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://basescan.org/token/0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8', '_blank')}
                            className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 px-2 py-1 h-6"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View on BaseScan
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="kiltTokenAddress"
                            value={blockchainConfigForm.kiltTokenAddress}
                            onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, kiltTokenAddress: e.target.value })}
                            className="bg-white/5 backdrop-blur-xl border-white/20 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-lg py-3 pr-12 rounded-2xl"
                            placeholder="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(blockchainConfigForm.kiltTokenAddress)}
                            className="absolute right-2 top-2 text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Label htmlFor="wethTokenAddress" className="text-white text-lg">WETH Token Address</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://basescan.org/token/0x4200000000000000000000000000000000000006', '_blank')}
                            className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 px-2 py-1 h-6"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View on BaseScan
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="wethTokenAddress"
                            value={blockchainConfigForm.wethTokenAddress}
                            onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, wethTokenAddress: e.target.value })}
                            className="bg-white/5 backdrop-blur-xl border-white/20 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-lg py-3 pr-12 rounded-2xl"
                            placeholder="0x4200000000000000000000000000000000000006"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(blockchainConfigForm.wethTokenAddress)}
                            className="absolute right-2 top-2 text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pool Configuration */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                      <Globe className="w-5 h-5 text-purple-400" />
                      Uniswap V3 Pool Configuration
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Label htmlFor="poolAddress" className="text-white text-lg">KILT/ETH Pool Address</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://app.uniswap.org/pools/8453/' + blockchainConfigForm.poolAddress, '_blank')}
                            className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 px-2 py-1 h-6"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View on Uniswap
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="poolAddress"
                            value={blockchainConfigForm.poolAddress}
                            onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, poolAddress: e.target.value })}
                            className="bg-white/5 backdrop-blur-xl border-white/20 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-lg py-3 pr-12 rounded-2xl"
                            placeholder="0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(blockchainConfigForm.poolAddress)}
                            className="absolute right-2 top-2 text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <Label htmlFor="networkId" className="text-white text-lg">Network Configuration</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Network className="w-4 h-4" />
                            <span>8453 = Base Mainnet</span>
                          </div>
                          <Input
                            id="networkId"
                            type="number"
                            value={blockchainConfigForm.networkId}
                            onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, networkId: parseInt(e.target.value) || 0 })}
                            className="bg-white/5 backdrop-blur-xl border-white/20 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-lg py-3 rounded-2xl"
                            placeholder="8453"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleBlockchainConfigUpdate}
                    disabled={blockchainConfigMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 backdrop-blur-xl border border-blue-400/30 transition-all duration-300 py-4 text-lg rounded-2xl shadow-2xl shadow-blue-500/20"
                  >
                    {blockchainConfigMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 animate-spin" />
                        Updating Configuration...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Update Blockchain Configuration
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operation History Tab */}
            <TabsContent value="history" className="space-y-8 mt-8">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl">
                <CardHeader className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <History className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl">Operation History</span>
                  </CardTitle>
                  <div className="text-gray-400 text-lg">
                    Complete audit trail of all administrative actions
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    {adminStats?.operationHistory?.length > 0 ? (
                      adminStats.operationHistory.map((op, index) => (
                        <div key={index} className="flex items-center justify-between p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                              <Activity className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-white text-lg">{op.operationType}</div>
                              <div className="text-gray-400">{op.reason}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{op.performedBy}</div>
                            <div className="text-gray-400 text-sm">
                              {new Date(op.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <History className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-gray-400 text-xl">No operations recorded yet</div>
                        <div className="text-gray-500 text-lg mt-2">Administrative actions will appear here</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}