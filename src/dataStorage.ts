import * as fs from 'fs';
import * as path from 'path';
import { FriendsData, FollowerDetectionResult, Participant, FailedUnfollowUser, DetectedFollower } from './types';

export class DataStorage {
  private dataFile: string;
  private data: FriendsData;

  constructor(dataFile: string = './follower-data.json') {
    this.dataFile = path.resolve(dataFile);
    this.data = this.loadData();
  }

  /**
   * Load data from file or create default structure
   */
  private loadData(): FriendsData {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileContent = fs.readFileSync(this.dataFile, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('❌ Error loading data file:', error);
    }

    // Return default structure
    return {
      initialFriends: [],
      currentFriends: [],
      detectedFollowers: [],
      failedUnfollows: []
    };
  }

  /**
   * Save data to file
   */
  private saveData(): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
      console.log('💾 Data saved successfully');
    } catch (error) {
      console.error('❌ Error saving data:', error);
    }
  }

  /**
   * Store initial friends list (to avoid unfollowing real friends)
   */
  public setInitialFriends(friendIds: string[]): void {
    this.data.initialFriends = [...friendIds];
    this.data.currentFriends = [...friendIds];
    this.saveData();
    console.log(`📝 Initial friends stored: ${friendIds.length} friends`);
  }

  /**
   * Update current friends list
   */
  public updateCurrentFriends(friendIds: string[]): void {
    this.data.currentFriends = [...friendIds];
    this.saveData();
  }

  /**
   * Add detected follower
   */
  public addDetectedFollower(result: FollowerDetectionResult): void {
    // Check if already exists
    const exists = this.data.detectedFollowers.some(
      follower => follower.userId === result.userId
    );

    if (!exists) {
      this.data.detectedFollowers.push(result);
      this.saveData();
      console.log(`✅ Added detected follower: ${result.username}`);
      
      // If they follow back, save to separate followers file
      if (result.followsYouBack) {
        this.saveDetectedFollower(result);
      }
    } else {
      console.log(`⚠️ Follower already detected: ${result.username}`);
    }
  }

  /**
   * Add failed unfollow user
   */
  public addFailedUnfollow(user: FailedUnfollowUser): void {
    const exists = this.data.failedUnfollows.some(
      failed => failed.userId === user.userId
    );

    if (!exists) {
      this.data.failedUnfollows.push(user);
      this.saveData();
      console.log(`⚠️ Added failed unfollow: ${user.username} - ${user.error}`);
    }
  }

  /**
   * Save detected follower to separate file with full data
   */
  private saveDetectedFollower(result: FollowerDetectionResult): void {
    const followersFile = this.dataFile.replace('.json', '-followers.json');
    
    const follower: DetectedFollower = {
      userId: result.userId,
      username: result.username,
      avatar: result.avatar,
      followers: result.followers,
      following: result.following,
      friends: result.friends,
      supporter: result.supporter,
      isVerified: result.isVerified,
      detectedAt: result.timestamp
    };

    try {
      let followers: DetectedFollower[] = [];
      
      // Load existing followers
      if (fs.existsSync(followersFile)) {
        const fileContent = fs.readFileSync(followersFile, 'utf-8');
        followers = JSON.parse(fileContent);
      }

      // Check if already exists
      const exists = followers.some(f => f.userId === follower.userId);
      if (!exists) {
        followers.push(follower);
        fs.writeFileSync(followersFile, JSON.stringify(followers, null, 2));
        console.log(`🎉 Saved follower to ${followersFile}: ${follower.username}`);
      }
    } catch (error) {
      console.error('❌ Error saving detected follower:', error);
    }
  }

  /**
   * Get all detected followers
   */
  public getDetectedFollowers(): FollowerDetectionResult[] {
    return [...this.data.detectedFollowers];
  }

  /**
   * Get failed unfollows
   */
  public getFailedUnfollows(): FailedUnfollowUser[] {
    return [...this.data.failedUnfollows];
  }

  /**
   * Get initial friends (to avoid unfollowing them)
   */
  public getInitialFriends(): string[] {
    return [...this.data.initialFriends];
  }

  /**
   * Get current friends
   */
  public getCurrentFriends(): string[] {
    return [...this.data.currentFriends];
  }

  /**
   * Check if user is an initial friend (should not be unfollowed)
   */
  public isInitialFriend(userId: string): boolean {
    return this.data.initialFriends.includes(userId);
  }

  /**
   * Get new friends (not in initial list)
   */
  public getNewFriends(): string[] {
    return this.data.currentFriends.filter(
      friendId => !this.data.initialFriends.includes(friendId)
    );
  }

  /**
   * Store user data for later reference
   */
  public storeUserData(users: Participant[]): void {
    const userDataFile = this.dataFile.replace('.json', '-users.json');
    
    try {
      fs.writeFileSync(userDataFile, JSON.stringify(users, null, 2));
      console.log(`👥 Stored ${users.length} user records`);
    } catch (error) {
      console.error('❌ Error storing user data:', error);
    }
  }

  /**
   * Get stored user data
   */
  public getStoredUsers(): Participant[] {
    const userDataFile = this.dataFile.replace('.json', '-users.json');
    
    try {
      if (fs.existsSync(userDataFile)) {
        const fileContent = fs.readFileSync(userDataFile, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
    }

    return [];
  }

  /**
   * Find user by ID in stored data
   */
  public findUser(userId: string): Participant | null {
    const users = this.getStoredUsers();
    return users.find(user => user.id === userId) || null;
  }

  /**
   * Export results to a readable format
   */
  public exportResults(): void {
    const followersWhoFollowBack = this.data.detectedFollowers.filter(f => f.followsYouBack);
    const failedUnfollows = this.data.failedUnfollows;
    
    const results = {
      summary: {
        totalTested: this.data.detectedFollowers.length,
        followersWhoFollowBack: followersWhoFollowBack.length,
        failedUnfollows: failedUnfollows.length,
        initialFriends: this.data.initialFriends.length,
        currentFriends: this.data.currentFriends.length,
        newFriends: this.getNewFriends().length
      },
      followersWhoFollowBack: followersWhoFollowBack.map(follower => ({
        username: follower.username,
        followers: follower.followers,
        friends: follower.friends,
        isVerified: follower.isVerified || false,
        followSuccess: follower.followSuccess,
        unfollowSuccess: follower.unfollowSuccess,
        timestamp: new Date(follower.timestamp).toLocaleString()
      })),
      failedUnfollows: failedUnfollows.map(failed => ({
        username: failed.username,
        followers: failed.followers,
        friends: failed.friends,
        error: failed.error,
        timestamp: new Date(failed.timestamp).toLocaleString()
      })),
      allResults: this.data.detectedFollowers.map(follower => ({
        username: follower.username,
        followsBack: follower.followsYouBack,
        followSuccess: follower.followSuccess,
        unfollowSuccess: follower.unfollowSuccess,
        followers: follower.followers,
        timestamp: new Date(follower.timestamp).toLocaleString()
      }))
    };

    const exportFile = this.dataFile.replace('.json', '-results.json');
    
    try {
      fs.writeFileSync(exportFile, JSON.stringify(results, null, 2));
      console.log(`📊 Results exported to: ${exportFile}`);
      console.log(`🎉 Found ${followersWhoFollowBack.length} users who follow you back!`);
      if (failedUnfollows.length > 0) {
        console.log(`⚠️ WARNING: ${failedUnfollows.length} failed unfollows - check results file!`);
      }
    } catch (error) {
      console.error('❌ Error exporting results:', error);
    }
  }
}
