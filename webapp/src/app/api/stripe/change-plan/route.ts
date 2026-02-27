import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
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
    const { planAmount } = body;

    const plan = PLANS.find((p) => p.amount === planAmount);
    if (!plan) {
      return NextResponse.json(
        { error: "無効なプランです" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "サブスクリプションが見つかりません" },
        { status: 400 }
      );
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    );

    // Find matching price
    const prices = await stripe.prices.list({
      lookup_keys: [`dm_plan_${plan.id}`],
      limit: 1,
    });

    if (prices.data.length === 0) {
      return NextResponse.json(
        { error: "プランの価格が見つかりません" },
        { status: 400 }
      );
    }

    // Update subscription (翌月1日から反映)
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: prices.data[0].id,
        },
      ],
      proration_behavior: "none",
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
      },
    });

    // Update plan_amount in profile
    await supabase
      .from("profiles")
      .update({ plan_amount: planAmount })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Plan change failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
