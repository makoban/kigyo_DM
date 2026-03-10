import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne, query } from "@/lib/db";

/**
 * Stripe SDK v20 / API 2026-02-25.clover では invoice.payment_intent が廃止されたため、
 * 初回決済は PaymentIntent を直接作成し、決済完了後に Subscription を作成するフローに変更。
 *
 * Flow:
 *   1. POST /api/stripe/create-subscription → PaymentIntent (client_secret) を返す
 *   2. フロントで Stripe Elements で決済確定
 *   3. POST /api/stripe/complete-setup → 保存されたカードで Subscription 作成
 */
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

    // Get Stripe customer ID (profile may not exist for Google OAuth users)
    const profile = await queryOne<{
      stripe_customer_id: string | null;
      email: string | null;
    }>(
      "SELECT stripe_customer_id, email FROM profiles WHERE id = $1",
      [userId]
    );

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;

      await query(
        `INSERT INTO profiles (id, email, stripe_customer_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           email = COALESCE(EXCLUDED.email, profiles.email),
           stripe_customer_id = EXCLUDED.stripe_customer_id`,
        [userId, profile?.email ?? null, customerId]
      );
    }

    // Cancel any existing incomplete subscriptions to avoid duplicates
    const existingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 10,
    });
    for (const sub of existingSubs.data) {
      await stripe.subscriptions.cancel(sub.id);
    }

    // Create PaymentIntent directly for initial charge
    // setup_future_usage saves the card for subsequent subscription billing
    const paymentIntent = await stripe.paymentIntents.create({
      amount: planAmount,
      currency: "jpy",
      customer: customerId,
      setup_future_usage: "off_session",
      metadata: {
        user_id: userId,
        plan_id: plan.id,
        plan_amount: String(planAmount),
        purpose: "initial_charge",
      },
    });

    if (!paymentIntent.client_secret) {
      console.error("[create-subscription] No client_secret from PaymentIntent");
      return NextResponse.json(
        { error: "決済の初期化に失敗しました。再度お試しください。" },
        { status: 500 }
      );
    }

    // Save plan amount to profile (subscription will be created after payment completes)
    await query(
      "UPDATE profiles SET plan_amount = $1 WHERE id = $2",
      [planAmount, userId]
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription creation failed";
    console.error("[create-subscription] Error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
