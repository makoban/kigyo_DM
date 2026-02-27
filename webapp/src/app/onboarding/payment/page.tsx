"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getOnboardingState } from "@/lib/onboarding-store";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const UNIT_PRICE = 380;

function PaymentForm({ planAmount }: { planAmount: number }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const letters = Math.floor(planAmount / UNIT_PRICE);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding/complete`,
      },
    });

    if (submitError) {
      setError(submitError.message || "決済に失敗しました");
      setLoading(false);
    }
    // If successful, will redirect to /onboarding/complete
  };

  return (
    <div>
      <div className="mb-6 p-4 rounded-xl bg-gold-400/5 border border-gold-400/20">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">初回チャージ</p>
            <p className="text-2xl font-bold text-navy-800">
              &yen;{planAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">月{letters}通分</p>
            <p className="text-xs text-gray-400">以降、毎月1日に自動チャージ</p>
          </div>
        </div>
      </div>

      <PaymentElement />
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/budget")}
          className="flex-1"
          disabled={loading}
        >
          戻る
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!stripe}
          className="flex-1"
        >
          &yen;{planAmount.toLocaleString()} を支払う
        </Button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">
        いつでもプラン変更・解約が可能です。手数料はかかりません。
      </p>
    </div>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState("");
  const [planAmount, setPlanAmount] = useState(7600);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      // Check auth
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/onboarding/signup?redirect=/onboarding/payment");
        return;
      }

      const state = getOnboardingState();
      const amount = state.planAmount || 7600;
      setPlanAmount(amount);

      // First create SetupIntent to register card (needed for Subscription)
      const setupRes = await fetch("/api/stripe/setup-intent", {
        method: "POST",
      });
      const setupData = await setupRes.json();
      if (setupData.error) {
        setError(setupData.error);
        return;
      }

      // Then create Subscription
      const res = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planAmount: amount }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError(data.error || "サブスクリプション作成に失敗しました");
      }
    };
    init();
  }, [router]);

  if (error) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-4">
          お支払い
        </h1>
        <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm mb-4">
          {error}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/onboarding/budget")}
          >
            戻る
          </Button>
          <Button
            variant="outline"
            onClick={() => { window.location.href = "https://kigyo-dm.bantex.jp/"; }}
          >
            TOPに戻る
          </Button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-4">
          お支払い
        </h1>
        <div className="py-20 text-center text-gray-400">
          決済フォームを準備中...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-4">
        お支払い
      </h1>

      {/* Billing description */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
        <span className="mt-0.5 text-blue-500 shrink-0" aria-hidden="true">
          &#9432;
        </span>
        <p className="text-sm text-blue-800 leading-relaxed">
          毎月自動チャージしてその中から支払う安心の課金制。いつでも解約可能。手数料はかかりません。
        </p>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#c9a84c",
              borderRadius: "8px",
            },
          },
        }}
      >
        <PaymentForm planAmount={planAmount} />
      </Elements>
    </div>
  );
}
