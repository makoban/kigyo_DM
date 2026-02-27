"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getOnboardingState,
  setOnboardingState,
} from "@/lib/onboarding-store";

function generateGreeting(companyName: string, description: string): string {
  const serviceText = description
    ? `${description}を通じて`
    : "専門的なサービスを通じて";
  return `この度は御社のご設立、誠におめでとうございます。

私たち${companyName}は、${serviceText}、新設法人様の事業成長をお手伝いしております。

つきましては、御社の事業エリアにおける商圏データレポートを同封いたしました。地域の事業所数・業種構成・開業率などをまとめたものです。今後の事業計画にお役立ていただければ幸いです。

ご不明な点やご相談がございましたら、お気軽にお問い合わせください。
御社の益々のご発展を心よりお祈り申し上げます。`;
}

export default function GreetingPage() {
  const router = useRouter();
  const [text, setText] = useState("");

  useEffect(() => {
    const state = getOnboardingState();
    if (state.greetingText) {
      setText(state.greetingText);
    } else {
      const generated = generateGreeting(
        state.sender?.companyName || "弊社",
        state.sender?.companyDescription || ""
      );
      setText(generated);
    }
  }, [router]);

  const handleNext = () => {
    setOnboardingState((prev) => ({
      ...prev,
      greetingText: text,
    }));
    router.push("/onboarding/preview");
  };

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        挨拶文
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        DMに記載する挨拶文を編集できます。
        テンプレートから生成していますので、自由に修正してください。
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-sm text-gray-800 leading-relaxed placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400 mb-4"
      />

      <p className="text-xs text-gray-500 mb-8">
        ※ 挨拶文は後からダッシュボードの設定画面でいつでも変更できます。
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/sender-confirm")}
          className="flex-1"
        >
          戻る
        </Button>
        <Button onClick={handleNext} className="flex-1">
          次へ: プレビュー
        </Button>
      </div>
    </div>
  );
}
