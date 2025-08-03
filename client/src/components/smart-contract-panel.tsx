import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWagmiWallet } from "@/hooks/use-wagmi-wallet";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Wallet,
  Lock,
  Unlock,
  Shield,
  TrendingUp,
  Activity
} from "lucide-react";
// Simplified implementation focused on admin interface guidance

// Contract configuration
const BASIC_TREASURY_POOL_ADDRESS = "0x3ee2361272EaDc5ADc91418530722728E7DCe526";
const KILT_TOKEN_ADDRESS = "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8";

// Basic ABI for essential functions
const BASIC_TREASURY_POOL_ABI = [
  {
    "inputs": [],
    "name": "getContractBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalTreasuryBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "depositToTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "distributeReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const KILT_TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export function SmartContractPanel() {
  const { toast } = useToast();
  const { address, isConnected } = useWagmiWallet();
  const queryClient = useQueryClient();
  
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [rewardUser, setRewardUser] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");

  // Real contract owner is the deployer address
  const contractOwner = "0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e"; // Actual contract owner (deployer)
  
  // Fetch real KILT balance for connected wallet
  const { data: walletKiltData } = useQuery({
    queryKey: [`/api/wallet/kilt-balance/${address}`],
    enabled: !!address,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch contract balances from blockchain
  const { data: contractData } = useQuery({
    queryKey: [`/api/smart-contract/balances/${BASIC_TREASURY_POOL_ADDRESS}`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Extract values with fallbacks
  const userKiltBalance = (walletKiltData as any)?.balance || 0;
  const kiltAllowance = (walletKiltData as any)?.allowance || 0;
  const contractBalance = (contractData as any)?.contractBalance || 0;
  const treasuryBalance = (contractData as any)?.treasuryBalance || 0;


  
  // Mock transaction states
  const txHash = null;
  const isPending = false;
  const isConfirming = false;
  const isSuccess = false;
  const error = null;

  // Check if user is contract owner
  const isOwner = address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const openBaseScan = (address: string) => {
    window.open(`https://basescan.org/address/${address}`, '_blank');
  };

  const handleApproveKilt = async () => {
    if (!depositAmount) return;
    
    toast({
      title: "Instructions",
      description: "Use Remix IDE with the provided guides to interact with the contract directly. Contract address: " + BASIC_TREASURY_POOL_ADDRESS,
    });
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    
    toast({
      title: "Instructions",
      description: "Use Remix IDE to call depositToTreasury(" + depositAmount + " KILT). See REMIX_INTERACTION_STEPS.md for details.",
    });
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    
    toast({
      title: "Instructions",
      description: "Use Remix IDE to call emergencyWithdraw(" + withdrawAmount + " KILT). Only the contract owner can do this.",
    });
  };

  const handleDistributeReward = async () => {
    if (!rewardUser || !rewardAmount) return;
    
    toast({
      title: "Instructions",
      description: "Use Remix IDE to call distributeReward(" + rewardUser + ", " + rewardAmount + " KILT). See guides for exact steps.",
    });
  };

  const maxWithdraw = () => {
    if (contractBalance > 0) {
      setWithdrawAmount(contractBalance.toString());
    }
  };

  const maxDeposit = () => {
    if (userKiltBalance > 0) {
      setDepositAmount(userKiltBalance.toString());
    }
  };

  // Clear form inputs on successful transaction
  useEffect(() => {
    if (isSuccess) {
      setDepositAmount("");
      setWithdrawAmount("");
      setRewardAmount("");
      setRewardUser("");
      toast({
        title: "Transaction Successful!",
        description: "Contract operation completed successfully",
      });
      // Refresh contract data
      queryClient.invalidateQueries();
    }
  }, [isSuccess, toast, queryClient]);

  if (!isConnected) {
    return (
      <div className="bg-black/90 border border-red-400 rounded-lg p-6">
        <div className="text-center">
          <Wallet className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-400 mb-2">Wallet Not Connected</h3>
          <p className="text-gray-300">Connect your wallet to manage the smart contract</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-black/90 border border-green-400 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-green-400 text-sm">
              <Building2 className="h-4 w-4" />
              <span>Contract Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Network:</span>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-400">Base</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Owner Access:</span>
              <Badge className={`${isOwner ? 'bg-green-500/20 text-green-400 border-green-400' : 'bg-red-500/20 text-red-400 border-red-400'}`}>
                {isOwner ? 'Authorized' : 'Not Owner'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Address:</span>
              <div className="flex items-center space-x-1">
                <span className="text-white text-xs font-mono">
                  {BASIC_TREASURY_POOL_ADDRESS.slice(0, 6)}...{BASIC_TREASURY_POOL_ADDRESS.slice(-4)}
                </span>
                <button onClick={() => copyToClipboard(BASIC_TREASURY_POOL_ADDRESS)}>
                  <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                </button>
                <button onClick={() => openBaseScan(BASIC_TREASURY_POOL_ADDRESS)}>
                  <ExternalLink className="h-3 w-3 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/90 border border-blue-400 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-blue-400 text-sm">
              <DollarSign className="h-4 w-4" />
              <span>Treasury Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {contractBalance ? Number(contractBalance).toLocaleString() : '0'} KILT
              </div>
              <div className="text-sm text-gray-400">
                Tracked: {treasuryBalance ? Number(treasuryBalance).toLocaleString() : '0'} KILT
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Available for distribution
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/90 border border-purple-400 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-purple-400 text-sm">
              <Wallet className="h-4 w-4" />
              <span>Your KILT Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {userKiltBalance ? Number(userKiltBalance).toLocaleString() : '0'} KILT
              </div>
              <div className="text-sm text-gray-400">
                Allowance: {kiltAllowance ? Number(kiltAllowance).toLocaleString() : '0'} KILT
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Available to deposit
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Operations */}
      {isOwner ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fund Contract */}
          <Card className="bg-black/90 border border-green-400 rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-400">
                <TrendingUp className="h-5 w-5" />
                <span>Fund Contract</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount" className="text-gray-300">Amount (KILT)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="depositAmount"
                    type="number"
                    placeholder="1000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="bg-black border-gray-600 text-white"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={maxDeposit}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Max
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                {/* Step 1: Approve KILT */}
                <Button
                  onClick={handleApproveKilt}
                  disabled={!depositAmount || isPending || isConfirming}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  {isPending || isConfirming ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      1. Approve KILT Tokens
                    </>
                  )}
                </Button>
                
                {/* Step 2: Deposit to Treasury */}
                <Button
                  onClick={handleDeposit}
                  disabled={!depositAmount || isPending || isConfirming}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                >
                  {isPending || isConfirming ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      2. Deposit to Treasury
                    </>
                  )}
                </Button>
              </div>
              
              <div className="text-xs text-gray-400 bg-gray-900 p-2 rounded">
                <strong>Instructions:</strong> First approve KILT tokens, then deposit to treasury. Gas cost: ~$0.02 per transaction.
              </div>
            </CardContent>
          </Card>

          {/* Emergency Withdrawal */}
          <Card className="bg-black/90 border border-red-400 rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Emergency Withdrawal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount" className="text-gray-300">Amount (KILT)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="withdrawAmount"
                    type="number"
                    placeholder="500"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-black border-gray-600 text-white"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={maxWithdraw}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    All
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || isPending || isConfirming}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                {isPending || isConfirming ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Emergency Withdraw
                  </>
                )}
              </Button>
              
              <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-400/30">
                <strong>Warning:</strong> This withdraws KILT tokens directly to your wallet. Use only in emergencies.
              </div>
            </CardContent>
          </Card>

          {/* Distribute Rewards */}
          <Card className="bg-black/90 border border-blue-400 rounded-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-400">
                <Activity className="h-5 w-5" />
                <span>Distribute Rewards</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rewardUser" className="text-gray-300">User Address</Label>
                  <Input
                    id="rewardUser"
                    type="text"
                    placeholder="0x..."
                    value={rewardUser}
                    onChange={(e) => setRewardUser(e.target.value)}
                    className="bg-black border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rewardAmount" className="text-gray-300">Reward Amount (KILT)</Label>
                  <Input
                    id="rewardAmount"
                    type="number"
                    placeholder="100"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    className="bg-black border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <Button
                onClick={handleDistributeReward}
                disabled={!rewardUser || !rewardAmount || isPending || isConfirming}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                {isPending || isConfirming ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Distribute Reward
                  </>
                )}
              </Button>
              
              <div className="text-xs text-gray-400 bg-gray-900 p-2 rounded">
                <strong>Note:</strong> This allocates KILT tokens to a user's claimable balance. They can claim immediately after distribution.
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-black/90 border border-yellow-400 rounded-lg">
          <CardContent className="p-6 text-center">
            <Lock className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Owner Access Required</h3>
            <p className="text-gray-300">
              Only the contract owner can manage treasury operations.
            </p>
            <div className="mt-4 text-sm text-gray-400">
              <p>Contract Owner: {contractOwner}</p>
              <p>Your Address: {address}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Status */}
      {(isPending || isConfirming) && (
        <Card className="bg-black/90 border border-yellow-400 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-5 w-5 text-yellow-400 animate-spin" />
              <span className="text-yellow-400">
                {isPending ? 'Waiting for wallet confirmation...' : 'Transaction confirming on blockchain...'}
              </span>
            </div>
            {txHash && (
              <div className="mt-2 text-center">
                <button
                  onClick={() => openBaseScan(`https://basescan.org/tx/${txHash}`)}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center space-x-1"
                >
                  <span>View Transaction</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}