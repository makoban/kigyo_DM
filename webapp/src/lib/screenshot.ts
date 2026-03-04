import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// A4 at 96 CSS DPI
const CSS_WIDTH = 794; // 210mm
const CSS_HEIGHT = 1123; // 297mm
const SCALE = 2.08; // → ~200 real DPI (1652×2336px output)

export async function takeScreenshot(url: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    defaultViewport: {
      width: CSS_WIDTH,
      height: CSS_HEIGHT,
      deviceScaleFactor: SCALE,
    },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
    const buf = await page.screenshot({ type: "jpeg", quality: 85, fullPage: false });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}
