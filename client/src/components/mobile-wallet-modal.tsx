import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, Smartphone, Wifi } from 'lucide-react';
import { useConnect, useAccount } from 'wagmi';
import { toast } from '@/hooks/use-toast';

interface MobileWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileWalletModal({ open, onOpenChange }: MobileWalletModalProps) {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  const [connectionUri, setConnectionUri] = useState<string>('');

  const walletConnectConnector = connectors.find(c => c.id === 'walletConnect');

  const handleWalletConnect = async () => {
    if (!walletConnectConnector) {
      toast({
        title: "WalletConnect Not Available",
        description: "WalletConnect connector is not configured properly.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the connection URI
      const provider = await walletConnectConnector.getProvider();
      
      // Listen for the display_uri event to get the QR code
      provider.on('display_uri', (uri: string) => {
        console.log('WalletConnect URI:', uri);
        setConnectionUri(uri);
      });

      // Initiate connection
      connect({ connector: walletConnectConnector });
      
    } catch (error) {
      console.error('WalletConnect error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initialize WalletConnect. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    if (connectionUri) {
      navigator.clipboard.writeText(connectionUri);
      toast({
        title: "Copied!",
        description: "Connection URI copied to clipboard",
      });
    }
  };

  const openInWallet = (walletName: string, deepLink: string) => {
    if (connectionUri) {
      const fullLink = `${deepLink}wc?uri=${encodeURIComponent(connectionUri)}`;
      window.open(fullLink, '_blank');
      toast({
        title: `Opening ${walletName}`,
        description: "If the app doesn't open, try copying the connection URI manually.",
      });
    }
  };

  // Close modal when connected
  if (isConnected && open) {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3">
            <Wifi className="h-6 w-6 text-[#ff0066]" />
            Connect Mobile Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!connectionUri ? (
            <div className="text-center space-y-4">
              <p className="text-gray-300">
                Connect to any mobile wallet using WalletConnect
              </p>
              <Button
                onClick={handleWalletConnect}
                className="w-full bg-gradient-to-r from-[#ff0066] to-pink-600 hover:from-[#ff0066]/80 hover:to-pink-600/80 text-white"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Start Connection
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <QRCodeSVG
                  value={connectionUri}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <p className="text-gray-300 text-center text-sm">
                Scan with your wallet app or choose a wallet below
              </p>

              {/* Popular Mobile Wallets */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => openInWallet('MetaMask', 'https://metamask.app.link/')}
                  className="border-gray-700 hover:bg-gray-800 text-white"
                >
                  🦊 MetaMask
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openInWallet('Trust Wallet', 'https://link.trustwallet.com/')}
                  className="border-gray-700 hover:bg-gray-800 text-white"
                >
                  🛡️ Trust Wallet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openInWallet('Coinbase Wallet', 'https://go.cb-w.com/')}
                  className="border-gray-700 hover:bg-gray-800 text-white"
                >
                  🔵 Coinbase
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openInWallet('Rainbow', 'https://rnbwapp.com/')}
                  className="border-gray-700 hover:bg-gray-800 text-white"
                >
                  🌈 Rainbow
                </Button>
              </div>

              {/* Copy URI Button */}
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="w-full border-gray-700 hover:bg-gray-800 text-white"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Connection URI
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Having trouble? Copy the URI and paste it into your wallet's WalletConnect feature.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}