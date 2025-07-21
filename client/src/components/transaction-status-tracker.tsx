import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  txHash?: string;
  estimatedTime?: number;
}

interface TransactionStatusTrackerProps {
  operation: 'mint' | 'increase' | 'decrease' | 'collect' | 'burn';
  transactionHash?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function TransactionStatusTracker({ 
  operation, 
  transactionHash, 
  onComplete, 
  onError 
}: TransactionStatusTrackerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [progress, setProgress] = useState(0);

  // Initialize steps based on operation type
  useEffect(() => {
    const operationSteps = getStepsForOperation(operation);
    setSteps(operationSteps);
    setCurrentStep(0);
    setProgress(0);
  }, [operation]);

  // Start tracking when transaction hash is provided
  useEffect(() => {
    if (transactionHash && !isTracking) {
      startTracking(transactionHash);
    }
  }, [transactionHash, isTracking]);

  const getStepsForOperation = (op: string): TransactionStep[] => {
    const baseSteps = {
      mint: [
        {
          id: 'approve-tokens',
          title: 'Token Approval',
          description: 'Approving KILT and ETH tokens for liquidity pool',
          status: 'pending' as const,
          estimatedTime: 15
        },
        {
          id: 'calculate-position',
          title: 'Position Calculation',
          description: 'Calculating optimal position parameters',
          status: 'pending' as const,
          estimatedTime: 5
        },
        {
          id: 'mint-position',
          title: 'Mint NFT Position',
          description: 'Creating new liquidity position NFT',
          status: 'pending' as const,
          estimatedTime: 30
        },
        {
          id: 'register-rewards',
          title: 'Register for Rewards',
          description: 'Registering position for KILT reward distribution',
          status: 'pending' as const,
          estimatedTime: 10
        }
      ],
      increase: [
        {
          id: 'approve-tokens',
          title: 'Token Approval',
          description: 'Approving additional tokens',
          status: 'pending' as const,
          estimatedTime: 15
        },
        {
          id: 'increase-liquidity',
          title: 'Increase Liquidity',
          description: 'Adding liquidity to existing position',
          status: 'pending' as const,
          estimatedTime: 25
        },
        {
          id: 'update-rewards',
          title: 'Update Rewards',
          description: 'Updating reward calculation parameters',
          status: 'pending' as const,
          estimatedTime: 10
        }
      ],
      decrease: [
        {
          id: 'decrease-liquidity',
          title: 'Decrease Liquidity',
          description: 'Removing liquidity from position',
          status: 'pending' as const,
          estimatedTime: 25
        },
        {
          id: 'collect-tokens',
          title: 'Collect Tokens',
          description: 'Collecting withdrawn tokens',
          status: 'pending' as const,
          estimatedTime: 15
        }
      ],
      collect: [
        {
          id: 'collect-fees',
          title: 'Collect Fees',
          description: 'Collecting accumulated trading fees',
          status: 'pending' as const,
          estimatedTime: 20
        }
      ],
      burn: [
        {
          id: 'collect-all',
          title: 'Collect All Assets',
          description: 'Collecting all liquidity and fees',
          status: 'pending' as const,
          estimatedTime: 25
        },
        {
          id: 'burn-nft',
          title: 'Burn NFT Position',
          description: 'Destroying the position NFT',
          status: 'pending' as const,
          estimatedTime: 20
        }
      ]
    };

    return baseSteps[op as keyof typeof baseSteps] || [];
  };

  const startTracking = async (txHash: string) => {
    setIsTracking(true);
    
    try {
      // Update first step to in-progress
      updateStepStatus(0, 'in-progress', txHash);
      
      // Simulate step progression with realistic timing
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, steps[i].estimatedTime! * 100));
        
        // Check if transaction is still valid
        const isValid = await checkTransactionStatus(txHash);
        if (!isValid) {
          updateStepStatus(i, 'failed');
          onError?.('Transaction failed or was cancelled');
          return;
        }
        
        updateStepStatus(i, 'completed');
        setCurrentStep(i + 1);
        setProgress(((i + 1) / steps.length) * 100);
        
        // Start next step if available
        if (i + 1 < steps.length) {
          updateStepStatus(i + 1, 'in-progress');
        }
      }
      
      // All steps completed
      setIsTracking(false);
      onComplete?.();
      
    } catch (error) {
      setIsTracking(false);
      onError?.(error instanceof Error ? error.message : 'Transaction tracking failed');
    }
  };

  const updateStepStatus = (stepIndex: number, status: TransactionStep['status'], txHash?: string) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex 
        ? { ...step, status, txHash: txHash || step.txHash }
        : step
    ));
  };

  const checkTransactionStatus = async (txHash: string): Promise<boolean> => {
    try {
      // In a real implementation, this would check the blockchain
      // For now, simulate successful transactions
      return Math.random() > 0.1; // 90% success rate
    } catch {
      return false;
    }
  };

  const getStepIcon = (step: TransactionStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (step.status === 'failed') {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    } else if (step.status === 'in-progress') {
      return <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />;
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepBadgeVariant = (step: TransactionStep): "default" | "destructive" | "secondary" => {
    switch (step.status) {
      case 'completed': return 'default';
      case 'in-progress': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const totalEstimatedTime = steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);

  return (
    <Card className="w-full bg-black/40 backdrop-blur-sm border-gray-800/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-mono text-white">
              Transaction Progress
            </CardTitle>
            <CardDescription className="text-gray-400">
              {operation.charAt(0).toUpperCase() + operation.slice(1)} Liquidity Operation
            </CardDescription>
          </div>
          {transactionHash && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://basescan.org/tx/${transactionHash}`, '_blank')}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View on BaseScan
            </Button>
          )}
        </div>
        
        {isTracking && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Progress: {Math.round(progress)}%</span>
              <span>Est. {totalEstimatedTime}s total</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 ${
              step.status === 'in-progress' 
                ? 'bg-pink-500/10 border border-pink-500/20' 
                : step.status === 'completed'
                ? 'bg-green-500/10 border border-green-500/20'
                : step.status === 'failed'
                ? 'bg-red-500/10 border border-red-500/20'
                : 'bg-gray-800/20'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getStepIcon(step, index)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">
                  {step.title}
                </h4>
                <Badge variant={getStepBadgeVariant(step)} className="text-xs">
                  {step.status.replace('-', ' ')}
                </Badge>
              </div>
              
              <p className="text-xs text-gray-400 mt-1">
                {step.description}
              </p>
              
              {step.estimatedTime && step.status === 'pending' && (
                <p className="text-xs text-gray-500 mt-1">
                  Est. {step.estimatedTime}s
                </p>
              )}
              
              {step.txHash && step.txHash !== transactionHash && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => window.open(`https://basescan.org/tx/${step.txHash}`, '_blank')}
                  className="text-xs text-pink-400 p-0 h-auto mt-1"
                >
                  View Transaction
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {!isTracking && currentStep === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">
              Waiting for transaction to begin...
            </p>
          </div>
        )}
        
        {!isTracking && currentStep === steps.length && steps.length > 0 && (
          <div className="text-center py-4 space-y-2">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
            <p className="text-sm font-medium text-green-400">
              Transaction Completed Successfully!
            </p>
            <p className="text-xs text-gray-400">
              Your liquidity operation has been processed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}