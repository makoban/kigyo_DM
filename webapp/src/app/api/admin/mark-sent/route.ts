import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: number[] = body.ids || (body.id ? [body.id] : []);

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    const result = await query(
      `UPDATE mailing_queue
       SET status = 'sent', sent_at = $1
       WHERE id = ANY($2)
         AND status = ANY($3)
       RETURNING id`,
      [new Date().toISOString(), ids, ["pending", "confirmed", "ready_to_send"]]
    );

    return NextResponse.json({
      success: true,
      updated: result.rowCount ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark as sent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
