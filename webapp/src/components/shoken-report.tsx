"use client";

import type { ShokenData } from "@/lib/shoken-api";

interface ShokenReportProps {
  areaLabel: string;
  data: ShokenData;
  generatedDate?: string;
}

// 全国平均の参考値（e-Stat / 経済センサス等に基づく）
const NATIONAL_AVG = {
  household_income: 550,
  population_density: 340,
  daytime_ratio: 100,
  retail_spending_index: 100,
  food_spending_index: 100,
  service_spending_index: 100,
  establishments_per_1000: 45,
  under_20_pct: 17.5,
  age_20_34_pct: 14.0,
  age_35_49_pct: 18.5,
  age_50_64_pct: 20.0,
  over_65_pct: 30.0,
};

function fmt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("ja-JP");
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const w = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-1.5 text-[9px]">
      <span className="w-[44px] text-right text-gray-500 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-[12px] bg-gray-100 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${w}%`,
            background:
              w >= 80 ? "#c9a84c" : w >= 60 ? "#d4b970" : w >= 40 ? "#94a3b8" : "#cbd5e1",
          }}
        />
      </div>
      <span className="w-[24px] font-bold text-navy-800">{score}</span>
    </div>
  );
}

function CompareRow({
  label,
  local,
  national,
  unit,
}: {
  label: string;
  local: string;
  national: string;
  unit: string;
}) {
  const localNum = parseFloat(local.replace(/,/g, ""));
  const nationalNum = parseFloat(national.replace(/,/g, ""));
  const diff =
    !isNaN(localNum) && !isNaN(nationalNum) && nationalNum !== 0
      ? ((localNum - nationalNum) / nationalNum) * 100
      : null;

  return (
    <tr>
      <td className="text-gray-500 py-[2px] pr-1">{label}</td>
      <td className="font-semibold text-right" style={{ color: "#0d1b2a" }}>
        {local}
        <span className="text-gray-400 font-normal text-[8px] ml-0.5">{unit}</span>
      </td>
      <td className="text-right text-gray-400">
        {national}
        <span className="text-[8px] ml-0.5">{unit}</span>
      </td>
      <td className="text-right font-semibold" style={{ width: "52px" }}>
        {diff !== null ? (
          <span style={{ color: diff >= 0 ? "#c9a84c" : "#64748b" }}>
            {diff >= 0 ? "+" : ""}
            {diff.toFixed(1)}%
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function AgeBar({ label, pct, avg }: { label: string; pct: number; avg: number }) {
  const w = Math.max(0, Math.min(100, pct * 2));
  const avgW = Math.max(0, Math.min(100, avg * 2));
  return (
    <div className="flex items-center gap-1 text-[9px]">
      <span className="w-[36px] text-right text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-[10px] bg-gray-100 rounded-sm overflow-hidden relative">
        <div
          className="h-full rounded-sm absolute top-0 left-0"
          style={{ width: `${w}%`, background: "#c9a84c", opacity: 0.7 }}
        />
        <div
          className="absolute top-0 h-full border-r-2 border-dashed"
          style={{ left: `${avgW}%`, borderColor: "#ef4444", opacity: 0.5 }}
        />
      </div>
      <span className="w-[36px] font-bold text-navy-800">{pct.toFixed(1)}%</span>
      <span className="w-[28px] text-gray-400 text-[8px]">({avg.toFixed(1)})</span>
    </div>
  );
}

export default function ShokenReport({
  areaLabel,
  data,
  generatedDate,
}: ShokenReportProps) {
  const date =
    generatedDate ||
    new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  const p = data.population;
  const be = data.business_establishments;
  const sp = data.spending_power;
  const ls = data.location_score;
  const dp = data.daytime_population;
  const cd = data.competition_density;
  const age = data.age_composition;

  const metrics = [
    { label: "総人口", value: fmt(p.total_population), unit: "人" },
    { label: "世帯数", value: fmt(p.households), unit: "世帯" },
    { label: "事業所数", value: fmt(be.total), unit: "件" },
    {
      label: "昼夜間人口比",
      value: dp.daytime_ratio ? `${dp.daytime_ratio.toFixed(0)}` : "—",
      unit: "%",
    },
    {
      label: "世帯年収",
      value: sp.avg_household_income ? `${sp.avg_household_income}` : "—",
      unit: "万円",
    },
    {
      label: "小売消費指数",
      value: sp.retail_spending_index ? `${sp.retail_spending_index}` : "—",
      unit: "(全国=100)",
    },
    { label: "人口密度", value: fmt(p.population_density), unit: "人/km²" },
    {
      label: "出店適性",
      value: `${ls.overall_score}`,
      unit: `/ ${ls.grade}`,
      highlight: true,
    },
  ];

  const industries = [
    { label: "小売業", value: be.retail },
    { label: "飲食業", value: be.food_service },
    { label: "サービス", value: be.services },
    { label: "医療福祉", value: be.medical },
  ];
  const maxInd = Math.max(...industries.map((i) => i.value || 0), 1);

  return (
    <div
      className="bg-white text-gray-900 w-full"
      style={{
        fontFamily: '"Noto Sans JP", "Noto Serif JP", sans-serif',
        maxWidth: "210mm",
        minHeight: "290mm",
        padding: "18px 22px 14px",
        fontSize: "10px",
        lineHeight: "1.45",
      }}
    >
      {/* Header */}
      <div
        style={{ borderTop: "3px solid #c9a84c", paddingTop: "6px" }}
        className="mb-2.5"
      >
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-[15px] font-bold tracking-wide"
              style={{ color: "#0d1b2a", fontFamily: '"Noto Serif JP", serif' }}
            >
              商圏データレポート
            </h1>
            <p className="text-[12px] font-semibold mt-0.5" style={{ color: "#c9a84c" }}>
              {areaLabel}
            </p>
          </div>
          <p className="text-[8px] text-gray-400">{date} 作成</p>
        </div>
      </div>

      {/* Key Metrics Grid 4x2 */}
      <div className="grid grid-cols-4 gap-1 mb-2.5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded px-1.5 py-1 text-center"
            style={{
              background: m.highlight ? "#0d1b2a" : "#f8fafc",
              border: m.highlight ? "none" : "1px solid #e2e8f0",
            }}
          >
            <p
              className="text-[8px] mb-0.5"
              style={{ color: m.highlight ? "#c9a84c" : "#64748b" }}
            >
              {m.label}
            </p>
            <p
              className="text-[14px] font-bold leading-tight"
              style={{ color: m.highlight ? "#fff" : "#0d1b2a" }}
            >
              {m.value}
              <span
                className="text-[7px] font-normal ml-0.5"
                style={{ color: "#94a3b8" }}
              >
                {m.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* === Row: National Comparison Table + Age Composition === */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        {/* National Comparison */}
        <div>
          <SectionTitle>全国平均との比較</SectionTitle>
          <table className="w-full text-[9px] mt-1 border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-gray-400 font-normal pb-0.5">指標</th>
                <th className="text-right text-gray-400 font-normal pb-0.5">当地域</th>
                <th className="text-right text-gray-400 font-normal pb-0.5">全国平均</th>
                <th className="text-right text-gray-400 font-normal pb-0.5" style={{ width: "52px" }}>
                  差分
                </th>
              </tr>
            </thead>
            <tbody>
              <CompareRow
                label="世帯年収"
                local={sp.avg_household_income ? `${sp.avg_household_income}` : "—"}
                national={`${NATIONAL_AVG.household_income}`}
                unit="万円"
              />
              <CompareRow
                label="人口密度"
                local={p.population_density ? `${fmt(p.population_density)}` : "—"}
                national={`${NATIONAL_AVG.population_density}`}
                unit="/km²"
              />
              <CompareRow
                label="小売消費"
                local={sp.retail_spending_index ? `${sp.retail_spending_index}` : "—"}
                national={`${NATIONAL_AVG.retail_spending_index}`}
                unit=""
              />
              <CompareRow
                label="飲食消費"
                local={sp.food_spending_index ? `${sp.food_spending_index}` : "—"}
                national={`${NATIONAL_AVG.food_spending_index}`}
                unit=""
              />
              <CompareRow
                label="ｻｰﾋﾞｽ消費"
                local={sp.service_spending_index ? `${sp.service_spending_index}` : "—"}
                national={`${NATIONAL_AVG.service_spending_index}`}
                unit=""
              />
              <CompareRow
                label="昼夜間比"
                local={dp.daytime_ratio ? `${dp.daytime_ratio.toFixed(0)}` : "—"}
                national={`${NATIONAL_AVG.daytime_ratio}`}
                unit="%"
              />
            </tbody>
          </table>
        </div>

        {/* Age Composition */}
        <div>
          <SectionTitle>年齢構成（全国平均比較）</SectionTitle>
          <div className="space-y-0.5 mt-1">
            {age && (
              <>
                <AgeBar label="〜19歳" pct={age.under_20_pct} avg={NATIONAL_AVG.under_20_pct} />
                <AgeBar label="20〜34" pct={age.age_20_34_pct} avg={NATIONAL_AVG.age_20_34_pct} />
                <AgeBar label="35〜49" pct={age.age_35_49_pct} avg={NATIONAL_AVG.age_35_49_pct} />
                <AgeBar label="50〜64" pct={age.age_50_64_pct} avg={NATIONAL_AVG.age_50_64_pct} />
                <AgeBar label="65歳〜" pct={age.over_65_pct} avg={NATIONAL_AVG.over_65_pct} />
              </>
            )}
          </div>
          <p className="text-[8px] text-gray-400 mt-0.5">
            ■ 当地域 ┊ 赤線: 全国平均 (カッコ内)
          </p>
        </div>
      </div>

      {/* === Row: Business Stats + Location Score === */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        {/* Business Establishments */}
        <div>
          <SectionTitle>事業所統計</SectionTitle>
          <div className="space-y-0.5 mt-1">
            {industries.map((ind) => (
              <div key={ind.label} className="flex items-center gap-1">
                <span className="w-[48px] text-[9px] text-gray-500 shrink-0 text-right">
                  {ind.label}
                </span>
                <div className="flex-1 h-[11px] bg-gray-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${((ind.value || 0) / maxInd) * 100}%`,
                      background: "#c9a84c",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="w-[36px] text-[9px] font-semibold text-navy-800 text-right">
                  {fmt(ind.value)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[8px] text-gray-400 mt-0.5">
            人口千人あたり {be.establishments_per_1000 || "—"} 事業所
            <span className="ml-1">(全国平均: {NATIONAL_AVG.establishments_per_1000})</span>
          </p>
        </div>

        {/* Location Score */}
        <div>
          <SectionTitle>出店適性スコア</SectionTitle>
          <div className="space-y-0.5 mt-1">
            <ScoreBar score={ls.traffic_score} label="交通" />
            <ScoreBar score={ls.population_score} label="人口" />
            <ScoreBar score={ls.competition_score} label="競合" />
            <ScoreBar score={ls.spending_score} label="消費力" />
            <ScoreBar score={ls.growth_score} label="成長性" />
          </div>
          <p className="text-[8px] text-gray-400 mt-0.5">
            総合スコア: <span className="font-bold" style={{ color: "#c9a84c" }}>{ls.overall_score}点</span> / 判定: <span className="font-bold" style={{ color: "#0d1b2a" }}>{ls.grade}</span>
          </p>
        </div>
      </div>

      {/* === Row: Competition + Daytime Population === */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div>
          <SectionTitle>競合環境</SectionTitle>
          <table className="w-full text-[9px] mt-1">
            <tbody>
              <tr>
                <td className="text-gray-500 py-[2px] pr-1">飽和度</td>
                <td className="font-semibold" style={{ color: "#0d1b2a" }}>
                  {cd.saturation_level || "—"}
                  <span className="text-gray-400 font-normal ml-1">
                    (指数: {cd.saturation_index || "—"})
                  </span>
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 py-[2px] pr-1">参入余地</td>
                <td className="font-semibold" style={{ color: "#c9a84c" }}>
                  {cd.opportunity_sectors?.join("、") || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <SectionTitle>昼夜間人口</SectionTitle>
          <table className="w-full text-[9px] mt-1">
            <tbody>
              <tr>
                <td className="text-gray-500 py-[2px] pr-1">昼間人口</td>
                <td className="font-semibold" style={{ color: "#0d1b2a" }}>
                  {fmt(dp.daytime_pop)} <span className="text-gray-400 font-normal text-[8px]">人</span>
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 py-[2px] pr-1">夜間人口</td>
                <td className="font-semibold" style={{ color: "#0d1b2a" }}>
                  {fmt(dp.nighttime_pop)} <span className="text-gray-400 font-normal text-[8px]">人</span>
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 py-[2px] pr-1">昼夜比率</td>
                <td className="font-semibold" style={{ color: "#c9a84c" }}>
                  {dp.daytime_ratio ? `${dp.daytime_ratio.toFixed(1)}%` : "—"}
                  <span className="text-gray-400 font-normal ml-1 text-[8px]">
                    (全国: {NATIONAL_AVG.daytime_ratio}%)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mb-2">
        <SectionTitle>AI商圏分析</SectionTitle>
        <p className="text-[9px] leading-relaxed mt-1" style={{ color: "#334155" }}>
          {data.shoken_summary || "分析データを取得中です..."}
        </p>
      </div>

      {/* AI Recommendation */}
      {ls.ai_recommendation && (
        <div
          className="rounded px-3 py-2 mb-2"
          style={{
            background: "#0d1b2a",
            border: "1px solid rgba(201, 168, 76, 0.3)",
          }}
        >
          <p className="text-[8px] mb-0.5" style={{ color: "#c9a84c" }}>
            AI総合判定
          </p>
          <p className="text-[9px]" style={{ color: "#e2e8f0" }}>
            {ls.ai_recommendation}
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="text-center pt-1.5 mt-auto"
        style={{ borderTop: "1px solid #e2e8f0" }}
      >
        <p className="text-[7px] text-gray-400">
          データソース: 政府統計(e-Stat) + AI分析(Gemini 2.0 Flash) ｜ 全国平均値は経済センサス・国勢調査に基づく参考値 ｜ 起業サーチDM営業サービス
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[10px] font-bold"
      style={{
        color: "#0d1b2a",
        borderLeft: "3px solid #c9a84c",
        paddingLeft: "5px",
      }}
    >
      {children}
    </h3>
  );
}
