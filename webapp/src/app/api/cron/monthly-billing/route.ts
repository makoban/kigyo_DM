import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { UNIT_PRICE } from "@/lib/stripe";

// 残高減算Cron: 毎日実行
// sent かつ未精算のアイテムから残高を減算
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // 送付済み（sent）かつ残高未精算のアイテムを取得
  const { data: undeducted } = await supabase
    .from("mailing_queue")
    .select("id, user_id, unit_price")
    .eq("status", "sent")
    .eq("balance_deducted", false);

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (!profile) {
        errors.push(`User ${userId}: profile not found`);
        continue;
      }

      // 残高から減算
      const newBalance = profile.balance - items.total;
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", userId);

      // 精算済みマーク
      await supabase
        .from("mailing_queue")
        .update({ balance_deducted: true })
        .in("id", items.ids);

      deductedCount += items.ids.length;

      // 残高不足 → 送付停止
      if (newBalance < UNIT_PRICE) {
        await supabase
          .from("subscriptions")
          .update({ status: "paused" })
          .eq("user_id", userId)
          .eq("status", "active");
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
