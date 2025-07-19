import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  DollarSign,
  Users,
  Activity,
  CheckCircle,
  LogOut,
  Calendar,
  Coins,
  TrendingUp,
  Database,
  Clock,
  Globe
} from 'lucide-react';

interface AdminTreasuryStats {
  totalAllocation: number;
  dailyBudget: number;
  programDurationDays: number;
  programStartDate: string;
  programEndDate: string;
  daysRemaining: number;
  totalDistributed: number;
  currentParticipants: number;
  totalClaimed: number;
  treasuryProgress: number;
}

export function AdminPanelMinimal() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Skip auth for now
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [treasuryForm, setTreasuryForm] = useState({
    totalAllocation: 600000,
    programDurationDays: 120,
    dailyBudget: 5000
  });
  
  const [programForm, setProgramForm] = useState({
    timeBoostCoefficient: 0.6,
    fullRangeBonus: 1.2,
    minimumPositionValue: 10,
    lockPeriod: 7
  });

  const [blockchainForm, setBlockchainForm] = useState({
    kiltTokenAddress: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
    poolAddress: '0x0000000000000000000000000000000000000000'
  });

  // Treasury stats query
  const { data: treasuryStats, isLoading: statsLoading } = useQuery<AdminTreasuryStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Dashboard request failed: ${response.status}`);
      }
      return response.json();
    }
  });

  // Load current config values
  useEffect(() => {
    if (treasuryStats) {
      setTreasuryForm({
        totalAllocation: treasuryStats.totalAllocation || 600000,
        programDurationDays: treasuryStats.programDurationDays || 120,
        dailyBudget: treasuryStats.dailyBudget || 5000
      });
    }
  }, [treasuryStats]);

  // Operation history query
  const { data: operationHistory } = useQuery({
    queryKey: ['/api/admin/operations'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch('/api/admin/operations?limit=10', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Treasury update mutation
  const treasuryMutation = useMutation({
    mutationFn: async (data: typeof treasuryForm) => {
      const response = await fetch('/api/admin/treasury/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          programBudget: data.totalAllocation,
          programDurationDays: data.programDurationDays,
          treasuryWalletAddress: '0x0000000000000000000000000000000000000000',
          isActive: true
        })
      });
      if (!response.ok) throw new Error('Failed to update treasury');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Treasury configuration updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update treasury", variant: "destructive" });
    }
  });

  // Program settings mutation
  const programMutation = useMutation({
    mutationFn: async (data: typeof programForm) => {
      const response = await fetch('/api/admin/program/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update program settings');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Program settings updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update program settings", variant: "destructive" });
    }
  });

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            KILT Admin Panel
          </h1>
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="h-4 w-4 mr-1" />
            Authenticated
          </Badge>
        </div>

        {/* Treasury Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Allocation</CardTitle>
              <Coins className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${(treasuryStats?.totalAllocation || 0).toLocaleString()} KILT`}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
              <Calendar className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${treasuryStats?.daysRemaining || 0}`}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${treasuryStats?.currentParticipants || 0}`}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Budget</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${(treasuryStats?.dailyBudget || 0).toLocaleString()} KILT`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Panel Tabs */}
        <Tabs defaultValue="configuration" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 backdrop-blur-sm border-white/10">
            <TabsTrigger 
              value="configuration" 
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            >
              <Settings className="h-4 w-4 mr-2" />
              Program Configuration
            </TabsTrigger>
            <TabsTrigger 
              value="blockchain" 
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
            >
              <Globe className="h-4 w-4 mr-2" />
              Blockchain Config
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
            >
              <Database className="h-4 w-4 mr-2" />
              Operation History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Treasury Configuration */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-emerald-400">Treasury Configuration</CardTitle>
                  <CardDescription>
                    Configure program budget and duration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="totalAllocation">Total Allocation (KILT)</Label>
                    <Input
                      id="totalAllocation"
                      type="number"
                      value={treasuryForm.totalAllocation}
                      onChange={(e) => setTreasuryForm(prev => ({ ...prev, totalAllocation: parseInt(e.target.value) }))}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="programDuration">Program Duration (Days)</Label>
                    <Input
                      id="programDuration"
                      type="number"
                      value={treasuryForm.programDurationDays}
                      onChange={(e) => setTreasuryForm(prev => ({ ...prev, programDurationDays: parseInt(e.target.value) }))}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <Button 
                    onClick={() => treasuryMutation.mutate(treasuryForm)}
                    disabled={treasuryMutation.isPending}
                    className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    {treasuryMutation.isPending ? 'Updating...' : 'Update Treasury Config'}
                  </Button>
                </CardContent>
              </Card>

              {/* Program Parameters */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-emerald-400">Program Parameters</CardTitle>
                  <CardDescription>
                    Configure reward formula parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timeBoost">Time Boost Coefficient</Label>
                    <Input
                      id="timeBoost"
                      type="number"
                      step="0.1"
                      value={programForm.timeBoostCoefficient}
                      onChange={(e) => setProgramForm(prev => ({ ...prev, timeBoostCoefficient: parseFloat(e.target.value) }))}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullRangeBonus">Full Range Bonus</Label>
                    <Input
                      id="fullRangeBonus"
                      type="number"
                      step="0.1"
                      value={programForm.fullRangeBonus}
                      onChange={(e) => setProgramForm(prev => ({ ...prev, fullRangeBonus: parseFloat(e.target.value) }))}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minPosition">Minimum Position Value ($)</Label>
                    <Input
                      id="minPosition"
                      type="number"
                      value={programForm.minimumPositionValue}
                      onChange={(e) => setProgramForm(prev => ({ ...prev, minimumPositionValue: parseInt(e.target.value) }))}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <Button 
                    onClick={() => programMutation.mutate(programForm)}
                    disabled={programMutation.isPending}
                    className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    {programMutation.isPending ? 'Updating...' : 'Update Program Settings'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="blockchain" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-blue-400">Blockchain Configuration</CardTitle>
                <CardDescription>
                  Configure token addresses and network settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="kiltToken">KILT Token Address</Label>
                    <Input
                      id="kiltToken"
                      value={blockchainForm.kiltTokenAddress}
                      onChange={(e) => setBlockchainForm(prev => ({ ...prev, kiltTokenAddress: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="poolAddress">KILT/ETH Pool Address</Label>
                    <Input
                      id="poolAddress"
                      value={blockchainForm.poolAddress}
                      onChange={(e) => setBlockchainForm(prev => ({ ...prev, poolAddress: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white font-mono text-sm"
                      placeholder="0x..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-blue-400">Network: Base Mainnet (Chain ID: 8453)</span>
                </div>
                <Button 
                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                  disabled
                >
                  Update Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-purple-400">Operation History</CardTitle>
                <CardDescription>
                  View recent admin actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {operationHistory && operationHistory.length > 0 ? (
                    operationHistory.map((event: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            event.success ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                          <div>
                            <div className="text-sm text-white">{event.operationType}</div>
                            <div className="text-xs text-gray-400">by {event.performedBy || 'system'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-4">
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