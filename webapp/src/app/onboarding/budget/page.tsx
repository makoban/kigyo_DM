"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getOnboardingState,
  setOnboardingState,
} from "@/lib/onboarding-store";

const UNIT_PRICE = 380;
const PLANS = [
  { id: "start", label: "スタート", amount: 3800, letters: 10, desc: "地方・お試し" },
  { id: "standard", label: "スタンダード", amount: 7600, letters: 20, desc: "推奨" },
  { id: "pro", label: "プロ", amount: 15200, letters: 40, desc: "都市部" },
  { id: "full", label: "フル", amount: 38000, letters: 100, desc: "大口" },
];

export default function BudgetPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(7600);
  const [nbMonth, setNbMonth] = useState(0);

  useEffect(() => {
    const state = getOnboardingState();
    if (state.planAmount) {
      setSelected(state.planAmount);
    }
    if (state.marketData) {
      setNbMonth(state.marketData.nbMonth);
    }
  }, []);

  // 最適プランを自動判定
  const bestPlan = PLANS.reduce((best, plan) => {
    if (plan.letters >= nbMonth && (!best || plan.amount < best.amount)) return plan;
    return best;
  }, null as (typeof PLANS)[number] | null) || PLANS[1];

  const selectedPlan = PLANS.find((p) => p.amount === selected) || PLANS[1];
  const coversAll = selectedPlan.letters >= nbMonth;

  const handleNext = () => {
    setOnboardingState((prev) => ({
      ...prev,
      planAmount: selected,
    }));
    router.push("/onboarding/payment");
  };

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        プランを選択
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        毎月自動チャージされ、DM送付時に残高から差し引かれます。
        残高は翌月に繰り越せます。
      </p>

      {/* Plan cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {PLANS.map((plan) => {
          const isBest = nbMonth > 0 && plan.id === bestPlan.id;
          const isSelected = selected === plan.amount;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.amount)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? "border-gold-400 bg-gold-400/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {isBest && (
                <span className="absolute -top-2.5 left-3 bg-gold-400 text-navy-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  おすすめ
                </span>
              )}
              <p className="text-xs text-gray-500 mb-1">{plan.desc}</p>
              <p className="font-serif text-lg font-semibold text-navy-800">
                {plan.label}
              </p>
              <p className="text-2xl font-bold text-navy-800 mt-1">
                &yen;{plan.amount.toLocaleString()}
                <span className="text-sm font-normal text-gray-500">/月</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                月 <span className="font-semibold">{plan.letters}通</span> まで
              </p>
            </button>
          );
        })}
      </div>

      {/* Result card */}
      <Card className="mb-8 bg-navy-800/5 border-navy-700/10">
        <div className="text-center mb-3">
          <p className="text-sm text-gray-500">月額チャージ</p>
          <p className="text-3xl font-bold text-navy-800">
            &yen;{selectedPlan.amount.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            最大 <span className="font-semibold">{selectedPlan.letters}通</span>/月
            &middot; 1通{UNIT_PRICE}円
          </p>
        </div>
        {nbMonth > 0 && (
          <div className="text-center pt-3 border-t border-navy-700/10">
            {coversAll ? (
              <p className="text-sm text-green-600">
                この地域の全ての新設法人{" "}
                <span className="font-semibold">{nbMonth}社</span>{" "}
                にお届けできます。
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                月間 {nbMonth}社 のうち{" "}
                <span className="font-semibold">{selectedPlan.letters}社</span>{" "}
                にお届けします。
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/preview")}
          className="flex-1"
        >
          戻る
        </Button>
        <Button onClick={handleNext} className="flex-1">
          次へ: お支払い
        </Button>
      </div>
    </div>
  );
}
