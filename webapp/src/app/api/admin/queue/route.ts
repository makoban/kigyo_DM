import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status");

    const statusValues = statusFilter
      ? [statusFilter]
      : ["pending", "confirmed", "ready_to_send"];

    const result = await query(
      `SELECT
        mq.id,
        mq.status,
        mq.scheduled_date,
        mq.unit_price,
        mq.created_at,
        mq.sent_at,
        json_build_object(
          'company_name', c.company_name,
          'company_name_kana', c.company_name_kana,
          'entity_type', c.entity_type,
          'prefecture', c.prefecture,
          'city', c.city,
          'street_address', c.street_address,
          'postal_code', c.postal_code,
          'corporate_number', c.corporate_number,
          'change_date', c.change_date
        ) AS corporations,
        json_build_object(
          'greeting_text', s.greeting_text,
          'area_label', s.area_label,
          'shoken_data', s.shoken_data
        ) AS subscriptions,
        json_build_object(
          'company_name', p.company_name,
          'representative_name', p.representative_name,
          'postal_code', p.postal_code,
          'address', p.address,
          'phone', p.phone,
          'contact_email', p.contact_email,
          'company_url', p.company_url
        ) AS profiles
      FROM mailing_queue mq
      JOIN corporations c ON mq.corporation_id = c.id
      JOIN subscriptions s ON mq.subscription_id = s.id
      JOIN profiles p ON mq.user_id = p.id
      WHERE mq.status = ANY($1)
      ORDER BY mq.id DESC`,
      [statusValues]
    );

    return NextResponse.json({
      items: result.rows,
      totalCount: result.rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
