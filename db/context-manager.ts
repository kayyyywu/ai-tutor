import "server-only";
import { prisma } from "../lib/prisma";

// Define simple message type
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  experimental_attachments?: any[];
  toolInvocations?: any[];
}

// Conversation context management
export interface ConversationContext {
  chatId: string;
  userId: string;
  currentPdfId?: string;
  currentPage?: number;
  recentMessages: Message[];
  pdfContext?: {
    pdfId: string;
    filename: string;
    currentPage: number;
    totalPages: number;
    lastAccessed: Date;
  };
  sessionData?: {
    startTime: Date;
    lastActivity: Date;
    messageCount: number;
  };
}

// Create or update conversation context
export async function createOrUpdateContext({
  chatId,
  userId,
  currentPdfId,
  currentPage,
  messages,
}: {
  chatId: string;
  userId: string;
  currentPdfId?: string;
  currentPage?: number;
  messages: Message[];
}): Promise<ConversationContext> {
  try {
    // Get or create chat record
    let chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        pdfs: true,
        user: true
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          id: chatId,
          userId,
          messages: messages as any,
        },
        include: {
          pdfs: true,
          user: true
        }
      });
    } else {
      // Update messages
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          messages: messages as any,
        }
      });
    }

    // Get PDF context
    let pdfContext = undefined;
    if (currentPdfId) {
      const pdfFile = await prisma.pdfFile.findUnique({
        where: { id: currentPdfId }
      });

      if (pdfFile) {
        pdfContext = {
          pdfId: pdfFile.id,
          filename: pdfFile.originalName,
          currentPage: currentPage || 1,
          totalPages: pdfFile.pageCount,
          lastAccessed: new Date(),
        };
      }
    }

    // Build context
    const context: ConversationContext = {
      chatId,
      userId,
      currentPdfId,
      currentPage,
      recentMessages: messages.slice(-10), // Keep last 10 messages
      pdfContext,
      sessionData: {
        startTime: chat.createdAt,
        lastActivity: new Date(),
        messageCount: messages.length,
      }
    };

    return context;
  } catch (error) {
    console.error("Failed to create/update context:", error);
    throw error;
  }
}

// Get conversation context
export async function getConversationContext(chatId: string): Promise<ConversationContext | null> {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        pdfs: {
          orderBy: { uploadDate: 'desc' },
          take: 1
        },
        user: true
      }
    });

    if (!chat) return null;

    const messages = Array.isArray(chat.messages) ? chat.messages : [];
    const currentPdf = chat.pdfs[0];

    return {
      chatId,
      userId: chat.userId,
      currentPdfId: currentPdf?.id,
      currentPage: 1,
      recentMessages: messages.slice(-10) as unknown as Message[],
      pdfContext: currentPdf ? {
        pdfId: currentPdf.id,
        filename: currentPdf.originalName,
        currentPage: 1,
        totalPages: currentPdf.pageCount,
        lastAccessed: currentPdf.uploadDate,
      } : undefined,
      sessionData: {
        startTime: chat.createdAt,
        lastActivity: new Date(),
        messageCount: messages.length,
      }
    };
  } catch (error) {
    console.error("Failed to get conversation context:", error);
    return null;
  }
}

// Update PDF context
export async function updatePdfContext({
  chatId,
  pdfId,
  currentPage,
}: {
  chatId: string;
  pdfId: string;
  currentPage: number;
}): Promise<void> {
  try {
    // Ensure PDF is associated with chat
    await prisma.pdfFile.update({
      where: { id: pdfId },
      data: { chatId }
    });

    // Can add page access records here
    console.log(`Updated PDF context: Chat ${chatId}, PDF ${pdfId}, Page ${currentPage}`);
  } catch (error) {
    console.error("Failed to update PDF context:", error);
    throw error;
  }
}

// Get user's complete conversation history
export async function getUserConversationHistory(userId: string, limit: number = 50) {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId },
      include: {
        pdfs: {
          select: {
            id: true,
            originalName: true,
            uploadDate: true,
            pageCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return chats.map((chat: any) => ({
      id: chat.id,
      createdAt: chat.createdAt,
      messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
      pdfs: chat.pdfs,
      lastMessage: Array.isArray(chat.messages) && chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1] 
        : null
    }));
  } catch (error) {
    console.error("Failed to get user conversation history:", error);
    throw error;
  }
}

// Search conversation history
export async function searchConversationHistory({
  userId,
  query,
  pdfId,
  dateRange,
}: {
  userId: string;
  query?: string;
  pdfId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}) {
  try {
    const whereClause: any = { userId };

    if (pdfId) {
      whereClause.pdfs = {
        some: { id: pdfId }
      };
    }

    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const chats = await prisma.chat.findMany({
      where: whereClause,
      include: {
        pdfs: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // If search query is provided, filter message content
    if (query) {
      return chats.filter((chat: any) => {
        const messages = Array.isArray(chat.messages) ? chat.messages : [];
        return messages.some((message: any) => 
          message.content && message.content.toLowerCase().includes(query.toLowerCase())
        );
      });
    }

    return chats;
  } catch (error) {
    console.error("Failed to search conversation history:", error);
    throw error;
  }
}

// Clean up old conversation data
export async function cleanupOldConversations(daysToKeep: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.chat.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`Cleaned up ${result.count} old conversations`);
    return result.count;
  } catch (error) {
    console.error("Failed to cleanup old conversations:", error);
    throw error;
  }
}
