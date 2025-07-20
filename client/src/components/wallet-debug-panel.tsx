import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/wallet-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Debug panel for wallet connection issues
 */
export function WalletDebugPanel() {
  const { address, isConnected, forceRefreshWallet } = useWallet();

  const checkWalletStatus = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.log('DEBUG: No ethereum object found');
      return;
    }

    try {
      // Get accounts directly
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      console.log('DEBUG: Current accounts from eth_accounts:', accounts);
      console.log('DEBUG: ethereum.selectedAddress:', ethereum.selectedAddress);
      console.log('DEBUG: App stored address:', address);
      console.log('DEBUG: App isConnected:', isConnected);
      
      // Test account change event manually
      if (accounts && accounts.length > 0 && accounts[0] !== address) {
        console.log('DEBUG: Address mismatch detected!');
        console.log('DEBUG: Wallet says:', accounts[0]);
        console.log('DEBUG: App says:', address);
        
        // Force trigger accountsChanged event
        if (ethereum.emit) {
          console.log('DEBUG: Manually triggering accountsChanged event');
          ethereum.emit('accountsChanged', accounts);
        }
      }
    } catch (error) {
      console.error('DEBUG: Error checking wallet status:', error);
    }
  };

  const triggerAccountChange = () => {
    console.log('DEBUG: Manually triggering account change detection');
    checkWalletStatus();
  };

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-yellow-400">Wallet Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            <strong>App Address:</strong> {address || 'Not connected'}
          </p>
          <p className="text-sm text-gray-300">
            <strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}
          </p>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={triggerAccountChange}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Check Wallet Status
          </Button>
          <Button 
            onClick={forceRefreshWallet}
            variant="default"
            size="sm"
            className="w-full bg-pink-600 hover:bg-pink-700"
          >
            Force Reconnect Current Account
          </Button>
          <p className="text-xs text-gray-400">
            Nuclear option: Resets MetaMask permissions and forces fresh connection
          </p>
          
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            Refresh Page (Ultimate Fix)
          </Button>
          <p className="text-xs text-gray-400">
            If MetaMask is stuck, refresh the page and reconnect manually
          </p>
        </div>
      </CardContent>
    </Card>
  );
}