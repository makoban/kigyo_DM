// Onboarding state management via localStorage
// S1-S6 is pre-signup, so we persist in localStorage until the user registers (S7)

import type { ShokenData } from "./shoken-api";

export interface OnboardingState {
  // S1: Area
  area?: {
    prefecture: string;
    city: string | null;
    areaLabel: string;
    share: number;
  };
  // S2: Market preview data (derived)
  marketData?: {
    nbMonth: number;
    costMonth: number;
    nbYear: number;
    est: number;
    rate: number;
  };
  // S2+: 商圏レポートデータ (Worker API)
  shokenData?: ShokenData;
  // S3-S4: Sender info
  sender?: {
    companyName: string;
    companyUrl?: string;
    companyDescription?: string;
    postalCode: string;
    address: string;
    phone: string;
    contactEmail: string;
    representativeName: string;
  };
  // S5: Greeting text
  greetingText?: string;
  // S8: Plan
  planAmount?: number;
}

const STORAGE_KEY = "kigyo-dm-onboarding";

export function getOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setOnboardingState(
  updater: (prev: OnboardingState) => OnboardingState
): OnboardingState {
  const prev = getOnboardingState();
  const next = updater(prev);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearOnboardingState() {
  localStorage.removeItem(STORAGE_KEY);
}
