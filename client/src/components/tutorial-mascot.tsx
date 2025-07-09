import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Wallet, Shield, Coins, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/wallet-context';

// Cute mascot component - KILT Dragon
const KiltDragon = ({ mood = 'happy', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const colors = {
    happy: 'fill-emerald-400',
    excited: 'fill-yellow-400',
    thinking: 'fill-blue-400',
    proud: 'fill-purple-400'
  };

  return (
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        rotate: mood === 'excited' ? [0, 5, -5, 0] : [0, 2, -2, 0]
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={`${sizeClasses[size]} flex-shrink-0`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Dragon body */}
        <circle cx="50" cy="55" r="25" className={colors[mood]} />
        
        {/* Dragon head */}
        <circle cx="50" cy="35" r="18" className={colors[mood]} />
        
        {/* Eyes */}
        <circle cx="45" cy="30" r="3" className="fill-white" />
        <circle cx="55" cy="30" r="3" className="fill-white" />
        <circle cx="45" cy="30" r="1.5" className="fill-black" />
        <circle cx="55" cy="30" r="1.5" className="fill-black" />
        
        {/* Smile */}
        <path d="M 42 38 Q 50 42 58 38" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* Wings */}
        <ellipse cx="35" cy="50" rx="8" ry="15" className={`${colors[mood]} opacity-80`} transform="rotate(-20 35 50)" />
        <ellipse cx="65" cy="50" rx="8" ry="15" className={`${colors[mood]} opacity-80`} transform="rotate(20 65 50)" />
        
        {/* Horns */}
        <path d="M 45 18 L 47 25 L 43 25 Z" className="fill-orange-400" />
        <path d="M 55 18 L 57 25 L 53 25 Z" className="fill-orange-400" />
        
        {/* Sparkles around dragon */}
        <motion.circle
          cx="25"
          cy="25"
          r="2"
          className="fill-yellow-300"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        />
        <motion.circle
          cx="75"
          cy="30"
          r="1.5"
          className="fill-yellow-300"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        />
        <motion.circle
          cx="80"
          cy="60"
          r="1"
          className="fill-yellow-300"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
        />
      </svg>
    </motion.div>
  );
};

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  icon: React.ComponentType<{ className?: string }>;
  mascotMood: 'happy' | 'excited' | 'thinking' | 'proud';
  interactive?: boolean;
  action?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to KILT!',
    content: 'Hi there! I\'m your friendly KILT Dragon 🐉. I\'m here to help you connect your wallet and start earning rewards in the KILT Liquidity Program. Ready for an adventure?',
    icon: Wallet,
    mascotMood: 'happy'
  },
  {
    id: 'what-is-wallet',
    title: 'What is a Crypto Wallet?',
    content: 'Think of a crypto wallet as your digital wallet that holds your cryptocurrencies like KILT and ETH. It\'s like having a magic pouch that keeps your digital coins safe and lets you use them on the blockchain!',
    icon: Shield,
    mascotMood: 'thinking'
  },
  {
    id: 'metamask-intro',
    title: 'Meet MetaMask',
    content: 'MetaMask is like your trusty sidekick for the blockchain world! It\'s a browser extension that acts as your wallet, letting you interact with decentralized apps like this one. It\'s free and super secure!',
    icon: Zap,
    mascotMood: 'excited'
  },
  {
    id: 'base-network',
    title: 'Base Network Magic',
    content: 'We\'re using the Base network - it\'s a fast and affordable blockchain that makes transactions quick and cheap. Think of it as a super-highway for your crypto transactions!',
    icon: Coins,
    mascotMood: 'proud'
  },
  {
    id: 'connect-wallet',
    title: 'Let\'s Connect!',
    content: 'Now comes the fun part! Click the "Connect Wallet" button and choose MetaMask. Your browser will open MetaMask, and you\'ll approve the connection. Don\'t worry - this is completely safe!',
    icon: Wallet,
    mascotMood: 'excited',
    interactive: true,
    action: 'connect'
  },
  {
    id: 'success',
    title: 'You\'re All Set!',
    content: 'Amazing! Your wallet is now connected and you\'re ready to start earning rewards. Head over to the "Add Liquidity" tab to create your first position and start earning up to 66% APR!',
    icon: Coins,
    mascotMood: 'proud'
  }
];

interface TutorialMascotProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectWallet?: () => void;
}

export function TutorialMascot({ isOpen, onClose, onConnectWallet }: TutorialMascotProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { connect, isConnected } = useWallet();

  const currentStepData = tutorialSteps[currentStep];

  // Auto-advance to next step when wallet is connected
  useEffect(() => {
    if (isConnected && currentStepData.action === 'connect') {
      setTimeout(() => {
        if (currentStep < tutorialSteps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          setIsCompleted(true);
        }
      }, 1500);
    }
  }, [isConnected, currentStepData.action, currentStep]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = async () => {
    if (currentStepData.action === 'connect') {
      try {
        await connect();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const handleComplete = () => {
    localStorage.setItem('kilt-tutorial-completed', 'true');
    onClose();
  };

  // Success completion screen
  if (isCompleted) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-full max-w-2xl"
          >
            <Card className="cluely-card border-emerald-500/30 bg-black/90 backdrop-blur-xl">
              <CardContent className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                  <KiltDragon mood="proud" size="xl" />
                </div>
                
                <div className="space-y-4">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-heading text-white"
                  >
                    🎉 Congratulations!
                  </motion.h2>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/80 text-lg"
                  >
                    You've successfully connected your wallet and you're ready to start earning rewards in the KILT Liquidity Program!
                  </motion.p>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4 rounded-lg border border-emerald-500/20"
                  >
                    <p className="text-white/70 text-sm">
                      🚀 Next steps: Add liquidity to the KILT/ETH pool and watch your rewards grow!
                    </p>
                  </motion.div>
                </div>
                
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Trading!
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative w-full max-w-2xl"
        >
          <Card className="cluely-card border-emerald-500/30 bg-black/90 backdrop-blur-xl">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-4 mt-4">
                <KiltDragon mood={currentStepData.mascotMood} size="xl" />
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-left"
                >
                  <CardTitle className="text-white font-heading flex items-center gap-2">
                    <currentStepData.icon className="h-5 w-5 text-emerald-400" />
                    {currentStepData.title}
                  </CardTitle>
                </motion.div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4 rounded-lg border border-emerald-500/20">
                  <p className="text-white/90 leading-relaxed">
                    {currentStepData.content}
                  </p>
                </div>
              </motion.div>

              {/* Interactive Action Button */}
              {currentStepData.interactive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-center"
                >
                  {isConnected ? (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Wallet className="h-5 w-5" />
                      <span className="font-semibold">Wallet Connected! 🎉</span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAction}
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Wallet className="h-5 w-5 mr-2" />
                      Connect Wallet
                    </Button>
                  )}
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="text-white/60 border-white/20 hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {tutorialSteps.map((_, index) => (
                    <motion.div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep ? 'bg-emerald-400' : 'bg-white/20'
                      }`}
                      animate={index === currentStep ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>

                <Button
                  onClick={currentStep === tutorialSteps.length - 1 ? handleComplete : handleNext}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Tutorial trigger component
export function TutorialTrigger() {
  const [showTutorial, setShowTutorial] = useState(false);
  const { isConnected } = useWallet();

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('kilt-tutorial-completed');
    if (!tutorialCompleted && !isConnected) {
      // Show tutorial after a short delay for first-time users who aren't connected
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenTutorial}
        className="text-white/60 border-white/20 hover:bg-white/10 hover:text-white hover:border-emerald-400/50 transition-all duration-300"
      >
        <KiltDragon size="sm" mood="happy" />
        <span className="ml-2">Need Help?</span>
      </Button>

      <TutorialMascot
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </>
  );
}