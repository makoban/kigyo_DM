import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { UNIT_PRICE } from "@/lib/stripe";

// 残高減算Cron: 毎日実行
// sent かつ未精算のアイテムから残高を減算
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 送付済み（sent）かつ残高未精算のアイテムを取得
  const undeductedResult = await query(
    "SELECT id, user_id, unit_price FROM mailing_queue WHERE status = 'sent' AND balance_deducted = false",
    []
  );
  const undeducted = undeductedResult.rows as { id: number; user_id: string; unit_price: number }[];

  if (!undeducted || undeducted.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No items to deduct",
    });
  }

  // ユーザーごとにグループ化
  const userItems = new Map<string, { ids: number[]; total: number }>();
  for (const item of undeducted) {
    const existing = userItems.get(item.user_id) || { ids: [], total: 0 };
    existing.ids.push(item.id);
    existing.total += item.unit_price;
    userItems.set(item.user_id, existing);
  }

  let deductedCount = 0;
  let pausedCount = 0;
  const errors: string[] = [];

  for (const [userId, items] of userItems) {
    try {
      // 現在の残高を取得
      const profile = await queryOne<{ balance: number }>(
        "SELECT balance FROM profiles WHERE id = $1",
        [userId]
      );

      if (!profile) {
        errors.push(`User ${userId}: profile not found`);
        continue;
      }

      // 残高から減算
      const newBalance = profile.balance - items.total;
      await query(
        "UPDATE profiles SET balance = $1 WHERE id = $2",
        [newBalance, userId]
      );

      // 精算済みマーク
      await query(
        "UPDATE mailing_queue SET balance_deducted = true WHERE id = ANY($1)",
        [items.ids]
      );

      deductedCount += items.ids.length;

      // 残高不足 → 送付停止
      if (newBalance < UNIT_PRICE) {
        await query(
          "UPDATE subscriptions SET status = 'paused' WHERE user_id = $1 AND status = 'active'",
          [userId]
        );
        pausedCount++;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`User ${userId}: ${message}`);
    }
  }

  return NextResponse.json({
    success: true,
    totalUsers: userItems.size,
    deductedItems: deductedCount,
    pausedUsers: pausedCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
