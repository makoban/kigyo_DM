"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { MailingQueueItem, Corporation } from "@/lib/supabase/types";

type QueueWithCorp = MailingQueueItem & { corporations: Corporation };

export default function TomorrowPage() {
  const [items, setItems] = useState<QueueWithCorp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Check if locked (after 16:30)
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    setIsLocked(hours > 16 || (hours === 16 && minutes >= 30));

    const { data } = await supabase
      .from("mailing_queue")
      .select("*, corporations(*)")
      .eq("user_id", user.id)
      .eq("scheduled_date", tomorrowStr)
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: true });

    setItems((data as QueueWithCorp[]) || []);
    setLoading(false);
  };

  const handleCancel = async (id: number) => {
    if (isLocked) return;
    const supabase = createClient();
    await supabase
      .from("mailing_queue")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: "ユーザーキャンセル",
      })
      .eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-1">
        明日の投函予定
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {items.length}件の投函が予定されています
        {isLocked && (
          <span className="text-red-500 ml-2">
            （16:30以降のため変更できません）
          </span>
        )}
      </p>

      {items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400">明日の投函予定はありません</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-navy-800 truncate">
                  {item.corporations?.company_name || "不明"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.corporations?.prefecture}{" "}
                  {item.corporations?.city}{" "}
                  {item.corporations?.street_address}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  法人番号: {item.corporations?.corporate_number}
                </p>
              </div>
              {!isLocked && item.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel(item.id)}
                  className="text-red-500 hover:text-red-600 shrink-0 ml-2"
                >
                  取消
                </Button>
              )}
              {item.status === "confirmed" && (
                <span className="text-xs text-gold-400 shrink-0 ml-2">
                  確定済み
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
