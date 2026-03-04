import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import ShokenReport from "@/components/shoken-report";
import type { ShokenData } from "@/lib/shoken-api";

interface Row {
  area_label: string;
  shoken_data: ShokenData | null;
}

export default async function RenderShokenPage({
  searchParams,
}: {
  searchParams: Promise<{ subscriptionId?: string; secret?: string }>;
}) {
  const params = await searchParams;
  if (params.secret !== process.env.RENDER_SECRET) redirect("/");

  const subId = params.subscriptionId;
  if (!subId) redirect("/");

  const row = await queryOne<Row>(
    `SELECT area_label, shoken_data FROM subscriptions WHERE id = $1`,
    [subId]
  );

  if (!row || !row.shoken_data) redirect("/");

  return <ShokenReport areaLabel={row.area_label} data={row.shoken_data} />;
}
