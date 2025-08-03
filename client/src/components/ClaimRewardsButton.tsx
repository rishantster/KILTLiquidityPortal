import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Coins, CheckCircle, AlertCircle } from 'lucide-react';

interface ClaimRewardsButtonProps {
  userAddress: string;
  claimableAmount: number;
  onSuccess?: () => void;
}

export function ClaimRewardsButton({ 
  userAddress, 
  claimableAmount, 
  onSuccess 
}: ClaimRewardsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const { toast } = useToast();

  const handleClaim = async () => {
    if (!window.ethereum) {
      toast({
        title: "Wallet Required", 
        description: "Please connect MetaMask to claim rewards",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simple Treasury Pool Contract ABI (minimal functions needed)
      const contractABI = [
        "function claimAllRewards() external",
        "function getClaimableAmount(address user) external view returns (uint256)",
        "function getContractBalance() external view returns (uint256)"
      ];

      // Contract address from database configuration
      const contractAddress = "0x3ee2361272EaDc5ADc91418530722728E7DCe526"; // Will be updated after deployment
      
      // Initialize ethers provider
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new window.ethers.Contract(contractAddress, contractABI, signer);

      // Check claimable amount on-chain
      const claimableWei = await contract.getClaimableAmount(userAddress);
      const claimableTokens = parseFloat(window.ethers.utils.formatEther(claimableWei));
      
      if (claimableTokens === 0) {
        toast({
          title: "No Rewards Available",
          description: "You don't have any rewards to claim at this time",
          variant: "destructive"
        });
        return;
      }

      // Estimate gas for the transaction
      const gasEstimate = await contract.estimateGas.claimAllRewards();
      const gasPrice = await provider.getGasPrice();
      const gasCostWei = gasEstimate.mul(gasPrice);
      const gasCostEth = parseFloat(window.ethers.utils.formatEther(gasCostWei));
      
      toast({
        title: "Claiming Rewards",
        description: `Claiming ${claimableTokens.toFixed(2)} KILT (Gas: ~$${(gasCostEth * 2000).toFixed(3)})`,
      });

      // Execute claim transaction
      const tx = await contract.claimAllRewards({
        gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
      });

      setTxHash(tx.hash);
      
      toast({
        title: "Transaction Submitted",
        description: `Waiting for confirmation... Hash: ${tx.hash.slice(0, 8)}...`,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast({
          title: "Rewards Claimed Successfully! 🎉",
          description: `${claimableTokens.toFixed(2)} KILT tokens transferred to your wallet`,
        });
        
        onSuccess?.();
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error: any) {
      console.error('Claim error:', error);
      
      let errorMessage = 'Failed to claim rewards';
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fee';
      } else if (error.message?.includes('No rewards')) {
        errorMessage = 'No rewards available to claim';
      }
      
      toast({
        title: "Claim Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (claimableAmount <= 0) {
    return (
      <Button disabled variant="outline" className="w-full">
        <AlertCircle className="w-4 h-4 mr-2" />
        No Rewards Available
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <Button 
        onClick={handleClaim}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Coins className="w-4 h-4 mr-2" />
        )}
        {isLoading ? 'Claiming...' : `Claim ${claimableAmount.toFixed(2)} KILT`}
      </Button>
      
      {txHash && (
        <div className="text-sm text-center">
          <a 
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            View Transaction on BaseScan
          </a>
        </div>
      )}
      
      <div className="text-xs text-gray-600 text-center">
        💡 You only pay gas fees (~$0.01 on Base network)
        <br />
        KILT tokens transfer automatically from smart contract
      </div>
    </div>
  );
}