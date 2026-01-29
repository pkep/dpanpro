import { useState, useEffect } from 'react';
import { TileLayer, useMapEvents } from 'react-leaflet';
import { TechnicianMarker } from './TechnicianMarker';
import { DestinationMarker } from './DestinationMarker';
import { TrackingRouteLine } from './TrackingRouteLine';

interface TechnicianPosition {
  latitude: number;
  longitude: number;
  firstName: string;
  lastName: string;
  updatedAt: Date;
}

interface ClientTrackingMapContentProps {
  technicianPosition: TechnicianPosition;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: string;
  centerOnTechnician: boolean;
}

export function ClientTrackingMapContent({
  technicianPosition,
  destinationLatitude,
  destinationLongitude,
  destinationAddress,
  centerOnTechnician,
}: ClientTrackingMapContentProps) {
  const [mapReady, setMapReady] = useState(false);

  // Use useMapEvents to detect when the map is ready
  useMapEvents({
    load: () => setMapReady(true),
  });

  // Set mapReady on mount since 'load' may have already fired
  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    );
  }

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <TrackingRouteLine
        technicianLat={technicianPosition.latitude}
        technicianLng={technicianPosition.longitude}
        destinationLat={destinationLatitude}
        destinationLng={destinationLongitude}
      />

      <TechnicianMarker
        latitude={technicianPosition.latitude}
        longitude={technicianPosition.longitude}
        firstName={technicianPosition.firstName}
        lastName={technicianPosition.lastName}
        lastUpdated={technicianPosition.updatedAt}
        centerOnTechnician={centerOnTechnician}
      />

      <DestinationMarker
        latitude={destinationLatitude}
        longitude={destinationLongitude}
        address={destinationAddress}
      />
    </>
  );
}
