import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  DollarSign, 
  Timer, 
  Calendar, 
  ShieldCheck,
  Settings,
  History,
  AlertCircle,
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
  Network,
  TrendingUp
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
    timeBoostCoefficient: number;
    fullRangeBonus: number;
    minimumPositionValue: number;
    lockPeriod: number;
  };
  operationHistory: any[];
}

interface BlockchainConfig {
  kiltTokenAddress: string;
  poolAddress: string;
  networkId: number;
  isActive: boolean;
}

function AdminPanelSimplified() {
  const queryClient = useQueryClient();
  const { address, isConnected, connect, disconnect } = useWallet();
  
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem('admin-token')
  );
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Calculate APR based on admin settings using the reward formula
  const calculateDynamicAPR = (adminStats: AdminStats) => {
    if (!adminStats) return 47;
    
    const { treasury, settings } = adminStats;
    
    // Base parameters from the reward formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
    const dailyBudget = treasury.programBudget / treasury.programDuration;
    const annualBudget = dailyBudget * 365;
    const timeBoostCoeff = typeof settings.timeBoostCoefficient === 'number' ? settings.timeBoostCoefficient : 0.6;
    const fullRangeBonus = typeof settings.fullRangeBonus === 'number' ? settings.fullRangeBonus : 1.2;
    
    // Assume typical position parameters for APR calculation
    const typicalLiquidityShare = 0.01; // 1% of total pool
    const maxTimeProgression = 1.0; // Full time progression
    const inRangeMultiplier = 1.0; // Full in-range performance
    
    // Calculate max APR using the reward formula
    const maxAPR = (
      typicalLiquidityShare * 
      (1 + (maxTimeProgression * timeBoostCoeff)) * 
      inRangeMultiplier * 
      fullRangeBonus * 
      (annualBudget / 100000) // Assume $100k typical position
    ) * 100; // Convert to percentage
    
    return Math.min(maxAPR, 100); // Cap at 100% for realism
  };

  // Treasury configuration form
  const [treasuryConfigForm, setTreasuryConfigForm] = useState({
    treasuryWalletAddress: '',
    programBudget: '500000',
    programDuration: '90',
    programStartDate: '2025-07-16',
    programEndDate: '2025-10-14',
    isActive: true
  });

  // Simplified program settings form - only essential parameters
  const [programSettingsForm, setProgramSettingsForm] = useState({
    timeBoostCoefficient: '0.6',  // b_time in the formula
    fullRangeBonus: '1.2',        // FRB in the formula
    minimumPositionValue: '10',   // Anti-spam protection
    lockPeriod: '7'               // Reward lock period
  });

  // Blockchain configuration form
  const [blockchainConfigForm, setBlockchainConfigForm] = useState({
    kiltTokenAddress: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
    poolAddress: '0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb',
    networkId: 8453,
    isActive: true
  });

  // Check if wallet is authorized and auto-login
  useEffect(() => {
    if (address) {
      const authorizedWallets = [
        '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
        '0x861722f739539CF31d86F1221460Fa96C9baB95C'
      ];
      const isWalletAuthorized = authorizedWallets.some(wallet => 
        wallet.toLowerCase() === address.toLowerCase()
      );
      setIsAuthorized(isWalletAuthorized);
      
      // Auto-login if wallet is authorized and no token exists
      if (isWalletAuthorized && !adminToken && !loginMutation.isPending) {
        loginMutation.mutate();
      }
    }
  }, [address, adminToken]);

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
      if (!address) {
        throw new Error('No wallet address available');
      }
      const response = await apiRequest('/api/admin/login-wallet', {
        method: 'POST',
        data: { walletAddress: address }
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.success && data.token) {
        setAdminToken(data.token);
        localStorage.setItem('admin-token', data.token);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
    }
  });

  // Treasury config mutation
  const treasuryConfigMutation = useMutation({
    mutationFn: async () => {
      if (!adminToken) {
        throw new Error('No admin token available');
      }
      
      // Convert string values to numbers for backend compatibility
      const configData = {
        ...treasuryConfigForm,
        programBudget: treasuryConfigForm.programBudget === '' ? 500000 : parseInt(treasuryConfigForm.programBudget),
        programDuration: treasuryConfigForm.programDuration === '' ? 90 : parseInt(treasuryConfigForm.programDuration),
        programDurationDays: treasuryConfigForm.programDuration === '' ? 90 : parseInt(treasuryConfigForm.programDuration)
      };
      
      return await apiRequest('/api/admin/treasury/config', {
        method: 'POST',
        data: configData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      setHasLoadedInitialData(false); // Allow form to reload with new values
      alert('Treasury configuration updated successfully!');
    },
    onError: (error: any) => {
      alert(`Error updating treasury config: ${error.message}`);
    }
  });

  // Program settings mutation
  const settingsMutation = useMutation({
    mutationFn: async () => {
      if (!adminToken) {
        throw new Error('No admin token available');
      }
      
      // Convert string values to numbers for backend compatibility
      const settingsData = {
        timeBoostCoefficient: programSettingsForm.timeBoostCoefficient === '' ? 0.6 : parseFloat(programSettingsForm.timeBoostCoefficient),
        fullRangeBonus: programSettingsForm.fullRangeBonus === '' ? 1.2 : parseFloat(programSettingsForm.fullRangeBonus),
        minimumPositionValue: programSettingsForm.minimumPositionValue === '' ? 10 : parseInt(programSettingsForm.minimumPositionValue),
        lockPeriod: programSettingsForm.lockPeriod === '' ? 7 : parseInt(programSettingsForm.lockPeriod)
      };
      
      return await apiRequest('/api/admin/settings', {
        method: 'POST',
        data: settingsData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      setHasLoadedInitialData(false); // Allow form to reload with new values
      alert('Program settings updated successfully!');
    },
    onError: (error: any) => {
      alert(`Error updating program settings: ${error.message}`);
    }
  });

  // Blockchain config mutation
  const blockchainConfigMutation = useMutation({
    mutationFn: async () => {
      if (!adminToken) {
        throw new Error('No admin token available');
      }
      return await apiRequest('/api/admin/blockchain-config', {
        method: 'POST',
        data: blockchainConfigForm
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blockchain-config'] });
    }
  });

  // Handle admin login
  const handleAdminLogin = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    
    if (!isAuthorized) {
      return;
    }

    loginMutation.mutate();
  };

  // Handle logout
  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin-token');
    disconnect();
  };

  // Handle treasury config update
  const handleTreasuryUpdate = () => {
    treasuryConfigMutation.mutate();
  };

  // Handle settings update
  const handleSettingsUpdate = () => {
    settingsMutation.mutate();
  };

  // Handle blockchain config update
  const handleBlockchainConfigUpdate = () => {
    blockchainConfigMutation.mutate();
  };

  // Update forms when data loads (only once)
  useEffect(() => {
    if (adminStats && !hasLoadedInitialData) {
      setTreasuryConfigForm({
        treasuryWalletAddress: adminStats.treasury.address || '',
        programBudget: String(adminStats.treasury.programBudget || 500000),
        programDuration: String(adminStats.treasury.programDuration || 90),
        programStartDate: '2025-07-16',
        programEndDate: '2025-10-14',
        isActive: adminStats.treasury.isActive ?? true
      });
      
      setProgramSettingsForm({
        timeBoostCoefficient: String(adminStats.settings.timeBoostCoefficient || 0.6),
        fullRangeBonus: String(adminStats.settings.fullRangeBonus || 1.2),
        minimumPositionValue: String(adminStats.settings.minimumPositionValue || 10),
        lockPeriod: String(adminStats.settings.lockPeriod || 7)
      });
      
      setHasLoadedInitialData(true);
    }
  }, [adminStats, hasLoadedInitialData]);

  useEffect(() => {
    if (blockchainConfig) {
      setBlockchainConfigForm({
        kiltTokenAddress: blockchainConfig.kiltTokenAddress || '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
        poolAddress: blockchainConfig.poolAddress || '0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb',
        networkId: blockchainConfig.networkId || 8453,
        isActive: blockchainConfig.isActive ?? true
      });
    }
  }, [blockchainConfig]);

  // Show login screen if not authenticated
  if (!adminToken || !isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-white/10">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Admin Access Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <Button 
                  onClick={handleAdminLogin} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Connecting...' : 'Connect with your authorized admin wallet'}
                </Button>
              ) : !isAuthorized ? (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    This wallet is not authorized for admin access.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button 
                  onClick={handleAdminLogin} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Login to Admin Panel'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header - Match main app design */}
      <header className="border-b border-gray-800/30 bg-gradient-to-r from-gray-900/40 via-gray-800/30 to-gray-900/40 backdrop-blur-md sticky top-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                KILT Admin Panel
              </h1>
              <p className="text-sm text-gray-400">Manage liquidity incentive program</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Treasury Status - Match main app style */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-gray-800/30 rounded-lg px-3 py-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-300">Treasury:</span>
              <span className="text-sm font-bold text-emerald-400">
                {adminStats ? `${(adminStats.treasury.programBudget / 1000000).toFixed(1)}M KILT` : '0.5M KILT'}
              </span>
            </div>

            {/* Current APR Display - Match main app style */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-gray-800/30 rounded-lg px-3 py-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-300">Current APR:</span>
              <span className="text-sm font-bold text-emerald-400">
                {adminStats ? `${calculateDynamicAPR(adminStats).toFixed(1)}%` : '47%'}
              </span>
            </div>
            
            {/* Network Status - Match main app style */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-gray-800/30 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-300">Base Network</span>
            </div>
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30 text-white hover:bg-white/10 text-sm"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">

        {/* Main Content - Match main app design */}
        <Tabs defaultValue="program-config" className="space-y-6">
          <TabsList className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-gray-800/30 p-1">
            <TabsTrigger value="program-config" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-400/30 text-gray-300 border border-transparent">
              Program Configuration
            </TabsTrigger>
            <TabsTrigger value="blockchain-config" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 data-[state=active]:border-blue-400/30 text-gray-300 border border-transparent">
              Blockchain Configuration
            </TabsTrigger>
            <TabsTrigger value="operation-history" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-400/30 text-gray-300 border border-transparent">
              Operation History
            </TabsTrigger>
          </TabsList>

          {/* Program Configuration Tab */}
          <TabsContent value="program-config" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Treasury Configuration */}
              <div className="h-full">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Treasury Configuration
                </h2>
                <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-lg p-4 border border-gray-800/30 space-y-4">
                  <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-200 text-sm">Configure treasury allocation and program timeline.</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="programBudget" className="text-white text-sm">Program Budget (KILT)</Label>
                        <Input
                          id="programBudget"
                          type="number"
                          value={treasuryConfigForm.programBudget}
                          onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programBudget: e.target.value })}
                          className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-10 text-sm"
                          placeholder="500000"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="programDuration" className="text-white text-sm">Program Duration (days)</Label>
                        <Input
                          id="programDuration"
                          type="number"
                          value={treasuryConfigForm.programDuration}
                          onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programDuration: e.target.value })}
                          className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-10 text-sm"
                          placeholder="90"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="treasuryWalletAddress" className="text-white text-sm">Treasury Wallet Address</Label>
                      <Input
                        id="treasuryWalletAddress"
                        value={treasuryConfigForm.treasuryWalletAddress}
                        onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, treasuryWalletAddress: e.target.value })}
                        className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-10 text-sm"
                        placeholder="0x..."
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleTreasuryUpdate}
                    disabled={treasuryConfigMutation.isPending}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white font-medium h-10 text-sm rounded-lg transition-all duration-200 backdrop-blur-sm"
                  >
                    {treasuryConfigMutation.isPending ? 'Updating...' : 'Update Treasury Config'}
                  </Button>
                </div>
              </div>

              {/* Program Settings */}
              <div className="h-full">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-emerald-400" />
                  Program Settings
                </h2>
                <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-lg p-4 border border-gray-800/30 space-y-4">
                  <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-200 text-sm">Formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Essential Formula Parameters */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Essential Formula Parameters
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="timeBoostCoefficient" className="text-white text-sm">Time Boost (b_time)</Label>
                          <Input
                            id="timeBoostCoefficient"
                            type="number"
                            step="0.1"
                            value={programSettingsForm.timeBoostCoefficient}
                            onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, timeBoostCoefficient: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-10 text-sm"
                            placeholder="0.6"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="fullRangeBonus" className="text-white text-sm">Full Range Bonus (FRB)</Label>
                          <Input
                            id="fullRangeBonus"
                            type="number"
                            step="0.1"
                            value={programSettingsForm.fullRangeBonus}
                            onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, fullRangeBonus: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-10 text-sm"
                            placeholder="1.2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Program Settings */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Program Settings
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="minimumPositionValue" className="text-white text-sm">Minimum Position ($)</Label>
                          <Input
                            id="minimumPositionValue"
                            type="number"
                            value={programSettingsForm.minimumPositionValue}
                            onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, minimumPositionValue: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-10 text-sm"
                            placeholder="10"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="lockPeriod" className="text-white text-sm">Lock Period (days)</Label>
                          <Input
                            id="lockPeriod"
                            type="number"
                            value={programSettingsForm.lockPeriod}
                            onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, lockPeriod: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-10 text-sm"
                            placeholder="7"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic APR Preview */}
                  <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-200 text-sm font-medium">Live APR Preview</span>
                      </div>
                      <span className="text-emerald-300 text-lg font-bold">
                        {adminStats ? `${calculateDynamicAPR({
                          ...adminStats,
                          settings: {
                            ...adminStats.settings,
                            timeBoostCoefficient: programSettingsForm.timeBoostCoefficient,
                            fullRangeBonus: programSettingsForm.fullRangeBonus
                          }
                        }).toFixed(1)}%` : '47%'}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-200/80 mt-1">
                      Updates in real-time as you modify settings
                    </div>
                  </div>

                  <Button
                    onClick={handleSettingsUpdate}
                    disabled={settingsMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium h-10 text-sm rounded-lg transition-all duration-200"
                  >
                    {settingsMutation.isPending ? 'Updating...' : 'Update Settings'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Blockchain Configuration Tab */}
          <TabsContent value="blockchain-config" className="space-y-4">
            <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-blue-400" />
                <span className="text-white text-lg font-medium">Blockchain Configuration</span>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-200 text-sm">Network ID 8453 = Base Mainnet. Changes restart monitoring services.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="kiltTokenAddress" className="text-white text-sm">KILT Token Address</Label>
                    <div className="relative">
                      <Input
                        id="kiltTokenAddress"
                        value={blockchainConfigForm.kiltTokenAddress}
                        onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, kiltTokenAddress: e.target.value })}
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-sm h-10 pr-10"
                        placeholder="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open('https://basescan.org/token/' + blockchainConfigForm.kiltTokenAddress, '_blank')}
                        className="absolute right-1 top-1 h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="poolAddress" className="text-white text-sm">KILT/ETH Pool Address</Label>
                    <div className="relative">
                      <Input
                        id="poolAddress"
                        value={blockchainConfigForm.poolAddress}
                        onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, poolAddress: e.target.value })}
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-sm h-10 pr-10"
                        placeholder="0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open('https://basescan.org/address/' + blockchainConfigForm.poolAddress, '_blank')}
                        className="absolute right-1 top-1 h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleBlockchainConfigUpdate}
                  disabled={blockchainConfigMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium h-10 text-sm rounded-lg transition-all duration-200"
                >
                  {blockchainConfigMutation.isPending ? 'Updating...' : 'Update Blockchain Config'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Operation History Tab */}
          <TabsContent value="operation-history" className="space-y-4">
            <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-purple-400" />
                <span className="text-white text-lg font-medium">Operation History</span>
              </div>
              
              <div className="space-y-3">
                {adminStats?.operationHistory && adminStats.operationHistory.length > 0 ? (
                  adminStats.operationHistory.map((op, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Settings className="w-4 h-4 text-white" />
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
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <History className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-white text-sm font-medium mb-1">No Operations Yet</div>
                    <div className="text-gray-400 text-xs">Actions will appear here</div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminPanelSimplified;