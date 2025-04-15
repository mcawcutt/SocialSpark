import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

export default function TestUpload() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      console.log('File selected:', file.name, 'type:', file.type, 'size:', file.size);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      // Upload the file
      uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setUploadStatus('uploading');
    setStatusMessage('Uploading...');
    
    try {
      // Simple FormData approach
      const formData = new FormData();
      formData.append('media', file);
      
      // Log FormData contents (using Array.from to handle iterator)
      console.log('FormData contents:');
      Array.from(formData.entries()).forEach(([key, value]) => {
        console.log(`FormData - ${key}:`, value);
      });
      
      console.log('Starting upload...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      try {
        const data = JSON.parse(responseText);
        setUploadStatus('success');
        setStatusMessage(`Upload successful! File URL: ${data.file.url}`);
      } catch (e) {
        console.error('Error parsing response JSON:', e);
        setUploadStatus('error');
        setStatusMessage('Error parsing server response');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <MobileNav />
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          <h1 className="text-2xl font-semibold mb-6">Test File Upload</h1>
          
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Upload Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Select an image to upload:</label>
                <div className="flex items-center gap-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadStatus === 'uploading'}
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Choose File
                      </>
                    )}
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              
              {imagePreview && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Image Preview:</h3>
                  <div className="w-full h-40 border rounded-md overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
              
              {statusMessage && (
                <div className={`mt-4 p-3 rounded-md ${
                  uploadStatus === 'error' 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : uploadStatus === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {statusMessage}
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-500">
                <h3 className="font-medium">Debug Information:</h3>
                <ul className="list-disc pl-5 mt-1">
                  <li>Upload Status: {uploadStatus}</li>
                  <li>Image Preview: {imagePreview ? 'Available' : 'None'}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}