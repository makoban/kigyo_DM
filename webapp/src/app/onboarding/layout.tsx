"use client";

import { usePathname } from "next/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";

const STEPS = [
  { path: "/onboarding/area", label: "エリア選択" },
  { path: "/onboarding/market-preview", label: "市場プレビュー" },
  { path: "/onboarding/sender-input", label: "送り主情報" },
  { path: "/onboarding/sender-confirm", label: "送り主確認" },
  { path: "/onboarding/greeting", label: "挨拶文" },
  { path: "/onboarding/preview", label: "プレビュー" },
  { path: "/onboarding/signup", label: "会員登録" },
  { path: "/onboarding/budget", label: "上限設定" },
  { path: "/onboarding/payment", label: "お支払い" },
  { path: "/onboarding/complete", label: "完了" },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => s.path === pathname);
  const current = currentIndex >= 0 ? currentIndex + 1 : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy-800 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="https://kigyo-dm.bantex.jp/" className="font-serif text-lg font-semibold tracking-wide">
            <span className="text-gold-400">起業サーチ</span>
            <span className="text-gray-300 text-sm ml-1">DM営業</span>
          </a>
          <span className="text-xs text-gray-400">
            {STEPS[current - 1]?.label}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <ProgressBar
          current={current}
          total={STEPS.length}
          labels={STEPS.map((s) => s.label)}
        />
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 pb-8 text-center">
        <a
          href="https://kigyo-dm.bantex.jp/"
          className="inline-block text-xs text-gray-400 hover:text-gold-400 transition-colors"
        >
          &larr; TOPページに戻る
        </a>
      </footer>
    </div>
  );
}
