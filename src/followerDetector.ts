import { Page, BrowserContext } from "playwright";
import { DataStorage } from "./dataStorage";
import { FollowerDetectionResult, Participant } from "./types";
import { waitFor } from "./utils";
import { Login } from "./login";
import { UIController } from "./uiController";
import { FollowEventSystem } from "./eventSystem";
import { APIInterceptor } from "./apiInterceptor";
import { EventEmitter } from "stream";
import { loginOptions } from "./config";

export class FollowerDetector extends EventEmitter {
  private dataStorage: DataStorage;
  private uiController: UIController;
  private eventSystem: FollowEventSystem;
  private apiInterceptor: APIInterceptor;
  private isRunning: boolean = false;
  private f4tURL: string;

  constructor(
    page: Page,
    context: BrowserContext,
    dataStorage: DataStorage,
    login: Login,
    f4tURL: string
  ) {
    super();
    this.dataStorage = dataStorage;
    this.f4tURL = f4tURL;
    this.uiController = new UIController(page);
    this.eventSystem = new FollowEventSystem();
    this.apiInterceptor = new APIInterceptor(
      page,
      this.eventSystem,
      this.dataStorage
    );
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for coordinating the follow/unfollow process
   */
  private setupEventListeners(): void {
    this.eventSystem.onFriendsListReceived((friends: string[]) => {
      this.dataStorage.updateCurrentFriends(friends);
    });

    this.eventSystem.onUnfollowCompleted((userId: string, success: boolean) => {
      console.log(
        `${success ? "✅" : "❌"} Unfollow ${success ? "completed" : "failed"
        } for ${userId}`
      );
    });
  }

  public async initialize(): Promise<void> {
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

      if (this.dataStorage.isInitialFriend(user.id)) {
        console.log(`⏭️ Skipping initial friend ${user.name}`);
        continue;
      }

      console.log(
        `\n👤 Processing user ${i + 1}/${users.length}: ${user.name} (${user.id
        })`
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

      // Step 2: Set up event listener BEFORE making the request
      const followPromise = this.waitForFollowCompletion(user.id, user.name);

      // Also wait for friends list update after follow
      const friendsListUpdatePromise = this.waitForNewFriendsListUpdate();

      // Step 3: Click follow button (will be intercepted and modified)
      const followClicked = await this.uiController.clickFollowUser();
      if (!followClicked) {
        console.error(`❌ Failed to click follow button for ${user.name}`);
        return;
      }

      try {
        const followSuccess = await followPromise;

        result.followSuccess = followSuccess;

        if (followSuccess) {
          if (loginOptions.DEBUG_MODE) {
          console.log(`✅ Follow request completed for ${user.name}`);
          }
          
        } else {
          console.log(`❌ Follow request failed for ${user.name}`);
        }
      } catch (followError: any) {
        result.followSuccess = false;
        console.error(`❌ Follow request timeout for ${user.name}:`, followError.message);
      }

      // Only check if follows back if the follow request was successful
      if (result.followSuccess) {
        await friendsListUpdatePromise;
        await waitFor(2); // Wait a bit to ensure friends list is updated

        const currentFriends = this.dataStorage.getCurrentFriends();
        const isNowFriend = currentFriends.includes(user.id);

        if (isNowFriend) {
          result.followsYouBack = true;
          console.log("----------------------------------------------------");
          console.log(`🎉 ${user.name} follows you back!`);
          console.log("----------------------------------------------------");
        } else {
          console.log("----------------------------------------------------");
          console.log(`❌ ${user.name} does not follow back - not saved`);
          console.log("----------------------------------------------------");
        }
      } else {
        console.log(`⚠️ Skipping follow-back check for ${user.name} due to failed follow request`);
      }

      // Step 5: Only unfollow if follow was successful (no point unfollowing if follow failed)
      if (result.followSuccess) {
        const unfollowPromise = this.waitForUnfollowCompletion(user.id);

        // Set action to unfollow for interception (this is important for the interceptor to know that we are unfollowing)
        APIInterceptor.Action = "unfollow";

        const unfollowClicked = await this.uiController.clickFollowUser();
        if (unfollowClicked) {
          try {
            const unfollowSuccess = await unfollowPromise;
            result.unfollowSuccess = unfollowSuccess;
            if (unfollowSuccess) {
              if (loginOptions.DEBUG_MODE) {
                console.log(`✅ Successfully unfollowed ${user.name}`);
              }
            } else {
              console.log(`❌ Unfollow request failed for ${user.name}`);
            }
          } catch (unfollowError: any) {
            result.unfollowSuccess = false;
            console.error(`❌ Unfollow request timeout for ${user.name}:`, unfollowError.message);
          }
        } else {
          result.unfollowSuccess = false;
          console.error(`❌ CRITICAL: Failed to unfollow ${user.name} via UI`);
        }
      } else {
        console.log(`⚠️ Skipping unfollow for ${user.name} since follow request failed`);
        result.unfollowSuccess = true; // Set to true since no unfollow was needed
      }
    } catch (error) {
      console.error(`❌ Error checking ${user.name}:`, error);
    } finally {
      this.apiInterceptor.clearTargetUserId();
      this.dataStorage.addDetectedFollower(result);
      APIInterceptor.Action = "follow";
    }
  }

  /**
   * Wait for follow completion event
   */
  private async waitForFollowCompletion(
    userId: string,
    username: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let listenerRemoved = false;

      const timeout = setTimeout(() => {
        if (!listenerRemoved) {
          // Remove the listener to prevent memory leaks
          this.eventSystem.removeAllListeners('follow-completed');
          listenerRemoved = true;
        }
        reject(
          new Error(
            `Follow completion timeout for user: ${userId} (${username})`
          )
        );
      }, 10000); // 10 second timeout

      const handleFollowCompleted = (completedUserId: string, success: boolean) => {
        if (completedUserId === userId && !listenerRemoved) {
          clearTimeout(timeout);
          // Remove the listener immediately after use
          this.eventSystem.removeListener('follow-completed', handleFollowCompleted);
          listenerRemoved = true;

          if (success) {
            if (loginOptions.DEBUG_MODE) {
              console.log(`📣 Debug: Follow completed event received for ${userId} (${username}) with success: ${success}`);
            }
          } else {
            console.log(
              `❌ Follow completion failed for ${userId} (${username})`
            );
          }
          // Resolve with the success status
          resolve(success);
        }
      };

      this.eventSystem.onFollowCompleted(handleFollowCompleted);
    });
  }

  /**
   * Wait for unfollow completion event
   */
  private async waitForUnfollowCompletion(userId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let listenerRemoved = false;

      const timeout = setTimeout(() => {
        if (!listenerRemoved) {
          this.eventSystem.removeAllListeners('unfollow-completed');
          listenerRemoved = true;
        }
        reject(new Error(`Unfollow completion timeout for user ${userId}`));
      }, 10000);

      const handleUnfollowCompleted = (completedUserId: string, success: boolean) => {
        if (completedUserId === userId && !listenerRemoved) {
          clearTimeout(timeout);
          this.eventSystem.removeListener('unfollow-completed', handleUnfollowCompleted);
          listenerRemoved = true;
          if (success) {
            if (loginOptions.DEBUG_MODE) {
              console.log(`✅ Unfollow completion confirmed for ${userId}`);
            }
          } else {
            console.log(`❌ Unfollow completion failed for ${userId}`);
          }
          // Resolve with the success status
          resolve(success);
        }
      };

      this.eventSystem.onUnfollowCompleted(handleUnfollowCompleted);
    });
  }

  private waitForNewFriendsListUpdate(): Promise<void> {
    return new Promise((resolve) => {
      let listenerRemoved = false;
      const timeout = setTimeout(() => {
        if (!listenerRemoved) {
          this.eventSystem.removeAllListeners('friends-list-received');
          listenerRemoved = true;
        }
        resolve();
      }, 8000);

      const handleFriendsListReceived = (friends: string[]) => {
        clearTimeout(timeout);
        this.eventSystem.removeListener('friends-list-received', handleFriendsListReceived);
        listenerRemoved = true;

        if (loginOptions.DEBUG_MODE) {
          console.log(`🔄 Friends list updated with ${friends.length} friends`);
        }

        resolve();
      };

      this.eventSystem.onFriendsListReceived(handleFriendsListReceived);
    });
  }


  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log("🛑 Stopping follower detection...");

    // Stop API interception
    await this.apiInterceptor.stopIntercepting();

    console.log("✅ Follower detection stopped and resources cleaned up");
  }
}
