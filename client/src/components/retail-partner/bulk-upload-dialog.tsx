import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { createRetailPartnersTemplate, parseRetailPartnersExcel, type RetailPartnerTemplate } from '@/utils/excel-templates';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, X, FileSpreadsheet, AlertCircle, Check, FileDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  brandId: number;
}

interface UploadStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
  errors: { name: string; error: string }[];
}

export function BulkUploadDialog({ open, onClose, brandId }: BulkUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<RetailPartnerTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel (.xlsx) file",
        variant: "destructive",
      });
      return;
    }

    setFile(file);
    setIsLoading(true);
    
    try {
      // Read the file
      const arrayBuffer = await file.arrayBuffer();
      
      // Parse the data
      const partners = parseRetailPartnersExcel(arrayBuffer);
      
      if (partners.length === 0) {
        toast({
          title: "Empty file",
          description: "No retail partners found in the uploaded file",
          variant: "destructive",
        });
        setFile(null);
      } else {
        setParsedData(partners);
        toast({
          title: "File processed",
          description: `Successfully parsed ${partners.length} retail partners`,
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Failed to parse the Excel file",
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (parsedData.length === 0 || !brandId) return;

    setIsLoading(true);
    setUploadStats({
      total: parsedData.length,
      processed: 0,
      success: 0,
      failed: 0,
      errors: []
    });

    try {
      const response = await apiRequest("POST", "/api/retail-partners/bulk", {
        partners: parsedData,
        brandId
      });
      
      const result = await response.json();
      
      setUploadStats({
        total: parsedData.length,
        processed: parsedData.length,
        success: result.success,
        failed: result.failed,
        errors: result.errors || []
      });

      if (result.success > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/retail-partners"] });
        toast({
          title: "Bulk upload complete",
          description: `Successfully added ${result.success} retail partners. ${result.failed > 0 ? `Failed to add ${result.failed} partners.` : ''}`,
        });
      } else {
        toast({
          title: "Bulk upload failed",
          description: "Failed to add any retail partners. Please check the errors and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading retail partners:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload retail partners",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = createRetailPartnersTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "retail-partners-template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setUploadStats(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Retail Partners</DialogTitle>
          <DialogDescription>
            Upload an Excel file with multiple retail partners to add them in bulk.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: File Upload Area */}
        {!file && !uploadStats && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-gray-300"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <Upload className="h-12 w-12 text-gray-400" />
                <div className="space-y-2">
                  <p className="text-base font-medium">
                    Drag & drop your Excel file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Must be an Excel (.xlsx) file with the required format
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={isLoading}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isLoading}
                >
                  Browse Files
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Don't have the template?</p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={handleDownloadTemplate}
              >
                <FileDown className="h-4 w-4 mr-1" />
                Download Template
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: File Preview */}
        {file && parsedData.length > 0 && !uploadStats && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <FileSpreadsheet className="h-8 w-8 text-primary/80" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {parsedData.length} partners ready to upload
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedData.slice(0, 5).map((partner, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {partner.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {partner.status}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {partner.contactName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {partner.city}, {partner.state}
                      </td>
                    </tr>
                  ))}
                  {parsedData.length > 5 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-sm text-gray-500 text-center"
                      >
                        ... and {parsedData.length - 5} more partners
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3: Upload Progress or Results */}
        {uploadStats && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Uploading partners...</p>
                <Progress value={(uploadStats.processed / uploadStats.total) * 100} />
                <p className="text-xs text-gray-500 text-right">
                  {uploadStats.processed} of {uploadStats.total} processed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Upload Complete</h3>
                    <p className="text-sm text-gray-500">
                      {uploadStats.success} of {uploadStats.total} partners added successfully
                    </p>
                  </div>
                </div>

                {uploadStats.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Upload issues</AlertTitle>
                    <AlertDescription>
                      {uploadStats.failed} partners couldn't be added.
                      {uploadStats.errors.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <ul className="text-xs space-y-1 list-disc list-inside">
                            {uploadStats.errors.slice(0, 5).map((error, i) => (
                              <li key={i}>
                                <span className="font-medium">{error.name}:</span> {error.error}
                              </li>
                            ))}
                            {uploadStats.errors.length > 5 && (
                              <li>...and {uploadStats.errors.length - 5} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex sm:justify-between gap-2">
          {!uploadStats ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || parsedData.length === 0}
                className="relative"
              >
                {isLoading ? "Uploading..." : "Upload Partners"}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}