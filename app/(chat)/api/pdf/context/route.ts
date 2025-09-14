import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getConversationContext,
  updatePdfContext,
} from "@/db/context-manager";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }

    const context = await getConversationContext(chatId);

    if (!context) {
      return NextResponse.json({ error: "Context not found" }, { status: 404 });
    }

    return NextResponse.json({ context });
  } catch (error) {
    console.error("Get PDF context error:", error);
    return NextResponse.json(
      { error: "Failed to get PDF context" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, pdfId, currentPage } = await request.json();

    if (!chatId || !pdfId || !currentPage) {
      return NextResponse.json({ 
        error: "Chat ID, PDF ID, and current page are required" 
      }, { status: 400 });
    }

    await updatePdfContext({
      chatId,
      pdfId,
      currentPage,
    });

    return NextResponse.json({ 
      success: true,
      message: "PDF context updated successfully" 
    });
  } catch (error) {
    console.error("Update PDF context error:", error);
    return NextResponse.json(
      { error: "Failed to update PDF context" },
      { status: 500 }
    );
  }
}
