import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deletePdfFileById } from "@/db/prisma-queries";
import fs from "fs";
import path from "path";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get("id");

    if (!pdfId) {
      return NextResponse.json({ error: "PDF ID is required" }, { status: 400 });
    }

    // Get PDF info before deleting from database
    const pdf = await deletePdfFileById({ id: pdfId });
    
    if (pdf && pdf.filePath) {
      // Delete the actual file
      const filePath = path.join(process.cwd(), pdf.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF" },
      { status: 500 }
    );
  }
}