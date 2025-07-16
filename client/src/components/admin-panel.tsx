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
  ShieldCheck,
  Timer,
  Unlock,
  Calculator,
  Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/wallet-context';

interface AdminStats {
  treasury: {
    balance: number;
    address: string;
    programBudget: number; // Single unified budget field
    dailyRewardsCap: number;
    programDuration: number; // Authoritative source for program duration
    isActive: boolean;
    totalDistributed: number;
    treasuryRemaining: number;
  };
  settings: {
    // NOTE: programDuration removed - now controlled by Treasury Config
    maxLiquidityBoost: number;
    minimumPositionValue: number;
    lockPeriod: number;
    inRangeRequirement: boolean;
  };
  operationHistory: any[];
}

export function AdminPanel() {
  const { isConnected, address, connect, disconnect } = useWallet();
  const [adminToken, setAdminToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  // Wallet-only authentication
  
  const ADMIN_WALLET_ADDRESSES = [
    '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
    '0x861722f739539CF31d86F1221460Fa96C9baB95C'
  ];
  
  // Treasury Configuration Form (NO PRIVATE KEYS)
  const [treasuryConfigForm, setTreasuryConfigForm] = useState({
    treasuryWalletAddress: '',
    programBudget: 0, // Single unified budget field
    dailyRewardsCap: 0,
    programDurationDays: 365,
    programStartDate: new Date().toISOString().split('T')[0],
    programEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true
  });
  
  // Program Settings Form - Updated for Refined Formula
  const [settingsForm, setSettingsForm] = useState({
    // NOTE: programDuration removed - now controlled by Treasury Config
    maxLiquidityBoost: 0.6, // w1 - max liquidity boost (60% boost at program end)
    minimumPositionValue: 10, // minimum USD value (0 = no minimum)
    lockPeriod: 7, // claim lock period in days
    inRangeRequirement: true // whether IRM (In-Range Multiplier) is required
  });
  
  const queryClient = useQueryClient();
  
  // Check if connected wallet is authorized
  useEffect(() => {
    if (isConnected && address) {
      const isAuth = ADMIN_WALLET_ADDRESSES.some(adminAddr => 
        address.toLowerCase() === adminAddr.toLowerCase()
      );
      setIsAuthorized(isAuth);
    } else {
      setIsAuthorized(false);
    }
  }, [isConnected, address]);

  // Fetch admin stats
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      if (!adminToken) {
        throw new Error('No admin token available');
      }
      
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin data');
      }
      
      return response.json();
    },
    enabled: !!adminToken && isAuthorized,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Populate forms with current admin data
  useEffect(() => {
    if (adminStats?.treasury) {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + (adminStats.treasury.programDuration || 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      setTreasuryConfigForm({
        treasuryWalletAddress: adminStats.treasury.address || '',
        programBudget: adminStats.treasury.programBudget || 2905600,
        dailyRewardsCap: adminStats.treasury.dailyRewardsCap || 7960,
        programDurationDays: adminStats.treasury.programDuration || 365,
        programStartDate: startDate,
        programEndDate: endDate,
        isActive: adminStats.treasury.isActive || true
      });
    }
    
    // Populate refined formula settings
    if (adminStats?.settings) {
      setSettingsForm({
        // NOTE: programDuration removed - now controlled by Treasury Config
        maxLiquidityBoost: adminStats.settings.maxLiquidityBoost || 0.6,
        minimumPositionValue: adminStats.settings.minimumPositionValue || 0,
        lockPeriod: adminStats.settings.lockPeriod || 7,
        inRangeRequirement: adminStats.settings.inRangeRequirement ?? true
      });
    }
  }, [adminStats]);

  // Auto-calculate program end date when start date or duration changes
  useEffect(() => {
    if (treasuryConfigForm.programStartDate && treasuryConfigForm.programDurationDays) {
      const startDate = new Date(treasuryConfigForm.programStartDate);
      const endDate = new Date(startDate.getTime() + treasuryConfigForm.programDurationDays * 24 * 60 * 60 * 1000);
      const endDateString = endDate.toISOString().split('T')[0];
      
      setTreasuryConfigForm(prev => ({
        ...prev,
        programEndDate: endDateString
      }));
    }
  }, [treasuryConfigForm.programStartDate, treasuryConfigForm.programDurationDays]);

  // Wallet-only admin login mutation
  const loginMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const response = await fetch('/api/admin/login-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Wallet authentication failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      localStorage.setItem('adminToken', data.token);
      setIsAuthorized(true);
      // Admin wallet login successful
      
      // Force a refresh of admin stats after successful login
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
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

  // No auto-login - always require explicit login

  // Treasury configuration mutation (SECURE - NO PRIVATE KEYS)
  const treasuryConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/admin/treasury/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update treasury configuration');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Treasury configuration updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
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
      const response = await fetch('/api/admin/program/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update program settings');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Program settings updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle wallet login
  const handleLogin = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    if (!ADMIN_WALLET_ADDRESSES.some(adminAddr => 
      address.toLowerCase() === adminAddr.toLowerCase()
    )) {
      toast({
        title: "Unauthorized",
        description: "This wallet is not authorized for admin access",
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate(address);
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
    
    // Validate required fields
    const missingFields = [];
    if (!treasuryConfigForm.programBudget || treasuryConfigForm.programBudget <= 0) missingFields.push("Program Budget");
    if (!treasuryConfigForm.programDurationDays || treasuryConfigForm.programDurationDays <= 0) missingFields.push("Program Duration");
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    const config = {
      ...treasuryConfigForm,
      annualRewardsBudget: treasuryConfigForm.annualRewardsBudget,
      dailyRewardsCap: treasuryConfigForm.annualRewardsBudget / treasuryConfigForm.programDurationDays, // Calculate daily from annual budget
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

  // Login UI - always require explicit login
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
            {/* Wallet Authentication Only */}

            <div className="space-y-4">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Connect with your authorized admin wallet to access the admin panel.
                </AlertDescription>
              </Alert>
              
              {!isConnected ? (
                <Button onClick={connect} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    Wallet Connected
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
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            KILT Admin Panel
          </h1>
          <div className="flex items-center gap-4">
            <Badge variant="default" className="bg-emerald-600/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-300">
              Wallet Auth
            </Badge>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-gray-600/30 text-gray-300 hover:bg-gray-800/30 backdrop-blur-sm"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="text-center py-8">Loading admin data...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Program Budget */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Program Budget</p>
                  <p className="text-white font-bold text-lg">
                    {((adminStats?.treasury?.programBudget || 2905600) / 1000000).toFixed(1)}M KILT
                  </p>
                  <p className="text-blue-300 text-xs">Total Allocation</p>
                </div>

                {/* Daily Rewards Cap */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Daily Rewards Cap</p>
                  <p className="text-white font-bold text-lg">
                    {(adminStats?.treasury?.dailyRewardsCap || 0).toFixed(2)} KILT
                  </p>
                  <p className="text-purple-300 text-xs">Per Day</p>
                </div>

                {/* Program Duration */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Program Duration</p>
                  <p className="text-white font-bold text-lg">
                    {adminStats?.treasury?.programDuration || 365} days
                  </p>
                  <p className="text-orange-300 text-xs">Active Period</p>
                </div>

                {/* Remaining Budget */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Remaining Budget</p>
                  <p className="text-white font-bold text-lg">
                    {((adminStats?.treasury?.treasuryRemaining || 2905600) / 1000000).toFixed(1)}M KILT
                  </p>
                  <p className="text-green-300 text-xs">Available</p>
                </div>
              </div>
            </div>

            {/* Treasury Progress */}
            <Card className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Treasury Distribution Progress</h3>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
                      {adminStats?.treasury?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Remaining:</span>
                      <span className="text-white">
                        {(adminStats?.treasury?.treasuryRemaining || 2905600).toLocaleString()} KILT
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${((adminStats?.treasury?.totalDistributed || 0) / (adminStats?.treasury?.programBudget || 2905600)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Distributed:</span>
                      <span className="text-white">
                        {(adminStats?.treasury?.totalDistributed || 0).toLocaleString()} KILT
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Admin Tabs */}
        <Tabs defaultValue="unified-config" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30">
            <TabsTrigger value="unified-config" className="text-gray-300 data-[state=active]:bg-gray-700/50 data-[state=active]:backdrop-blur-sm">
              Program Configuration
            </TabsTrigger>
            <TabsTrigger value="history" className="text-gray-300 data-[state=active]:bg-gray-700/50 data-[state=active]:backdrop-blur-sm">
              Operation History
            </TabsTrigger>
          </TabsList>



          {/* Unified Program Configuration Tab */}
          <TabsContent value="unified-config" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Unified Program Configuration
                </CardTitle>
                <div className="text-sm text-gray-400 mt-2">
                  <p className="mb-1">Complete treasury and program settings in one place</p>
                  <code className="text-emerald-400">R_u = (L_u/L_T) × (1 + ((D_u/P)×b_time)) × IRM × FRB × (R/P)</code>
                  <p className="text-xs mt-1 text-yellow-400">FRB = Full Range Bonus (1.2x for 50/50 balanced positions)</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Notice:</strong> This configuration system does not require private keys. 
                    All treasury operations are read-only with secure wallet-based configuration management.
                  </AlertDescription>
                </Alert>
                
                {/* Treasury Configuration Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Treasury Configuration</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="treasuryAddress" className="text-white">Treasury Wallet Address <span className="text-gray-400 font-normal">(Optional)</span></Label>
                    <Input
                      id="treasuryAddress"
                      value={treasuryConfigForm.treasuryWalletAddress}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, treasuryWalletAddress: e.target.value })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="0x... (Leave empty if not available)"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="programBudget" className="text-white">Program Budget (KILT)</Label>
                    <Input
                      id="programBudget"
                      type="number"
                      value={treasuryConfigForm.programBudget?.toString() || ''}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programBudget: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="Total KILT tokens allocated for program"
                    />
                    <p className="text-xs text-gray-400 mt-1">Single unified budget for entire program duration</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="programDuration" className="text-white">Program Duration (Days)</Label>
                    <Input
                      id="programDuration"
                      type="number"
                      value={treasuryConfigForm.programDurationDays?.toString() || ''}
                      onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programDurationDays: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="Duration in days"
                    />
                    <p className="text-xs text-gray-400 mt-1">Auto-calculates daily rewards cap</p>
                  </div>
                </div>
                
                {/* Auto-calculated daily rewards cap display */}
                {treasuryConfigForm.programBudget > 0 && treasuryConfigForm.programDurationDays > 0 && (
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Calculator className="w-4 h-4" />
                      <span className="font-medium">Auto-calculated Daily Budget</span>
                    </div>
                    <p className="text-emerald-300 text-sm mt-1">
                      Daily Rewards Cap: {((treasuryConfigForm.programBudget || 0) / (treasuryConfigForm.programDurationDays || 1)).toFixed(2)} KILT/day
                    </p>
                  </div>
                )}
                
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
                      readOnly
                      className="bg-gray-700/30 backdrop-blur-sm border-gray-600/30 text-gray-300 cursor-not-allowed"
                      title="Auto-calculated based on Start Date and Duration"
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      Auto-calculated from Start Date + Duration
                    </div>
                  </div>
                </div>

                </div>
                
                {/* Program Settings Section - Hybrid Mode */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Hybrid Reward Settings</h3>
                  <div className="text-sm text-gray-400 mb-4">
                    <p>Combine Merkl's fee-based rewards with KILT's time-based approach for optimal incentives</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Merkl-Style Weights */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-emerald-400">Merkl Components (60%)</h4>
                      
                      <div>
                        <Label htmlFor="feeWeight" className="text-white">Fee Earnings Weight</Label>
                        <Input
                          id="feeWeight"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value="0.30"
                          className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                          readOnly
                        />
                        <p className="text-xs text-gray-400 mt-1">30% - Rewards based on fees earned</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="token0Weight" className="text-white">KILT Holdings Weight</Label>
                        <Input
                          id="token0Weight"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value="0.15"
                          className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                          readOnly
                        />
                        <p className="text-xs text-gray-400 mt-1">15% - Rewards based on KILT token holdings</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="token1Weight" className="text-white">ETH Holdings Weight</Label>
                        <Input
                          id="token1Weight"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value="0.15"
                          className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                          readOnly
                        />
                        <p className="text-xs text-gray-400 mt-1">15% - Rewards based on ETH token holdings</p>
                      </div>
                    </div>
                    
                    {/* KILT-Style Weights */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-blue-400">KILT Components (40%)</h4>
                      
                      <div>
                        <Label htmlFor="liquidityWeight" className="text-white">Liquidity Share Weight</Label>
                        <Input
                          id="liquidityWeight"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value="0.25"
                          className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                          readOnly
                        />
                        <p className="text-xs text-gray-400 mt-1">25% - Rewards based on liquidity share</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="timeWeight" className="text-white">Time Progression Weight</Label>
                        <Input
                          id="timeWeight"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value="0.15"
                          className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                          readOnly
                        />
                        <p className="text-xs text-gray-400 mt-1">15% - Rewards based on time commitment</p>
                      </div>
                      
                      <div>
                        <Label className="text-white flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={true}
                            readOnly
                            className="rounded bg-gray-800/30 backdrop-blur-sm border-gray-700/30"
                          />
                          Concentration Bonus
                        </Label>
                        <p className="text-xs text-gray-400 mt-1">Tighter ranges earn up to 2x bonus</p>
                      </div>
                    </div>
                    
                    {/* Standard Settings */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-purple-400">Standard Settings</h4>
                      
                      <div>
                        <Label htmlFor="maxLiquidityBoost" className="text-white">Max Liquidity Boost (w1)</Label>
                        <Input
                          id="maxLiquidityBoost"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={settingsForm.maxLiquidityBoost?.toString() || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, maxLiquidityBoost: parseFloat(e.target.value) || 0 })}
                          className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">0.6 = 60% time boost at program end</p>
                      </div>
                    
                      <div>
                        <Label htmlFor="minimumPositionValue" className="text-white">Minimum Position Value ($)</Label>
                      <Input
                        id="minimumPositionValue"
                        type="number"
                        min="0"
                        value={settingsForm.minimumPositionValue?.toString() || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, minimumPositionValue: parseInt(e.target.value) || 0 })}
                        className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">0 = no minimum (any position eligible)</p>
                      </div>
                    
                      <div>
                        <Label htmlFor="lockPeriod" className="text-white">Claim Lock Period (Days)</Label>
                      <Input
                        id="lockPeriod"
                        type="number"
                        min="1"
                        value={settingsForm.lockPeriod?.toString() || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, lockPeriod: parseInt(e.target.value) || 0 })}
                        className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Rolling claim period (7 days recommended)</p>
                      </div>
                    
                      <div>
                        <Label className="text-white flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settingsForm.inRangeRequirement || false}
                            onChange={(e) => setSettingsForm({ ...settingsForm, inRangeRequirement: e.target.checked })}
                            className="rounded bg-gray-800/30 backdrop-blur-sm border-gray-700/30"
                          />
                          In-Range Requirement (IRM)
                        </Label>
                        <p className="text-xs text-gray-400 mt-1">Whether positions must be in-range to earn rewards</p>
                      </div>
                      
                      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <span className="font-medium">📊 Full Range Bonus (FRB)</span>
                        </div>
                        <p className="text-yellow-300 text-sm mt-1">
                          Full range positions (50/50 balanced) automatically receive 1.2x bonus (20% boost). 
                          Concentrated positions get 1.0x (no bonus) and "try their luck" with focused ranges.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Unified Update Button */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={handleTreasuryConfigUpdate}
                    disabled={treasuryConfigMutation.isPending || !treasuryConfigForm.programBudget || treasuryConfigForm.programBudget <= 0}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {treasuryConfigMutation.isPending ? 'Updating Treasury...' : 'Update Treasury Config'}
                  </Button>
                  
                  <Button 
                    onClick={handleSettingsUpdate}
                    disabled={settingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {settingsMutation.isPending ? 'Updating Settings...' : 'Update Program Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Removed separate Program Settings Tab - now unified */}

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