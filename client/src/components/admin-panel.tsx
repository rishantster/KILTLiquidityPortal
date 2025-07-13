import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  Settings, 
  Wallet, 
  CheckCircle, 
  AlertCircle,
  History,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/wallet-context';

interface AdminStats {
  treasury: {
    balance: number;
    address: string;
    totalAllocation: number;
    dailyRewardsCap: number;
    programDuration: number;
    isActive: boolean;
  };
  settings: {
    programDuration: number;
    minTimeCoefficient: number;
    maxTimeCoefficient: number;
    liquidityWeight: number;
    timeWeight: number;
    minimumPositionValue: number;
    lockPeriod: number;
    dailyRewardsCap?: number;
  };
  operationHistory: any[];
}

export function AdminPanel() {
  const { isConnected, address, connect, disconnect } = useWallet();
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'wallet' | 'credentials'>('wallet');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const ADMIN_WALLET_ADDRESS = '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e';
  
  // Treasury Configuration Form (NO PRIVATE KEYS)
  const [treasuryConfigForm, setTreasuryConfigForm] = useState({
    treasuryWalletAddress: '',
    totalAllocation: 2905600,
    programDurationDays: 365,
    programStartDate: new Date().toISOString().split('T')[0],
    programEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true
  });
  
  // Program Settings Form
  const [settingsForm, setSettingsForm] = useState({
    programDuration: 365,
    minTimeCoefficient: 0.6,
    maxTimeCoefficient: 1.0,
    liquidityWeight: 0.6,
    timeWeight: 0.4,
    minimumPositionValue: 100,
    lockPeriod: 90,
    dailyRewardsCap: 7960
  });
  
  const queryClient = useQueryClient();
  
  // Check if connected wallet is authorized
  useEffect(() => {
    if (isConnected && address) {
      setIsAuthorized(address.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase());
    } else {
      setIsAuthorized(false);
    }
  }, [isConnected, address]);

  // Admin login mutation (supports both methods)
  const loginMutation = useMutation({
    mutationFn: async (loginData: { walletAddress?: string; username?: string; password?: string }) => {
      const endpoint = loginData.walletAddress ? '/api/admin/login-wallet' : '/api/admin/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      localStorage.setItem('adminToken', data.token);
      toast({
        title: "Success",
        description: data.message || "Admin access granted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch admin stats
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: !!adminToken,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Treasury configuration mutation (SECURE - NO PRIVATE KEYS)
  const treasuryConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      return await apiRequest('/api/admin/treasury/config', 'POST', config, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Treasury configuration updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Program settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      return await apiRequest('/api/admin/program/settings', 'POST', settings, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Program settings updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle login
  const handleLogin = async () => {
    if (loginMethod === 'wallet') {
      if (!isConnected || !address) {
        toast({
          title: "Connect Wallet",
          description: "Please connect your wallet first",
          variant: "destructive",
        });
        return;
      }
      
      if (address.toLowerCase() !== ADMIN_WALLET_ADDRESS.toLowerCase()) {
        toast({
          title: "Unauthorized",
          description: "This wallet is not authorized for admin access",
          variant: "destructive",
        });
        return;
      }
      
      loginMutation.mutate({ walletAddress: address });
    } else {
      if (!loginForm.username || !loginForm.password) {
        toast({
          title: "Missing Information",
          description: "Please enter both username and password",
          variant: "destructive",
        });
        return;
      }
      
      loginMutation.mutate({ 
        username: loginForm.username, 
        password: loginForm.password 
      });
    }
  };

  // Handle logout
  const handleLogout = () => {
    setAdminToken('');
    localStorage.removeItem('adminToken');
    setIsAuthorized(false);
    toast({
      title: "Logged Out",
      description: "Admin session ended",
    });
  };

  // Handle treasury configuration update
  const handleTreasuryConfigUpdate = () => {
    const config = {
      ...treasuryConfigForm,
      programStartDate: new Date(treasuryConfigForm.programStartDate),
      programEndDate: new Date(treasuryConfigForm.programEndDate)
    };
    treasuryConfigMutation.mutate(config);
  };

  // Handle settings update
  const handleSettingsUpdate = () => {
    settingsMutation.mutate(settingsForm);
  };

  // Calculate daily rewards cap automatically
  const calculateDailyRewardsCap = () => {
    return treasuryConfigForm.totalAllocation / treasuryConfigForm.programDurationDays;
  };

  // Login UI
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Login Method Toggle */}
            <div className="flex rounded-lg bg-gray-800 p-1">
              <button
                onClick={() => setLoginMethod('wallet')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'wallet'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Wallet className="w-4 h-4 inline mr-1" />
                Wallet
              </button>
              <button
                onClick={() => setLoginMethod('credentials')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'credentials'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Lock className="w-4 h-4 inline mr-1" />
                Credentials
              </button>
            </div>

            {/* Wallet Login */}
            {loginMethod === 'wallet' && (
              <div className="space-y-4">
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    Connect with authorized admin wallet:
                    <br />
                    <code className="text-xs text-emerald-400">
                      {ADMIN_WALLET_ADDRESS}
                    </code>
                  </AlertDescription>
                </Alert>
                
                {!isConnected ? (
                  <Button onClick={connect} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Connect Wallet
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">
                      Connected: {address}
                    </div>
                    {isAuthorized ? (
                      <Badge variant="default" className="bg-emerald-600">
                        Authorized Wallet
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Unauthorized Wallet
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Credentials Login */}
            {loginMethod === 'credentials' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-white">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white pr-10"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleLogin} 
              disabled={loginMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loginMutation.isPending ? 'Authenticating...' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Admin Panel UI
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            KILT Admin Panel
          </h1>
          <div className="flex items-center gap-4">
            <Badge variant="default" className="bg-emerald-600">
              {loginMethod === 'wallet' ? 'Wallet Auth' : 'Credentials Auth'}
            </Badge>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="text-center py-8">Loading admin data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Treasury Balance</p>
                    <p className="text-xl font-bold text-white">
                      {adminStats?.treasury?.balance?.toFixed(0) || 0} KILT
                    </p>
                  </div>
                  <Wallet className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Allocation</p>
                    <p className="text-xl font-bold text-white">
                      {adminStats?.treasury?.totalAllocation?.toFixed(0) || 2905600} KILT
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Daily Rewards Cap</p>
                    <p className="text-xl font-bold text-white">
                      {adminStats?.treasury?.dailyRewardsCap?.toFixed(0) || 7960} KILT
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Program Duration</p>
                    <p className="text-xl font-bold text-white">
                      {adminStats?.treasury?.programDuration || 365} days
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Admin Tabs */}
        <Tabs defaultValue="treasury" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="treasury" className="text-gray-300 data-[state=active]:bg-gray-700">
              Treasury Config
            </TabsTrigger>
            <TabsTrigger value="distribution" className="text-gray-300 data-[state=active]:bg-gray-700">
              Token Distribution
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:bg-gray-700">
              Program Settings
            </TabsTrigger>
            <TabsTrigger value="history" className="text-gray-300 data-[state=active]:bg-gray-700">
              Operation History
            </TabsTrigger>
          </TabsList>

          {/* Claim-Based Rewards Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                <strong>Claim-Based Reward System:</strong> Users can only claim rewards after a 90-day lock period. 
                No automatic transfers occur - users must manually click "Claim Reward" to receive their KILT tokens.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transaction Signing Explanation */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-400" />
                    Transaction Signing Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-300">
                    <strong>Current Implementation:</strong> Treasury wallet private key is required for backend transaction signing.
                  </div>
                  
                  <div className="bg-gray-800 p-3 rounded text-xs">
                    <strong>Two possible approaches:</strong>
                    <br />
                    <strong>1. Backend Signing:</strong> Treasury private key stored securely in backend, signs transactions automatically
                    <br />
                    <strong>2. Smart Contract:</strong> Deploy reward contract with claim functions, no private key needed
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Security Note:</strong> Current system requires treasury private key for transaction signing. 
                      Consider smart contract approach for enhanced security.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Claim Statistics */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Claim Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">0</div>
                      <div className="text-xs text-gray-400">Total Claimed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">0</div>
                      <div className="text-xs text-gray-400">Claim Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-400">0</div>
                      <div className="text-xs text-gray-400">Pending Claims</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-400">0</div>
                      <div className="text-xs text-gray-400">Locked Rewards</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  How Rolling Claims Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-800 rounded">
                    <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-sm font-medium text-white">1. Daily Rewards</div>
                    <div className="text-xs text-gray-400">Users earn rewards daily from liquidity provision</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800 rounded">
                    <Shield className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <div className="text-sm font-medium text-white">2. Individual Lock</div>
                    <div className="text-xs text-gray-400">Each reward locked for 7 days from its creation</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800 rounded">
                    <Unlock className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-sm font-medium text-white">3. Rolling Unlock</div>
                    <div className="text-xs text-gray-400">Rewards unlock continuously as they age 7+ days</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800 rounded">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <div className="text-sm font-medium text-white">4. Claim Available</div>
                    <div className="text-xs text-gray-400">User claims only unlocked rewards anytime</div>
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How It Works:</strong> Users accumulate rewards for 7 days, then can claim all 7 days worth at once on Day 8. 
                    After that, they can claim new rewards daily as they accumulate (rolling basis).
                    This means after the initial 7-day period, users get their first big claim, then continuous daily claims.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treasury Configuration Tab */}
          <TabsContent value="treasury" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Secure Treasury Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Notice:</strong> This configuration system does not require private keys. 
                    All treasury operations are read-only with secure wallet-based configuration management.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="treasuryAddress" className="text-white">Treasury Wallet Address</Label>
                    <Input
                      id="treasuryAddress"
                      value={treasuryConfigForm.treasuryWalletAddress}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, treasuryWalletAddress: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="totalAllocation" className="text-white">Total Allocation (KILT)</Label>
                    <Input
                      id="totalAllocation"
                      type="number"
                      value={treasuryConfigForm.totalAllocation}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, totalAllocation: parseInt(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="programDuration" className="text-white">Program Duration (Days)</Label>
                    <Input
                      id="programDuration"
                      type="number"
                      value={treasuryConfigForm.programDurationDays}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programDurationDays: parseInt(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Auto-Calculated Daily Rewards Cap</Label>
                    <div className="text-lg font-bold text-emerald-400">
                      {calculateDailyRewardsCap().toFixed(2)} KILT/day
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-white">Program Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={treasuryConfigForm.programStartDate}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programStartDate: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate" className="text-white">Program End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={treasuryConfigForm.programEndDate}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programEndDate: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleTreasuryConfigUpdate}
                  disabled={treasuryConfigMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {treasuryConfigMutation.isPending ? 'Updating...' : 'Update Treasury Configuration'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Program Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  Program Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="liquidityWeight" className="text-white">Liquidity Weight (w1)</Label>
                    <Input
                      id="liquidityWeight"
                      type="number"
                      step="0.01"
                      value={settingsForm.liquidityWeight}
                      onChange={(e) => setSettingsForm({ ...settingsForm, liquidityWeight: parseFloat(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timeWeight" className="text-white">Time Weight (w2)</Label>
                    <Input
                      id="timeWeight"
                      type="number"
                      step="0.01"
                      value={settingsForm.timeWeight}
                      onChange={(e) => setSettingsForm({ ...settingsForm, timeWeight: parseFloat(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="minPositionValue" className="text-white">Minimum Position Value ($)</Label>
                    <Input
                      id="minPositionValue"
                      type="number"
                      value={settingsForm.minimumPositionValue}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minimumPositionValue: parseInt(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lockPeriod" className="text-white">Lock Period (Days)</Label>
                    <Input
                      id="lockPeriod"
                      type="number"
                      value={settingsForm.lockPeriod}
                      onChange={(e) => setSettingsForm({ ...settingsForm, lockPeriod: parseInt(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dailyRewardsCap" className="text-white">Daily Rewards Cap (KILT)</Label>
                    <Input
                      id="dailyRewardsCap"
                      type="number"
                      value={settingsForm.dailyRewardsCap}
                      onChange={(e) => setSettingsForm({ ...settingsForm, dailyRewardsCap: parseFloat(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSettingsUpdate}
                  disabled={settingsMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {settingsMutation.isPending ? 'Updating...' : 'Update Program Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operation History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Operation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {adminStats?.operationHistory?.length > 0 ? (
                    adminStats.operationHistory.map((op, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
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
  );
}