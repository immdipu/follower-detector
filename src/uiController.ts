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
  public async clickFollowUser(username: string): Promise<boolean> {
    try {
      console.log(`🔍 Looking for user: ${username}`);

      // Look for the user in the current page
      // This could be in a room, user list, or search results
      const userElement = await this.findUserElement(username);

      if (!userElement) {
        console.log(`❌ User ${username} not found on current page`);
        return false;
      }

      // Look for follow button near the user
      const followButton = await this.findFollowButton(userElement);

      if (!followButton) {
        console.log(`❌ Follow button not found for ${username}`);
        return false;
      }

      console.log(`👆 Clicking follow button for ${username}`);
      await followButton.click();
      await waitFor(1); // Wait for API call to complete

      return true;
    } catch (error) {
      console.error(`❌ Error clicking follow for ${username}:`, error);
      return false;
    }
  }

  /**
   * Find and click unfollow button for a user
   */
  public async clickUnfollowUser(username: string): Promise<boolean> {
    try {
      console.log(`🔍 Looking for unfollow button for: ${username}`);

      const userElement = await this.findUserElement(username);

      if (!userElement) {
        console.log(`❌ User ${username} not found on current page`);
        return false;
      }

      // Look for unfollow button (might be "Following" or "Unfollow")
      const unfollowButton = await this.findUnfollowButton(userElement);

      if (!unfollowButton) {
        console.log(`❌ Unfollow button not found for ${username}`);
        return false;
      }

      console.log(`👆 Clicking unfollow button for ${username}`);
      await unfollowButton.click();
      await waitFor(1); // Wait for API call to complete

      return true;
    } catch (error) {
      console.error(`❌ Error clicking unfollow for ${username}:`, error);
      return false;
    }
  }

  /**
   * Find user element on the page by username
   */
  private async findUserElement(username: string) {
    // Try different selectors where usernames might appear
    const selectors = [
      `text="${username}"`,
      `[title="${username}"]`,
      `[alt="${username}"]`,
      `*:has-text("${username}")`,
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          console.log(`✅ Found user ${username} with selector: ${selector}`);
          return element;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return null;
  }

  /**
   * Find follow button near a user element
   */
  private async findFollowButton(userElement: any) {
    // Common follow button selectors
    const followSelectors = [
      'button:has-text("Follow")',
      'button:has-text("follow")',
      ".follow-btn",
      ".btn-follow",
      '[data-action="follow"]',
      'button[aria-label*="follow"]',
      'button[title*="follow"]',
    ];

    // First try to find follow button in the same container as user
    const container = await userElement.locator("..").first(); // Parent container

    for (const selector of followSelectors) {
      try {
        const button = await container.$(selector);
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            console.log(`✅ Found follow button with selector: ${selector}`);
            return button;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // If not found in container, search the whole page
    for (const selector of followSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            console.log(
              `✅ Found follow button (page-wide) with selector: ${selector}`
            );
            return button;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return null;
  }

  /**
   * Find unfollow button near a user element
   */
  private async findUnfollowButton(userElement: any) {
    // Common unfollow button selectors
    const unfollowSelectors = [
      'button:has-text("Unfollow")',
      'button:has-text("unfollow")',
      'button:has-text("Following")',
      'button:has-text("following")',
      ".unfollow-btn",
      ".btn-unfollow",
      ".following-btn",
      '[data-action="unfollow"]',
      'button[aria-label*="unfollow"]',
      'button[title*="unfollow"]',
    ];

    // First try to find unfollow button in the same container as user
    const container = await userElement.locator("..").first(); // Parent container

    for (const selector of unfollowSelectors) {
      try {
        const button = await container.$(selector);
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            console.log(`✅ Found unfollow button with selector: ${selector}`);
            return button;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // If not found in container, search the whole page
    for (const selector of unfollowSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            console.log(
              `✅ Found unfollow button (page-wide) with selector: ${selector}`
            );
            return button;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return null;
  }

  /**
   * Navigate to a specific user's profile
   */
  public async goToUserProfile(userId: string): Promise<boolean> {
    try {
      const profileUrl = `https://www.free4talk.com/profile/${userId}`;
      console.log(`🌐 Navigating to profile: ${profileUrl}`);

      await this.page.goto(profileUrl, { waitUntil: "networkidle" });
      await waitFor(2);

      return true;
    } catch (error) {
      console.error(`❌ Error navigating to profile ${userId}:`, error);
      return false;
    }
  }

  /**
   * Go to a room where we can find users
   */
  public async goToRoom(roomUrl?: string): Promise<boolean> {
    try {
      const targetUrl = roomUrl || "https://www.free4talk.com/rooms";
      console.log(`🌐 Navigating to: ${targetUrl}`);

      await this.page.goto(targetUrl, { waitUntil: "networkidle" });
      await waitFor(3);

      return true;
    } catch (error) {
      console.error(`❌ Error navigating to room:`, error);
      return false;
    }
  }

  /**
   * Get list of visible users on current page
   */
  public async getVisibleUsers(): Promise<string[]> {
    try {
      // This is a generic approach - might need to be customized based on Free4Talk's UI
      const userElements = await this.page.$$(
        "[data-user], .user-item, .participant"
      );

      const usernames: string[] = [];

      for (const element of userElements) {
        try {
          const username = await element.textContent();
          if (username && username.trim()) {
            usernames.push(username.trim());
          }
        } catch (error) {
          // Skip this element
        }
      }

      console.log(`👥 Found ${usernames.length} visible users`);
      return usernames;
    } catch (error) {
      console.error("❌ Error getting visible users:", error);
      return [];
    }
  }
}
