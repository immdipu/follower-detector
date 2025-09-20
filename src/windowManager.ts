import { Page, BrowserContext } from 'playwright';
import { FollowEventSystem } from './eventSystem';
import { waitFor } from './utils';

export class WindowManager {
  private context: BrowserContext;
  private eventSystem: FollowEventSystem;
  private windows: Map<string, Page> = new Map();
  private friendsListWindow: Page | null = null;

  constructor(context: BrowserContext, eventSystem: FollowEventSystem) {
    this.context = context;
    this.eventSystem = eventSystem;
  }

  /**
   * Open a separate window for friends list fetching
   */
  public async openFriendsListWindow(f4tURL: string): Promise<Page> {
    try {
      console.log('🪟 Opening separate window for friends list...');
      
      // Create new page in the same context (shares cookies/auth)
      const newPage = await this.context.newPage();
      const windowId = `friends-${Date.now()}`;
      
      // Store the window
      this.windows.set(windowId, newPage);
      this.friendsListWindow = newPage;
      
      // Navigate to free4talk
      await newPage.goto(f4tURL);
      await waitFor(2);
      
      // Emit event
      this.eventSystem.emitWindowOpened(windowId);
      
      console.log('✅ Friends list window opened successfully');
      return newPage;
      
    } catch (error) {
      console.error('❌ Error opening friends list window:', error);
      throw error;
    }
  }

  /**
   * Reload the friends list window to trigger API calls
   */
  public async reloadFriendsListWindow(): Promise<void> {
    if (!this.friendsListWindow) {
      throw new Error('No friends list window available');
    }

    try {
      console.log('🔄 Reloading friends list window...');
      await this.friendsListWindow.reload();
      await waitFor(3); // Wait for page to load and API calls to complete
      console.log('✅ Friends list window reloaded');
    } catch (error) {
      console.error('❌ Error reloading friends list window:', error);
      throw error;
    }
  }

  /**
   * Close the friends list window
   */
  public async closeFriendsListWindow(): Promise<void> {
    if (!this.friendsListWindow) {
      return;
    }

    try {
      const windowId = this.getWindowId(this.friendsListWindow);
      
      await this.friendsListWindow.close();
      this.friendsListWindow = null;
      
      if (windowId) {
        this.windows.delete(windowId);
        this.eventSystem.emitWindowClosed(windowId);
      }
      
      console.log('✅ Friends list window closed');
    } catch (error) {
      console.error('❌ Error closing friends list window:', error);
    }
  }

  /**
   * Close a specific window by ID
   */
  public async closeWindow(windowId: string): Promise<void> {
    const window = this.windows.get(windowId);
    if (!window) {
      console.log(`⚠️ Window ${windowId} not found`);
      return;
    }

    try {
      await window.close();
      this.windows.delete(windowId);
      this.eventSystem.emitWindowClosed(windowId);
      
      if (window === this.friendsListWindow) {
        this.friendsListWindow = null;
      }
      
      console.log(`✅ Window ${windowId} closed`);
    } catch (error) {
      console.error(`❌ Error closing window ${windowId}:`, error);
    }
  }

  /**
   * Close all managed windows
   */
  public async closeAllWindows(): Promise<void> {
    console.log('🧹 Closing all managed windows...');
    
    const windowIds = Array.from(this.windows.keys());
    for (const windowId of windowIds) {
      await this.closeWindow(windowId);
    }
    
    this.friendsListWindow = null;
    console.log('✅ All windows closed');
  }

  /**
   * Get window ID for a page (helper method)
   */
  private getWindowId(page: Page): string | null {
    for (const [id, storedPage] of this.windows.entries()) {
      if (storedPage === page) {
        return id;
      }
    }
    return null;
  }

  /**
   * Check if friends list window is available
   */
  public hasFriendsListWindow(): boolean {
    return this.friendsListWindow !== null;
  }

  /**
   * Get current window count
   */
  public getWindowCount(): number {
    return this.windows.size;
  }

  /**
   * Get friends list window (if available)
   */
  public getFriendsListWindow(): Page | null {
    return this.friendsListWindow;
  }
}
