import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  DollarSign,
  Users,
  Activity,
  Shield,
  Database,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  LogOut
} from 'lucide-react';

interface AdminTreasuryStats {
  totalLiquidity: number;
  activeParticipants: number;
  treasuryBalance: number;
  programDuration: number;
  dailyRewardsCap: number;
  estimatedAPR: { low: number; average: number; high: number };
  treasury: {
    balance: number;
    address: string;
  };
  programAnalytics: {
    totalLiquidity: number;
    activeParticipants: number;
    programDuration: number;
    daysRemaining: number;
    isActive: boolean;
    dailyBudget: number;
    totalBudget: number;
    programStartDate: string;
    programEndDate: string;
  };
}

interface TreasuryConfig {
  treasuryWalletAddress: string;
  programBudget: number;
  programDurationDays: number;
  programStartDate: string;
  programEndDate: string;
  isActive: boolean;
}

interface ProgramSettings {
  timeBoostCoefficient: number;
  fullRangeBonus: number;
  minimumPositionValue: number;
  lockPeriod: number;
  inRangeRequirement: boolean;
}

export default function AdminPanel() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [adminToken, setAdminToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('treasury');
  
  // Form states
  const [treasuryForm, setTreasuryForm] = useState({
    programBudget: '',
    programDurationDays: '',
    treasuryWalletAddress: ''
  });
  
  const [programForm, setProgramForm] = useState({
    timeBoostCoefficient: '',
    fullRangeBonus: '',
    minimumPositionValue: '',
    lockPeriod: ''
  });

  const [blockchainForm, setBlockchainForm] = useState({
    kiltTokenAddress: '',
    wethTokenAddress: '',
    poolAddress: '',
    treasuryWalletAddress: ''
  });
  
  // Authentication state
  const [loginType, setLoginType] = useState<'wallet' | 'credentials'>('wallet');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');



  // Admin login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username?: string; password?: string; walletAddress?: string }) => {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      setIsAuthenticated(true);
      toast({
        title: "Login Successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Admin treasury stats query
  const { data: treasuryStats, isLoading: statsLoading } = useQuery<AdminTreasuryStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated && !!adminToken,
    refetchInterval: 5000, // Check every 5 seconds for admin changes
    staleTime: 0, // Always consider stale to force fresh data
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch treasury stats');
      return response.json();
    }
  });

  // Fallback treasury config query when dashboard fails
  const { data: treasuryConfig } = useQuery({
    queryKey: ['/api/admin/treasury/config'],
    enabled: isAuthenticated && !!adminToken && !treasuryStats,
    queryFn: async () => {
      const response = await fetch('/api/admin/treasury/config', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch treasury config');
      return response.json();
    }
  });

  // Program analytics as fallback
  const { data: programAnalytics } = useQuery({
    queryKey: ['/api/rewards/program-analytics'],
    enabled: isAuthenticated && !treasuryStats,
    queryFn: async () => {
      const response = await fetch('/api/rewards/program-analytics');
      if (!response.ok) throw new Error('Failed to fetch program analytics');
      return response.json();
    }
  });

  // Blockchain configuration query
  const { data: blockchainConfig, isLoading: blockchainLoading } = useQuery({
    queryKey: ['/api/blockchain/config'],
    enabled: isAuthenticated && !!adminToken,
    refetchInterval: 30000, // Check every 30 seconds 
    queryFn: async () => {
      const response = await fetch('/api/blockchain/config');
      if (!response.ok) throw new Error('Failed to fetch blockchain config');
      return response.json();
    }
  });

  // Unified APR calculations (single source of truth)
  const { data: unifiedAPR, isLoading: aprLoading } = useQuery({
    queryKey: ['/api/rewards/maximum-apr'],
    enabled: isAuthenticated && !!adminToken,
    refetchInterval: 5000, // Check every 5 seconds for admin changes
    staleTime: 0, // Always consider stale to force fresh data
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch('/api/rewards/maximum-apr');
      if (!response.ok) throw new Error('Failed to fetch APR calculations');
      return response.json();
    }
  });

  // Admin audit history query
  const auditHistoryQuery = useQuery({
    queryKey: ['/api/admin/audit/history'],
    enabled: isAuthenticated && !!adminToken,
    refetchInterval: 10000, // Check every 10 seconds
    queryFn: async () => {
      const response = await fetch('/api/admin/audit/history', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch audit history');
      return response.json();
    }
  });

  // Treasury configuration mutation
  const updateTreasuryMutation = useMutation({
    mutationFn: async (config: Partial<TreasuryConfig>) => {
      const response = await fetch('/api/admin/treasury/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      // Invalidate all relevant caches to force refresh
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['maxAPR'] });
      queryClient.invalidateQueries({ queryKey: ['programAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['personalAPR'] });
      queryClient.invalidateQueries({ queryKey: ['rewardStats'] });
      toast({
        title: "Treasury Updated",
        description: "Treasury configuration updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Program settings mutation
  const updateProgramMutation = useMutation({
    mutationFn: async (settings: Partial<ProgramSettings>) => {
      const response = await fetch('/api/admin/program/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      // Invalidate all relevant caches to force refresh
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['maxAPR'] });
      queryClient.invalidateQueries({ queryKey: ['programAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['personalAPR'] });
      queryClient.invalidateQueries({ queryKey: ['rewardStats'] });
      toast({
        title: "Program Updated",
        description: "Program settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Blockchain configuration mutation
  const updateBlockchainMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/blockchain/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      // Invalidate all relevant caches to force refresh
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      toast({
        title: "Blockchain Config Updated",
        description: "Blockchain configuration updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Populate form with current treasury values when data is loaded
  useEffect(() => {
    // Try treasury stats first, then fallback to individual API responses
    const analytics = treasuryStats?.programAnalytics || programAnalytics;
    const config = treasuryStats?.treasury || treasuryConfig;
    
    if (analytics || config) {
      setTreasuryForm({
        programBudget: (analytics?.totalBudget || config?.totalAllocation || '1000000').toString(),
        programDurationDays: (analytics?.programDuration || config?.programDurationDays || '90').toString(),
        treasuryWalletAddress: config?.treasuryWalletAddress || '0x0000000000000000000000000000000000000000'
      });
    }
  }, [treasuryStats, programAnalytics, treasuryConfig]);

  // Populate program form with current settings when data is loaded
  useEffect(() => {
    if (treasuryStats?.settings) {
      setProgramForm({
        timeBoostCoefficient: treasuryStats.settings.timeBoostCoefficient?.toString() || '',
        fullRangeBonus: treasuryStats.settings.fullRangeBonus?.toString() || '',
        minimumPositionValue: treasuryStats.settings.minimumPositionValue?.toString() || '',
        lockPeriod: treasuryStats.settings.lockPeriod?.toString() || ''
      });
    }
  }, [treasuryStats]);

  // Populate blockchain form with current configuration when data is loaded
  useEffect(() => {
    if (blockchainConfig) {
      setBlockchainForm({
        kiltTokenAddress: blockchainConfig.kiltTokenAddress || '',
        wethTokenAddress: blockchainConfig.wethTokenAddress || '',
        poolAddress: blockchainConfig.poolAddress || '',
        treasuryWalletAddress: blockchainConfig.treasuryWalletAddress || ''
      });
    }
  }, [blockchainConfig]);

  const handleLogin = () => {
    if (loginType === 'wallet' && address) {
      loginMutation.mutate({ walletAddress: address });
    } else if (loginType === 'credentials' && username && password) {
      loginMutation.mutate({ username, password });
    }
  };

  const handleTreasuryUpdate = () => {
    const values = {
      programBudget: parseFloat(treasuryForm.programBudget),
      programDurationDays: parseInt(treasuryForm.programDurationDays),
      treasuryWalletAddress: treasuryForm.treasuryWalletAddress,
      programStartDate: new Date().toISOString().split('T')[0],
      programEndDate: new Date(Date.now() + parseInt(treasuryForm.programDurationDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true
    };
    updateTreasuryMutation.mutate(values);
  };

  const handleProgramUpdate = () => {
    const values = {
      timeBoostCoefficient: parseFloat(programForm.timeBoostCoefficient),
      fullRangeBonus: parseFloat(programForm.fullRangeBonus),
      minimumPositionValue: parseFloat(programForm.minimumPositionValue),
      lockPeriod: parseInt(programForm.lockPeriod),
      inRangeRequirement: true
    };
    updateProgramMutation.mutate(values);
  };

  const handleBlockchainUpdate = () => {
    const values = {
      kiltTokenAddress: blockchainForm.kiltTokenAddress,
      wethTokenAddress: blockchainForm.wethTokenAddress,
      poolAddress: blockchainForm.poolAddress,
      treasuryWalletAddress: blockchainForm.treasuryWalletAddress,
      poolFeeRate: 3000,
      networkId: 8453,
      updatedBy: 'admin'
    };
    updateBlockchainMutation.mutate(values);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-md mx-auto mt-32">
          <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
            <CardHeader>
              <CardTitle className="text-2xl text-center flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Admin Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={loginType} onValueChange={(value) => setLoginType(value as 'wallet' | 'credentials')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="wallet">Wallet</TabsTrigger>
                  <TabsTrigger value="credentials">Credentials</TabsTrigger>
                </TabsList>
                
                <TabsContent value="wallet" className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-300 mb-4">Connect with your authorized admin wallet</p>
                    {isConnected && address ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
                        <Button onClick={handleLogin} disabled={loginMutation.isPending} className="w-full">
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Authenticating...
                            </>
                          ) : (
                            'Login with Wallet'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-amber-400">Please connect your wallet first</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="credentials" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter admin username"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <Button 
                    onClick={handleLogin} 
                    disabled={loginMutation.isPending || !username || !password}
                    className="w-full"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">KILT Admin Panel</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="h-4 w-4 mr-1" />
              Authenticated
            </Badge>
            <Button
              onClick={() => {
                setIsAuthenticated(false);
                setAdminToken('');
                setUsername('');
                setPassword('');
                toast({
                  title: "Logged Out",
                  description: "You have been successfully logged out",
                });
              }}
              variant="outline"
              size="sm"
              className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 hover:text-red-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="treasury" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Treasury
            </TabsTrigger>
            <TabsTrigger value="program" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Program
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Blockchain
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="treasury" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Treasury Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(treasuryStats?.treasury?.balance || programAnalytics?.totalLiquidity || 1000000)?.toLocaleString()} KILT
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Program Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(treasuryStats?.programAnalytics?.totalBudget || programAnalytics?.totalBudget || treasuryConfig?.totalAllocation || 1000000)?.toLocaleString()} KILT
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Daily Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(treasuryStats?.programAnalytics?.dailyBudget || programAnalytics?.dailyBudget || treasuryConfig?.dailyRewardsCap || 11111)?.toLocaleString()} KILT
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Days Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {treasuryStats?.programAnalytics?.daysRemaining || programAnalytics?.daysRemaining || treasuryConfig?.programDurationDays || 90}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Program Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {(treasuryStats?.programAnalytics?.isActive ?? programAnalytics?.isActive ?? treasuryConfig?.isActive) ? 'Active' : 'Inactive'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Treasury Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="programBudget">Program Budget (KILT)</Label>
                    <Input
                      id="programBudget"
                      value={treasuryForm.programBudget || (programAnalytics?.totalBudget?.toString()) || '1000000'}
                      onChange={(e) => setTreasuryForm({...treasuryForm, programBudget: e.target.value})}
                      placeholder="1000000"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="programDurationDays">Program Duration (days)</Label>
                    <Input
                      id="programDurationDays"
                      value={treasuryForm.programDurationDays || (programAnalytics?.programDuration?.toString()) || '90'}
                      onChange={(e) => setTreasuryForm({...treasuryForm, programDurationDays: e.target.value})}
                      placeholder="90"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="treasuryWalletAddress">Treasury Wallet Address</Label>
                    <Input
                      id="treasuryWalletAddress"
                      value={treasuryForm.treasuryWalletAddress || (treasuryConfig?.treasuryWalletAddress) || '0x0000000000000000000000000000000000000000'}
                      onChange={(e) => setTreasuryForm({...treasuryForm, treasuryWalletAddress: e.target.value})}
                      placeholder="0x..."
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleTreasuryUpdate}
                  disabled={updateTreasuryMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {updateTreasuryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating Treasury...
                    </>
                  ) : (
                    'Update Treasury Configuration'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Liquidity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${treasuryStats?.totalLiquidity?.toLocaleString() || '0'}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Active Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{treasuryStats?.activeParticipants || 0}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Real-time APR Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {aprLoading ? 'Loading...' : `${unifiedAPR?.minAPR || 0}% - ${unifiedAPR?.maxAPR || 0}%`}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Single source of truth</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">APR Range Display</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">
                    {aprLoading ? 'Loading...' : unifiedAPR?.aprRange || 'N/A'}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Used across entire app</p>
                </CardContent>
              </Card>
            </div>



            <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Reward Formula Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-800/30 p-3 rounded-lg mb-4">
                  <p className="text-sm text-gray-300 mb-2">
                    <strong>Reward Formula:</strong> R_u = (L_u/L_T) × (1 + ((D_u/P)×b_time)) × IRM × FRB × (R/P)
                  </p>
                  <p className="text-xs text-gray-400">
                    Changes here affect APR calculations immediately across the entire application
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeBoost">Time Boost Coefficient (b_time)</Label>
                    <Input
                      id="timeBoost"
                      value={programForm.timeBoostCoefficient || (programSettings?.timeBoostCoefficient?.toString()) || '0.6'}
                      onChange={(e) => setProgramForm({...programForm, timeBoostCoefficient: e.target.value})}
                      placeholder="0.6"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullRangeBonus">Full Range Bonus (FRB)</Label>
                    <Input
                      id="fullRangeBonus"
                      value={programForm.fullRangeBonus || (programSettings?.fullRangeBonus?.toString()) || '1.2'}
                      onChange={(e) => setProgramForm({...programForm, fullRangeBonus: e.target.value})}
                      placeholder="1.2"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimumPosition">Minimum Position Value ($)</Label>
                    <Input
                      id="minimumPosition"
                      value={programForm.minimumPositionValue || (programSettings?.minimumPositionValue?.toString()) || '10'}
                      onChange={(e) => setProgramForm({...programForm, minimumPositionValue: e.target.value})}
                      placeholder="10"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lockPeriod">Lock Period (days)</Label>
                    <Input
                      id="lockPeriod"
                      value={programForm.lockPeriod || (programSettings?.lockPeriod?.toString()) || '7'}
                      onChange={(e) => setProgramForm({...programForm, lockPeriod: e.target.value})}
                      placeholder="7"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleProgramUpdate}
                  disabled={updateProgramMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {updateProgramMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating Program...
                    </>
                  ) : (
                    'Update Program Settings'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="blockchain" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Blockchain Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="kiltToken">KILT Token Address</Label>
                    <Input
                      id="kiltToken"
                      value={blockchainForm.kiltTokenAddress}
                      onChange={(e) => setBlockchainForm({...blockchainForm, kiltTokenAddress: e.target.value})}
                      placeholder="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                      className="bg-white/5 border-gray-800/30"
                    />
                    <p className="text-xs text-gray-400 mt-1">Base Network</p>
                  </div>
                  <div>
                    <Label htmlFor="wethToken">WETH Token Address</Label>
                    <Input
                      id="wethToken"
                      value={blockchainForm.wethTokenAddress}
                      onChange={(e) => setBlockchainForm({...blockchainForm, wethTokenAddress: e.target.value})}
                      placeholder="0x4200000000000000000000000000000000000006"
                      className="bg-white/5 border-gray-800/30"
                    />
                    <p className="text-xs text-gray-400 mt-1">Wrapped Ethereum token</p>
                  </div>
                  <div>
                    <Label htmlFor="poolAddress">KILT/ETH Pool Address</Label>
                    <Input
                      id="poolAddress"
                      value={blockchainForm.poolAddress}
                      onChange={(e) => setBlockchainForm({...blockchainForm, poolAddress: e.target.value})}
                      placeholder="0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb"
                      className="bg-white/5 border-gray-800/30"
                    />
                    <p className="text-xs text-gray-400 mt-1">Uniswap V3 Pool (0.3% fee tier)</p>
                  </div>
                  <div>
                    <Label htmlFor="treasuryWallet">Treasury Wallet Address</Label>
                    <Input
                      id="treasuryWallet"
                      value={blockchainForm.treasuryWalletAddress}
                      onChange={(e) => setBlockchainForm({...blockchainForm, treasuryWalletAddress: e.target.value})}
                      placeholder="Treasury wallet address"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="networkId">Network ID</Label>
                    <Input
                      id="networkId"
                      value="8453 (Base Mainnet)"
                      className="bg-white/5 border-gray-800/30"
                      readOnly
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleBlockchainUpdate}
                  disabled={updateBlockchainMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {updateBlockchainMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating Configuration...
                    </>
                  ) : (
                    'Update Blockchain Configuration'
                  )}
                </Button>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-400 text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Changes to blockchain configuration will affect all system operations.
                  </p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <p className="text-emerald-400 text-sm">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Network: Base Mainnet (Chain ID: 8453) - Production ready
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Admin Operation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditHistoryQuery.isLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Loading audit history...</p>
                    </div>
                  ) : auditHistoryQuery.data?.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-400">No admin operations recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditHistoryQuery.data?.map((operation: any) => (
                        <div
                          key={operation.id}
                          className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              operation.success 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {operation.success ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {operation.operationType}
                              </div>
                              <div className="text-xs text-gray-400">
                                {operation.reason || 'No reason provided'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-400">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3" />
                              {new Date(operation.timestamp).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {operation.performedBy?.slice(0, 6)}...{operation.performedBy?.slice(-4)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}