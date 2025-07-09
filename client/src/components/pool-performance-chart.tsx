import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  Zap,
  Clock,
  Target
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

interface PoolMetrics {
  timestamp: string;
  price: number;
  volume24h: number;
  tvl: number;
  fees24h: number;
  apr: number;
  liquidity: number;
  priceChange: number;
}

interface PoolPerformanceChartProps {
  poolAddress?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

export function PoolPerformanceChart({ 
  poolAddress = '0x...', 
  timeRange = '24h' 
}: PoolPerformanceChartProps) {
  const [activeChart, setActiveChart] = useState<'price' | 'volume' | 'tvl' | 'apr'>('price');
  const [animationKey, setAnimationKey] = useState(0);

  // Fetch pool performance data
  const { data: poolData, isLoading } = useQuery({
    queryKey: ['/api/pool-performance', poolAddress, timeRange],
    enabled: !!poolAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Generate mock data for demonstration
  const generateMockData = (points: number): PoolMetrics[] => {
    const now = Date.now();
    const interval = timeRange === '1h' ? 60000 : 
                    timeRange === '24h' ? 3600000 : 
                    timeRange === '7d' ? 86400000 : 
                    2592000000; // 30d
    
    return Array.from({ length: points }, (_, i) => {
      const timestamp = new Date(now - (points - i) * interval).toISOString();
      const basePrice = 0.016;
      const priceVariation = Math.sin(i * 0.1) * 0.002 + Math.random() * 0.001;
      const price = basePrice + priceVariation;
      
      return {
        timestamp,
        price: price,
        volume24h: 400 + Math.random() * 200,
        tvl: 125000 + Math.random() * 25000,
        fees24h: 50 + Math.random() * 30,
        apr: 45 + Math.random() * 10,
        liquidity: 98000 + Math.random() * 20000,
        priceChange: ((price - basePrice) / basePrice) * 100
      };
    });
  };

  const chartData = useMemo(() => {
    if (poolData) return poolData;
    return generateMockData(timeRange === '1h' ? 60 : timeRange === '24h' ? 48 : timeRange === '7d' ? 168 : 720);
  }, [poolData, timeRange]);

  const latestMetrics = chartData[chartData.length - 1];

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    if (timeRange === '1h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (timeRange === '24h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (timeRange === '7d') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'price') return `$${value.toFixed(6)}`;
    if (type === 'volume' || type === 'tvl' || type === 'fees') return `$${(value / 1000).toFixed(1)}K`;
    if (type === 'apr') return `${value.toFixed(1)}%`;
    return value.toFixed(2);
  };

  const getChartColor = (type: string) => {
    switch (type) {
      case 'price': return '#10b981';
      case 'volume': return '#3b82f6';
      case 'tvl': return '#8b5cf6';
      case 'apr': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'price': return <DollarSign className="h-4 w-4" />;
      case 'volume': return <BarChart3 className="h-4 w-4" />;
      case 'tvl': return <Target className="h-4 w-4" />;
      case 'apr': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const chartConfig = {
    price: { dataKey: 'price', name: 'Price', unit: '$' },
    volume: { dataKey: 'volume24h', name: 'Volume 24h', unit: '$' },
    tvl: { dataKey: 'tvl', name: 'TVL', unit: '$' },
    apr: { dataKey: 'apr', name: 'APR', unit: '%' }
  };

  const currentConfig = chartConfig[activeChart];

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [activeChart, timeRange]);

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10 rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white font-semibold">
            Pool Performance Analytics
          </CardTitle>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(chartConfig).map(([key, config]) => {
            const isActive = activeChart === key;
            const value = latestMetrics?.[config.dataKey as keyof PoolMetrics];
            const change = key === 'price' ? latestMetrics?.priceChange : Math.random() * 10 - 5;
            const isPositive = (change || 0) >= 0;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Object.keys(chartConfig).indexOf(key) * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-blue-500/30' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setActiveChart(key as keyof typeof chartTypes)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                        {getIcon(key)}
                      </div>
                      <div className={`flex items-center text-xs ${
                        isPositive ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {Math.abs(change || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-white/60 text-xs mb-1">{config.name}</div>
                    <div className="text-white font-bold text-lg tabular-nums">
                      {formatValue(value || 0, key)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-white/60" />
            <span className="text-white/60 text-sm">Time Range</span>
          </div>
          <div className="flex rounded-lg bg-white/5 border border-white/10 p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                className={`text-xs ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setAnimationKey(prev => prev + 1)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="h-80 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeChart}-${animationKey}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'volume' ? (
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatXAxis}
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatValue(value, activeChart)}
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value: number) => [formatValue(value, activeChart), currentConfig.name]}
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                    />
                    <Bar 
                      dataKey={currentConfig.dataKey} 
                      fill={getChartColor(activeChart)}
                      opacity={0.7}
                      radius={[2, 2, 0, 0]}
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`gradient-${activeChart}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getChartColor(activeChart)} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={getChartColor(activeChart)} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatXAxis}
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatValue(value, activeChart)}
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value: number) => [formatValue(value, activeChart), currentConfig.name]}
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={currentConfig.dataKey} 
                      stroke={getChartColor(activeChart)}
                      strokeWidth={2}
                      fill={`url(#gradient-${activeChart})`}
                      fillOpacity={1}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Performance Summary */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Current {currentConfig.name}</p>
              <p className="text-white font-bold text-2xl tabular-nums">
                {formatValue(latestMetrics?.[currentConfig.dataKey as keyof PoolMetrics] || 0, activeChart)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm">24h Change</p>
              <div className={`flex items-center text-lg font-semibold ${
                (latestMetrics?.priceChange || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {(latestMetrics?.priceChange || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(latestMetrics?.priceChange || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}