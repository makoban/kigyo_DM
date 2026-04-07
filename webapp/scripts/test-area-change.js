#!/usr/bin/env node
// Test: change area to 東京都 渋谷区, regenerate shoken data + JPG, verify

const WORKER_BASE = "https://house-search-proxy.ai-fudosan.workers.dev";
const SUB_ID = "c9c6a41a-4e2a-4e46-9c8e-1a7d475920a1";
const DB_URL =
  "postgresql://kokotomo_staging_user:MdaXINo3sbdaPy1cPwp7lvnm8O7SLdLq@dpg-d52du3nfte5s73d3ni6g-a.singapore-postgres.render.com/kokotomo_staging";

async function main() {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  pool.on("connect", (c) => c.query("SET search_path TO kigyo_dm, public"));

  // Step 1: Generate shoken data for 東京都 渋谷区
  console.log("Step 1: Generating shoken data for 東京都 渋谷区...");
  const schema = {
    area_name: "東京都 渋谷区",
    shoken_summary: "(200文字程度)",
    population: { total_population: 0, households: 0, population_density: 0, growth_rate: "+0.0%" },
    age_composition: { under_20_pct: 0, age_20_34_pct: 0, age_35_49_pct: 0, age_50_64_pct: 0, over_65_pct: 0 },
    business_establishments: { total: 0, retail: 0, food_service: 0, services: 0, medical: 0, establishments_per_1000: 0 },
    competition_density: { saturation_index: 0, saturation_level: "低/中/高/飽和", opportunity_sectors: ["業種1"] },
    daytime_population: { daytime_pop: 0, nighttime_pop: 0, daytime_ratio: 0 },
    spending_power: { avg_household_income: 0, retail_spending_index: 0, food_spending_index: 0, service_spending_index: 0 },
    location_score: { overall_score: 0, traffic_score: 0, population_score: 0, competition_score: 0, spending_score: 0, growth_score: 0, grade: "S/A/B/C/D", ai_recommendation: "(100文字程度)" },
  };
  const prompt =
    "あなたは日本の商圏分析の専門家です。\n対象エリア: 東京都 渋谷区\n\n" +
    "重要ルール:\n・avg_household_income は万円/年\n・人口は実数\n・パーセンテージは数値のみ\n・index系は全国平均=100基準\n・shoken_summary は200文字程度の日本語\n\n" +
    "以下のJSON形式で返してください:\n" +
    JSON.stringify(schema, null, 2);

  const geminiRes = await fetch(`${WORKER_BASE}/api/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const geminiJson = await geminiRes.json();
  let text = (geminiJson.text || "").trim();
  if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  const shokenData = JSON.parse(text);
  console.log("  OK: area_name =", shokenData.area_name);

  // Step 2: Update DB
  console.log("Step 2: Updating DB (area=渋谷区, clear JPG)...");
  await pool.query(
    "UPDATE subscriptions SET prefecture = $1, city = $2, area_label = $3, shoken_data = $4, shoken_jpg_url = NULL WHERE id = $5",
    ["東京都", "渋谷区", "東京都 渋谷区", JSON.stringify(shokenData), SUB_ID]
  );
  console.log("  OK: shoken_jpg_url = NULL");

  // Step 3: Trigger generate-jpgs
  console.log("Step 3: Triggering generate-jpgs cron...");
  const cronRes = await fetch("https://kigyo-dm-webapp.onrender.com/api/cron/generate-jpgs", {
    headers: { Authorization: "Bearer kigyo-dm-cron-secret-2026" },
  });
  const cronData = await cronRes.json();
  console.log("  Result:", JSON.stringify(cronData));

  // Step 4: Verify DB
  console.log("Step 4: Verifying DB...");
  const r = await pool.query(
    "SELECT area_label, shoken_jpg_url, shoken_data->>'area_name' as shoken_area FROM subscriptions WHERE id = $1",
    [SUB_ID]
  );
  const row = r.rows[0];
  console.log("  area_label:", row.area_label);
  console.log("  shoken_area:", row.shoken_area);
  console.log("  shoken_jpg_url:", row.shoken_jpg_url);

  // Step 5: Verify JPG accessible
  if (row.shoken_jpg_url) {
    const url = row.shoken_jpg_url.split("?")[0]; // strip cache buster for R2
    const jpgRes = await fetch(url);
    console.log("  JPG HTTP:", jpgRes.status, "Size:", jpgRes.headers.get("content-length"), "bytes");
    console.log("\n✓ PASS: エリア変更→商圏データ再生成→JPG再生成 全フロー成功");
  } else {
    console.log("\n✗ FAIL: shoken_jpg_url is still NULL");
  }

  // Step 6: Restore to 名古屋市
  console.log("\nStep 6: Restoring to 愛知県 名古屋市...");
  // Regenerate Nagoya shoken
  const prompt2 =
    "あなたは日本の商圏分析の専門家です。\n対象エリア: 愛知県 名古屋市\n\n" +
    "重要ルール:\n・avg_household_income は万円/年\n・人口は実数\n・パーセンテージは数値のみ\n・index系は全国平均=100基準\n・shoken_summary は200文字程度の日本語\n\n" +
    "以下のJSON形式で返してください:\n" +
    JSON.stringify({ ...schema, area_name: "愛知県 名古屋市" }, null, 2);
  const g2 = await fetch(`${WORKER_BASE}/api/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt2 }),
  });
  const g2j = await g2.json();
  let t2 = (g2j.text || "").trim();
  if (t2.startsWith("```")) t2 = t2.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  const nagoyaData = JSON.parse(t2);

  await pool.query(
    "UPDATE subscriptions SET prefecture = $1, city = $2, area_label = $3, shoken_data = $4, shoken_jpg_url = NULL WHERE id = $5",
    ["愛知県", "名古屋市", "愛知県 名古屋市", JSON.stringify(nagoyaData), SUB_ID]
  );
  // Regenerate JPG
  const cronRes2 = await fetch("https://kigyo-dm-webapp.onrender.com/api/cron/generate-jpgs", {
    headers: { Authorization: "Bearer kigyo-dm-cron-secret-2026" },
  });
  const cronData2 = await cronRes2.json();
  console.log("  JPG regen:", JSON.stringify(cronData2));

  const r2 = await pool.query(
    "SELECT area_label, shoken_jpg_url FROM subscriptions WHERE id = $1",
    [SUB_ID]
  );
  console.log("  Restored:", r2.rows[0].area_label, "JPG:", r2.rows[0].shoken_jpg_url ? "OK" : "MISSING");

  await pool.end();
  console.log("\nAll done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
