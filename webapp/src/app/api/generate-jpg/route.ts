import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { takeScreenshot } from "@/lib/screenshot";
import { uploadJpg } from "@/lib/r2";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SECRET = process.env.RENDER_SECRET || "dev";

function authCheck(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  // Auth: CRON_SECRET (for batch) — user auth can be added later
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, queueId, subscriptionId } = body as {
    type: "greeting" | "shoken";
    queueId?: number;
    subscriptionId?: string;
  };

  try {
    if (type === "greeting" && queueId) {
      // Get user_id for the R2 key
      const row = await queryOne<{ user_id: string }>(
        "SELECT user_id FROM mailing_queue WHERE id = $1",
        [queueId]
      );
      if (!row) {
        return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
      }

      const url = `${BASE_URL}/render/greeting?queueId=${queueId}&secret=${SECRET}`;
      const buffer = await takeScreenshot(url);
      const key = `greeting/${row.user_id}/${queueId}.jpg`;
      const publicUrl = await uploadJpg(key, buffer);

      await query(
        "UPDATE mailing_queue SET greeting_jpg_url = $1 WHERE id = $2",
        [publicUrl, queueId]
      );

      return NextResponse.json({ url: publicUrl });
    }

    if (type === "shoken" && subscriptionId) {
      const url = `${BASE_URL}/render/shoken?subscriptionId=${subscriptionId}&secret=${SECRET}`;
      const buffer = await takeScreenshot(url);
      const key = `shoken/${subscriptionId}.jpg`;
      const publicUrl = await uploadJpg(key, buffer);

      await query(
        "UPDATE subscriptions SET shoken_jpg_url = $1 WHERE id = $2",
        [publicUrl, subscriptionId]
      );

      return NextResponse.json({ url: publicUrl });
    }

    return NextResponse.json({ error: "Invalid type or missing id" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-jpg error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
