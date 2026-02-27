"use client";

import type { ShokenData } from "@/lib/shoken-api";

interface ShokenReportProps {
  areaLabel: string;
  data: ShokenData;
  generatedDate?: string;
}

function fmt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("ja-JP");
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const w = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-[52px] text-right text-gray-500 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-[14px] bg-gray-100 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${w}%`,
            background:
              w >= 80
                ? "#c9a84c"
                : w >= 60
                  ? "#d4b970"
                  : w >= 40
                    ? "#94a3b8"
                    : "#cbd5e1",
          }}
        />
      </div>
      <span className="w-[28px] font-bold text-navy-800">{score}</span>
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
    { label: "サービス業", value: be.services },
    { label: "医療・福祉", value: be.medical },
  ];
  const maxInd = Math.max(...industries.map((i) => i.value || 0), 1);

  return (
    <div
      className="bg-white text-gray-900 w-full"
      style={{
        fontFamily: '"Noto Sans JP", "Noto Serif JP", sans-serif',
        maxWidth: "210mm",
        minHeight: "280mm",
        padding: "20px 24px 16px",
        fontSize: "11px",
        lineHeight: "1.5",
      }}
    >
      {/* Header */}
      <div
        style={{ borderTop: "3px solid #c9a84c", paddingTop: "8px" }}
        className="mb-3"
      >
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-[16px] font-bold tracking-wide"
              style={{ color: "#0d1b2a", fontFamily: '"Noto Serif JP", serif' }}
            >
              商圏データレポート
            </h1>
            <p
              className="text-[13px] font-semibold mt-0.5"
              style={{ color: "#c9a84c" }}
            >
              {areaLabel}
            </p>
          </div>
          <p className="text-[9px] text-gray-400">{date} 作成</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded px-2 py-1.5 text-center"
            style={{
              background: m.highlight ? "#0d1b2a" : "#f8fafc",
              border: m.highlight ? "none" : "1px solid #e2e8f0",
            }}
          >
            <p
              className="text-[9px] mb-0.5"
              style={{ color: m.highlight ? "#c9a84c" : "#64748b" }}
            >
              {m.label}
            </p>
            <p
              className="text-[15px] font-bold leading-tight"
              style={{ color: m.highlight ? "#fff" : "#0d1b2a" }}
            >
              {m.value}
              <span
                className="text-[8px] font-normal ml-0.5"
                style={{ color: m.highlight ? "#94a3b8" : "#94a3b8" }}
              >
                {m.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Two-column: Business Stats + Location Score */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Business Establishments */}
        <div>
          <SectionTitle>事業所統計</SectionTitle>
          <div className="space-y-1 mt-1">
            {industries.map((ind) => (
              <div key={ind.label} className="flex items-center gap-1.5">
                <span className="w-[60px] text-[10px] text-gray-500 shrink-0 text-right">
                  {ind.label}
                </span>
                <div className="flex-1 h-[12px] bg-gray-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${((ind.value || 0) / maxInd) * 100}%`,
                      background: "#c9a84c",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="w-[40px] text-[10px] font-semibold text-navy-800">
                  {fmt(ind.value)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 mt-1">
            人口千人あたり {be.establishments_per_1000 || "—"} 事業所
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
        </div>
      </div>

      {/* Competition + Spending in two columns */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <SectionTitle>競合環境</SectionTitle>
          <table className="w-full text-[10px] mt-1">
            <tbody>
              <tr>
                <td className="text-gray-500 py-0.5 pr-2">飽和度</td>
                <td className="font-semibold" style={{ color: "#0d1b2a" }}>
                  {cd.saturation_level || "—"}
                  <span className="text-gray-400 font-normal ml-1">
                    (指数: {cd.saturation_index || "—"})
                  </span>
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 py-0.5 pr-2">参入余地</td>
                <td className="font-semibold" style={{ color: "#c9a84c" }}>
                  {cd.opportunity_sectors?.join("、") || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <SectionTitle>消費力</SectionTitle>
          <table className="w-full text-[10px] mt-1">
            <tbody>
              <tr>
                <td className="text-gray-500 py-0.5 pr-2">飲食消費指数</td>
                <td className="font-semibold" style={{ color: "#0d1b2a" }}>
                  {sp.food_spending_index || "—"}
                  <span className="text-gray-400 font-normal ml-1">
                    (全国=100)
                  </span>
                </td>
              </tr>
              <tr>
                <td className="text-gray-500 py-0.5 pr-2">
                  サービス消費指数
                </td>
                <td className="font-semibold" style={{ color: "#0d1b2a" }}>
                  {sp.service_spending_index || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mb-3">
        <SectionTitle>AI商圏分析</SectionTitle>
        <p
          className="text-[10px] leading-relaxed mt-1"
          style={{ color: "#334155" }}
        >
          {data.shoken_summary || "分析データを取得中です..."}
        </p>
      </div>

      {/* AI Recommendation */}
      {ls.ai_recommendation && (
        <div
          className="rounded px-3 py-2 mb-3"
          style={{
            background: "#0d1b2a",
            border: "1px solid rgba(201, 168, 76, 0.3)",
          }}
        >
          <p className="text-[9px] mb-0.5" style={{ color: "#c9a84c" }}>
            AI総合判定
          </p>
          <p className="text-[10px]" style={{ color: "#e2e8f0" }}>
            {ls.ai_recommendation}
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="text-center pt-2 mt-auto"
        style={{ borderTop: "1px solid #e2e8f0" }}
      >
        <p className="text-[8px] text-gray-400">
          データソース: 政府統計(e-Stat) + AI分析(Gemini 2.0 Flash) ｜
          起業サーチDM営業サービス
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[11px] font-bold"
      style={{
        color: "#0d1b2a",
        borderLeft: "3px solid #c9a84c",
        paddingLeft: "6px",
      }}
    >
      {children}
    </h3>
  );
}
