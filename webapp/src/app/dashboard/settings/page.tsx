"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import type { Profile, Subscription } from "@/lib/types";

const PLANS = [
  { id: "start", label: "スタート", amount: 3800, letters: 10, desc: "地方・お試し" },
  { id: "standard", label: "スタンダード", amount: 7600, letters: 20, desc: "推奨" },
  { id: "pro", label: "プロ", amount: 15200, letters: 40, desc: "都市部" },
  { id: "full", label: "フル", amount: 38000, letters: 100, desc: "大口" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [changingPlan, setChangingPlan] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/dashboard/settings");
      if (res.status === 401) {
        window.location.href = "/onboarding/signup";
        return;
      }
      const data = await res.json();

      if (data.profile) {
        setProfile(data.profile);
        setCompanyName(data.profile.company_name || "");
        setAddress(data.profile.address || "");
        setPhone(data.profile.phone || "");
        setContactEmail(data.profile.contact_email || "");
        setRepresentativeName(data.profile.representative_name || "");
      }
      if (data.sub) {
        setSub(data.sub);
        setGreeting(data.sub.greeting_text || "");
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          address,
          phone,
          contact_email: contactEmail,
          representative_name: representativeName,
          greeting_text: greeting,
          subscription_id: sub?.id || null,
        }),
      });
      if (res.ok) {
        setMessage("保存しました");
      } else {
        const data = await res.json();
        setMessage(data.error || "保存に失敗しました");
      }
    } catch {
      setMessage("通信エラーが発生しました");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleChangePlan = async (newAmount: number) => {
    setChangingPlan(true);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planAmount: newAmount }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) =>
          prev ? { ...prev, plan_amount: newAmount } : prev
        );
        setMessage("プランを変更しました。翌月1日から反映されます。");
      } else {
        setMessage(data.error || "プラン変更に失敗しました");
      }
    } catch {
      setMessage("プラン変更に失敗しました");
    }
    setChangingPlan(false);
    setTimeout(() => setMessage(""), 5000);
  };

  const handlePause = async () => {
    if (!sub) return;
    try {
      const res = await fetch("/api/dashboard/pause-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: sub.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSub({ ...sub, status: data.status });
      } else {
        setMessage(data.error || "操作に失敗しました");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("通信エラーが発生しました");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!profile) {
    return <div className="py-20 text-center text-gray-400">読み込み中...</div>;
  }

  const currentPlan =
    PLANS.find((p) => p.amount === profile.plan_amount) || PLANS[1];

  return (
    <div className="animate-fade-in-up max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-6">
        設定
      </h1>

      {/* Area info */}
      {sub && (
        <Card className="mb-6">
          <CardTitle>エリア設定</CardTitle>
          <p className="text-sm text-gray-600 mt-2">{sub.area_label}</p>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                sub.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {sub.status === "active" ? "稼働中" : "一時停止中"}
            </span>
            <Button variant="ghost" size="sm" onClick={handlePause}>
              {sub.status === "active" ? "一時停止" : "再開"}
            </Button>
          </div>
        </Card>
      )}

      {/* Plan */}
      <Card className="mb-6">
        <CardTitle>プラン</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          現在:{" "}
          <span className="font-semibold text-navy-800">
            {currentPlan.label}
          </span>
          （&yen;{currentPlan.amount.toLocaleString()}/月 ・{" "}
          {currentPlan.letters}通）
        </p>
        <p className="text-sm text-gray-500 mt-1">
          残高:{" "}
          <span className="font-semibold text-gold-400">
            &yen;{profile.balance.toLocaleString()}
          </span>
          （{Math.floor(profile.balance / 380)}通分）
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleChangePlan(plan.amount)}
              disabled={changingPlan || plan.amount === profile.plan_amount}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                plan.amount === profile.plan_amount
                  ? "border-gold-400 bg-gold-400/5"
                  : "border-gray-200 hover:border-gray-300"
              } disabled:opacity-50`}
            >
              <p className="font-semibold text-navy-800">{plan.label}</p>
              <p className="text-gray-500 text-xs">
                &yen;{plan.amount.toLocaleString()}/月 ({plan.letters}通)
              </p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          プラン変更は翌月1日から反映されます
        </p>
      </Card>

      {/* Sender info */}
      <Card className="mb-6">
        <CardTitle>送り主情報</CardTitle>
        <div className="space-y-3 mt-4">
          <Input
            label="会社名"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Input
            label="代表者名"
            value={representativeName}
            onChange={(e) => setRepresentativeName(e.target.value)}
          />
          <Input
            label="住所"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label="電話番号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="メールアドレス"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
      </Card>

      {/* Greeting */}
      <Card className="mb-6">
        <CardTitle>挨拶文</CardTitle>
        <textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={8}
          className="w-full mt-3 rounded-lg border border-gray-300 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-gold-400/40"
        />
      </Card>

      {message && <p className="text-sm text-green-600 mb-4">{message}</p>}

      <Button onClick={handleSave} loading={saving} className="w-full">
        保存
      </Button>
    </div>
  );
}
