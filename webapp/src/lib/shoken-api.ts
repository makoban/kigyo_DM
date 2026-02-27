// Worker API client for 商圏データレポート generation
// Uses shared Cloudflare Worker (ai-fudosan) for e-Stat + Gemini

const WORKER_BASE = "https://house-search-proxy.ai-fudosan.workers.dev";

// Prefecture name → code mapping (for e-Stat API)
const PREF_CODES: Record<string, string> = {
  北海道: "01", 青森県: "02", 岩手県: "03", 宮城県: "04", 秋田県: "05",
  山形県: "06", 福島県: "07", 茨城県: "08", 栃木県: "09", 群馬県: "10",
  埼玉県: "11", 千葉県: "12", 東京都: "13", 神奈川県: "14", 新潟県: "15",
  富山県: "16", 石川県: "17", 福井県: "18", 山梨県: "19", 長野県: "20",
  岐阜県: "21", 静岡県: "22", 愛知県: "23", 三重県: "24", 滋賀県: "25",
  京都府: "26", 大阪府: "27", 兵庫県: "28", 奈良県: "29", 和歌山県: "30",
  鳥取県: "31", 島根県: "32", 岡山県: "33", 広島県: "34", 山口県: "35",
  徳島県: "36", 香川県: "37", 愛媛県: "38", 高知県: "39", 福岡県: "40",
  佐賀県: "41", 長崎県: "42", 熊本県: "43", 大分県: "44", 宮崎県: "45",
  鹿児島県: "46", 沖縄県: "47",
};

// ---- Types ----

export interface ShokenData {
  area_name: string;
  shoken_summary: string;
  population: {
    total_population: number;
    households: number;
    population_density: number;
    growth_rate: string;
  };
  age_composition: {
    under_20_pct: number;
    age_20_34_pct: number;
    age_35_49_pct: number;
    age_50_64_pct: number;
    over_65_pct: number;
  };
  business_establishments: {
    total: number;
    retail: number;
    food_service: number;
    services: number;
    medical: number;
    establishments_per_1000: number;
  };
  competition_density: {
    saturation_level: string;
    saturation_index: number;
    opportunity_sectors: string[];
  };
  daytime_population: {
    daytime_pop: number;
    nighttime_pop: number;
    daytime_ratio: number;
  };
  spending_power: {
    avg_household_income: number;
    retail_spending_index: number;
    food_spending_index: number;
    service_spending_index: number;
  };
  location_score: {
    overall_score: number;
    traffic_score: number;
    population_score: number;
    competition_score: number;
    spending_score: number;
    growth_score: number;
    grade: string;
    ai_recommendation: string;
  };
}

// ---- e-Stat API ----

interface EstatPop {
  total_population: number | null;
  households: number | null;
}

async function fetchEstatPopulation(prefCode: string): Promise<EstatPop> {
  const url = `${WORKER_BASE}/api/estat/population?statsDataId=0003448233&cdArea=${prefCode}000&limit=100`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { total_population: null, households: null };
    const data = await res.json();
    const values =
      data?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE || [];

    let pop: number | null = null;
    let hh: number | null = null;

    for (const v of values) {
      const tab = v["@tab"] || "";
      const cat = v["@cat01"] || "";
      const val = parseInt(v["$"], 10);
      if (isNaN(val)) continue;
      if ((tab === "020" || cat.includes("0010")) && !pop) pop = val;
      if ((tab === "040" || cat.includes("0020")) && !hh) hh = val;
    }

    return {
      total_population: pop,
      households: hh || (pop ? Math.round(pop / 2.3) : null),
    };
  } catch {
    return { total_population: null, households: null };
  }
}

// ---- Gemini API ----

function buildPrompt(
  prefecture: string,
  city: string | null,
  estatPop: EstatPop
): string {
  const areaName = city ? `${prefecture} ${city}` : prefecture;
  let estatInfo = "";
  if (estatPop.total_population) {
    estatInfo =
      "\n\n【参考: 政府統計実データ（国勢調査）】\n" +
      `・総人口: ${estatPop.total_population.toLocaleString()}人\n` +
      `・世帯数: ${(estatPop.households || 0).toLocaleString()}世帯\n` +
      "これらの実データを基準にして、他の項目も整合性のある値を推定してください。\n";
  }

  const schema = {
    area_name: areaName,
    shoken_summary:
      "（この地域の商圏特徴・ビジネスチャンス・注意点を200文字程度で簡潔に記述）",
    population: {
      total_population: 0,
      households: 0,
      population_density: 0,
      growth_rate: "+0.0%",
    },
    age_composition: {
      under_20_pct: 0,
      age_20_34_pct: 0,
      age_35_49_pct: 0,
      age_50_64_pct: 0,
      over_65_pct: 0,
    },
    business_establishments: {
      total: 0,
      retail: 0,
      food_service: 0,
      services: 0,
      medical: 0,
      establishments_per_1000: 0,
    },
    competition_density: {
      saturation_index: 0,
      saturation_level: "低/中/高/飽和",
      opportunity_sectors: ["業種1", "業種2"],
    },
    daytime_population: {
      daytime_pop: 0,
      nighttime_pop: 0,
      daytime_ratio: 0,
    },
    spending_power: {
      avg_household_income: 0,
      retail_spending_index: 0,
      food_spending_index: 0,
      service_spending_index: 0,
    },
    location_score: {
      overall_score: 0,
      traffic_score: 0,
      population_score: 0,
      competition_score: 0,
      spending_score: 0,
      growth_score: 0,
      grade: "S/A/B/C/D",
      ai_recommendation: "（出店に関する総合判定コメント100文字程度）",
    },
  };

  return (
    "あなたは日本の商圏分析の専門家です。\n" +
    "以下の地域について、新設法人の社長が自社の商圏を理解するためのデータを提供してください。\n\n" +
    `対象エリア: ${areaName}\n` +
    estatInfo +
    "\n" +
    "重要ルール:\n" +
    "・avg_household_income は万円/年の数値で返してください\n" +
    "・人口・世帯数は実数（人・世帯）で返してください\n" +
    "・パーセンテージは数値のみ（例: 25.3）で返してください\n" +
    "・index系は全国平均=100基準の数値で返してください\n" +
    "・shoken_summary は200文字程度の日本語で、ビジネスチャンスと注意点を具体的に記述してください\n\n" +
    "以下のJSON形式で回答してください。マークダウンのコードブロックで囲まず、純粋なJSONのみ返してください:\n" +
    JSON.stringify(schema, null, 2)
  );
}

function parseGeminiJSON(text: string): ShokenData | null {
  try {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }
    return JSON.parse(cleaned) as ShokenData;
  } catch {
    // Try to extract JSON from text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ShokenData;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ---- Main fetch function ----

export async function fetchShokenData(
  prefecture: string,
  city: string | null
): Promise<ShokenData> {
  const prefCode = PREF_CODES[prefecture] || "13";

  // Step 1: e-Stat real data
  const estatPop = await fetchEstatPopulation(prefCode);

  // Step 2: Gemini analysis
  const prompt = buildPrompt(prefecture, city, estatPop);
  const res = await fetch(`${WORKER_BASE}/api/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.text || "";
  const parsed = parseGeminiJSON(text);

  if (!parsed) {
    throw new Error("Failed to parse Gemini response");
  }

  // Override population with e-Stat real data if available
  if (estatPop.total_population) {
    parsed.population.total_population = estatPop.total_population;
  }
  if (estatPop.households) {
    parsed.population.households = estatPop.households;
  }

  return parsed;
}
