import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function POST() {
  try {
    // 1. Add plan_type column if not exists
    await query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'normal'
    `);

    // 2. Find sample user
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = 'sample@sample.com'"
    );
    if (!user) {
      return NextResponse.json({ error: "sample user not found" }, { status: 404 });
    }

    const userId = user.id;

    // 3. Update profile: free_forever, large balance, plan_amount = 0
    await query(
      `UPDATE profiles SET plan_type = 'free_forever', balance = 999999, plan_amount = 0 WHERE id = $1`,
      [userId]
    );

    // 4. Create subscription if not exists
    const existingSub = await queryOne(
      "SELECT id FROM subscriptions WHERE user_id = $1",
      [userId]
    );

    if (!existingSub) {
      await query(
        `INSERT INTO subscriptions (user_id, prefecture, city, area_label, monthly_budget_limit, greeting_text, status)
         VALUES ($1, '愛知県', '名古屋市', '愛知県 名古屋市', 0, 'この度は御社のご設立、誠におめでとうございます。

私たち株式会社バンテックスは、専門的なサービスを通じて、新設法人様の事業成長をお手伝いしております。

つきましては、御社の事業エリアにおける商圏データレポートを同封いたしました。地域の事業所数・業種構成・開業率などをまとめたものです。今後の事業計画にお役立ていただければ幸いです。

ご不明な点やご相談がございましたら、お気軽にお問い合わせください。

御社の益々のご発展を心よりお祈り申し上げます。', 'active')`,
        [userId]
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
