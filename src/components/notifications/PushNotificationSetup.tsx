import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, BellRing, Check, AlertCircle } from 'lucide-react';

interface PushNotificationSetupProps {
  compact?: boolean;
}

export function PushNotificationSetup({ compact = false }: PushNotificationSetupProps) {
  const { 
    isSupported, 
    permission, 
    isLoading,
    requestPermission,
  } = useFirebaseMessaging();

  if (isLoading) {
    return null;
  }

  if (!isSupported) {
    if (compact) return null;
    
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-muted-foreground">
          <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Les notifications push ne sont pas supportées par votre navigateur</p>
        </CardContent>
      </Card>
    );
  }

  if (permission === 'granted') {
    if (compact) {
      return (
        <Badge variant="outline" className="gap-1">
          <BellRing className="h-3 w-3 text-green-500" />
          Notifications actives
        </Badge>
      );
    }

    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Notifications activées</p>
              <p className="text-sm text-green-600">
                Vous recevrez des alertes pour les changements de statut
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permission === 'denied') {
    if (compact) {
      return (
        <Badge variant="outline" className="gap-1 border-destructive/50">
          <BellOff className="h-3 w-3 text-destructive" />
          Notifications bloquées
        </Badge>
      );
    }

    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Notifications bloquées</p>
              <p className="text-sm text-muted-foreground">
                Réactivez les notifications dans les paramètres de votre navigateur
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default permission state
  if (compact) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={requestPermission}
        className="gap-2"
      >
        <Bell className="h-4 w-4" />
        Activer les notifications
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications push
        </CardTitle>
        <CardDescription>
          Recevez des alertes en temps réel sur votre appareil
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Technicien assigné à votre demande
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Technicien en route vers votre adresse
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Intervention terminée
            </li>
          </ul>
          
          <Button onClick={requestPermission} className="w-full gap-2">
            <BellRing className="h-4 w-4" />
            Activer les notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
