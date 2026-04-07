"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import type { Profile, Subscription } from "@/lib/types";
import {
  buildAllLocations,
  searchLocations,
  type AreaLocation,
} from "@/lib/area-data";

const allLocations = buildAllLocations();

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

  // Area edit states
  const [editingArea, setEditingArea] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const [areaSuggestions, setAreaSuggestions] = useState<AreaLocation[]>([]);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [areaActiveIdx, setAreaActiveIdx] = useState(-1);
  const [selectedArea, setSelectedArea] = useState<AreaLocation | null>(null);
  const [changingArea, setChangingArea] = useState(false);
  const areaInputRef = useRef<HTMLInputElement>(null);
  const areaSuggestRef = useRef<HTMLDivElement>(null);

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

  const handleAreaSearch = useCallback((q: string) => {
    setAreaQuery(q);
    setSelectedArea(null);
    if (q.trim().length === 0) {
      setAreaSuggestions([]);
      setAreaDropdownOpen(false);
      return;
    }
    const results = searchLocations(allLocations, q.trim(), 12);
    setAreaSuggestions(results);
    setAreaDropdownOpen(results.length > 0);
    setAreaActiveIdx(-1);
  }, []);

  const handleAreaSelect = useCallback((loc: AreaLocation) => {
    setSelectedArea(loc);
    setAreaQuery(
      loc.type === "city"
        ? loc.display || `${loc.pref} ${loc.name}`
        : loc.name
    );
    setAreaDropdownOpen(false);
    setAreaSuggestions([]);
  }, []);

  const handleAreaKeyDown = (e: React.KeyboardEvent) => {
    if (!areaDropdownOpen || areaSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAreaActiveIdx((prev) => Math.min(prev + 1, areaSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAreaActiveIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && areaActiveIdx >= 0) {
      e.preventDefault();
      handleAreaSelect(areaSuggestions[areaActiveIdx]);
    }
  };

  // Close area dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        areaSuggestRef.current &&
        !areaSuggestRef.current.contains(e.target as Node) &&
        areaInputRef.current &&
        !areaInputRef.current.contains(e.target as Node)
      ) {
        setAreaDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleChangeArea = async () => {
    if (!selectedArea || !sub) return;
    setChangingArea(true);
    setMessage("");
    try {
      const prefecture = selectedArea.pref;
      const city = selectedArea.type === "city" ? selectedArea.name : null;
      const areaLabel =
        selectedArea.type === "city"
          ? selectedArea.display || `${selectedArea.pref} ${selectedArea.name}`
          : selectedArea.name;

      const res = await fetch("/api/dashboard/change-area", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefecture,
          city,
          areaLabel,
          subscriptionId: sub.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSub({
          ...sub,
          area_label: data.areaLabel,
          prefecture,
          city,
          shoken_jpg_url: data.shokenJpgUrl || null,
        });
        setEditingArea(false);
        setSelectedArea(null);
        setAreaQuery("");
        setMessage("エリアと商圏データを更新しました");
      } else {
        setMessage(data.error || "エリア変更に失敗しました");
      }
    } catch {
      setMessage("通信エラーが発生しました");
    }
    setChangingArea(false);
    setTimeout(() => setMessage(""), 5000);
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
          <div className="flex items-center justify-between">
            <CardTitle>エリア設定</CardTitle>
            {!editingArea && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingArea(true);
                  setTimeout(() => areaInputRef.current?.focus(), 100);
                }}
              >
                変更
              </Button>
            )}
          </div>

          {editingArea ? (
            <div className="mt-3">
              <div className="relative">
                <input
                  ref={areaInputRef}
                  type="text"
                  value={areaQuery}
                  onChange={(e) => handleAreaSearch(e.target.value)}
                  onKeyDown={handleAreaKeyDown}
                  onFocus={() => {
                    if (areaSuggestions.length > 0) setAreaDropdownOpen(true);
                  }}
                  placeholder="例: 渋谷区、名古屋市、東京都..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                />
                {areaDropdownOpen && areaSuggestions.length > 0 && (
                  <div
                    ref={areaSuggestRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto"
                  >
                    {areaSuggestions.map((loc, i) => {
                      const label =
                        loc.type === "city"
                          ? loc.display || loc.name
                          : `${loc.name} (全域)`;
                      return (
                        <button
                          key={`${loc.pref}-${loc.name}-${i}`}
                          onClick={() => handleAreaSelect(loc)}
                          className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 last:border-b-0 ${
                            i === areaActiveIdx
                              ? "bg-gold-400/10 text-gold-400"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedArea && (
                <p className="text-sm text-navy-800 font-medium mt-2">
                  {selectedArea.type === "city"
                    ? selectedArea.display || `${selectedArea.pref} ${selectedArea.name}`
                    : selectedArea.name}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleChangeArea}
                  disabled={!selectedArea}
                  loading={changingArea}
                  size="sm"
                >
                  {changingArea ? "商圏データ生成中..." : "エリア変更"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingArea(false);
                    setSelectedArea(null);
                    setAreaQuery("");
                  }}
                >
                  キャンセル
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                エリアを変更すると商圏レポートが自動的に再生成されます
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mt-2">{sub.area_label}</p>
          )}

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
        {profile.plan_type === "free_forever" ? (
          <div className="mt-2">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gold-400/15 text-gold-400">
              永久無料プラン
            </span>
            <p className="text-sm text-gray-500 mt-2">
              このアカウントはサンプル用の永久無料プランです。すべてのダッシュボード機能をご利用いただけます。
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
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

      {/* Shoken report JPG preview */}
      {sub && (
        <Card className="mb-6">
          <CardTitle>商圏レポート JPG</CardTitle>
          {sub.shoken_jpg_url ? (
            <div className="mt-3">
              <img
                src={sub.shoken_jpg_url}
                alt="商圏レポート"
                className="w-full border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-2">
                設定を変更して保存すると、次回バッチ時に自動で再生成されます
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-3">
              商圏レポートJPGは未生成です。次回のバッチ処理で自動生成されます。
            </p>
          )}
        </Card>
      )}

      {message && <p className="text-sm text-green-600 mb-4">{message}</p>}

      <Button onClick={handleSave} loading={saving} className="w-full">
        保存
      </Button>
    </div>
  );
}
