import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";
import type { MonthlyUsage } from "@/lib/types";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "未請求", color: "bg-gray-100 text-gray-600" },
  invoiced: { label: "請求済み", color: "bg-yellow-100 text-yellow-700" },
  charged: { label: "チャージ済み", color: "bg-blue-100 text-blue-700" },
  paid: { label: "支払済み", color: "bg-green-100 text-green-700" },
  failed: { label: "支払失敗", color: "bg-red-100 text-red-700" },
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/onboarding/signup");
  const userId = session.user.id;

  const [profile, usagesResult] = await Promise.all([
    queryOne<{ balance: number }>(
      "SELECT balance FROM profiles WHERE id = $1",
      [userId]
    ),
    query<MonthlyUsage>(
      "SELECT * FROM monthly_usage WHERE user_id = $1 ORDER BY year_month DESC",
      [userId]
    ),
  ]);

  const balance = profile?.balance ?? 0;
  const usages = usagesResult.rows;

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        請求・チャージ履歴
      </h1>

      {/* Balance card */}
      <Card className="mb-6 bg-navy-800/5 border-navy-700/10">
        <div className="text-center">
          <p className="text-sm text-gray-500">現在の残高</p>
          <p className="text-3xl font-bold text-gold-400">
            &yen;{balance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {Math.floor(balance / 380)}通分
          </p>
        </div>
      </Card>

      {usages.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400">履歴はまだありません</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {usages.map((usage) => {
            const status =
              STATUS_LABELS[usage.payment_status] || STATUS_LABELS.pending;
            const isCharge =
              usage.payment_status === "charged" ||
              usage.payment_status === "paid";
            return (
              <Card key={usage.id} className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-navy-800">
                      {usage.year_month}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isCharge
                        ? "月額チャージ"
                        : `${usage.total_sent}通 投函`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        isCharge ? "text-blue-600" : "text-navy-800"
                      }`}
                    >
                      {isCharge ? "+" : "-"}&yen;
                      {usage.total_amount.toLocaleString()}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
