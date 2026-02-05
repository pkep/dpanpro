import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Image, X, CheckCircle } from 'lucide-react';

interface PhotoStepProps {
  previews: string[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled: boolean;
  error: string | null;
}

export function PhotoStep({
  previews,
  onFilesSelected,
  onRemoveFile,
  disabled,
  error,
}: PhotoStepProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          Prendre une photo
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-1"
        >
          <Image className="h-4 w-4 mr-2" />
          Galerie
        </Button>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={preview}
                alt={`Aperçu ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <button
                onClick={() => onRemoveFile(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            {previews.length} photo(s) sélectionnée(s)
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
