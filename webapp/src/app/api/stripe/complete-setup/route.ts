import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await requireAuth();
    } catch {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json();
    const { area, sender, greetingText, planAmount, shokenData } = body;

    // Save sender info to profile
    if (sender) {
      await query(
        `UPDATE profiles SET
          company_name = $1,
          company_url = $2,
          company_description = $3,
          postal_code = $4,
          address = $5,
          phone = $6,
          contact_email = $7,
          representative_name = $8
         WHERE id = $9`,
        [
          sender.companyName,
          sender.companyUrl,
          sender.companyDescription,
          sender.postalCode,
          sender.address,
          sender.phone,
          sender.contactEmail,
          sender.representativeName,
          userId,
        ]
      );
    }

    // Create subscription (area settings)
    if (area) {
      await query(
        `INSERT INTO subscriptions (user_id, prefecture, city, area_label, monthly_budget_limit, greeting_text, shoken_data, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
        [
          userId,
          area.prefecture,
          area.city,
          area.areaLabel,
          planAmount || 7600,
          greetingText,
          shokenData ? JSON.stringify(shokenData) : null,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Setup completion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
