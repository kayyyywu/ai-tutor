import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getPdfFileById } from "@/db/prisma-queries";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pdfId, chatId } = await request.json();

    if (!pdfId || !chatId) {
      return NextResponse.json({ error: "PDF ID and Chat ID are required" }, { status: 400 });
    }

    // Verify PDF file exists and belongs to current user
    const pdfFile = await getPdfFileById({ id: pdfId });
    if (!pdfFile) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    if (pdfFile.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Ensure Chat exists
    const existingChat = await prisma.chat.findUnique({
      where: { id: chatId }
    });
    
    if (!existingChat) {
      // Create Chat record
      await prisma.chat.create({
        data: {
          id: chatId,
          userId: session.user.id,
          messages: []
        }
      });
    }

    // Associate PDF with chat
    await prisma.pdfFile.update({
      where: { id: pdfId },
      data: { chatId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Associate PDF error:", error);
    return NextResponse.json(
      { error: "Failed to associate PDF with chat" },
      { status: 500 }
    );
  }
}
