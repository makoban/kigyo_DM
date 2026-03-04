import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import CombinedA4 from "@/components/combined-a4";

interface Row {
  greeting_text: string | null;
  area_label: string;
  shoken_data: Record<string, unknown> | null;
  company_name: string;
  corp_postal_code: string | null;
  corp_prefecture: string | null;
  corp_city: string | null;
  corp_street_address: string | null;
  sender_company_name: string | null;
  representative_name: string | null;
  sender_postal_code: string | null;
  sender_address: string | null;
  sender_phone: string | null;
  sender_contact_email: string | null;
  sender_company_url: string | null;
}

export default async function RenderGreetingPage({
  searchParams,
}: {
  searchParams: Promise<{ queueId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  if (params.secret !== process.env.RENDER_SECRET) redirect("/");

  const queueId = parseInt(params.queueId || "0", 10);
  if (!queueId) redirect("/");

  const row = await queryOne<Row>(
    `SELECT
      s.greeting_text,
      s.area_label,
      s.shoken_data,
      c.company_name,
      c.postal_code AS corp_postal_code,
      c.prefecture AS corp_prefecture,
      c.city AS corp_city,
      c.street_address AS corp_street_address,
      p.company_name AS sender_company_name,
      p.representative_name,
      p.postal_code AS sender_postal_code,
      p.address AS sender_address,
      p.phone AS sender_phone,
      p.contact_email AS sender_contact_email,
      p.company_url AS sender_company_url
    FROM mailing_queue mq
    JOIN corporations c ON mq.corporation_id = c.id
    JOIN subscriptions s ON mq.subscription_id = s.id
    JOIN profiles p ON mq.user_id = p.id
    WHERE mq.id = $1`,
    [queueId]
  );

  if (!row) redirect("/");

  return (
    <CombinedA4
      corporation={{
        company_name: row.company_name,
        postal_code: row.corp_postal_code,
        prefecture: row.corp_prefecture,
        city: row.corp_city,
        street_address: row.corp_street_address,
      }}
      sender={{
        company_name: row.sender_company_name,
        representative_name: row.representative_name,
        postal_code: row.sender_postal_code,
        address: row.sender_address,
        phone: row.sender_phone,
        contact_email: row.sender_contact_email,
        company_url: row.sender_company_url,
      }}
      greetingText={row.greeting_text || ""}
      areaLabel={row.area_label}
      shokenData={row.shoken_data as never}
    />
  );
}
