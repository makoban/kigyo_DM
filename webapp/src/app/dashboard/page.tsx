import { redirect } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { queryOne, queryCount } from "@/lib/db";

const UNIT_PRICE = 380;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/onboarding/signup");
  const userId = session.user.id;

  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);

  // Fetch all data in parallel
  const [profile, sub, todaySent, monthSent, allTimeSent] = await Promise.all([
    queryOne<{ balance: number }>(
      "SELECT balance FROM profiles WHERE id = $1",
      [userId]
    ),
    queryOne<{ area_label: string }>(
      "SELECT area_label FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [userId]
    ),
    queryCount(
      "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1 AND status = 'sent' AND scheduled_date = $2",
      [userId, today]
    ),
    queryCount(
      "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1 AND status = 'sent' AND scheduled_date >= $2 AND scheduled_date <= $3",
      [userId, `${yearMonth}-01`, `${yearMonth}-31`]
    ),
    queryCount(
      "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1 AND status = 'sent'",
      [userId]
    ),
  ]);

  const balance = profile?.balance ?? 0;
  const remainingLetters = Math.floor(balance / UNIT_PRICE);
  const areaLabel = sub?.area_label ?? "";

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
          <p className="text-2xl font-bold text-navy-800">{todaySent}</p>
          <p className="text-xs text-gray-500 mt-1">本日投函済み</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">{monthSent}</p>
          <p className="text-xs text-gray-500 mt-1">
            今月 {monthSent}社の社長に届きました
          </p>
        </Card>
        <Card className="text-center py-4 col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-gold-400">
            {remainingLetters}通
          </p>
          <p className="text-xs text-gray-500 mt-1">
            残高 &yen;{balance.toLocaleString()}
          </p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-navy-800">{allTimeSent}</p>
          <p className="text-xs text-gray-500 mt-1">通算投函数</p>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card hover className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-gold-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
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
            <svg
              className="w-5 h-5 text-navy-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
