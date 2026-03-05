#!/usr/bin/env node
// Render Cron Job: triggers fetch-corporations API endpoint

const BASE_URL = process.env.WEBAPP_URL || "https://kigyo-dm-webapp.onrender.com";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("CRON_SECRET is required");
  process.exit(1);
}

const endpoints = [
  "/api/cron/fetch-corporations",
  "/api/cron/generate-jpgs",
];

async function trigger() {
  for (const ep of endpoints) {
    const url = `${BASE_URL}${ep}`;
    console.log(`Triggering: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const body = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response: ${body}`);
      if (!res.ok) process.exit(1);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }
  console.log("Done.");
}

trigger();
