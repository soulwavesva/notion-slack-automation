class RateLimiter {
  constructor() {
    this.notionCalls = [];
    this.slackCalls = [];
    this.maxNotionCallsPerSecond = 2; // Conservative limit
    this.maxSlackCallsPerSecond = 1;
  }

  /**
   * Check if we can make a Notion API call
   */
  canMakeNotionCall() {
    const now = Date.now();
    // Remove calls older than 1 second
    this.notionCalls = this.notionCalls.filter(time => now - time < 1000);
    
    if (this.notionCalls.length >= this.maxNotionCallsPerSecond) {
      return false;
    }
    
    this.notionCalls.push(now);
    return true;
  }

  /**
   * Check if we can make a Slack API call
   */
  canMakeSlackCall() {
    const now = Date.now();
    // Remove calls older than 1 second
    this.slackCalls = this.slackCalls.filter(time => now - time < 1000);
    
    if (this.slackCalls.length >= this.maxSlackCallsPerSecond) {
      return false;
    }
    
    this.slackCalls.push(now);
    return true;
  }

  /**
   * Wait until we can make a call
   */
  async waitForNotionCall() {
    while (!this.canMakeNotionCall()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async waitForSlackCall() {
    while (!this.canMakeSlackCall()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

module.exports = { RateLimiter };