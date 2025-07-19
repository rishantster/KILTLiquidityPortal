import { useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { CyberpunkAdminPanel } from "@/components/cyberpunk-admin-panel";

export default function AdminPage() {
  const { isConnected, address } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMethod, setAuthMethod] = useState<'wallet' | 'credentials'>('credentials');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Authorized admin wallets (hidden from UI for security)
  const authorizedWallets = [
    '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
    '0x861722f739539CF31d86F1221460Fa96C9baB95C'
  ];

  const handleCredentialsLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('admin_token', data.token);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!authorizedWallets.includes(address)) {
      setError('Unauthorized wallet address');
      return;
    }

    setIsAuthenticated(true);
    localStorage.setItem('admin_wallet', address);
  };

  if (isAuthenticated) {
    return <CyberpunkAdminPanel />;
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono overflow-hidden relative">
      {/* Matrix Rain Background */}
      <div className="fixed inset-0 opacity-10">
        <div className="matrix-rain"></div>
      </div>
      
      {/* Cyberpunk Grid */}
      <div className="fixed inset-0 opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 102, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 102, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="bg-black/90 border border-green-400 rounded-lg p-8 w-full max-w-md shadow-2xl shadow-green-400/20">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#ff0066] mb-2 tracking-wider">
              ◢◤ ADMIN TERMINAL ◥◣
            </h1>
            <div className="text-green-400 text-sm">
              [SYSTEM_ACCESS_LEVEL: MAXIMUM]
            </div>
          </div>

          {/* Auth Method Toggle */}
          <div className="flex mb-6 bg-gray-900 rounded border border-green-400/30">
            <button
              className={`flex-1 py-2 px-4 text-sm font-mono transition-all ${
                authMethod === 'credentials'
                  ? 'bg-green-400 text-black'
                  : 'text-green-400 hover:bg-green-400/10'
              }`}
              onClick={() => setAuthMethod('credentials')}
            >
              CREDENTIALS
            </button>
            <button
              className={`flex-1 py-2 px-4 text-sm font-mono transition-all ${
                authMethod === 'wallet'
                  ? 'bg-[#ff0066] text-white'
                  : 'text-green-400 hover:bg-[#ff0066]/10'
              }`}
              onClick={() => setAuthMethod('wallet')}
            >
              WALLET_AUTH
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 border border-red-500 bg-red-500/10 text-red-400 text-sm font-mono">
              [ERROR] {error}
            </div>
          )}

          {/* Credentials Login */}
          {authMethod === 'credentials' && (
            <div className="space-y-4">
              <div>
                <label className="block text-green-400 text-sm mb-2 font-mono">USERNAME:</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-green-400 text-sm mb-2 font-mono">PASSWORD:</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono focus:border-green-400 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                onClick={handleCredentialsLogin}
                disabled={isLoading}
                className="w-full py-3 bg-green-400 text-black font-mono font-bold rounded hover:bg-green-300 transition-colors disabled:opacity-50"
              >
                {isLoading ? '[AUTHENTICATING...]' : '[INITIATE_ACCESS]'}
              </button>
            </div>
          )}

          {/* Wallet Login */}
          {authMethod === 'wallet' && (
            <div className="space-y-4">
              <div className="text-sm text-green-400 font-mono">
                Connect with your authorized admin wallet
              </div>
              {isConnected ? (
                <div className="p-3 bg-gray-900 border border-green-400/50 rounded text-green-400 font-mono text-sm">
                  WALLET: {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              ) : (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 font-mono text-sm">
                  [NO_WALLET_CONNECTED]
                </div>
              )}
              <button
                onClick={handleWalletLogin}
                disabled={!isConnected}
                className="w-full py-3 bg-[#ff0066] text-white font-mono font-bold rounded hover:bg-[#ff0066]/80 transition-colors disabled:opacity-50"
              >
                [WALLET_VERIFY]
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-green-400/50 font-mono">
            KILT_PROTOCOL_ADMIN_v2.0
          </div>
        </div>
      </div>
    </div>
  );
}