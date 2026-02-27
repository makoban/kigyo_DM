import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createServiceClient();

  switch (event.type) {
    // チャージ成功 → 残高加算
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!customerId) break;

      // Find user by stripe_customer_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, balance")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      const chargeAmount = invoice.amount_paid;

      // 残高加算
      await supabase
        .from("profiles")
        .update({ balance: profile.balance + chargeAmount })
        .eq("id", profile.id);

      // monthly_usage にチャージ記録
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      await supabase.from("monthly_usage").upsert(
        {
          user_id: profile.id,
          year_month: yearMonth,
          total_sent: 0,
          total_amount: chargeAmount,
          stripe_invoice_id: invoice.id,
          payment_status: "charged",
        },
        { onConflict: "user_id,year_month" }
      );

      // 停止中のサブスクリプションを再開
      if (chargeAmount >= 380) {
        await supabase
          .from("subscriptions")
          .update({ status: "active" })
          .eq("user_id", profile.id)
          .eq("status", "paused");
      }

      break;
    }

    // チャージ失敗 → 通知（将来的にメール送信）
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!customerId) break;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      // サブスクリプションを一時停止
      await supabase
        .from("subscriptions")
        .update({ status: "paused" })
        .eq("user_id", profile.id)
        .eq("status", "active");

      // TODO: Send failure notification email
      break;
    }

    // サブスクリプション解約
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (!customerId) break;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      // サブスクリプションをキャンセル状態に
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", profile.id)
        .in("status", ["active", "paused"]);

      // stripe_subscription_id をクリア
      await supabase
        .from("profiles")
        .update({ stripe_subscription_id: null })
        .eq("id", profile.id);

      // 残高は30日間維持（失効は別Cronで処理）
      break;
    }
  }

  return NextResponse.json({ received: true });
}
