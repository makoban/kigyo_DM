import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
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

  const supabase = await createServiceClient();
  const batchStart = new Date();

  // Create batch log
  const { data: batchLog } = await supabase
    .from("batch_logs")
    .insert({
      batch_type: "fetch_corporations",
      status: "running",
      csv_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

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
      const { error } = await supabase.from("corporations").upsert(
        {
          corporate_number: corp.corporate_number,
          process_type: corp.process_type,
          company_name: corp.company_name,
          company_name_kana: corp.company_name_kana,
          entity_type: corp.entity_type,
          prefecture: corp.prefecture,
          city: corp.city,
          street_address: corp.street_address,
          prefecture_code: corp.prefecture_code,
          city_code: corp.city_code,
          postal_code: corp.postal_code,
          change_date: corp.change_date || null,
          update_date: corp.update_date || null,
          csv_date: csvDate,
        },
        { onConflict: "corporate_number" }
      );
      if (!error) insertedCount++;
    }

    // Match against active subscriptions
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*, profiles(id)")
      .eq("status", "active");

    let matchedSubs = 0;
    let queuedCount = 0;

    if (subscriptions) {
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
        const { count: currentMonthCount } = await supabase
          .from("mailing_queue")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", ["pending", "confirmed", "ready_to_send", "sent"])
          .gte("scheduled_date", `${yearMonth}-01`)
          .lte("scheduled_date", `${yearMonth}-31`);

        const remaining =
          sub.max_letters_per_month - (currentMonthCount || 0);
        if (remaining <= 0) continue;

        // Queue mailings (up to remaining budget)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const scheduledDate = tomorrow.toISOString().slice(0, 10);

        const toQueue = matchingCorps.slice(0, remaining);
        for (const corp of toQueue) {
          // Get corporation ID
          const { data: corpRecord } = await supabase
            .from("corporations")
            .select("id")
            .eq("corporate_number", corp.corporate_number)
            .single();

          if (!corpRecord) continue;

          // Check for duplicates (same user + same corporation)
          const { count: existing } = await supabase
            .from("mailing_queue")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("corporation_id", corpRecord.id);

          if (existing && existing > 0) continue;

          await supabase.from("mailing_queue").insert({
            subscription_id: sub.id,
            user_id: userId,
            corporation_id: corpRecord.id,
            status: "pending",
            scheduled_date: scheduledDate,
            unit_price: 380,
          });
          queuedCount++;
        }
      }
    }

    // Update batch log
    if (batchId) {
      await supabase
        .from("batch_logs")
        .update({
          status: "completed",
          total_records: allRows.length,
          new_companies: newCompanies.length,
          matched_subscriptions: matchedSubs,
          queued_count: queuedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);
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
      await supabase
        .from("batch_logs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
