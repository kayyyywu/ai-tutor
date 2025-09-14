import { NextRequest, NextResponse } from "next/server";
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';

// PDF text extraction (text layer only, scanned documents not supported)
async function extractPdfText(pdfPath: string, filename: string) {
  try {
    // Use path.resolve to ensure the path is properly resolved
    const resolvedPath = path.resolve(pdfPath) as string;
    const fileExists = fs.existsSync(resolvedPath);
    if (!fileExists) {
      return { success: false, error: 'PDF file not found' };
    }

    try {
      const pdf = await import('pdf-parse');
      const dataBuffer = fs.readFileSync(resolvedPath);
      const data = await pdf.default(dataBuffer);

      return {
        success: true,
        text: data.text,
        pages: data.numpages || 1,
      };
    } catch (pdfError) {
      console.log('PDF-parse failed:', pdfError);
      return {
        success: false,
        error: `Failed to extract text from PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Prioritize reading from uploads directory, fallback to public directory if not found
    let pdfPath = path.join(process.cwd(), 'uploads', 'pdfs', filename);
    if (!fs.existsSync(pdfPath)) {
      pdfPath = path.join(process.cwd(), 'public', 'uploads', 'pdfs', filename);
    }

    console.log('Extracting text from PDF:', filename);
    const result = await extractPdfText(pdfPath, filename);

    if (result.success) {
      return NextResponse.json({
        success: true,
        text: result.text,
        pages: result.pages,
        filename,
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('PDF text extraction API error:', error);
    return NextResponse.json({ error: 'Failed to extract PDF text' }, { status: 500 });
  }
}
