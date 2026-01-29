import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the map component to isolate Leaflet context
const ClientTrackingMap = lazy(() => import('./ClientTrackingMap').then(m => ({ default: m.ClientTrackingMap })));

interface LazyClientTrackingMapProps {
  interventionId: string;
  technicianId: string | null;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: string;
  interventionStatus: string;
  height?: string;
}

export function LazyClientTrackingMap(props: LazyClientTrackingMapProps) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="w-full" style={{ height: props.height || '350px' }} />
        <Skeleton className="h-16 w-full" />
      </div>
    }>
      <ClientTrackingMap {...props} />
    </Suspense>
  );
}
