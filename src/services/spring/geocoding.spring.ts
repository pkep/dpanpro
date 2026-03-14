import type { IGeocodingService } from '@/services/interfaces/geocoding.interface';
import type { GeocodingResult, ReverseGeocodingResult } from '@/services/components/geocoding/geocoding.service';
import { springHttp } from './http-client';

export class SpringGeocodingService implements IGeocodingService {
  // GET /geocoding/forward?address=&city=&postalCode=
  async geocodeAddress(address: string, city: string, postalCode: string): Promise<GeocodingResult | null> {
    try {
      return await springHttp.get<GeocodingResult>('/geocoding/forward', { address, city, postalCode });
    } catch {
      return null;
    }
  }

  // GET /geocoding/reverse?latitude=&longitude=
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const result = await springHttp.get<ReverseGeocodingResult>('/geocoding/reverse', {
        latitude: String(latitude),
        longitude: String(longitude),
      });
      return result?.displayName || null;
    } catch {
      return null;
    }
  }

  // GET /geocoding/reverse?latitude=&longitude= (detailed)
  async reverseGeocodeDetailed(latitude: number, longitude: number): Promise<ReverseGeocodingResult | null> {
    try {
      return await springHttp.get<ReverseGeocodingResult>('/geocoding/reverse', {
        latitude: String(latitude),
        longitude: String(longitude),
      });
    } catch {
      return null;
    }
  }
}
