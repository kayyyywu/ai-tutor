import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/app/(auth)/auth";
import { createPdfFile } from "@/db/prisma-queries";
import { PDFDocument } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    console.log("PDF upload request received");
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log("Unauthorized: No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", session.user.id);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    console.log("File received:", file ? { name: file.name, type: file.type, size: file.size } : "No file");
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), "uploads", "pdfs");
    const publicDir = join(process.cwd(), "public", "uploads", "pdfs");
    await mkdir(uploadDir, { recursive: true });
    await mkdir(publicDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filePath = join(uploadDir, filename);
    const publicFilePath = join(publicDir, filename);

    // Save file to both locations
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    await writeFile(publicFilePath, Buffer.from(bytes));

    // Get PDF page count
    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(bytes);
      pageCount = pdfDoc.getPageCount();
    } catch (error) {
      console.warn("Could not determine PDF page count:", error);
    }

    // Get chatId from request
    const chatId = request.headers.get("x-chat-id") || undefined;

    // Save to database
    const pdfFile = await createPdfFile({
      filename,
      originalName: file.name,
      filePath,
      fileSize: file.size,
      pageCount,
      userId: session.user.id,
      chatId,
    });

    return NextResponse.json({
      success: true,
      pdfFile: {
        id: pdfFile.id,
        filename: pdfFile.filename,
        originalName: pdfFile.originalName,
        fileSize: pdfFile.fileSize,
        pageCount: pdfFile.pageCount,
        uploadDate: pdfFile.uploadDate,
      },
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }
}
