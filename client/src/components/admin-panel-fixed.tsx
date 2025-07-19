import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { SimpleAdminLogin } from './simple-admin-login';
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

// Types
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

interface BlockchainConfig {
  kiltTokenAddress: string;
  poolAddress: string;
}

export function AdminPanelFixed() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // All hooks must be called before any conditional returns
  const { data: treasuryStats, isLoading: statsLoading } = useQuery<AdminTreasuryStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated && !!adminToken,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch treasury stats');
      return response.json();
    }
  });

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      setAdminToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);
  
  // Handle successful login
  const handleLogin = (token: string) => {
    setAdminToken(token);
    setIsAuthenticated(true);
  };
  
  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAuthenticated(false);
    toast({
      title: "Logged Out",
      description: "You have been logged out of the admin panel",
    });
  };

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <SimpleAdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            KILT Admin Panel
          </h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="h-4 w-4 mr-1" />
              Authenticated
            </Badge>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
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
              <CardTitle className="text-sm font-medium">Total Distributed</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${(treasuryStats?.totalDistributed || 0).toLocaleString()} KILT`}
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
              Configuration
            </TabsTrigger>
            <TabsTrigger 
              value="blockchain" 
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
            >
              <Globe className="h-4 w-4 mr-2" />
              Blockchain
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
            >
              <Activity className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-emerald-400">Program Configuration</CardTitle>
                <CardDescription>
                  Manage treasury allocation and program parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-gray-400">
                  Admin configuration interface will be available here.
                  Treasury stats are loading properly.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-blue-400">Blockchain Configuration</CardTitle>
                <CardDescription>
                  Manage smart contract addresses and network settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-gray-400">
                  Blockchain configuration interface will be available here.
                </div>
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
                <div className="text-center py-8 text-gray-400">
                  Operation history will be displayed here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}