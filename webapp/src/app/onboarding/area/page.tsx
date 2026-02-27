"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  buildAllLocations,
  searchLocations,
  type AreaLocation,
} from "@/lib/area-data";
import { setOnboardingState } from "@/lib/onboarding-store";

const allLocations = buildAllLocations();

export default function AreaPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AreaLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selected, setSelected] = useState<AreaLocation | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setSelected(null);
    if (q.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const results = searchLocations(allLocations, q.trim(), 12);
    setSuggestions(results);
    setIsOpen(results.length > 0);
    setActiveIdx(-1);
  }, []);

  const handleSelect = useCallback(
    (loc: AreaLocation) => {
      setSelected(loc);
      setQuery(
        loc.type === "city"
          ? loc.display || `${loc.pref} ${loc.name}`
          : loc.name
      );
      setIsOpen(false);
      setSuggestions([]);
    },
    []
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestRef.current &&
        !suggestRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleNext = () => {
    if (!selected) return;
    setOnboardingState((prev) => ({
      ...prev,
      area: {
        prefecture: selected.pref,
        city: selected.type === "city" ? selected.name : null,
        areaLabel:
          selected.type === "city"
            ? selected.display || `${selected.pref} ${selected.name}`
            : selected.name,
        share: selected.share,
      },
    }));
    router.push("/onboarding/market-preview");
  };

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-serif text-2xl font-semibold text-navy-800 mb-2">
        対象エリアを選択
      </h1>
      <p className="text-gray-600 text-sm mb-8">
        DMを送りたい新設法人のエリアを選んでください。
        都道府県名や市区町村名を入力すると候補が表示されます。
      </p>

      <div className="relative mb-8">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="例: 渋谷区、名古屋市、東京都..."
          className="w-full rounded-xl border border-gray-300 bg-white px-5 py-4 text-base text-gray-800 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400"
        />

        {/* Suggestion dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div
            ref={suggestRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {suggestions.map((loc, i) => {
              const label =
                loc.type === "city"
                  ? loc.display || loc.name
                  : `${loc.name} (全域)`;
              return (
                <button
                  key={`${loc.pref}-${loc.name}-${i}`}
                  onClick={() => handleSelect(loc)}
                  className={`w-full text-left px-5 py-3 text-sm transition-colors border-b border-gray-100 last:border-b-0 ${
                    i === activeIdx
                      ? "bg-gold-400/10 text-gold-400"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                  {loc.estimated && (
                    <span className="ml-2 text-xs text-gray-400">(推計)</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected area display */}
      {selected && (
        <div className="mb-8 p-4 rounded-xl bg-navy-800/5 border border-navy-700/10">
          <p className="text-sm text-gray-500 mb-1">選択中のエリア</p>
          <p className="text-lg font-semibold text-navy-800">
            {selected.type === "city"
              ? selected.display || `${selected.pref} ${selected.name}`
              : selected.name}
          </p>
        </div>
      )}

      <Button
        onClick={handleNext}
        disabled={!selected}
        size="lg"
        className="w-full"
      >
        次へ: 市場プレビュー
      </Button>
    </div>
  );
}
