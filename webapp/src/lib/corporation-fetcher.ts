import iconv from "iconv-lite";
import { createServiceClient } from "@/lib/supabase/server";

// CSV columns (30 columns, Shift-JIS / CP932)
// [0] 連番, [1] 法人番号, [2] 処理区分, [3] 訂正区分, [4] 更新年月日,
// [5] 変更年月日, [6] 商号又は名称, [7] フリガナ, [8] 法人種別,
// [9] 都道府県, [10] 市区町村, [11] 丁目番地等, [12] 画像ID,
// [13] 都道府県コード, [14] 市区町村コード, [15] 郵便番号, ...

interface CorporationRow {
  corporate_number: string;
  process_type: string;
  company_name: string;
  company_name_kana: string;
  entity_type: string;
  prefecture: string;
  city: string;
  street_address: string;
  prefecture_code: string;
  city_code: string;
  postal_code: string;
  change_date: string;
  update_date: string;
}

export function parseCSV(buffer: Buffer): CorporationRow[] {
  const text = iconv.decode(buffer, "cp932");
  const lines = text.split("\n").filter((l) => l.trim());
  // Skip header if present
  const startIdx = lines[0]?.includes("連番") ? 1 : 0;

  const rows: CorporationRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    if (cols.length < 16) continue;

    rows.push({
      corporate_number: cols[1],
      process_type: cols[2],
      company_name: cols[6],
      company_name_kana: cols[7],
      entity_type: cols[8],
      prefecture: cols[9],
      city: cols[10],
      street_address: cols[11],
      prefecture_code: cols[13],
      city_code: cols[14],
      postal_code: cols[15],
      change_date: cols[5],
      update_date: cols[4],
    });
  }
  return rows;
}

export function filterNewCompanies(rows: CorporationRow[]): CorporationRow[] {
  return rows.filter(
    (r) =>
      r.process_type === "01" && // 新規
      (r.entity_type === "301" || r.entity_type === "305") // 株式会社 or 合同会社
  );
}

export async function fetchDiffCSV(
  date: Date
): Promise<{ buffer: Buffer; fileName: string }> {
  const pageUrl =
    "https://www.houjin-bangou.nta.go.jp/download/sabun/index.html";

  // Step 1: Get page for CSRF token and session cookie
  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; KigyoSearchBot/1.0)",
    },
  });

  const pageHtml = await pageRes.text();
  const cookies = pageRes.headers.getSetCookie?.() || [];
  const cookieStr = cookies.map((c) => c.split(";")[0]).join("; ");

  // Extract CSRF token
  const tokenMatch = pageHtml.match(
    /name="jp\.go\.nta\.houjin_bangou\.framework\.web\.common\.CNSFWTokenProcessor\.request\.token"\s+value="([^"]+)"/
  );
  if (!tokenMatch) {
    throw new Error("CSRF token not found");
  }
  const token = tokenMatch[1];

  // Extract fileNo for the target date
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const fileNoMatch = pageHtml.match(
    new RegExp(`value="(\\d+)"[^>]*>\\s*${dateStr}`)
  ) ||
    pageHtml.match(
      new RegExp(`value="(\\d+)"[^>]*>[^<]*${dateStr}`)
    );

  if (!fileNoMatch) {
    throw new Error(`No CSV available for date ${dateStr}`);
  }
  const fileNo = fileNoMatch[1];

  // Step 2: POST to download
  const formData = new URLSearchParams({
    "jp.go.nta.houjin_bangou.framework.web.common.CNSFWTokenProcessor.request.token":
      token,
    event: "download",
    selDlFileNo: fileNo,
  });

  const dlRes = await fetch(pageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieStr,
      "User-Agent":
        "Mozilla/5.0 (compatible; KigyoSearchBot/1.0)",
    },
    body: formData.toString(),
  });

  if (!dlRes.ok) {
    throw new Error(`Download failed: ${dlRes.status}`);
  }

  const arrayBuffer = await dlRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract filename from Content-Disposition
  const disposition = dlRes.headers.get("content-disposition") || "";
  const fnMatch = disposition.match(/filename="?([^";\s]+)"?/);
  const fileName = fnMatch ? fnMatch[1] : `diff_${dateStr}.zip`;

  return { buffer, fileName };
}

export async function unzipCSV(
  zipBuffer: Buffer
): Promise<Buffer> {
  // Use JSZip for ZIP extraction
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(zipBuffer);
  const csvFiles = Object.keys(zip.files).filter(
    (f) => f.endsWith(".csv") && !zip.files[f].dir
  );

  if (csvFiles.length === 0) {
    throw new Error("No CSV file found in ZIP");
  }

  const csvBuffer = await zip.files[csvFiles[0]].async("nodebuffer");
  return csvBuffer;
}
