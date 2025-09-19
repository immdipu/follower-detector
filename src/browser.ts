import { Browser, BrowserContext, chromium, Page } from "playwright";
import * as fs from "fs";
import { LoginOptions } from "./types";

export type BrowserHandles = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

export async function initBrowser(options: LoginOptions): Promise<BrowserHandles> {
  const browser = await chromium.launch({
    headless: options.headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--mute-audio",
      "--disable-audio",
      "--no-audio",
    ],
  });

  const contextOptions: any = {
    viewport: { width: 1600, height: 980 },
  };

  if (options.authFile && fs.existsSync(options.authFile)) {
    contextOptions.storageState = options.authFile;
    console.log("📁 Using existing auth.json for browser context");
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return { browser, context, page };
}

export async function closeBrowser(browser?: Browser): Promise<void> {
  if (browser) {
    await browser.close();
  }
}
