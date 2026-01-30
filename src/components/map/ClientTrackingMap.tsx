import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useTechnicianRealtimePosition } from '@/hooks/useTechnicianRealtimePosition';
import { formatDistance, calculateDistance } from '@/utils/geolocation';
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

// Fix default icon issue with Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create a custom pulsing car icon for the technician
const createTechnicianIcon = () => {
  return L.divIcon({
    className: 'technician-tracking-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px;">
        <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.3); border-radius: 9999px; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 40px; height: 40px; background: hsl(221.2 83.2% 53.3%); border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 2px solid white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Create a custom destination icon
const createDestinationIcon = () => {
  return L.divIcon({
    className: 'destination-marker',
    html: `
      <div style="width: 40px; height: 40px; background: #22c55e; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 2px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

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
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const technicianMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Calculate ETA using heuristic (1.4x road factor, 25 km/h average)
  const etaInfo = technicianPosition ? (() => {
    const distanceMeters = calculateDistance(
      technicianPosition.latitude,
      technicianPosition.longitude,
      destinationLatitude,
      destinationLongitude
    );
    const ROAD_DETOUR_FACTOR = 1.4;
    const AVG_SPEED_KMH = 35;
    const distanceKm = (distanceMeters / 1000) * ROAD_DETOUR_FACTOR;
    const travelTimeMinutes = Math.round((distanceKm / AVG_SPEED_KMH) * 60);
    
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceMeters: distanceKm * 1000,
      travelTimeMinutes: Math.max(1, travelTimeMinutes),
      arrivalTime: new Date(Date.now() + travelTimeMinutes * 60 * 1000),
    };
  })() : null;

  // Determine if tracking should be active
  const isTrackingActive = ['assigned', 'on_route', 'in_progress'].includes(interventionStatus);

  // Initialize map - only depends on tracking state and destination, not technician position
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!isTrackingActive) return;

    // Cleanup existing map if present
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      technicianMarkerRef.current = null;
      destinationMarkerRef.current = null;
      routeLineRef.current = null;
    }

    const center: L.LatLngTuple = [destinationLatitude, destinationLongitude];
    const map = L.map(mapContainerRef.current).setView(center, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Add destination marker
    const destMarker = L.marker([destinationLatitude, destinationLongitude], {
      icon: createDestinationIcon(),
    }).addTo(map);
    destMarker.bindPopup(`<div style="text-align: center;"><p style="font-weight: 500;">Lieu d'intervention</p><p style="font-size: 0.75rem; color: #6b7280; max-width: 200px;">${destinationAddress}</p></div>`);
    destinationMarkerRef.current = destMarker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        technicianMarkerRef.current = null;
        destinationMarkerRef.current = null;
        routeLineRef.current = null;
      }
    };
  }, [isTrackingActive, destinationLatitude, destinationLongitude, destinationAddress]);

  // Update technician marker position
  useEffect(() => {
    if (!mapRef.current || !technicianPosition) return;

    const techPos: L.LatLngTuple = [technicianPosition.latitude, technicianPosition.longitude];
    const destPos: L.LatLngTuple = [destinationLatitude, destinationLongitude];

    // Update or create technician marker
    if (technicianMarkerRef.current) {
      technicianMarkerRef.current.setLatLng(techPos);
    } else {
      const techMarker = L.marker(techPos, {
        icon: createTechnicianIcon(),
      }).addTo(mapRef.current);
      techMarker.bindPopup(`<div style="text-align: center;"><p style="font-weight: 500;">${technicianPosition.firstName} ${technicianPosition.lastName}</p><p style="font-size: 0.75rem; color: #6b7280;">Technicien en déplacement</p></div>`);
      technicianMarkerRef.current = techMarker;
    }

    // Update or create route line
    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs([techPos, destPos]);
    } else {
      const routeLine = L.polyline([techPos, destPos], {
        color: 'hsl(221.2, 83.2%, 53.3%)',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(mapRef.current);
      routeLineRef.current = routeLine;
    }

    // Center on technician if enabled
    if (centerOnTechnician) {
      mapRef.current.panTo(techPos, { animate: true, duration: 1 });
    }
  }, [technicianPosition, destinationLatitude, destinationLongitude, centerOnTechnician]);

  // Generate Google Maps URL
  const googleMapsUrl = technicianPosition
    ? `https://www.google.com/maps/dir/${technicianPosition.latitude},${technicianPosition.longitude}/${destinationLatitude},${destinationLongitude}`
    : `https://www.google.com/maps/search/?api=1&query=${destinationLatitude},${destinationLongitude}`;

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
        <div 
          ref={mapContainerRef}
          className="rounded-lg overflow-hidden border" 
          style={{ height }}
        />
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
          asChild
        >
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Voir sur Google Maps
          </a>
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

      {/* Add pulse animation styles */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
