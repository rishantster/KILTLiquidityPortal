import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BlockchainConfigPanel } from "./blockchain-config-panel";

interface TreasuryConfig {
  totalAllocation: number;
  programDurationDays: number;
  dailyBudget: number;
  programStartDate: string;
  programEndDate: string;
  treasuryWalletAddress: string;
  isActive: boolean;
}

interface ProgramSettings {
  timeBoostCoefficient: number;
  fullRangeBonus: number;
  minimumPositionValue: number;
  lockPeriod: number;
}

export function CyberpunkAdminPanel() {
  const [activeTab, setActiveTab] = useState<'treasury' | 'settings' | 'blockchain' | 'operations'>('treasury');
  const [treasuryConfig, setTreasuryConfig] = useState<TreasuryConfig>({
    totalAllocation: 500000,
    programDurationDays: 90,
    dailyBudget: 5555.56,
    programStartDate: new Date().toISOString().split('T')[0],
    programEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    treasuryWalletAddress: '0x0000000000000000000000000000000000000000',
    isActive: true
  });
  
  const [programSettings, setProgramSettings] = useState<ProgramSettings>({
    timeBoostCoefficient: 0.6,
    fullRangeBonus: 1.2,
    minimumPositionValue: 10,
    lockPeriod: 7
  });

  // Save Treasury Configuration
  const treasuryMutation = useMutation({
    mutationFn: (config: TreasuryConfig) => 
      apiRequest('/api/admin/treasury/config', {
        method: 'POST',
        body: JSON.stringify(config)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/treasury/config'] });
    }
  });

  // Save Program Settings
  const settingsMutation = useMutation({
    mutationFn: (settings: ProgramSettings) => 
      apiRequest('/api/admin/program/settings', {
        method: 'POST', 
        body: JSON.stringify(settings)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/program/settings'] });
    }
  });

  // Get Operations History
  const { data: operations = [] } = useQuery({
    queryKey: ['/api/admin/operations'],
    refetchInterval: 5000
  });

  const handleSaveTreasury = () => {
    treasuryMutation.mutate(treasuryConfig);
  };

  const handleSaveSettings = () => {
    settingsMutation.mutate(programSettings);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_wallet');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono overflow-hidden relative">
      {/* Matrix Rain Background */}
      <div className="fixed inset-0 opacity-5">
        <div className="matrix-rain"></div>
      </div>
      
      {/* Cyberpunk Grid */}
      <div className="fixed inset-0 opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 102, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 102, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-green-400 bg-black/90 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-[#ff0066] tracking-wider">
              ◢◤ KILT PROTOCOL ADMIN CONSOLE ◥◣
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white font-mono text-sm rounded hover:bg-red-500 transition-colors"
            >
              [LOGOUT]
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-900 border-b border-green-400/30">
          <div className="flex">
            {[
              { id: 'treasury', label: 'TREASURY_CONFIG' },
              { id: 'settings', label: 'PROGRAM_PARAMS' },
              { id: 'blockchain', label: 'BLOCKCHAIN_CONFIG' },
              { id: 'operations', label: 'OPERATIONS_LOG' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-mono text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-green-400 text-black'
                    : 'text-green-400 hover:bg-green-400/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Treasury Configuration */}
          {activeTab === 'treasury' && (
            <div className="space-y-6">
              <div className="bg-black/50 border border-green-400 rounded p-6">
                <h2 className="text-lg font-bold text-[#ff0066] mb-4 tracking-wider">
                  [TREASURY_ALLOCATION_MATRIX]
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">TOTAL_ALLOCATION:</label>
                    <input
                      type="number"
                      value={treasuryConfig.totalAllocation}
                      onChange={(e) => setTreasuryConfig({
                        ...treasuryConfig,
                        totalAllocation: Number(e.target.value)
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">PROGRAM_DURATION_DAYS:</label>
                    <input
                      type="number"
                      value={treasuryConfig.programDurationDays}
                      onChange={(e) => setTreasuryConfig({
                        ...treasuryConfig,
                        programDurationDays: Number(e.target.value)
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">WALLET_ADDRESS:</label>
                    <input
                      type="text"
                      value={treasuryConfig.treasuryWalletAddress}
                      onChange={(e) => setTreasuryConfig({
                        ...treasuryConfig,
                        treasuryWalletAddress: e.target.value
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                      placeholder="0x..."
                    />
                  </div>

                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">DAILY_BUDGET:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={treasuryConfig.dailyBudget}
                      onChange={(e) => setTreasuryConfig({
                        ...treasuryConfig,
                        dailyBudget: Number(e.target.value)
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveTreasury}
                  disabled={treasuryMutation.isPending}
                  className="mt-6 px-6 py-3 bg-green-400 text-black font-mono font-bold rounded hover:bg-green-300 transition-colors disabled:opacity-50"
                >
                  {treasuryMutation.isPending ? '[UPDATING...]' : '[UPDATE_TREASURY]'}
                </button>
              </div>
            </div>
          )}

          {/* Program Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-black/50 border border-green-400 rounded p-6">
                <h2 className="text-lg font-bold text-[#ff0066] mb-4 tracking-wider">
                  [REWARD_ALGORITHM_PARAMETERS]
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">TIME_BOOST_COEFFICIENT:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={programSettings.timeBoostCoefficient}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        timeBoostCoefficient: Number(e.target.value)
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">FULL_RANGE_BONUS:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={programSettings.fullRangeBonus}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        fullRangeBonus: Number(e.target.value)
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">MIN_POSITION_VALUE:</label>
                    <input
                      type="number"
                      value={programSettings.minimumPositionValue}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        minimumPositionValue: Number(e.target.value)
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-green-400 text-sm mb-2 font-mono">LOCK_PERIOD_DAYS:</label>
                    <input
                      type="number"
                      value={programSettings.lockPeriod}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        lockPeriod: Number(e.target.value)
                      })}
                      className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={settingsMutation.isPending}
                  className="mt-6 px-6 py-3 bg-[#ff0066] text-white font-mono font-bold rounded hover:bg-[#ff0066]/80 transition-colors disabled:opacity-50"
                >
                  {settingsMutation.isPending ? '[UPDATING...]' : '[UPDATE_PARAMETERS]'}
                </button>
              </div>
            </div>
          )}

          {/* Blockchain Configuration */}
          {activeTab === 'blockchain' && (
            <div className="space-y-6">
              <BlockchainConfigPanel />
            </div>
          )}

          {/* Operations Log */}
          {activeTab === 'operations' && (
            <div className="space-y-6">
              <div className="bg-black/50 border border-green-400 rounded p-6">
                <h2 className="text-lg font-bold text-[#ff0066] mb-4 tracking-wider">
                  [SYSTEM_OPERATIONS_HISTORY]
                </h2>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {operations.length === 0 ? (
                    <div className="text-green-400/50 font-mono text-sm">
                      [NO_OPERATIONS_LOGGED]
                    </div>
                  ) : (
                    operations.map((op: any, index: number) => (
                      <div
                        key={index}
                        className="border border-green-400/30 rounded p-3 bg-gray-900/50"
                      >
                        <div className="flex justify-between items-start text-sm">
                          <div className="text-green-400 font-mono">
                            [{op.action}]
                          </div>
                          <div className="text-green-400/50 font-mono">
                            {new Date(op.timestamp).toLocaleString()}
                          </div>
                        </div>
                        {op.details && (
                          <div className="text-green-400/70 font-mono text-xs mt-1">
                            {op.details}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}