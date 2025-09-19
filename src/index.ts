import { Browser } from "playwright";
import * as dotenv from 'dotenv';
import { Login } from './login';
import { FollowerDetector } from './followerDetector';
import { DataStorage } from './dataStorage';
import { UserDataManager } from './userDataManager';
import { waitFor } from './utils';
import { initBrowser, closeBrowser } from './browser';
import { loginOptions } from './config';
import { UIController } from "./uiController";

dotenv.config();

async function main() {
  const { browser, context, page } = await initBrowser(loginOptions);
  const login = new Login(loginOptions, context, page);
  const uiController = new UIController(page);

  try {
    console.log('🚀 Starting Free4Talk Follower Detector...');
    console.log('🔐 Starting login process...');
    await login.performLogin();
    console.log('✅ Login successful!');
    waitFor(4);
    await uiController.openUserProfile(loginOptions.modelUser || "");
    waitFor(4);
    await uiController.clickFollowUser();
  

    console.log('\n🌐 Browser is open. Press Ctrl+C to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.on('exit', async () => {
      await login.close();
      await closeBrowser(browser as Browser);
    });
  }
}

// Export classes for use in other files
export { Login, FollowerDetector, DataStorage, UserDataManager };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
