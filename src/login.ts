import { BrowserContext, Page } from "playwright";
import * as fs from "fs";
import { LoginOptions, Room } from "./types";
import { gotoPage, waitFor, waitForSelector } from "./utils";
import { UserDataManager } from "./userDataManager";

export class Login {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: LoginOptions;
  private userDataManager: UserDataManager;
  private capturedPayload: any = null;

  constructor(options: LoginOptions, context: BrowserContext, page: Page) {
    this.options = options;
    this.userDataManager = new UserDataManager();
    this.context = context;
    this.page = page;
  }

  public async performLogin(): Promise<void> {
    if (!this.page) {
      throw new Error("Login not initialized. Call init() first.");
    }

    await this.setupNetworkInterception();

    if (fs.existsSync(this.options.authFile)) {
      console.log("✅ Found existing auth.json, skipping Google login");
      await this.f4tLoginWithAuth();
    } else {
      console.log("🔐 No auth.json found, performing full login");
      await this.googleLogin();
      waitFor(4);
      await this.f4tLogin();
    }
  }

  private async googleLogin(): Promise<void> {
    if (!this.page) return;

    await gotoPage(this.page, this.options.loginURL);

    await this.page.locator("css=input[type='email']").fill(this.options.email);
    await this.page.locator("css=button[type='button']").nth(2).click();

    await this.page
      .locator("css=input[type='password']")
      .fill(this.options.password);
    await this.page.locator("css=button[type='button']").nth(1).click();

    await this.page.waitForURL(`**/myaccount.google.com/**`, {
      timeout: 120000,
    });

    console.log("Google login successful");
  }

  private async f4tLogin(): Promise<void> {
    if (!this.page) return;

    console.log("f4tLogin", this.options.f4tURL);
    await gotoPage(this.page, this.options.f4tURL);
    await waitForSelector(this.page, ".ant-layout-header button");
    await this.handleAccountSelection();

    await waitForSelector(
      this.page,
      ".ant-layout-header .ant-dropdown-trigger"
    );
    await this.context!.storageState({ path: this.options.authFile });
  }

  private async f4tLoginWithAuth(): Promise<void> {
    if (!this.page) return;

    await gotoPage(this.page, this.options.f4tURL);

    await waitForSelector(
      this.page,
      ".ant-layout-header .ant-dropdown-trigger",
      10000
    );
    console.log("✅ Successfully logged in with stored auth");
  }

  private async handleContinueButton(page: Page): Promise<void> {
    try {
      const continueButton = await page.waitForSelector(
        'button[jsname="LgbsSe"]:has-text("Continue")',
        { timeout: 3000 }
      );
      if (continueButton) {
        console.log("Continue button found, clicking it...");
        await continueButton.click();
      }
    } catch {
      console.log("No continue button found, proceeding...");
    }
  }

  private async waitForPopupClose(popup: Page): Promise<void> {
    try {
      await popup.waitForEvent("close", { timeout: 5000 });
    } catch {
      console.log("Popup didn't close, might have redirected");
    }
  }

  private async handleAccountSelection(): Promise<void> {
    if (!this.page) return;

    const accountIdentifier =
      this.options.accountIdentifier || "immmdeep@gmail.com";

    const popupPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Popup timeout"));
      }, 10000);

      this.page!.context().on("page", async (popup) => {
        try {
          console.log("New popup detected, waiting for it to load...");
          await popup.waitForLoadState();

          const accountSelector = await popup.$(
            `[data-identifier="${accountIdentifier}"]`
          );
          if (accountSelector) {
            console.log(
              `Google account selection popup detected, selecting: ${accountIdentifier}`
            );
            await accountSelector.click();

            await this.handleContinueButton(popup);
            await this.waitForPopupClose(popup);

            clearTimeout(timeout);
            resolve();
          } else {
            console.log("Popup detected but not account selection");
          }
        } catch (error) {
          console.log("Error handling popup:", error);
          clearTimeout(timeout);
          reject(error);
        }
      });
    });

    // Click the login button
    await this.page.locator(".ant-layout-header button").click();

    try {
      await Promise.race([
        popupPromise,
        this.page.waitForSelector(".ant-layout-header .ant-dropdown-trigger", {
          timeout: 8000,
        }),
      ]);
    } catch (error) {
      console.log("No popup account selection needed or already logged in");
      await this.handleMainPageAccountSelection(accountIdentifier);
    }
  }

  private async handleMainPageAccountSelection(
    accountIdentifier: string
  ): Promise<void> {
    if (!this.page) return;

    try {
      const accountSelector = await this.page.$(
        `[data-identifier="${accountIdentifier}"]`
      );
      if (accountSelector) {
        console.log(
          `Account selection found in main page, selecting: ${accountIdentifier}`
        );
        await accountSelector.click();
        await this.handleContinueButton(this.page);
      }
    } catch (fallbackError) {
      console.log("No account selection found in main page either");
    }
  }

  private async setupNetworkInterception() {
    if (!this.page) return;

    this.page.on("response", async (response) => {
      const syncURLs = [
        "https://free4talk-sync.herokuapp.com/sync/get/free4talk/groups/",
        "https://free4talk.com/sync/get/free4talk/groups/",
        "https://sync.free4talk.com/sync/get/free4talk/groups/",
      ];

      const mainURL = response.url().split("?")[0];

      if (syncURLs.some((url) => mainURL.includes(url))) {
        if (response.status() !== 200) {
          console.error(
            "Failed to fetch groups:",
            response.status(),
            response.statusText()
          );
          return;
        }

        const data = await response.json();
        const roomsInfo = data.data;
        await this.userDataManager.writeUserData(roomsInfo);
      }

      // Log follow/unfollow API responses
      if (mainURL.includes("/identity/post/follow/")) {
        console.log(`📤 Follow API response: ${response.status()}`);
      }

      if (mainURL.includes("/identity/post/unfollow/")) {
        console.log(`📤 Unfollow API response: ${response.status()}`);
      }
    });

    // Also intercept requests to see follow/unfollow attempts and capture _ parameter
    this.page.on("request", async (request) => {
      const url = request.url();

      if (
        url.includes("/identity/post/follow/") ||
        url.includes("/identity/post/unfollow/")
      ) {
        const postData = request.postData();

        try {
          if (postData) {
            const data = JSON.parse(postData);
            const action = url.includes("follow/") ? "follow" : "unfollow";

            console.log(`🔍 ${action} request captured:`, {
              toId: data.body?.toId,
              hasToken: !!data.token,
              hasUnderscore: !!data._,
            });

            this.capturedPayload = data;
            console.log("✅ Payload captured and stored");
          }
        } catch (error) {
          console.log(
            `🔄 ${
              url.includes("follow/") ? "Follow" : "Unfollow"
            } request detected:`,
            url
          );
        }
      }
    });
  }

  public getPage(): Page | null {
    return this.page;
  }

  public getPayloadForUser(userId: string): any {
    if (!this.capturedPayload) {
      throw new Error(
        "No payload captured yet! Please follow someone manually first."
      );
    }

    const newPayload = { ...this.capturedPayload };
    newPayload.body = { ...this.capturedPayload.body, toId: userId };
    return newPayload;
  }

  public hasPayload(): boolean {
    return this.capturedPayload !== null;
  }

  public async close(): Promise<void> {
    try {
      await this.page?.close();
    } catch {}
    try {
      await this.context?.close();
    } catch {}
    this.context = null;
    this.page = null;
  }
}
