import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function WalletTest() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <Card className="max-w-md mx-auto mt-8 bg-black/90 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Wallet className="h-5 w-5" />
          Wagmi Wallet Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Connection Status:</h3>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {isConnecting && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Connecting...
              </Badge>
            )}
            {isDisconnected && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        {/* Address Display */}
        {address && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Connected Address:</h3>
            <code className="block p-2 bg-gray-800 rounded text-green-400 text-xs font-mono break-all">
              {address}
            </code>
          </div>
        )}

        {/* Connection Buttons */}
        <div className="space-y-2">
          {!isConnected && (
            <>
              <h3 className="text-sm font-medium text-gray-300">Available Connectors:</h3>
              {connectors.map((connector) => (
                <Button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect with {connector.name}
                </Button>
              ))}
            </>
          )}
          
          {isConnected && (
            <Button
              onClick={() => disconnect()}
              className="w-full bg-red-600 hover:bg-red-500 text-white"
            >
              Disconnect Wallet
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error.message}</p>
          </div>
        )}

        {/* Debug Info */}
        <details className="mt-4">
          <summary className="text-sm text-gray-400 cursor-pointer">Debug Info</summary>
          <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-300 overflow-auto">
{JSON.stringify({
  isConnected,
  isConnecting,
  isDisconnected,
  isPending,
  hasAddress: !!address,
  connectorsCount: connectors.length,
  connectorNames: connectors.map(c => c.name)
}, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}