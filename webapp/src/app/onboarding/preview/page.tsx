"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getOnboardingState,
  type OnboardingState,
} from "@/lib/onboarding-store";
import ShokenReport from "@/components/shoken-report";

type Tab = "greeting" | "report";

export default function PreviewPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>({});
  const [tab, setTab] = useState<Tab>("greeting");

  useEffect(() => {
    const s = getOnboardingState();
    if (!s.greetingText) {
      router.replace("/onboarding/greeting");
      return;
    }
    setState(s);
  }, [router]);

  const sender = state.sender;
  const greeting = state.greetingText;
  const area = state.area;
  const shokenData = state.shokenData;

  if (!greeting) {
    return (
      <div className="py-20 text-center text-gray-400">読み込み中...</div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        DM プレビュー
      </h1>
      <p className="text-gray-600 text-sm mb-4">
        封筒に同封される2枚の書類です。タブで切り替えて確認してください。
      </p>

      {/* Tab switcher */}
      <div className="flex mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab("greeting")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "greeting"
              ? "border-gold-400 text-navy-800"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          挨拶文 (B5)
        </button>
        <button
          onClick={() => setTab("report")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "report"
              ? "border-gold-400 text-navy-800"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          商圏レポート (A4)
        </button>
      </div>

      {/* Envelope badge */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-navy-800/5 rounded-full">
          <span>&#9993;</span> この2枚が封筒に同封されます
        </span>
      </div>

      {/* Tab content */}
      {tab === "greeting" ? (
        /* B5 Greeting Letter */
        <div className="mb-6 bg-white border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8" style={{ minHeight: "500px" }}>
            <div className="h-1 w-16 bg-gold-400 mb-6" />
            <p className="text-xs text-gray-400 mb-4">令和〇年〇月〇日</p>
            <div className="mb-6">
              <p className="text-sm text-gray-700 font-semibold">
                〇〇株式会社 御中
              </p>
              <p className="text-xs text-gray-500">
                設立おめでとうございます
              </p>
            </div>
            <div className="mb-8 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {greeting}
            </div>
            <div className="border-t border-gray-200 pt-4">
              {sender?.companyName ? (
                <>
                  <p className="text-sm font-semibold text-navy-800">
                    {sender.companyName}
                  </p>
                  {sender.representativeName && (
                    <p className="text-xs text-gray-600">
                      代表 {sender.representativeName}
                    </p>
                  )}
                  {(sender.postalCode || sender.address) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {sender.postalCode ? `〒${sender.postalCode} ` : ""}
                      {sender.address || ""}
                    </p>
                  )}
                  {(sender.phone || sender.contactEmail) && (
                    <p className="text-xs text-gray-500">
                      {[
                        sender.phone && `TEL: ${sender.phone}`,
                        sender.contactEmail,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  )}
                  {sender.companyUrl && (
                    <p className="text-xs text-gold-400 mt-1">
                      {sender.companyUrl}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400">
                  送り主情報は未設定です（後から設定画面で入力できます）
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* A4 Shoken Report */
        <div className="mb-6 border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {shokenData ? (
            <ShokenReport
              areaLabel={area?.areaLabel || "対象エリア"}
              data={shokenData}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="inline-block w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">商圏レポートを生成中...</p>
              <p className="text-xs mt-1">
                e-Stat + AI分析で{area?.areaLabel || "対象エリア"}
                のデータを取得しています
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/greeting")}
          className="flex-1"
        >
          戻る: 挨拶文
        </Button>
        <Button
          onClick={() => router.push("/onboarding/signup")}
          className="flex-1"
        >
          次へ: 会員登録
        </Button>
      </div>
    </div>
  );
}
