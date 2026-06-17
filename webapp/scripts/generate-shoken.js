#!/usr/bin/env node
// Generate shoken data for subscriptions missing it, then save to DB

const { Pool } = require("pg");

const WORKER_BASE = "https://house-search-proxy.ai-fudosan.workers.dev";
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const PREF_CODES = {
  "北海道":"01","青森県":"02","岩手県":"03","宮城県":"04","秋田県":"05",
  "山形県":"06","福島県":"07","茨城県":"08","栃木県":"09","群馬県":"10",
  "埼玉県":"11","千葉県":"12","東京都":"13","神奈川県":"14","新潟県":"15",
  "富山県":"16","石川県":"17","福井県":"18","山梨県":"19","長野県":"20",
  "岐阜県":"21","静岡県":"22","愛知県":"23","三重県":"24","滋賀県":"25",
  "京都府":"26","大阪府":"27","兵庫県":"28","奈良県":"29","和歌山県":"30",
  "鳥取県":"31","島根県":"32","岡山県":"33","広島県":"34","山口県":"35",
  "徳島県":"36","香川県":"37","愛媛県":"38","高知県":"39","福岡県":"40",
  "佐賀県":"41","長崎県":"42","熊本県":"43","大分県":"44","宮崎県":"45",
  "鹿児島県":"46","沖縄県":"47",
};

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
pool.on("connect", (c) => c.query("SET search_path TO kigyo_dm, public"));

async function fetchEstat(prefCode) {
  const url = `${WORKER_BASE}/api/estat/population?statsDataId=0003448233&cdArea=${prefCode}000&limit=100`;
  const res = await fetch(url);
  if (!res.ok) return { total_population: null, households: null };
  const data = await res.json();
  const values = data?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE || [];
  let pop = null, hh = null;
  for (const v of values) {
    const tab = v["@tab"] || "";
    const cat = v["@cat01"] || "";
    const val = parseInt(v["$"], 10);
    if (isNaN(val)) continue;
    if ((tab === "020" || cat.includes("0010")) && !pop) pop = val;
    if ((tab === "040" || cat.includes("0020")) && !hh) hh = val;
  }
  return { total_population: pop, households: hh || (pop ? Math.round(pop / 2.3) : null) };
}

function buildPrompt(prefecture, city, estatPop) {
  const areaName = city ? `${prefecture} ${city}` : prefecture;
  let estatInfo = "";
  if (estatPop.total_population) {
    estatInfo = `\n\n【参考: 政府統計実データ（国勢調査）】\n・総人口: ${estatPop.total_population.toLocaleString()}人\n・世帯数: ${(estatPop.households || 0).toLocaleString()}世帯\nこれらの実データを基準にして、他の項目も整合性のある値を推定してください。\n`;
  }
  const schema = {
    area_name: areaName,
    shoken_summary: "（この地域の商圏特徴・ビジネスチャンス・注意点を200文字程度で簡潔に記述）",
    population: { total_population: 0, households: 0, population_density: 0, growth_rate: "+0.0%" },
    age_composition: { under_20_pct: 0, age_20_34_pct: 0, age_35_49_pct: 0, age_50_64_pct: 0, over_65_pct: 0 },
    business_establishments: { total: 0, retail: 0, food_service: 0, services: 0, medical: 0, establishments_per_1000: 0 },
    competition_density: { saturation_index: 0, saturation_level: "低/中/高/飽和", opportunity_sectors: ["業種1", "業種2"] },
    daytime_population: { daytime_pop: 0, nighttime_pop: 0, daytime_ratio: 0 },
    spending_power: { avg_household_income: 0, retail_spending_index: 0, food_spending_index: 0, service_spending_index: 0 },
    location_score: { overall_score: 0, traffic_score: 0, population_score: 0, competition_score: 0, spending_score: 0, growth_score: 0, grade: "S/A/B/C/D", ai_recommendation: "（出店に関する総合判定コメント100文字程度）" },
  };
  return "あなたは日本の商圏分析の専門家です。\n以下の地域について、新設法人の社長が自社の商圏を理解するためのデータを提供してください。\n\n" +
    `対象エリア: ${areaName}\n` + estatInfo + "\n" +
    "重要ルール:\n・avg_household_income は万円/年の数値で返してください\n・人口・世帯数は実数（人・世帯）で返してください\n・パーセンテージは数値のみ（例: 25.3）で返してください\n・index系は全国平均=100基準の数値で返してください\n・shoken_summary は200文字程度の日本語で、ビジネスチャンスと注意点を具体的に記述してください\n\n以下のJSON形式で回答してください。マークダウンのコードブロックで囲まず、純粋なJSONのみ返してください:\n" +
    JSON.stringify(schema, null, 2);
}

function parseJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  try { return JSON.parse(cleaned); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

async function main() {
  // Find subscriptions with missing shoken_data
  const subs = await pool.query(
    "SELECT id, prefecture, city, area_label FROM subscriptions WHERE status = 'active' AND shoken_data IS NULL"
  );

  if (subs.rows.length === 0) {
    console.log("No subscriptions need shoken data.");
    await pool.end();
    return;
  }

  for (const sub of subs.rows) {
    console.log(`Processing: ${sub.area_label}`);
    const prefCode = PREF_CODES[sub.prefecture] || "13";

    // Step 1: e-Stat
    console.log("  Fetching e-Stat...");
    const estatPop = await fetchEstat(prefCode);
    console.log(`  Population: ${estatPop.total_population}, Households: ${estatPop.households}`);

    // Step 2: Gemini
    console.log("  Calling Gemini...");
    const prompt = buildPrompt(sub.prefecture, sub.city, estatPop);
    const res = await fetch(`${WORKER_BASE}/api/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      console.error(`  Gemini error: ${res.status}`);
      continue;
    }

    const data = await res.json();
    const parsed = parseJSON(data.text || "");
    if (!parsed) {
      console.error("  Failed to parse Gemini response");
      continue;
    }

    // Override with e-Stat real data
    if (estatPop.total_population) parsed.population.total_population = estatPop.total_population;
    if (estatPop.households) parsed.population.households = estatPop.households;

    // Save to DB
    await pool.query(
      "UPDATE subscriptions SET shoken_data = $1, shoken_jpg_url = NULL WHERE id = $2",
      [JSON.stringify(parsed), sub.id]
    );
    console.log(`  Saved shoken_data for ${sub.area_label}`);
  }

  await pool.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
