import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  LogOut, 
  Settings, 
  Database, 
  History, 
  DollarSign, 
  Timer, 
  Calendar, 
  Code2, 
  ShieldCheck, 
  Activity,
  Zap,
  ExternalLink,
  Copy,
  Server
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AdminStats {
  treasury: {
    programBudget: number;
    dailyRewardsCap: number;
    programDuration: number;
    programStartDate: string;
    programEndDate: string;
    treasuryWalletAddress: string;
    isActive: boolean;
  };
  settings: {
    maxLiquidityBoost: number;
    minimumPositionValue: number;
    lockPeriod: number;
    inRangeRequirement: boolean;
  };
}

interface BlockchainConfig {
  kiltTokenAddress: string;
  wethTokenAddress: string;
  poolAddress: string;
  poolFeeRate: number;
  networkId: number;
  isActive: boolean;
}

export default function AdminPanel() {
  const { address, disconnect } = useWallet();
  const queryClient = useQueryClient();

  // State for form data
  const [treasuryConfigForm, setTreasuryConfigForm] = useState({
    programBudget: 500000,
    programDuration: 90,
    treasuryWalletAddress: '',
    programStartDate: '',
    programEndDate: '',
    isActive: true
  });

  const [programSettingsForm, setProgramSettingsForm] = useState({
    maxLiquidityBoost: 0.6,
    minimumPositionValue: 10,
    lockPeriod: 7,
    inRangeRequirement: true
  });

  const [blockchainConfigForm, setBlockchainConfigForm] = useState({
    kiltTokenAddress: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
    wethTokenAddress: '0x4200000000000000000000000000000000000006',
    poolAddress: '0x...',
    poolFeeRate: 3000,
    networkId: 8453,
    rewardWalletAddress: '',
    uniswapV3Factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    uniswapV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    positionManager: '0x03a520b32C04BF3bEEf7BF5d0a7B8c68b7e6e5c7'
  });

  // Query admin stats
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/dashboard'],
    enabled: !!address
  });

  // Query blockchain config
  const { data: blockchainConfig } = useQuery<BlockchainConfig>({
    queryKey: ['/api/admin/blockchain-config'],
    enabled: !!address
  });

  // Mutations
  const treasuryConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/treasury-config', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    }
  });

  const settingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/program-settings', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
    }
  });

  const blockchainConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/blockchain-config', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blockchain-config'] });
    }
  });

  // Update form data when admin stats load
  useEffect(() => {
    if (adminStats?.treasury) {
      setTreasuryConfigForm({
        programBudget: adminStats.treasury.programBudget,
        programDuration: adminStats.treasury.programDuration,
        treasuryWalletAddress: adminStats.treasury.treasuryWalletAddress,
        programStartDate: adminStats.treasury.programStartDate,
        programEndDate: adminStats.treasury.programEndDate,
        isActive: adminStats.treasury.isActive
      });
    }
    if (adminStats?.settings) {
      setProgramSettingsForm({
        maxLiquidityBoost: adminStats.settings.maxLiquidityBoost,
        minimumPositionValue: adminStats.settings.minimumPositionValue,
        lockPeriod: adminStats.settings.lockPeriod,
        inRangeRequirement: adminStats.settings.inRangeRequirement
      });
    }
  }, [adminStats]);

  useEffect(() => {
    if (blockchainConfig) {
      setBlockchainConfigForm({
        kiltTokenAddress: blockchainConfig.kiltTokenAddress,
        wethTokenAddress: blockchainConfig.wethTokenAddress,
        poolAddress: blockchainConfig.poolAddress,
        poolFeeRate: blockchainConfig.poolFeeRate,
        networkId: blockchainConfig.networkId,
        rewardWalletAddress: blockchainConfig.rewardWalletAddress || '',
        uniswapV3Factory: blockchainConfig.uniswapV3Factory || '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        uniswapV3Router: blockchainConfig.uniswapV3Router || '0x2626664c2603336E57B271c5C0b26F421741e481',
        positionManager: blockchainConfig.positionManager || '0x03a520b32C04BF3bEEf7BF5d0a7B8c68b7e6e5c7'
      });
    }
  }, [blockchainConfig]);

  const handleTreasuryConfigUpdate = () => {
    treasuryConfigMutation.mutate(treasuryConfigForm);
  };

  const handleSettingsUpdate = () => {
    settingsMutation.mutate(programSettingsForm);
  };

  const handleBlockchainConfigUpdate = () => {
    blockchainConfigMutation.mutate(blockchainConfigForm);
  };

  const handleLogout = () => {
    disconnect();
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Authentication Required</h1>
          <p className="text-gray-400">Connect with your authorized admin wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Clean Professional Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">KILT Admin Panel</h1>
                <p className="text-gray-400 text-sm">Treasury Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleLogout}
                className="bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-full text-sm"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>

          {/* Compact Stats Overview */}
          {statsLoading ? (
            <div className="text-center py-4">
              <div className="animate-pulse text-emerald-400">Loading...</div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Treasury Budget</p>
                  <p className="text-white font-bold text-lg">
                    {((adminStats?.treasury?.programBudget || 500000) / 1000000).toFixed(1)}M KILT
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Daily Budget</p>
                  <p className="text-white font-bold text-lg">
                    {(adminStats?.treasury?.dailyRewardsCap || 5556).toFixed(0)} KILT
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">Duration</p>
                  <p className="text-white font-bold text-lg">
                    {adminStats?.treasury?.programDuration || 90} days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Clean Navigation Tabs */}
          <Tabs defaultValue="program-config" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border border-gray-700/50 p-1 rounded-xl mb-6 h-12 sm:h-14 gap-1">
              <TabsTrigger 
                value="program-config" 
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                <span className="text-xs sm:text-sm">Program</span>
              </TabsTrigger>
              <TabsTrigger 
                value="blockchain-config" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
              >
                <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                <span className="text-xs sm:text-sm">Blockchain</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                <span className="text-xs sm:text-sm">History</span>
              </TabsTrigger>
            </TabsList>

            {/* Program Configuration Tab */}
            <TabsContent value="program-config" className="space-y-4">
              {/* Current Formula Display */}
              <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white text-lg font-medium">Current Formula</span>
                </div>
                <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-emerald-500/20">
                  <div className="font-mono text-emerald-300 text-sm mb-2">
                    R_u = (L_u/L_T) × (1 + ((D_u/P)×b_time)) × IRM × FRB × (R/P)
                  </div>
                  <div className="text-xs text-gray-400">
                    b_time = {adminStats?.settings?.maxLiquidityBoost || 0.6} • IRM = {adminStats?.settings?.inRangeRequirement ? '1.0' : '0.0'} • FRB = 1.2x
                  </div>
                </div>
              </div>

              {/* Two Column Layout - Compact */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column - Treasury Configuration */}
                <div className="h-full">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    Treasury Configuration
                  </h2>
                  <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10 h-[360px] flex flex-col">
                    <div className="space-y-4 flex-1">
                      <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-200 text-sm">Treasury operations are secure and wallet-based.</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="programBudget" className="text-white text-xs">Budget (KILT)</Label>
                            <Input
                              id="programBudget"
                              type="number"
                              value={treasuryConfigForm.programBudget}
                              onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programBudget: parseInt(e.target.value) || 0 })}
                              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                              placeholder="500000"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="programDuration" className="text-white text-xs">Duration (Days)</Label>
                            <Input
                              id="programDuration"
                              type="number"
                              value={treasuryConfigForm.programDuration}
                              onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, programDuration: parseInt(e.target.value) || 0 })}
                              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                              placeholder="90"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="treasuryWalletAddress" className="text-white text-xs">Treasury Wallet Address</Label>
                          <Input
                            id="treasuryWalletAddress"
                            value={treasuryConfigForm.treasuryWalletAddress}
                            onChange={(e) => setTreasuryConfigForm({ ...treasuryConfigForm, treasuryWalletAddress: e.target.value })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                            placeholder="0x..."
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleTreasuryConfigUpdate}
                      disabled={treasuryConfigMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium h-8 text-sm rounded-lg transition-all duration-200 mt-4"
                    >
                      {treasuryConfigMutation.isPending ? 'Updating...' : 'Update Treasury'}
                    </Button>
                  </div>
                </div>

                {/* Right Column - Program Settings */}
                <div className="h-full">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
                    <Settings className="h-3 w-3 text-emerald-400" />
                    Program Settings
                  </h2>
                  <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10 h-[360px] flex flex-col">
                    <div className="space-y-4 flex-1">
                      <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-200 text-sm">Formula parameters control reward distribution.</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="maxLiquidityBoost" className="text-white text-xs">Max Boost</Label>
                            <Input
                              id="maxLiquidityBoost"
                              type="number"
                              step="0.1"
                              value={programSettingsForm.maxLiquidityBoost}
                              onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, maxLiquidityBoost: parseFloat(e.target.value) || 0 })}
                              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                              placeholder="0.6"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="minimumPositionValue" className="text-white text-xs">Min Value ($)</Label>
                            <Input
                              id="minimumPositionValue"
                              type="number"
                              value={programSettingsForm.minimumPositionValue}
                              onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, minimumPositionValue: parseInt(e.target.value) || 0 })}
                              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                              placeholder="10"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="lockPeriod" className="text-white text-xs">Lock Period (Days)</Label>
                          <Input
                            id="lockPeriod"
                            type="number"
                            value={programSettingsForm.lockPeriod}
                            onChange={(e) => setProgramSettingsForm({ ...programSettingsForm, lockPeriod: parseInt(e.target.value) || 0 })}
                            className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-8 text-sm"
                            placeholder="7"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="inRangeRequirement"
                            checked={programSettingsForm.inRangeRequirement}
                            onCheckedChange={(checked) => setProgramSettingsForm({ ...programSettingsForm, inRangeRequirement: checked })}
                          />
                          <Label htmlFor="inRangeRequirement" className="text-white text-xs">In-Range Requirement</Label>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSettingsUpdate}
                      disabled={settingsMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium h-8 text-sm rounded-lg transition-all duration-200 mt-4"
                    >
                      {settingsMutation.isPending ? 'Updating...' : 'Update Settings'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Blockchain Configuration Tab */}
            <TabsContent value="blockchain-config" className="space-y-4">
              <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-lg font-medium">Blockchain Configuration</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-200 text-sm">Network ID 8453 = Base Mainnet. Changes restart monitoring services.</span>
                    </div>
                  </div>

                  {/* Token Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Token Configuration
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="kiltTokenAddress" className="text-white text-xs">KILT Token Address</Label>
                        <Input
                          id="kiltTokenAddress"
                          value={blockchainConfigForm.kiltTokenAddress}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, kiltTokenAddress: e.target.value })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="wethTokenAddress" className="text-white text-xs">WETH Token Address</Label>
                        <Input
                          id="wethTokenAddress"
                          value={blockchainConfigForm.wethTokenAddress}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, wethTokenAddress: e.target.value })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="0x4200000000000000000000000000000000000006"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pool Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-green-400" />
                      Pool Configuration
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="poolAddress" className="text-white text-xs">Pool Address</Label>
                        <Input
                          id="poolAddress"
                          value={blockchainConfigForm.poolAddress}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, poolAddress: e.target.value })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="0x..."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="poolFeeRate" className="text-white text-xs">Pool Fee Rate (bps)</Label>
                        <Input
                          id="poolFeeRate"
                          type="number"
                          value={blockchainConfigForm.poolFeeRate}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, poolFeeRate: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="3000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Uniswap V3 Integration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Settings className="w-4 h-4 text-purple-400" />
                      Uniswap V3 Integration
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="uniswapV3Factory" className="text-white text-xs">Factory Address</Label>
                        <Input
                          id="uniswapV3Factory"
                          value={blockchainConfigForm.uniswapV3Factory}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, uniswapV3Factory: e.target.value })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="uniswapV3Router" className="text-white text-xs">Router Address</Label>
                        <Input
                          id="uniswapV3Router"
                          value={blockchainConfigForm.uniswapV3Router}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, uniswapV3Router: e.target.value })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="0x2626664c2603336E57B271c5C0b26F421741e481"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="positionManager" className="text-white text-xs">Position Manager</Label>
                        <Input
                          id="positionManager"
                          value={blockchainConfigForm.positionManager}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, positionManager: e.target.value })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="0x03a520b32C04BF3bEEf7BF5d0a7B8c68b7e6e5c7"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="networkId" className="text-white text-xs">Network ID</Label>
                        <Input
                          id="networkId"
                          type="number"
                          value={blockchainConfigForm.networkId}
                          onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, networkId: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/20 text-xs h-8"
                          placeholder="8453"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reward Wallet Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Reward Wallet Configuration
                    </h3>
                    
                    <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-200 text-sm">Reward wallet handles token distribution. Can be managed through smart contract or direct configuration.</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="rewardWalletAddress" className="text-white text-xs">Reward Wallet Address</Label>
                      <Input
                        id="rewardWalletAddress"
                        value={blockchainConfigForm.rewardWalletAddress}
                        onChange={(e) => setBlockchainConfigForm({ ...blockchainConfigForm, rewardWalletAddress: e.target.value })}
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-400 focus:border-emerald-400/50 focus:ring-emerald-400/20 text-xs h-8"
                        placeholder="0x..."
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleBlockchainConfigUpdate}
                    disabled={blockchainConfigMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium h-8 text-sm rounded-lg transition-all duration-200"
                  >
                    {blockchainConfigMutation.isPending ? 'Updating...' : 'Update Blockchain Config'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-lg font-medium">Operation History</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-purple-400/10 border border-purple-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-purple-400" />
                      <span className="text-purple-200 text-sm">Admin operations are logged for audit trail.</span>
                    </div>
                  </div>
                  
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-sm">No recent operations</div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}