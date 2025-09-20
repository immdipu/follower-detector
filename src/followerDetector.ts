import { Page, BrowserContext } from "playwright";
import { DataStorage } from "./dataStorage";
import { FollowerDetectionResult, Participant } from "./types";
import { waitFor } from "./utils";
import { Login } from "./login";
import { UIController } from "./uiController";
import { FollowEventSystem } from "./eventSystem";
import { APIInterceptor } from "./apiInterceptor";
import { WindowManager } from "./windowManager";

export class FollowerDetector {
  private page: Page;
  private context: BrowserContext;
  private dataStorage: DataStorage;
  private login: Login;
  private uiController: UIController;
  private eventSystem: FollowEventSystem;
  private apiInterceptor: APIInterceptor;
  private windowManager: WindowManager;
  private isRunning: boolean = false;
  private f4tURL: string;

  constructor(
    page: Page,
    context: BrowserContext,
    dataStorage: DataStorage,
    login: Login,
    f4tURL: string
  ) {
    this.page = page;
    this.context = context;
    this.dataStorage = dataStorage;
    this.login = login;
    this.f4tURL = f4tURL;
    this.uiController = new UIController(page);
    this.eventSystem = new FollowEventSystem();
    this.apiInterceptor = new APIInterceptor(
      page,
      context,
      this.eventSystem,
      this.dataStorage
    );
    this.windowManager = new WindowManager(context, this.eventSystem);
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for coordinating the follow/unfollow process
   */
  private setupEventListeners(): void {
    // Listen for friends list updates
    this.eventSystem.onFriendsListReceived((friends: string[]) => {
      this.dataStorage.updateCurrentFriends(friends);
      console.log(`📋 Friends list updated: ${friends.length} friends`);
    });

    // Listen for follow completion to trigger friends list refresh
    // this.eventSystem.onFollowCompleted(async (userId: string, success: boolean) => {
    //   if (success) {
    //     await this.refreshFriendsList();
    //   }
    // });

    // Listen for unfollow completion
    this.eventSystem.onUnfollowCompleted((userId: string, success: boolean) => {
      console.log(
        `${success ? "✅" : "❌"} Unfollow ${success ? "completed" : "failed"
        } for ${userId}`
      );
    });
  }

  public async initialize(): Promise<void> {
    console.log("🚀 Initializing follower detector...");
    await this.apiInterceptor.startIntercepting();

    console.log("✅ Follower detector initialized");
  }

  /**
   * Start detecting followers from a list of users
   */
  public async detectFollowers(users: Participant[]): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Follower detection already running");
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting follower detection for ${users.length} users...`);
    console.log(`🔍 Debug: detectFollowers called with ${users.length} users`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      if (this.dataStorage.isCompletedUser(user.id)) {
        console.log("⏭️ Skipping completed user");
        continue;
      }

      // Skip if it's an initial friend (don't want to unfollow real friends)
      if (this.dataStorage.isInitialFriend(user.id)) {
        console.log("⏭️ Skipping initial friend");
        continue;
      }

      console.log(
        `\n👤 Processing user ${i + 1}/${users.length}: ${user.name} (${user.id})`
      );

      try {
        await this.checkIfFollowsBack(user);

        // Wait between requests to avoid rate limiting
        if (i < users.length - 1) {
          console.log("⏳ Waiting before next user...");
          await waitFor(3); // 3 seconds between requests
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.name}:`, error);
        continue;
      } finally {
        this.dataStorage.addCompletedUser(user.id);
      }
    }

    this.isRunning = false;
    console.log("\n✅ Follower detection completed!");

    // Show summary
    const summary = this.dataStorage.getSummary();
    console.log(
      `📊 Summary: ${summary.totalFollowers} followers detected, ${summary.currentFriends} current friends`
    );
    console.log(
      `📁 Results saved to: ${this.dataStorage.getDetectedFollowers().length > 0
        ? "follower-data-followers.json"
        : "No followers found"
      }`
    );
    console.log(`📋 Friends list saved to: follower-data-friends.json`);
  }

  /**
   * Check if a user follows you back using the new intercept-based approach
   */
  private async checkIfFollowsBack(user: Participant): Promise<void> {
    const result: FollowerDetectionResult = {
      userId: user.id,
      username: user.name,
      avatar: user.avatar,
      followers: user.followers,
      following: user.following,
      friends: user.friends,
      supporter: user.supporter,
      isVerified: user.isVerified,
      followsYouBack: false,
      followSuccess: false,
      unfollowSuccess: false,
      timestamp: new Date().toISOString(),
    };

    try {
      // Step 1: Set target user ID for interception
      this.apiInterceptor.setTargetUserId(user.id);

      // Step 2: Click follow button (will be intercepted and modified)
      console.log(`👆 Clicking follow button for ${user.name}...`);
      const followClicked = await this.uiController.clickFollowUser();

      if (!followClicked) {
        console.error(`❌ Failed to click follow button for ${user.name}`);
        return;
      }

      // Wait for the follow request to complete
      await this.waitForFollowCompletion(user.id, user.name);
      result.followSuccess = true;
      console.log(`✅ Follow request completed for ${user.name}`);

      // Step 3: Wait a bit for the system to process
      await waitFor(2);

      // Step 4: Check current friends list (should be updated via events)
      const currentFriends = this.dataStorage.getCurrentFriends();
      const isNowFriend = currentFriends.includes(user.id);

      if (isNowFriend) {
        result.followsYouBack = true;
        console.log(`🎉 ${user.name} follows you back!`);
      } else {
        console.log(`❌ ${user.name} does not follow back`);
      }

      // Step 5: ALWAYS unfollow (critical for staying under 100 follows limit)
      console.log(`👆 Clicking unfollow button for ${user.name}...`);

      // The button should now show "Follow" again, so we click it to unfollow
      APIInterceptor.Action = "unfollow";
      const unfollowClicked = await this.uiController.clickFollowUser();

      if (unfollowClicked) {
        // Wait for unfollow to complete
        await this.waitForUnfollowCompletion(user.id);
        result.unfollowSuccess = true;
        console.log(`✅ Successfully unfollowed ${user.name}`);
        await waitFor(2);
      } else {
        result.unfollowSuccess = false;
        console.error(`❌ CRITICAL: Failed to unfollow ${user.name} via UI`);

        // Track failed unfollow separately for manual cleanup
        this.dataStorage.addFailedUnfollow({
          userId: user.id,
          username: user.name,
          avatar: user.avatar,
          followers: user.followers,
          following: user.following,
          friends: user.friends,
          supporter: user.supporter,
          isVerified: user.isVerified,
          timestamp: new Date().toISOString(),
          error: "Failed to click unfollow button",
        });
      }

      // Clear target user ID
      this.apiInterceptor.clearTargetUserId();

      // Store the result
      this.dataStorage.addDetectedFollower(result);
    } catch (error) {
      console.error(`❌ Error checking ${user.name}:`, error);
      this.apiInterceptor.clearTargetUserId();
      this.dataStorage.addDetectedFollower(result);
    }
  }

  /**
   * Wait for follow completion event
   */
  private async waitForFollowCompletion(userId: string, username:string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Follow completion timeout for user: ${userId} (${username})`));
      }, 10000); // 10 second timeout

      this.eventSystem.onFollowCompleted(
        (completedUserId: string, success: boolean) => {
          if (completedUserId === userId) {
            clearTimeout(timeout);
            if (success) {
              resolve();
            } else {
              reject(new Error(`Follow failed for user ${userId} (${username})`));
            }
          }
        }
      );
    });
  }

  /**
   * Wait for unfollow completion event
   */
  private async waitForUnfollowCompletion(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Unfollow completion timeout for user ${userId}`));
      }, 10000); // 10 second timeout

      this.eventSystem.onUnfollowCompleted(
        (completedUserId: string, success: boolean) => {
          if (completedUserId === userId) {
            clearTimeout(timeout);
            if (success) {
              resolve();
            } else {
              reject(new Error(`Unfollow failed for user ${userId}`));
            }
          }
        }
      );
    });
  }


  private waitForNewFriendsListUpdate(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentFriends = this.dataStorage.getCurrentFriends();
        if (currentFriends.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000); // Check every second
    });
  }


  /**
   * Refresh friends list by reloading the friends list window
   */
  private async refreshFriendsList(): Promise<void> {
    try {
      if (!this.windowManager.hasFriendsListWindow()) {
        await this.windowManager.openFriendsListWindow(this.f4tURL);
      }

      await this.windowManager.reloadFriendsListWindow();
      console.log("✅ Friends list refreshed");
    } catch (error) {
      console.error("❌ Error refreshing friends list:", error);
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log("🛑 Stopping follower detection...");

    // Stop API interception
    await this.apiInterceptor.stopIntercepting();

    // Close all windows
    await this.windowManager.closeAllWindows();

    console.log("✅ Follower detection stopped and resources cleaned up");
  }

  /**
   * Get detection status
   */
  public getStatus(): {
    running: boolean;
    hasPayload: boolean;
    intercepting: boolean;
    windowCount: number;
    hasFriendsWindow: boolean;
  } {
    const interceptorStatus = this.apiInterceptor.getStatus();
    return {
      running: this.isRunning,
      hasPayload: this.login.hasPayload(),
      intercepting: interceptorStatus.intercepting,
      windowCount: this.windowManager.getWindowCount(),
      hasFriendsWindow: this.windowManager.hasFriendsListWindow(),
    };
  }
}
