import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  Smartphone, 
  Monitor,
  Mail,
  Globe,
  Zap,
  CreditCard,
  Shield,
  Users,
  Sparkles,
  Settings
} from 'lucide-react';

interface EnhancedWalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'wallet' | 'social' | 'email' | 'enterprise';
  features: string[];
  action: () => void;
  recommended?: boolean;
  comingSoon?: boolean;
}

interface SocialAuthOption {
  id: string;
  name: string;
  icon: string;
  provider: string;
  enabled: boolean;
}

export function EnhancedReownWallet() {
  const { 
    isConnected, 
    isConnecting, 
    connectionStatus, 
    lastError, 
    address, 
    connect, 
    connectWithWalletConnect,
    disconnect, 
    clearError 
  } = useWallet();
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('wallets');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMobile] = useState(() => /Mobi|Android/i.test(navigator.userAgent));

  // Enhanced feature flags - simulating Reown AppKit capabilities
  const [features] = useState({
    socialLogin: true,
    emailAuth: true,
    gasSponsorship: true,
    onRamp: true,
    swaps: true,
    analytics: true,
    smartAccount: true,
    multiChain: true
  });

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
      case 'network_error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleWalletSelect = (action: () => void) => {
    setShowWalletModal(false);
    action();
  };

  // Enhanced wallet options with Reown-style categorization
  const walletOptions: EnhancedWalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Most popular Ethereum wallet with browser extension',
      category: 'wallet',
      features: ['Browser Extension', 'Mobile App', 'Hardware Wallet Support'],
      action: () => handleWalletSelect(connect),
      recommended: !isMobile
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect to 600+ wallets including mobile wallets',
      category: 'wallet',
      features: ['600+ Wallets', 'Mobile Support', 'QR Code', 'Deep Links'],
      action: () => handleWalletSelect(connectWithWalletConnect),
      recommended: isMobile
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔷',
      description: 'Self-custody wallet from Coinbase',
      category: 'wallet',
      features: ['Exchange Integration', 'Mobile & Desktop', 'dApp Browser'],
      action: () => handleWalletSelect(() => alert('Coinbase Wallet - Coming Soon')),
      comingSoon: true
    }
  ];

  // Social authentication options (Reown AppKit style)
  const socialOptions: SocialAuthOption[] = [
    { id: 'google', name: 'Google', icon: '🔍', provider: 'google', enabled: features.socialLogin },
    { id: 'github', name: 'GitHub', icon: '🐙', provider: 'github', enabled: features.socialLogin },
    { id: 'discord', name: 'Discord', icon: '💬', provider: 'discord', enabled: features.socialLogin },
    { id: 'twitter', name: 'X (Twitter)', icon: '🐦', provider: 'twitter', enabled: features.socialLogin },
    { id: 'apple', name: 'Apple', icon: '🍎', provider: 'apple', enabled: features.socialLogin }
  ];

  const handleSocialAuth = (provider: string) => {
    setShowWalletModal(false);
    // Simulate social authentication
    alert(`${provider} authentication - Feature coming soon with Reown AppKit integration!`);
  };

  const handleEmailAuth = () => {
    if (!emailAddress) {
      alert('Please enter your email address');
      return;
    }
    setShowWalletModal(false);
    // Simulate email authentication
    alert(`Email authentication for ${emailAddress} - Feature coming soon with Reown AppKit!`);
  };

  const handlePhoneAuth = () => {
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }
    setShowWalletModal(false);
    // Simulate phone authentication
    alert(`SMS authentication for ${phoneNumber} - Feature coming soon with Reown AppKit!`);
  };

  if (isConnected) {
    return (
      <div className="flex items-center space-x-3">
        {/* Enhanced connection display with features */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-lg px-3 py-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-emerald-400">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          {features.gasSponsorship && (
            <Badge variant="secondary" className="text-xs bg-pink-500/20 text-pink-400 border-pink-500/30">
              ⚡ Gas Sponsored
            </Badge>
          )}
          {features.smartAccount && (
            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
              🧠 Smart Account
            </Badge>
          )}
        </div>

        {/* Enhanced disconnect with options */}
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="outline"
          size="sm"
          className="border-gray-600 hover:border-pink-500/50 bg-black/20"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button
          onClick={disconnect}
          variant="outline"
          size="sm"
          className="border-gray-600 hover:border-red-500/50 bg-black/20"
        >
          Disconnect
        </Button>

        {/* Advanced features panel */}
        {showAdvanced && (
          <div className="absolute top-16 right-0 z-50 w-80 bg-black/90 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white">Enhanced Features</h3>
              
              {features.onRamp && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                  onClick={() => alert('Buy crypto with fiat - Coming soon!')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Buy Crypto with Fiat
                </Button>
              )}

              {features.swaps && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
                  onClick={() => alert('Crypto swaps - Coming soon!')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Swap Tokens
                </Button>
              )}

              {features.analytics && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                  onClick={() => alert('Portfolio analytics - Coming soon!')}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Portfolio Analytics
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowWalletModal(true)}
        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-medium px-6 py-2"
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wifi className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>

      {/* Enhanced Reown-style connection modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-[500px] bg-black/95 backdrop-blur-xl border-gray-800/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Connect to KILT Liquidity Portal
            </DialogTitle>
            <p className="text-sm text-gray-400 mt-2">
              Choose your preferred connection method. Powered by Reown technology.
            </p>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-900/50">
              <TabsTrigger value="wallets" className="text-xs">
                <Monitor className="h-4 w-4 mr-1" />
                Wallets
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs" disabled={!features.socialLogin}>
                <Users className="h-4 w-4 mr-1" />
                Social
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs" disabled={!features.emailAuth}>
                <Mail className="h-4 w-4 mr-1" />
                Email
              </TabsTrigger>
              <TabsTrigger value="mobile" className="text-xs">
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </TabsTrigger>
            </TabsList>

            {/* Wallets Tab */}
            <TabsContent value="wallets" className="space-y-3">
              <div className="space-y-2">
                {walletOptions.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={wallet.action}
                    disabled={wallet.comingSoon}
                    className="w-full p-4 rounded-lg border border-gray-800/50 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm hover:from-white/10 hover:to-white/15 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{wallet.icon}</span>
                        <div className="text-left">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-white">{wallet.name}</h3>
                            {wallet.recommended && (
                              <Badge className="text-xs bg-pink-500/20 text-pink-400 border-pink-500/30">
                                Recommended
                              </Badge>
                            )}
                            {wallet.comingSoon && (
                              <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{wallet.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {wallet.features.map((feature) => (
                              <Badge key={feature} variant="outline" className="text-xs border-gray-600 text-gray-300">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* Social Login Tab */}
            <TabsContent value="social" className="space-y-3">
              <div className="text-center mb-4">
                <Shield className="h-8 w-8 mx-auto text-blue-400 mb-2" />
                <p className="text-sm text-gray-400">
                  Sign in with your social accounts. No seed phrases needed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {socialOptions.map((social) => (
                  <button
                    key={social.id}
                    onClick={() => handleSocialAuth(social.provider)}
                    disabled={!social.enabled}
                    className="p-3 rounded-lg border border-gray-800/50 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm hover:from-white/10 hover:to-white/15 transition-all duration-200 disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{social.icon}</span>
                      <span className="text-sm font-medium text-white">{social.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              <Badge className="w-full justify-center bg-blue-500/20 text-blue-400 border-blue-500/30 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Coming Soon with Reown AppKit
              </Badge>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-3">
              <div className="text-center mb-4">
                <Mail className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                <p className="text-sm text-gray-400">
                  Sign in with your email address. We'll send you a magic link.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="email" className="text-sm text-gray-300">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 focus:border-purple-500"
                  />
                </div>

                <Button 
                  onClick={handleEmailAuth}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Continue with Email
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm text-gray-300">Or use SMS</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 focus:border-purple-500"
                  />
                  <Button 
                    onClick={handlePhoneAuth}
                    variant="outline"
                    className="w-full border-gray-600 hover:border-purple-500/50"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Continue with SMS
                  </Button>
                </div>
              </div>

              <Badge className="w-full justify-center bg-purple-500/20 text-purple-400 border-purple-500/30 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Coming Soon with Reown AppKit
              </Badge>
            </TabsContent>

            {/* Mobile Tab */}
            <TabsContent value="mobile" className="space-y-3">
              <div className="text-center mb-4">
                <Smartphone className="h-8 w-8 mx-auto text-green-400 mb-2" />
                <p className="text-sm text-gray-400">
                  Connect directly to your favorite mobile wallet apps
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'MetaMask', icon: '🦊', link: 'metamask.app.link' },
                  { name: 'Trust Wallet', icon: '🛡️', link: 'link.trustwallet.com' },
                  { name: 'Coinbase', icon: '🔷', link: 'go.cb-w.com' },
                  { name: 'Rainbow', icon: '🌈', link: 'rainbow.me' }
                ].map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => {
                      setShowWalletModal(false);
                      connectWithWalletConnect();
                    }}
                    className="p-3 rounded-lg border border-gray-800/50 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm hover:from-white/10 hover:to-white/15 transition-all duration-200"
                  >
                    <div className="text-center">
                      <span className="text-2xl block mb-1">{wallet.icon}</span>
                      <span className="text-sm font-medium text-white">{wallet.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 text-center">
                Tap any wallet to connect via WalletConnect protocol
              </p>
            </TabsContent>
          </Tabs>

          {/* Enhanced features showcase */}
          <div className="border-t border-gray-800/50 pt-4">
            <p className="text-xs text-gray-500 mb-2">Enhanced with Reown technology:</p>
            <div className="flex flex-wrap gap-2">
              {features.gasSponsorship && (
                <Badge variant="outline" className="text-xs border-blue-600 text-blue-400">
                  ⚡ Gas Sponsorship
                </Badge>
              )}
              {features.onRamp && (
                <Badge variant="outline" className="text-xs border-green-600 text-green-400">
                  💳 Buy Crypto
                </Badge>
              )}
              {features.swaps && (
                <Badge variant="outline" className="text-xs border-purple-600 text-purple-400">
                  🔄 Token Swaps
                </Badge>
              )}
              {features.smartAccount && (
                <Badge variant="outline" className="text-xs border-pink-600 text-pink-400">
                  🧠 Smart Accounts
                </Badge>
              )}
            </div>
          </div>

          {/* Error display */}
          {lastError && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">
                {lastError}
                <Button 
                  onClick={clearError}
                  variant="link" 
                  size="sm" 
                  className="text-red-400 p-0 h-auto ml-2"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}