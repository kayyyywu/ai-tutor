"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle } from "lucide-react";

interface PdfUploadProps {
  onUploadSuccess: (pdfFile: any) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  chatId?: string;
}

function PdfUpload({ onUploadSuccess, onUploadError, disabled, chatId }: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      onUploadError("Please select a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      onUploadError("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const headers: HeadersInit = {};
      if (chatId) {
        headers["x-chat-id"] = chatId;
      }

      const response = await fetch("/api/pdf/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      // Check if redirected to login page
      if (response.redirected && response.url.includes('/login')) {
        onUploadError("Please log in first to upload PDF files");
        return;
      }

      const result = await response.json();

      if (result.success) {
        onUploadSuccess(result.pdfFile);
      } else {
        onUploadError(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      onUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <div className="flex flex-col items-center space-y-4">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Uploading PDF...</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Upload a PDF file
                </p>
                <p className="text-sm text-gray-500">
                  Drag and drop or click to select
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PdfUpload;
