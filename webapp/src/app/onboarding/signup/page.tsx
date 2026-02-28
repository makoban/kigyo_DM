"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/onboarding/budget";

  const { data: session, status } = useSession();

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Skip signup if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace(redirectTo);
    }
  }, [status, session, router, redirectTo]);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    await signIn("google", { callbackUrl: redirectTo });
    // signIn redirects, so no further handling needed
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      // 1. Create account via API
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

      // 2. Sign in after successful registration
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("登録は完了しましたが、ログインに失敗しました。ログインタブからお試しください。");
        setLoading(false);
        return;
      }

      router.push(redirectTo);
    } else {
      // Login
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("メールアドレスまたはパスワードが正しくありません");
        setLoading(false);
        return;
      }

      router.push(redirectTo);
    }

    setLoading(false);
  };

  if (status === "loading") {
    return (
      <div className="py-20 text-center text-gray-400">読み込み中...</div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        {mode === "signup" ? "会員登録" : "ログイン"}
      </h1>
      <p className="text-gray-600 text-sm mb-8">
        {mode === "signup"
          ? "アカウントを作成して、DM自動発送を開始しましょう。"
          : "既存のアカウントでログインしてください。"}
      </p>

      {searchParams.get("error") === "auth" && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          認証に失敗しました。もう一度お試しください。
        </div>
      )}

      {/* Google OAuth */}
      <Button
        variant="outline"
        onClick={handleGoogleAuth}
        loading={loading}
        className="w-full mb-4 border-gray-300"
        size="lg"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Googleで{mode === "signup" ? "登録" : "ログイン"}
      </Button>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Email/Password */}
      <div className="space-y-4 mb-6">
        <Input
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
        <Input
          label="パスワード"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8文字以上"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      <Button
        onClick={handleEmailAuth}
        loading={loading}
        className="w-full mb-4"
        size="lg"
      >
        {mode === "signup" ? "メールで登録" : "ログイン"}
      </Button>

      <p className="text-center text-sm text-gray-500 mb-6">
        {mode === "signup" ? (
          <>
            既にアカウントをお持ちですか？{" "}
            <button
              onClick={() => setMode("login")}
              className="text-gold-400 hover:underline"
            >
              ログイン
            </button>
          </>
        ) : (
          <>
            アカウントをお持ちでないですか？{" "}
            <button
              onClick={() => setMode("signup")}
              className="text-gold-400 hover:underline"
            >
              新規登録
            </button>
          </>
        )}
      </p>

      <Button
        variant="outline"
        onClick={() => router.push("/onboarding/preview")}
        className="w-full"
      >
        戻る
      </Button>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">読み込み中...</div>}>
      <SignupContent />
    </Suspense>
  );
}
