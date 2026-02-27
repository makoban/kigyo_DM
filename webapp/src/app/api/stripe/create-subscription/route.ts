import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Product/Price はテストモードで事前作成、または動的に取得
async function getOrCreatePrice(amount: number): Promise<string> {
  const plan = PLANS.find((p) => p.amount === amount);
  if (!plan) throw new Error("Invalid plan amount");

  // 既存のPrice を検索
  const prices = await stripe.prices.list({
    lookup_keys: [`dm_plan_${plan.id}`],
    limit: 1,
  });

  if (prices.data.length > 0) {
    return prices.data[0].id;
  }

  // Product を取得 or 作成
  let product: Stripe.Product;
  const products = await stripe.products.list({
    limit: 100,
  });
  const existing = products.data.find(
    (p) => p.metadata?.service === "kigyo-dm"
  );

  if (existing) {
    product = existing;
  } else {
    product = await stripe.products.create({
      name: "起業サーチDM 月額プリペイド",
      metadata: { service: "kigyo-dm" },
    });
  }

  // Price を作成
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "jpy",
    recurring: { interval: "month" },
    lookup_key: `dm_plan_${plan.id}`,
    metadata: { plan_id: plan.id, letters: String(plan.letters) },
  });

  return price.id;
}

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

    // Get Stripe customer ID (profile may not exist for Google OAuth users)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer and upsert profile row so subsequent calls succeed
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email || profile?.email || null,
            stripe_customer_id: customerId,
          },
          { onConflict: "id" }
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

    const priceId = await getOrCreatePrice(planAmount);

    // Create Subscription (初回は即時課金)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
      },
      expand: ["latest_invoice.payment_intent"],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | undefined;

    if (!paymentIntent?.client_secret) {
      return NextResponse.json(
        { error: "決済の初期化に失敗しました。再度お試しください。" },
        { status: 500 }
      );
    }

    // Save subscription ID and plan amount to profile
    await supabase
      .from("profiles")
      .update({
        stripe_subscription_id: subscription.id,
        plan_amount: planAmount,
      })
      .eq("id", user.id);

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
