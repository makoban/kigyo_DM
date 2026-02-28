import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lock tomorrow's pending items → confirmed
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  try {
    const result = await query(
      "UPDATE mailing_queue SET status = 'confirmed' WHERE status = 'pending' AND scheduled_date = $1 RETURNING id",
      [tomorrowStr]
    );

    return NextResponse.json({
      success: true,
      lockedCount: result.rowCount ?? 0,
      date: tomorrowStr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
