import type { GeocodingResult, ReverseGeocodingResult } from '@/services/geocoding/geocoding.service';

export interface IGeocodingService {
  geocodeAddress(address: string, city: string, postalCode: string): Promise<GeocodingResult | null>;
  reverseGeocode(latitude: number, longitude: number): Promise<string | null>;
  reverseGeocodeDetailed(latitude: number, longitude: number): Promise<ReverseGeocodingResult | null>;
}
