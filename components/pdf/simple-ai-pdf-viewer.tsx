"use client";

import { useState, useEffect } from "react";

import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SimpleAiPdfViewerProps {
  fileUrl: string;
  currentPage?: number;
  onPageChange?: (pageNumber: number) => void;
}

export default function SimpleAiPdfViewer({ 
  fileUrl, 
  currentPage = 1,
  onPageChange
}: SimpleAiPdfViewerProps) {
  const [numPages, setNumPages] = useState(3); // Default, will be updated
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  // Debug PDF URL
  useEffect(() => {
    console.log("PDF Viewer - fileUrl:", fileUrl);
    console.log("PDF Viewer - currentPage:", currentPage);
    console.log("PDF Viewer - scale:", scale);
    
    // Build complete PDF URL for debugging
    if (fileUrl) {
      const fullUrl = `${fileUrl}#page=${currentPage}`;
      console.log("PDF Viewer - Full URL:", fullUrl);
    }
  }, [fileUrl, currentPage, scale]);

  // Handle PDF load events
  const handlePdfLoad = () => {
    console.log("PDF loaded successfully:", fileUrl);
    setIsLoading(false);
    setPdfError(null);
  };

  const handlePdfError = () => {
    console.error("PDF failed to load:", fileUrl);
    console.error("Current page:", currentPage);
    console.error("Scale:", scale);
    setIsLoading(false);
    setPdfError(`Failed to load PDF: ${fileUrl}. Please check if the file exists and is accessible.`);
  };

  const prevPage = () => {
    const newPage = Math.max(1, currentPage - 1);
    onPageChange?.(newPage);
  };
  
  const nextPage = () => {
    const newPage = Math.min(numPages, currentPage + 1);
    onPageChange?.(newPage);
  };

  const zoomIn = () => setScale((s) => Math.min(2, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage}{numPages ? ` / ${numPages}` : ""}
          </span>
          <Button variant="outline" size="sm" onClick={nextPage} disabled={numPages > 0 && currentPage >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          {/* Debug buttons */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              console.log("Manual refresh PDF");
              console.log("Current fileUrl:", fileUrl);
              console.log("Current page:", currentPage);
              // Force reload PDF
              window.location.reload();
            }}
            className="text-xs"
          >
            Refresh PDF
          </Button>
        </div>
      </div>
      
      {/* PDF Display */}
      <div className="flex-1 relative overflow-auto">
        <div className="relative w-full h-full">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {pdfError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
              <div className="text-center p-4">
                <div className="text-red-600 mb-2">⚠️</div>
                <p className="text-red-600 font-medium">PDF Loading Error</p>
                <p className="text-red-500 text-sm mt-1">{pdfError}</p>
                <p className="text-gray-500 text-xs mt-2">URL: {fileUrl}</p>
              </div>
            </div>
          )}

          {/* PDF iframe with AI-controlled page navigation */}
          {fileUrl && (
            <iframe
              src={`${fileUrl}#page=${currentPage}`}
              className="w-full h-full border-0"
              style={{ 
                zIndex: 1,
                position: 'relative'
              }}
              onLoad={() => {
                console.log("PDF iframe loaded successfully:", fileUrl);
                setIsLoading(false);
                setPdfError(null);
              }}
              onError={() => {
                console.error("PDF iframe failed to load:", fileUrl);
                setIsLoading(false);
                setPdfError(`Failed to load PDF: ${fileUrl}. Please check if the file exists and is accessible.`);
              }}
            />
          )}
          
        </div>
      </div>
      
    </div>
  );
}
