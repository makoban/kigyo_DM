"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const TOP_UP_OPTIONS = [
  { amount: 3800, label: "¥3,800", letters: 10 },
  { amount: 7600, label: "¥7,600", letters: 20 },
  { amount: 15200, label: "¥15,200", letters: 40 },
  { amount: 38000, label: "¥38,000", letters: 100 },
];

export function TopUpButton({ planAmount }: { planAmount: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  const handleTopUp = async (amount: number) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          text: `¥${data.charged.toLocaleString()}をチャージしました（残高: ¥${data.newBalance.toLocaleString()} / ${data.letters}通分）`,
          ok: true,
        });
        setOpen(false);
        // 2秒後にページリロードで残高表示を更新
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({ text: data.error, ok: false });
      }
    } catch {
      setMessage({ text: "通信エラーが発生しました", ok: false });
    }
    setLoading(false);
  };

  // デフォルトはプラン金額と同額
  const defaultOption =
    TOP_UP_OPTIONS.find((o) => o.amount === planAmount) || TOP_UP_OPTIONS[1];

  return (
    <div className="mt-4">
      {!open ? (
        <Button
          onClick={() => setOpen(true)}
          className="w-full"
          variant="outline"
        >
          追加チャージ
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">
            チャージ金額を選択
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TOP_UP_OPTIONS.map((opt) => (
              <button
                key={opt.amount}
                onClick={() => handleTopUp(opt.amount)}
                disabled={loading}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  opt.amount === defaultOption.amount
                    ? "border-gold-400 bg-gold-400/5"
                    : "border-gray-200 hover:border-gray-300"
                } disabled:opacity-50`}
              >
                <p className="font-semibold text-navy-800">{opt.label}</p>
                <p className="text-gray-500 text-xs">{opt.letters}通分</p>
              </button>
            ))}
          </div>
          <Button
            onClick={() => {
              setOpen(false);
              setMessage(null);
            }}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            キャンセル
          </Button>
        </div>
      )}

      {message && (
        <p
          className={`text-sm mt-3 ${
            message.ok ? "text-green-600" : "text-red-500"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
