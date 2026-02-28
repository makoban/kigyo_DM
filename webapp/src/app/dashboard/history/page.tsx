"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { HistoryItem } from "@/app/api/dashboard/history/route";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/history?month=${encodeURIComponent(monthFilter)}`
      );
      if (res.status === 401) {
        window.location.href = "/onboarding/signup";
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const header = "投函日,法人名,法人番号,都道府県,市区町村,住所,単価\n";
    const rows = items
      .map(
        (i) =>
          `${i.scheduled_date},${i.corporations.company_name},${i.corporations.corporate_number},${i.corporations.prefecture || ""},${i.corporations.city || ""},${i.corporations.street_address || ""},${i.unit_price}`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `投函履歴_${monthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate month options (last 12 months)
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-navy-800">
            投函履歴
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length}件 / 合計 &yen;
            {items.reduce((s, i) => s + i.unit_price, 0).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/40"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">読み込み中...</div>
      ) : items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400">
            {monthFilter} の投函履歴はありません
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-navy-800 truncate">
                    {item.corporations.company_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.scheduled_date} | {item.corporations.prefecture}{" "}
                    {item.corporations.city}
                  </p>
                </div>
                <span className="text-sm text-gray-600 shrink-0 ml-2">
                  &yen;{item.unit_price}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
