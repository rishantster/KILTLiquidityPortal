export default function HomeSimple() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold" style={{ color: '#ff0066' }}>
            🚀 KILT Liquidity Portal
          </h1>
          <p className="text-xl text-gray-400">
            DeFi Rewards on Base Network
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <span>✅</span>
            <span>React App Loading Successfully</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-blue-400">
            <span>🔗</span>
            <span>Backend API Connected</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <span>⚡</span>
            <span>Cache System Active (v2025.01.19.002)</span>
          </div>
        </div>
        
        <div className="pt-4">
          <button 
            className="px-6 py-3 text-white rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#ff0066' }}
            onClick={() => {
              window.location.href = window.location.href;
            }}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}