import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  DollarSign, 
  Calendar, 
  Calculator,
  TrendingUp,
  Timer,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
}

export function AdminPanelSimplified() {
  const { isConnected, address, connect, disconnect } = useWallet();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const ADMIN_WALLET_ADDRESSES = [
    '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
    '0x861722f739539CF31d86F1221460Fa96C9baB95C'
  ];

  // Treasury Configuration Form
  const [treasuryForm, setTreasuryForm] = useState({
    programBudget: 0,
    programDurationDays: 365,
    programStartDate: new Date().toISOString().split('T')[0],
    programEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true
  });

  // Formula Parameters Form
  const [formulaParams, setFormulaParams] = useState({
    timeBoostWeight: 0.6,        // b_time - time boost weight (0.6 = 60% boost)
    fullRangeBonus: 1.2,         // FRB - full range bonus multiplier
    inRangeRequirement: true,    // IRM - in-range requirement
    minimumPositionValue: 10,    // Minimum position value in USD
    lockPeriod: 7               // Lock period in days
  });

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

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      const response = await fetch('/api/admin/login-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      toast({
        title: "Login Successful",
        description: "Welcome to the admin panel",
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

  // Fetch admin stats
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Admin dashboard error:', errorText);
        throw new Error(`Failed to fetch admin data: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    },
    enabled: !!adminToken && isAuthorized,
    refetchInterval: 30000,
  });

  // Populate forms with current data
  useEffect(() => {
    if (adminStats?.treasury) {
      setTreasuryForm({
        programBudget: adminStats.treasury.programBudget || 0,
        programDurationDays: adminStats.treasury.programDuration || 365,
        programStartDate: new Date().toISOString().split('T')[0],
        programEndDate: new Date(Date.now() + (adminStats.treasury.programDuration || 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: adminStats.treasury.isActive
      });
    }
    
    if (adminStats?.settings) {
      setFormulaParams({
        timeBoostWeight: adminStats.settings.maxLiquidityBoost || 0.6,
        fullRangeBonus: 1.2,
        inRangeRequirement: adminStats.settings.inRangeRequirement || true,
        minimumPositionValue: adminStats.settings.minimumPositionValue || 10,
        lockPeriod: adminStats.settings.lockPeriod || 7
      });
    }
  }, [adminStats]);

  // Auto-calculate end date when start date or duration changes
  useEffect(() => {
    if (treasuryForm.programStartDate && treasuryForm.programDurationDays) {
      const startDate = new Date(treasuryForm.programStartDate);
      const endDate = new Date(startDate.getTime() + treasuryForm.programDurationDays * 24 * 60 * 60 * 1000);
      setTreasuryForm(prev => ({
        ...prev,
        programEndDate: endDate.toISOString().split('T')[0]
      }));
    }
  }, [treasuryForm.programStartDate, treasuryForm.programDurationDays]);

  // Treasury update mutation
  const treasuryMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/admin/treasury-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Treasury config error:', errorText);
        throw new Error(`Failed to update treasury configuration: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Treasury Updated",
        description: "Treasury configuration has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    loginMutation.mutate();
  };

  const handleLogout = () => {
    setAdminToken('');
    setIsAuthorized(false);
    disconnect();
  };

  // Formula parameters update mutation
  const formulaMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await fetch('/api/admin/program-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Formula params error:', errorText);
        throw new Error(`Failed to update formula parameters: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Formula Updated",
        description: "Formula parameters have been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTreasuryUpdate = () => {
    treasuryMutation.mutate({
      treasuryWalletAddress: '',
      programBudget: treasuryForm.programBudget,
      dailyRewardsCap: treasuryForm.programBudget / treasuryForm.programDurationDays,
      programDurationDays: treasuryForm.programDurationDays,
      programStartDate: new Date(treasuryForm.programStartDate),
      programEndDate: new Date(treasuryForm.programEndDate),
      isActive: treasuryForm.isActive
    });
  };

  const handleFormulaUpdate = () => {
    formulaMutation.mutate({
      maxLiquidityBoost: formulaParams.timeBoostWeight,
      minimumPositionValue: formulaParams.minimumPositionValue,
      lockPeriod: formulaParams.lockPeriod,
      inRangeRequirement: formulaParams.inRangeRequirement
    });
  };

  // Login screen
  if (!adminToken || !isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm border-gray-800/30">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              KILT Admin Panel
            </CardTitle>
            <p className="text-gray-400 text-sm">Treasury Management Access</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-300">Connect with your authorized admin wallet</p>
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
              disabled={loginMutation.isPending || !isAuthorized}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loginMutation.isPending ? 'Authenticating...' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Admin Panel
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            KILT Admin Panel
          </h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-gray-600/30 text-gray-300 hover:bg-gray-800/30 backdrop-blur-sm"
          >
            Logout
          </Button>
        </div>

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="text-center py-8">Loading admin data...</div>
        ) : (
          <div className="space-y-6">
            {/* Current Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/30">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1">Program Budget</p>
                  <p className="text-white font-bold text-lg">
                    {((adminStats?.treasury?.programBudget || 0) / 1000000).toFixed(1)}M KILT
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/30">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1">Daily Budget</p>
                  <p className="text-white font-bold text-lg">
                    {(adminStats?.treasury?.dailyRewardsCap || 0).toFixed(0)} KILT
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/30">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1">Program Duration</p>
                  <p className="text-white font-bold text-lg">
                    {adminStats?.treasury?.programDuration || 365} days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Treasury Configuration */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Treasury Configuration
                </CardTitle>
                <p className="text-gray-400 text-sm">Configure program budget and duration</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="programBudget" className="text-white">Program Budget (KILT)</Label>
                    <Input
                      id="programBudget"
                      type="number"
                      value={treasuryForm.programBudget?.toString() || ''}
                      onChange={(e) => setTreasuryForm({ ...treasuryForm, programBudget: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="Total KILT tokens allocated"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="programDuration" className="text-white">Program Duration (Days)</Label>
                    <Input
                      id="programDuration"
                      type="number"
                      value={treasuryForm.programDurationDays?.toString() || ''}
                      onChange={(e) => setTreasuryForm({ ...treasuryForm, programDurationDays: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="Duration in days"
                    />
                  </div>
                </div>
                
                {/* Auto-calculated daily budget */}
                {treasuryForm.programBudget > 0 && treasuryForm.programDurationDays > 0 && (
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Calculator className="w-4 h-4" />
                      <span className="font-medium">Daily Budget: {(treasuryForm.programBudget / treasuryForm.programDurationDays).toFixed(2)} KILT/day</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-white">Program Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={treasuryForm.programStartDate}
                      onChange={(e) => setTreasuryForm({ ...treasuryForm, programStartDate: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate" className="text-white">Program End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={treasuryForm.programEndDate}
                      readOnly
                      className="bg-gray-700/30 backdrop-blur-sm border-gray-600/30 text-gray-300 cursor-not-allowed"
                      title="Auto-calculated based on Start Date and Duration"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleTreasuryUpdate}
                  disabled={treasuryMutation.isPending || !treasuryForm.programBudget || treasuryForm.programBudget <= 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {treasuryMutation.isPending ? 'Updating Treasury...' : 'Update Treasury Configuration'}
                </Button>
              </CardContent>
            </Card>

            {/* Formula Parameters Configuration */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  Formula Parameters
                </CardTitle>
                <p className="text-gray-400 text-sm">Configure reward formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeBoostWeight" className="text-white">Time Boost Weight (b_time)</Label>
                    <Input
                      id="timeBoostWeight"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formulaParams.timeBoostWeight?.toString() || ''}
                      onChange={(e) => setFormulaParams({ ...formulaParams, timeBoostWeight: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="0.6 = 60% time boost"
                    />
                    <p className="text-xs text-gray-400 mt-1">Maximum time-based reward boost (0.6 = 60%)</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="fullRangeBonus" className="text-white">Full Range Bonus (FRB)</Label>
                    <Input
                      id="fullRangeBonus"
                      type="number"
                      step="0.1"
                      min="1"
                      max="2"
                      value={formulaParams.fullRangeBonus?.toString() || ''}
                      onChange={(e) => setFormulaParams({ ...formulaParams, fullRangeBonus: parseFloat(e.target.value) || 1 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="1.2 = 20% bonus"
                    />
                    <p className="text-xs text-gray-400 mt-1">Bonus for full range positions (1.2 = 20% bonus)</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimumPositionValue" className="text-white">Minimum Position Value ($)</Label>
                    <Input
                      id="minimumPositionValue"
                      type="number"
                      min="0"
                      value={formulaParams.minimumPositionValue?.toString() || ''}
                      onChange={(e) => setFormulaParams({ ...formulaParams, minimumPositionValue: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum USD value for spam protection</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="lockPeriod" className="text-white">Lock Period (Days)</Label>
                    <Input
                      id="lockPeriod"
                      type="number"
                      min="1"
                      value={formulaParams.lockPeriod?.toString() || ''}
                      onChange={(e) => setFormulaParams({ ...formulaParams, lockPeriod: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800/30 backdrop-blur-sm border-gray-700/30 text-white placeholder-gray-400"
                      placeholder="7"
                    />
                    <p className="text-xs text-gray-400 mt-1">Days rewards are locked before claiming</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="inRangeRequirement"
                    checked={formulaParams.inRangeRequirement}
                    onChange={(e) => setFormulaParams({ ...formulaParams, inRangeRequirement: e.target.checked })}
                    className="rounded bg-gray-800/30 backdrop-blur-sm border-gray-700/30"
                  />
                  <Label htmlFor="inRangeRequirement" className="text-white">
                    In-Range Requirement (IRM)
                  </Label>
                </div>
                <p className="text-xs text-gray-400 ml-6">Only in-range positions earn rewards</p>
                
                {/* Formula Preview */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Calculator className="w-4 h-4" />
                    <span className="font-medium">Formula Preview</span>
                  </div>
                  <div className="font-mono text-sm text-blue-300">
                    R_u = (L_u/L_T) * (1 + ((D_u/P)*{formulaParams.timeBoostWeight})) * {formulaParams.inRangeRequirement ? 'IRM' : '1'} * {formulaParams.fullRangeBonus} * (R/P)
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    • Time boost: {(formulaParams.timeBoostWeight * 100).toFixed(0)}% max
                    • Full range bonus: {((formulaParams.fullRangeBonus - 1) * 100).toFixed(0)}% extra
                    • In-range required: {formulaParams.inRangeRequirement ? 'Yes' : 'No'}
                  </div>
                </div>

                <Button 
                  onClick={handleFormulaUpdate}
                  disabled={formulaMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {formulaMutation.isPending ? 'Updating Formula...' : 'Update Formula Parameters'}
                </Button>
              </CardContent>
            </Card>

            {/* Treasury Progress */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Treasury Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <Badge variant={adminStats?.treasury?.isActive ? "default" : "destructive"} className="bg-emerald-600/20 backdrop-blur-sm">
                      {adminStats?.treasury?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Remaining:</span>
                      <span className="text-white">
                        {(adminStats?.treasury?.treasuryRemaining || 0).toLocaleString()} KILT
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${((adminStats?.treasury?.totalDistributed || 0) / (adminStats?.treasury?.programBudget || 1)) * 100}%` 
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
      </div>
    </div>
  );
}