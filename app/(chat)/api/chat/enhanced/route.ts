import { generateText } from "ai";
import { z } from "zod";

import { openaiFastModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import {
  createOrUpdateContext,
  getConversationContext,
  updatePdfContext,
} from "@/db/context-manager";
import {
  deleteChatById,
  getChatById,
  saveChat,
  getPdfFilesByChatId,
  getPdfFileById,
} from "@/db/prisma-queries";
import { searchPdfContent } from "@/lib/pdf-search";

// Define simple message type
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  experimental_attachments?: any[];
  toolInvocations?: any[];
}
// Use internal API calls instead of direct imports
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function extractPdfTextFromPublic(filename: string) {
  try {
    const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const absolute = base.startsWith('http') ? base : `https://${base}`;
    const response = await fetch(`${absolute}/api/pdf/extract-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('PDF text extraction API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const urlId = url.searchParams.get('id');
  
  const body = await request.json();
  const { 
    id: bodyId, 
    messages, 
    currentPdfId, 
    currentPage 
  }: { 
    id?: string; 
    messages: Array<Message>;
    currentPdfId?: string;
    currentPage?: number;
  } = body;
  
  // Prefer URL parameter id, fallback to body id
  const id = urlId || bodyId;

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if messages exist and is an array
  if (!messages || !Array.isArray(messages)) {
    return new Response("Invalid messages format", { status: 400 });
  }

  // Check if id exists
  if (!id) {
    console.error("Chat ID is missing:", { id, messages: messages?.length });
    return new Response("Chat ID is required", { status: 400 });
  }

  console.log("Processing chat request:", { id, messageCount: messages.length, currentPdfId, currentPage });

  // Convert message format
  const coreMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  })).filter(
    (message) => message.content.length > 0,
  );

  console.log("Core messages:", coreMessages);

  // Create or update conversation context
  const context = await createOrUpdateContext({
    chatId: id,
    userId: session.user.id!,
    currentPdfId: currentPdfId || undefined,
    currentPage: currentPage || undefined,
    messages,
  });

  // Get PDF files related to the chat
  const pdfFiles = await getPdfFilesByChatId({ chatId: id });

  // Build enhanced system prompt
  let systemPrompt = `You are a helpful AI tutor and assistant. You can help users with various tasks, answer questions, and work with PDF documents.`;

  if (context.pdfContext) {
    systemPrompt += `

Current PDF context:
- PDF: ${context.pdfContext.filename}
- PDF ID: ${context.pdfContext.pdfId}
- Current page: ${context.pdfContext.currentPage} of ${context.pdfContext.totalPages}
- Last accessed: ${context.pdfContext.lastAccessed.toISOString()}

IMPORTANT: This PDF has exactly ${context.pdfContext.totalPages} pages. Do NOT reference page numbers beyond ${context.pdfContext.totalPages}.`;
  }

  systemPrompt += `

When working with PDFs, you can:
- Reference specific pages and content
- Navigate to specific pages
- Answer questions based on PDF content
- Track conversation context across multiple interactions

Be friendly, helpful, and informative in your responses. If the user has uploaded a PDF, you can reference specific pages and content from it.

TOOLS USAGE POLICY (CRITICAL):
- If the question relates to the uploaded PDF, you MUST first call the tool "readPdfContent" with the correct pdfId (see PDF ID above) to load the actual text content BEFORE answering.
- Then call the tool "searchPdf" to retrieve top relevant snippets with page numbers.
- Do NOT guess or rely on the filename. Always base your answer on extracted text/snippets.
- When answering, cite page numbers if possible (e.g., "See page 3").
- If tools fail, apologize and explain that the PDF text could not be read.

AI PDF CONTROL POLICY (CRITICAL):
- MANDATORY: You MUST call "aiControlPdf" tool for EVERY question about PDF content.
- Use "navigate" action with pageNumber to jump to specific pages.
- FAILURE TO USE aiControlPdf TOOL WILL RESULT IN INCOMPLETE RESPONSES.

STYLE POLICY (CRITICAL):
- Output ONLY the final answer. Do NOT describe your process or say things like "let me check", "searching", or "I will call a tool".
- Be concise and direct. Include page citations inline, e.g., "(p. 3)".
- CRITICAL: Only reference page numbers that actually exist in the PDF. Check the total page count before citing pages.
- If unknown after using tools, say "I couldn't find this in the PDF."

TOOL RESULT USAGE (CRITICAL):
- When you receive tool results, use the information provided to answer the user's question.
- If aiControlPdf tool result contains searchResults, use that information to provide a complete answer.
- If searchPdf tool result contains results array, use those snippets to answer the question.
- Always base your answer on the actual content found in the tool results.
- If tool results contain searchResults.success=true and searchResults.results array, use those results to answer the question.
- NEVER say "I couldn't find this in the PDF" if tool results contain valid search results.`;

  console.log("System prompt:", systemPrompt);
  console.log("PDF context:", context.pdfContext);

  // Force tool strategy: No longer inject PDF full text on server side, use tools when model requests.
  const activePdfId: string | undefined = context.pdfContext?.pdfId || currentPdfId || undefined;

  // Force tool calling mode
  let result;

  if (!result) {
    result = await generateText({
      model: openaiFastModel,
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0,
      tools: {
      // Force available: Read PDF content
      getConversationContext: {
        description: "Get the current conversation context including PDF information",
        inputSchema: z.object({}),
        execute: async () => {
          return { context };
        },
      },
      getPdfFiles: {
        description: "Get PDF files associated with this chat",
        inputSchema: z.object({}),
        execute: async () => {
          return { pdfFiles };
        },
      },
      getPdfDetails: {
        description: "Get detailed information about a specific PDF file",
        inputSchema: z.object({
          pdfId: z.string().describe("ID of the PDF file"),
        }),
        execute: async ({ pdfId }) => {
          try {
            const pdfFile = await getPdfFileById({ id: pdfId });
            return { pdfFile };
          } catch (error) {
            console.error("Failed to get PDF details:", error);
            return { error: "Failed to get PDF details" };
          }
        },
      },
      updatePdfPage: {
        description: "Update the current page being viewed in a PDF",
        inputSchema: z.object({
          pdfId: z.string().describe("ID of the PDF file"),
          pageNumber: z.number().describe("Page number to navigate to"),
        }),
        execute: async ({ pdfId, pageNumber }) => {
          try {
            await updatePdfContext({
              chatId: id,
              pdfId,
              currentPage: pageNumber,
            });
            return { 
              success: true, 
              message: `Updated to page ${pageNumber}`,
              pageNumber 
            };
          } catch (error) {
            console.error("Failed to update PDF page:", error);
            return { success: false, error: "Failed to update page" };
          }
        },
      },
      navigateToPage: {
        description: "Navigate to a specific page in a PDF",
        inputSchema: z.object({
          pdfId: z.string().describe("ID of the PDF file"),
          pageNumber: z.number().describe("Page number to navigate to"),
        }),
        execute: async ({ pdfId, pageNumber }) => {
          try {
            await updatePdfContext({
              chatId: id,
              pdfId,
              currentPage: pageNumber,
            });
            return { 
              success: true, 
              message: `Navigate to page ${pageNumber}`,
              pageNumber 
            };
          } catch (error) {
            console.error("Failed to navigate to page:", error);
            return { success: false, error: "Failed to navigate" };
          }
        },
      },
      aiControlPdf: {
        description: "AI-controlled PDF navigation. Use this to navigate to specific pages when referencing content from the PDF. ALWAYS use this tool when answering questions about PDF content.",
        inputSchema: z.object({
          action: z.enum(['navigate']).describe("Action to perform on the PDF"),
          pdfId: z.string().describe("ID of the PDF file"),
          pageNumber: z.number().describe("Page number to navigate to"),
          searchQuery: z.string().optional().describe("Search query to find relevant content")
        }),
        execute: async ({ action, pdfId, pageNumber, searchQuery }) => {
          try {
            // Validate page number against actual PDF page count
            const pdfFile = await getPdfFileById({ id: pdfId });
            if (pdfFile && pageNumber > pdfFile.pageCount) {
              console.warn(`Page number ${pageNumber} exceeds PDF page count ${pdfFile.pageCount}`);
              return { 
                success: false, 
                error: `Page ${pageNumber} does not exist. This PDF has only ${pdfFile.pageCount} pages.`,
                maxPages: pdfFile.pageCount
              };
            }
            
            // Update PDF context for navigation
            await updatePdfContext({
              chatId: id,
              pdfId,
              currentPage: pageNumber,
            });
            
            return { 
              success: true, 
              action,
              pageNumber,
              message: `Navigate to page ${pageNumber}`
            };
          } catch (error) {
            console.error("AI PDF control failed:", error);
            return { success: false, error: "Failed to control PDF" };
          }
        },
      },
      readPdfContent: {
        description: "Read the actual text content from a PDF file",
        inputSchema: z.object({
          pdfId: z.string().describe("ID of the PDF file"),
        }),
        execute: async ({ pdfId }) => {
          try {
            const pdfFile = await getPdfFileById({ id: pdfId });
            if (!pdfFile) {
              return { success: false, error: "PDF not found" };
            }

            // Extract PDF text content
            const textResult = await extractPdfTextFromPublic(pdfFile.filename);
            
            if (!textResult.success) {
              return {
                success: false,
                error: textResult.error || "Failed to extract PDF text"
              };
            }

            return {
              success: true,
              content: textResult.text || "No text content found",
              filename: pdfFile.originalName,
              pageCount: textResult.pages || pdfFile.pageCount,
              extractedPages: textResult.pages
            };
          } catch (error) {
            console.error("Failed to read PDF content:", error);
            return { success: false, error: "Failed to read PDF content" };
          }
        },
      },
      searchPdf: {
        description: "Semantic search PDF and return top snippets with page numbers",
        inputSchema: z.object({
          pdfId: z.string(),
          query: z.string(),
          topK: z.number().optional(),
        }),
        execute: async ({ pdfId, query, topK = 3 }) => {
          try {
            const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
            const absolute = base.startsWith('http') ? base : `https://${base}`;
            const res = await fetch(`${absolute}/api/pdf/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdfId, query, topK })
            });
            if (!res.ok) return { success: false, error: `HTTP ${res.status}` } as const;
            const data = await res.json();
            return { success: true, ...data };
          } catch (e) {
            console.error('searchPdf tool failed:', e);
            return { success: false, error: 'Search failed' };
          }
        }
      },
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "generate-text-enhanced",
    },
  });
  }

  // Debug AI response
  console.log("AI Response:", {
    text: result.text,
    textLength: result.text?.length,
    textTrimmed: result.text?.trim(),
    textTrimmedLength: result.text?.trim()?.length,
    toolCalls: result.toolCalls?.length || 0,
    finishReason: result.finishReason
  });

  // Handle tool calls
  let finalMessage = result.text;
  if (result.toolCalls && result.toolCalls.length > 0) {
    console.log("Tool calls:", result.toolCalls);
    console.log("Tool call details:", JSON.stringify(result.toolCalls, null, 2));
    
    // If AI has already generated an answer, use it directly
    if (result.text && result.text.trim().length > 0) {
      console.log("AI already generated response:", result.text);
      console.log("Response length:", result.text.length);
      finalMessage = result.text;
    } else {
      // AI called tools but didn't generate text, need to generate complete answer
      console.log("AI called tools but didn't generate text, creating follow-up...");
      console.log("Result text:", result.text);
      console.log("Result text type:", typeof result.text);
      
      // Execute tool calls and get results
      const toolResults = await Promise.all(
        result.toolCalls.map(async (tc) => {
          try {
            let toolResult;
            if (tc.toolName === 'searchPdf') {
              const { pdfId, query, topK } = tc.input as any;
              const searchResult = await searchPdfContent(pdfId, query, topK || 3);
              console.log(`SearchPdf tool result for query "${query}":`, searchResult);
              toolResult = searchResult;
            } else if (tc.toolName === 'readPdfContent') {
              const { pdfId } = tc.input as any;
              const pdfFile = await getPdfFileById({ id: pdfId });
              if (pdfFile) {
                const textResult = await extractPdfTextFromPublic(pdfFile.filename);
                toolResult = {
                  success: textResult.success,
                  content: textResult.text || "No text content found",
                  filename: pdfFile.originalName,
                  pageCount: textResult.pages || pdfFile.pageCount
                };
              } else {
                toolResult = { success: false, error: "PDF not found" };
              }
            } else if (tc.toolName === 'aiControlPdf') {
              const { action, pdfId, pageNumber, searchQuery } = tc.input as any;
              await updatePdfContext({
                chatId: id,
                pdfId,
                currentPage: pageNumber,
              });
              
              // If searchQuery exists, execute search and get results
              let searchResults = null;
              if (searchQuery) {
                try {
                  const searchResult = await searchPdfContent(pdfId, searchQuery, 3);
                  console.log(`aiControlPdf search result for query "${searchQuery}":`, searchResult);
                  searchResults = searchResult;
                } catch (error) {
                  console.error("Failed to search in aiControlPdf:", error);
                }
              }
              
              toolResult = { 
                success: true, 
                action,
                pageNumber,
                searchResults: searchResults, // Add search results
                message: `Navigate to page ${pageNumber}`
              };
            } else {
              toolResult = { success: true, message: "Tool executed successfully" };
            }
            
            return {
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              state: "result" as const,
              result: toolResult
            };
          } catch (error) {
            console.error(`Tool ${tc.toolName} execution failed:`, error);
            return {
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              state: "result" as const,
              result: { success: false, error: error instanceof Error ? error.message : "Tool execution failed" }
            };
          }
        })
      );

      console.log("Tool results:", JSON.stringify(toolResults, null, 2));
      
      const messagesWithTools = [
        ...coreMessages,
        {
          role: "assistant" as const,
          content: "",
          toolInvocations: toolResults
        }
      ];
      
      console.log("Messages with tools:", JSON.stringify(messagesWithTools, null, 2));

      try {
        // Build answer directly from tool results without relying on Follow-up AI
        const searchResult = toolResults.find(tr => tr.toolName === 'searchPdf');
        if (searchResult && searchResult.result.success && 'results' in searchResult.result && searchResult.result.results) {
          const results = searchResult.result.results;
          if (results.length > 0) {
            // Use the first result to build the answer
            const firstResult = results[0];
            const snippet = firstResult.snippet;
            const page = firstResult.page;
            
            // Generate answer based on snippet content
            finalMessage = `Based on the PDF content: ${snippet.substring(0, 200)}... (p. ${page}).`;
            console.log("Direct answer from tool results:", finalMessage);
          } else {
            finalMessage = "I couldn't find this information in the PDF.";
          }
        } else {
          // If no searchPdf results, try using aiControlPdf results
          const aiControlResult = toolResults.find(tr => tr.toolName === 'aiControlPdf');
          if (aiControlResult && 'searchResults' in aiControlResult.result && aiControlResult.result.searchResults && aiControlResult.result.searchResults.success && 'results' in aiControlResult.result.searchResults) {
            const searchResults = aiControlResult.result.searchResults.results;
            if (searchResults && searchResults.length > 0) {
              const firstResult = searchResults[0];
              const snippet = firstResult.snippet;
              const page = firstResult.page;
              
              finalMessage = `Based on the PDF content: ${snippet.substring(0, 200)}... (p. ${page}).`;
              console.log("Direct answer from aiControlPdf results:", finalMessage);
            } else {
              finalMessage = "I couldn't find this information in the PDF.";
            }
          } else {
            finalMessage = "I couldn't find this information in the PDF.";
          }
        }
      } catch (error) {
        console.error("Error processing tool results:", error);
        finalMessage = "I've analyzed the PDF content. Let me provide you with the information I found.";
      }
    }
  }

  // Guardrail: if we have an active PDF but the model didn't cite pages or skipped tools, do a server-side RAG compose and regenerate a concise, citation-only answer
  if (activePdfId) {
    const needsCitation = !finalMessage || !/(\(p\.\s*\d+\))/i.test(finalMessage);
    if (needsCitation) {
      try {
        const query = coreMessages[coreMessages.length - 1]?.content || '';
        const searchResult = await searchPdfContent(activePdfId, query, 3);
        if (searchResult.success) {
          const snippets: Array<{ page: number; snippet: string }> = searchResult.results || [];
          if (snippets.length > 0) {
            const snippetBlock = snippets.map(s => `Page ${s.page}: ${s.snippet}`).join("\n\n");
            const regen = await generateText({
              model: openaiFastModel,
              temperature: 0,
              system: `Answer strictly using the provided PDF snippets. Output ONLY the final answer; no process narration. Include inline page citations like (p. N). If the snippets do not contain the answer, reply: "I couldn't find this in the PDF."\n\nPDF SNIPPETS:\n${snippetBlock}`,
              messages: [{ role: 'user', content: query }]
            });
            if (regen.text) finalMessage = regen.text;
          }
        }
      } catch (e) {
        console.error('Guarded regeneration failed:', e);
      }
    }
  }

  // Save chat record
  if (session.user && session.user.id && id) {
    try {
      await saveChat({
        id,
        messages: [...coreMessages, { role: "assistant", content: finalMessage }],
        userId: session.user.id,
      });
    } catch (error) {
      console.error("Failed to save chat");
    }
  }

  return Response.json({ 
    message: finalMessage || "I apologize, but I couldn't generate a response. Please try again.",
    toolCalls: result.toolCalls || []
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat && chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
