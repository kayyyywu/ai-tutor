"use client";

// Define simple message type
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  experimental_attachments?: any[];
  toolInvocations?: any[];
}

interface Attachment {
  name: string;
  contentType: string;
  url: string;
}
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";

// Use simplified AI PDF viewer
const SimpleAiPdfViewer = dynamic(() => import("@/components/pdf/simple-ai-pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-white rounded-lg shadow-sm border flex flex-col items-center justify-center text-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Loading PDF...</p>
    </div>
  )
});

const PdfUpload = dynamic(() => import("@/components/pdf/pdf-upload"), {
  ssr: false
});

const PdfList = dynamic(() => import("@/components/pdf/pdf-list"), {
  ssr: false
});
import { 
  FileText, 
  MessageSquare, 
  Upload, 
  X,
  Eye,
  EyeOff
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";

interface PdfFile {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  uploadDate: string;
}

export function SplitChat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<Message>;
}) {
  // Use local state to manage messages and input
  const [messages, setMessages] = useState<Array<Message>>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  
  
  
  const handleSubmit = async (e?: { preventDefault?: () => void }, chatRequestOptions?: any) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    if (input.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: input.trim(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/chat/enhanced?id=${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            currentPdfId: selectedPdf?.id,
            currentPage: currentPage,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: data.message,
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const stop = () => {
    setIsLoading(false);
  };

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [selectedPdf, setSelectedPdf] = useState<PdfFile | null>(null);
  const [pdfAnnotations, setPdfAnnotations] = useState<any[]>([]);
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  const [showPdfList, setShowPdfList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Get PDF annotations
  const fetchPdfAnnotations = async (pdfId: string) => {
    try {
      const response = await fetch(`/api/pdf/annotations?pdfFileId=${pdfId}`);
      const result = await response.json();
      if (result.annotations) {
        setPdfAnnotations(result.annotations);
      }
    } catch (error) {
      console.error("Error fetching annotations:", error);
    }
  };

  // Get annotations when PDF is selected
  useEffect(() => {
    if (selectedPdf) {
      fetchPdfAnnotations(selectedPdf.id);
    }
  }, [selectedPdf]);

  const handlePdfUploadSuccess = async (pdfFile: PdfFile) => {
    setSelectedPdf(pdfFile);
    setShowPdfPanel(true);
    setShowPdfList(false);
    
    // Associate PDF with current chat
    try {
      await fetch(`/api/pdf/associate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: pdfFile.id,
          chatId: id,
        }),
      });
    } catch (error) {
      console.error('Failed to associate PDF with chat:', error);
    }
  };

  const handlePdfUploadError = (error: string) => {
    console.error("PDF upload error:", error);
    alert(`PDF upload failed: ${error}`);
  };

  const handleSelectPdf = async (pdfFile: PdfFile | null) => {
    setSelectedPdf(pdfFile);
    if (pdfFile) {
      setShowPdfPanel(true);
      // Associate PDF with current chat
      try {
        await fetch(`/api/pdf/associate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfId: pdfFile.id,
            chatId: id,
          }),
        });
      } catch (error) {
        console.error('Failed to associate PDF with chat:', error);
      }
    }
    setShowPdfList(false);
  };

  const handlePageChange = async (pageNumber: number) => {
    setCurrentPage(pageNumber);
    if (selectedPdf?.id) {
      try {
        await fetch("/api/pdf/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: id, pdfId: selectedPdf.id, currentPage: pageNumber }),
        });
      } catch (err) {
        console.error("Failed to update PDF context:", err);
      }
    }
  };

  const handleAnnotationClick = (annotation: any) => {
    console.log("Annotation clicked:", annotation);
  };

  const pdfFileUrl = selectedPdf ? `/uploads/pdfs/${selectedPdf.filename}` : "";
  
  // Debug PDF URL construction
  console.log("PDF URL Debug:", {
    selectedPdf: selectedPdf?.filename,
    constructedUrl: pdfFileUrl,
    fullPath: selectedPdf ? `/uploads/pdfs/${selectedPdf.filename}` : "No PDF selected"
  });
  
  // Debug information
  useEffect(() => {
    if (selectedPdf) {
      console.log("Selected PDF:", selectedPdf);
      console.log("PDF File URL:", pdfFileUrl);
    }
  }, [selectedPdf, pdfFileUrl]);
  


  return (
    <div className="flex h-dvh bg-background">
      {/* Left PDF panel - always visible */}
      <div className="w-2/3 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* PDF Panel Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-red-600" />
            <span className="font-medium">PDF Documents</span>
          </div>
          <div className="flex items-center space-x-2">
            <Sheet open={showPdfList} onOpenChange={setShowPdfList}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Manage Files
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold">PDF File Management</h3>
                  </div>
                  
                  <PdfUpload
                    onUploadSuccess={handlePdfUploadSuccess}
                    onUploadError={handlePdfUploadError}
                    chatId={id}
                  />
                  
                  <PdfList
                    onSelectPdf={handleSelectPdf}
                    selectedPdfId={selectedPdf?.id}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* PDF Content Area */}
        <div className="flex-1 p-4">
          {selectedPdf ? (
            <div className="h-full bg-white rounded-lg shadow-sm border">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span className="font-medium truncate">{selectedPdf.originalName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPdfList(true)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPdf(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="h-[calc(100%-60px)]">
                <SimpleAiPdfViewer
                  fileUrl={pdfFileUrl}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-lg shadow-sm border flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Upload PDF Document</h3>
              <p className="text-gray-500 mb-6">Click the button below to upload a PDF file and start chatting with AI</p>
              <Button
                onClick={() => setShowPdfList(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right chat panel */}
      <div className="w-1/3 flex flex-col">
          {/* Chat Panel Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span className="font-medium">AI Assistant</span>
            {selectedPdf && (
              <span className="text-sm text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                {selectedPdf.originalName}
              </span>
            )}
          </div>
        </div>

        {/* Chat Content Area */}
        <div className="flex flex-col justify-between items-center gap-4 flex-1">
          <div
            ref={messagesContainerRef}
            className="flex flex-col gap-6 h-full w-full items-center overflow-y-scroll p-6"
          >
            {messages.length === 0 && <Overview />}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`w-full flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%]`}>
                  <PreviewMessage
                    chatId={id}
                    role={message.role}
                    content={message.content}
                    attachments={message.experimental_attachments}
                    toolInvocations={message.toolInvocations}
                  />
                </div>
              </div>
            ))}

            <div
              ref={messagesEndRef}
              className="shrink-0 min-w-[24px] min-h-[24px]"
            />
          </div>

          {/* Chat Input Area */}
          <div className="w-full border-t bg-white p-6">
            <form className="flex flex-row gap-2 relative items-end w-full max-w-[1200px] mx-auto">
              <MultimodalInput
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                onUploadPdf={() => setShowPdfList(true)}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
