"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getOnboardingState,
  clearOnboardingState,
} from "@/lib/onboarding-store";

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const save = async () => {
      try {
        const state = getOnboardingState();

        const res = await fetch("/api/stripe/complete-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            area: state.area,
            sender: state.sender,
            greetingText: state.greetingText,
            planAmount: state.planAmount,
            shokenData: state.shokenData || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "保存に失敗しました");
        }

        clearOnboardingState();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "保存に失敗しました"
        );
      } finally {
        setSaving(false);
      }
    };
    save();
  }, [searchParams]);

  if (saving) {
    return (
      <div className="animate-fade-in-up text-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gold-400 border-t-transparent mb-4" />
        <p className="text-gray-500">設定を保存しています...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in-up">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">&#9888;</div>
          <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
            エラーが発生しました
          </h1>
          <p className="text-red-500 text-sm mb-6">{error}</p>
          <Button onClick={() => router.push("/onboarding/payment")}>
            もう一度試す
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold-400/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-gold-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
          設定完了！
        </h1>
        <p className="text-gray-600 text-sm mb-2">
          DM自動発送の準備が整いました。
        </p>
        <p className="text-gray-500 text-xs mb-8">
          明日以降、対象エリアの新設法人が見つかり次第、
          自動でDMが投函されます。
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          size="lg"
          className="mx-auto"
        >
          ダッシュボードへ
        </Button>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gold-400 border-t-transparent mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
