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
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="space-y-6">
          {/* Clean Professional Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">KILT Admin Panel</h1>
                <p className="text-gray-400 text-sm">Treasury Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleLogout}
                className="bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-full text-sm"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>

          {/* Compact Stats Overview */}
          {statsLoading ? (
            <div className="text-center py-4">
              <div className="animate-pulse text-emerald-400">Loading...</div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Treasury Budget</p>
                  <p className="text-white font-bold text-lg">
                    {((adminStats?.treasury?.programBudget || 500000) / 1000000).toFixed(1)}M KILT
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Timer className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Daily Budget</p>
                  <p className="text-white font-bold text-lg">
                    {(adminStats?.treasury?.dailyRewardsCap || 5556).toFixed(0)} KILT
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Duration</p>
                  <p className="text-white font-bold text-lg">
                    {adminStats?.treasury?.programDuration || 90} days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Clean Navigation Tabs */}
          <Tabs defaultValue="program-config" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border border-gray-700/50 p-1 rounded-xl mb-6 h-12 sm:h-14 gap-1">
              <TabsTrigger 
                value="program-config" 
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                <span className="text-xs sm:text-sm">Program</span>
              </TabsTrigger>
              <TabsTrigger 
                value="blockchain-config" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
              >
                <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                <span className="text-xs sm:text-sm">Blockchain</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                <span className="text-xs sm:text-sm">History</span>
              </TabsTrigger>
            </TabsList>

            {/* Program Configuration Tab */}
            <TabsContent value="program-config" className="space-y-4">
              {/* Current Formula Display */}
              <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white text-lg font-medium">Current Formula</span>
                </div>
                <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-emerald-500/20">
                  <div className="font-mono text-emerald-300 text-sm mb-2">
                    R_u = (L_u/L_T) × (1 + ((D_u/P)×b_time)) × IRM × FRB × (R/P)
                  </div>
                  <div className="text-xs text-gray-400">
                    b_time = {adminStats?.settings?.maxLiquidityBoost || 0.6} • IRM = {adminStats?.settings?.inRangeRequirement ? '1.0' : '0.0'} • FRB = 1.2x
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-white text-lg font-medium">Configuration</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-200 text-sm">Treasury operations are secure and wallet-based.</span>
                    </div>
                  </div>

                  {/* Treasury Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white">Treasury Configuration</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="programBudget" className="text-white text-xs">Budget (KILT)</Label>
                        <Input
                          id="programBudget"
                          type="number"
                          value={treasuryConfigForm.programBudget}
                          onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programBudget: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                          placeholder="500000"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="programDuration" className="text-white text-xs">Duration (Days)</Label>
                        <Input
                          id="programDuration"
                          type="number"
                          value={treasuryConfigForm.programDuration}
                          onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programDuration: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                          placeholder="90"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleTreasuryConfigUpdate}
                      disabled={treasuryConfigMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium h-8 text-sm rounded-lg transition-all duration-200"
                    >
                      {treasuryConfigMutation.isPending ? 'Updating...' : 'Update Treasury'}
                    </Button>
                  </div>

                  {/* Program Settings */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white">Formula Parameters</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="maxLiquidityBoost" className="text-white text-xs">Max Boost</Label>
                        <Input
                          id="maxLiquidityBoost"
                          type="number"
                          step="0.1"
                          value={programSettingsForm.maxLiquidityBoost}
                          onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, maxLiquidityBoost: parseFloat(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                          placeholder="0.6"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="minimumPositionValue" className="text-white text-xs">Min Value ($)</Label>
                        <Input
                          id="minimumPositionValue"
                          type="number"
                          value={programSettingsForm.minimumPositionValue}
                          onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, minimumPositionValue: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                          placeholder="10"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="lockPeriod" className="text-white text-xs">Lock Days</Label>
                        <Input
                          id="lockPeriod"
                          type="number"
                          value={programSettingsForm.lockPeriod}
                          onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, lockPeriod: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                          placeholder="7"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-4">
                        <Switch
                          id="inRangeRequirement"
                          checked={programSettingsForm.inRangeRequirement}
                          onCheckedChange={(checked) => setProgramSettingsForm({ ...programSettingsForm, inRangeRequirement: checked })}
                        />
                        <Label htmlFor="inRangeRequirement" className="text-white text-xs">In-Range Req</Label>
                      </div>
                    </div>

                    <Button
                      onClick={handleSettingsUpdate}
                      disabled={settingsMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium h-8 text-sm rounded-lg transition-all duration-200"
                    >
                      {settingsMutation.isPending ? 'Updating...' : 'Update Settings'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Blockchain Configuration Tab */}
            <TabsContent value="blockchain-config" className="space-y-4">
              <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-lg font-medium">Blockchain Configuration</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-200 text-sm">Network ID 8453 = Base Mainnet. Changes restart monitoring services.</span>
                    </div>
                  </div>

                  {/* Token Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Token Configuration
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor="kiltTokenAddress" className="text-white text-xs">KILT Token</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://basescan.org/token/0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8', '_blank')}
                            className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 px-1 py-0 h-4 text-xs"
                          >
                            <ExternalLink className="w-2 h-2 mr-1" />
                            BaseScan
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="kiltTokenAddress"
                            value={blockchainConfigForm.kiltTokenAddress}
                            onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, kiltTokenAddress: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8 pr-8"
                            placeholder="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(blockchainConfigForm.kiltTokenAddress)}
                            className="absolute right-1 top-1 text-gray-400 hover:text-white w-6 h-6"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor="wethTokenAddress" className="text-white text-xs">WETH Token</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://basescan.org/token/0x4200000000000000000000000000000000000006', '_blank')}
                            className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 px-1 py-0 h-4 text-xs"
                          >
                            <ExternalLink className="w-2 h-2 mr-1" />
                            BaseScan
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="wethTokenAddress"
                            value={blockchainConfigForm.wethTokenAddress}
                            onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, wethTokenAddress: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8 pr-8"
                            placeholder="0x4200000000000000000000000000000000000006"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(blockchainConfigForm.wethTokenAddress)}
                            className="absolute right-1 top-1 text-gray-400 hover:text-white w-6 h-6"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pool Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      Pool Configuration
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor="poolAddress" className="text-white text-xs">KILT/ETH Pool</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://app.uniswap.org/pools/8453/' + blockchainConfigForm.poolAddress, '_blank')}
                            className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 px-1 py-0 h-4 text-xs"
                          >
                            <ExternalLink className="w-2 h-2 mr-1" />
                            Uniswap
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="poolAddress"
                            value={blockchainConfigForm.poolAddress}
                            onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, poolAddress: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8 pr-8"
                            placeholder="0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(blockchainConfigForm.poolAddress)}
                            className="absolute right-1 top-1 text-gray-400 hover:text-white w-6 h-6"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="networkId" className="text-white text-xs">Network ID</Label>
                        <Input
                          id="networkId"
                          type="number"
                          value={blockchainConfigForm.networkId}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, networkId: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="8453"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleBlockchainConfigUpdate}
                    disabled={blockchainConfigMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium h-8 text-sm rounded-lg transition-all duration-200"
                  >
                    {blockchainConfigMutation.isPending ? 'Updating...' : 'Update Blockchain'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Operation History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-lg font-medium">Operation History</span>
                </div>
                <div className="space-y-2">
                  <div className="space-y-2">
                    {adminStats?.operationHistory?.length > 0 ? (
                      adminStats.operationHistory.map((op, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                              <Activity className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm">{op.operationType}</div>
                              <div className="text-gray-400 text-xs">{op.reason}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium text-xs">{op.performedBy}</div>
                            <div className="text-gray-400 text-xs">
                              {new Date(op.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <History className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-white text-sm font-medium mb-1">No Operations Yet</div>
                        <div className="text-gray-400 text-xs">Actions will appear here</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}