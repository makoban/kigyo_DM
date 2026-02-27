import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json();
    const { area, sender, greetingText, planAmount } = body;

    // Save sender info to profile
    if (sender) {
      await supabase
        .from("profiles")
        .update({
          company_name: sender.companyName,
          company_url: sender.companyUrl,
          company_description: sender.companyDescription,
          postal_code: sender.postalCode,
          address: sender.address,
          phone: sender.phone,
          contact_email: sender.contactEmail,
          representative_name: sender.representativeName,
        })
        .eq("id", user.id);
    }

    // Create subscription (area settings)
    if (area) {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        prefecture: area.prefecture,
        city: area.city,
        area_label: area.areaLabel,
        monthly_budget_limit: planAmount || 7600,
        greeting_text: greetingText,
        status: "active",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Setup completion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
