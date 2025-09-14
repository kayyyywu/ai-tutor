"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Eye, Calendar } from "lucide-react";

interface PdfFile {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  uploadDate: string;
}

interface PdfListProps {
  onSelectPdf: (pdfFile: PdfFile) => void;
  selectedPdfId?: string;
}

function PdfList({ onSelectPdf, selectedPdfId }: PdfListProps) {
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPdfFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pdf");
      const result = await response.json();

      if (result.pdfFiles) {
        setPdfFiles(result.pdfFiles);
      } else {
        setError(result.error || "Failed to load PDF files");
      }
    } catch (error) {
      console.error("Error fetching PDF files:", error);
      setError("Failed to load PDF files");
    } finally {
      setLoading(false);
    }
  };

  const deletePdfFile = async (pdfId: string) => {
    try {
      const response = await fetch(`/api/pdf?id=${pdfId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPdfFiles(prev => prev.filter(pdf => pdf.id !== pdfId));
        if (selectedPdfId === pdfId) {
          onSelectPdf(null as any);
        }
      } else {
        console.error("Failed to delete PDF file");
      }
    } catch (error) {
      console.error("Error deleting PDF file:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    fetchPdfFiles();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchPdfFiles} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (pdfFiles.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No PDF files uploaded yet</p>
        <p className="text-sm">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Files</h3>
        <p className="text-sm text-gray-600">{pdfFiles.length} file(s)</p>
      </div>
      
      <div className="space-y-2">
        {pdfFiles.map((pdfFile) => (
          <div
            key={pdfFile.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedPdfId === pdfFile.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            onClick={() => onSelectPdf(pdfFile)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {pdfFile.originalName}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span>{pdfFile.pageCount} pages</span>
                    <span>{formatFileSize(pdfFile.fileSize)}</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(pdfFile.uploadDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPdf(pdfFile);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePdfFile(pdfFile.id);
                  }}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PdfList;
