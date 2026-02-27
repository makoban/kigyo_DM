"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getOnboardingState,
  setOnboardingState,
} from "@/lib/onboarding-store";

export default function SenderInputPage() {
  const router = useRouter();
  const existing = getOnboardingState().sender;

  const [url, setUrl] = useState(existing?.companyUrl || "");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: existing?.companyName || "",
    companyUrl: existing?.companyUrl || "",
    companyDescription: existing?.companyDescription || "",
    postalCode: existing?.postalCode || "",
    address: existing?.address || "",
    phone: existing?.phone || "",
    contactEmail: existing?.contactEmail || "",
    representativeName: existing?.representativeName || "",
  });
  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/scrape-hp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({
          ...prev,
          companyUrl: data.url || url.trim(),
          companyName: data.companyName || data.title || prev.companyName,
          companyDescription: data.description || prev.companyDescription,
          postalCode: data.postalCode || prev.postalCode,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          contactEmail: data.email || prev.contactEmail,
          representativeName: data.representative || prev.representativeName,
        }));
      }
    } catch {
      // Silently fail - user can fill manually
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    setOnboardingState((prev) => ({
      ...prev,
      sender: { ...form },
    }));
    router.push("/onboarding/sender-confirm");
  };

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        送り主情報
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        DMに記載される送り主の情報です。すべて任意ですので、後から設定画面で入力・変更できます。
      </p>

      {/* HP auto-read */}
      <div className="mb-6 p-4 rounded-xl bg-navy-800/5 border border-navy-700/10">
        <p className="text-sm font-medium text-navy-800 mb-2">
          HPから自動読取（任意）
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/40"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleScrape}
            loading={loading}
          >
            読取
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          読み取れない場合もあります。手動で入力・修正してください。
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4 mb-8">
        <Input
          label="会社名"
          value={form.companyName}
          onChange={(e) => updateField("companyName", e.target.value)}
          placeholder="株式会社〇〇"
        />
        <Input
          label="代表者名"
          value={form.representativeName}
          onChange={(e) => updateField("representativeName", e.target.value)}
          placeholder="山田 太郎"
        />
        <Input
          label="郵便番号"
          value={form.postalCode}
          onChange={(e) => updateField("postalCode", e.target.value)}
          placeholder="123-4567"
        />
        <Input
          label="住所"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="東京都渋谷区..."
        />
        <Input
          label="電話番号"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="03-1234-5678"
        />
        <Input
          label="メールアドレス"
          type="email"
          value={form.contactEmail}
          onChange={(e) => updateField("contactEmail", e.target.value)}
          placeholder="info@example.com"
        />
        <Input
          label="HP URL"
          value={form.companyUrl}
          onChange={(e) => updateField("companyUrl", e.target.value)}
          placeholder="https://example.com"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            事業内容
          </label>
          <textarea
            value={form.companyDescription}
            onChange={(e) => updateField("companyDescription", e.target.value)}
            placeholder="法人設立支援、記帳代行、税務相談など"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/market-preview")}
          className="flex-1"
        >
          戻る
        </Button>
        <Button onClick={handleNext} className="flex-1">
          次へ: 確認
        </Button>
      </div>
    </div>
  );
}
