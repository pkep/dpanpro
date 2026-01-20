import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodingService } from '@/services/geocoding/geocoding.service';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const createLocationIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #3b82f6;
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

interface SingleLocationMapProps {
  address: string;
  city: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  height?: string;
  title?: string;
}

export function SingleLocationMap({
  address,
  city,
  postalCode,
  latitude: initialLat,
  longitude: initialLng,
  height = '300px',
  title,
}: SingleLocationMapProps) {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null,
  );
  const [loading, setLoading] = useState(!initialLat || !initialLng);
  const [error, setError] = useState<string | null>(null);

  const markerIcon = useMemo(() => createLocationIcon(), []);

  useEffect(() => {
    if (initialLat && initialLng) {
      setCoordinates([initialLat, initialLng]);
      setLoading(false);
      return;
    }

    const geocode = async () => {
      setLoading(true);
      setError(null);

      const result = await geocodingService.geocodeAddress(address, city, postalCode);

      if (result) {
        setCoordinates([result.latitude, result.longitude]);
      } else {
        setError('Impossible de géolocaliser cette adresse');
      }

      setLoading(false);
    };

    geocode();
  }, [address, city, postalCode, initialLat, initialLng]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/50" style={{ height }}>
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Géolocalisation en cours...</p>
        </div>
      </div>
    );
  }

  if (error || !coordinates) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/50" style={{ height }}>
        <div className="text-center space-y-2 p-4">
          <MapPin className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error || 'Localisation non disponible'}</p>
          <p className="text-xs text-muted-foreground">
            {address}, {postalCode} {city}
          </p>
        </div>
      </div>
    );
  }

  const fullAddress = `${address}, ${postalCode} ${city}`;

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center" style={{ height }}>
        <div className="text-center space-y-2 p-4">
          <MapPin className="h-8 w-8 mx-auto text-primary" />
          {title && <h3 className="font-semibold">{title}</h3>}
          <p className="text-sm text-muted-foreground">{fullAddress}</p>
          <p className="text-xs text-muted-foreground">
            Lat: {coordinates[0].toFixed(6)}, Lng: {coordinates[1].toFixed(6)}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates[0]},${coordinates[1]}`;
          window.open(url, '_blank');
        }}
      >
        <Navigation className="h-4 w-4 mr-2" />
        Ouvrir dans Google Maps
      </Button>
    </div>
  );
}
