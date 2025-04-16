import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string, file: File) => void;
  aspectRatio?: number;
}

export function ImageCropper({ 
  open, 
  onClose, 
  onCropComplete,
  aspectRatio = 1
}: ImageCropperProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setImgSrc('');
      setSelectedFile(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [open]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  };

  const generateCroppedImage = async () => {
    try {
      if (!imgRef.current || !completedCrop || !selectedFile) {
        return;
      }

      setIsLoading(true);

      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        }, 'image/jpeg', 0.95);
      });

      // Create a new file from the blob
      const croppedFile = new File([blob], `cropped-${selectedFile.name}`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Create a URL for the blob
      const croppedImageUrl = URL.createObjectURL(blob);
      
      onCropComplete(croppedImageUrl, croppedFile);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({
        title: 'Error cropping image',
        description: 'There was an error processing the image.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!imgSrc && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Select an image to crop. It should be square for best results.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
              />
            </div>
          )}

          {imgSrc && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground mb-2">
                Drag to adjust the crop area. The image will be cropped as a square.
              </p>
              <div className="max-h-[50vh] overflow-auto mx-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={generateCroppedImage} 
            disabled={!completedCrop || isLoading}
          >
            {isLoading ? 'Processing...' : 'Crop & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}