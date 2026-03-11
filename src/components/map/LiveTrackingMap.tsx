import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline, Tooltip, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTechnicianTracking, TechnicianLocation } from '@/hooks/useTechnicianTracking';
import { interventionsService } from '@/services/supabase/interventions.service';
import { geocodingService } from '@/services/components/geocoding/geocoding.service';
import { calculateDistance, formatDistance } from '@/utils/geolocation';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  MapPin, 
  Navigation, 
  RefreshCw, 
  ExternalLink, 
  User, 
  Locate,
  AlertCircle,
  Radio,
  Route,
  Search,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for technicians
const createTechnicianIcon = (_isCurrentUser: boolean = false) => {
  const color = '#22c55e';
  const pulseColor = 'rgba(34, 197, 94, 0.4)';
  
  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="position: relative;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background-color: ${pulseColor};
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          position: relative;
          background-color: ${color};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">
          👷
        </div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

// Custom icons for interventions
const createInterventionIcon = (priority: string) => {
  const colors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f97316',
    normal: '#6366f1',
    low: '#22c55e',
  };
  const color = colors[priority] || colors.normal;

  return L.divIcon({
    className: 'intervention-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 12px;">🔧</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// Recenter map component
function RecenterControl({ position }: { position: [number, number] | null }) {
  const map = useMap();
  
  const handleRecenter = () => {
    if (position) {
      map.setView(position, 15);
    }
  };

  return position ? (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control">
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleRecenter}
          className="shadow-md"
        >
          <Locate className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ) : null;
}

// Fly to a location on the map
function FlyToLocation({ position, zoom }: { position: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom, { duration: 1.5 });
    }
  }, [position, zoom, map]);
  return null;
}

// Display city boundary polygon
function CityBoundary({ geoJson }: { geoJson: any | null }) {
  if (!geoJson) return null;
  return (
    <GeoJSON
      key={JSON.stringify(geoJson).slice(0, 100)}
      data={geoJson}
      style={{
        color: 'hsl(var(--primary))',
        weight: 3,
        fillOpacity: 0.08,
        fillColor: 'hsl(var(--primary))',
        dashArray: '6, 4',
      }}
    />
  );
}

// Search result type from adresse.data.gouv.fr
interface AddressSearchResult {
  label: string;
  lat: number;
  lng: number;
  type: string; // housenumber, street, municipality, locality
}

// Address search bar component
function MapSearchBar({ onSelect }: { onSelect: (result: AddressSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchAddress = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
      );
      const data = await res.json();
      const mapped: AddressSearchResult[] = (data.features || []).map((f: any) => ({
        label: f.properties.label,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        type: f.properties.type,
      }));
      setResults(mapped);
      setIsOpen(mapped.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(value), 300);
  };

  const handleSelect = (result: AddressSearchResult) => {
    setQuery(result.label);
    setIsOpen(false);
    onSelect(result);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Rechercher une adresse, ville, département..."
          className="pl-9 pr-8"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
            >
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface InterventionWithDistance extends Intervention {
  distance?: number;
}

interface LiveTrackingMapProps {
  height?: string;
  showInterventions?: boolean;
  showDistanceLines?: boolean;
}

export function LiveTrackingMap({ 
  height = '600px',
  showInterventions = true,
  showDistanceLines = true,
}: LiveTrackingMapProps) {
  const { user } = useAuth();
  const [enableTracking, setEnableTracking] = useState(false);
  const [showLines, setShowLines] = useState(showDistanceLines);
  const { 
    technicians, 
    myLocation, 
    trackingError, 
    isTracking 
  } = useTechnicianTracking(enableTracking);
  
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.603354, 1.888334]);
  const [mapReady, setMapReady] = useState(false);
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [showUrgent, setShowUrgent] = useState(true);
  const [showHigh, setShowHigh] = useState(true);
  const [showNormal, setShowNormal] = useState(true);
  const [searchTarget, setSearchTarget] = useState<[number, number] | null>(null);
  const [searchZoom, setSearchZoom] = useState(14);

  // Fetch active interventions
  useEffect(() => {
    if (!showInterventions) {
      setLoading(false);
      return;
    }

    const fetchInterventions = async () => {
      try {
        const data = await interventionsService.getInterventions({ 
          isActive: true,
        });
        // Filter to only show non-completed interventions
        const active = data.filter(i => !['completed', 'cancelled'].includes(i.status));
        setInterventions(active);
      } catch (error) {
        console.error('Error fetching interventions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterventions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchInterventions, 30000);
    return () => clearInterval(interval);
  }, [showInterventions]);

  // Geocode interventions without coordinates
  useEffect(() => {
    const geocodeInterventions = async () => {
      const toGeocode = interventions.filter(i => !i.latitude || !i.longitude);
      
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

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    };

    if (interventions.length > 0) {
      geocodeInterventions();
    }
  }, [interventions.length]);

  // Center map on current user's location
  useEffect(() => {
    if (myLocation) {
      setMapCenter([myLocation.coords.latitude, myLocation.coords.longitude]);
    }
  }, [myLocation?.coords.latitude, myLocation?.coords.longitude]);

  const myPosition: [number, number] | null = myLocation 
    ? [myLocation.coords.latitude, myLocation.coords.longitude] 
    : null;

  // Filter interventions with coordinates and calculate distances
  const interventionsWithCoords = useMemo((): InterventionWithDistance[] => {
    const filtered = interventions.filter(i => i.latitude && i.longitude);
    
    if (!myPosition) return filtered;
    
    return filtered.map(intervention => ({
      ...intervention,
      distance: calculateDistance(
        myPosition[0],
        myPosition[1],
        intervention.latitude!,
        intervention.longitude!
      ),
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [interventions, myPosition]);

  // Get interventions assigned to current user
  const myAssignedInterventions = useMemo(() => 
    interventionsWithCoords.filter(i => i.technicianId === user?.id),
    [interventionsWithCoords, user?.id]
  );

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <MapSearchBar onSelect={(result) => {
        const zoom = result.type === 'municipality' ? 13 : result.type === 'street' ? 15 : 16;
        setSearchTarget([result.lat, result.lng]);
        setSearchZoom(zoom);
      }} />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {user?.role === 'technician' && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id="tracking"
                  checked={enableTracking}
                  onCheckedChange={setEnableTracking}
                />
                <Label htmlFor="tracking" className="flex items-center gap-2">
                  {isTracking ? (
                    <>
                      <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                      Position active
                    </>
                  ) : (
                    'Activer GPS'
                  )}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-lines"
                  checked={showLines}
                  onCheckedChange={setShowLines}
                />
                <Label htmlFor="show-lines" className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Distances
                </Label>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>{technicians.length} technicien(s) en ligne</span>
          </div>
          {showInterventions && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span>{interventionsWithCoords.length} intervention(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {trackingError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{trackingError}</AlertDescription>
        </Alert>
      )}

      {/* Map */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={myPosition ? 13 : 6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          whenReady={() => setMapReady(true)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Recenter control */}
          {mapReady && <RecenterControl position={myPosition} />}
          {mapReady && <FlyToLocation position={searchTarget} zoom={searchZoom} />}

          {/* Current user position with accuracy circle */}
          {mapReady && myPosition && myLocation && (
            <>
              <Circle
                center={myPosition}
                radius={myLocation.coords.accuracy}
                pathOptions={{ 
                  color: '#22c55e', 
                  fillColor: '#22c55e',
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
              <Marker position={myPosition} icon={createTechnicianIcon(true)}>
                <Popup>
                  <div className="space-y-2 p-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Ma position
                    </h3>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Précision: ±{Math.round(myLocation.coords.accuracy)}m</p>
                      {myLocation.coords.speed && (
                        <p>Vitesse: {Math.round(myLocation.coords.speed * 3.6)} km/h</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Other technicians */}
          {mapReady && showTechnicians && technicians
            .filter(t => t.id !== user?.id)
            .filter(t => t.latitude != null && t.longitude != null)
            .map((tech) => (
              <Marker
                key={tech.id}
                position={[tech.latitude!, tech.longitude!]}
                icon={createTechnicianIcon(false)}
              >
                <Popup>
                  <div className="space-y-2 p-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      👷 {tech.firstName} {tech.lastName}
                    </h3>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Précision: ±{Math.round(tech.accuracy)}m</p>
                      {tech.speed && (
                        <p>Vitesse: {Math.round(tech.speed * 3.6)} km/h</p>
                      )}
                      <p>Mis à jour: {format(new Date(tech.updatedAt), 'HH:mm:ss', { locale: fr })}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {tech.status === 'available' ? 'Disponible' : 
                       tech.status === 'busy' ? 'Occupé' : 'En route'}
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Distance lines from technician to assigned interventions */}
          {mapReady && showLines && myPosition && myAssignedInterventions.map((intervention) => {
            if (!intervention.latitude || !intervention.longitude) return null;
            
            const lineColor = intervention.priority === 'urgent' ? '#ef4444' : 
                             intervention.priority === 'high' ? '#f97316' : '#6366f1';

            return (
              <Polyline
                key={`line-${intervention.id}`}
                positions={[myPosition, [intervention.latitude, intervention.longitude]]}
                pathOptions={{
                  color: lineColor,
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '10, 10',
                }}
              >
                <Tooltip permanent direction="center" className="distance-tooltip">
                  <span className="font-semibold text-xs bg-background/90 px-2 py-1 rounded shadow">
                    {formatDistance(intervention.distance || 0)}
                  </span>
                </Tooltip>
              </Polyline>
            );
          })}

          {/* Interventions */}
          {mapReady && showInterventions && interventionsWithCoords
            .filter(i => {
              if (i.priority === 'urgent') return showUrgent;
              if (i.priority === 'high') return showHigh;
              return showNormal;
            })
            .map((intervention) => (
            <Marker
              key={intervention.id}
              position={[intervention.latitude!, intervention.longitude!]}
              icon={createInterventionIcon(intervention.priority)}
            >
              <Popup minWidth={280}>
                <div className="space-y-2 p-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm">
                      {CATEGORY_ICONS[intervention.category]} {intervention.title}
                    </h3>
                    <Badge 
                      variant={intervention.priority === 'urgent' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {PRIORITY_LABELS[intervention.priority]}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {intervention.address}, {intervention.city}
                  </p>

                  {/* Distance display */}
                  {intervention.distance !== undefined && (
                    <div className="flex items-center gap-2 text-xs font-medium bg-muted/50 px-2 py-1 rounded">
                      <Route className="h-3 w-3" />
                      <span>Distance: {formatDistance(intervention.distance)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {STATUS_LABELS[intervention.status]}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/intervention/${intervention.id}`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Voir
                      </Link>
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Distance Panel for assigned interventions */}
      {myPosition && myAssignedInterventions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Route className="h-4 w-4" />
              Mes interventions - Distances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myAssignedInterventions.map((intervention) => (
                <div 
                  key={intervention.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{CATEGORY_ICONS[intervention.category]}</span>
                    <div>
                      <p className="text-sm font-medium">{intervention.title}</p>
                      <p className="text-xs text-muted-foreground">{intervention.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={intervention.priority === 'urgent' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {formatDistance(intervention.distance || 0)}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/intervention/${intervention.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Légende (cliquez pour afficher/masquer)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground">Techniciens</h4>
              <button 
                onClick={() => setShowTechnicians(prev => !prev)}
                className={`flex items-center gap-2 cursor-pointer transition-opacity ${!showTechnicians ? 'opacity-40 line-through' : ''}`}
              >
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px]">👷</div>
                <span>Technicien</span>
              </button>
            </div>
            {showInterventions && (
              <div className="space-y-2">
                <h4 className="font-medium text-muted-foreground">Interventions</h4>
                <button 
                  onClick={() => setShowUrgent(prev => !prev)}
                  className={`flex items-center gap-2 cursor-pointer transition-opacity ${!showUrgent ? 'opacity-40 line-through' : ''}`}
                >
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Urgent</span>
                </button>
                <button 
                  onClick={() => setShowHigh(prev => !prev)}
                  className={`flex items-center gap-2 cursor-pointer transition-opacity ${!showHigh ? 'opacity-40 line-through' : ''}`}
                >
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Haute</span>
                </button>
                <button 
                  onClick={() => setShowNormal(prev => !prev)}
                  className={`flex items-center gap-2 cursor-pointer transition-opacity ${!showNormal ? 'opacity-40 line-through' : ''}`}
                >
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <span>Normale</span>
                </button>
              </div>
            )}
            {showLines && (
              <div className="space-y-2">
                <h4 className="font-medium text-muted-foreground">Distances</h4>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 border-t-2 border-dashed border-indigo-500"></div>
                  <span>Ligne vers intervention</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
