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
import { Participant } from "./types";

dotenv.config();

async function main() {
  const { browser, context, page } = await initBrowser(loginOptions);
  const login = new Login(loginOptions, context, page);
  const dataStorage = new DataStorage();
  const followerDetector = new FollowerDetector(page, context, dataStorage, login, loginOptions.f4tURL);
  const uiController = new UIController(page);
  const userDataManager = new UserDataManager();

  try {
    console.log('🚀 Starting Free4Talk Follower Detector...');
    await login.performLogin();
    await followerDetector.initialize();
    await waitFor(3);
    await uiController.openUserProfile(loginOptions.modelUser || "");
    await waitFor(3);
    const users = await userDataManager.readUserData();
    await followerDetector.detectFollowers(users.reverse() as Participant[]);

    console.log('\n🎯 System initialized with intercept-based approach!');
    console.log('🔍 API requests are being intercepted and can be modified');
    console.log('🪟 Separate window opened for friends list monitoring');
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
      await followerDetector.stop();
      await login.close();
      await closeBrowser(browser as Browser);
    });
  }
}

export { Login, FollowerDetector, DataStorage, UserDataManager };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
