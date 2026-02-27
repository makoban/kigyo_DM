"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOnboardingState, type OnboardingState } from "@/lib/onboarding-store";

type Sender = NonNullable<OnboardingState["sender"]>;

export default function SenderConfirmPage() {
  const router = useRouter();
  const [sender, setSender] = useState<Sender | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const state = getOnboardingState();
    setSender(state.sender || null);
    setLoaded(true);
  }, [router]);

  if (!loaded) {
    return <div className="py-20 text-center text-gray-400">読み込み中...</div>;
  }

  const rows = sender
    ? [
        { label: "会社名", value: sender.companyName },
        { label: "代表者名", value: sender.representativeName },
        { label: "郵便番号", value: sender.postalCode },
        { label: "住所", value: sender.address },
        { label: "電話番号", value: sender.phone },
        { label: "メールアドレス", value: sender.contactEmail },
        { label: "HP URL", value: sender.companyUrl },
        { label: "事業内容", value: sender.companyDescription },
      ].filter((r) => r.value)
    : [];

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        送り主情報の確認
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        以下の情報でDMを発送します。内容をご確認ください。
      </p>

      <Card className="mb-8">
        {rows.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.label} className="flex py-3">
                <span className="w-28 shrink-0 text-sm text-gray-500">
                  {row.label}
                </span>
                <span className="text-sm text-gray-800 break-all">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            送り主情報は未入力です。後から設定画面で入力できます。
          </p>
        )}
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/sender-input")}
          className="flex-1"
        >
          修正する
        </Button>
        <Button
          onClick={() => router.push("/onboarding/greeting")}
          className="flex-1"
        >
          次へ: 挨拶文
        </Button>
      </div>
    </div>
  );
}
