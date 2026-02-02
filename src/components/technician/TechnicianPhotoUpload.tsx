import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TechnicianPhotoUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  label: string;
  description?: string;
  isRequired?: boolean;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  allowCamera?: boolean;
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
  allowCamera = false,
}: TechnicianPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for dialog to render, then set video source
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Mirror the image for selfie mode
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        await handleFile(file);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <>
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

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Cliquez ou glissez une image (max 5MB)
          </p>
          {allowCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                startCamera();
              }}
              disabled={isUploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Prendre une photo
            </Button>
          )}
        </div>
      </div>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Prendre une photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={stopCamera}>
                Annuler
              </Button>
              <Button onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Capturer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
