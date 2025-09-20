import fs from "fs";
import { Room, Participant } from "./types";

export class UserDataManager {
  private readonly filePath: string = "usersInfo.json";
  private static isWriting: boolean = false;
  private static isReading: boolean = false;
  private userMap: Map<string, Participant> = new Map();

  constructor() {
    this.loadExistingUsers();
  }

  /**
   * Load existing users from file to prevent duplicates
   */
  private loadExistingUsers(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, "utf-8");
        if (data.trim()) {
          const users = JSON.parse(data) as Participant[];
          users.forEach(user => {
            this.userMap.set(user.id, user);
          });
          console.log(`📚 Loaded ${users.length} existing users from storage`);
        }
      }
    } catch (error) {
      console.error("❌ Error loading existing users:", error);
    }
  }

  /**
   * Process room data and extract unique users
   */
  public async writeUserData(roomInfo: Record<string, Room>): Promise<void> {
    // Writing waits for reads to finish (reads have priority)
    while(UserDataManager.isReading) {
      console.log("🔄 Waiting for ongoing read operation to finish before writing...");
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    // Skip if another write is already in progress
    if(UserDataManager.isWriting) return;
    UserDataManager.isWriting = true;

    try {
      let newUsersCount = 0;
      let updatedUsersCount = 0;

      // Extract all users from all rooms
      for (const roomId in roomInfo) {
        const room = roomInfo[roomId];
        
        for (const client of room.clients) {
          const existingUser = this.userMap.get(client.id);
          
          if (!existingUser) {
            // New user
            this.userMap.set(client.id, { ...client });
            newUsersCount++;
          } else {
            // Update existing user with latest data (in case stats changed)
            this.userMap.set(client.id, { ...client });
            updatedUsersCount++;
          }
        }
      }

      // Save to file
      const allUsers = Array.from(this.userMap.values());
      fs.writeFileSync(this.filePath, JSON.stringify(allUsers, null, 2));
      
    } finally {
      UserDataManager.isWriting = false;
    }
  }

  /**
   * Read all stored users
   */
  public async readUserData(): Promise<Participant[]> {
    // Reading is priority - never wait, just read immediately
    if(UserDataManager.isReading){
      console.log("🔄 Reading user data is already in progress");
      return [];
    }
    
    UserDataManager.isReading = true;
  
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      const data = fs.readFileSync(this.filePath, "utf-8");
      if (!data.trim()) {
        return [];
      }

      const users = JSON.parse(data) as Participant[];
      return users;
    } catch (error) {
      console.error("❌ Error reading user data:", error);
      return [];
    } finally {
      UserDataManager.isReading = false;
    }
  }

  /**
   * Get users from memory (faster than file read)
   */
  public getUsers(): Participant[] {
    return Array.from(this.userMap.values());
  }

  /**
   * Get user count
   */
  public getUserCount(): number {
    return this.userMap.size;
  }

  /**
   * Find user by ID
   */
  public findUser(userId: string): Participant | null {
    return this.userMap.get(userId) || null;
  }

  /**
   * Export users to different format for analysis
   */
  public exportUsers(format: 'csv' | 'json' = 'json'): void {
    const users = this.getUsers();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'csv') {
      const csvFile = `users-export-${timestamp}.csv`;
      const headers = 'id,name,followers,following,friends,supporter,isVerified\n';
      const csvData = users.map(user => 
        `"${user.id}","${user.name}",${user.followers},${user.following},${user.friends},${user.supporter},${user.isVerified || false}`
      ).join('\n');
      
      fs.writeFileSync(csvFile, headers + csvData);
      console.log(`📊 Users exported to CSV: ${csvFile}`);
    } else {
      const jsonFile = `users-export-${timestamp}.json`;
      fs.writeFileSync(jsonFile, JSON.stringify(users, null, 2));
      console.log(`📊 Users exported to JSON: ${jsonFile}`);
    }
  }

  /**
   * Get statistics about collected users
   */
  public getStats(): {
    totalUsers: number;
    avgFollowers: number;
    avgFriends: number;
    verifiedUsers: number;
    topUsers: Participant[];
  } {
    const users = this.getUsers();
    
    if (users.length === 0) {
      return {
        totalUsers: 0,
        avgFollowers: 0,
        avgFriends: 0,
        verifiedUsers: 0,
        topUsers: []
      };
    }

    const avgFollowers = users.reduce((sum, user) => sum + user.followers, 0) / users.length;
    const avgFriends = users.reduce((sum, user) => sum + user.friends, 0) / users.length;
    const verifiedUsers = users.filter(user => user.isVerified).length;
    
    // Top 10 users by followers
    const topUsers = users
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 10);

    return {
      totalUsers: users.length,
      avgFollowers: Math.round(avgFollowers),
      avgFriends: Math.round(avgFriends),
      verifiedUsers,
      topUsers
    };
  }
}
