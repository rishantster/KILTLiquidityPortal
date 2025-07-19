import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, Zap, Activity, DollarSign, Clock, Shield, LogOut, Settings, Database } from 'lucide-react';

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

export function AdminPanelCyberpunk() {
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

  // Fetch dashboard data with cyberpunk error handling
  const { data: treasuryStats, isLoading: statsLoading } = useQuery<AdminTreasuryStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated,
    refetchInterval: 2000, // More frequent updates for cyberpunk feel
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('SYSTEM BREACH DETECTED');
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
      if (!response.ok) throw new Error('CONFIG ACCESS DENIED');
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

  // Cyberpunk login handler
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
        toast({ title: "ACCESS GRANTED", description: "Neural link established" });
      } else {
        toast({ title: "ACCESS DENIED", description: "Authentication failed", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "SYSTEM ERROR", description: "Connection lost", variant: "destructive" });
    }
    setLoginLoading(false);
  };

  // Treasury mutation with cyberpunk messaging
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
        throw new Error('TREASURY UPDATE FAILED');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "TREASURY UPDATED", description: "Configuration synchronized" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    },
    onError: (error: any) => {
      toast({ title: "UPDATE FAILED", description: `System error: ${error.message}`, variant: "destructive" });
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
      if (!response.ok) throw new Error('PROGRAM UPDATE FAILED');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "PROGRAM UPDATED", description: "Parameters synchronized" });
    },
    onError: () => {
      toast({ title: "UPDATE FAILED", description: "System malfunction detected", variant: "destructive" });
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
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        {/* Cyberpunk Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 0, 102, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0, 255, 65, 0.1) 0%, transparent 50%)`
        }}></div>
        
        <Card className="w-96 bg-black/80 backdrop-blur-md border-2 border-neon-pink/50 relative z-10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/5 to-transparent rounded-lg"></div>
          <CardHeader className="relative">
            <CardTitle className="text-center text-2xl font-bold text-neon-pink flex items-center justify-center gap-2">
              <Terminal className="h-6 w-6 text-terminal-green" />
              ADMIN ACCESS
            </CardTitle>
            <p className="text-center text-terminal-green text-sm font-mono">
              &gt; NEURAL INTERFACE REQUIRED
            </p>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div>
              <Label htmlFor="username" className="text-terminal-green font-mono text-sm">
                &gt; USERNAME
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/70 border-terminal-green/50 text-terminal-green font-mono placeholder:text-terminal-green/50 focus:border-terminal-green focus:ring-terminal-green/20"
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-terminal-green font-mono text-sm">
                &gt; PASSWORD
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/70 border-terminal-green/50 text-terminal-green font-mono placeholder:text-terminal-green/50 focus:border-terminal-green focus:ring-terminal-green/20"
                placeholder="●●●●●●●●"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-neon-pink to-neon-pink/80 text-black font-bold hover:from-neon-pink/90 hover:to-neon-pink/70 border-none shadow-lg hover:shadow-neon-pink/50 transition-all duration-300"
            >
              {loginLoading ? (
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 animate-pulse" />
                  CONNECTING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  ESTABLISH LINK
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Cyberpunk Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255, 0, 102, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 255, 65, 0.08) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(255, 0, 102, 0.05) 0%, transparent 50%)`
      }}></div>
      
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Cyberpunk Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-neon-pink font-mono tracking-wider">
                KILT.ADMIN.SYS
              </h1>
              <p className="text-terminal-green font-mono text-sm mt-1">
                &gt; TREASURY CONTROL INTERFACE v2.1.7
              </p>
            </div>
            <Button 
              onClick={handleLogout}
              className="bg-black/80 border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400 font-mono transition-all duration-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              DISCONNECT
            </Button>
          </div>

          {/* Cyberpunk Dashboard Stats */}
          {treasuryStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-black/80 backdrop-blur-md border-2 border-neon-pink/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/10 to-transparent"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-neon-pink font-mono text-xs uppercase tracking-wider">TREASURY.ALLOC</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {treasuryStats.totalAllocation.toLocaleString()}
                      </p>
                      <p className="text-neon-pink/70 text-xs font-mono">KILT</p>
                    </div>
                    <Database className="h-8 w-8 text-neon-pink/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/80 backdrop-blur-md border-2 border-terminal-green/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-terminal-green/10 to-transparent"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-terminal-green font-mono text-xs uppercase tracking-wider">ACTIVE.NODES</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {treasuryStats.currentParticipants}
                      </p>
                      <p className="text-terminal-green/70 text-xs font-mono">CONNECTED</p>
                    </div>
                    <Activity className="h-8 w-8 text-terminal-green/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/80 backdrop-blur-md border-2 border-orange-500/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-400 font-mono text-xs uppercase tracking-wider">TIME.REMAIN</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {treasuryStats.daysRemaining}
                      </p>
                      <p className="text-orange-400/70 text-xs font-mono">CYCLES</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-400/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/80 backdrop-blur-md border-2 border-cyan-500/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-400 font-mono text-xs uppercase tracking-wider">DAILY.RATE</p>
                      <p className="text-2xl font-bold text-white font-mono">
                        {treasuryStats.dailyBudget.toLocaleString()}
                      </p>
                      <p className="text-cyan-400/70 text-xs font-mono">KILT/DAY</p>
                    </div>
                    <Zap className="h-8 w-8 text-cyan-400/60" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cyberpunk Configuration Tabs */}
          <Tabs defaultValue="treasury" className="w-full">
            <TabsList className="bg-black/80 backdrop-blur-md border border-gray-500/30 p-1">
              <TabsTrigger 
                value="treasury" 
                className="text-white data-[state=active]:bg-neon-pink data-[state=active]:text-black font-mono transition-all duration-300 hover:text-neon-pink border-r border-gray-500/30"
              >
                <Database className="h-4 w-4 mr-2" />
                TREASURY.SYS
              </TabsTrigger>
              <TabsTrigger 
                value="program" 
                className="text-white data-[state=active]:bg-terminal-green data-[state=active]:text-black font-mono transition-all duration-300 hover:text-terminal-green"
              >
                <Settings className="h-4 w-4 mr-2" />
                PROGRAM.CFG
              </TabsTrigger>
            </TabsList>

            <TabsContent value="treasury" className="mt-8">
              <Card className="bg-black/80 backdrop-blur-md border-2 border-neon-pink/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/5 to-transparent"></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="text-neon-pink font-mono text-xl flex items-center gap-3">
                    <Database className="h-6 w-6" />
                    TREASURY.CONFIGURATION.MODULE
                  </CardTitle>
                  <p className="text-terminal-green font-mono text-sm">
                    &gt; MODIFY CORE FINANCIAL PARAMETERS
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div>
                    <Label htmlFor="totalAllocation" className="text-neon-pink font-mono text-sm uppercase tracking-wider">
                      &gt; TOTAL_ALLOCATION [KILT]
                    </Label>
                    <Input
                      id="totalAllocation"
                      type="number"
                      value={treasuryForm.totalAllocation}
                      onChange={(e) => setTreasuryForm(prev => ({ ...prev, totalAllocation: parseInt(e.target.value) || 0 }))}
                      className="bg-black/70 border-neon-pink/50 text-terminal-green font-mono focus:border-neon-pink focus:ring-neon-pink/20 text-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="programDuration" className="text-neon-pink font-mono text-sm uppercase tracking-wider">
                      &gt; PROGRAM_DURATION [CYCLES]
                    </Label>
                    <Input
                      id="programDuration"
                      type="number"
                      value={treasuryForm.programDurationDays}
                      onChange={(e) => setTreasuryForm(prev => ({ ...prev, programDurationDays: parseInt(e.target.value) || 0 }))}
                      className="bg-black/70 border-neon-pink/50 text-terminal-green font-mono focus:border-neon-pink focus:ring-neon-pink/20 text-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dailyBudget" className="text-neon-pink font-mono text-sm uppercase tracking-wider">
                      &gt; DAILY_BUDGET [KILT/DAY]
                    </Label>
                    <Input
                      id="dailyBudget"
                      type="number"
                      value={treasuryForm.dailyBudget}
                      onChange={(e) => setTreasuryForm(prev => ({ ...prev, dailyBudget: parseInt(e.target.value) || 0 }))}
                      className="bg-black/70 border-neon-pink/50 text-terminal-green font-mono focus:border-neon-pink focus:ring-neon-pink/20 text-lg"
                    />
                  </div>
                  <Button 
                    onClick={() => treasuryMutation.mutate(treasuryForm)}
                    disabled={treasuryMutation.isPending}
                    className="bg-gradient-to-r from-neon-pink to-neon-pink/80 text-black font-bold font-mono hover:from-neon-pink/90 hover:to-neon-pink/70 shadow-lg hover:shadow-neon-pink/50 transition-all duration-300 text-lg py-6"
                  >
                    {treasuryMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Activity className="h-5 w-5 animate-pulse" />
                        UPDATING TREASURY...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        EXECUTE TREASURY UPDATE
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="program" className="mt-8">
              <Card className="bg-black/80 backdrop-blur-md border-2 border-terminal-green/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-terminal-green/5 to-transparent"></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="text-terminal-green font-mono text-xl flex items-center gap-3">
                    <Settings className="h-6 w-6" />
                    PROGRAM.SETTINGS.MODULE
                  </CardTitle>
                  <p className="text-neon-pink font-mono text-sm">
                    &gt; CONFIGURE REWARD ALGORITHM PARAMETERS
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div>
                    <Label htmlFor="timeBoostCoefficient" className="text-terminal-green font-mono text-sm uppercase tracking-wider">
                      &gt; TIME_BOOST_COEFFICIENT
                    </Label>
                    <Input
                      id="timeBoostCoefficient"
                      type="number"
                      step="0.1"
                      value={programForm.timeBoostCoefficient}
                      onChange={(e) => setProgramForm(prev => ({ ...prev, timeBoostCoefficient: parseFloat(e.target.value) || 0 }))}
                      className="bg-black/70 border-terminal-green/50 text-neon-pink font-mono focus:border-terminal-green focus:ring-terminal-green/20 text-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullRangeBonus" className="text-terminal-green font-mono text-sm uppercase tracking-wider">
                      &gt; FULL_RANGE_BONUS_MULTIPLIER
                    </Label>
                    <Input
                      id="fullRangeBonus"
                      type="number"
                      step="0.1"
                      value={programForm.fullRangeBonus}
                      onChange={(e) => setProgramForm(prev => ({ ...prev, fullRangeBonus: parseFloat(e.target.value) || 0 }))}
                      className="bg-black/70 border-terminal-green/50 text-neon-pink font-mono focus:border-terminal-green focus:ring-terminal-green/20 text-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimumPositionValue" className="text-terminal-green font-mono text-sm uppercase tracking-wider">
                      &gt; MIN_POSITION_VALUE [$USD]
                    </Label>
                    <Input
                      id="minimumPositionValue"
                      type="number"
                      value={programForm.minimumPositionValue}
                      onChange={(e) => setProgramForm(prev => ({ ...prev, minimumPositionValue: parseInt(e.target.value) || 0 }))}
                      className="bg-black/70 border-terminal-green/50 text-neon-pink font-mono focus:border-terminal-green focus:ring-terminal-green/20 text-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lockPeriod" className="text-terminal-green font-mono text-sm uppercase tracking-wider">
                      &gt; LOCK_PERIOD [CYCLES]
                    </Label>
                    <Input
                      id="lockPeriod"
                      type="number"
                      value={programForm.lockPeriod}
                      onChange={(e) => setProgramForm(prev => ({ ...prev, lockPeriod: parseInt(e.target.value) || 0 }))}
                      className="bg-black/70 border-terminal-green/50 text-neon-pink font-mono focus:border-terminal-green focus:ring-terminal-green/20 text-lg"
                    />
                  </div>
                  <Button 
                    onClick={() => programMutation.mutate(programForm)}
                    disabled={programMutation.isPending}
                    className="bg-gradient-to-r from-terminal-green to-terminal-green/80 text-black font-bold font-mono hover:from-terminal-green/90 hover:to-terminal-green/70 shadow-lg hover:shadow-terminal-green/50 transition-all duration-300 text-lg py-6"
                  >
                    {programMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Activity className="h-5 w-5 animate-pulse" />
                        UPDATING PARAMETERS...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        EXECUTE PROGRAM UPDATE
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {statsLoading && (
            <div className="text-center">
              <p className="text-terminal-green font-mono text-lg animate-pulse">
                &gt; LOADING NEURAL DATA...
              </p>
              <div className="flex justify-center mt-4">
                <Activity className="h-8 w-8 text-neon-pink animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}