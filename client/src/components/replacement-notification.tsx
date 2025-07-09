import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  DollarSign,
  CheckCircle,
  XCircle,
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ReplacementRequirements {
  slotsAvailable: boolean;
  availableSlots: number;
  minimumLiquidity?: number;
  rank100Requirements?: {
    currentLiquidity: number;
    daysActive: number;
    liquidityScore: number;
  };
  replacementStrategies?: {
    immediate: {
      minimumLiquidity: number;
      days: number;
      description: string;
    };
    monthly: {
      minimumLiquidity: number;
      days: number;
      description: string;
    };
    quarterly: {
      minimumLiquidity: number;
      days: number;
      description: string;
    };
  };
  message: string;
}

interface EligibilityCheck {
  eligible: boolean;
  rank?: number;
  shortfall?: number;
  message: string;
}

export function ReplacementNotification() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testLiquidity, setTestLiquidity] = useState('');
  const [testDays, setTestDays] = useState('30');
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityCheck | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Fetch replacement requirements
  const { data: requirements, isLoading } = useQuery<ReplacementRequirements>({
    queryKey: ['/api/replacement/requirements'],
    queryFn: async () => {
      const response = await fetch('/api/replacement/requirements');
      if (!response.ok) {
        throw new Error('Failed to fetch replacement requirements');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Check eligibility for specific liquidity amount
  const checkEligibility = async () => {
    if (!testLiquidity || parseFloat(testLiquidity) <= 0) {
      setEligibilityResult({
        eligible: false,
        message: 'Please enter a valid liquidity amount'
      });
      return;
    }

    setCheckingEligibility(true);
    try {
      const response = await fetch('/api/replacement/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liquidityAmount: parseFloat(testLiquidity),
          daysToWait: parseInt(testDays)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check eligibility');
      }

      const result = await response.json();
      setEligibilityResult(result);
    } catch (error) {
      setEligibilityResult({
        eligible: false,
        message: 'Error checking eligibility'
      });
    } finally {
      setCheckingEligibility(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border-yellow-500/20 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center animate-pulse">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Loading Top 100 status...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requirements) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border-yellow-500/20 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              {requirements.slotsAvailable ? (
                <CheckCircle className="h-5 w-5 text-white" />
              ) : (
                <AlertCircle className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white text-heading">
                {requirements.slotsAvailable ? 'Slots Available' : 'Top 100 Full'}
              </h3>
              <p className="text-white/60 text-xs text-body">
                {requirements.slotsAvailable ? 'Join the Top 100 now!' : 'Replacement mechanism active'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status Message */}
        <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white text-sm font-medium">
            {requirements.message}
          </p>
        </div>

        {/* Available Slots (if any) */}
        {requirements.slotsAvailable && (
          <div className="mb-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <h4 className="text-green-300 font-semibold">
                {requirements.availableSlots} Slots Available
              </h4>
            </div>
            <p className="text-green-200 text-sm">
              You can join the Top 100 with a minimum liquidity of ${requirements.minimumLiquidity || 100}. 
              Add liquidity now to secure your spot!
            </p>
          </div>
        )}

        {/* Replacement Strategies (if Top 100 is full) */}
        {!requirements.slotsAvailable && requirements.replacementStrategies && isExpanded && (
          <div className="mb-4 space-y-3">
            <h4 className="text-white font-semibold text-sm mb-3">Replacement Strategies</h4>
            
            <div className="grid gap-3">
              {Object.entries(requirements.replacementStrategies).map(([key, strategy]) => (
                <div key={key} className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-white/70" />
                      <span className="text-white font-medium capitalize">{key}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {strategy.days} days
                    </Badge>
                  </div>
                  <p className="text-white/60 text-xs mb-2">{strategy.description}</p>
                  <p className="text-white font-bold">
                    ${strategy.minimumLiquidity.toLocaleString()} liquidity needed
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eligibility Calculator */}
        {isExpanded && (
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center space-x-2 mb-3">
              <Calculator className="h-4 w-4 text-white/70" />
              <h4 className="text-white font-semibold text-sm">Eligibility Calculator</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/60 text-xs block mb-1">Liquidity Amount (USD)</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={testLiquidity}
                  onChange={(e) => setTestLiquidity(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs block mb-1">Days to Wait</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={testDays}
                  onChange={(e) => setTestDays(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            
            <Button
              onClick={checkEligibility}
              disabled={checkingEligibility}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white"
            >
              {checkingEligibility ? 'Checking...' : 'Check Eligibility'}
            </Button>
            
            {/* Eligibility Result */}
            {eligibilityResult && (
              <div className={`mt-3 p-3 rounded-xl border ${
                eligibilityResult.eligible 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {eligibilityResult.eligible ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`font-semibold text-sm ${
                    eligibilityResult.eligible ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {eligibilityResult.eligible ? 'Eligible!' : 'Not Eligible'}
                  </span>
                  {eligibilityResult.rank && (
                    <Badge variant="outline" className="text-xs">
                      Rank #{eligibilityResult.rank}
                    </Badge>
                  )}
                </div>
                <p className={`text-xs ${
                  eligibilityResult.eligible ? 'text-green-200' : 'text-red-200'
                }`}>
                  {eligibilityResult.message}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}