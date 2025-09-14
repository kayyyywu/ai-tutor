import "server-only";

import { genSaltSync, hashSync, compareSync } from "bcrypt-ts";
import { prisma } from "../lib/prisma";
// Define local Message type
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  experimental_attachments?: any[];
  toolInvocations?: any[];
}

// User operations
export async function getUserByEmail(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        chats: {
          orderBy: { createdAt: 'desc' }
        },
        // reservations: {
        //   orderBy: { createdAt: 'desc' }
        // }
      }
    });
  } catch (error) {
    console.error("Failed to get user from database:", error);
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  try {
    const salt = genSaltSync(10);
    const hashedPassword = hashSync(password, salt);
    
    return await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}

export async function verifyUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !user.password) {
      return null;
    }
    
    const isValid = compareSync(password, user.password);
    return isValid ? user : null;
  } catch (error) {
    console.error("Failed to verify user:", error);
    throw error;
  }
}

// Chat operations
export async function createChat(userId: string, messages: Message[]) {
  try {
    return await prisma.chat.create({
      data: {
        userId,
        messages: messages as any, // Prisma handles JSON serialization
      },
    });
  } catch (error) {
    console.error("Failed to create chat:", error);
    throw error;
  }
}

export async function saveChat({
  id,
  messages,
  userId,
}: {
  id: string;
  messages: any;
  userId: string;
}) {
  try {
    const existingChat = await prisma.chat.findUnique({
      where: { id }
    });

    if (existingChat) {
      return await prisma.chat.update({
        where: { id },
        data: {
          messages: messages as any,
        },
      });
    }

    return await prisma.chat.create({
      data: {
        id,
        userId,
        messages: messages as any,
      },
    });
  } catch (error) {
    console.error("Failed to save chat:", error);
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await prisma.chat.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error("Failed to get chats:", error);
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    return await prisma.chat.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to get chat:", error);
    throw error;
  }
}

export async function updateChatMessages(chatId: string, messages: Message[]) {
  try {
    return await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: messages as any,
      },
    });
  } catch (error) {
    console.error("Failed to update chat messages:", error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    return await prisma.chat.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to delete chat:", error);
    throw error;
  }
}

// PDF file operations
export async function createPdfFile({
  filename,
  originalName,
  filePath,
  fileSize,
  pageCount,
  userId,
  chatId,
}: {
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  pageCount: number;
  userId: string;
  chatId?: string;
}) {
  try {
    // If chatId is provided, check if chat exists first
    let validChatId = null;
    if (chatId) {
      try {
        const chat = await (prisma as any).chat.findUnique({
          where: { id: chatId }
        });
        if (chat) {
          validChatId = chatId;
        } else {
          console.warn(`Chat with id ${chatId} not found, setting chatId to null`);
        }
      } catch (error) {
        console.warn(`Error checking chat existence: ${error}, setting chatId to null`);
      }
    }

    return await (prisma as any).pdfFile.create({
      data: {
        filename,
        originalName,
        filePath,
        fileSize,
        pageCount,
        userId,
        chatId: validChatId,
      },
    });
  } catch (error) {
    console.error("Failed to create PDF file:", error);
    throw error;
  }
}

export async function getPdfFileById({ id }: { id: string }) {
  try {
    return await (prisma as any).pdfFile.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error("Failed to get PDF file:", error);
    throw error;
  }
}

export async function getPdfFilesByUserId({ userId }: { userId: string }) {
  try {
    return await (prisma as any).pdfFile.findMany({
      where: { userId },
      orderBy: { uploadDate: 'desc' },
    });
  } catch (error) {
    console.error("Failed to get PDF files:", error);
    throw error;
  }
}

export async function getPdfFilesByChatId({ chatId }: { chatId: string }) {
  try {
    return await (prisma as any).pdfFile.findMany({
      where: { chatId },
      orderBy: { uploadDate: 'desc' },
    });
  } catch (error) {
    console.error("Failed to get PDF files by chat:", error);
    return [];
  }
}

export async function deletePdfFileById({ id }: { id: string }) {
  try {
    return await (prisma as any).pdfFile.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to delete PDF file:", error);
    throw error;
  }
}


// Database health check
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
