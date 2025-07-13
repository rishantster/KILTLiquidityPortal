import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Copy, Settings, Wallet, Key, Shield, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface TreasuryInfo {
  currentTreasuryAddress: string;
  balance: number;
  allowance: number;
  isConfigured: boolean;
  canTransfer: boolean;
}

interface TreasuryStats {
  totalAllocation: number;
  totalDistributed: number;
  remainingBudget: number;
  dailyBudget: number;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export function TreasuryManagement() {
  const [ownerPrivateKey, setOwnerPrivateKey] = useState('');
  const [treasuryPrivateKey, setTreasuryPrivateKey] = useState('');
  const [newTreasuryAddress, setNewTreasuryAddress] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState('2905600');
  const [showKeys, setShowKeys] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch treasury information
  const { data: treasuryInfo } = useQuery<TreasuryInfo>({
    queryKey: ['/api/treasury/info'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch treasury statistics
  const { data: treasuryStats } = useQuery<TreasuryStats>({
    queryKey: ['/api/treasury/stats'],
    refetchInterval: 30000,
  });

  // Fetch contract owner
  const { data: ownerData } = useQuery<{ owner: string }>({
    queryKey: ['/api/treasury/owner'],
  });

  // Fetch validation results
  const { data: validationData } = useQuery<ValidationResult>({
    queryKey: ['/api/treasury/validate'],
    refetchInterval: 30000,
  });

  // Update treasury address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async (data: { newTreasuryAddress: string; ownerPrivateKey: string }) => {
      return apiRequest('/api/treasury/update-address', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Treasury address updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/treasury/info'] });
      setOwnerPrivateKey('');
      setNewTreasuryAddress('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Setup allowance mutation
  const setupAllowanceMutation = useMutation({
    mutationFn: async (data: { treasuryPrivateKey: string; allowanceAmount: number }) => {
      return apiRequest('/api/treasury/setup-allowance', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Treasury allowance setup successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/treasury/info'] });
      setTreasuryPrivateKey('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateAddress = () => {
    if (!newTreasuryAddress || !ownerPrivateKey) {
      toast({
        title: "Error",
        description: "Please provide both treasury address and owner private key",
        variant: "destructive",
      });
      return;
    }
    updateAddressMutation.mutate({ newTreasuryAddress, ownerPrivateKey });
  };

  const handleSetupAllowance = () => {
    if (!treasuryPrivateKey) {
      toast({
        title: "Error",
        description: "Please provide treasury private key",
        variant: "destructive",
      });
      return;
    }
    setupAllowanceMutation.mutate({ 
      treasuryPrivateKey, 
      allowanceAmount: parseFloat(allowanceAmount) 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  const formatKiltAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAddress = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return 'Not configured';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Treasury Management</h2>
        <Badge variant={validationData?.isValid ? "default" : "destructive"}>
          {validationData?.isValid ? "Setup Complete" : "Setup Required"}
        </Badge>
      </div>

      {/* Current Treasury Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Wallet className="h-5 w-5" />
              Treasury Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Current Address:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-white">
                  {formatAddress(treasuryInfo?.currentTreasuryAddress || '')}
                </span>
                {treasuryInfo?.currentTreasuryAddress && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(treasuryInfo.currentTreasuryAddress)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Balance:</span>
              <span className="text-sm font-bold text-white">
                {formatKiltAmount(treasuryInfo?.balance || 0)} KILT
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Allowance:</span>
              <span className="text-sm font-bold text-white">
                {formatKiltAmount(treasuryInfo?.allowance || 0)} KILT
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Can Transfer:</span>
              <Badge variant={treasuryInfo?.canTransfer ? "default" : "destructive"}>
                {treasuryInfo?.canTransfer ? "Yes" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5" />
              Program Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Total Allocation:</span>
              <span className="text-sm font-bold text-white">
                {formatKiltAmount(treasuryStats?.totalAllocation || 2905600)} KILT
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Distributed:</span>
              <span className="text-sm font-bold text-white">
                {formatKiltAmount(treasuryStats?.totalDistributed || 0)} KILT
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Remaining:</span>
              <span className="text-sm font-bold text-white">
                {formatKiltAmount(treasuryStats?.remainingBudget || 2905600)} KILT
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Annual Budget:</span>
              <span className="text-sm font-bold text-white">
                {((treasuryStats?.treasuryTotal || 2905600)).toLocaleString()} KILT
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Issues */}
      {validationData && !validationData.isValid && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertCircle className="h-5 w-5" />
              Setup Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Issues:</h4>
              <ul className="space-y-1">
                {validationData.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Recommendations:</h4>
              <ul className="space-y-1">
                {validationData.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-orange-300 flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Update Treasury Address */}
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5" />
              Update Treasury Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newTreasuryAddress" className="text-white">
                New Treasury Address
              </Label>
              <Input
                id="newTreasuryAddress"
                placeholder="0x..."
                value={newTreasuryAddress}
                onChange={(e) => setNewTreasuryAddress(e.target.value)}
                className="bg-black/20 border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ownerPrivateKey" className="text-white">
                Contract Owner Private Key
              </Label>
              <Input
                id="ownerPrivateKey"
                type={showKeys ? "text" : "password"}
                placeholder="0x..."
                value={ownerPrivateKey}
                onChange={(e) => setOwnerPrivateKey(e.target.value)}
                className="bg-black/20 border-white/20 text-white"
              />
            </div>
            
            <div className="text-xs text-white/60">
              <p>Current owner: {formatAddress(ownerData?.owner || '')}</p>
            </div>
            
            <Button
              onClick={handleUpdateAddress}
              disabled={updateAddressMutation.isPending}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              {updateAddressMutation.isPending ? "Updating..." : "Update Treasury Address"}
            </Button>
          </CardContent>
        </Card>

        {/* Setup Allowance */}
        <Card className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Key className="h-5 w-5" />
              Setup Treasury Allowance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allowanceAmount" className="text-white">
                Allowance Amount (KILT)
              </Label>
              <Input
                id="allowanceAmount"
                placeholder="2905600"
                value={allowanceAmount}
                onChange={(e) => setAllowanceAmount(e.target.value)}
                className="bg-black/20 border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="treasuryPrivateKey" className="text-white">
                Treasury Wallet Private Key
              </Label>
              <Input
                id="treasuryPrivateKey"
                type={showKeys ? "text" : "password"}
                placeholder="0x..."
                value={treasuryPrivateKey}
                onChange={(e) => setTreasuryPrivateKey(e.target.value)}
                className="bg-black/20 border-white/20 text-white"
              />
            </div>
            
            <Button
              onClick={handleSetupAllowance}
              disabled={setupAllowanceMutation.isPending}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            >
              {setupAllowanceMutation.isPending ? "Setting up..." : "Setup Allowance"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security Controls */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Security Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">Show Private Keys</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeys(!showKeys)}
              className="border-white/20"
            >
              {showKeys ? "Hide" : "Show"}
            </Button>
          </div>
          
          <div className="text-xs text-white/60 space-y-2">
            <p>⚠️ Never share your private keys with anyone</p>
            <p>🔐 Keys are not stored and only used for transactions</p>
            <p>🌐 All transactions are executed on Base network</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://basescan.org/address/0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8', '_blank')}
              className="border-white/20"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View KILT Token
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries()}
              className="border-white/20"
            >
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}