import { NextRequest, NextResponse } from "next/server";
import { getPdfFileById } from "@/db/prisma-queries";
import { auth } from "@/app/(auth)/auth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function extractText(filename: string) {
  const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const absolute = base.startsWith('http') ? base : `https://${base}`;
  const res = await fetch(`${absolute}/api/pdf/extract-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` } as const;
  return (await res.json()) as { success: boolean; text?: string; pages?: number };
}

function tokenize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function score(query: string, text: string) {
  const q = new Set(tokenize(query));
  const t = tokenize(text);
  let hits = 0;
  for (const w of t) if (q.has(w)) hits++;
  return hits / Math.max(1, t.length);
}

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pdfId, query, topK = 3 } = await req.json();
    if (!pdfId || !query) return NextResponse.json({ error: 'pdfId and query required' }, { status: 400 });

    const pdf = await getPdfFileById({ id: pdfId });
    if (!pdf || pdf.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const textRes = await extractText(pdf.filename);
    if (!textRes.success || !textRes.text) return NextResponse.json({ error: 'Extract failed' }, { status: 500 });

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

    return NextResponse.json({ success: true, results: ranked, totalPages: pages.length });
  } catch (e) {
    console.error('RAG search error:', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}


