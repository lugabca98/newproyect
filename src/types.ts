export type Gender = 'female' | 'male' | 'non-binary' | 'other';
export type UserStatus = 'active' | 'blocked' | 'deleted';
export type UserRole = 'user' | 'admin';

export interface UserPreferences {
  minAge: number;
  maxAge: number;
  interestedIn: ('female' | 'male' | 'non-binary' | 'other')[];
  maxDistanceKm: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: Gender;
  bio: string;
  photos: string[];
  location: string;
  distanceKm?: number;
  occupation: string;
  interests: string[];
  verified: boolean;
  emailVerified?: boolean;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  lastActive: string;
  likesCount: number;
  matchesCount: number;
  preferences: UserPreferences;
  passwordHash?: string;
}

export interface UserCredential {
  email: string;
  passwordHash: string;
  userId: string;
  updatedAt: string;
}

export type SwipeType = 'like' | 'pass' | 'superlike';

export interface SwipeRecord {
  id: string;
  swiperId: string;
  targetId: string;
  type: SwipeType;
  timestamp: string;
}

export interface Match {
  id: string;
  userIds: [string, string];
  matchedAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  partner?: User;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalMatches: number;
  totalMessages: number;
  totalSwipes: number;
  todayNewUsers: number;
  verifiedUsers: number;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  adminUid?: string;
  action: 'BLOCK_USER' | 'UNBLOCK_USER' | 'DELETE_USER' | 'VERIFY_USER' | 'UNVERIFY_USER' | 'SYSTEM_RESET' | 'UPDATE_USER';
  targetUserId: string;
  targetUserName: string;
  timestamp: string;
  details: string;
}

export interface AuthSession {
  user: User;
  token: string;
  isAdmin: boolean;
}

export interface OtpRecord {
  email: string;
  code: string;
  type: 'verify_email' | 'password_reset';
  createdAt: string;
  expiresAt: string;
}
