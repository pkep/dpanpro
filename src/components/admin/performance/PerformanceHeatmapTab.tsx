import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { performanceService } from '@/services/performance/performance.service';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function PerformanceHeatmapTab() {
  const { data: zones, isLoading } = useQuery({
    queryKey: ['intervention-zones'],
    queryFn: () => performanceService.getInterventionZones(),
  });

  const maxCount = zones?.reduce((max, z) => Math.max(max, z.count), 1) || 1;

  const getColor = (count: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.75) return '#ef4444'; // red
    if (intensity > 0.5) return '#f97316'; // orange
    if (intensity > 0.25) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const getRadius = (count: number) => {
    const base = 10;
    const scale = (count / maxCount) * 30;
    return base + scale;
  };

  // Calculate center based on data or default to France
  const center = zones && zones.length > 0
    ? { lat: zones[0].lat, lng: zones[0].lng }
    : { lat: 46.603354, lng: 1.888334 };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap Géographique</CardTitle>
        <CardDescription>Zones les plus sollicitées par les clients</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : zones && zones.length > 0 ? (
          <div className="space-y-4">
            <div className="h-[500px] rounded-lg overflow-hidden border">
              <MapContainer
                center={[center.lat, center.lng]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {zones.map((zone, index) => (
                  <CircleMarker
                    key={`${zone.city}-${zone.postalCode}-${index}`}
                    center={[zone.lat, zone.lng]}
                    radius={getRadius(zone.count)}
                    fillColor={getColor(zone.count)}
                    fillOpacity={0.6}
                    stroke={true}
                    color={getColor(zone.count)}
                    weight={2}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold">{zone.city}</p>
                        <p className="text-sm text-muted-foreground">{zone.postalCode}</p>
                        <p className="text-lg font-bold mt-1">{zone.count} interventions</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#22c55e]" />
                <span className="text-sm text-muted-foreground">Faible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#eab308]" />
                <span className="text-sm text-muted-foreground">Modéré</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#f97316]" />
                <span className="text-sm text-muted-foreground">Élevé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#ef4444]" />
                <span className="text-sm text-muted-foreground">Très élevé</span>
              </div>
            </div>

            {/* Top Zones List */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Top 10 des zones les plus sollicitées</h3>
              <div className="grid gap-2">
                {zones.slice(0, 10).map((zone, index) => (
                  <div 
                    key={`${zone.city}-${zone.postalCode}-list-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{zone.city}</p>
                        <p className="text-sm text-muted-foreground">{zone.postalCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{zone.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée géographique disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
