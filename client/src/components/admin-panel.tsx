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
  Plus, 
  Minus, 
  ArrowLeftRight, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  History,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/wallet-context';

interface AdminStats {
  treasury: {
    currentTreasuryAddress: string;
    balance: number;
    allowance: number;
    isConfigured: boolean;
    canTransfer: boolean;
  };
  program: {
    totalAllocation: number;
    totalDistributed: number;
    remainingBudget: number;
    dailyBudget: number;
  };
  settings: {
    programDuration: number;
    minTimeCoefficient: number;
    maxTimeCoefficient: number;
    liquidityWeight: number;
    timeWeight: number;
    minimumPositionValue: number;
    lockPeriod: number;
  };
  operationHistory: any[];
}

export function AdminPanel() {
  const { isConnected, address, connect, disconnect } = useWallet();
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'wallet' | 'credentials'>('wallet');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  const ADMIN_WALLET_ADDRESS = '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e';
  const [treasuryForm, setTreasuryForm] = useState({
    operation: 'add' as 'add' | 'remove' | 'transfer',
    amount: '',
    fromAddress: '',
    toAddress: '',
    privateKey: '',
    reason: ''
  });
  const [settingsForm, setSettingsForm] = useState({
    programDuration: 365,
    minTimeCoefficient: 0.6,
    maxTimeCoefficient: 1.0,
    liquidityWeight: 0.6,
    timeWeight: 0.4,
    minimumPositionValue: 100,
    lockPeriod: 90
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
      const response = await fetch('/api/admin/login', {
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

  // Admin dashboard data
  const { data: adminStats, isLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: !!adminToken,
    refetchInterval: 30000,
    queryFn: async () => {
      return apiRequest('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    },
  });

  // Treasury operations mutation
  const treasuryMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: any }) => {
      return apiRequest(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Operation completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      setTreasuryForm({ ...treasuryForm, privateKey: '', reason: '' });
    },
    onError: (error: Error) => {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Program settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      return apiRequest('/api/admin/program/settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(settings),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Program settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Settings Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize settings form when data loads
  React.useEffect(() => {
    if (adminStats?.settings) {
      setSettingsForm(adminStats.settings);
    }
  }, [adminStats]);

  const handleWalletLogin = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    
    if (address && isAuthorized) {
      loginMutation.mutate({ walletAddress: address });
    }
  };

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username: loginForm.username, password: loginForm.password });
  };

  const handleTreasuryOperation = (e: React.FormEvent) => {
    e.preventDefault();
    
    let endpoint = '';
    let data = {};
    
    switch (treasuryForm.operation) {
      case 'add':
        endpoint = '/api/admin/treasury/add';
        data = {
          amount: treasuryForm.amount,
          toAddress: treasuryForm.toAddress,
          privateKey: treasuryForm.privateKey,
          reason: treasuryForm.reason
        };
        break;
      case 'remove':
        endpoint = '/api/admin/treasury/remove';
        data = {
          amount: treasuryForm.amount,
          fromAddress: treasuryForm.fromAddress,
          toAddress: treasuryForm.toAddress,
          privateKey: treasuryForm.privateKey,
          reason: treasuryForm.reason
        };
        break;
      case 'transfer':
        endpoint = '/api/admin/treasury/transfer';
        data = {
          amount: treasuryForm.amount,
          fromAddress: treasuryForm.fromAddress,
          toAddress: treasuryForm.toAddress,
          privateKey: treasuryForm.privateKey,
          reason: treasuryForm.reason
        };
        break;
    }
    
    treasuryMutation.mutate({ endpoint, data });
  };

  const handleSettingsUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    settingsMutation.mutate(settingsForm);
  };

  const handleLogout = async () => {
    setAdminToken('');
    localStorage.removeItem('adminToken');
    await disconnect();
    toast({
      title: "Logged Out",
      description: "Admin session ended",
    });
  };

  const formatKiltAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAddress = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return 'Not configured';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Login interface (both wallet and credentials)
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-white text-xl">
              <Shield className="h-6 w-6 text-emerald-400" />
              Admin Panel
            </CardTitle>
            <p className="text-emerald-200/70 text-sm mt-2">Access treasury management and program settings</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Login Method Toggle */}
            <div className="flex rounded-lg bg-emerald-500/10 backdrop-blur-sm p-1 border border-emerald-500/20">
              <Button
                type="button"
                variant={loginMethod === 'wallet' ? 'default' : 'ghost'}
                onClick={() => setLoginMethod('wallet')}
                className={`flex-1 h-8 text-xs transition-all ${
                  loginMethod === 'wallet' 
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-lg' 
                    : 'text-emerald-200/70 hover:text-emerald-300 hover:bg-emerald-500/10'
                }`}
              >
                <Wallet className="h-3 w-3 mr-1" />
                Wallet
              </Button>
              <Button
                type="button"
                variant={loginMethod === 'credentials' ? 'default' : 'ghost'}
                onClick={() => setLoginMethod('credentials')}
                className={`flex-1 h-8 text-xs transition-all ${
                  loginMethod === 'credentials' 
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-lg' 
                    : 'text-emerald-200/70 hover:text-emerald-300 hover:bg-emerald-500/10'
                }`}
              >
                <Shield className="h-3 w-3 mr-1" />
                Credentials
              </Button>
            </div>

            {/* Wallet Login */}
            {loginMethod === 'wallet' && (
              <>
                {!isConnected ? (
                  <div className="text-center space-y-4">
                    <p className="text-emerald-200/70">Connect your wallet to access admin features</p>
                    <Button
                      onClick={handleWalletLogin}
                      disabled={loginMutation.isPending}
                      className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-all duration-300 shadow-lg shadow-emerald-500/25"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </Button>
                  </div>
                ) : !isAuthorized ? (
                  <div className="text-center space-y-4">
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-300">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Access Denied: Only authorized wallet addresses can access admin features.
                      </AlertDescription>
                    </Alert>
                    <p className="text-emerald-200/70 text-sm">Connected: {address}</p>
                    <p className="text-emerald-200/70 text-sm">Required: {ADMIN_WALLET_ADDRESS}</p>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-300"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Authorized wallet connected. Click below to access admin features.
                      </AlertDescription>
                    </Alert>
                    <p className="text-emerald-200/70 text-sm">Connected: {address}</p>
                    <Button
                      onClick={handleWalletLogin}
                      disabled={loginMutation.isPending}
                      className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-all duration-300 shadow-lg shadow-emerald-500/25"
                    >
                      {loginMutation.isPending ? "Authenticating..." : "Access Admin Panel"}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Credentials Login */}
            {loginMethod === 'credentials' && (
              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-emerald-200">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="bg-black/20 border-emerald-500/20 text-white placeholder:text-emerald-200/50 focus:border-emerald-400 focus:ring-emerald-400/20"
                    placeholder="admin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-emerald-200">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-black/20 border-emerald-500/20 text-white placeholder:text-emerald-200/50 focus:border-emerald-400 focus:ring-emerald-400/20"
                    placeholder="admin123"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-all duration-300 shadow-lg shadow-emerald-500/25"
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-emerald-200">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-400" />
            KILT Admin Panel
          </h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-300"
          >
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-black/40 backdrop-blur-xl border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-200/70">Treasury Balance</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {formatKiltAmount(adminStats?.treasury.balance || 0)}
                  </p>
                </div>
                <Wallet className="h-5 w-5 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-blue-500/20 shadow-lg shadow-blue-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-200/70">Total Allocation</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {formatKiltAmount(adminStats?.program.totalAllocation || 0)}
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-orange-500/20 shadow-lg shadow-orange-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-200/70">Daily Budget</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {formatKiltAmount(adminStats?.program.dailyBudget || 0)}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-purple-500/20 shadow-lg shadow-purple-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-200/70">Program Duration</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {adminStats?.settings.programDuration || 365} days
                  </p>
                </div>
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="treasury" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-black/40 backdrop-blur-xl border-emerald-500/20">
            <TabsTrigger 
              value="treasury" 
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-emerald-200/70"
            >
              Treasury Management
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-emerald-200/70"
            >
              Program Settings
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-emerald-200/70"
            >
              Operation History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="treasury" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Treasury Status */}
              <Card className="bg-black/40 backdrop-blur-xl border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">Treasury Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-200/70">Address:</span>
                    <span className="text-xs font-mono text-white">
                      {formatAddress(adminStats?.treasury.currentTreasuryAddress || '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-200/70">Balance:</span>
                    <span className="text-xs font-bold text-white tabular-nums">
                      {formatKiltAmount(adminStats?.treasury.balance || 0)} KILT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-200/70">Allowance:</span>
                    <span className="text-xs font-bold text-white tabular-nums">
                      {formatKiltAmount(adminStats?.treasury.allowance || 0)} KILT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-200/70">Can Transfer:</span>
                    <Badge 
                      variant={adminStats?.treasury.canTransfer ? "default" : "destructive"}
                      className={`text-xs ${adminStats?.treasury.canTransfer ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}
                    >
                      {adminStats?.treasury.canTransfer ? "Yes" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Treasury Operations */}
              <Card className="bg-black/40 backdrop-blur-xl border-blue-500/20 shadow-lg shadow-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">Treasury Operations</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <form onSubmit={handleTreasuryOperation} className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-emerald-200 text-sm">Operation Type</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={treasuryForm.operation === 'add' ? 'default' : 'outline'}
                          onClick={() => setTreasuryForm({ ...treasuryForm, operation: 'add' })}
                          className={`flex-1 h-8 text-xs ${treasuryForm.operation === 'add' ? 'bg-emerald-500/20 text-emerald-300' : 'border-emerald-500/20 text-emerald-200/70'}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant={treasuryForm.operation === 'remove' ? 'default' : 'outline'}
                          onClick={() => setTreasuryForm({ ...treasuryForm, operation: 'remove' })}
                          className={`flex-1 h-8 text-xs ${treasuryForm.operation === 'remove' ? 'bg-emerald-500/20 text-emerald-300' : 'border-emerald-500/20 text-emerald-200/70'}`}
                        >
                          <Minus className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                        <Button
                          type="button"
                          variant={treasuryForm.operation === 'transfer' ? 'default' : 'outline'}
                          onClick={() => setTreasuryForm({ ...treasuryForm, operation: 'transfer' })}
                          className={`flex-1 h-8 text-xs ${treasuryForm.operation === 'transfer' ? 'bg-emerald-500/20 text-emerald-300' : 'border-emerald-500/20 text-emerald-200/70'}`}
                        >
                          <ArrowLeftRight className="h-3 w-3 mr-1" />
                          Transfer
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-emerald-200 text-sm">Amount (KILT)</Label>
                      <Input
                        type="number"
                        value={treasuryForm.amount}
                        onChange={(e) => setTreasuryForm({ ...treasuryForm, amount: e.target.value })}
                        className="bg-black/20 border-emerald-500/20 text-white placeholder:text-emerald-200/50 focus:border-emerald-400 focus:ring-emerald-400/20 h-8 text-sm"
                        placeholder="1000"
                        required
                      />
                    </div>

                    {treasuryForm.operation !== 'add' && (
                      <div className="space-y-2">
                        <Label className="text-white">From Address</Label>
                        <Input
                          type="text"
                          value={treasuryForm.fromAddress}
                          onChange={(e) => setTreasuryForm({ ...treasuryForm, fromAddress: e.target.value })}
                          className="bg-black/20 border-gray-600 text-white"
                          placeholder="0x..."
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-white">To Address</Label>
                      <Input
                        type="text"
                        value={treasuryForm.toAddress}
                        onChange={(e) => setTreasuryForm({ ...treasuryForm, toAddress: e.target.value })}
                        className="bg-black/20 border-gray-600 text-white"
                        placeholder="0x..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Private Key</Label>
                      <Input
                        type={showKeys ? "text" : "password"}
                        value={treasuryForm.privateKey}
                        onChange={(e) => setTreasuryForm({ ...treasuryForm, privateKey: e.target.value })}
                        className="bg-black/20 border-gray-600 text-white"
                        placeholder="0x..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Reason</Label>
                      <Textarea
                        value={treasuryForm.reason}
                        onChange={(e) => setTreasuryForm({ ...treasuryForm, reason: e.target.value })}
                        className="bg-black/20 border-gray-600 text-white"
                        placeholder="Describe the reason for this operation..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowKeys(!showKeys)}
                        className="border-gray-600"
                      >
                        {showKeys ? 'Hide' : 'Show'} Keys
                      </Button>
                      <Button
                        type="submit"
                        disabled={treasuryMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        {treasuryMutation.isPending ? 'Processing...' : 'Execute Operation'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Program Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSettingsUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Program Duration (days)</Label>
                      <Input
                        type="number"
                        value={settingsForm.programDuration}
                        onChange={(e) => setSettingsForm({ ...settingsForm, programDuration: parseInt(e.target.value) })}
                        className="bg-black/20 border-gray-600 text-white"
                        min="1"
                        max="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Lock Period (days)</Label>
                      <Input
                        type="number"
                        value={settingsForm.lockPeriod}
                        onChange={(e) => setSettingsForm({ ...settingsForm, lockPeriod: parseInt(e.target.value) })}
                        className="bg-black/20 border-gray-600 text-white"
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Reward Formula Coefficients</h3>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Min Time Coefficient</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={settingsForm.minTimeCoefficient}
                        onChange={(e) => setSettingsForm({ ...settingsForm, minTimeCoefficient: parseFloat(e.target.value) })}
                        className="bg-black/20 border-gray-600 text-white"
                        min="0"
                        max="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Max Time Coefficient</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={settingsForm.maxTimeCoefficient}
                        onChange={(e) => setSettingsForm({ ...settingsForm, maxTimeCoefficient: parseFloat(e.target.value) })}
                        className="bg-black/20 border-gray-600 text-white"
                        min="0"
                        max="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Liquidity Weight (w1)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={settingsForm.liquidityWeight}
                        onChange={(e) => setSettingsForm({ ...settingsForm, liquidityWeight: parseFloat(e.target.value) })}
                        className="bg-black/20 border-gray-600 text-white"
                        min="0"
                        max="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Time Weight (w2)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={settingsForm.timeWeight}
                        onChange={(e) => setSettingsForm({ ...settingsForm, timeWeight: parseFloat(e.target.value) })}
                        className="bg-black/20 border-gray-600 text-white"
                        min="0"
                        max="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Minimum Position Value (USD)</Label>
                    <Input
                      type="number"
                      value={settingsForm.minimumPositionValue}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minimumPositionValue: parseFloat(e.target.value) })}
                      className="bg-black/20 border-gray-600 text-white"
                      min="1"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={settingsMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {settingsMutation.isPending ? 'Updating...' : 'Update Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Operation History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminStats?.operationHistory && adminStats.operationHistory.length > 0 ? (
                    adminStats.operationHistory.map((op, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <div>
                            <p className="text-white font-medium">{op.operation}</p>
                            <p className="text-sm text-white/70">{op.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">{op.amount ? `${op.amount} KILT` : 'N/A'}</p>
                          <p className="text-xs text-white/70">{new Date(op.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/70">
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