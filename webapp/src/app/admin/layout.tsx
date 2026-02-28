import type { Metadata } from "next";
import AdminHeaderActions from "@/components/admin-header-actions";

export const metadata: Metadata = {
  title: "管理画面 | 起業サーチDM",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @media print {
          #admin-header, #admin-main { display: none !important; }
          #print-overlay { display: block !important; position: static !important; }
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
        }
      `}</style>
      <div id="admin-header" style={{
        background: "#0d1b2a",
        borderBottom: "2px solid #c9a84c",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#c9a84c", fontWeight: 700, fontSize: "16px", fontFamily: "'Noto Serif JP', serif" }}>
            起業サーチDM
          </span>
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>管理画面</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <AdminHeaderActions />
          <a
            href="https://kigyo-dm.bantex.jp/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#64748b", fontSize: "12px", textDecoration: "none" }}
          >
            LP →
          </a>
        </div>
      </div>
      <div id="admin-main" style={{
        background: "#f8fafc",
        minHeight: "calc(100vh - 50px)",
        padding: "24px",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {children}
        </div>
      </div>
    </>
  );
}
