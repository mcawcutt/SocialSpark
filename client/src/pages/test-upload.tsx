import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { queryClient } from "@/lib/queryClient";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function TestUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("Test Brand");
  const [updateStatus, setUpdateStatus] = useState<UploadStatus>("idle");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploadStatus("uploading");
      setErrorMessage("");

      const formData = new FormData();
      formData.append("media", file);

      // Use demo mode to bypass authentication
      const response = await fetch("/api/upload?demo=true", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const data = await response.json();
      setImageUrl(data.file.url);
      setUploadStatus("success");

      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload file");

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async () => {
    try {
      setUpdateStatus("uploading");
      
      // Use demo mode to update profile
      const response = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileName,
          logo: imageUrl,
          demo: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      setUpdateStatus("success");
      
      // Update both cache entries directly for immediate UI updates
      queryClient.setQueryData(["/api/user"], data);
      queryClient.setQueryData(["/api/demo-user"], data);
        
      // Also invalidate the queries to ensure fresh data
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      queryClient.invalidateQueries({queryKey: ["/api/demo-user"]});

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Update error:", error);
      setUpdateStatus("error");

      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <MobileNav />
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          <h1 className="text-2xl font-semibold mb-6">Upload Testing Tool</h1>
          <p className="text-gray-500 mb-6">
            This page allows you to test file uploads and profile updates using the demo mode.
            No authentication is required for using these features.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Upload Logo</CardTitle>
                <CardDescription>
                  Select an image file to upload as your brand logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Select an image to upload:</label>
                  <div className="flex items-center gap-4">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadStatus === "uploading"}
                    >
                      {uploadStatus === "uploading" ? (
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
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {uploadStatus === "success" && (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" /> Upload successful
                      </span>
                    )}
                    
                    {uploadStatus === "error" && (
                      <span className="text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" /> Upload failed
                      </span>
                    )}
                  </div>
                </div>
                
                {imageUrl && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Uploaded Image:</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
                        <img
                          src={imageUrl}
                          alt="Uploaded logo"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/assets/IGNYT_Icon Web.png";
                          }}
                        />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-sm text-gray-500 truncate">{imageUrl}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {errorMessage && (
                  <div className="mt-2 text-sm text-red-600">
                    Error: {errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Update Profile</CardTitle>
                <CardDescription>
                  Update your profile information with the uploaded logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Brand Name:</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter brand name"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Logo URL:</label>
                  <input
                    type="text"
                    value={imageUrl}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
                    placeholder="Upload an image first"
                  />
                  <p className="text-xs text-gray-500">
                    This URL will be automatically filled after uploading an image
                  </p>
                </div>
                
                <Button
                  onClick={updateProfile}
                  disabled={!imageUrl || updateStatus === "uploading"}
                  className="w-full"
                >
                  {updateStatus === "uploading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Profile"
                  )}
                </Button>
                
                {updateStatus === "success" && (
                  <div className="mt-2 text-sm text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" /> 
                    Profile updated successfully! Check the logo in the sidebar.
                  </div>
                )}
                
                {updateStatus === "error" && (
                  <div className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" /> 
                    Failed to update profile
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}