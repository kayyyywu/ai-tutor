"use client";

// Define simple types
interface Attachment {
  name: string;
  contentType: string;
  url: string;
}

interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  state: string;
  result?: any;
}
import { motion } from "framer-motion";
import { ReactNode } from "react";

import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown";
import { PreviewAttachment } from "./preview-attachment";

export const Message = ({
  chatId,
  role,
  content,
  toolInvocations,
  attachments,
}: {
  chatId: string;
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
}) => {
  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20 ${
        role === 'user' ? 'flex-row-reverse' : ''
      }`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className={`flex flex-col gap-2 w-full ${role === 'user' ? 'text-right' : ''}`}>
        {content && typeof content === "string" && (
          <div className="text-zinc-800 dark:text-zinc-300">
            <div className={`flex items-center ${role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              <div className={`${role === 'user' ? 'text-right' : ''}`}>
                <Markdown>{content}</Markdown>
              </div>
            </div>
          </div>
        )}

        {toolInvocations && (
          <div className={`flex flex-col gap-4 ${role === 'user' ? 'items-end' : ''}`}>
            {toolInvocations.map((toolInvocation) => {
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === "result") {
                const { result } = toolInvocation;

                // Special handling for PDF-related tool calls
                if (toolName === "highlightPdfContent" && result.success) {
                  return (
                    <div key={toolCallId}>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-sm text-yellow-800 mb-2">
                          📝 PDF Annotation Created
                        </div>
                        <div className="text-sm text-yellow-700">
                          Highlighted content on page {result.annotation.pageNumber}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (toolName === "navigateToPage" && result.success) {
                  return (
                    <div key={toolCallId}>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-800 mb-2">
                          📄 PDF Navigation
                        </div>
                        <div className="text-sm text-blue-700">
                          Navigated to page {result.pageNumber}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (toolName === "getPdfFiles") {
                  return (
                    <div key={toolCallId}>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-sm text-green-800 mb-2">
                          📚 PDF Files Available
                        </div>
                        <div className="text-sm text-green-700">
                          {result.pdfFiles?.length > 0 
                            ? `Found ${result.pdfFiles.length} PDF file(s)`
                            : "No PDF files uploaded yet"
                          }
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={toolCallId}>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        Tool: {toolName}
                      </div>
                      <div className="text-sm">
                        {JSON.stringify(result, null, 2)}
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={toolCallId} className="skeleton">
                    <div className="bg-muted/30 rounded-lg p-4 animate-pulse">
                      <div className="text-sm text-muted-foreground">
                        Loading {toolName}...
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}

        {attachments && (
          <div className={`flex flex-row gap-2 ${role === 'user' ? 'justify-end' : ''}`}>
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
