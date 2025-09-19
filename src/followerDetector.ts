import { Page } from 'playwright';
import { DataStorage } from './dataStorage';
import { FollowerDetectionResult, Participant } from './types';
import { waitFor } from './utils';
import { Login } from './login';
import { UIController } from './uiController';

export class FollowerDetector {
  private page: Page;
  private dataStorage: DataStorage;
  private login: Login;
  private uiController: UIController;
  private isRunning: boolean = false;

  constructor(page: Page, dataStorage: DataStorage, login: Login) {
    this.page = page;
    this.dataStorage = dataStorage;
    this.login = login;
    this.uiController = new UIController(page);
  }

  /**
   * Initialize by getting the initial friends list
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing follower detector...');
    

    // Get initial friends list
    const initialFriends = await this.getFriendsList();
    this.dataStorage.setInitialFriends(initialFriends);
    
    console.log('✅ Follower detector initialized');
  }

  /**
   * Start detecting followers from a list of users
   */
  public async detectFollowers(users: Participant[]): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Follower detection already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting follower detection for ${users.length} users...`);
    console.log(`🔍 Debug: detectFollowers called with ${users.length} users`);

    // Store user data for later reference
    this.dataStorage.storeUserData(users);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      console.log(`\n👤 Processing user ${i + 1}/${users.length}: ${user.name} (${user.id})`);
      
      // Skip if it's an initial friend (don't want to unfollow real friends)
      if (this.dataStorage.isInitialFriend(user.id)) {
        console.log('⏭️ Skipping initial friend');
        continue;
      }

      try {
        await this.checkIfFollowsBack(user);
        
        // Wait between requests to avoid rate limiting
        if (i < users.length - 1) {
          console.log('⏳ Waiting before next user...');
          await waitFor(3); // 3 seconds between requests
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.name}:`, error);
        continue;
      }
    }

    this.isRunning = false;
    console.log('\n✅ Follower detection completed!');
    this.dataStorage.exportResults();
  }

  /**
   * Check if a user follows you back by clicking follow/unfollow buttons
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
      timestamp: new Date().toISOString()
    };

    try {
      // Step 1: Navigate to user's profile or find them in current view
      console.log(`🌐 Looking for ${user.name} to follow...`);
      
      // Try to go to their profile first
      const profileSuccess = await this.uiController.goToUserProfile(user.id);
      
      if (!profileSuccess) {
        console.log(`⚠️ Couldn't navigate to ${user.name}'s profile, trying to find them on current page`);
      }

      // Step 2: Click follow button
      console.log(`👆 Clicking follow button for ${user.name}...`);
      const followSuccess = await this.uiController.clickFollowUser(user.name);
      
      if (!followSuccess) {
        console.error(`❌ Failed to click follow for ${user.name}`);
        result.followSuccess = false;
        this.dataStorage.addDetectedFollower(result);
        return;
      }
      
      result.followSuccess = true;
      console.log(`✅ Successfully clicked follow for ${user.name}`);
      
      // Wait a bit for the follow to process
      await waitFor(3);

      // Step 3: Get updated friends list via API (this still works)
      console.log('📥 Checking friends list...');
      const currentFriends = await this.getFriendsList();
      this.dataStorage.updateCurrentFriends(currentFriends);

      // Step 4: Check if user is now in friends list (means they follow back)
      const isNowFriend = currentFriends.includes(user.id);
      
      if (isNowFriend) {
        result.followsYouBack = true;
        console.log(`🎉 ${user.name} follows you back!`);
      } else {
        console.log(`❌ ${user.name} does not follow back`);
      }

      // Step 5: ALWAYS try to unfollow (critical for staying under 100 follows limit)
      console.log(`👆 Clicking unfollow button for ${user.name}...`);
      const unfollowSuccess = await this.uiController.clickUnfollowUser(user.name);
      
      if (unfollowSuccess) {
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
          error: 'Failed to click unfollow button'
        });
      }

      // Store the result
      this.dataStorage.addDetectedFollower(result);

    } catch (error) {
      console.error(`❌ Error checking ${user.name}:`, error);
      this.dataStorage.addDetectedFollower(result);
    }
  }

  /**
   * Follow a user using the API
   */
  private async followUser(userId: string): Promise<void> {
    const requestBody = this.login.getPayloadForUser(userId);

    const response = await this.page.evaluate(async ({ body, url }) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'Referer': 'https://www.free4talk.com/',
        },
        body: JSON.stringify(body)
      });
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        responseData = await response.text();
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      };
    }, {
      body: requestBody,
      url: `https://identity.free4talk.com/identity/post/follow/?a=identity-post-follow&v=537-1&t=${Date.now()}`
    });

    if (response.status !== 200) {
      console.error(`❌ Follow API Error:`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        userId: userId
      });
      throw new Error(`Follow request failed: ${response.status} ${response.statusText} - ${JSON.stringify(response.data)}`);
    }

    console.log(`✅ Follow request successful: ${response.status}`);
  }

  /**
   * Unfollow a user using the API
   */
  private async unfollowUser(userId: string): Promise<void> {
    const requestBody = this.login.getPayloadForUser(userId);

    const response = await this.page.evaluate(async ({ body, url }) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'Referer': 'https://www.free4talk.com/',
        },
        body: JSON.stringify(body)
      });
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        responseData = await response.text();
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      };
    }, {
      body: requestBody,
      url: `https://identity.free4talk.com/identity/post/unfollow/?a=identity-post-unfollow&v=537-1&t=${Date.now()}`
    });

    if (response.status !== 200) {
      console.error(`❌ Unfollow API Error:`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        userId: userId
      });
      throw new Error(`Unfollow request failed: ${response.status} ${response.statusText} - ${JSON.stringify(response.data)}`);
    }

    console.log(`✅ Unfollow request successful: ${response.status}`);
  }

  /**
   * Get current friends list using the relationships API
   */
  private async getFriendsList(): Promise<string[]> {
    // For relationships, use the captured payload but with empty body
    const basePayload = this.login.getPayloadForUser('temp');
    const requestBody = {
      token: basePayload.token,
      body: {},
      _: basePayload._
    };

    const response = await this.page.evaluate(async ({ body, url }) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'Referer': 'https://www.free4talk.com/',
        },
        body: JSON.stringify(body)
      });
      
      return {
        status: response.status,
        data: await response.json()
      };
    }, {
      body: requestBody,
      url: `https://identity.free4talk.com/identity/get/relationships/?a=identity-get-relationships&v=537-1&t=${Date.now()}`
    });

    if (response.status !== 200) {
      throw new Error(`Relationships request failed: ${response.status}`);
    }

    const friendIds = response.data.data?.friends || [];
    console.log(`📊 Current friends count: ${friendIds.length}`);
    
    return friendIds;
  }


  /**
   * Stop the detection process
   */
  public stop(): void {
    this.isRunning = false;
    console.log('🛑 Follower detection stopped');
  }

  /**
   * Get detection status
   */
  public getStatus(): { running: boolean; hasPayload: boolean } {
    return {
      running: this.isRunning,
      hasPayload: this.login.hasPayload()
    };
  }
}
