import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { interventionsService } from '@/services/interventions/interventions.service';
import { geocodingService } from '@/services/geocoding/geocoding.service';
import type { Intervention, InterventionStatus, InterventionCategory } from '@/types/intervention.types';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Filter, RefreshCw, ExternalLink } from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons based on priority
const createCustomIcon = (priority: string, status: string) => {
  const colors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f97316',
    normal: '#3b82f6',
    low: '#22c55e',
  };

  const statusOpacity = status === 'completed' ? 0.5 : 1;
  const color = colors[priority] || colors.normal;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        opacity: ${statusOpacity};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to recenter map
function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

interface InterventionsMapProps {
  interventions?: Intervention[];
  height?: string;
  showFilters?: boolean;
  singleIntervention?: Intervention;
}

export function InterventionsMap({ 
  interventions: externalInterventions, 
  height = '500px',
  showFilters = true,
  singleIntervention,
}: InterventionsMapProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(!externalInterventions && !singleIntervention);
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.603354, 1.888334]); // Center of France
  const [mapZoom, setMapZoom] = useState(6);

  // Fetch interventions if not provided
  useEffect(() => {
    if (singleIntervention) {
      setInterventions([singleIntervention]);
      if (singleIntervention.latitude && singleIntervention.longitude) {
        setMapCenter([singleIntervention.latitude, singleIntervention.longitude]);
        setMapZoom(15);
      }
      return;
    }

    if (externalInterventions) {
      setInterventions(externalInterventions);
      return;
    }

    const fetchInterventions = async () => {
      try {
        setLoading(true);
        const data = await interventionsService.getInterventions({ isActive: true });
        setInterventions(data);
      } catch (error) {
        console.error('Error fetching interventions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterventions();
  }, [externalInterventions, singleIntervention]);

  // Geocode interventions without coordinates
  useEffect(() => {
    const geocodeInterventions = async () => {
      const toGeocode = interventions.filter(i => !i.latitude || !i.longitude);
      
      if (toGeocode.length === 0) return;

      let processed = 0;
      for (const intervention of toGeocode) {
        const result = await geocodingService.geocodeAddress(
          intervention.address,
          intervention.city,
          intervention.postalCode
        );

        if (result) {
          setInterventions(prev => 
            prev.map(i => 
              i.id === intervention.id 
                ? { ...i, latitude: result.latitude, longitude: result.longitude }
                : i
            )
          );
        }

        processed++;
        setGeocodingProgress(Math.round((processed / toGeocode.length) * 100));

        // Rate limiting - Nominatim requires 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
      setGeocodingProgress(0);
    };

    if (interventions.length > 0) {
      geocodeInterventions();
    }
  }, [interventions.length]);

  // Filter interventions
  const filteredInterventions = useMemo(() => {
    return interventions.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      return i.latitude && i.longitude;
    });
  }, [interventions, statusFilter, categoryFilter]);

  // Get badge variant based on status
  const getStatusVariant = (status: InterventionStatus) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
      case 'en_route':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await interventionsService.getInterventions({ isActive: true });
      setInterventions(data);
    } catch (error) {
      console.error('Error refreshing interventions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="assigned">Assigné</SelectItem>
                <SelectItem value="en_route">En route</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="locksmith">🔑 Serrurerie</SelectItem>
                <SelectItem value="plumbing">🔧 Plomberie</SelectItem>
                <SelectItem value="electricity">⚡ Électricité</SelectItem>
                <SelectItem value="glazing">🪟 Vitrerie</SelectItem>
                <SelectItem value="heating">🔥 Chauffage</SelectItem>
                <SelectItem value="aircon">❄️ Climatisation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          {geocodingProgress > 0 && (
            <div className="text-sm text-muted-foreground">
              Géolocalisation en cours... {geocodingProgress}%
            </div>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 inline mr-1" />
            {filteredInterventions.length} intervention(s) sur la carte
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={mapCenter} zoom={mapZoom} />
          
          {filteredInterventions.map((intervention) => (
            <Marker
              key={intervention.id}
              position={[intervention.latitude!, intervention.longitude!]}
              icon={createCustomIcon(intervention.priority, intervention.status)}
            >
              <Popup minWidth={280} maxWidth={350}>
                <div className="space-y-3 p-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {CATEGORY_ICONS[intervention.category as InterventionCategory]} {intervention.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_LABELS[intervention.category as InterventionCategory]}
                      </p>
                    </div>
                    <Badge variant={getPriorityVariant(intervention.priority)}>
                      {PRIORITY_LABELS[intervention.priority as keyof typeof PRIORITY_LABELS]}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{intervention.address}, {intervention.postalCode} {intervention.city}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusVariant(intervention.status as InterventionStatus)}>
                      {STATUS_LABELS[intervention.status as InterventionStatus]}
                    </Badge>
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/interventions/${intervention.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Détails
                      </Link>
                    </Button>
                  </div>

                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${intervention.latitude},${intervention.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Itinéraire Google Maps
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Légende</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span>Haute priorité</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span>Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Basse priorité</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
