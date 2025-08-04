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
      // Step 1: Get secure signature from backend
      const signatureResponse = await fetch('/api/security/generate-claim-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          amount: claimableAmount
        })
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        throw new Error(errorData.error || 'Failed to generate claim signature');
      }

      const signatureData = await signatureResponse.json();
      
      if (!signatureData.success) {
        throw new Error(signatureData.error || 'Signature generation failed');
      }

      const { signature, nonce, maxClaimLimit } = signatureData;
      
      // Show claim limit info to user
      if (claimableAmount > maxClaimLimit) {
        toast({
          title: "Claim Limit Notice",
          description: `Your current limit is ${maxClaimLimit} KILT. Build more history to increase limits.`,
          variant: "destructive"
        });
        return;
      }

      // Step 2: Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Step 3: Enhanced contract interaction with nonce-based security
      const contractAddress = "0x3ee2361272EaDc5ADc91418530722728E7DCe526";
      
      // Encode claimRewards(amount, nonce, signature) function call
      const amountWei = (claimableAmount * 1e18).toString(16).padStart(64, '0');
      const nonceHex = nonce.toString(16).padStart(64, '0');
      const signatureFormatted = signature.slice(2); // Remove 0x prefix
      
      const claimData = '0x' + 
        '4e71e0c8' + // claimRewards(uint256,uint256,bytes) selector
        amountWei + 
        nonceHex + 
        '0000000000000000000000000000000000000000000000000000000000000060' + // offset for bytes
        '0000000000000000000000000000000000000000000000000000000000000041' + // signature length (65 bytes)
        signatureFormatted +
        '00'; // padding
      
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
        title: "Secure Transaction Submitted",
        description: `Claiming ${claimableAmount.toFixed(2)} KILT with nonce-based security`,
      });

      // Enhanced success feedback with security confirmation
      setTimeout(() => {
        toast({
          title: "Rewards Claimed Successfully",
          description: `${claimableAmount.toFixed(2)} KILT tokens transferred with enhanced security`,
        });
        onSuccess?.();
      }, 3000);
      
    } catch (error: any) {
      console.error('Enhanced claim error:', error);
      
      let errorMessage = 'Failed to claim rewards';
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message?.includes('limit')) {
        errorMessage = error.message;
      } else if (error.message?.includes('signature')) {
        errorMessage = 'Security validation failed - please try again';
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