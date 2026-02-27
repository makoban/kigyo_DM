import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE = "https://house-search-proxy.ai-fudosan.workers.dev";

// Server-side proxy to avoid CORS issues with the shared Worker API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, prefCode, prompt } = body;

    if (type === "estat") {
      const url = `${WORKER_BASE}/api/estat/population?statsDataId=0003448233&cdArea=${prefCode}000&limit=100`;
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: "e-Stat API error" },
          { status: res.status }
        );
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (type === "gemini") {
      const res = await fetch(`${WORKER_BASE}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: "Gemini API error" },
          { status: res.status }
        );
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
