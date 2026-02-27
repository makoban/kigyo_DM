import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

/** テーブル行やdl/dtから「ラベル: 値」を抽出 */
function extractLabelValue(
  $: cheerio.CheerioAPI,
  labels: string[]
): string | undefined {
  const pattern = labels.join("|");

  // <th>ラベル</th><td>値</td>
  let result: string | undefined;
  $("th").each((_, el) => {
    if (result) return;
    const text = $(el).text().trim();
    if (new RegExp(pattern).test(text)) {
      const td = $(el).next("td");
      if (td.length) {
        result = td.text().trim().replace(/\s+/g, " ");
      }
    }
  });
  if (result) return result;

  // <dt>ラベル</dt><dd>値</dd>
  $("dt").each((_, el) => {
    if (result) return;
    const text = $(el).text().trim();
    if (new RegExp(pattern).test(text)) {
      const dd = $(el).next("dd");
      if (dd.length) {
        result = dd.text().trim().replace(/\s+/g, " ");
      }
    }
  });
  return result;
}

/** 本文テキストから正規表現で抽出 */
function extractFromText(bodyText: string, pattern: RegExp): string | undefined {
  const m = bodyText.match(pattern);
  return m ? m[0].trim() : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URLが必要です" },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json(
        { error: "無効なURLです" },
        { status: 400 }
      );
    }

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `サイトにアクセスできません (${res.status})` },
        { status: 422 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove script/style for cleaner body text
    $("script, style, noscript").remove();
    const bodyText = $("body").text().replace(/\s+/g, " ");

    // --- title ---
    const title =
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      "";

    // --- description ---
    const description =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      "";

    // --- companyName ---
    let companyName =
      $('meta[property="og:site_name"]').attr("content")?.trim() ||
      $('[itemtype*="Organization"] [itemprop="name"]').first().text().trim() ||
      extractLabelValue($, ["会社名", "社名", "商号", "事務所名", "法人名"]) ||
      "";

    // titleから会社名を推測（"株式会社〇〇 | ..." や "〇〇税理士事務所 - ..."）
    if (!companyName && title) {
      const cleaned = title
        .split(/\s*[\|｜\-－–—]\s*/)[0]
        .replace(/(のホームページ|公式サイト|公式|ホーム|HOME|TOP)$/i, "")
        .trim();
      // 会社・事務所っぽい名前なら採用
      if (
        /(株式会社|合同会社|有限会社|事務所|法人|法律|税理士|社労士|行政書士|司法書士|弁護士|コンサルティング|コンサル)/.test(
          cleaned
        ) &&
        cleaned.length <= 40
      ) {
        companyName = cleaned;
      }
    }

    // --- address ---
    let address =
      $('[itemprop="address"]').first().text().trim().replace(/\s+/g, " ") ||
      $('[itemtype*="PostalAddress"]').first().text().trim().replace(/\s+/g, " ") ||
      extractLabelValue($, ["所在地", "住所", "事務所所在地", "本社所在地", "所在"]) ||
      "";

    if (!address) {
      // bodyTextから都道府県パターンで住所を抽出
      const addrMatch = bodyText.match(
        /〒?\d{3}[-ー]\d{4}\s*[^\d]*?(東京都|北海道|(?:京都|大阪)府|.{2,3}県)[^\n,、。（）()]{4,40}/
      );
      if (addrMatch) {
        address = addrMatch[0].trim();
      } else {
        const prefMatch = bodyText.match(
          /(東京都|北海道|(?:京都|大阪)府|.{2,3}県)[\u3000-\u9FFF\w\d－ー\-]+?[0-9０-９]+[^\n,、。（）()]{0,20}/
        );
        if (prefMatch) {
          address = prefMatch[0].trim().substring(0, 60);
        }
      }
    }

    // --- postalCode ---
    let postalCode = "";
    // addressから抽出
    const postalInAddr = address.match(/〒?\s*(\d{3}[-ー]\d{4})/);
    if (postalInAddr) {
      postalCode = postalInAddr[1].replace("ー", "-");
    }
    if (!postalCode) {
      const postalMatch = bodyText.match(/〒\s*(\d{3}[-ー]\d{4})/);
      if (postalMatch) {
        postalCode = postalMatch[1].replace("ー", "-");
      }
    }
    // addressから郵便番号部分を削除してクリーンアップ
    if (postalCode && address) {
      address = address.replace(/〒?\s*\d{3}[-ー]\d{4}\s*/, "").trim();
    }

    // --- phone ---
    let phone =
      $('[itemprop="telephone"]').first().text().trim() ||
      $('a[href^="tel:"]').first().text().trim() ||
      "";

    if (!phone) {
      // tel:リンクのhrefから
      const telHref = $('a[href^="tel:"]').first().attr("href");
      if (telHref) {
        phone = telHref.replace("tel:", "").replace(/[^\d-+]/g, "");
      }
    }
    if (!phone) {
      phone =
        extractLabelValue($, ["電話番号", "TEL", "電話", "Tel", "Phone"]) || "";
    }
    if (!phone) {
      // 本文から電話番号パターン（市外局番 + 市内局番 + 番号）
      const phoneMatch = bodyText.match(
        /(?:TEL|Tel|電話|電話番号|℡)\s*[:：]?\s*(0\d{1,4}[-ー（(]\d{1,4}[-ー）)]\d{2,4})/
      );
      if (phoneMatch) {
        phone = phoneMatch[1].replace(/[ー（）]/g, (c) =>
          c === "ー" ? "-" : c === "（" ? "(" : ")"
        );
      }
    }
    if (!phone) {
      // ラベルなしでも一般的な電話番号パターン
      const phoneMatch2 = bodyText.match(
        /0\d{1,4}-\d{1,4}-\d{2,4}/
      );
      if (phoneMatch2) {
        phone = phoneMatch2[0];
      }
    }

    // --- email ---
    let email =
      $('[itemprop="email"]').first().text().trim() ||
      "";

    if (!email) {
      const mailtoHref = $('a[href^="mailto:"]').first().attr("href");
      if (mailtoHref) {
        email = mailtoHref.replace("mailto:", "").split("?")[0];
      }
    }
    if (!email) {
      email =
        extractLabelValue($, [
          "メールアドレス",
          "E-?mail",
          "メール",
          "Mail",
          "EMAIL",
        ]) || "";
    }
    if (!email) {
      // 本文からメールアドレスパターン
      const emailMatch = bodyText.match(
        /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/
      );
      if (emailMatch) {
        // ありがちな画像ファイル拡張子は除外
        if (!/\.(png|jpg|gif|svg|webp)$/i.test(emailMatch[0])) {
          email = emailMatch[0];
        }
      }
    }

    // --- representative ---
    const representative =
      extractLabelValue($, [
        "代表者",
        "代表",
        "代表取締役",
        "所長",
        "代表社員",
        "代表弁護士",
        "代表税理士",
      ]) || "";

    return NextResponse.json({
      title,
      description,
      companyName,
      address,
      postalCode,
      phone,
      email,
      representative,
      url: parsedUrl.toString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "スクレイピングに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
