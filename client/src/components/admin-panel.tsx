import React, { useState } from 'react';
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
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showKeys, setShowKeys] = useState(false);
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
  
  // Admin login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      localStorage.setItem('adminToken', data.token);
      toast({
        title: "Success",
        description: "Admin login successful",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
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

  const handleLogout = () => {
    setAdminToken('');
    localStorage.removeItem('adminToken');
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

  // Login form if not authenticated
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-white">
              <Shield className="h-6 w-6" />
              Admin Panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="bg-black/20 border-gray-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="bg-black/20 border-gray-600 text-white"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Shield className="h-8 w-8" />
            KILT Admin Panel
          </h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
          >
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Treasury Balance</p>
                  <p className="text-2xl font-bold text-white">
                    {formatKiltAmount(adminStats?.treasury.balance || 0)}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Total Allocation</p>
                  <p className="text-2xl font-bold text-white">
                    {formatKiltAmount(adminStats?.program.totalAllocation || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Daily Budget</p>
                  <p className="text-2xl font-bold text-white">
                    {formatKiltAmount(adminStats?.program.dailyBudget || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Program Duration</p>
                  <p className="text-2xl font-bold text-white">
                    {adminStats?.settings.programDuration || 365} days
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="treasury" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="treasury">Treasury Management</TabsTrigger>
            <TabsTrigger value="settings">Program Settings</TabsTrigger>
            <TabsTrigger value="history">Operation History</TabsTrigger>
          </TabsList>

          <TabsContent value="treasury" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Treasury Status */}
              <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Treasury Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Address:</span>
                    <span className="text-sm font-mono text-white">
                      {formatAddress(adminStats?.treasury.currentTreasuryAddress || '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Balance:</span>
                    <span className="text-sm font-bold text-white">
                      {formatKiltAmount(adminStats?.treasury.balance || 0)} KILT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Allowance:</span>
                    <span className="text-sm font-bold text-white">
                      {formatKiltAmount(adminStats?.treasury.allowance || 0)} KILT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Can Transfer:</span>
                    <Badge variant={adminStats?.treasury.canTransfer ? "default" : "destructive"}>
                      {adminStats?.treasury.canTransfer ? "Yes" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Treasury Operations */}
              <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Treasury Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTreasuryOperation} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Operation Type</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={treasuryForm.operation === 'add' ? 'default' : 'outline'}
                          onClick={() => setTreasuryForm({ ...treasuryForm, operation: 'add' })}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant={treasuryForm.operation === 'remove' ? 'default' : 'outline'}
                          onClick={() => setTreasuryForm({ ...treasuryForm, operation: 'remove' })}
                          className="flex-1"
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                        <Button
                          type="button"
                          variant={treasuryForm.operation === 'transfer' ? 'default' : 'outline'}
                          onClick={() => setTreasuryForm({ ...treasuryForm, operation: 'transfer' })}
                          className="flex-1"
                        >
                          <ArrowLeftRight className="h-4 w-4 mr-1" />
                          Transfer
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Amount (KILT)</Label>
                      <Input
                        type="number"
                        value={treasuryForm.amount}
                        onChange={(e) => setTreasuryForm({ ...treasuryForm, amount: e.target.value })}
                        className="bg-black/20 border-gray-600 text-white"
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