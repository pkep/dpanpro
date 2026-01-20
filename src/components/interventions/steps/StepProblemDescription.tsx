import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, MapPin } from 'lucide-react';
import { storageService } from '@/services/storage/storage.service';
import { toast } from 'sonner';

interface StepProblemDescriptionProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  address: string;
  onAddressChange: (value: string) => void;
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  additionalInfo: string;
  onAdditionalInfoChange: (value: string) => void;
}

export function StepProblemDescription({
  description,
  onDescriptionChange,
  photos,
  onPhotosChange,
  address,
  onAddressChange,
  postalCode,
  onPostalCodeChange,
  city,
  onCityChange,
  additionalInfo,
  onAdditionalInfoChange,
}: StepProblemDescriptionProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error('Seules les images sont acceptées');
          continue;
        }

        const publicUrl = await storageService.uploadFile('intervention-photos', file, 'temp');
        newPhotos.push(publicUrl);
      }

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos]);
        toast.success(`${newPhotos.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erreur lors du téléchargement des photos');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Décrivez votre problème</h2>
        <p className="text-muted-foreground mt-2">
          Plus vous donnez de détails, mieux nous pourrons vous aider
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="description">Description du problème *</Label>
          <Textarea
            id="description"
            placeholder="Décrivez le problème en détail (circonstances, urgence, accès au lieu...)"
            className="min-h-[150px] mt-2"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>

        {/* Photo Upload */}
        <div>
          <Label>Photos (optionnel)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Ajoutez des photos pour aider le technicien à mieux comprendre le problème
          </p>
          
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Galerie
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => {
                const input = document.getElementById('photo-capture') as HTMLInputElement;
                input?.click();
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Prendre une photo
            </Button>
          </div>

          <input
            type="file"
            id="photo-upload"
            className="hidden"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <input
            type="file"
            id="photo-capture"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Address Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Adresse d'intervention
          </div>

          <div>
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              placeholder="123 rue de la Paix"
              className="mt-2"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
            />
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

          <div>
            <Label htmlFor="additionalInfo">Informations complémentaires (optionnel)</Label>
            <Textarea
              id="additionalInfo"
              placeholder="Digicode, étage, bâtiment, instructions d'accès..."
              className="min-h-[80px] mt-2"
              value={additionalInfo}
              onChange={(e) => onAdditionalInfoChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
