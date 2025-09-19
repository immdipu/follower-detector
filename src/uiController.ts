import { Page } from "playwright";
import { waitFor } from "./utils";
import { loginOptions } from "./config";

export class UIController {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async openUserProfile(username: string): Promise<boolean> {
    try {
      await this.page.evaluate(async () => {
        window.scrollTo(0, document.body.scrollHeight - 1900);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      });

      await this.page.waitForSelector(`button[aria-label="${username}"]`, { state: 'visible', timeout: 10000 });
      await this.page.hover(`button[aria-label="${username}"]`);
      await waitFor(1);
      await this.page.click(`button[aria-label="${username}"]`);

      return true;
    } catch (error) {
      console.error(`❌ Error opening user profile ${username}:`, error);
      return false;
    }
  }

  /**
   * Find and click on a user's profile/follow button
   */
  public async clickFollowUser(): Promise<boolean> {
    try {
      const followButton = this.page.locator(".ant-modal-body button:has-text('Follow')").first();
      if (!followButton) {
        console.log(`❌ Follow button not found`);
        return false;
      }

      await followButton.click();
      await waitFor(1);
      return true;
    } catch (error) {
      console.error(`❌ Error clicking follow button`, error);
      return false;
    }
  }

  /**
   * Find and click unfollow button for a user
   */
  public async clickUnfollowUser(username: string): Promise<boolean> {
    try {
      const followButton = this.page.locator(".ant-modal-body button:has-text('Follow')").first();
      if (!followButton) {
        console.log(`❌ Follow button not found`);
        return false;
      }

      await followButton.click();
      await waitFor(1);
      return true;
    } catch (error) {
      console.error(`❌ Error clicking follow button`, error);
      return false;
    }
  }

}
