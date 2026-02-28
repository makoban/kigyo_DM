import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { queryOne, query } from "@/lib/db";
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
      const profile = await queryOne<{ id: string; balance: number }>(
        "SELECT id, balance FROM profiles WHERE stripe_customer_id = $1",
        [customerId]
      );

      if (!profile) break;

      const chargeAmount = invoice.amount_paid;

      // 残高加算
      await query(
        "UPDATE profiles SET balance = $1 WHERE id = $2",
        [profile.balance + chargeAmount, profile.id]
      );

      // monthly_usage にチャージ記録
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      await query(
        `INSERT INTO monthly_usage (user_id, year_month, total_sent, total_amount, stripe_invoice_id, payment_status)
         VALUES ($1, $2, 0, $3, $4, 'charged')
         ON CONFLICT (user_id, year_month) DO UPDATE SET
           total_amount = EXCLUDED.total_amount,
           stripe_invoice_id = EXCLUDED.stripe_invoice_id,
           payment_status = EXCLUDED.payment_status`,
        [profile.id, yearMonth, chargeAmount, invoice.id]
      );

      // 停止中のサブスクリプションを再開
      if (chargeAmount >= 380) {
        await query(
          "UPDATE subscriptions SET status = 'active' WHERE user_id = $1 AND status = 'paused'",
          [profile.id]
        );
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

      const profile = await queryOne<{ id: string }>(
        "SELECT id FROM profiles WHERE stripe_customer_id = $1",
        [customerId]
      );

      if (!profile) break;

      // サブスクリプションを一時停止
      await query(
        "UPDATE subscriptions SET status = 'paused' WHERE user_id = $1 AND status = 'active'",
        [profile.id]
      );

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

      const profile = await queryOne<{ id: string }>(
        "SELECT id FROM profiles WHERE stripe_customer_id = $1",
        [customerId]
      );

      if (!profile) break;

      // サブスクリプションをキャンセル状態に
      await query(
        "UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = ANY($2)",
        [profile.id, ["active", "paused"]]
      );

      // stripe_subscription_id をクリア
      await query(
        "UPDATE profiles SET stripe_subscription_id = NULL WHERE id = $1",
        [profile.id]
      );

      // 残高は30日間維持（失効は別Cronで処理）
      break;
    }
  }

  return NextResponse.json({ received: true });
}
