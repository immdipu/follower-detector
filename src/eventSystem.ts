import { EventEmitter } from 'events';

export interface FollowEvents {
  'follow-requested': (userId: string) => void;
  'follow-completed': (userId: string, success: boolean) => void;
  'unfollow-requested': (userId: string) => void;
  'unfollow-completed': (userId: string, success: boolean) => void;
  'friends-list-requested': () => void;
  'friends-list-received': (friends: string[]) => void;
  'user-check-completed': (userId: string, followsBack: boolean) => void;
  'window-opened': (windowId: string) => void;
  'window-closed': (windowId: string) => void;
}

export class FollowEventSystem extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Allow more listeners for complex operations
  }

  // Type-safe event emission methods
  emitFollowRequested(userId: string): void {
    this.emit('follow-requested', userId);
  }

  emitFollowCompleted(userId: string, success: boolean): void {
    this.emit('follow-completed', userId, success);
  }

  emitUnfollowRequested(userId: string): void {
    this.emit('unfollow-requested', userId);
  }

  emitUnfollowCompleted(userId: string, success: boolean): void {
    this.emit('unfollow-completed', userId, success);
  }

  emitFriendsListRequested(): void {
    this.emit('friends-list-requested');
  }

  emitFriendsListReceived(friends: string[]): void {
    this.emit('friends-list-received', friends);
  }

  emitUserCheckCompleted(userId: string, followsBack: boolean): void {
    this.emit('user-check-completed', userId, followsBack);
  }

  emitWindowOpened(windowId: string): void {
    this.emit('window-opened', windowId);
  }

  emitWindowClosed(windowId: string): void {
    this.emit('window-closed', windowId);
  }

  // Type-safe event listener methods
  onFollowRequested(callback: (userId: string) => void): void {
    this.on('follow-requested', callback);
  }

  onFollowCompleted(callback: (userId: string, success: boolean) => void): void {
    this.on('follow-completed', callback);
  }

  onFollowCompletedOnce(callback: (userId: string, success: boolean) => void): void {
    this.once('follow-completed', callback);
  }

  onUnfollowRequested(callback: (userId: string) => void): void {
    this.on('unfollow-requested', callback);
  }

  onUnfollowCompleted(callback: (userId: string, success: boolean) => void): void {
    this.on('unfollow-completed', callback);
  }

  onUnfollowCompletedOnce(callback: (userId: string, success: boolean) => void): void {
    this.once('unfollow-completed', callback);
  }

  onFriendsListRequested(callback: () => void): void {
    this.on('friends-list-requested', callback);
  }

  onFriendsListReceived(callback: (friends: string[]) => void): void {
    this.on('friends-list-received', callback);
  }

  onUserCheckCompleted(callback: (userId: string, followsBack: boolean) => void): void {
    this.on('user-check-completed', callback);
  }

  onWindowOpened(callback: (windowId: string) => void): void {
    this.on('window-opened', callback);
  }

  onWindowClosed(callback: (windowId: string) => void): void {
    this.on('window-closed', callback);
  }
}
