import * as fs from "fs";
import * as path from "path";
import {
  FollowerDetectionResult,
  DetectedFollower,
} from "./types";

export class DataStorage {
  private initialFriendsFile: string;
  private currentFriendsFile: string;
  private followersFile: string;
  private completedUsersFile: string;

  constructor() {
    this.initialFriendsFile = path.resolve(
      `./initial-friends.json`
    );
    this.currentFriendsFile = path.resolve(`./friends.json`);
    this.followersFile = path.resolve(`./followers.json`);
    this.completedUsersFile = path.resolve(`./completed-users.json`);
  }

  public setInitialFriends(friendIds: string[]): void {
    try {
      const initialFriendsData = {
        timestamp: new Date().toISOString(),
        count: friendIds.length,
        friends: friendIds,
        note: "Initial friends list - these users should NOT be unfollowed",
      };

      fs.writeFileSync(
        this.initialFriendsFile,
        JSON.stringify(initialFriendsData, null, 2)
      );
      console.log(`📝 Initial friends saved: ${friendIds.length} friends`);
      this.updateCurrentFriends(friendIds);
    } catch (error) {
      console.error("❌ Error saving initial friends:", error);
    }
  }

  /**
   * Update current friends list (updates frequently)
   */
  public updateCurrentFriends(friendIds: string[]): void {
    try {
      const friendsData = {
        timestamp: new Date().toISOString(),
        count: friendIds.length,
        friends: friendIds,
      };

      fs.writeFileSync(
        this.currentFriendsFile,
        JSON.stringify(friendsData, null, 2)
      );
      console.log(`📋 Current friends updated: ${friendIds.length} friends`);
    } catch (error) {
      console.error("❌ Error updating current friends:", error);
    }
  }

  /**
   * Add detected follower (only save if they follow back)
   */
  public addDetectedFollower(result: FollowerDetectionResult): void {
    if (result.followsYouBack) {
      try {
        const followers = this.getDetectedFollowers();
        const exists = followers.some((f) => f.userId === result.userId);
        if (exists) return;

        const follower: DetectedFollower = {
          userId: result.userId,
          username: result.username,
          avatar: result.avatar,
          followers: result.followers,
          following: result.following,
          friends: result.friends,
          supporter: result.supporter,
          isVerified: result.isVerified,
          detectedAt: result.timestamp,
        };

        followers.push(follower);
        fs.writeFileSync(
          this.followersFile,
          JSON.stringify(followers, null, 2)
        );

        console.log(`🎉 New follower detected: ${result.username}`);
      } catch (error) {
        console.log("❌ Error saving detected follower:", error);
      }
    }
  }


  /**
   * Get all detected followers (who follow back)
   */
  public getDetectedFollowers(): DetectedFollower[] {
    try {
      if (fs.existsSync(this.followersFile)) {
        const fileContent = fs.readFileSync(this.followersFile, "utf-8");
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error("❌ Error loading followers:", error);
    }
    return [];
  }

  /**
   * Get initial friends (to avoid unfollowing them)
   */
  public getInitialFriends(): string[] {
    try {
      if (fs.existsSync(this.initialFriendsFile)) {
        const fileContent = fs.readFileSync(this.initialFriendsFile, "utf-8");
        const data = JSON.parse(fileContent);
        return data.friends || [];
      }
    } catch (error) {
      console.error("❌ Error loading initial friends:", error);
    }
    return [];
  }

  /**
   * Get current friends
   */
  public getCurrentFriends(): string[] {
    try {
      if (fs.existsSync(this.currentFriendsFile)) {
        const fileContent = fs.readFileSync(this.currentFriendsFile, "utf-8");
        const data = JSON.parse(fileContent);
        return data.friends || [];
      }
    } catch (error) {
      console.error("❌ Error loading current friends:", error);
    }
    return [];
  }

  public getCompletedUsers(): string[] {
    try {
      if (fs.existsSync(this.completedUsersFile)) {
        const fileContent = fs.readFileSync(this.completedUsersFile, "utf-8");
        const data = JSON.parse(fileContent);
        return data || [];
      }
    } catch (error) {
      console.error("❌ Error loading completed users:", error);
    }
    return [];
  }

  public addCompletedUser(userId: string): void {
    const completedUsers = this.getCompletedUsers();
    console.log("adding completed user", userId, completedUsers);
    completedUsers.push(userId);
    fs.writeFileSync(
      this.completedUsersFile,
      JSON.stringify(completedUsers, null, 2)
    );
  }

  public isCompletedUser(userId: string): boolean {
    const completedUsers = this.getCompletedUsers();
    return completedUsers.includes(userId);
  }

  /**
   * Check if user is an initial friend (should not be unfollowed)
   */
  public isInitialFriend(userId: string): boolean {
    const initialFriends = this.getInitialFriends();
    return initialFriends.includes(userId);
  }

  /**
   * Get summary of detected followers
   */
  public getSummary(): {
    totalFollowers: number;
    initialFriends: number;
    currentFriends: number;
  } {
    const followers = this.getDetectedFollowers();
    const initialFriends = this.getInitialFriends();
    const currentFriends = this.getCurrentFriends();

    return {
      totalFollowers: followers.length,
      initialFriends: initialFriends.length,
      currentFriends: currentFriends.length,
    };
  }
}
