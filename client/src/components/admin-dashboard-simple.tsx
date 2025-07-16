import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Settings, Activity, CheckCircle, AlertTriangle } from "lucide-react";

// Authorized admin wallets
const AUTHORIZED_ADMIN_WALLETS = [
  "0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e",
  "0x861722f739539CF31d86F1221460Fa96C9baB95C"
];

interface AdminConfig {
  treasuryBudget: number;
  programDuration: number;
  dailyBudget: number;
  aprRange: string;
  timeBoost: number;
  fullRangeBonus: number;
  minPositionValue: number;
  lockPeriod: number;
}

interface BlockchainConfig {
  kiltTokenAddress: string;
  poolAddress: string;
  treasuryWalletAddress: string;
  networkId: number;
}

export function AdminDashboardSimple() {
  const { address, isConnected } = useWallet();
  const [config, setConfig] = useState<AdminConfig>({
    treasuryBudget: 500000,
    programDuration: 90,
    dailyBudget: 5555.56,
    aprRange: "31%",
    timeBoost: 0.6,
    fullRangeBonus: 1.2,
    minPositionValue: 10,
    lockPeriod: 7
  });

  const [blockchainConfig, setBlockchainConfig] = useState<BlockchainConfig>({
    kiltTokenAddress: "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8",
    poolAddress: "0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb",
    treasuryWalletAddress: "0x0000000000000000000000000000000000000000",
    networkId: 8453
  });
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("treasury");

  // Check if wallet is authorized and load config
  useEffect(() => {
    if (address && isConnected) {
      const authorized = AUTHORIZED_ADMIN_WALLETS.some(adminWallet => 
        adminWallet.toLowerCase() === address.toLowerCase()
      );
      // Debug logging removed for production
      setIsAuthorized(authorized);
      if (!authorized) {
        setMessage("⚠️ Wallet not authorized for admin access");
      } else {
        // Load current configuration from API
        loadCurrentConfig();
      }
    }
  }, [address, isConnected]);

  // Load current configuration from API
  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/admin-simple/config');
      if (response.ok) {
        const data = await response.json();
        setConfig({
          treasuryBudget: parseFloat(data.treasury.totalAllocation) || 500000,
          programDuration: data.treasury.programDurationDays || 90,
          dailyBudget: parseFloat(data.treasury.dailyRewardsCap) || 5555.56,
          aprRange: data.aprRange || "31%",
          timeBoost: parseFloat(data.settings.timeBoostCoefficient) || 0.6,
          fullRangeBonus: parseFloat(data.settings.fullRangeBonus) || 1.2,
          minPositionValue: parseFloat(data.settings.minimumPositionValue) || 10,
          lockPeriod: data.settings.lockPeriod || 7
        });

        // Load blockchain configuration if available
        if (data.blockchain) {
          setBlockchainConfig({
            kiltTokenAddress: data.blockchain.kiltTokenAddress || "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8",
            poolAddress: data.blockchain.poolAddress || "0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb",
            treasuryWalletAddress: data.treasury.treasuryWalletAddress || "0x0000000000000000000000000000000000000000",
            networkId: data.blockchain.networkId || 8453
          });
        }
      }
    } catch (error) {
      console.error('Failed to load admin config:', error);
    }
  };

  // Calculate derived values
  const calculateDerivedValues = () => {
    const dailyBudget = config.treasuryBudget / config.programDuration;
    const representativeAPR = Math.round(31 * (config.treasuryBudget / 500000));
    const aprRange = `${representativeAPR}%`;
    
    setConfig(prev => ({
      ...prev,
      dailyBudget: Math.round(dailyBudget * 100) / 100,
      aprRange
    }));
  };

  // Update treasury configuration
  const handleTreasuryUpdate = async () => {
    if (!isAuthorized) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin-simple/treasury', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          treasuryBudget: config.treasuryBudget,
          programDuration: config.programDuration,
          treasuryWalletAddress: '0x' + Array(40).fill('0').join('')
        })
      });

      if (response.ok) {
        calculateDerivedValues();
        // Reload the configuration to get updated values
        await loadCurrentConfig();
        setMessage("✅ Treasury configuration updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        throw new Error('Failed to update treasury');
      }
    } catch (error) {
      setMessage("❌ Failed to update treasury configuration");
    } finally {
      setIsLoading(false);
    }
  };

  // Update program settings
  const handleSettingsUpdate = async () => {
    if (!isAuthorized) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin-simple/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeBoost: config.timeBoost,
          fullRangeBonus: config.fullRangeBonus,
          minPositionValue: config.minPositionValue,
          lockPeriod: config.lockPeriod
        })
      });

      if (response.ok) {
        // Reload the configuration to get updated values
        await loadCurrentConfig();
        setMessage("✅ Program settings updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      setMessage("❌ Failed to update program settings");
    } finally {
      setIsLoading(false);
    }
  };

  // If not connected, show connection prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold mb-4">KILT Admin Panel</h1>
            <p className="text-gray-400 mb-8">Connect your authorized admin wallet to access the admin panel</p>
            <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-lg p-6 border border-gray-800/30">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <p className="text-sm text-gray-300">Please connect your wallet to continue</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If not authorized, show unauthorized message
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold mb-4">KILT Admin Panel</h1>
            <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 backdrop-blur-sm rounded-lg p-6 border border-red-500/30">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-red-400 mb-2">Unauthorized Access</p>
              <p className="text-sm text-gray-300">Your wallet address is not authorized for admin access</p>
              <Badge variant="outline" className="mt-4 text-xs font-mono">
                {address}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">KILT Admin Panel</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Authorized
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400/30">
              APR: {config.aprRange}
            </Badge>
            <Badge variant="outline" className="text-purple-400 border-purple-400/30">
              Treasury: {config.treasuryBudget.toLocaleString()} KILT
            </Badge>
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "treasury" ? "default" : "outline"}
            onClick={() => setActiveTab("treasury")}
            className="bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Treasury
          </Button>
          <Button
            variant={activeTab === "blockchain" ? "default" : "outline"}
            onClick={() => setActiveTab("blockchain")}
            className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
          >
            <Settings className="w-4 h-4 mr-2" />
            Blockchain
          </Button>
        </div>

        {/* Main Configuration */}
        <div className="space-y-6">
          {activeTab === "treasury" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Treasury Configuration */}
          <Card className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Treasury Configuration
              </CardTitle>
              <CardDescription>
                Configure treasury allocation and program timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="treasuryBudget">Program Budget (KILT)</Label>
                  <Input
                    id="treasuryBudget"
                    type="number"
                    value={config.treasuryBudget}
                    onChange={(e) => setConfig({...config, treasuryBudget: parseInt(e.target.value) || 0})}
                    className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30"
                  />
                </div>
                <div>
                  <Label htmlFor="programDuration">Duration (days)</Label>
                  <Input
                    id="programDuration"
                    type="number"
                    value={config.programDuration}
                    onChange={(e) => setConfig({...config, programDuration: parseInt(e.target.value) || 0})}
                    className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30"
                  />
                </div>
              </div>
              
              <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-emerald-200">
                  <Activity className="w-4 h-4" />
                  Daily Budget: {config.dailyBudget.toLocaleString()} KILT
                </div>
              </div>
              
              <Button 
                onClick={handleTreasuryUpdate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              >
                {isLoading ? 'Updating...' : 'Update Treasury Config'}
              </Button>
            </CardContent>
          </Card>

          {/* Program Settings */}
          <Card className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Program Settings
              </CardTitle>
              <CardDescription>
                Formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeBoost">Time Boost (b_time)</Label>
                  <Input
                    id="timeBoost"
                    type="number"
                    step="0.1"
                    value={config.timeBoost}
                    onChange={(e) => setConfig({...config, timeBoost: parseFloat(e.target.value) || 0})}
                    className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30"
                  />
                </div>
                <div>
                  <Label htmlFor="fullRangeBonus">Full Range Bonus (FRB)</Label>
                  <Input
                    id="fullRangeBonus"
                    type="number"
                    step="0.1"
                    value={config.fullRangeBonus}
                    onChange={(e) => setConfig({...config, fullRangeBonus: parseFloat(e.target.value) || 0})}
                    className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minPositionValue">Min Position Value ($)</Label>
                  <Input
                    id="minPositionValue"
                    type="number"
                    value={config.minPositionValue}
                    onChange={(e) => setConfig({...config, minPositionValue: parseInt(e.target.value) || 0})}
                    className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30"
                  />
                </div>
                <div>
                  <Label htmlFor="lockPeriod">Lock Period (days)</Label>
                  <Input
                    id="lockPeriod"
                    type="number"
                    value={config.lockPeriod}
                    onChange={(e) => setConfig({...config, lockPeriod: parseInt(e.target.value) || 0})}
                    className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSettingsUpdate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {isLoading ? 'Updating...' : 'Update Program Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="mt-6 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border-gray-800/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">1</div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">0</div>
                <div className="text-sm text-gray-400">LP Positions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">0</div>
                <div className="text-sm text-gray-400">Rewards Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">Simulation</div>
                <div className="text-sm text-gray-400">Smart Contracts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}