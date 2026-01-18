import { useState } from 'react';
import { useProximityNotifications } from '@/hooks/useProximityNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, MapPin, Settings, Check, X, Loader2 } from 'lucide-react';

interface ProximitySettingsProps {
  onSettingsChange?: (enabled: boolean, threshold: number) => void;
}

export function ProximitySettings({ onSettingsChange }: ProximitySettingsProps) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(500);
  
  const { 
    isWatching, 
    notificationPermission, 
    requestPermission,
    interventionsCount,
  } = useProximityNotifications({
    enabled,
    thresholdMeters: threshold,
    cooldownMinutes: 15,
  });

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    onSettingsChange?.(value, threshold);
  };

  const handleThresholdChange = (value: number[]) => {
    setThreshold(value[0]);
    onSettingsChange?.(enabled, value[0]);
  };

  const getPermissionBadge = () => {
    switch (notificationPermission) {
      case 'granted':
        return (
          <Badge variant="default" className="bg-green-500">
            <Check className="h-3 w-3 mr-1" />
            Autorisées
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Bloquées
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Non configurées
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" />
          Notifications de proximité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="proximity-notifications" className="text-sm font-medium">
              Activer les alertes
            </Label>
            <p className="text-xs text-muted-foreground">
              Recevez une notification quand vous approchez d'une intervention
            </p>
          </div>
          <Switch
            id="proximity-notifications"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Status */}
        {enabled && (
          <div className="space-y-4">
            {/* Permission Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Notifications</span>
              <div className="flex items-center gap-2">
                {getPermissionBadge()}
                {notificationPermission === 'default' && (
                  <Button variant="outline" size="sm" onClick={requestPermission}>
                    Autoriser
                  </Button>
                )}
              </div>
            </div>

            {/* Tracking Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Suivi GPS</span>
              <Badge variant={isWatching ? 'default' : 'secondary'}>
                {isWatching ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Actif
                  </>
                ) : (
                  'Inactif'
                )}
              </Badge>
            </div>

            {/* Interventions Count */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Interventions surveillées</span>
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                {interventionsCount}
              </Badge>
            </div>

            {/* Threshold Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Distance d'alerte</Label>
                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                  {threshold} m
                </span>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={handleThresholdChange}
                min={100}
                max={2000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100 m</span>
                <span>2 km</span>
              </div>
            </div>

            {/* Warning if notifications denied */}
            {notificationPermission === 'denied' && (
              <Alert variant="destructive">
                <BellOff className="h-4 w-4" />
                <AlertDescription>
                  Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
