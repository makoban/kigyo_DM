"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const UNIT_PRICE = 380;

interface Stats {
  todaySent: number;
  monthSent: number;
  balance: number;
  remainingLetters: number;
  allTimeSent: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [areaLabel, setAreaLabel] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().slice(0, 10);
      const yearMonth = today.slice(0, 7);

      // Profile (balance)
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      // Subscription info
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("area_label")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (sub) {
        setAreaLabel(sub.area_label);
      }

      // Today's sent count
      const { count: todaySent } = await supabase
        .from("mailing_queue")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent")
        .eq("scheduled_date", today);

      // This month's sent
      const { count: monthSent } = await supabase
        .from("mailing_queue")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent")
        .gte("scheduled_date", `${yearMonth}-01`)
        .lte("scheduled_date", `${yearMonth}-31`);

      // All time sent
      const { count: allTimeSent } = await supabase
        .from("mailing_queue")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent");

      const balance = profile?.balance || 0;

      setStats({
        todaySent: todaySent || 0,
        monthSent: monthSent || 0,
        balance,
        remainingLetters: Math.floor(balance / UNIT_PRICE),
        allTimeSent: allTimeSent || 0,
      });
    };
    load();
  }, []);

  if (!stats) {
    return <div className="py-20 text-center text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-1">
        ダッシュボード
      </h1>
      {areaLabel && (
        <p className="text-sm text-gold-400 mb-6">{areaLabel}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">
            {stats.todaySent}
          </p>
          <p className="text-xs text-gray-500 mt-1">本日投函済み</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">
            {stats.monthSent}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            今月 {stats.monthSent}社の社長に届きました
          </p>
        </Card>
        <Card className="text-center py-4 col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-gold-400">
            {stats.remainingLetters}通
          </p>
          <p className="text-xs text-gray-500 mt-1">
            残高 &yen;{stats.balance.toLocaleString()}
          </p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">
            {stats.allTimeSent}
          </p>
          <p className="text-xs text-gray-500 mt-1">通算投函数</p>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card hover className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <CardTitle>明日の投函予定</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              確認・キャンセルはこちら
            </p>
          </div>
        </Card>
        <Card hover className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-navy-700/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <CardTitle>投函履歴</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              過去の投函を確認・CSVエクスポート
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
