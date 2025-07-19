import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, TrendingUp, Users, DollarSign, Calendar, LogOut } from 'lucide-react';

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

interface ProgramSettings {
  timeBoostCoefficient: number;
  fullRangeBonus: number;
  minimumPositionValue: number;
  lockPeriod: number;
}

export function AdminPanelRestored() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
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

  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch dashboard data
  const { data: treasuryStats, isLoading: statsLoading } = useQuery<AdminTreasuryStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Dashboard failed');
      return response.json();
    }
  });

  // Fetch program settings
  const { data: programSettings } = useQuery<ProgramSettings>({
    queryKey: ['/api/admin-simple/config'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch('/api/admin-simple/config', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Config failed');
      return response.json();
    }
  });

  // Update form states when data loads
  useEffect(() => {
    if (treasuryStats) {
      setTreasuryForm({
        totalAllocation: treasuryStats.totalAllocation,
        programDurationDays: treasuryStats.programDurationDays,
        dailyBudget: treasuryStats.dailyBudget
      });
    }
  }, [treasuryStats]);

  useEffect(() => {
    if (programSettings) {
      setProgramForm(programSettings);
    }
  }, [programSettings]);

  // Login handler
  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        toast({ title: "Success", description: "Logged in successfully" });
      } else {
        toast({ title: "Error", description: "Invalid credentials", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Login failed", variant: "destructive" });
    }
    setLoginLoading(false);
  };

  // Treasury mutation
  const treasuryMutation = useMutation({
    mutationFn: async (data: typeof treasuryForm) => {
      const response = await fetch('/api/admin-simple/treasury', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAllocation: data.totalAllocation,
          programDurationDays: data.programDurationDays,
          dailyBudget: data.dailyBudget
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update treasury');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Treasury configuration updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to update treasury: ${error.message}`, variant: "destructive" });
    }
  });

  // Program settings mutation
  const programMutation = useMutation({
    mutationFn: async (data: typeof programForm) => {
      const response = await fetch('/api/admin-simple/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-96 bg-white/5 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                placeholder="admin123"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loginLoading}
              className="w-full bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">KILT Admin Panel</h1>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Dashboard Stats */}
        {treasuryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-white/60">Total Allocation</p>
                    <p className="text-lg font-bold text-white">{treasuryStats.totalAllocation.toLocaleString()} KILT</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-xs text-white/60">Active Participants</p>
                    <p className="text-lg font-bold text-white">{treasuryStats.currentParticipants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-xs text-white/60">Days Remaining</p>
                    <p className="text-lg font-bold text-white">{treasuryStats.daysRemaining}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-xs text-white/60">Daily Budget</p>
                    <p className="text-lg font-bold text-white">{treasuryStats.dailyBudget.toLocaleString()} KILT</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuration Tabs */}
        <Tabs defaultValue="treasury" className="w-full">
          <TabsList className="bg-white/5 backdrop-blur-sm border-white/20">
            <TabsTrigger value="treasury" className="text-white data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              Treasury Config
            </TabsTrigger>
            <TabsTrigger value="program" className="text-white data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              Program Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="treasury" className="mt-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-emerald-400" />
                  Treasury Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="totalAllocation" className="text-white">Total Allocation (KILT)</Label>
                  <Input
                    id="totalAllocation"
                    type="number"
                    value={treasuryForm.totalAllocation}
                    onChange={(e) => setTreasuryForm(prev => ({ ...prev, totalAllocation: parseInt(e.target.value) || 0 }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="programDuration" className="text-white">Program Duration (Days)</Label>
                  <Input
                    id="programDuration"
                    type="number"
                    value={treasuryForm.programDurationDays}
                    onChange={(e) => setTreasuryForm(prev => ({ ...prev, programDurationDays: parseInt(e.target.value) || 0 }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="dailyBudget" className="text-white">Daily Budget (KILT)</Label>
                  <Input
                    id="dailyBudget"
                    type="number"
                    value={treasuryForm.dailyBudget}
                    onChange={(e) => setTreasuryForm(prev => ({ ...prev, dailyBudget: parseInt(e.target.value) || 0 }))}
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
          </TabsContent>

          <TabsContent value="program" className="mt-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-blue-400" />
                  Program Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="timeBoostCoefficient" className="text-white">Time Boost Coefficient</Label>
                  <Input
                    id="timeBoostCoefficient"
                    type="number"
                    step="0.1"
                    value={programForm.timeBoostCoefficient}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, timeBoostCoefficient: parseFloat(e.target.value) || 0 }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="fullRangeBonus" className="text-white">Full Range Bonus</Label>
                  <Input
                    id="fullRangeBonus"
                    type="number"
                    step="0.1"
                    value={programForm.fullRangeBonus}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, fullRangeBonus: parseFloat(e.target.value) || 0 }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="minimumPositionValue" className="text-white">Minimum Position Value ($)</Label>
                  <Input
                    id="minimumPositionValue"
                    type="number"
                    value={programForm.minimumPositionValue}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, minimumPositionValue: parseInt(e.target.value) || 0 }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="lockPeriod" className="text-white">Lock Period (Days)</Label>
                  <Input
                    id="lockPeriod"
                    type="number"
                    value={programForm.lockPeriod}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, lockPeriod: parseInt(e.target.value) || 0 }))}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <Button 
                  onClick={() => programMutation.mutate(programForm)}
                  disabled={programMutation.isPending}
                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                >
                  {programMutation.isPending ? 'Updating...' : 'Update Program Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {statsLoading && (
          <div className="text-center text-white/60">
            Loading dashboard data...
          </div>
        )}
      </div>
    </div>
  );
}