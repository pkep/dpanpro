import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressSuggestion {
  label: string;
  housenumber?: string;
  street?: string;
  name: string;
  postcode: string;
  city: string;
  context: string;
}

interface AddressAutocompleteProps {
  address: string;
  onAddressChange: (value: string) => void;
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
}

export function AddressAutocomplete({
  address,
  onAddressChange,
  postalCode,
  onPostalCodeChange,
  city,
  onCityChange,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      if (!response.ok) return;
      const data = await response.json();
      const results: AddressSuggestion[] = data.features.map((f: any) => ({
        label: f.properties.label,
        housenumber: f.properties.housenumber,
        street: f.properties.street,
        name: f.properties.name,
        postcode: f.properties.postcode,
        city: f.properties.city,
        context: f.properties.context,
      }));
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddressInput = (value: string) => {
    onAddressChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    onAddressChange(suggestion.name);
    onPostalCodeChange(suggestion.postcode);
    onCityChange(suggestion.city);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative">
        <Label htmlFor="address">Adresse *</Label>
        <div className="relative mt-2">
          <Input
            id="address"
            placeholder="Commencez à taper votre adresse..."
            value={address}
            onChange={(e) => handleAddressInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {showSuggestions && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                onClick={() => selectSuggestion(s)}
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="postalCode">Code postal *</Label>
          <Input
            id="postalCode"
            placeholder="75001"
            maxLength={5}
            className="mt-2"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="city">Ville *</Label>
          <Input
            id="city"
            placeholder="Paris"
            className="mt-2"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
