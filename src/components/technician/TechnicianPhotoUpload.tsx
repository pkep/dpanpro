import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TechnicianPhotoUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  label: string;
  description?: string;
  isRequired?: boolean;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
}

export function TechnicianPhotoUpload({
  currentUrl,
  onUpload,
  onDelete,
  label,
  description,
  isRequired = false,
  size = 'lg',
  shape = 'circle',
}: TechnicianPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-32 w-32',
    lg: 'h-40 w-40',
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="font-medium text-foreground">
          {label}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <div
        className={cn(
          'relative cursor-pointer transition-all',
          dragActive && 'scale-105',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />

        {shape === 'circle' ? (
          <Avatar className={cn(sizeClasses[size], 'border-2 border-dashed border-muted-foreground/50 hover:border-primary')}>
            {isUploading ? (
              <AvatarFallback className="bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </AvatarFallback>
            ) : currentUrl ? (
              <AvatarImage src={currentUrl} alt={label} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-muted hover:bg-muted/80">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            )}
          </Avatar>
        ) : (
          <div
            className={cn(
              sizeClasses[size],
              'rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-primary flex items-center justify-center overflow-hidden bg-muted',
            )}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : currentUrl ? (
              <img src={currentUrl} alt={label} className="h-full w-full object-contain" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}

        {currentUrl && onDelete && !isUploading && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Cliquez ou glissez une image (max 5MB)
      </p>
    </div>
  );
}
