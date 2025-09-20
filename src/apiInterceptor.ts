import { Page, BrowserContext } from 'playwright';
import { FollowEventSystem } from './eventSystem';
import { DataStorage } from './dataStorage';

export interface InterceptedRequest {
  url: string;
  method: string;
  postData: string;
  headers: Record<string, string>;
}

export interface InterceptedResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
}

export class APIInterceptor {
  private page: Page;
  private context: BrowserContext;
  private eventSystem: FollowEventSystem;
  private isIntercepting: boolean = false;
  private capturedPayload: any = null;
  private targetUserId: string | null = null;
  private pendingRequests: Map<string, string> = new Map(); // requestId -> userId
  private initialFriends: boolean = false;
  private dataStorage: DataStorage;
  public static Action: "follow" | "unfollow";

  constructor(page: Page, context: BrowserContext, eventSystem: FollowEventSystem, dataStorage: DataStorage) {
    this.page = page;
    this.context = context;
    this.eventSystem = eventSystem;
    this.initialFriends = false;
    this.dataStorage = dataStorage;
    APIInterceptor.Action = "follow";
  }

  /**
   * Start intercepting API requests
   */
  public async startIntercepting(): Promise<void> {
    if (this.isIntercepting) {
      console.log('⚠️ Already intercepting requests');
      return;
    }

    this.isIntercepting = true;
    console.log('🔍 Starting API request interception...');

    // Intercept requests
    await this.page.route('**/*', async (route, request) => {
      const url = request.url();
      const postData = request.postData();

      if (this.isFollowRequest(url)) {
        await this.handleFollowRequest(route, request, url, postData);
        return;
      }

      if (this.isRelationshipsRequest(url)) {
        await this.handleRelationshipsRequest(route, request, url, postData);
        return;
      }

      // Let other requests pass through
      await route.continue();
    });

    console.log('✅ API interception started');
  }

  /**
   * Stop intercepting API requests
   */
  public async stopIntercepting(): Promise<void> {
    if (!this.isIntercepting) {
      return;
    }

    this.isIntercepting = false;
    await this.page.unroute('**/*');
    console.log('🛑 API interception stopped');
  }

  /**
   * Set the target user ID for the next follow/unfollow operation
   */
  public setTargetUserId(userId: string): void {
    this.targetUserId = userId;
    console.log(`🎯 Target user ID set to: ${userId}`);
  }

  /**
   * Capture payload from a successful request for later use
   */
  public capturePayload(payload: any): void {
    this.capturedPayload = payload;
    console.log('✅ Payload captured for future requests');
  }


  private isFollowRequest(url: string): boolean {
    return url.includes('/identity/post/follow/') || url.includes('/identity/post/unfollow/');
  }


  private isRelationshipsRequest(url: string): boolean {
    return url.includes('/identity/get/relationships/');
  }

  /**
   * Handle follow/unfollow requests
   */
  private async handleFollowRequest(route: any, request: any, url: string, postData: string | null): Promise<void> {
    const isFollow = APIInterceptor.Action === "follow";

    if (!postData) {
      await route.continue();
      return;
    }

    try {
      const originalData = JSON.parse(postData);

      // Store the payload structure if we don't have it
      if (!this.capturedPayload) {
        this.capturedPayload = originalData;
        console.log('📦 Auto-captured payload from intercepted request');
      }

      // If we have a target user ID, replace the original toId
      let modifiedData = originalData;
      if (this.targetUserId) {
        modifiedData = {
          ...originalData,
          body: {
            ...originalData.body,
            toId: this.targetUserId
          }
        };

        console.log(`🔄 Modified ${isFollow ? 'follow' : 'unfollow'} request: ${originalData.body?.toId} -> ${this.targetUserId}`);

        // Emit event
        if (isFollow) {
          this.eventSystem.emitFollowRequested(this.targetUserId);
        } else {
          const newURL = this.convertFollowToUnfollowUrl(url);
          url = newURL;
        }

        const requestId = `${Date.now()}-${Math.random()}`;
        this.pendingRequests.set(requestId, this.targetUserId);
      }

      await route.continue({
        postData: JSON.stringify(modifiedData)
      });

      const response = await request.response();
      if (response) {
        const success = response.status() === 200;

        if (this.targetUserId) {
          if (isFollow) {
            this.eventSystem.emitFollowCompleted(this.targetUserId, success);
          } else {
            this.eventSystem.emitUnfollowCompleted(this.targetUserId, success);
          }
        }

        console.log(`${success ? '✅' : '❌'} ${isFollow ? 'Follow' : 'Unfollow'} request ${success ? 'successful' : 'failed'}: ${response.status()}`);
      }

    } catch (error) {
      console.error('❌ Error handling follow/unfollow request:', error);
      await route.continue();
    }
  }

  /**
   * Handle relationships (friends list) requests
   */
  private async handleRelationshipsRequest(route: any, request: any, url: string, postData: string | null): Promise<void> {
    await route.continue();
    try {
      const response = await request.response();
      if (response && response.status() === 200) {
        const responseBody = await response.json();
        const friends = responseBody.data?.friends || [];
        if (!this.initialFriends) {
          this.initialFriends = true;
          this.dataStorage.setInitialFriends(friends);
          return;
        }
        this.eventSystem.emitFriendsListReceived(friends);
      }
    } catch (error) {
      console.error('❌ Error handling relationships response:', error);
    }
  }

  /**
   * Get payload for a specific user (using captured payload as template)
   */
  public getPayloadForUser(userId: string): any {
    if (!this.capturedPayload) {
      throw new Error('No payload captured yet! Please perform a follow/unfollow action first.');
    }

    return {
      ...this.capturedPayload,
      body: {
        ...this.capturedPayload.body,
        toId: userId
      }
    };
  }

  private convertFollowToUnfollowUrl(url: string): string {
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace('/follow/', '/unfollow/');
    urlObj.searchParams.set("a", "identity-post-unfollow")
    return urlObj.toString();
  }

  /**
   * Check if we have a captured payload
   */
  public hasPayload(): boolean {
    return this.capturedPayload !== null;
  }

  /**
   * Clear the target user ID (useful for manual operations)
   */
  public clearTargetUserId(): void {
    this.targetUserId = null;
    console.log('🧹 Target user ID cleared');
  }

  /**
   * Get current status
   */
  public getStatus(): { intercepting: boolean; hasPayload: boolean; targetUserId: string | null } {
    return {
      intercepting: this.isIntercepting,
      hasPayload: this.hasPayload(),
      targetUserId: this.targetUserId
    };
  }
}
