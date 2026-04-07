import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getLastAuthError } from "@/lib/auth";

export async function GET() {
  const checks: Record<string, string | null> = {};

  // Last NextAuth error
  checks.lastAuthError = getLastAuthError();

  // Check env vars
  checks.AUTH_SECRET = process.env.AUTH_SECRET ? "set" : "MISSING";
  checks.AUTH_URL = process.env.AUTH_URL || "not set";
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "not set";
  checks.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST || "not set";
  checks.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.slice(0, 10) + "..." : "MISSING";
  checks.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? "set (" + process.env.GOOGLE_CLIENT_SECRET.length + " chars)" : "MISSING";

  // Check DB
  try {
    const result = await query("SELECT COUNT(*) as count FROM users");
    checks.DB = "OK (users: " + result.rows[0].count + ")";
  } catch (e) {
    checks.DB = "ERROR: " + (e instanceof Error ? e.message : String(e));
  }

  // Test dashboard queries
  try {
    const userId = "dade5814-ba78-44de-849c-b2eec06c101d";
    const r1 = await query("SELECT balance FROM profiles WHERE id = $1", [userId]);
    checks.DASH_profile = "OK rows=" + r1.rows.length;
    const r2 = await query("SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1", [userId]);
    checks.DASH_queue_count = "OK count=" + r2.rows[0].count;
    const r3 = await query(
      `SELECT mq.id, mq.status,
              c.company_name, c.city, c.street_address, c.change_date
       FROM mailing_queue mq
       JOIN corporations c ON c.id = mq.corporation_id
       WHERE mq.user_id = $1
       ORDER BY c.change_date DESC, mq.id DESC
       LIMIT 50`,
      [userId]
    );
    checks.DASH_recent = "OK rows=" + r3.rows.length;
  } catch (e) {
    checks.DASH_error = e instanceof Error ? e.message : String(e);
  }

  // Check Google OIDC discovery
  try {
    const res = await fetch("https://accounts.google.com/.well-known/openid-configuration");
    checks.GOOGLE_OIDC = res.ok ? "OK (" + res.status + ")" : "FAIL (" + res.status + ")";
  } catch (e) {
    checks.GOOGLE_OIDC = "ERROR: " + (e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json(checks);
}
