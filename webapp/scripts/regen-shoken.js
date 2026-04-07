#!/usr/bin/env node
// Regenerate shoken data for a subscription
const WORKER_BASE = "https://house-search-proxy.ai-fudosan.workers.dev";
const SUB_ID = "c9c6a41a-4e2a-4e46-9c8e-1a7d475920a1";
const PREFECTURE = "愛知県";
const CITY = "名古屋市";
const PREF_CODE = "23";

async function main() {
  // Step 1: e-Stat
  const estatRes = await fetch(
    `${WORKER_BASE}/api/estat/population?statsDataId=0003448233&cdArea=${PREF_CODE}000&limit=100`
  );
  const estatData = await estatRes.json();
  const values =
    estatData?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE || [];
  let pop = null,
    hh = null;
  for (const v of values) {
    const tab = v["@tab"] || "";
    const cat = v["@cat01"] || "";
    const val = parseInt(v["$"], 10);
    if (isNaN(val)) continue;
    if ((tab === "020" || cat.includes("0010")) && !pop) pop = val;
    if ((tab === "040" || cat.includes("0020")) && !hh) hh = val;
  }
  console.log("e-Stat: pop=", pop, "hh=", hh);

  // Step 2: Gemini
  const schema = JSON.stringify({
    area_name: CITY ? `${PREFECTURE} ${CITY}` : PREFECTURE,
    shoken_summary: "(200文字程度)",
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
    daytime_population: { daytime_pop: 0, nighttime_pop: 0, daytime_ratio: 0 },
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
      ai_recommendation: "(100文字程度)",
    },
  });

  let estatInfo = "";
  if (pop) {
    estatInfo = `\n\n【参考: 政府統計実データ（国勢調査）】\n・総人口: ${pop.toLocaleString()}人\n・世帯数: ${(hh || 0).toLocaleString()}世帯\nこれらの実データを基準にして、他の項目も整合性のある値を推定してください。\n`;
  }

  const prompt =
    `あなたは日本の商圏分析の専門家です。\n` +
    `以下の地域について、新設法人の社長が自社の商圏を理解するためのデータを提供してください。\n\n` +
    `対象エリア: ${CITY ? `${PREFECTURE} ${CITY}` : PREFECTURE}\n` +
    estatInfo +
    `\n重要ルール:\n` +
    `・avg_household_income は万円/年の数値で返してください\n` +
    `・人口・世帯数は実数（人・世帯）で返してください\n` +
    `・パーセンテージは数値のみ（例: 25.3）で返してください\n` +
    `・index系は全国平均=100基準の数値で返してください\n` +
    `・shoken_summary は200文字程度の日本語で、ビジネスチャンスと注意点を具体的に記述してください\n\n` +
    `以下のJSON形式で回答してください。マークダウンのコードブロックで囲まず、純粋なJSONのみ返してください:\n` +
    schema;

  console.log("Calling Gemini...");
  const geminiRes = await fetch(`${WORKER_BASE}/api/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const geminiData = await geminiRes.json();
  let text = (geminiData.text || "").trim();
  if (text.startsWith("```"))
    text = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");

  const parsed = JSON.parse(text);
  if (pop) parsed.population.total_population = pop;
  if (hh) parsed.population.households = hh;
  console.log(
    "Generated:",
    parsed.area_name,
    "pop:",
    parsed.population.total_population
  );

  // Step 3: Save to DB
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString:
      "postgresql://kokotomo_staging_user:MdaXINo3sbdaPy1cPwp7lvnm8O7SLdLq@dpg-d52du3nfte5s73d3ni6g-a.singapore-postgres.render.com/kokotomo_staging",
    ssl: { rejectUnauthorized: false },
  });
  pool.on("connect", (c) => c.query("SET search_path TO kigyo_dm, public"));

  const r = await pool.query(
    "UPDATE subscriptions SET shoken_data = $1, shoken_jpg_url = NULL WHERE id = $2 RETURNING area_label",
    [JSON.stringify(parsed), SUB_ID]
  );
  console.log("DB updated:", r.rows[0]);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
