import * as dotenv from 'dotenv';
import { Login, FollowerDetector, DataStorage } from './src';

dotenv.config();

async function quickExample() {
  const login = new Login({
    headless: false,
    email: process.env.EMAIL || '',
    password: process.env.PASSWORD || '',
    loginURL: 'https://accounts.google.com/signin',
    loginRedirectURL: 'myaccount.google.com',
    authFile: './auth.json',
    f4tURL: 'https://free4talk.com',
    accountIdentifier: process.env.EMAIL || ''
  });

  try {
    console.log('🚀 Quick Follower Detection Example');
    
    // Login (will use auth.json if available, otherwise full login)
    await login.init();
    await login.performLogin();
    
    // Wait for room data to be collected automatically
    console.log('⏳ Collecting user data from rooms...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const userDataManager = login.getUserDataManager();
    const stats = userDataManager.getStats();
    
    console.log(`\n📊 Collected ${stats.totalUsers} users!`);
    
    if (stats.totalUsers > 0) {
      // Get some interesting users to test
      const testUsers = userDataManager.getRandomSample(3, {
        minFollowers: 5,
        maxFollowers: 500
      });
      
      console.log('\n🎯 Testing with these users:');
      testUsers.forEach(user => {
        console.log(`- ${user.name} (${user.followers} followers)`);
      });
      
      // Setup follower detection
      const dataStorage = new DataStorage('./quick-test.json');
      const followerDetector = new FollowerDetector(
        login.getPage()!,
        login.getTokenInterceptor(),
        dataStorage
      );
      
      // Get token by visiting profile
      await login.getPage()?.goto('https://www.free4talk.com/profile');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await followerDetector.initialize();
      
      console.log('\n🔄 Starting follower detection...');
      await followerDetector.detectFollowers(testUsers);
      
      // Show results
      const results = dataStorage.getDetectedFollowers();
      console.log('\n✅ Results:');
      results.forEach(result => {
        console.log(`${result.username}: ${result.followsYouBack ? '✅ Follows back!' : '❌ No follow back'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await login.close();
  }
}

if (require.main === module) {
  quickExample().catch(console.error);
}
