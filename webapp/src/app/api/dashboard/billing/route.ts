import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne, query } from "@/lib/db";

export async function GET() {
  try {
    const userId = await requireAuth();

    const profile = await queryOne<{ balance: number }>(
      "SELECT balance FROM profiles WHERE id = $1",
      [userId]
    );

    const usageResult = await query(
      `SELECT id, year_month, total_sent, total_amount, stripe_invoice_id,
              payment_status, paid_at, created_at, updated_at
         FROM monthly_usage
        WHERE user_id = $1
        ORDER BY year_month DESC`,
      [userId]
    );

    return NextResponse.json({
      balance: profile?.balance || 0,
      usages: usageResult.rows,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[dashboard/billing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
