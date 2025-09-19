import { Page } from "playwright";

export async function waitForSelector(page: Page, selector: string, timeout: number = 600000) {
  await page.waitForSelector(selector, { timeout });
}

export async function waitFor(seconds: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res("ok");
    }, seconds * 1000);
  });
}

export async function gotoPage(page: Page, url: string) {
  return page.goto(url, { timeout: 120000 });
}

export function sanitizeURL(url: string): string {
  return url.split('?')[0].split('#')[0];
}
