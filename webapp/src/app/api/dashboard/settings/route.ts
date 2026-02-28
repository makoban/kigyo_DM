import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne, query } from "@/lib/db";
import type { Profile, Subscription } from "@/lib/types";

// GET /api/dashboard/settings
// Returns the authenticated user's profile + active subscription.
export async function GET() {
  try {
    const userId = await requireAuth();

    const [profile, sub] = await Promise.all([
      queryOne<Profile>(
        "SELECT * FROM profiles WHERE id = $1",
        [userId]
      ),
      queryOne<Subscription>(
        "SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('active', 'paused') LIMIT 1",
        [userId]
      ),
    ]);

    return NextResponse.json({ profile, sub });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[dashboard/settings GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/dashboard/settings
// Saves profile fields + subscription greeting text.
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = (await req.json()) as {
      company_name: string;
      address: string;
      phone: string;
      contact_email: string;
      representative_name: string;
      greeting_text: string;
      subscription_id: string | null;
    };

    // Update profile fields
    await query(
      `UPDATE profiles
          SET company_name = $1,
              address = $2,
              phone = $3,
              contact_email = $4,
              representative_name = $5,
              updated_at = NOW()
        WHERE id = $6`,
      [
        body.company_name,
        body.address,
        body.phone,
        body.contact_email,
        body.representative_name,
        userId,
      ]
    );

    // Update greeting text on the subscription if it exists
    if (body.subscription_id) {
      await query(
        `UPDATE subscriptions
            SET greeting_text = $1,
                updated_at = NOW()
          WHERE id = $2
            AND user_id = $3`,
        [body.greeting_text, body.subscription_id, userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[dashboard/settings POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
