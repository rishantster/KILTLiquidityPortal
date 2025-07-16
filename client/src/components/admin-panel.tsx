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
  Loader2
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
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch treasury stats');
      return response.json();
    }
  });

  // Unified APR calculations (single source of truth)
  const { data: unifiedAPR, isLoading: aprLoading } = useQuery({
    queryKey: ['/api/rewards/maximum-apr'],
    enabled: isAuthenticated && !!adminToken,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch('/api/rewards/maximum-apr');
      if (!response.ok) throw new Error('Failed to fetch APR calculations');
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
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

  // Populate form with current treasury values when data is loaded
  useEffect(() => {
    if (treasuryStats?.treasury) {
      setTreasuryForm({
        programBudget: treasuryStats.treasury.programBudget?.toString() || '',
        programDurationDays: treasuryStats.treasury.programDuration?.toString() || '',
        treasuryWalletAddress: treasuryStats.treasury.address || ''
      });
    }
  }, [treasuryStats]);

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
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="h-4 w-4 mr-1" />
            Authenticated
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          <TabsContent value="treasury" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Treasury Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{treasuryStats?.treasury?.balance?.toLocaleString() || '0'} KILT</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Program Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{treasuryStats?.treasury?.programBudget?.toLocaleString() || '0'} KILT</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Daily Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{treasuryStats?.treasury?.dailyRewardsCap?.toLocaleString() || '0'} KILT</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Days Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{treasuryStats?.treasury?.programDuration || 0}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Program Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {treasuryStats?.treasury?.isActive ? 'Active' : 'Inactive'}
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
                      value={treasuryForm.programBudget}
                      onChange={(e) => setTreasuryForm({...treasuryForm, programBudget: e.target.value})}
                      placeholder="500000"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="programDurationDays">Program Duration (days)</Label>
                    <Input
                      id="programDurationDays"
                      value={treasuryForm.programDurationDays}
                      onChange={(e) => setTreasuryForm({...treasuryForm, programDurationDays: e.target.value})}
                      placeholder="90"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="treasuryWalletAddress">Treasury Wallet Address</Label>
                    <Input
                      id="treasuryWalletAddress"
                      value={treasuryForm.treasuryWalletAddress}
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
                      value={programForm.timeBoostCoefficient}
                      onChange={(e) => setProgramForm({...programForm, timeBoostCoefficient: e.target.value})}
                      placeholder="0.6"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullRangeBonus">Full Range Bonus (FRB)</Label>
                    <Input
                      id="fullRangeBonus"
                      value={programForm.fullRangeBonus}
                      onChange={(e) => setProgramForm({...programForm, fullRangeBonus: e.target.value})}
                      placeholder="1.2"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimumPosition">Minimum Position Value ($)</Label>
                    <Input
                      id="minimumPosition"
                      value={programForm.minimumPositionValue}
                      onChange={(e) => setProgramForm({...programForm, minimumPositionValue: e.target.value})}
                      placeholder="10"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lockPeriod">Lock Period (days)</Label>
                    <Input
                      id="lockPeriod"
                      value={programForm.lockPeriod}
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
                <CardTitle>Blockchain Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="kiltToken">KILT Token Address</Label>
                    <Input
                      id="kiltToken"
                      placeholder="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="poolAddress">KILT/ETH Pool Address</Label>
                    <Input
                      id="poolAddress"
                      placeholder="Pool address"
                      className="bg-white/5 border-gray-800/30"
                    />
                  </div>
                </div>
                <Button className="w-full">
                  Update Blockchain Configuration
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
                      defaultValue="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                      className="bg-white/5 border-gray-800/30"
                      readOnly
                    />
                    <p className="text-xs text-gray-400 mt-1">Base Network</p>
                  </div>
                  <div>
                    <Label htmlFor="treasuryWallet">Treasury Wallet Address</Label>
                    <Input
                      id="treasuryWallet"
                      defaultValue={treasuryStats?.treasury?.address || "Not configured"}
                      className="bg-white/5 border-gray-800/30"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="networkId">Network ID</Label>
                    <Input
                      id="networkId"
                      defaultValue="8453 (Base Mainnet)"
                      className="bg-white/5 border-gray-800/30"
                      readOnly
                    />
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-400 text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Blockchain addresses are managed through the treasury configuration.
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
        </Tabs>
      </div>
    </div>
  );
}