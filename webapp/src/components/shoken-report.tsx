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
  households_per_pop: 2.21,
};

function fmt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("ja-JP");
}

function pctDiff(local: number, national: number): string {
  if (!national) return "—";
  const d = ((local - national) / national) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

function pctDiffColor(local: number, national: number): string {
  if (!national) return "#64748b";
  return local >= national ? "#c9a84c" : "#64748b";
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const w = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-1.5 text-[9px]">
      <span className="w-[42px] text-right text-gray-500 shrink-0">{label}</span>
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
      <span className="w-[26px] font-bold text-navy-800">{score}</span>
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
    <tr className="border-b border-gray-50">
      <td className="text-gray-500 py-[2px] pr-1">{label}</td>
      <td className="font-semibold text-right" style={{ color: "#0d1b2a" }}>
        {local}
        <span className="text-gray-400 font-normal text-[7px] ml-0.5">{unit}</span>
      </td>
      <td className="text-right text-gray-400">
        {national}
        <span className="text-[7px] ml-0.5">{unit}</span>
      </td>
      <td className="text-right font-semibold" style={{ width: "48px" }}>
        {diff !== null ? (
          <span style={{ color: diff >= 0 ? "#c9a84c" : "#64748b", fontSize: "8px" }}>
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
      <div className="flex-1 h-[11px] bg-gray-100 rounded-sm overflow-hidden relative">
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
      <span className="w-[28px] text-gray-400 text-[7px]">({avg.toFixed(1)})</span>
    </div>
  );
}

function IndexBar({
  label,
  value,
  avg,
}: {
  label: string;
  value: number;
  avg: number;
}) {
  const maxVal = Math.max(value, avg, 100) * 1.15;
  const w = (value / maxVal) * 100;
  const avgW = (avg / maxVal) * 100;
  return (
    <div className="flex items-center gap-1 text-[9px]">
      <span className="w-[48px] text-right text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-[11px] bg-gray-100 rounded-sm overflow-hidden relative">
        <div
          className="h-full rounded-sm absolute top-0 left-0"
          style={{ width: `${w}%`, background: "#0d1b2a", opacity: 0.65 }}
        />
        <div
          className="absolute top-0 h-full border-r-2"
          style={{ left: `${avgW}%`, borderColor: "#c9a84c", opacity: 0.8 }}
        />
      </div>
      <span className="w-[24px] font-bold text-navy-800">{value}</span>
      <span
        className="w-[40px] text-right font-semibold"
        style={{ color: pctDiffColor(value, avg), fontSize: "8px" }}
      >
        {pctDiff(value, avg)}
      </span>
    </div>
  );
}

function SaturationGauge({ level, index }: { level: string; index: number }) {
  const levels = ["低", "中", "高", "飽和"];
  const activeIdx = levels.indexOf(level);
  return (
    <div className="flex items-center gap-1">
      {levels.map((l, i) => (
        <div
          key={l}
          className="flex-1 text-center py-[3px] rounded-sm text-[8px] font-bold"
          style={{
            background:
              i <= activeIdx
                ? i <= 1
                  ? "#c9a84c"
                  : i === 2
                    ? "#f59e0b"
                    : "#ef4444"
                : "#f1f5f9",
            color: i <= activeIdx ? "#fff" : "#94a3b8",
          }}
        >
          {l}
        </div>
      ))}
      <span className="text-[9px] font-semibold text-gray-600 ml-1 w-[28px]">
        {index}
      </span>
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

  // Derived metrics
  const workingAgePct = age
    ? (age.age_20_34_pct + age.age_35_49_pct + age.age_50_64_pct).toFixed(1)
    : "—";
  const avgHouseholdSize =
    p.total_population && p.households
      ? (p.total_population / p.households).toFixed(2)
      : "—";
  const retailPerCapita =
    p.total_population && be.retail
      ? (be.retail / (p.total_population / 1000)).toFixed(1)
      : "—";
  const medicalPerCapita =
    p.total_population && be.medical
      ? (be.medical / (p.total_population / 10000)).toFixed(1)
      : "—";

  return (
    <div
      className="bg-white text-gray-900 w-full flex flex-col"
      style={{
        fontFamily: '"Noto Sans JP", "Noto Serif JP", sans-serif',
        maxWidth: "210mm",
        height: "297mm",
        padding: "20px 24px 16px",
        fontSize: "9px",
        lineHeight: "1.45",
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
            <p className="text-[12px] font-semibold mt-0.5" style={{ color: "#c9a84c" }}>
              {areaLabel}
            </p>
          </div>
          <p className="text-[8px] text-gray-400">{date} 作成</p>
        </div>
      </div>

      {/* Key Metrics Grid 5x2 */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {[
          { label: "総人口", value: fmt(p.total_population), unit: "人" },
          { label: "世帯数", value: fmt(p.households), unit: "世帯" },
          { label: "事業所数", value: fmt(be.total), unit: "件" },
          { label: "人口密度", value: fmt(p.population_density), unit: "人/km²" },
          {
            label: "人口増減率",
            value: p.growth_rate || "—",
            unit: "",
            isGrowth: true,
          },
          {
            label: "世帯年収",
            value: sp.avg_household_income ? `${sp.avg_household_income}` : "—",
            unit: "万円",
          },
          {
            label: "昼夜間比",
            value: dp.daytime_ratio ? `${dp.daytime_ratio.toFixed(0)}` : "—",
            unit: "%",
          },
          {
            label: "小売消費指数",
            value: sp.retail_spending_index ? `${sp.retail_spending_index}` : "—",
            unit: "",
          },
          {
            label: "生産年齢人口",
            value: workingAgePct,
            unit: "%",
          },
          {
            label: "出店適性",
            value: `${ls.overall_score}`,
            unit: `/ ${ls.grade}`,
            highlight: true,
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded px-1.5 py-1 text-center"
            style={{
              background: m.highlight ? "#0d1b2a" : "#f8fafc",
              border: m.highlight ? "none" : "1px solid #e2e8f0",
            }}
          >
            <p
              className="text-[7px] mb-0.5 leading-none"
              style={{ color: m.highlight ? "#c9a84c" : "#64748b" }}
            >
              {m.label}
            </p>
            <p
              className="text-[13px] font-bold leading-tight"
              style={{
                color: m.highlight
                  ? "#fff"
                  : m.isGrowth && typeof m.value === "string" && m.value.startsWith("-")
                    ? "#64748b"
                    : "#0d1b2a",
              }}
            >
              {m.value}
              <span className="text-[6px] font-normal ml-0.5" style={{ color: "#94a3b8" }}>
                {m.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* === Row 1: National Comparison Table + Age Composition === */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* National Comparison */}
        <div>
          <SectionTitle>全国平均との比較</SectionTitle>
          <table className="w-full text-[9px] mt-1 border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-gray-400 font-normal pb-1">指標</th>
                <th className="text-right text-gray-400 font-normal pb-1">当地域</th>
                <th className="text-right text-gray-400 font-normal pb-1">全国</th>
                <th className="text-right text-gray-400 font-normal pb-1" style={{ width: "48px" }}>
                  差分
                </th>
              </tr>
            </thead>
            <tbody>
              <CompareRow
                label="世帯年収"
                local={sp.avg_household_income ? `${sp.avg_household_income}` : "—"}
                national={`${NATIONAL_AVG.household_income}`}
                unit="万"
              />
              <CompareRow
                label="人口密度"
                local={p.population_density ? `${fmt(p.population_density)}` : "—"}
                national={`${NATIONAL_AVG.population_density}`}
                unit="/km²"
              />
              <CompareRow
                label="昼夜間比"
                local={dp.daytime_ratio ? `${dp.daytime_ratio.toFixed(0)}` : "—"}
                national={`${NATIONAL_AVG.daytime_ratio}`}
                unit="%"
              />
              <CompareRow
                label="事業所密度"
                local={be.establishments_per_1000 ? `${be.establishments_per_1000}` : "—"}
                national={`${NATIONAL_AVG.establishments_per_1000}`}
                unit="/千人"
              />
              <CompareRow
                label="高齢者率"
                local={age ? `${age.over_65_pct.toFixed(1)}` : "—"}
                national={`${NATIONAL_AVG.over_65_pct}`}
                unit="%"
              />
              <CompareRow
                label="世帯人員"
                local={avgHouseholdSize}
                national={`${NATIONAL_AVG.households_per_pop}`}
                unit="人"
              />
            </tbody>
          </table>
        </div>

        {/* Age Composition */}
        <div>
          <SectionTitle>年齢構成（全国平均比較）</SectionTitle>
          <div className="space-y-1 mt-1">
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
          <p className="text-[7px] text-gray-400 mt-1">
            ■ 当地域 ┊ 赤線: 全国平均 (カッコ内)
          </p>

          {/* Demographic insight */}
          <div
            className="mt-1.5 rounded px-2.5 py-1.5"
            style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
          >
            <p className="text-[8px] text-gray-400 mb-1">人口動態</p>
            <div className="flex justify-between text-[9px]">
              <span className="text-gray-500">生産年齢(20-64歳)</span>
              <span className="font-bold" style={{ color: "#0d1b2a" }}>{workingAgePct}%</span>
            </div>
            <div className="flex justify-between text-[9px] mt-0.5">
              <span className="text-gray-500">人口増減率</span>
              <span
                className="font-bold"
                style={{
                  color:
                    typeof p.growth_rate === "string" && p.growth_rate.startsWith("-")
                      ? "#64748b"
                      : "#c9a84c",
                }}
              >
                {p.growth_rate || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* === Row 2: Spending Power + Business Stats === */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Spending Power */}
        <div>
          <SectionTitle>消費力指数（全国=100）</SectionTitle>
          <div className="space-y-1 mt-1">
            <IndexBar label="小売消費" value={sp.retail_spending_index || 0} avg={NATIONAL_AVG.retail_spending_index} />
            <IndexBar label="飲食消費" value={sp.food_spending_index || 0} avg={NATIONAL_AVG.food_spending_index} />
            <IndexBar label="ｻｰﾋﾞｽ消費" value={sp.service_spending_index || 0} avg={NATIONAL_AVG.service_spending_index} />
          </div>
          <p className="text-[7px] text-gray-400 mt-1">
            ■ 当地域 ┊ 金線: 全国平均(100)
          </p>

          {/* Market potential */}
          <div
            className="mt-2 rounded px-2.5 py-1.5"
            style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <p className="text-[8px] font-bold mb-1" style={{ color: "#92400e" }}>
              市場ポテンシャル
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
              <div className="flex justify-between">
                <span className="text-gray-500">小売千人密度</span>
                <span className="font-bold" style={{ color: "#0d1b2a" }}>
                  {retailPerCapita}<span className="text-[7px] text-gray-400 font-normal">件</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">医療万人密度</span>
                <span className="font-bold" style={{ color: "#0d1b2a" }}>
                  {medicalPerCapita}<span className="text-[7px] text-gray-400 font-normal">件</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">地域総所得</span>
                <span className="font-bold" style={{ color: "#c9a84c" }}>
                  {sp.avg_household_income && p.households
                    ? `${((sp.avg_household_income * p.households) / 10000).toFixed(0)}億円`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">消費力総合</span>
                <span className="font-bold" style={{ color: "#c9a84c" }}>
                  {sp.retail_spending_index && sp.food_spending_index && sp.service_spending_index
                    ? Math.round(
                        (sp.retail_spending_index + sp.food_spending_index + sp.service_spending_index) / 3
                      )
                    : "—"}
                  <span className="text-[7px] text-gray-400 font-normal">/100</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Establishments */}
        <div>
          <SectionTitle>事業所統計</SectionTitle>
          <div className="space-y-1 mt-1">
            {[
              { label: "小売業", value: be.retail },
              { label: "飲食業", value: be.food_service },
              { label: "サービス", value: be.services },
              { label: "医療福祉", value: be.medical },
            ].map((ind) => {
              const maxInd = Math.max(be.retail, be.food_service, be.services, be.medical, 1);
              const pctOfTotal = be.total ? ((ind.value || 0) / be.total * 100).toFixed(1) : "—";
              return (
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
                  <span className="w-[30px] text-[8px] text-gray-400 text-right">
                    {pctOfTotal}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[8px] text-gray-400 mt-1">
            人口千人あたり {be.establishments_per_1000 || "—"} 事業所 (全国: {NATIONAL_AVG.establishments_per_1000})
          </p>

          {/* Business composition bar */}
          <div
            className="mt-2 rounded px-2.5 py-1.5"
            style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
          >
            <p className="text-[8px] text-gray-400 mb-1">事業所構成比</p>
            <div className="flex gap-0.5" style={{ height: "12px" }}>
              {[
                { label: "小売", value: be.retail, color: "#c9a84c" },
                { label: "飲食", value: be.food_service, color: "#d4b970" },
                { label: "ｻｰﾋﾞｽ", value: be.services, color: "#0d1b2a" },
                { label: "医療", value: be.medical, color: "#64748b" },
                {
                  label: "他",
                  value: Math.max(0, (be.total || 0) - (be.retail || 0) - (be.food_service || 0) - (be.services || 0) - (be.medical || 0)),
                  color: "#cbd5e1",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-sm"
                  style={{
                    flex: s.value || 0,
                    background: s.color,
                    opacity: 0.8,
                    minWidth: s.value ? "2px" : "0",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2.5 mt-1 text-[8px]">
              {[
                { label: "小売", color: "#c9a84c" },
                { label: "飲食", color: "#d4b970" },
                { label: "ｻｰﾋﾞｽ", color: "#0d1b2a" },
                { label: "医療", color: "#64748b" },
                { label: "他", color: "#cbd5e1" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-0.5">
                  <span
                    className="inline-block w-[7px] h-[7px] rounded-sm"
                    style={{ background: l.color, opacity: 0.8 }}
                  />
                  <span className="text-gray-500">{l.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === Row 3: Location Score + Competition & Daytime Pop === */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Location Score */}
        <div>
          <SectionTitle>出店適性スコア</SectionTitle>
          <div className="space-y-1 mt-1">
            <ScoreBar score={ls.traffic_score} label="交通" />
            <ScoreBar score={ls.population_score} label="人口" />
            <ScoreBar score={ls.competition_score} label="競合" />
            <ScoreBar score={ls.spending_score} label="消費力" />
            <ScoreBar score={ls.growth_score} label="成長性" />
          </div>
          <div
            className="mt-2 flex items-center justify-between rounded px-3 py-1.5"
            style={{ background: "#0d1b2a" }}
          >
            <div>
              <span className="text-[8px]" style={{ color: "#94a3b8" }}>総合スコア</span>
              <span className="text-[16px] font-bold ml-1.5" style={{ color: "#c9a84c" }}>
                {ls.overall_score}
              </span>
              <span className="text-[9px] ml-0.5" style={{ color: "#94a3b8" }}>/100</span>
            </div>
            <div
              className="text-[18px] font-bold px-2.5 py-0.5 rounded"
              style={{
                color: "#fff",
                background:
                  ls.grade === "S"
                    ? "#c9a84c"
                    : ls.grade === "A"
                      ? "#d4b970"
                      : ls.grade === "B"
                        ? "#94a3b8"
                        : "#64748b",
              }}
            >
              {ls.grade}
            </div>
          </div>
        </div>

        {/* Competition + Daytime */}
        <div>
          <SectionTitle>競合環境</SectionTitle>
          <div className="mt-1">
            <SaturationGauge level={cd.saturation_level || "中"} index={cd.saturation_index || 0} />
          </div>
          <div className="mt-1.5">
            <p className="text-[8px] text-gray-400 mb-0.5">参入余地のある業種</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(cd.opportunity_sectors || []).map((s) => (
                <span
                  key={s}
                  className="inline-block px-2 py-[2px] rounded text-[8px] font-semibold"
                  style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <SectionTitle>昼夜間人口</SectionTitle>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              <div className="text-center rounded py-1" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <p className="text-[7px] text-gray-400">昼間</p>
                <p className="text-[11px] font-bold" style={{ color: "#0d1b2a" }}>
                  {fmt(dp.daytime_pop)}
                </p>
              </div>
              <div className="text-center rounded py-1" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <p className="text-[7px] text-gray-400">夜間</p>
                <p className="text-[11px] font-bold" style={{ color: "#0d1b2a" }}>
                  {fmt(dp.nighttime_pop)}
                </p>
              </div>
              <div className="text-center rounded py-1" style={{ background: "#0d1b2a" }}>
                <p className="text-[7px]" style={{ color: "#94a3b8" }}>昼夜比</p>
                <p className="text-[11px] font-bold" style={{ color: "#c9a84c" }}>
                  {dp.daytime_ratio ? `${dp.daytime_ratio.toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
            <p className="text-[8px] text-gray-400 mt-1">
              {dp.daytime_ratio && dp.daytime_ratio > 100
                ? "→ 昼間人口が多い＝周辺から人が集まるビジネス街・商業地"
                : dp.daytime_ratio && dp.daytime_ratio < 100
                  ? "→ 夜間人口が多い＝住宅地。地域密着型サービスに有利"
                  : "→ 昼夜均衡型の地域"}
            </p>
          </div>
        </div>
      </div>

      {/* === AI Analysis — grows to fill remaining space === */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* AI Summary */}
        <div className="flex flex-col">
          <SectionTitle>AI商圏分析</SectionTitle>
          <p className="text-[9px] leading-relaxed mt-1 flex-1" style={{ color: "#334155" }}>
            {data.shoken_summary || "分析データを取得中です..."}
          </p>
        </div>

        {/* AI Recommendation */}
        <div className="flex flex-col">
          <SectionTitle>AI総合判定</SectionTitle>
          {ls.ai_recommendation && (
            <div
              className="rounded px-3 py-2 mt-1 flex-1"
              style={{
                background: "#0d1b2a",
                border: "1px solid rgba(201, 168, 76, 0.3)",
              }}
            >
              <p className="text-[9px] leading-relaxed" style={{ color: "#e2e8f0" }}>
                {ls.ai_recommendation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer — always at bottom */}
      <div
        className="text-center pt-2 mt-3 shrink-0"
        style={{ borderTop: "1px solid #e2e8f0" }}
      >
        <p className="text-[7px] text-gray-400">
          データソース: 政府統計(e-Stat) + AI分析(Gemini 2.0 Flash) ｜ 全国平均値は経済センサス・国勢調査に基づく参考値 ｜ 起業サーチDM営業サービス
        </p>
      </div>
    </div>
  );
}
