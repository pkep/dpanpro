import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { techniciansService } from '@/services/technicians/technicians.service';
import { calculateDistance, formatDistance } from '@/utils/geolocation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createTechnicianIcon = () => {
  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="position: relative;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50px;
          height: 50px;
          background-color: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          position: relative;
          background-color: #3b82f6;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        ">
          🚗
        </div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    className: 'destination-marker',
    html: `
      <div style="
        background-color: #22c55e;
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 16px;">🏠</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Auto-center map component
function AutoCenter({ technicianPosition, destinationPosition }: { 
  technicianPosition: [number, number] | null;
  destinationPosition: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (technicianPosition) {
      const bounds = L.latLngBounds([technicianPosition, destinationPosition]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(destinationPosition, 15);
    }
  }, [technicianPosition, destinationPosition, map]);

  return null;
}

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
  const [mapReady, setMapReady] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const destinationCoords: [number, number] = [destinationLatitude, destinationLongitude];
  const techCoords: [number, number] | null = technicianPosition 
    ? [technicianPosition.latitude, technicianPosition.longitude] 
    : null;

  // Calculate ETA dynamically
  const etaInfo = useMemo(() => {
    if (!technicianPosition) return null;

    const distanceMeters = calculateDistance(
      technicianPosition.latitude,
      technicianPosition.longitude,
      destinationLatitude,
      destinationLongitude
    );
    const distanceKm = distanceMeters / 1000;
    
    // Average speed estimation based on distance (city vs highway)
    const avgSpeedKmh = distanceKm < 5 ? 25 : distanceKm < 20 ? 35 : 50;
    const travelTimeMinutes = Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
    
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

      {/* Map */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={destinationCoords}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          whenReady={() => setMapReady(true)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapReady && <AutoCenter technicianPosition={techCoords} destinationPosition={destinationCoords} />}

          {/* Technician marker */}
          {mapReady && techCoords && (
            <>
              <Circle
                center={techCoords}
                radius={100}
                pathOptions={{ 
                  color: '#3b82f6', 
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
              <Marker position={techCoords} icon={createTechnicianIcon()}>
                <Popup>
                  <div className="p-2 text-center">
                    <p className="font-semibold">
                      👷 {technicianPosition?.firstName} {technicianPosition?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mis à jour : {format(technicianPosition?.updatedAt || new Date(), 'HH:mm:ss', { locale: fr })}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Destination marker */}
          {mapReady && (
            <Marker position={destinationCoords} icon={createDestinationIcon()}>
              <Popup>
                <div className="p-2">
                  <p className="font-semibold">🏠 Votre adresse</p>
                  <p className="text-sm text-muted-foreground">{destinationAddress}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route line */}
          {mapReady && techCoords && (
            <Polyline
              positions={[techCoords, destinationCoords]}
              pathOptions={{
                color: '#3b82f6',
                weight: 4,
                opacity: 0.7,
                dashArray: '12, 12',
              }}
            >
              <Tooltip permanent direction="center" className="distance-tooltip">
                <span className="font-semibold text-xs bg-background/95 px-2 py-1 rounded shadow-lg">
                  {etaInfo ? formatDistance(etaInfo.distanceMeters) : '...'}
                </span>
              </Tooltip>
            </Polyline>
          )}
        </MapContainer>
      </div>

      {/* Last update info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3" />
        Dernière mise à jour : {format(lastRefresh, 'HH:mm:ss', { locale: fr })}
      </div>
    </div>
  );
}
