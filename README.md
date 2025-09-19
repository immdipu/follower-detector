# Free4Talk Follower Detector

This tool helps you detect who follows you back on Free4Talk by automatically following users, checking if they appear in your friends list, and then unfollowing them.

## How It Works

1. **Smart Login**: 
   - If `auth.json` exists → Skip Google login, go straight to Free4Talk
   - If no `auth.json` → Full Google + Free4Talk login, then save auth for next time
2. **Auto User Collection**: Intercepts room data APIs to collect all users automatically
3. **Initialize**: Gets your initial friends list (to avoid unfollowing real friends)
4. **Follow & Check**: For each target user:
   - Follows them
   - Checks if they appear in your friends list (means they follow you back)
   - Records the result
   - Unfollows them (to clean up)
5. **Results**: Saves all detected followers to JSON files

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

3. **Build:**
   ```bash
   npm run build
   ```

## Usage

### Basic Usage

```bash
npm run dev
```

This will:
- Login to Free4Talk
- Initialize the follower detector
- Keep the browser open for manual testing

### Programmatic Usage

```typescript
import { Login, FollowerDetector, DataStorage } from './src';

const login = new Login(loginOptions);
const dataStorage = new DataStorage('./follower-data.json');

// Login and setup
await login.init(false);
await login.performLogin();

// Initialize detector
const followerDetector = new FollowerDetector(
  login.getPage()!,
  login.getTokenInterceptor(),
  dataStorage
);
await followerDetector.initialize();

// Detect followers
const users = [/* your user list */];
await followerDetector.detectFollowers(users);
```

## Configuration

### Environment Variables

- `EMAIL`: Your Google account email
- `PASSWORD`: Your Google account password
- `F4T_URL`: Free4Talk URL (default: https://free4talk.com)
- `ACCOUNT_IDENTIFIER`: Email for account selection

### User Data Format

```typescript
const users: Participant[] = [
  {
    id: 'USER_ID',
    name: 'Username',
    avatar: 'avatar_url',
    friends: 0,
    followers: 0,
    following: 0,
    supporter: 0
  }
];
```

## Output Files

- `follower-data.json`: Raw detection data
- `follower-data-users.json`: User information
- `follower-data-results.json`: Formatted results

### Results Format

```json
{
  "summary": {
    "initialFriends": 10,
    "currentFriends": 10,
    "detectedFollowers": 5,
    "newFriends": 0
  },
  "detectedFollowers": [
    {
      "username": "TestUser",
      "followsBack": true,
      "timestamp": "1/1/2024, 12:00:00 PM"
    }
  ]
}
```

## Features

- **Smart Detection**: Only tests users who aren't already your friends
- **Token Management**: Automatically intercepts and uses authentication tokens
- **Rate Limiting**: Waits between requests to avoid being blocked
- **Data Persistence**: Saves all results to JSON files
- **Error Handling**: Continues processing even if individual requests fail
- **Clean Up**: Automatically unfollows users after testing

## Safety Features

- **Friend Protection**: Never unfollows your initial friends
- **Rate Limiting**: Built-in delays between requests
- **Error Recovery**: Continues processing if individual requests fail
- **Token Validation**: Checks token age and validity

## Limitations

- Requires valid Free4Talk login
- Token expires after ~1 hour
- Rate limited by Free4Talk's API
- Only detects mutual follows (friends)

## Troubleshooting

### "No token available"
- Make sure you're logged in
- Navigate to a page that triggers the relationships API (like profile page)
- Wait a few seconds for the token to be intercepted

### "Follow request failed"
- Check if you're rate limited
- Verify the user ID is valid
- Ensure token is still valid

### "No initial friends found"
- Make sure the relationships API was called during login
- Check if you have any friends on the platform

## Example Workflow

```typescript
// 1. Setup
const users = getUsersFromRoom(); // Your function to get users

// 2. Run detection
await followerDetector.detectFollowers(users);

// 3. Check results
const followers = dataStorage.getDetectedFollowers();
console.log(`Found ${followers.length} users who follow you back!`);

// 4. Export results
dataStorage.exportResults();
```

## API Endpoints Used

- `POST /identity/post/follow/` - Follow user
- `POST /identity/post/unfollow/` - Unfollow user  
- `POST /identity/get/relationships/` - Get friends list

## Security Notes

- Keep your credentials secure
- Don't share authentication tokens
- Be respectful of Free4Talk's terms of service
- Use reasonable delays between requests
