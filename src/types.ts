export type UserRole = "Co-Owner" | "Owner" | "Guest" | null;

export type Participant = {
  id: string;
  friends: number;
  avatar: string;
  followers: number;
  following: number;
  name: string;
  supporter: number;
  isVerified?: boolean;
  role?: UserRole;
};

export type Room = {
  id: string;
  maxPeople: number;
  clients: Participant[];
  url: string;
  language: string;
  secondLanguage?: string;
  level: string;
  topic: string;
  createdAt: string;
  userId: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
    isVerified: boolean;
  }
  settings: {
    noMic: boolean;
    alMic: number
  }
};

export type LoginOptions = {
  headless: boolean;
  email: string;
  password: string;
  loginURL: string;
  loginRedirectURL: string;
  authFile: string;
  f4tURL: string;
  accountIdentifier?: string;
  modelUser?: string;
  DEBUG_MODE?: boolean;
};

export type FollowerDetectionResult = {
  userId: string;
  username: string;
  avatar: string;
  followers: number;
  following: number;
  friends: number;
  supporter: number;
  isVerified?: boolean;
  followsYouBack: boolean;
  followSuccess: boolean;
  unfollowSuccess: boolean;
  timestamp: string;
};

export type FailedUnfollowUser = {
  userId: string;
  username: string;
  avatar: string;
  followers: number;
  following: number;
  friends: number;
  supporter: number;
  isVerified?: boolean;
  timestamp: string;
  error: string;
};

export type DetectedFollower = {
  userId: string;
  username: string;
  avatar: string;
  followers: number;
  following: number;
  friends: number;
  supporter: number;
  isVerified?: boolean;
  detectedAt: string;
};

export type TokenData = {
  token: string;
  timestamp: number;
};

export type FriendsData = {
  initialFriends: string[];
  currentFriends: string[];
  detectedFollowers: FollowerDetectionResult[];
  failedUnfollows: FailedUnfollowUser[];
};
