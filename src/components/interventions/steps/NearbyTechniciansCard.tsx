import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Star, Clock, Navigation } from 'lucide-react';
import { techniciansService, NearbyTechnician } from '@/services/technicians/technicians.service';
import { geocodingService } from '@/services/geocoding/geocoding.service';

interface NearbyTechniciansCardProps {
  address: string;
  postalCode: string;
  city: string;
}

export function NearbyTechniciansCard({ address, postalCode, city }: NearbyTechniciansCardProps) {
  const [technicians, setTechnicians] = useState<NearbyTechnician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyTechnicians = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Geocode the intervention address
        const geoResult = await geocodingService.geocodeAddress(address, city, postalCode);
        
        if (!geoResult) {
          setError('Impossible de géolocaliser l\'adresse');
          return;
        }

        // Get nearest technicians
        const nearest = await techniciansService.getNearestTechnicians(
          geoResult.latitude,
          geoResult.longitude,
          3
        );

        setTechnicians(nearest);
      } catch (err) {
        console.error('Error fetching nearby technicians:', err);
        setError('Erreur lors de la recherche des artisans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNearbyTechnicians();
  }, [address, postalCode, city]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
  };

  const formatTravelTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Artisans les plus proches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || technicians.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Artisans les plus proches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {error || 'Aucun artisan disponible dans votre zone pour le moment'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Artisans les plus proches
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Pour une intervention rapide, voici les 3 artisans les plus proches de votre localisation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {technicians.map((tech, index) => (
          <div
            key={tech.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{tech.companyName}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{tech.currentCity || 'Localisation inconnue'}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {tech.averageRating ? (
                    <>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">
                        {tech.averageRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({tech.totalRatings} avis)
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Nouveau</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-primary font-semibold">
                <Clock className="h-4 w-4" />
                <span>{formatTime(tech.estimatedArrivalTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Navigation className="h-3 w-3" />
                <span>{tech.distanceKm} km</span>
                <span>•</span>
                <span>{formatTravelTime(tech.estimatedTravelTimeMinutes)}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
