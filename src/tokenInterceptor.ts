import { TokenData } from './types';

export class TokenInterceptor {
  private currentToken: TokenData | null = null;

  /**
   * Extract token from API request body and store it
   */
  public extractAndStoreToken(postData: string): void {
    try {
      const data = JSON.parse(postData);
      
      if (data.token) {
        this.currentToken = {
          token: data.token,
          timestamp: Date.now()
        };
        console.log('✅ Token stored successfully');
      }
    } catch (error) {
      console.error('❌ Error extracting token:', error);
    }
  }

  /**
   * Get the current stored token
   */
  public getToken(): string | null {
    if (!this.currentToken) {
      console.log('⚠️ No token available');
      return null;
    }

    // Check if token is older than 1 hour (tokens might expire)
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - this.currentToken.timestamp > oneHour) {
      console.log('⚠️ Token might be expired');
    }

    return this.currentToken.token;
  }

  /**
   * Check if we have a valid token
   */
  public hasValidToken(): boolean {
    return this.currentToken !== null && this.getToken() !== null;
  }

  /**
   * Get token age in minutes
   */
  public getTokenAge(): number {
    if (!this.currentToken) return -1;
    return Math.floor((Date.now() - this.currentToken.timestamp) / (1000 * 60));
  }
}

