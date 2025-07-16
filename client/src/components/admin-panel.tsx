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
  Activity
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
  const { address, isConnected, connectWallet, disconnectWallet } = useWallet();
  
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
      setIsAuthorized(authorizedWallets.includes(address));
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
      const response = await apiRequest('/api/admin/login-wallet', {
        method: 'POST',
        body: { walletAddress: address }
      });
      return response;
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      localStorage.setItem('admin-token', data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    }
  });

  // Treasury config mutation
  const treasuryConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/treasury/config', {
        method: 'POST',
        body: treasuryConfigForm
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
        body: programSettingsForm
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
        body: blockchainConfigForm
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
    if (!isConnected || !isAuthorized) return;
    await loginMutation.mutateAsync();
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin-token');
    disconnectWallet();
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
                  onClick={connectWallet} 
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
    <div className="min-h-screen bg-black text-white">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.1),rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_80%_80%,rgba(16,185,129,0.05),rgba(255,255,255,0))]"></div>
      </div>
      
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center backdrop-blur-sm border border-emerald-400/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                KILT Admin Panel
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-emerald-600/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-300 px-3 py-1">
                Wallet Auth
              </Badge>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="border-gray-600/30 text-gray-300 hover:bg-gray-800/30 backdrop-blur-sm hover:border-emerald-400/30 transition-all duration-200"
              >
                Logout
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          {statsLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-emerald-400">Loading admin data...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Program Budget */}
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1">Program Budget</p>
                  <p className="text-white font-bold text-xl">
                    {((adminStats?.treasury?.programBudget || 500000) / 1000000).toFixed(1)}M KILT
                  </p>
                </CardContent>
              </Card>

              {/* Daily Budget */}
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1">Daily Budget</p>
                  <p className="text-white font-bold text-xl">
                    {(adminStats?.treasury?.dailyRewardsCap || 5556).toFixed(0)} KILT
                  </p>
                </CardContent>
              </Card>

              {/* Program Duration */}
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1">Program Duration</p>
                  <p className="text-white font-bold text-xl">
                    {adminStats?.treasury?.programDuration || 90} days
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Admin Tabs */}
          <Tabs defaultValue="program-config" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl h-14 p-1 mb-6">
              <TabsTrigger 
                value="program-config" 
                className="text-white data-[state=active]:bg-emerald-600/30 data-[state=active]:text-emerald-200 font-medium rounded-lg transition-all duration-200 px-4 py-2"
              >
                Program Configuration
              </TabsTrigger>
              <TabsTrigger 
                value="blockchain-config" 
                className="text-white data-[state=active]:bg-blue-600/30 data-[state=active]:text-blue-200 font-medium rounded-lg transition-all duration-200 px-4 py-2"
              >
                Blockchain Configuration
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-white data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-200 font-medium rounded-lg transition-all duration-200 px-4 py-2"
              >
                Operation History
              </TabsTrigger>
            </TabsList>

            {/* Program Configuration Tab */}
            <TabsContent value="program-config" className="space-y-6 mt-6">
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Program Configuration
                  </CardTitle>
                  <div className="text-sm text-gray-400">
                    Configure treasury settings and reward formula parameters
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-emerald-400/10 border-emerald-400/30">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <AlertDescription className="text-gray-300">
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
            <TabsContent value="blockchain-config" className="space-y-6 mt-6">
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-400" />
                    Blockchain Configuration
                  </CardTitle>
                  <div className="text-sm text-gray-400">
                    Manage token addresses and network settings
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-blue-400/10 border-blue-400/30">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-gray-300">
                      Changes to blockchain configuration will restart price monitoring services.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="kiltTokenAddress" className="text-white">KILT Token Address</Label>
                      <Input
                        id="kiltTokenAddress"
                        value={blockchainConfigForm.kiltTokenAddress}
                        onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, kiltTokenAddress: e.target.value })}
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                        placeholder="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="wethTokenAddress" className="text-white">WETH Token Address</Label>
                      <Input
                        id="wethTokenAddress"
                        value={blockchainConfigForm.wethTokenAddress}
                        onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, wethTokenAddress: e.target.value })}
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                        placeholder="0x4200000000000000000000000000000000000006"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="poolAddress" className="text-white">Pool Address</Label>
                      <Input
                        id="poolAddress"
                        value={blockchainConfigForm.poolAddress}
                        onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, poolAddress: e.target.value })}
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                        placeholder="0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="networkId" className="text-white">Network ID</Label>
                      <Input
                        id="networkId"
                        type="number"
                        value={blockchainConfigForm.networkId}
                        onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, networkId: parseInt(e.target.value) || 0 })}
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20"
                        placeholder="8453"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleBlockchainConfigUpdate}
                    disabled={blockchainConfigMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 backdrop-blur-sm border border-purple-400/30 transition-all duration-200"
                  >
                    {blockchainConfigMutation.isPending ? 'Updating...' : 'Update Blockchain Configuration'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operation History Tab */}
            <TabsContent value="history" className="space-y-6 mt-6">
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-400" />
                    Operation History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminStats?.operationHistory?.length > 0 ? (
                      adminStats.operationHistory.map((op, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                          <div>
                            <div className="font-medium text-white">{op.operationType}</div>
                            <div className="text-sm text-gray-400">{op.reason}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">{op.performedBy}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(op.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        No operations recorded yet
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