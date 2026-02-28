import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne } from "@/lib/db";

// POST /api/dashboard/pause-subscription
// Toggles the subscription status between 'active' and 'paused'.
// Body: { subscription_id: string }
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { subscription_id } = (await req.json()) as {
      subscription_id: string;
    };

    if (!subscription_id) {
      return NextResponse.json(
        { error: "subscription_id is required" },
        { status: 400 }
      );
    }

    // Fetch current status (verifies ownership at the same time)
    const sub = await queryOne<{ id: string; status: string }>(
      "SELECT id, status FROM subscriptions WHERE id = $1 AND user_id = $2",
      [subscription_id, userId]
    );

    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const newStatus = sub.status === "active" ? "paused" : "active";

    await queryOne(
      "UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
      [newStatus, subscription_id, userId]
    );

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[pause-subscription]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
