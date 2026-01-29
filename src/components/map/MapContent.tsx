import { TileLayer } from 'react-leaflet';
import { TechnicianTrackingMarker } from './TechnicianTrackingMarker';
import { DestinationMarker } from './DestinationMarker';
import { TrackingRouteLine } from './TrackingRouteLine';

interface MapContentProps {
  technicianPosition: {
    latitude: number;
    longitude: number;
    firstName: string;
    lastName: string;
    updatedAt: Date;
  };
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: string;
  centerOnTechnician: boolean;
}

export function MapContent({
  technicianPosition,
  destinationLatitude,
  destinationLongitude,
  destinationAddress,
  centerOnTechnician,
}: MapContentProps) {
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

      <TechnicianTrackingMarker
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
