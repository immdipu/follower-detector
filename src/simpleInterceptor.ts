export class SimpleInterceptor {
  private capturedPayload: any = null;

  /**
   * Store the captured payload from manual follow
   */
  public capturePayload(payload: any): void {
    this.capturedPayload = payload;
    console.log('✅ Payload captured and stored');
  }

  /**
   * Get payload with replaced toId
   */
  public getPayloadForUser(userId: string): any {
    if (!this.capturedPayload) {
      throw new Error('No payload captured yet! Please follow someone manually first.');
    }

    // Clone the payload and replace toId
    const newPayload = { ...this.capturedPayload };
    newPayload.body = { ...this.capturedPayload.body, toId: userId };
    
    return newPayload;
  }

  /**
   * Check if we have a captured payload
   */
  public hasPayload(): boolean {
    return this.capturedPayload !== null;
  }
}
