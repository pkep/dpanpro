import { useEffect, useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface TechnicianTrackingMarkerProps {
  latitude: number;
  longitude: number;
  firstName: string;
  lastName: string;
  lastUpdated?: Date;
  centerOnTechnician?: boolean;
}

// Create a custom pulsing car icon for the technician
const createTechnicianIcon = () => {
  return L.divIcon({
    className: 'technician-tracking-marker',
    html: `
      <div class="relative">
        <div class="absolute inset-0 bg-primary/30 rounded-full animate-ping"></div>
        <div class="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
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

export function TechnicianTrackingMarker({
  latitude,
  longitude,
  firstName,
  lastName,
  lastUpdated,
  centerOnTechnician = false,
}: TechnicianTrackingMarkerProps) {
  const map = useMap();
  const icon = useMemo(() => createTechnicianIcon(), []);

  // Smoothly pan to technician when position updates
  useEffect(() => {
    if (centerOnTechnician && latitude && longitude) {
      map.panTo([latitude, longitude], { animate: true, duration: 1 });
    }
  }, [latitude, longitude, centerOnTechnician, map]);

  return (
    <Marker position={[latitude, longitude]} icon={icon}>
      <Popup>
        <div className="text-center">
          <p className="font-medium">{firstName} {lastName}</p>
          <p className="text-xs text-muted-foreground">Technicien en déplacement</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Mis à jour: {lastUpdated.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
