import { useEffect, useMemo, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface TechnicianMarkerProps {
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
      <div style="position: relative; width: 40px; height: 40px;">
        <div style="position: absolute; inset: 0; background: rgba(var(--primary-rgb, 59, 130, 246), 0.3); border-radius: 9999px; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 40px; height: 40px; background: hsl(var(--primary)); border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 2px solid white;">
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

export function TechnicianMarker({
  latitude,
  longitude,
  firstName,
  lastName,
  lastUpdated,
  centerOnTechnician = false,
}: TechnicianMarkerProps) {
  const map = useMap();
  const icon = useMemo(() => createTechnicianIcon(), []);
  const markerRef = useRef<L.Marker>(null);

  // Smoothly pan to technician when position updates
  useEffect(() => {
    if (centerOnTechnician && latitude && longitude && map) {
      map.panTo([latitude, longitude], { animate: true, duration: 1 });
    }
  }, [latitude, longitude, centerOnTechnician, map]);

  if (!latitude || !longitude) {
    return null;
  }

  return (
    <Marker ref={markerRef} position={[latitude, longitude]} icon={icon}>
      <Popup>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 500 }}>{firstName} {lastName}</p>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Technicien en déplacement</p>
          {lastUpdated && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Mis à jour: {lastUpdated.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
