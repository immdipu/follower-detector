# Free4Talk Follower Detector

## What is this?

This is a simple tool that helps you find out who follows you back on Free4Talk. It automatically checks your connections and tells you who your real followers are.

## How does it work?

1. **Login**: The tool logs into your Free4Talk account (just like you would in a web browser)
2. **Check Friends**: It looks at your current friends list
3. **Test Connections**: It follows people and sees if they follow you back
4. **Save Results**: It saves a list of people who follow you back
5. **Clean Up**: It unfollows the people it tested (so you don't accidentally follow too many people)

## Quick Start

### Step 1: Get the files ready
```bash
# Install what the tool needs
npm install

# Copy the example settings file
cp env.example .env
```

### Step 2: Set up your login info
Open the `.env` file and add your Free4Talk login details:
```
EMAIL=your-email@example.com
PASSWORD=your-password
```

### Step 3: Build the tool
```bash
npm run build
```

### Step 4: Run the tool
```bash
make run
```

That's it! The tool will start and begin checking your followers.

## Easy Commands

- `make run` - Start the follower detector
- `make build` - Prepare the tool (run this first)
- `make install` - Get all needed files
- `make clean` - Remove temporary files

## What files does it create?

- `followers.json` - List of people who follow you back
- `friends.json` - Your current friends
- `initial-friends.json` - Your friends at the start (to protect them)
- `completed-users.json` - People the tool has already checked

## Important Notes

- **Be patient**: Checking followers takes time
- **Don't close the browser**: The tool uses a web browser to work
- **Check your friends**: The tool won't unfollow your real friends
- **Safe to run**: It only follows/unfollows to test connections

## Need Help?

If something doesn't work:
1. Make sure you have Node.js installed
2. Check your `.env` file has the right email and password
3. Run `make build` before `make run`
4. Look for error messages in the terminal

## Advanced Options

For developers or advanced users:

```bash
# Run in development mode (with auto-restart)
npm run dev

# Run tests
npm test

# Build only
npm run build
```

## What you need

- A computer with internet
- Your Free4Talk login info
- Node.js (download from nodejs.org if you don't have it)
