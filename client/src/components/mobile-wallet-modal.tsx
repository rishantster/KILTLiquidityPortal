import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, Smartphone, Wifi, Wallet } from 'lucide-react';
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
          <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3 mb-6">
            <Wallet className="h-6 w-6" />
            Connect Your Wallet
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-400 mb-4">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">Mobile Wallets</span>
          </div>
          
          {!connectionUri ? (
            <Button
              onClick={handleWalletConnect}
              className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
            >
              <Smartphone className="mr-4 h-5 w-5" />
              WalletConnect (Recommended)
            </Button>
          ) : (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <QRCodeSVG
                  value={connectionUri}
                  size={180}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <p className="text-gray-300 text-center text-sm">
                Scan with your wallet app or choose a wallet below
              </p>

              {/* Popular Mobile Wallets */}
              <div className="space-y-3">
                <Button
                  onClick={() => openInWallet('MetaMask', 'https://metamask.app.link/')}
                  className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
                >
                  <Wallet className="mr-4 h-5 w-5" />
                  MetaMask
                </Button>
                <Button
                  onClick={() => openInWallet('Coinbase Wallet', 'https://go.cb-w.com/')}
                  className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
                >
                  <Wallet className="mr-4 h-5 w-5" />
                  Coinbase Wallet
                </Button>
                <Button
                  onClick={() => openInWallet('Trust Wallet', 'https://link.trustwallet.com/')}
                  className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
                >
                  <Wallet className="mr-4 h-5 w-5" />
                  Trust Wallet
                </Button>
                <Button
                  onClick={() => openInWallet('Rainbow', 'https://rnbwapp.com/')}
                  className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
                >
                  <Wallet className="mr-4 h-5 w-5" />
                  Rainbow Wallet
                </Button>
              </div>

              {/* Copy URI Button */}
              <Button
                onClick={copyToClipboard}
                className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
              >
                <Copy className="mr-4 h-5 w-5" />
                Copy Connection URI
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 text-center mt-6">
          By connecting, you agree to the Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  );
}