import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Smartphone, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Loader2,
  Zap,
  Link,
  Shield,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from '@/hooks/use-toast';

// Floating particles animation component
const FloatingParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.2,
    duration: 3 + Math.random() * 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-60"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

// Blockchain network animation
const BlockchainAnimation = () => {
  const blocks = Array.from({ length: 6 }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {blocks.map((block, index) => (
        <motion.div
          key={block}
          className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-sm"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
      <motion.div
        className="ml-2 text-blue-400"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Zap className="w-4 h-4" />
      </motion.div>
    </div>
  );
};

// Wallet option component with animations
interface WalletOptionProps {
  name: string;
  icon: React.ReactNode;
  isInstalled: boolean;
  isPopular?: boolean;
  onConnect: () => void;
  installUrl?: string;
  delay?: number;
}

const WalletOption = ({ 
  name, 
  icon, 
  isInstalled, 
  isPopular, 
  onConnect, 
  installUrl, 
  delay = 0 
}: WalletOptionProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`cluely-card rounded-xl cursor-pointer transition-all duration-300 ${
          isHovered ? 'ring-2 ring-blue-500/50' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                animate={isHovered ? { rotate: 360 } : {}}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                {icon}
                {isInstalled && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-2 h-2 text-white" />
                  </motion.div>
                )}
              </motion.div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-white font-semibold">{name}</h3>
                  {isPopular && (
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-white/60 text-sm">
                  {isInstalled ? 'Ready to connect' : 'Install to continue'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isInstalled ? (
                <Button
                  onClick={onConnect}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6"
                >
                  Connect
                  <motion.div
                    animate={{ x: isHovered ? 5 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </motion.div>
                </Button>
              ) : (
                <Button
                  onClick={() => installUrl && window.open(installUrl, '_blank')}
                  variant="outline"
                  className="border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300"
                >
                  Install
                  <Download className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main animated wallet connect modal
interface AnimatedWalletConnectProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnimatedWalletConnect({ isOpen, onClose }: AnimatedWalletConnectProps) {
  const { connectWallet, isConnecting, error } = useWallet();
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'connecting' | 'success'>('select');
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedWallet('');
    }
  }, [isOpen]);

  const handleConnect = async (walletName: string) => {
    setSelectedWallet(walletName);
    setStep('connecting');
    
    try {
      await connectWallet();
      setStep('success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Connection failed:', error);
      setStep('select');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive"
      });
    }
  };

  const wallets = [
    {
      name: 'MetaMask',
      icon: <Wallet className="w-6 h-6 text-orange-500" />,
      isInstalled: typeof window !== 'undefined' && window.ethereum?.isMetaMask,
      isPopular: true,
      installUrl: 'https://metamask.io/download/',
      delay: 0
    },
    {
      name: 'Trust Wallet',
      icon: <Smartphone className="w-6 h-6 text-blue-500" />,
      isInstalled: typeof window !== 'undefined' && window.ethereum?.isTrust,
      installUrl: 'https://trustwallet.com/download',
      delay: 0.1
    },
    {
      name: 'Coinbase Wallet',
      icon: <Shield className="w-6 h-6 text-blue-600" />,
      isInstalled: typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet,
      installUrl: 'https://www.coinbase.com/wallet',
      delay: 0.2
    },
    {
      name: 'Rainbow',
      icon: <Sparkles className="w-6 h-6 text-pink-500" />,
      isInstalled: typeof window !== 'undefined' && window.ethereum?.isRainbow,
      installUrl: 'https://rainbow.me/download',
      delay: 0.3
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="cluely-card rounded-2xl border-2 border-blue-500/20 overflow-hidden">
              <div className="relative">
                <FloatingParticles />
                
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-white/60 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <motion.div
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <BlockchainAnimation />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <CardTitle className="text-2xl font-bold text-white mb-2">
                      {step === 'select' && 'Connect Your Wallet'}
                      {step === 'connecting' && 'Connecting...'}
                      {step === 'success' && 'Successfully Connected!'}
                    </CardTitle>
                    <p className="text-white/70 text-sm">
                      {step === 'select' && 'Choose your preferred wallet to access KILT liquidity rewards'}
                      {step === 'connecting' && `Connecting to ${selectedWallet}...`}
                      {step === 'success' && 'Welcome to KILT Liquidity Portal'}
                    </p>
                  </motion.div>
                </CardHeader>

                <CardContent className="p-6 pt-0">
                  <AnimatePresence mode="wait">
                    {step === 'select' && (
                      <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-3"
                      >
                        {wallets.map((wallet) => (
                          <WalletOption
                            key={wallet.name}
                            {...wallet}
                            onConnect={() => handleConnect(wallet.name)}
                          />
                        ))}
                        
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 }}
                          className="text-center mt-6 p-4 bg-blue-500/10 rounded-lg"
                        >
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-blue-300 font-medium">Secure Connection</span>
                          </div>
                          <p className="text-xs text-white/60">
                            Your wallet connection is encrypted and secure. We never store your private keys.
                          </p>
                        </motion.div>
                      </motion.div>
                    )}

                    {step === 'connecting' && (
                      <motion.div
                        key="connecting"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-center py-12"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mb-6"
                        >
                          <Loader2 className="w-12 h-12 text-blue-500 mx-auto" />
                        </motion.div>
                        
                        <div className="space-y-2">
                          <p className="text-white font-medium">Connecting to {selectedWallet}</p>
                          <p className="text-white/60 text-sm">Please check your wallet for connection request</p>
                        </div>
                        
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 3, ease: "easeInOut" }}
                          className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-6"
                        />
                      </motion.div>
                    )}

                    {step === 'success' && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-center py-12"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 10, stiffness: 200 }}
                          className="mb-6"
                        >
                          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        </motion.div>
                        
                        <div className="space-y-2">
                          <p className="text-white font-medium text-lg">Wallet Connected!</p>
                          <p className="text-white/60 text-sm">You can now start earning KILT rewards</p>
                        </div>
                        
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 }}
                          className="flex items-center justify-center space-x-2 mt-6 p-3 bg-green-500/10 rounded-lg"
                        >
                          <Sparkles className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-green-300">Ready to earn rewards!</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}