"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildAllLocations,
  calcData,
  SECTOR_LABELS,
  type LocationResult,
} from "@/lib/area-data";
import {
  getOnboardingState,
  setOnboardingState,
} from "@/lib/onboarding-store";
import { fetchShokenData } from "@/lib/shoken-api";

export default function MarketPreviewPage() {
  const router = useRouter();
  const [data, setData] = useState<LocationResult | null>(null);
  const [areaLabel, setAreaLabel] = useState("");
  const [shokenLoading, setShokenLoading] = useState(false);
  const [shokenDone, setShokenDone] = useState(false);

  useEffect(() => {
    const state = getOnboardingState();
    if (!state.area) {
      router.replace("/onboarding/area");
      return;
    }
    const allLocations = buildAllLocations();
    const loc = allLocations.find(
      (l) =>
        l.pref === state.area!.prefecture &&
        (state.area!.city ? l.name === state.area!.city : l.type === "pref")
    );
    if (!loc) {
      router.replace("/onboarding/area");
      return;
    }
    const result = calcData(loc);
    if (result) {
      setData(result);
      setAreaLabel(state.area!.areaLabel);
      setOnboardingState((prev) => ({
        ...prev,
        marketData: {
          nbMonth: result.nbMonth,
          costMonth: result.costMonth,
          nbYear: result.nbYear,
          est: result.est,
          rate: result.rate,
        },
      }));
    }

    // Fetch real shoken data in background (skip if already cached)
    if (state.shokenData) {
      setShokenDone(true);
    } else {
      setShokenLoading(true);
      fetchShokenData(state.area!.prefecture, state.area!.city)
        .then((shoken) => {
          setOnboardingState((prev) => ({ ...prev, shokenData: shoken }));
          setShokenDone(true);
        })
        .catch((err) => {
          console.warn("商圏データ取得失敗（静的データで続行）:", err);
          setShokenDone(true);
        })
        .finally(() => setShokenLoading(false));
    }
  }, [router]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  type SectorKey = "service" | "retail" | "food" | "construct" | "manufacture";
  const sectorOrder: SectorKey[] = [
    "service",
    "retail",
    "food",
    "construct",
    "manufacture",
  ];
  const maxSector = Math.max(
    ...sectorOrder.map((k) => data.sectors[k])
  );

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        市場プレビュー
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        <span className="font-semibold text-gold-400">{areaLabel}</span>{" "}
        の市場データです。
      </p>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="text-center py-5">
          <p className="text-3xl font-bold text-navy-800">
            {data.nbMonth.toLocaleString()}
            <span className="text-base font-normal text-gray-500 ml-1">
              社/月
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">月間新設法人数</p>
        </Card>
        <Card className="text-center py-5 bg-gold-400/5 border-gold-400/20">
          <p className="text-3xl font-bold text-gold-400">
            &yen;{data.costMonth.toLocaleString()}
            <span className="text-base font-normal text-gold-300 ml-1">
              /月
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">月額費用目安</p>
        </Card>
      </div>

      {/* Sub metrics */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="text-center p-3 rounded-lg bg-gray-50">
          <p className="text-lg font-semibold text-navy-800">
            {data.est.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">事業所数</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-gray-50">
          <p className="text-lg font-semibold text-navy-800">
            {data.nbYear.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">年間新設数</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-gray-50">
          <p className="text-lg font-semibold text-navy-800">
            {data.rate}
            <span className="text-sm">%</span>
          </p>
          <p className="text-xs text-gray-500">開業率</p>
        </div>
      </div>

      {/* Industry chart */}
      <Card className="mb-8">
        <h2 className="font-serif text-base font-semibold text-navy-800 mb-4">
          業種別事業所構成
        </h2>
        <div className="space-y-3">
          {sectorOrder.map((key) => {
            const value = data.sectors[key];
            const pct = (value / maxSector) * 100;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-24 shrink-0">
                  {SECTOR_LABELS[key]}
                </span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-400/70 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">
                  {value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Cost note */}
      <div className="mb-4 p-4 rounded-xl bg-navy-800/5 border border-navy-700/10">
        <p className="text-sm text-gray-600">
          1通 <span className="font-semibold text-navy-800">380円</span>（税込）。
          月額上限を設定できるので、予算を超えることはありません。
          上限設定は登録後に行えます。
        </p>
      </div>

      {/* Shoken data status */}
      <div className="mb-8 flex items-center gap-2 text-xs text-gray-500">
        {shokenLoading ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            商圏レポートを生成中（e-Stat + AI分析）...
          </>
        ) : shokenDone ? (
          <>
            <span className="text-green-500">&#10003;</span>
            商圏レポート生成済み — プレビュー画面で確認できます
          </>
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/area")}
          className="flex-1"
        >
          戻る
        </Button>
        <Button
          onClick={() => router.push("/onboarding/sender-input")}
          className="flex-1"
        >
          次へ: 送り主情報
        </Button>
      </div>
    </div>
  );
}
