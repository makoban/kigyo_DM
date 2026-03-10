import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne, query } from "@/lib/db";

// Product/Price はテストモードで事前作成、または動的に取得
async function getOrCreatePrice(amount: number): Promise<string> {
  const plan = PLANS.find((p) => p.amount === amount);
  if (!plan) throw new Error("Invalid plan amount");

  const prices = await stripe.prices.list({
    lookup_keys: [`dm_plan_${plan.id}`],
    limit: 1,
  });

  if (prices.data.length > 0) {
    return prices.data[0].id;
  }

  let product;
  const products = await stripe.products.list({ limit: 100 });
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

    // Create Stripe Subscription with saved payment method (from initial PaymentIntent)
    const profile = await queryOne<{
      stripe_customer_id: string | null;
      plan_amount: number | null;
      balance: number | null;
    }>(
      "SELECT stripe_customer_id, plan_amount, balance FROM profiles WHERE id = $1",
      [userId]
    );

    const amount = planAmount || profile?.plan_amount || 7600;
    const plan = PLANS.find((p) => p.amount === amount);
    const customerId = profile?.stripe_customer_id;

    if (customerId && plan) {
      // Get the saved payment method from the customer (saved by setup_future_usage)
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });

      const defaultPm = paymentMethods.data[0]?.id;

      if (defaultPm) {
        // Set as default payment method
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: defaultPm },
        });

        const priceId = await getOrCreatePrice(amount);

        // Create subscription — first invoice is already paid via PaymentIntent
        // Use billing_cycle_anchor to start billing from next month
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          default_payment_method: defaultPm,
          metadata: {
            user_id: userId,
            plan_id: plan.id,
          },
          // Skip the first invoice since we already charged via PaymentIntent
          billing_cycle_anchor: Math.floor(
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() / 1000
          ),
          proration_behavior: "none",
        });

        // Update profile with subscription info and add balance
        await query(
          `UPDATE profiles SET
            stripe_subscription_id = $1,
            plan_amount = $2,
            balance = COALESCE(balance, 0) + $2
           WHERE id = $3`,
          [subscription.id, amount, userId]
        );
      } else {
        // No saved payment method — just save plan_amount, subscription will be set up later
        console.warn("[complete-setup] No payment method found for customer", customerId);
        await query(
          "UPDATE profiles SET plan_amount = $1, balance = COALESCE(balance, 0) + $1 WHERE id = $2",
          [amount, userId]
        );
      }
    } else {
      // Fallback: just add balance
      await query(
        "UPDATE profiles SET plan_amount = $1, balance = COALESCE(balance, 0) + $1 WHERE id = $2",
        [amount, userId]
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
          amount,
          greetingText,
          shokenData ? JSON.stringify(shokenData) : null,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Setup completion failed";
    console.error("[complete-setup] Error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
