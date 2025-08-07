import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';

interface ClaimTestButtonProps {
  calculatedRewards: number;
  onClaimStart?: () => void;
  onClaimComplete?: (success: boolean) => void;
}

export function ClaimTestButton({ calculatedRewards, onClaimStart, onClaimComplete }: ClaimTestButtonProps) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);

  const handleTestClaim = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    if (calculatedRewards <= 0) {
      toast({
        title: "No rewards available",
        description: "Add liquidity to earn rewards",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    onClaimStart?.();

    try {
      console.log('🏁 ============ COMPREHENSIVE CLAIM TEST INITIATED ============');
      console.log('🧪 TEST LOG 1: Test initiated by user');
      console.log('🧪 TEST LOG 2: User address:', address);
      console.log('🧪 TEST LOG 3: Calculated rewards:', calculatedRewards, 'KILT');
      console.log('🧪 TEST LOG 4: Current timestamp:', new Date().toISOString());

      // Step 1: Test claimability endpoint
      console.log('🧪 TEST LOG 5: Testing claimability endpoint...');
      const claimabilityResponse = await fetch(`/api/rewards/claimability/${address}`);
      console.log('🧪 TEST LOG 6: Claimability response status:', claimabilityResponse.status);
      
      if (!claimabilityResponse.ok) {
        throw new Error('Claimability endpoint failed');
      }

      const claimability = await claimabilityResponse.json();
      console.log('🧪 TEST LOG 7: Claimability response:', JSON.stringify(claimability, null, 2));

      // Step 2: Test signature generation
      console.log('🧪 TEST LOG 8: Testing signature generation...');
      const signatureResponse = await fetch('/api/rewards/generate-claim-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address })
      });

      console.log('🧪 TEST LOG 9: Signature response status:', signatureResponse.status);
      
      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        console.error('🧪 TEST LOG 10: Signature generation failed:', errorData);
        throw new Error(`Signature generation failed: ${errorData.error}`);
      }

      const signatureData = await signatureResponse.json();
      console.log('🧪 TEST LOG 11: Signature data:', JSON.stringify(signatureData, null, 2));

      // Step 3: Test smart contract status endpoint
      console.log('🧪 TEST LOG 12: Testing smart contract debug endpoint...');
      const debugResponse = await fetch(`/api/debug/smart-contract-status/${address}`);
      console.log('🧪 TEST LOG 13: Debug response status:', debugResponse.status);
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('🧪 TEST LOG 14: Debug data:', JSON.stringify(debugData, null, 2));
        
        // Additional detailed analysis of contract status
        console.log('🧪 TEST LOG 14A: Contract deployed:', debugData.contractDeployed);
        console.log('🧪 TEST LOG 14B: Calculator address:', debugData.calculatorAddress);
        console.log('🧪 TEST LOG 14C: User found in database:', debugData.userFound);
        console.log('🧪 TEST LOG 14D: Reward stats:', JSON.stringify(debugData.rewardStats, null, 2));
        console.log('🧪 TEST LOG 14E: Signature test result:', JSON.stringify(debugData.signatureTest, null, 2));
        console.log('🧪 TEST LOG 14F: Contract balance sufficient:', debugData.balanceInfo?.sufficient);
        console.log('🧪 TEST LOG 14G: Contract balance amount:', debugData.balanceInfo?.balance);
      } else {
        console.error('🧪 TEST LOG 13A: Debug endpoint failed with status:', debugResponse.status);
        const errorText = await debugResponse.text();
        console.error('🧪 TEST LOG 13B: Debug endpoint error:', errorText);
      }

      console.log('✅ TEST LOG 15: All backend tests completed successfully');
      console.log('🏁 ============ COMPREHENSIVE CLAIM TEST COMPLETED ============');

      toast({
        title: "Test completed successfully",
        description: `Check browser console for detailed logs. Ready to claim ${calculatedRewards.toFixed(2)} KILT`,
        variant: "default"
      });

      onClaimComplete?.(true);

    } catch (error) {
      console.error('❌ TEST LOG ERROR: Claim test failed:', error);
      console.error('❌ TEST LOG ERROR: Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });

      onClaimComplete?.(false);
    } finally {
      setIsTesting(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Button
      onClick={handleTestClaim}
      disabled={isTesting || calculatedRewards <= 0}
      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
    >
      {isTesting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          Testing claim flow...
        </>
      ) : (
        `Test Claim Flow (${calculatedRewards.toFixed(2)} KILT)`
      )}
    </Button>
  );
}