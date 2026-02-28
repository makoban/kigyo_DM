"use client";

import { useEffect, useState, useCallback } from "react";
import CombinedA4 from "@/components/combined-a4";

interface QueueItem {
  id: number;
  status: string;
  scheduled_date: string;
  unit_price: number;
  created_at: string;
  sent_at: string | null;
  corporations: {
    company_name: string;
    company_name_kana: string | null;
    entity_type: string | null;
    prefecture: string | null;
    city: string | null;
    street_address: string | null;
    postal_code: string | null;
    corporate_number: string;
    change_date: string | null;
  } | null;
  subscriptions: {
    greeting_text: string | null;
    area_label: string;
    shoken_data: Record<string, unknown> | null;
  } | null;
  profiles: {
    company_name: string | null;
    representative_name: string | null;
    postal_code: string | null;
    address: string | null;
    phone: string | null;
    contact_email: string | null;
    company_url: string | null;
  } | null;
}

function entityLabel(type: string | null): string {
  if (type === "301") return "株式会社";
  if (type === "302") return "有限会社";
  if (type === "303") return "合資会社";
  if (type === "304") return "合名会社";
  if (type === "305") return "合同会社";
  return "";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [printItem, setPrintItem] = useState<QueueItem | null>(null);
  const [marking, setMarking] = useState(false);
  const [showSent, setShowSent] = useState(false);

  const fetchQueue = useCallback(async (includeSent: boolean) => {
    setLoading(true);
    try {
      const url = includeSent
        ? `/api/admin/queue?status=sent`
        : `/api/admin/queue`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSentIds(new Set());
    fetchQueue(showSent);
  }, [showSent, fetchQueue]);

  const markSent = async (ids: number[]) => {
    setMarking(true);
    try {
      const res = await fetch("/api/admin/mark-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        setSentIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        });
      }
    } catch {
      // ignore
    } finally {
      setMarking(false);
    }
  };

  const markAllSent = () => {
    const pending = items.filter((it) => !sentIds.has(it.id)).map((it) => it.id);
    if (pending.length === 0) return;
    if (!confirm(`${pending.length}件を全て送付済みにしますか？`)) return;
    markSent(pending);
  };

  const handlePrint = (item: QueueItem) => {
    setPrintItem(item);
    setTimeout(() => window.print(), 300);
  };

  const pendingItems = items.filter((it) => !sentIds.has(it.id));
  const doneItems = items.filter((it) => sentIds.has(it.id));

  return (
    <>
      {/* Print overlay */}
      {printItem && (
        <div
          id="print-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "white",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflow: "auto",
          }}
        >
          <div>
            <CombinedA4
              corporation={{
                company_name: printItem.corporations?.company_name || "不明",
                postal_code: printItem.corporations?.postal_code || null,
                prefecture: printItem.corporations?.prefecture || null,
                city: printItem.corporations?.city || null,
                street_address: printItem.corporations?.street_address || null,
              }}
              sender={{
                company_name: printItem.profiles?.company_name || null,
                representative_name: printItem.profiles?.representative_name || null,
                postal_code: printItem.profiles?.postal_code || null,
                address: printItem.profiles?.address || null,
                phone: printItem.profiles?.phone || null,
                contact_email: printItem.profiles?.contact_email || null,
                company_url: printItem.profiles?.company_url || null,
              }}
              greetingText={printItem.subscriptions?.greeting_text || ""}
              areaLabel={printItem.subscriptions?.area_label || ""}
              shokenData={printItem.subscriptions?.shoken_data as never}
            />
            <div style={{ textAlign: "center", padding: "16px" }} className="no-print">
              <button
                onClick={() => setPrintItem(null)}
                style={{
                  background: "#0d1b2a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 24px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0d1b2a", margin: 0, fontFamily: "'Noto Serif JP', serif" }}>
            {showSent ? "送付済み一覧" : "投函一覧"}
          </h1>
          <span style={{
            background: showSent ? "#22c55e" : "#c9a84c",
            color: "white",
            borderRadius: "12px",
            padding: "2px 12px",
            fontSize: "13px",
            fontWeight: 600,
          }}>
            {loading ? "..." : `${items.length}件`}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowSent(!showSent)}
            style={{
              background: showSent ? "#0d1b2a" : "white",
              color: showSent ? "white" : "#0d1b2a",
              border: "1px solid #0d1b2a",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {showSent ? "未送付を表示" : "送付済みを表示"}
          </button>
          {!showSent && pendingItems.length > 0 && (
            <button
              onClick={markAllSent}
              disabled={marking}
              style={{
                background: "#0d1b2a",
                color: "#c9a84c",
                border: "none",
                borderRadius: "6px",
                padding: "6px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: marking ? "not-allowed" : "pointer",
                opacity: marking ? 0.5 : 1,
              }}
            >
              全て送付済みにする
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          読み込み中...
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "white",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}>
          <p style={{ fontSize: "40px", margin: "0 0 12px 0" }}>&#128235;</p>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            {showSent ? "送付済みのDMはありません" : "投函予定のDMはありません"}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && (showSent ? items : pendingItems).map((item) => {
        const isSent = sentIds.has(item.id) || item.status === "sent";
        const corp = item.corporations;
        const prof = item.profiles;
        const sub = item.subscriptions;

        return (
          <div
            key={item.id}
            style={{
              background: isSent ? "#f0fdf4" : "white",
              border: isSent ? "1px solid #86efac" : "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px 20px",
              marginBottom: "12px",
              transition: "all 0.3s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
              {/* Left: Corporation (recipient) */}
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#0d1b2a" }}>
                    {corp?.company_name || "不明"}
                  </span>
                  {corp?.entity_type && (
                    <span style={{
                      fontSize: "10px",
                      background: "#f1f5f9",
                      color: "#64748b",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}>
                      {entityLabel(corp.entity_type)}
                    </span>
                  )}
                  {isSent && (
                    <span style={{
                      fontSize: "10px",
                      background: "#22c55e",
                      color: "white",
                      padding: "1px 8px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}>
                      送付済み
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "#475569", margin: "2px 0" }}>
                  {corp?.postal_code ? `〒${corp.postal_code} ` : ""}
                  {[corp?.prefecture, corp?.city, corp?.street_address].filter(Boolean).join(" ")}
                </p>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0" }}>
                  法人番号: {corp?.corporate_number || "—"}
                  {corp?.change_date && ` | 設立: ${corp.change_date}`}
                </p>
              </div>

              {/* Middle: Sender + dates */}
              <div style={{ flex: "0 1 200px" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 2px 0" }}>送り主</p>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1b2a", margin: 0 }}>
                  {prof?.company_name || "未設定"}
                </p>
                {prof?.representative_name && (
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "1px 0 0 0" }}>
                    {prof.representative_name}
                  </p>
                )}
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                  {sub?.area_label || ""}
                  {item.scheduled_date && ` | 予定: ${formatDate(item.scheduled_date)}`}
                </p>
              </div>

              {/* Right: Actions */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                <button
                  onClick={() => handlePrint(item)}
                  style={{
                    background: "white",
                    color: "#0d1b2a",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  &#128424; 印刷
                </button>
                {!isSent && (
                  <button
                    onClick={() => markSent([item.id])}
                    disabled={marking}
                    style={{
                      background: "#0d1b2a",
                      color: "#c9a84c",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      cursor: marking ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: marking ? 0.5 : 1,
                    }}
                  >
                    送付済み
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Done items in normal view */}
      {!showSent && doneItems.length > 0 && (
        <div style={{ marginTop: "24px", opacity: 0.6 }}>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
            このセッションで送付済みにした ({doneItems.length}件)
          </p>
          {doneItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "8px",
                padding: "10px 16px",
                marginBottom: "6px",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#16a34a", fontWeight: 500 }}>
                &#10003; {item.corporations?.company_name || "不明"}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                {item.corporations?.prefecture} {item.corporations?.city}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
