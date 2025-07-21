import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, TrendingUp, DollarSign, X, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface PositionAlert {
  id: string;
  type: 'out-of-range' | 'high-fees' | 'low-liquidity' | 'price-movement';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  positionId: string;
  nftTokenId: string;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired?: {
    type: 'rebalance' | 'collect' | 'monitor';
    description: string;
  };
}

interface NotificationSettings {
  outOfRangeAlerts: boolean;
  feeThreshold: number; // USD amount
  priceMovementThreshold: number; // percentage
  lowLiquidityThreshold: number; // USD amount
  enablePushNotifications: boolean;
  enableSound: boolean;
}

interface PositionNotificationsProps {
  userAddress?: string;
  positions?: any[];
}

export function PositionNotifications({ userAddress, positions = [] }: PositionNotificationsProps) {
  const [alerts, setAlerts] = useState<PositionAlert[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    outOfRangeAlerts: true,
    feeThreshold: 10, // $10 in fees
    priceMovementThreshold: 5, // 5% price movement
    lowLiquidityThreshold: 100, // $100 minimum liquidity
    enablePushNotifications: true,
    enableSound: false
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { toast } = useToast();

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('position-notification-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('position-notification-settings', JSON.stringify(settings));
  }, [settings]);

  // Start monitoring when user connects
  useEffect(() => {
    if (userAddress && positions.length > 0) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  }, [userAddress, positions.length]);

  // Monitor positions for alerts
  useEffect(() => {
    if (!isMonitoring || positions.length === 0) return;

    const interval = setInterval(() => {
      checkPositionsForAlerts();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isMonitoring, positions, settings]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    toast({
      title: "Position Monitoring Active",
      description: "We'll alert you when your positions need attention",
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  const checkPositionsForAlerts = () => {
    positions.forEach(position => {
      // Check if position is out of range
      if (settings.outOfRangeAlerts && position.isOutOfRange) {
        createAlert({
          type: 'out-of-range',
          title: 'Position Out of Range',
          message: `Position #${position.nftTokenId} is no longer earning fees`,
          severity: 'high',
          positionId: position.id,
          nftTokenId: position.nftTokenId,
          actionRequired: {
            type: 'rebalance',
            description: 'Consider rebalancing to current price range'
          }
        });
      }

      // Check for high accumulated fees
      if (position.feesEarned && parseFloat(position.feesEarned) >= settings.feeThreshold) {
        createAlert({
          type: 'high-fees',
          title: 'High Fees Accumulated',
          message: `Position #${position.nftTokenId} has $${position.feesEarned} in uncollected fees`,
          severity: 'medium',
          positionId: position.id,
          nftTokenId: position.nftTokenId,
          actionRequired: {
            type: 'collect',
            description: 'Consider collecting fees to compound returns'
          }
        });
      }

      // Check for low liquidity
      if (position.currentValueUSD && parseFloat(position.currentValueUSD) < settings.lowLiquidityThreshold) {
        createAlert({
          type: 'low-liquidity',
          title: 'Low Liquidity Warning',
          message: `Position #${position.nftTokenId} has only $${position.currentValueUSD} in liquidity`,
          severity: 'low',
          positionId: position.id,
          nftTokenId: position.nftTokenId,
          actionRequired: {
            type: 'monitor',
            description: 'Monitor position performance or consider adding liquidity'
          }
        });
      }
    });
  };

  const createAlert = (alertData: Omit<PositionAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    // Check if similar alert already exists
    const existingAlert = alerts.find(
      alert => 
        alert.type === alertData.type && 
        alert.nftTokenId === alertData.nftTokenId &&
        !alert.acknowledged
    );

    if (existingAlert) return; // Don't create duplicate alerts

    const newAlert: PositionAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    };

    setAlerts(prev => [newAlert, ...prev]);

    // Show toast notification
    toast({
      title: newAlert.title,
      description: newAlert.message,
      variant: newAlert.severity === 'critical' ? 'destructive' : 'default',
    });

    // Play sound if enabled
    if (settings.enableSound) {
      playNotificationSound(newAlert.severity);
    }

    // Request push notification permission and send
    if (settings.enablePushNotifications) {
      requestAndSendPushNotification(newAlert);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const playNotificationSound = (severity: string) => {
    // Create different sounds for different severities
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different severities
    const frequencies = {
      low: 400,
      medium: 600,
      high: 800,
      critical: 1000
    };

    oscillator.frequency.setValueAtTime(frequencies[severity as keyof typeof frequencies], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const requestAndSendPushNotification = async (alert: PositionAlert) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.id
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out-of-range': return <AlertTriangle className="w-4 h-4" />;
      case 'high-fees': return <DollarSign className="w-4 h-4" />;
      case 'low-liquidity': return <TrendingUp className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  return (
    <Card className="w-full bg-black/40 backdrop-blur-sm border-gray-800/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-pink-400" />
            <CardTitle className="text-lg font-mono text-white">
              Position Alerts
            </CardTitle>
            {unacknowledgedAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unacknowledgedAlerts.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isMonitoring ? "default" : "secondary"} 
              className="text-xs"
            >
              {isMonitoring ? "Monitoring" : "Inactive"}
            </Badge>
          </div>
        </div>
        
        <CardDescription className="text-gray-400">
          Real-time notifications for your liquidity positions
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/40">
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4 mt-4">
            {unacknowledgedAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No active alerts</p>
                <p className="text-xs text-gray-500 mt-1">
                  We'll notify you when your positions need attention
                </p>
              </div>
            ) : (
              unacknowledgedAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-all duration-300 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-gray-300 mt-1">
                          {alert.message}
                        </p>
                        {alert.actionRequired && (
                          <p className="text-xs text-pink-400 mt-2">
                            Recommended: {alert.actionRequired.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        Acknowledge
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-xs px-1 py-1 h-auto"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">
                    Out of Range Alerts
                  </label>
                  <p className="text-xs text-gray-400">
                    Notify when positions stop earning fees
                  </p>
                </div>
                <Switch
                  checked={settings.outOfRangeAlerts}
                  onCheckedChange={(checked: boolean) => 
                    setSettings(prev => ({ ...prev, outOfRangeAlerts: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  High Fees Threshold: ${settings.feeThreshold}
                </label>
                <Slider
                  value={[settings.feeThreshold]}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, feeThreshold: value[0] }))
                  }
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-400">
                  Alert when uncollected fees exceed this amount
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Price Movement Threshold: {settings.priceMovementThreshold}%
                </label>
                <Slider
                  value={[settings.priceMovementThreshold]}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, priceMovementThreshold: value[0] }))
                  }
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-400">
                  Alert on significant price movements
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Low Liquidity Threshold: ${settings.lowLiquidityThreshold}
                </label>
                <Slider
                  value={[settings.lowLiquidityThreshold]}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, lowLiquidityThreshold: value[0] }))
                  }
                  max={1000}
                  min={10}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-gray-400">
                  Alert when position value falls below this amount
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">
                    Push Notifications
                  </label>
                  <p className="text-xs text-gray-400">
                    Browser notifications for alerts
                  </p>
                </div>
                <Switch
                  checked={settings.enablePushNotifications}
                  onCheckedChange={(checked: boolean) => 
                    setSettings(prev => ({ ...prev, enablePushNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">
                    Sound Alerts
                  </label>
                  <p className="text-xs text-gray-400">
                    Audio notifications for alerts
                  </p>
                </div>
                <Switch
                  checked={settings.enableSound}
                  onCheckedChange={(checked: boolean) => 
                    setSettings(prev => ({ ...prev, enableSound: checked }))
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}