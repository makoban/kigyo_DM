import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const UNIT_PRICE = 380; // 1通あたりの単価（税込・円）

// プリペイドプラン定義
export const PLANS = [
  { id: "start", label: "スタート", amount: 3800, letters: 10, desc: "地方・お試し" },
  { id: "standard", label: "スタンダード", amount: 7600, letters: 20, desc: "推奨" },
  { id: "pro", label: "プロ", amount: 15200, letters: 40, desc: "都市部" },
  { id: "full", label: "フル", amount: 38000, letters: 100, desc: "大口" },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const DEFAULT_PLAN_AMOUNT = 7600;

// 残高の繰り越し上限倍率
export const MAX_BALANCE_MULTIPLIER = 3;
