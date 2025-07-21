import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, Settings, Bell, Smartphone } from 'lucide-react';
import { TransactionStatusTracker } from './transaction-status-tracker';
import { PositionNotifications } from './position-notifications';
import { EnhancedMobileWallet } from './enhanced-mobile-wallet';

export function UXDemo() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [showMobileWallet, setShowMobileWallet] = useState(false);

  const mockPositions = [
    {
      id: '1',
      nftTokenId: '12345',
      currentValueUSD: '500.00',
      isOutOfRange: true,
      feesEarned: '25.50',
      liquidity: 1000000000000000000n
    },
    {
      id: '2', 
      nftTokenId: '12346',
      currentValueUSD: '75.00',
      isOutOfRange: false,
      feesEarned: '2.10',
      liquidity: 500000000000000000n
    }
  ];

  return (
    <div className="w-full space-y-6">
      <Card className="bg-black/40 backdrop-blur-sm border-gray-800/30">
        <CardHeader>
          <CardTitle className="text-white font-mono flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-pink-400" />
            <span>UX Enhancement Demo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800/40">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="mobile">Mobile</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-900/50 border-gray-700/30">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Settings className="w-4 h-4 text-blue-400" />
                      </div>
                      <h3 className="font-medium text-white">Transaction Tracking</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      Real-time transaction status with step-by-step progress
                    </p>
                    <Button
                      onClick={() => setActiveDemo('transaction')}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Demo Transaction Tracker
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/30">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <Bell className="w-4 h-4 text-yellow-400" />
                      </div>
                      <h3 className="font-medium text-white">Smart Notifications</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      Intelligent alerts for position management
                    </p>
                    <Button
                      onClick={() => setActiveDemo('notifications')}
                      size="sm"
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      Demo Notifications
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/30">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-green-400" />
                      </div>
                      <h3 className="font-medium text-white">Mobile Wallets</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      Enhanced mobile wallet connection experience
                    </p>
                    <Button
                      onClick={() => setShowMobileWallet(true)}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Demo Mobile Wallets
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/30">
                <h3 className="text-white font-medium mb-2">Enhancement Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-400"></Badge>
                      <span className="text-gray-300">Real-time transaction tracking</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-400"></Badge>
                      <span className="text-gray-300">Position health monitoring</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-400"></Badge>
                      <span className="text-gray-300">Mobile wallet deep linking</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-400"></Badge>
                      <span className="text-gray-300">Smart notification system</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-400"></Badge>
                      <span className="text-gray-300">Progressive web app features</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-400"></Badge>
                      <span className="text-gray-300">Responsive design optimization</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Transaction Status Tracking</h3>
                  <Button
                    onClick={() => setActiveDemo(activeDemo === 'transaction' ? null : 'transaction')}
                    size="sm"
                    variant={activeDemo === 'transaction' ? 'destructive' : 'default'}
                  >
                    {activeDemo === 'transaction' ? 'Stop Demo' : 'Start Demo'}
                  </Button>
                </div>
                
                {activeDemo === 'transaction' && (
                  <TransactionStatusTracker
                    operation="mint"
                    transactionHash="0x1234567890abcdef1234567890abcdef12345678"
                    onComplete={() => setActiveDemo(null)}
                    onError={() => setActiveDemo(null)}
                  />
                )}
                
                <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/30">
                  <h4 className="text-white font-medium mb-2">Features:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Step-by-step transaction progress</li>
                    <li>• Real-time status updates</li>
                    <li>• Gas estimation and timing</li>
                    <li>• Direct links to blockchain explorer</li>
                    <li>• Error handling and retry mechanisms</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Position Notification System</h3>
                  <Button
                    onClick={() => setActiveDemo(activeDemo === 'notifications' ? null : 'notifications')}
                    size="sm"
                    variant={activeDemo === 'notifications' ? 'destructive' : 'default'}
                  >
                    {activeDemo === 'notifications' ? 'Hide Demo' : 'Show Demo'}
                  </Button>
                </div>
                
                {activeDemo === 'notifications' && (
                  <PositionNotifications
                    userAddress="0x1234567890123456789012345678901234567890"
                    positions={mockPositions}
                  />
                )}
                
                <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/30">
                  <h4 className="text-white font-medium mb-2">Notification Types:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Out-of-range position alerts</li>
                    <li>• High fee accumulation notifications</li>
                    <li>• Low liquidity warnings</li>
                    <li>• Price movement alerts</li>
                    <li>• Customizable thresholds and settings</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Enhanced Mobile Wallet Integration</h3>
                  <Button
                    onClick={() => setShowMobileWallet(true)}
                    size="sm"
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    Test Mobile Wallets
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/30">
                    <h4 className="text-white font-medium mb-2">Supported Wallets:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>🦊 MetaMask Mobile</li>
                      <li>🛡️ Trust Wallet</li>
                      <li>🔵 Coinbase Wallet</li>
                      <li>🌈 Rainbow Wallet</li>
                      <li>🔒 SafePal Wallet</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/30">
                    <h4 className="text-white font-medium mb-2">Mobile Features:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Universal deep link support</li>
                      <li>• Automatic wallet detection</li>
                      <li>• Installation guidance</li>
                      <li>• WalletConnect v2 integration</li>
                      <li>• Touch-optimized interface</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Mobile Wallet Demo Modal */}
      <EnhancedMobileWallet
        isOpen={showMobileWallet}
        onClose={() => setShowMobileWallet(false)}
        onWalletSelect={(wallet) => {
          console.log('Wallet selected:', wallet);
          setShowMobileWallet(false);
        }}
      />
    </div>
  );
}