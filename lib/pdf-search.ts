import fs from 'fs';
import path from 'path';

import { getPdfFileById } from "@/db/prisma-queries";

// Direct PDF text extraction function
async function extractPdfTextDirect(filename: string) {
  try {
    const pdfPath = path.join(process.cwd(), 'public', 'uploads', 'pdfs', filename);
    const resolvedPath = path.resolve(pdfPath) as string;
    
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: 'PDF file not found' };
    }

    const pdf = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(resolvedPath);
    const data = await pdf.default(dataBuffer);

    return {
      success: true,
      text: data.text,
      pages: data.numpages || 1,
    };
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Tokenize function
function tokenize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ').split(/\s+/).filter(Boolean);
}

// Score function
function score(query: string, text: string) {
  const q = new Set(tokenize(query));
  const t = tokenize(text);
  let hits = 0;
  for (const w of t) if (q.has(w)) hits++;
  return hits / Math.max(1, t.length);
}

// Semantic ranking function
async function semanticRank(query: string, pages: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const inputs = [query, ...pages];
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: inputs })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const vectors: number[][] = data.data.map((d: any) => d.embedding);
    const qVec = vectors[0];
    const pageVecs = vectors.slice(1);
    const sims = pageVecs.map((v: number[], i: number) => ({ i, sim: cosine(qVec, v) }));
    return sims.sort((a,b)=>b.sim-a.sim);
  } catch {
    return null;
  }
}

function cosine(a: number[], b: number[]) {
  let dot=0, na=0, nb=0;
  for (let i=0;i<a.length;i++){ const x=a[i], y=b[i]; dot+=x*y; na+=x*x; nb+=y*y; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) || 1);
}

// Main search function
export async function searchPdfContent(pdfId: string, query: string, topK: number = 3) {
  try {
    const pdf = await getPdfFileById({ id: pdfId });
    if (!pdf) {
      return { success: false, error: 'PDF not found' };
    }

    const textRes = await extractPdfTextDirect(pdf.filename);
    if (!textRes.success || !textRes.text) {
      return { success: false, error: 'Extract failed' };
    }

    // Split pages by form-feed if present, otherwise estimate page breaks
    let pages: string[];
    if (textRes.text.includes('\f')) {
      pages = textRes.text.split('\f');
    } else {
      // Estimate page breaks based on content length and natural break points
      const totalText = textRes.text;
      const totalPages = textRes.pages || 1;
      const avgCharsPerPage = Math.floor(totalText.length / totalPages);
      
      pages = [];
      let currentPos = 0;
      
      for (let i = 0; i < totalPages; i++) {
        const startPos = currentPos;
        let endPos = Math.min(currentPos + avgCharsPerPage, totalText.length);
        
        // Try to find a good break point (end of sentence or paragraph)
        if (i < totalPages - 1) {
          const searchStart = Math.max(startPos, endPos - 200);
          const searchEnd = Math.min(endPos + 200, totalText.length);
          const searchText = totalText.substring(searchStart, searchEnd);
          
          // Look for sentence endings
          const sentenceEnd = searchText.lastIndexOf('. ');
          const paragraphEnd = searchText.lastIndexOf('\n\n');
          
          if (sentenceEnd > -1) {
            endPos = searchStart + sentenceEnd + 1;
          } else if (paragraphEnd > -1) {
            endPos = searchStart + paragraphEnd + 2;
          }
        } else {
          endPos = totalText.length;
        }
        
        pages.push(totalText.substring(startPos, endPos).trim());
        currentPos = endPos;
      }
    }

    let ranked: Array<{page:number; snippet:string}> = [];
    const sem = await semanticRank(query, pages);
    if (sem) {
      ranked = sem.slice(0, Math.min(topK, pages.length)).map(r => ({ page: r.i + 1, snippet: pages[r.i].trim().slice(0, 1200) }));
    } else {
      ranked = pages.map((p, idx) => ({ page: idx + 1, text: p.trim(), s: score(query, p) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, Math.min(topK, pages.length))
        .map(r => ({ page: r.page, snippet: r.text.slice(0, 1200) }));
    }

    return { success: true, results: ranked, totalPages: pages.length };
  } catch (e) {
    console.error('PDF search error:', e);
    return { success: false, error: 'Search failed' };
  }
}
