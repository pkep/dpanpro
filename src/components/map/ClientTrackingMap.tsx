import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance, formatDistance } from '@/utils/geolocation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Navigation, 
  Clock, 
  MapPin, 
  Radio, 
  Car,
  User,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface TechnicianPosition {
  latitude: number;
  longitude: number;
  firstName: string;
  lastName: string;
  updatedAt: Date;
}

interface ClientTrackingMapProps {
  interventionId: string;
  technicianId: string | null;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: string;
  interventionStatus: string;
  height?: string;
}

export function ClientTrackingMap({
  interventionId,
  technicianId,
  destinationLatitude,
  destinationLongitude,
  destinationAddress,
  interventionStatus,
  height = '350px',
}: ClientTrackingMapProps) {
  const [technicianPosition, setTechnicianPosition] = useState<TechnicianPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Calculate ETA dynamically with realistic estimates
  const etaInfo = useMemo(() => {
    if (!technicianPosition) return null;

    const distanceMetersHaversine = calculateDistance(
      technicianPosition.latitude,
      technicianPosition.longitude,
      destinationLatitude,
      destinationLongitude
    );
    
    // Apply road detour factor (roads are typically 1.3-1.5x longer than straight line)
    const ROAD_DETOUR_FACTOR = 1.4;
    const distanceKm = (distanceMetersHaversine / 1000) * ROAD_DETOUR_FACTOR;
    const distanceMeters = distanceMetersHaversine * ROAD_DETOUR_FACTOR;
    
    // Realistic average speed in urban France: 25 km/h (traffic, lights, urban environment)
    const AVG_SPEED_KMH = 25;
    const travelTimeMinutes = Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
    
    const arrivalTime = new Date();
    arrivalTime.setMinutes(arrivalTime.getMinutes() + travelTimeMinutes);

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceMeters,
      travelTimeMinutes,
      arrivalTime,
    };
  }, [technicianPosition, destinationLatitude, destinationLongitude]);

  // Fetch initial technician position
  useEffect(() => {
    if (!technicianId) {
      setLoading(false);
      return;
    }

    const fetchTechnicianPosition = async () => {
      try {
        const { data: application, error } = await supabase
          .from('partner_applications')
          .select('latitude, longitude, user_id')
          .eq('user_id', technicianId)
          .single();

        if (error) throw error;

        if (application?.latitude && application?.longitude) {
          // Get technician name
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', technicianId)
            .single();

          setTechnicianPosition({
            latitude: application.latitude,
            longitude: application.longitude,
            firstName: userData?.first_name || 'Technicien',
            lastName: userData?.last_name || '',
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        console.error('Error fetching technician position:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicianPosition();
  }, [technicianId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!technicianId) return;

    const channel = supabase
      .channel(`technician-tracking-${technicianId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partner_applications',
          filter: `user_id=eq.${technicianId}`,
        },
        async (payload) => {
          const newData = payload.new as any;
          if (newData.latitude && newData.longitude) {
            // Fetch technician name if not already set
            let firstName = technicianPosition?.firstName || 'Technicien';
            let lastName = technicianPosition?.lastName || '';
            
            if (!technicianPosition) {
              const { data: userData } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', technicianId)
                .single();
              firstName = userData?.first_name || 'Technicien';
              lastName = userData?.last_name || '';
            }

            setTechnicianPosition({
              latitude: newData.latitude,
              longitude: newData.longitude,
              firstName,
              lastName,
              updatedAt: new Date(),
            });
            setLastRefresh(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [technicianId, technicianPosition]);

  // Determine if tracking should be active
  const isTrackingActive = ['assigned', 'on_route', 'in_progress'].includes(interventionStatus);

  // Open in Google Maps
  const openInGoogleMaps = () => {
    if (technicianPosition) {
      const url = `https://www.google.com/maps/dir/${technicianPosition.latitude},${technicianPosition.longitude}/${destinationLatitude},${destinationLongitude}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${destinationLatitude},${destinationLongitude}`;
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full" style={{ height }} />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!technicianId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun technicien assigné pour le moment</p>
          <p className="text-sm mt-2">Le suivi sera disponible une fois un technicien assigné</p>
        </CardContent>
      </Card>
    );
  }

  if (!isTrackingActive) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Le suivi en temps réel n'est pas actif</p>
          <p className="text-sm mt-2">
            {interventionStatus === 'completed' 
              ? 'L\'intervention est terminée'
              : 'En attente du départ du technicien'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ETA Banner */}
      {etaInfo && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                    <span className="font-medium">
                      {technicianPosition?.firstName} {technicianPosition?.lastName}
                    </span>
                    <Badge variant="secondary">En route</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    À {formatDistance(etaInfo.distanceMeters)} de votre adresse
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                  <Clock className="h-6 w-6" />
                  ~{etaInfo.travelTimeMinutes} min
                </div>
                <p className="text-sm text-muted-foreground">
                  Arrivée estimée : {format(etaInfo.arrivalTime, 'HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
            
            {/* Progress bar based on distance */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Technicien</span>
                <span>Votre adresse</span>
              </div>
              <Progress 
                value={Math.max(5, 100 - (etaInfo.distanceKm * 10))} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Static Map Placeholder */}
      <div 
        className="rounded-lg overflow-hidden border bg-muted/30 flex flex-col items-center justify-center" 
        style={{ height }}
      >
        <div className="text-center space-y-4 p-6">
          <div className="flex items-center justify-center gap-8">
            {technicianPosition && (
              <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-primary rounded-full flex items-center justify-center mb-2">
                  <Car className="h-6 w-6 text-primary-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Technicien</p>
                <p className="text-xs font-mono">
                  {technicianPosition.latitude.toFixed(4)}, {technicianPosition.longitude.toFixed(4)}
                </p>
              </div>
            )}
            
            {technicianPosition && (
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {etaInfo ? formatDistance(etaInfo.distanceMeters) : '...'}
                </span>
              </div>
            )}
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-2">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">Destination</p>
              <p className="text-xs font-mono">
                {destinationLatitude.toFixed(4)}, {destinationLongitude.toFixed(4)}
              </p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">{destinationAddress}</p>
        </div>
      </div>

      {/* Open in Google Maps button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={openInGoogleMaps}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Voir sur Google Maps
      </Button>

      {/* Last update info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3" />
        Dernière mise à jour : {format(lastRefresh, 'HH:mm:ss', { locale: fr })}
      </div>
    </div>
  );
}
