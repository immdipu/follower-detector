export class ParameterAnalyzer {
  private capturedParams: Array<{
    userId: string;
    action: 'follow' | 'unfollow';
    parameter: string;
    timestamp: number;
  }> = [];

  /**
   * Store a captured _ parameter
   */
  public captureParameter(userId: string, action: 'follow' | 'unfollow', parameter: string): void {
    this.capturedParams.push({
      userId,
      action,
      parameter,
      timestamp: Date.now()
    });
    
    console.log(`📝 Captured ${action} parameter for ${userId}: ${parameter}`);
    this.analyzePattern();
  }

  /**
   * Get the most recent parameter for a specific user and action
   */
  public getLastParameter(userId: string, action: 'follow' | 'unfollow'): string | null {
    const filtered = this.capturedParams
      .filter(p => p.userId === userId && p.action === action)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return filtered.length > 0 ? filtered[0].parameter : null;
  }

  /**
   * Get any recent parameter (within last 5 minutes) for the same action
   */
  public getRecentParameter(action: 'follow' | 'unfollow'): string | null {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recent = this.capturedParams
      .filter(p => p.action === action && p.timestamp > fiveMinutesAgo)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return recent.length > 0 ? recent[0].parameter : null;
  }

  /**
   * Analyze patterns in captured parameters
   */
  private analyzePattern(): void {
    if (this.capturedParams.length < 2) return;

    const recent = this.capturedParams.slice(-5); // Last 5 parameters
    
    console.log('\n🔍 Parameter Analysis:');
    recent.forEach((param, index) => {
      console.log(`  ${index + 1}. ${param.action} ${param.userId}: ${param.parameter.substring(0, 20)}...`);
    });

    // Look for patterns
    const lengths = recent.map(p => p.parameter.length);
    const uniqueLengths = [...new Set(lengths)];
    
    if (uniqueLengths.length === 1) {
      console.log(`📏 All parameters have same length: ${uniqueLengths[0]}`);
    }

    // Check if they're hex-encoded
    const isHex = recent.every(p => /^[0-9a-f]+$/i.test(p.parameter));
    if (isHex) {
      console.log('🔢 All parameters appear to be hexadecimal');
    }

    // Look for common prefixes/suffixes
    if (recent.length >= 2) {
      const first = recent[0].parameter;
      const commonPrefix = this.findCommonPrefix(recent.map(p => p.parameter));
      const commonSuffix = this.findCommonSuffix(recent.map(p => p.parameter));
      
      if (commonPrefix.length > 0) {
        console.log(`🎯 Common prefix (${commonPrefix.length} chars): ${commonPrefix}`);
      }
      if (commonSuffix.length > 0) {
        console.log(`🎯 Common suffix (${commonSuffix.length} chars): ${commonSuffix}`);
      }
    }
  }

  /**
   * Find common prefix in strings
   */
  private findCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    
    let prefix = '';
    for (let i = 0; i < strings[0].length; i++) {
      const char = strings[0][i];
      if (strings.every(str => str[i] === char)) {
        prefix += char;
      } else {
        break;
      }
    }
    return prefix;
  }

  /**
   * Find common suffix in strings
   */
  private findCommonSuffix(strings: string[]): string {
    if (strings.length === 0) return '';
    
    let suffix = '';
    for (let i = 1; i <= strings[0].length; i++) {
      const char = strings[0][strings[0].length - i];
      if (strings.every(str => str[str.length - i] === char)) {
        suffix = char + suffix;
      } else {
        break;
      }
    }
    return suffix;
  }

  /**
   * Try to reverse engineer the parameter generation
   */
  public generateParameter(userId: string, action: 'follow' | 'unfollow'): string {
    // First, try to use a recently captured parameter for the same action
    const recentParam = this.getRecentParameter(action);
    if (recentParam) {
      console.log(`🔄 Using recent ${action} parameter pattern`);
      return recentParam;
    }

    // If we have any captured parameters, try to modify one
    if (this.capturedParams.length > 0) {
      const lastParam = this.capturedParams[this.capturedParams.length - 1];
      console.log(`🔄 Modifying captured parameter from ${lastParam.action}`);
      
      // Try simple modifications (this is experimental)
      const timestamp = Date.now().toString(16);
      const userIdHex = Buffer.from(userId).toString('hex');
      
      // Try to replace what might be timestamp or user ID in the original
      let modified = lastParam.parameter;
      
      // Replace last 8-16 characters (might be timestamp)
      if (modified.length > 16) {
        modified = modified.substring(0, modified.length - 12) + timestamp.substring(0, 12);
      }
      
      return modified;
    }

    // NO FALLBACK - throw error to force manual capture
    throw new Error('❌ No captured parameters available! Please manually follow someone first to capture the parameter format.');
  }

  /**

   * Get all captured parameters for debugging
   */
  public getAllCaptured(): Array<{userId: string, action: string, parameter: string, timestamp: number}> {
    return [...this.capturedParams];
  }
}
