import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id, reason } = (await req.json()) as {
      id: number;
      reason?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const cancelReason = reason || "ユーザーキャンセル";

    // Verify the item belongs to this user before cancelling.
    // Only pending/confirmed items can be cancelled.
    const result = await query(
      `UPDATE mailing_queue
         SET status = 'cancelled',
             cancelled_at = NOW(),
             cancel_reason = $1
       WHERE id = $2
         AND user_id = $3
         AND status IN ('pending', 'confirmed')`,
      [cancelReason, id, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "対象のアイテムが見つからないか、変更できない状態です" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[cancel-item]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
