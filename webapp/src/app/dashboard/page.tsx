import { redirect } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { query, queryOne, queryCount } from "@/lib/db";

const UNIT_PRICE = 380;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "準備中", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "確定", color: "bg-blue-100 text-blue-800" },
  ready_to_send: { label: "発送準備完了", color: "bg-purple-100 text-purple-800" },
  sent: { label: "投函済み", color: "bg-green-100 text-green-800" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-500" },
};

interface QueueItem {
  id: string;
  status: string;
  change_date: string | null;
  company_name: string;
  city: string;
  street_address: string | null;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/onboarding/signup");
  const userId = session.user.id;

  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  const [profile, sub, totalAll, totalSent, totalPending, totalMonth, recentItems] =
    await Promise.all([
      queryOne<{ balance: number; plan_type: string }>(
        "SELECT balance, plan_type FROM profiles WHERE id = $1",
        [userId]
      ),
      queryOne<{ area_label: string }>(
        "SELECT area_label FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
        [userId]
      ),
      queryCount(
        "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1",
        [userId]
      ),
      queryCount(
        "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1 AND status = 'sent'",
        [userId]
      ),
      queryCount(
        "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1 AND status IN ('pending','confirmed','ready_to_send')",
        [userId]
      ),
      queryCount(
        "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1 AND scheduled_date >= $2 AND scheduled_date <= $3",
        [userId, `${yearMonth}-01`, `${yearMonth}-${String(lastDay).padStart(2, "0")}`]
      ),
      query<QueueItem>(
        `SELECT mq.id, mq.status,
                c.company_name, c.city, c.street_address, c.change_date
         FROM mailing_queue mq
         JOIN corporations c ON c.id = mq.corporation_id
         WHERE mq.user_id = $1
         ORDER BY c.change_date DESC, mq.id DESC
         LIMIT 50`,
        [userId]
      ),
    ]);

  const balance = profile?.balance ?? 0;
  const remainingLetters = Math.floor(balance / UNIT_PRICE);
  const areaLabel = sub?.area_label ?? "";
  const isFreeForever = profile?.plan_type === "free_forever";
  const items = recentItems.rows;

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-1">
        ダッシュボード
      </h1>
      {isFreeForever && (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gold-400/15 text-gold-400 mb-2">
          永久無料プラン
        </span>
      )}
      {areaLabel && (
        <p className="text-sm text-gold-400 mb-6">{areaLabel}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">{totalPending}</p>
          <p className="text-xs text-gray-500 mt-1">発送待ち</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">{totalSent}</p>
          <p className="text-xs text-gray-500 mt-1">投函済み</p>
        </Card>
        <Card className="text-center py-4 col-span-2 md:col-span-1">
          {isFreeForever ? (
            <>
              <p className="text-2xl font-bold text-gold-400">無料</p>
              <p className="text-xs text-gray-500 mt-1">永久無料プラン</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gold-400">
                {remainingLetters}通
              </p>
              <p className="text-xs text-gray-500 mt-1">
                残高 &yen;{balance.toLocaleString()}
              </p>
            </>
          )}
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">{totalMonth}</p>
          <p className="text-xs text-gray-500 mt-1">今月の通数</p>
        </Card>
      </div>

      {/* Mailing list */}
      <h2 className="font-serif text-lg font-semibold text-navy-800 mb-3">
        投函リスト（全{totalAll}件）
      </h2>
      {items.length === 0 ? (
        <Card className="py-8 text-center text-gray-400 text-sm">
          まだ投函データがありません
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const st = STATUS_LABELS[item.status] ?? {
              label: item.status,
              color: "bg-gray-100 text-gray-600",
            };
            const date = item.change_date
              ? new Date(item.change_date).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "";
            return (
              <Card key={item.id} className="flex items-center gap-3 py-3 px-4">
                <span
                  className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}
                >
                  {st.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-800 truncate">
                    {item.company_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.city}
                    {item.street_address ? ` ${item.street_address}` : ""}
                  </p>
                </div>
                {date && (
                  <span className="shrink-0 text-xs text-gray-400">
                    登記 {date}
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
