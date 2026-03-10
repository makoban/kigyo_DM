import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, MAX_BALANCE_MULTIPLIER } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne, query } from "@/lib/db";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await req.json();
  const { amount } = body;

  // 金額バリデーション: プラン金額のいずれかであること
  const validAmounts = PLANS.map((p) => p.amount);
  if (!validAmounts.includes(amount)) {
    return NextResponse.json({ error: "無効な金額です" }, { status: 400 });
  }

  const profile = await queryOne<{
    stripe_customer_id: string | null;
    balance: number;
    plan_amount: number;
  }>(
    "SELECT stripe_customer_id, balance, plan_amount FROM profiles WHERE id = $1",
    [userId]
  );

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Stripe顧客情報が見つかりません" },
      { status: 400 }
    );
  }

  // 残高上限チェック（プラン金額の3倍まで）
  const maxBalance = (profile.plan_amount || amount) * MAX_BALANCE_MULTIPLIER;
  if (profile.balance + amount > maxBalance) {
    return NextResponse.json(
      {
        error: `残高上限（¥${maxBalance.toLocaleString()}）を超えるためチャージできません`,
      },
      { status: 400 }
    );
  }

  try {
    // 保存済みの決済方法を取得
    const customer = await stripe.customers.retrieve(
      profile.stripe_customer_id
    );
    if (customer.deleted) {
      return NextResponse.json(
        { error: "Stripe顧客が削除されています" },
        { status: 400 }
      );
    }

    const defaultPm =
      customer.invoice_settings?.default_payment_method;

    if (!defaultPm) {
      return NextResponse.json(
        { error: "登録済みのカード情報がありません。設定画面からカードを登録してください。" },
        { status: 400 }
      );
    }

    const pmId = typeof defaultPm === "string" ? defaultPm : defaultPm.id;

    // PaymentIntent作成（off-session: カード情報入力不要）
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "jpy",
      customer: profile.stripe_customer_id,
      payment_method: pmId,
      off_session: true,
      confirm: true,
      metadata: {
        user_id: userId,
        type: "top_up",
      },
      description: "起業サーチDM 追加チャージ",
    });

    if (paymentIntent.status === "succeeded") {
      // 残高加算
      await query(
        "UPDATE profiles SET balance = balance + $1 WHERE id = $2",
        [amount, userId]
      );

      // チャージ履歴記録
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      // top-upは別行として記録（月額チャージと区別）
      await query(
        `INSERT INTO monthly_usage (user_id, year_month, total_sent, total_amount, stripe_invoice_id, payment_status)
         VALUES ($1, $2, 0, $3, $4, 'charged')
         ON CONFLICT (user_id, year_month) DO UPDATE SET
           total_amount = monthly_usage.total_amount + $3,
           payment_status = 'charged'`,
        [userId, yearMonth, amount, paymentIntent.id]
      );

      // 停止中のサブスクリプションを再開
      await query(
        "UPDATE subscriptions SET status = 'active' WHERE user_id = $1 AND status = 'paused'",
        [userId]
      );

      const newBalance = profile.balance + amount;
      return NextResponse.json({
        success: true,
        charged: amount,
        newBalance,
        letters: Math.floor(newBalance / 380),
      });
    }

    // 3Dセキュア等で追加認証が必要な場合
    return NextResponse.json(
      { error: "決済に追加認証が必要です。カード会社にお問い合わせください。" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "チャージに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
