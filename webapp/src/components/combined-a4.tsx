"use client";

import type { ShokenData } from "@/lib/shoken-api";

interface CombinedA4Props {
  corporation: {
    company_name: string;
    postal_code: string | null;
    prefecture: string | null;
    city: string | null;
    street_address: string | null;
  };
  sender: {
    company_name: string | null;
    representative_name: string | null;
    postal_code: string | null;
    address: string | null;
    phone: string | null;
    contact_email: string | null;
    company_url: string | null;
  };
  greetingText: string;
  areaLabel: string;
  shokenData: ShokenData | null;
  date?: string;
}

function fmt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("ja-JP");
}

function IndexBar({ label, value }: { label: string; value: number }) {
  const w = Math.max(0, Math.min(150, value));
  const isAbove = value >= 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "8px" }}>
      <span style={{ width: "48px", textAlign: "right", color: "#64748b", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "2px", overflow: "hidden", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${(w / 150) * 100}%`,
            background: isAbove ? "#c9a84c" : "#94a3b8",
            borderRadius: "2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${(100 / 150) * 100}%`,
            top: 0,
            width: "1px",
            height: "100%",
            background: "#ef4444",
          }}
        />
      </div>
      <span style={{ width: "24px", fontWeight: 700, color: isAbove ? "#c9a84c" : "#64748b", fontSize: "8px" }}>
        {value}
      </span>
    </div>
  );
}

export default function CombinedA4({
  corporation,
  sender,
  greetingText,
  areaLabel,
  shokenData,
  date,
}: CombinedA4Props) {
  const d = shokenData;

  const today = date || (() => {
    const now = new Date();
    const y = now.getFullYear();
    const era = y - 2018;
    return `令和${era}年${now.getMonth() + 1}月${now.getDate()}日`;
  })();

  const corpAddress = [
    corporation.postal_code ? `〒${corporation.postal_code}` : null,
    corporation.prefecture,
    corporation.city,
    corporation.street_address,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id="print-a4"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "14mm 18mm 10mm 18mm",
        fontFamily: "'Noto Sans JP', sans-serif",
        color: "#1e293b",
        background: "white",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Gold accent */}
      <div style={{ width: "16mm", height: "1mm", background: "#c9a84c", marginBottom: "5mm" }} />

      {/* Date */}
      <p style={{ fontSize: "9px", color: "#94a3b8", margin: "0 0 4mm 0" }}>{today}</p>

      {/* Recipient */}
      <div style={{ marginBottom: "5mm" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1b2a", margin: 0 }}>
          {corporation.company_name} 御中
        </p>
        {corpAddress && (
          <p style={{ fontSize: "8px", color: "#64748b", margin: "1mm 0 0 0" }}>{corpAddress}</p>
        )}
        <p style={{ fontSize: "9px", color: "#64748b", margin: "1mm 0 0 0" }}>
          設立おめでとうございます
        </p>
      </div>

      {/* Greeting text */}
      <div
        style={{
          fontSize: "10px",
          lineHeight: 1.8,
          color: "#374151",
          whiteSpace: "pre-wrap",
          marginBottom: "4mm",
          maxHeight: "105mm",
          overflow: "hidden",
        }}
      >
        {greetingText}
      </div>

      {/* Sender info */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "3mm", marginBottom: "4mm" }}>
        {sender.company_name ? (
          <>
            <p style={{ fontSize: "10px", fontWeight: 600, color: "#0d1b2a", margin: 0 }}>
              {sender.company_name}
            </p>
            {sender.representative_name && (
              <p style={{ fontSize: "8px", color: "#475569", margin: "0.5mm 0 0 0" }}>
                代表 {sender.representative_name}
              </p>
            )}
            {(sender.postal_code || sender.address) && (
              <p style={{ fontSize: "8px", color: "#64748b", margin: "0.5mm 0 0 0" }}>
                {sender.postal_code ? `〒${sender.postal_code} ` : ""}
                {sender.address || ""}
              </p>
            )}
            {(sender.phone || sender.contact_email) && (
              <p style={{ fontSize: "8px", color: "#64748b", margin: "0.5mm 0 0 0" }}>
                {[sender.phone && `TEL: ${sender.phone}`, sender.contact_email]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            )}
            {sender.company_url && (
              <p style={{ fontSize: "8px", color: "#c9a84c", margin: "0.5mm 0 0 0" }}>
                {sender.company_url}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: "8px", color: "#94a3b8" }}>送り主情報は未設定です</p>
        )}
      </div>

      {/* Gold separator */}
      <div style={{ height: "1.5px", background: "linear-gradient(90deg, #c9a84c, #d4b970, transparent)", margin: "2mm 0 4mm 0" }} />

      {/* Market data section */}
      {d ? (
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Section title */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3mm" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#0d1b2a", margin: 0 }}>
              <span style={{ color: "#c9a84c" }}>&#9632;</span> 商圏データ概要 — {areaLabel}
            </p>
            <span style={{ fontSize: "7px", color: "#94a3b8" }}>e-Stat / AI分析</span>
          </div>

          {/* 6 metric grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "2mm", marginBottom: "3mm" }}>
            {[
              { label: "総人口", value: fmt(d.population?.total_population), unit: "人" },
              { label: "世帯数", value: fmt(d.population?.households), unit: "世帯" },
              { label: "事業所", value: fmt(d.business_establishments?.total), unit: "件" },
              { label: "人口密度", value: fmt(d.population?.population_density), unit: "人/km²" },
              { label: "世帯年収", value: d.spending_power?.avg_household_income ? `${fmt(d.spending_power.avg_household_income)}万` : "—", unit: "円" },
              { label: "出店適性", value: d.location_score?.grade || "—", unit: `${d.location_score?.overall_score || 0}点` },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  padding: "2mm",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "7px", color: "#64748b", margin: "0 0 1mm 0" }}>{m.label}</p>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#0d1b2a", margin: 0 }}>
                  {m.value}
                </p>
                <p style={{ fontSize: "6px", color: "#94a3b8", margin: "0.5mm 0 0 0" }}>{m.unit}</p>
              </div>
            ))}
          </div>

          {/* 2 columns: spending power + business composition */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4mm", marginBottom: "3mm" }}>
            {/* Spending power */}
            <div>
              <p style={{ fontSize: "8px", fontWeight: 600, color: "#0d1b2a", margin: "0 0 1.5mm 0" }}>
                消費力指数 <span style={{ fontSize: "6px", color: "#94a3b8" }}>（全国平均=100）</span>
              </p>
              <IndexBar label="小売" value={d.spending_power?.retail_spending_index || 0} />
              <div style={{ height: "1.5mm" }} />
              <IndexBar label="飲食" value={d.spending_power?.food_spending_index || 0} />
              <div style={{ height: "1.5mm" }} />
              <IndexBar label="サービス" value={d.spending_power?.service_spending_index || 0} />
            </div>

            {/* Business composition */}
            <div>
              <p style={{ fontSize: "8px", fontWeight: 600, color: "#0d1b2a", margin: "0 0 1.5mm 0" }}>
                主要事業所
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1mm", fontSize: "8px" }}>
                {[
                  { label: "小売業", val: d.business_establishments?.retail },
                  { label: "飲食業", val: d.business_establishments?.food_service },
                  { label: "サービス", val: d.business_establishments?.services },
                  { label: "医療福祉", val: d.business_establishments?.medical },
                ].map((b, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5mm 1mm", background: "#f8fafc", borderRadius: "2px" }}>
                    <span style={{ color: "#64748b" }}>{b.label}</span>
                    <span style={{ fontWeight: 600, color: "#0d1b2a" }}>{fmt(b.val)}</span>
                  </div>
                ))}
              </div>
              {d.competition_density?.saturation_level && (
                <p style={{ fontSize: "7px", color: "#64748b", margin: "1mm 0 0 0" }}>
                  競合飽和度: <span style={{ fontWeight: 600, color: "#c9a84c" }}>{d.competition_density.saturation_level}</span>
                </p>
              )}
            </div>
          </div>

          {/* AI Summary */}
          {d.shoken_summary && (
            <div style={{ background: "#f8fafc", borderLeft: "2px solid #c9a84c", padding: "2mm 3mm", borderRadius: "0 3px 3px 0" }}>
              <p style={{ fontSize: "7px", fontWeight: 600, color: "#c9a84c", margin: "0 0 1mm 0" }}>AI商圏分析</p>
              <p style={{ fontSize: "8px", lineHeight: 1.6, color: "#374151", margin: 0 }}>
                {d.shoken_summary}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "10px", color: "#94a3b8" }}>商圏データは現在準備中です</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "2mm", marginTop: "auto" }}>
        <p style={{ fontSize: "6.5px", color: "#94a3b8", textAlign: "center", margin: 0 }}>
          このDMは起業サーチDM（株式会社バンテックス https://kigyo-dm.bantex.jp/）という一通380円（税込）のサービスで自動でお送りしております
        </p>
      </div>
    </div>
  );
}
