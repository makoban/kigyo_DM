import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne, query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await requireAuth();
    } catch {
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

    const profile = await queryOne<{ stripe_subscription_id: string | null }>(
      "SELECT stripe_subscription_id FROM profiles WHERE id = $1",
      [userId]
    );

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
        user_id: userId,
        plan_id: plan.id,
      },
    });

    // Update plan_amount in profile
    await query(
      "UPDATE profiles SET plan_amount = $1 WHERE id = $2",
      [planAmount, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Plan change failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
