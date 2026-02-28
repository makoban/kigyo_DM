import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { CancelButton } from "@/components/dashboard/cancel-button";
import type { Corporation } from "@/lib/types";

interface QueueRow {
  id: number;
  status: "pending" | "confirmed" | "ready_to_send" | "sent" | "cancelled";
  scheduled_date: string;
  corporation: Corporation;
}

export default async function TomorrowPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/onboarding/signup");
  const userId = session.user.id;

  // Compute tomorrow's date on the server
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Check if locked (after 16:30 in server local time)
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isLocked = hours > 16 || (hours === 16 && minutes >= 30);

  // Fetch tomorrow's queue with corporation data via JSON aggregation
  const result = await query<QueueRow>(
    `SELECT mq.id,
            mq.status,
            mq.scheduled_date,
            row_to_json(c.*) AS corporation
       FROM mailing_queue mq
       JOIN corporations c ON mq.corporation_id = c.id
      WHERE mq.user_id = $1
        AND mq.scheduled_date = $2
        AND mq.status = ANY($3)
      ORDER BY mq.created_at ASC`,
    [userId, tomorrowStr, ["pending", "confirmed"]]
  );

  const items = result.rows;

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
                  {item.corporation?.company_name || "不明"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.corporation?.prefecture}{" "}
                  {item.corporation?.city}{" "}
                  {item.corporation?.street_address}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  法人番号: {item.corporation?.corporate_number}
                </p>
              </div>
              {!isLocked && item.status === "pending" && (
                <CancelButton itemId={item.id} />
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
