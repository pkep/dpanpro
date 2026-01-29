import { useMemo } from 'react';
import { Polyline } from 'react-leaflet';

interface TrackingRouteLineProps {
  technicianLat: number;
  technicianLng: number;
  destinationLat: number;
  destinationLng: number;
}

export function TrackingRouteLine({
  technicianLat,
  technicianLng,
  destinationLat,
  destinationLng,
}: TrackingRouteLineProps) {
  const positions = useMemo(() => [
    [technicianLat, technicianLng] as [number, number],
    [destinationLat, destinationLng] as [number, number],
  ], [technicianLat, technicianLng, destinationLat, destinationLng]);

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: 'hsl(var(--primary))',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
      }}
    />
  );
}
