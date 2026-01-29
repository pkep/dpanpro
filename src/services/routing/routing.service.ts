// Service de calcul d'itinéraire utilisant OSRM (Open Source Routing Machine)
// Fallback sur l'API IGN Géoplateforme si disponible
// Documentation OSRM: http://project-osrm.org/docs/v5.24.0/api/

const OSRM_API = 'https://router.project-osrm.org/route/v1/driving';
const IGN_ROUTING_API = 'https://data.geopf.fr/navigation/itineraire';

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry?: GeoJSON.LineString;
}

interface OSRMRouteResponse {
  code: string;
  routes: Array<{
    distance: number; // en mètres
    duration: number; // en secondes
    geometry?: string;
  }>;
}

interface IGNRouteResponse {
  distance: number;
  duration: number;
  geometry?: {
    type: string;
    coordinates: number[][];
  };
}

/**
 * Calcule un itinéraire via OSRM (Open Source Routing Machine)
 * Service gratuit et open source avec données OpenStreetMap
 */
async function calculateRouteOSRM(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> {
  try {
    // Format OSRM: longitude,latitude
    const url = `${OSRM_API}/${startLng},${startLat};${endLng},${endLat}?overview=false`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`OSRM API error: ${response.status}`);
      return null;
    }

    const data: OSRMRouteResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.round(route.duration / 60),
    };
  } catch (error) {
    console.error('Error with OSRM API:', error);
    return null;
  }
}

/**
 * Calcule un itinéraire via l'API IGN Géoplateforme (backup)
 * API gouvernementale française utilisant les données BD TOPO®
 */
async function calculateRouteIGN(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> {
  try {
    const start = `${startLng},${startLat}`;
    const end = `${endLng},${endLat}`;

    const params = new URLSearchParams({
      resource: 'bdtopo-osrm',
      start,
      end,
      profile: 'car',
      optimization: 'fastest',
      distanceUnit: 'kilometer',
      timeUnit: 'minute',
      crs: 'EPSG:4326',
    });

    const response = await fetch(`${IGN_ROUTING_API}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data: IGNRouteResponse = await response.json();

    return {
      distanceKm: Math.round(data.distance * 10) / 10,
      durationMinutes: Math.round(data.duration),
      geometry: data.geometry as GeoJSON.LineString | undefined,
    };
  } catch (error) {
    console.error('Error with IGN API:', error);
    return null;
  }
}

/**
 * Calcule un itinéraire entre deux points
 * Essaie OSRM en premier (plus fiable), puis IGN en backup
 */
export async function calculateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> {
  // Essayer OSRM en premier (plus stable)
  const osrmResult = await calculateRouteOSRM(startLat, startLng, endLat, endLng);
  if (osrmResult) {
    return osrmResult;
  }

  // Fallback sur IGN si OSRM échoue
  const ignResult = await calculateRouteIGN(startLat, startLng, endLat, endLng);
  if (ignResult) {
    return ignResult;
  }

  return null;
}

/**
 * Calcul de fallback basé sur la distance à vol d'oiseau
 * Utilisé si l'API IGN n'est pas disponible
 */
export function calculateFallbackRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): RouteResult {
  // Calcul de la distance Haversine
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(endLat - startLat);
  const dLng = toRad(endLng - startLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(startLat)) * Math.cos(toRad(endLat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceHaversine = R * c;

  // Facteur de détour routier (1.4x) et vitesse moyenne urbaine (25 km/h)
  const ROAD_DETOUR_FACTOR = 1.4;
  const AVG_SPEED_KMH = 25;

  const distanceKm = distanceHaversine * ROAD_DETOUR_FACTOR;
  const durationMinutes = Math.round((distanceKm / AVG_SPEED_KMH) * 60);

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes: Math.max(1, durationMinutes),
  };
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calcule l'itinéraire avec fallback automatique
 */
export async function getRouteWithFallback(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult> {
  const result = await calculateRoute(startLat, startLng, endLat, endLng);
  
  if (result) {
    return result;
  }

  // Fallback si l'API IGN échoue
  console.warn('Using fallback route calculation');
  return calculateFallbackRoute(startLat, startLng, endLat, endLng);
}
