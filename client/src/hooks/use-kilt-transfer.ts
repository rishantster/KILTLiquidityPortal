import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { parseUnits, formatUnits } from 'viem';

// KILT token contract address on Base
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';

// ERC20 transfer function ABI
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  }
] as const;

interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export function useKiltTransfer() {
  const { walletClient, address } = useWallet();
  const [isTransferring, setIsTransferring] = useState(false);

  const transferKiltTokens = async (
    recipientAddress: string,
    amount: number
  ): Promise<TransferResult> => {
    try {
      setIsTransferring(true);

      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }

      // Convert amount to proper decimal format (KILT has 18 decimals)
      const amountInWei = parseUnits(amount.toString(), 18);

      // Prepare transaction data
      const { request } = await walletClient.simulateContract({
        address: KILT_TOKEN_ADDRESS,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountInWei],
      });

      // Execute the transaction
      const hash = await walletClient.writeContract(request);

      // Wait for transaction confirmation
      const receipt = await walletClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        return {
          success: true,
          transactionHash: hash
        };
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('KILT transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      setIsTransferring(false);
    }
  };

  return {
    transferKiltTokens,
    isTransferring
  };
}