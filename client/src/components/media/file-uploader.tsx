import { useState, useRef } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onFileUploaded: (fileUrl: string, fileType?: string) => void;
  accept?: string;
  maxSize?: number; // size in MB
  className?: string;
  multiple?: boolean; // Allow multiple file selection
}

export function FileUploader({
  onFileUploaded,
  accept = "image/*,video/*",
  maxSize = 20, // default 20MB
  className = "",
  multiple = false, // Default to single file upload
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // For multiple files
    if (multiple) {
      console.log(`${files.length} files selected for upload`);
      setIsUploading(true);
      
      try {
        // Process files sequentially to avoid overwhelming the server
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Validate file size
          if (file.size > maxSize * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds maximum size of ${maxSize}MB and was skipped`,
              variant: "destructive",
            });
            continue; // Skip this file but continue with others
          }
          
          const formData = new FormData();
          formData.append('media', file);
          
          // Send to the API
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          const fileUrl = data.file.url;
          
          console.log(`Upload ${i+1}/${files.length} successful, file URL:`, fileUrl);
          
          // Call the callback with each file
          onFileUploaded(fileUrl, file.type);
        }
        
        toast({
          title: "Uploads complete",
          description: `Successfully uploaded ${files.length} files`,
        });
      } catch (error) {
        console.error("Upload error:", error);
        
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } 
    // For single file upload
    else {
      const file = files[0];
      console.log("File selected for upload:", file.name);
      
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${maxSize}MB`,
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('media', file);
        
        // Send to the API
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const fileUrl = data.file.url;
        
        console.log("Upload successful, file URL:", fileUrl);
        
        // Call the callback with the file URL and file type
        onFileUploaded(fileUrl, file.type);
        
        toast({
          title: "Upload successful",
          description: "Your file has been uploaded successfully.",
        });
      } catch (error) {
        console.error("Upload error:", error);
        
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        multiple={multiple}
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <ImageIcon className="mr-2 h-4 w-4" />
            {multiple ? "Upload Files" : "Upload File"}
          </>
        )}
      </Button>
    </div>
  );
}