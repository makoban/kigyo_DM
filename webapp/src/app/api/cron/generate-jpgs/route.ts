import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { takeScreenshot } from "@/lib/screenshot";
import { uploadJpg } from "@/lib/r2";

export const maxDuration = 60;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SECRET = process.env.RENDER_SECRET || "dev";
const BATCH_LIMIT = 20;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let greetingCount = 0;
  let shokenCount = 0;
  const errors: string[] = [];

  try {
    // 1. Generate missing shoken report JPGs (per subscription)
    const subs = await query<{ id: string; area_label: string }>(
      `SELECT id, area_label FROM subscriptions
       WHERE status = 'active'
         AND shoken_data IS NOT NULL
         AND shoken_jpg_url IS NULL
       LIMIT $1`,
      [BATCH_LIMIT]
    );

    for (const sub of subs.rows) {
      try {
        const url = `${BASE_URL}/render/shoken?subscriptionId=${sub.id}&secret=${SECRET}`;
        const buffer = await takeScreenshot(url);
        const key = `shoken/${sub.id}.jpg`;
        const publicUrl = await uploadJpg(key, buffer);
        await query("UPDATE subscriptions SET shoken_jpg_url = $1 WHERE id = $2", [publicUrl, sub.id]);
        shokenCount++;
        console.log(`Shoken JPG generated: ${sub.area_label}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown";
        errors.push(`shoken/${sub.id}: ${msg}`);
        console.error(`Shoken JPG error (${sub.id}):`, msg);
      }
    }

    // 2. Generate missing greeting JPGs (per queue item)
    const items = await query<{ id: number; user_id: string }>(
      `SELECT id, user_id FROM mailing_queue
       WHERE greeting_jpg_url IS NULL
         AND status IN ('pending', 'confirmed', 'ready_to_send')
       ORDER BY id ASC
       LIMIT $1`,
      [BATCH_LIMIT]
    );

    for (const item of items.rows) {
      try {
        const url = `${BASE_URL}/render/greeting?queueId=${item.id}&secret=${SECRET}`;
        const buffer = await takeScreenshot(url);
        const key = `greeting/${item.user_id}/${item.id}.jpg`;
        const publicUrl = await uploadJpg(key, buffer);
        await query("UPDATE mailing_queue SET greeting_jpg_url = $1 WHERE id = $2", [publicUrl, item.id]);
        greetingCount++;
        console.log(`Greeting JPG generated: queue #${item.id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown";
        errors.push(`greeting/${item.id}: ${msg}`);
        console.error(`Greeting JPG error (#${item.id}):`, msg);
      }
    }

    return NextResponse.json({
      success: true,
      generated: { shoken: shokenCount, greeting: greetingCount },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-jpgs cron error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
