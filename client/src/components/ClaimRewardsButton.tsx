import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Coins, AlertCircle } from 'lucide-react';

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
      // Simple approach: Direct contract interaction via MetaMask
      const contractAddress = "0x3ee2361272EaDc5ADc91418530722728E7DCe526"; // Current contract
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Contract call via MetaMask
      const claimData = '0x9a99b4f0'; // claimAllRewards() function selector
      
      const txParams = {
        to: contractAddress,
        from: userAddress,
        data: claimData,
        gas: '0x186A0', // 100,000 gas limit
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      toast({
        title: "Transaction Submitted",
        description: `Claiming ${claimableAmount.toFixed(2)} KILT tokens`,
      });

      // Simple success feedback
      setTimeout(() => {
        toast({
          title: "Rewards Claimed",
          description: `${claimableAmount.toFixed(2)} KILT tokens should arrive in your wallet`,
        });
        onSuccess?.();
      }, 3000);
      
    } catch (error: any) {
      console.error('Claim error:', error);
      
      let errorMessage = 'Failed to claim rewards';
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
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
  );
}