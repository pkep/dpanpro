// Service de géocodage utilisant l'API Nominatim (OpenStreetMap)

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface ReverseGeocodingResult {
  city: string | null;
  department: string | null;
  postalCode: string | null;
  displayName: string;
}

class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  async geocodeAddress(address: string, city: string, postalCode: string): Promise<GeocodingResult | null> {
    try {
      const query = encodeURIComponent(`${address}, ${postalCode} ${city}, France`);
      const response = await fetch(
        `${this.baseUrl}/search?q=${query}&format=json&limit=1&addressdetails=1`,
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
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
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

  /**
   * Enhanced reverse geocoding that returns structured address data
   * with city and department properly extracted from Nominatim response
   */
  async reverseGeocodeDetailed(latitude: number, longitude: number): Promise<ReverseGeocodingResult | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
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
      
      if (!data || !data.address) {
        return null;
      }

      const address = data.address;
      
      // Extract city from various possible fields (Nominatim varies by location)
      const city = address.city || 
                   address.town || 
                   address.village || 
                   address.municipality ||
                   address.suburb ||
                   null;
      
      // Extract department code from postcode (first 2 digits for metropolitan France)
      // or use county/state_district for department name
      let department: string | null = null;
      
      if (address.postcode) {
        // Extract department number from postal code (e.g., "93140" -> "93")
        const postalCode = address.postcode.toString();
        if (postalCode.length >= 2) {
          // Handle Corsica (2A, 2B) and DOM-TOM specially
          if (postalCode.startsWith('20')) {
            const corsicaCode = parseInt(postalCode.substring(0, 3));
            if (corsicaCode >= 200 && corsicaCode <= 201) {
              department = '2A';
            } else if (corsicaCode >= 202 && corsicaCode <= 209) {
              department = '2B';
            } else {
              department = '20';
            }
          } else if (postalCode.startsWith('97') || postalCode.startsWith('98')) {
            // DOM-TOM: use 3 digits
            department = postalCode.substring(0, 3);
          } else {
            department = postalCode.substring(0, 2);
          }
        }
      }
      
      return {
        city,
        department,
        postalCode: address.postcode || null,
        displayName: data.display_name || '',
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}

export const geocodingService = new GeocodingService();
