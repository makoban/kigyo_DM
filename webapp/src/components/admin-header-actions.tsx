"use client";

import { signOut, useSession } from "next-auth/react";

export default function AdminHeaderActions() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ color: "#64748b", fontSize: "12px" }}>
        {session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        style={{
          background: "none",
          border: "1px solid #334155",
          borderRadius: "4px",
          color: "#94a3b8",
          fontSize: "12px",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ログアウト
      </button>
    </div>
  );
}
