import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Database,
  Clock,
  TrendingUp,
  CheckCircle,
  Loader2,
  LogOut
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

export function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  
  // Check for existing token on component mount
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

  // Admin dashboard queries and mutations
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

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">KILT Admin Panel</h1>
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

        {statsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid grid-cols-3 bg-white/5 backdrop-blur-sm border-gray-800/30">
              <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500/20">
                <TrendingUp className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="treasury" className="data-[state=active]:bg-blue-500/20">
                <DollarSign className="h-4 w-4 mr-2" />
                Treasury
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-purple-500/20">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400">Total Liquidity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-emerald-400" />
                      <span className="text-2xl font-bold">
                        ${treasuryStats?.totalLiquidity?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400">Active Participants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-2xl font-bold">
                        {treasuryStats?.activeParticipants || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400">Treasury Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-yellow-400" />
                      <span className="text-2xl font-bold">
                        {treasuryStats?.treasuryBalance?.toLocaleString() || '0'} KILT
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400">Days Remaining</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <span className="text-2xl font-bold">
                        {treasuryStats?.programAnalytics?.daysRemaining || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    Program Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Program Duration</p>
                      <p className="text-lg font-semibold">{treasuryStats?.programDuration || 0} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Daily Budget</p>
                      <p className="text-lg font-semibold">{treasuryStats?.dailyRewardsCap?.toLocaleString() || '0'} KILT</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Program Status</p>
                      <Badge className={treasuryStats?.programAnalytics?.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {treasuryStats?.programAnalytics?.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Estimated APR Range</p>
                      <p className="text-lg font-semibold">
                        {treasuryStats?.estimatedAPR?.low?.toFixed(1) || '0'}% - {treasuryStats?.estimatedAPR?.high?.toFixed(1) || '0'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="treasury" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader>
                  <CardTitle>Treasury Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-400">Treasury management features will be implemented here.</p>
                    <p className="text-sm text-gray-500 mt-2">Configure budget, duration, and reward parameters.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-sm border-gray-800/30">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-400">System settings and configuration options will be available here.</p>
                    <p className="text-sm text-gray-500 mt-2">Manage blockchain addresses and program parameters.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}