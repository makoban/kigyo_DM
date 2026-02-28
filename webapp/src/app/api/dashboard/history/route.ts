import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { query } from "@/lib/db";
import type { Corporation } from "@/lib/types";

export interface HistoryItem {
  id: number;
  status: string;
  scheduled_date: string;
  sent_at: string | null;
  unit_price: number;
  corporations: Corporation;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
    }

    const result = await query<{
      id: number;
      status: string;
      scheduled_date: string;
      sent_at: string | null;
      unit_price: number;
      corporation: Corporation;
    }>(
      `SELECT mq.id,
              mq.status,
              mq.scheduled_date,
              mq.sent_at,
              mq.unit_price,
              row_to_json(c.*) AS corporation
         FROM mailing_queue mq
         JOIN corporations c ON mq.corporation_id = c.id
        WHERE mq.user_id = $1
          AND mq.status = 'sent'
          AND mq.scheduled_date >= $2
          AND mq.scheduled_date <= $3
        ORDER BY mq.scheduled_date DESC`,
      [userId, `${month}-01`, `${month}-31`]
    );

    // Map corporation (row_to_json key) to corporations (UI expects this key)
    const items: HistoryItem[] = result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      scheduled_date: row.scheduled_date,
      sent_at: row.sent_at,
      unit_price: row.unit_price,
      corporations: row.corporation,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[dashboard/history]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
