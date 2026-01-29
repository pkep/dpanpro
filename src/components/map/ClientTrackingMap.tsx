import { useMemo, useState } from 'react';
import { MapContainer } from 'react-leaflet';
import { useTechnicianRealtimePosition } from '@/hooks/useTechnicianRealtimePosition';
import { calculateDistance, formatDistance } from '@/utils/geolocation';
import { MapContent } from './MapContent';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Clock,
  MapPin,
  Radio,
  Car,
  User,
  RefreshCw,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

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
  const { position: technicianPosition, loading } = useTechnicianRealtimePosition(technicianId);
  const [centerOnTechnician, setCenterOnTechnician] = useState(false);

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

  // Calculate map bounds to fit both markers
  const mapCenter = useMemo(() => {
    if (technicianPosition) {
      return [
        (technicianPosition.latitude + destinationLatitude) / 2,
        (technicianPosition.longitude + destinationLongitude) / 2,
      ] as [number, number];
    }
    return [destinationLatitude, destinationLongitude] as [number, number];
  }, [technicianPosition, destinationLatitude, destinationLongitude]);

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
              ? "L'intervention est terminée"
              : 'En attente du départ du technicien'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ETA Banner */}
      {etaInfo && technicianPosition && (
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
                      {technicianPosition.firstName} {technicianPosition.lastName}
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
                value={Math.max(5, 100 - etaInfo.distanceKm * 10)}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Map */}
      {technicianPosition ? (
        <div className="rounded-lg overflow-hidden border" style={{ height }}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <MapContent
              technicianPosition={technicianPosition}
              destinationLatitude={destinationLatitude}
              destinationLongitude={destinationLongitude}
              destinationAddress={destinationAddress}
              centerOnTechnician={centerOnTechnician}
            />
          </MapContainer>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden border bg-muted/30 flex flex-col items-center justify-center"
          style={{ height }}
        >
          <div className="text-center space-y-4 p-6">
            <Navigation className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Position du technicien non disponible</p>
            <p className="text-sm text-muted-foreground">
              La carte s'affichera dès que le technicien aura partagé sa position
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={openInGoogleMaps}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Voir sur Google Maps
        </Button>
        {technicianPosition && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCenterOnTechnician((prev) => !prev)}
          >
            <Car className="h-4 w-4 mr-2" />
            {centerOnTechnician ? 'Arrêter le suivi' : 'Suivre le véhicule'}
          </Button>
        )}
      </div>

      {/* Last update info */}
      {technicianPosition && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          Dernière mise à jour : {format(technicianPosition.updatedAt, 'HH:mm:ss', { locale: fr })}
        </div>
      )}
    </div>
  );
}
