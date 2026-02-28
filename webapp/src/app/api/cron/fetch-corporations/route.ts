import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryCount } from "@/lib/db";
import {
  fetchDiffCSV,
  unzipCSV,
  parseCSV,
  filterNewCompanies,
} from "@/lib/corporation-fetcher";

export const maxDuration = 60; // seconds

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchStart = new Date();

  // Create batch log
  const batchLog = await queryOne<{ id: number }>(
    "INSERT INTO batch_logs (batch_type, status, csv_date) VALUES ('fetch_corporations', 'running', $1) RETURNING id",
    [new Date().toISOString().slice(0, 10)]
  );
  const batchId = batchLog?.id;

  try {
    // Fetch today's diff CSV
    const today = new Date();
    const { buffer: zipBuffer } = await fetchDiffCSV(today);
    const csvBuffer = await unzipCSV(zipBuffer);
    const allRows = parseCSV(csvBuffer);
    const newCompanies = filterNewCompanies(allRows);

    const csvDate = today.toISOString().slice(0, 10);

    // Insert new corporations (upsert on corporate_number)
    let insertedCount = 0;
    for (const corp of newCompanies) {
      try {
        await query(
          `INSERT INTO corporations (
            corporate_number, process_type, company_name, company_name_kana,
            entity_type, prefecture, city, street_address, prefecture_code,
            city_code, postal_code, change_date, update_date, csv_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (corporate_number) DO UPDATE SET
            process_type = EXCLUDED.process_type,
            company_name = EXCLUDED.company_name,
            company_name_kana = EXCLUDED.company_name_kana,
            entity_type = EXCLUDED.entity_type,
            prefecture = EXCLUDED.prefecture,
            city = EXCLUDED.city,
            street_address = EXCLUDED.street_address,
            prefecture_code = EXCLUDED.prefecture_code,
            city_code = EXCLUDED.city_code,
            postal_code = EXCLUDED.postal_code,
            change_date = EXCLUDED.change_date,
            update_date = EXCLUDED.update_date,
            csv_date = EXCLUDED.csv_date`,
          [
            corp.corporate_number,
            corp.process_type,
            corp.company_name,
            corp.company_name_kana,
            corp.entity_type,
            corp.prefecture,
            corp.city,
            corp.street_address,
            corp.prefecture_code,
            corp.city_code,
            corp.postal_code,
            corp.change_date || null,
            corp.update_date || null,
            csvDate,
          ]
        );
        insertedCount++;
      } catch {
        // Skip individual upsert failures
      }
    }

    // Match against active subscriptions
    const subsResult = await query(
      "SELECT * FROM subscriptions WHERE status = 'active'",
      []
    );
    const subscriptions = subsResult.rows as {
      id: number;
      user_id: string;
      prefecture: string;
      city: string | null;
      max_letters_per_month: number;
    }[];

    let matchedSubs = 0;
    let queuedCount = 0;

    for (const sub of subscriptions) {
      const userId = sub.user_id;

      // Find corporations matching this subscription's area
      const matchingCorps = newCompanies.filter((corp) => {
        if (sub.city) {
          // City-level match
          return corp.prefecture === sub.prefecture && corp.city?.includes(sub.city);
        }
        // Prefecture-level match
        return corp.prefecture === sub.prefecture;
      });

      if (matchingCorps.length === 0) continue;
      matchedSubs++;

      // Check monthly budget
      const yearMonth = new Date().toISOString().slice(0, 7);
      const currentMonthCount = await queryCount(
        `SELECT COUNT(*) FROM mailing_queue
         WHERE user_id = $1
           AND status = ANY($2)
           AND scheduled_date >= $3
           AND scheduled_date <= $4`,
        [userId, ["pending", "confirmed", "ready_to_send", "sent"], `${yearMonth}-01`, `${yearMonth}-31`]
      );

      const remaining = sub.max_letters_per_month - currentMonthCount;
      if (remaining <= 0) continue;

      // Queue mailings (up to remaining budget)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const scheduledDate = tomorrow.toISOString().slice(0, 10);

      const toQueue = matchingCorps.slice(0, remaining);
      for (const corp of toQueue) {
        // Get corporation ID
        const corpRecord = await queryOne<{ id: number }>(
          "SELECT id FROM corporations WHERE corporate_number = $1",
          [corp.corporate_number]
        );

        if (!corpRecord) continue;

        // Check for duplicates (same user + same corporation)
        const existing = await queryCount(
          "SELECT COUNT(*) FROM mailing_queue WHERE user_id = $1 AND corporation_id = $2",
          [userId, corpRecord.id]
        );

        if (existing > 0) continue;

        await query(
          `INSERT INTO mailing_queue (subscription_id, user_id, corporation_id, status, scheduled_date, unit_price)
           VALUES ($1, $2, $3, 'pending', $4, 380)`,
          [sub.id, userId, corpRecord.id, scheduledDate]
        );
        queuedCount++;
      }
    }

    // Update batch log
    if (batchId) {
      await query(
        `UPDATE batch_logs SET
          status = 'completed',
          total_records = $1,
          new_companies = $2,
          matched_subscriptions = $3,
          queued_count = $4,
          completed_at = $5
         WHERE id = $6`,
        [
          allRows.length,
          newCompanies.length,
          matchedSubs,
          queuedCount,
          new Date().toISOString(),
          batchId,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      totalRecords: allRows.length,
      newCompanies: newCompanies.length,
      inserted: insertedCount,
      matchedSubscriptions: matchedSubs,
      queuedCount,
      duration: Date.now() - batchStart.getTime(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (batchId) {
      await query(
        `UPDATE batch_logs SET status = 'failed', error_message = $1, completed_at = $2 WHERE id = $3`,
        [message, new Date().toISOString(), batchId]
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
