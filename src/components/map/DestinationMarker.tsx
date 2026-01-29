import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface DestinationMarkerProps {
  latitude: number;
  longitude: number;
  address: string;
}

// Create a custom destination icon
const createDestinationIcon = () => {
  return L.divIcon({
    className: 'destination-marker',
    html: `
      <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
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

export function DestinationMarker({
  latitude,
  longitude,
  address,
}: DestinationMarkerProps) {
  const icon = useMemo(() => createDestinationIcon(), []);

  return (
    <Marker position={[latitude, longitude]} icon={icon}>
      <Popup>
        <div className="text-center">
          <p className="font-medium">Lieu d'intervention</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">{address}</p>
        </div>
      </Popup>
    </Marker>
  );
}
