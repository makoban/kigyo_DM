"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "authenticated") {
    router.replace("/admin");
    return null;
  }

  const handleEmailAuth = async () => {
    setLoading(true);
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "登録に失敗しました");
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(
        mode === "signup"
          ? "登録は完了しましたが、ログインに失敗しました"
          : "メールアドレスまたはパスワードが正しくありません"
      );
      setLoading(false);
      return;
    }

    router.push("/admin");
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/admin" });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #334155",
    borderRadius: "6px",
    background: "#1b2a3d",
    color: "white",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 50px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "#0f1d2e",
        border: "1px solid #1e3a5f",
        borderRadius: "12px",
        padding: "40px 32px",
      }}>
        <h1 style={{
          textAlign: "center",
          color: "#c9a84c",
          fontSize: "20px",
          fontWeight: 700,
          fontFamily: "'Noto Serif JP', serif",
          marginBottom: "4px",
        }}>
          管理画面ログイン
        </h1>
        <p style={{
          textAlign: "center",
          color: "#64748b",
          fontSize: "13px",
          marginBottom: "28px",
        }}>
          起業サーチDM
        </p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            background: "white",
            color: "#333",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </button>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "20px 0",
        }}>
          <div style={{ flex: 1, height: "1px", background: "#1e3a5f" }} />
          <span style={{ color: "#475569", fontSize: "12px" }}>または</span>
          <div style={{ flex: 1, height: "1px", background: "#1e3a5f" }} />
        </div>

        {/* Email/Password */}
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8文字以上"
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
          />
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>
            {error}
          </p>
        )}

        <button
          onClick={handleEmailAuth}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            background: "#c9a84c",
            color: "#0d1b2a",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            marginBottom: "16px",
          }}
        >
          {loading ? "処理中..." : mode === "login" ? "ログイン" : "新規登録"}
        </button>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: "13px" }}>
          {mode === "login" ? (
            <>
              アカウントがない場合は{" "}
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                style={{ color: "#c9a84c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              既にアカウントがある場合は{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                style={{ color: "#c9a84c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                ログイン
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
