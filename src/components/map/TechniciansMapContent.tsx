import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, RefreshCw, MapPin, Phone, Mail, Star, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TechnicianLocation {
  id: string;
  userId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  currentCity: string | null;
  department: string | null;
  skills: string[];
  averageRating: number | null;
  completedInterventions: number;
  updatedAt: Date;
  hasActiveIntervention: boolean;
}

const SKILL_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

// Create technician marker icon with photo or fallback
const createTechnicianIcon = (hasActiveIntervention: boolean, avatarUrl: string | null, initials: string) => {
  const bgColor = hasActiveIntervention ? '#f97316' : '#22c55e';
  const pulseColor = hasActiveIntervention ? 'rgba(249, 115, 22, 0.4)' : 'rgba(34, 197, 94, 0.4)';
  const borderColor = hasActiveIntervention ? '#f97316' : '#22c55e';

  // If avatar URL exists, use the photo
  if (avatarUrl) {
    return L.divIcon({
      className: 'technician-marker-photo',
      html: `
        <div style="position: relative; width: 48px; height: 48px;">
          <div style="position: absolute; inset: 0; background: ${pulseColor}; border-radius: 9999px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 48px; height: 48px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 3px solid ${borderColor}; overflow: hidden; background: white;">
            <img src="${avatarUrl}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div style="display: none; width: 100%; height: 100%; background: ${bgColor}; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
              ${initials}
            </div>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });
  }

  // Fallback to initials
  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="position: relative; width: 48px; height: 48px;">
        <div style="position: absolute; inset: 0; background: ${pulseColor}; border-radius: 9999px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 48px; height: 48px; background: ${bgColor}; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 3px solid white; color: white; font-weight: 600; font-size: 16px;">
          ${initials}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
};

// Map bounds fitter component
function FitBounds({ technicians }: { technicians: TechnicianLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (technicians.length > 0) {
      const bounds = L.latLngBounds(
        technicians.map((t) => [t.latitude, t.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [technicians, map]);

  return null;
}

export function TechniciansMapContent() {
  const [technicians, setTechnicians] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const fetchTechnicians = async () => {
    try {
      // Get partner applications with location
      const { data: applications, error: appError } = await supabase
        .from('partner_applications')
        .select('id, user_id, company_name, latitude, longitude, current_city, department, skills, updated_at')
        .eq('status', 'approved')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (appError) throw appError;
      if (!applications || applications.length === 0) {
        setTechnicians([]);
        return;
      }

      // Get user details with avatar
      const userIds = applications.map((a) => a.user_id).filter(Boolean);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, avatar_url')
        .in('id', userIds)
        .eq('is_active', true)
        .eq('role', 'technician');

      if (usersError) throw usersError;

      // Get partner statistics
      const { data: stats } = await supabase
        .from('partner_statistics')
        .select('partner_id, average_rating, completed_interventions')
        .in('partner_id', userIds);

      // Get active interventions to know who's busy
      const { data: activeInterventions } = await supabase
        .from('interventions')
        .select('technician_id')
        .in('status', ['assigned', 'on_route', 'in_progress'])
        .in('technician_id', userIds);

      const busyTechnicianIds = new Set(
        (activeInterventions || []).map((i) => i.technician_id)
      );

      // Build technician locations
      const techLocations: TechnicianLocation[] = [];
      for (const app of applications) {
        const user = users?.find((u) => u.id === app.user_id);
        if (!user) continue;

        const stat = stats?.find((s) => s.partner_id === app.user_id);

        techLocations.push({
          id: app.id,
          userId: app.user_id!,
          companyName: app.company_name,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          latitude: app.latitude!,
          longitude: app.longitude!,
          currentCity: app.current_city,
          department: app.department,
          skills: app.skills || [],
          averageRating: stat?.average_rating ? Number(stat.average_rating) : null,
          completedInterventions: stat?.completed_interventions || 0,
          updatedAt: new Date(app.updated_at),
          hasActiveIntervention: busyTechnicianIds.has(app.user_id!),
        });
      }

      setTechnicians(techLocations);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();

    // Subscribe to realtime updates on partner_applications
    const channel = supabase
      .channel('technicians-location')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partner_applications',
        },
        (payload) => {
          // Update technician position in real-time
          const updated = payload.new as any;
          if (updated.latitude && updated.longitude) {
            setTechnicians((prev) =>
              prev.map((t) =>
                t.id === updated.id
                  ? {
                      ...t,
                      latitude: updated.latitude,
                      longitude: updated.longitude,
                      currentCity: updated.current_city,
                      department: updated.department,
                      updatedAt: new Date(updated.updated_at),
                    }
                  : t
              )
            );
          }
        }
      )
      .subscribe();

    // Polling fallback every 30 seconds
    const pollInterval = setInterval(fetchTechnicians, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  // Filter technicians by search
  const filteredTechnicians = useMemo(() => {
    if (!searchQuery) return technicians;
    const query = searchQuery.toLowerCase();
    return technicians.filter(
      (t) =>
        t.firstName.toLowerCase().includes(query) ||
        t.lastName.toLowerCase().includes(query) ||
        t.companyName.toLowerCase().includes(query) ||
        t.currentCity?.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query)
    );
  }, [technicians, searchQuery]);

  const availableCount = technicians.filter((t) => !t.hasActiveIntervention).length;
  const busyCount = technicians.filter((t) => t.hasActiveIntervention).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Chargement des techniciens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un technicien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="sm" onClick={fetchTechnicians}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>

        <div className="flex items-center gap-4 ml-auto text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>{availableCount} disponible(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>{busyCount} en intervention</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border min-h-[400px]">
        {technicians.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-muted/50">
            <div className="text-center space-y-2">
              <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Aucun technicien géolocalisé</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[46.603354, 1.888334]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapReady && <FitBounds technicians={filteredTechnicians} />}

            {mapReady &&
              filteredTechnicians.map((tech) => {
                const initials = `${tech.firstName.charAt(0)}${tech.lastName.charAt(0)}`.toUpperCase();
                return (
                  <Marker
                    key={tech.id}
                    position={[tech.latitude, tech.longitude]}
                    icon={createTechnicianIcon(tech.hasActiveIntervention, tech.avatarUrl, initials)}
                  >
                  <Popup minWidth={280} maxWidth={320}>
                    <div className="space-y-3 p-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {tech.firstName} {tech.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{tech.companyName}</p>
                        </div>
                        <Badge variant={tech.hasActiveIntervention ? 'secondary' : 'default'}>
                          {tech.hasActiveIntervention ? 'En intervention' : 'Disponible'}
                        </Badge>
                      </div>

                      {tech.averageRating && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium">{tech.averageRating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-sm">
                            ({tech.completedInterventions} interventions)
                          </span>
                        </div>
                      )}

                      <div className="space-y-1 text-sm">
                        {tech.currentCity && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {tech.currentCity}
                              {tech.department && ` (${tech.department})`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{tech.email}</span>
                        </div>
                        {tech.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{tech.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {tech.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {SKILL_LABELS[skill] || skill}
                          </Badge>
                        ))}
                        {tech.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{tech.skills.length - 4}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Dernière position : {format(tech.updatedAt, "HH:mm 'le' dd/MM", { locale: fr })}
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${tech.latitude},${tech.longitude}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Voir sur Google Maps
                      </Button>
                    </div>
                  </Popup>
                </Marker>
                );
              })}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Légende</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
              <span>Technicien disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow" />
              <span>Technicien en intervention</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
