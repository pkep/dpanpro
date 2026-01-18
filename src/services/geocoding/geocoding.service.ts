// Service de géocodage utilisant l'API Nominatim (OpenStreetMap)

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  async geocodeAddress(address: string, city: string, postalCode: string): Promise<GeocodingResult | null> {
    try {
      const query = encodeURIComponent(`${address}, ${postalCode} ${city}, France`);
      const response = await fetch(
        `${this.baseUrl}/search?q=${query}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'InterventionApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();

      if (data.length === 0) {
        return null;
      }

      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'InterventionApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}

export const geocodingService = new GeocodingService();
