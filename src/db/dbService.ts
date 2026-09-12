import { eq, or, and, desc } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  swipes,
  matches,
  messages,
  auditLogs,
  pendingRegistrations,
  otpRecords,
} from './schema.ts';
import type {
  User,
  SwipeRecord,
  Match,
  Message,
  AuditLog,
  PendingRegistration,
  OtpRecord,
} from '../types.ts';

export class DbService {
  // -------------------------------------------------------------
  // Users
  // -------------------------------------------------------------
  static async getAllUsers(): Promise<User[]> {
    try {
      const rows = await db.select().from(users);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        age: r.age,
        gender: r.gender as any,
        bio: r.bio,
        photos: (r.photos as string[]) || [],
        location: r.location,
        distanceKm: r.distanceKm ?? 2,
        occupation: r.occupation,
        interests: (r.interests as string[]) || [],
        verified: r.verified,
        emailVerified: r.emailVerified,
        status: r.status as any,
        role: r.role as any,
        likesCount: r.likesCount,
        matchesCount: r.matchesCount,
        preferences: (r.preferences as any) || {
          minAge: 18,
          maxAge: 99,
          interestedIn: ['female', 'male', 'non-binary', 'other'],
          maxDistanceKm: 100,
        },
        passwordHash: r.passwordHash ?? undefined,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        lastActive: r.lastActive ? r.lastActive.toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[CloudSQL] Error fetching all users:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async getUserById(id: string): Promise<User | null> {
    try {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        age: r.age,
        gender: r.gender as any,
        bio: r.bio,
        photos: (r.photos as string[]) || [],
        location: r.location,
        distanceKm: r.distanceKm ?? 2,
        occupation: r.occupation,
        interests: (r.interests as string[]) || [],
        verified: r.verified,
        emailVerified: r.emailVerified,
        status: r.status as any,
        role: r.role as any,
        likesCount: r.likesCount,
        matchesCount: r.matchesCount,
        preferences: (r.preferences as any) || {
          minAge: 18,
          maxAge: 99,
          interestedIn: ['female', 'male', 'non-binary', 'other'],
          maxDistanceKm: 100,
        },
        passwordHash: r.passwordHash ?? undefined,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        lastActive: r.lastActive ? r.lastActive.toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error('[CloudSQL] Error getting user by id:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const rows = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        age: r.age,
        gender: r.gender as any,
        bio: r.bio,
        photos: (r.photos as string[]) || [],
        location: r.location,
        distanceKm: r.distanceKm ?? 2,
        occupation: r.occupation,
        interests: (r.interests as string[]) || [],
        verified: r.verified,
        emailVerified: r.emailVerified,
        status: r.status as any,
        role: r.role as any,
        likesCount: r.likesCount,
        matchesCount: r.matchesCount,
        preferences: (r.preferences as any) || {
          minAge: 18,
          maxAge: 99,
          interestedIn: ['female', 'male', 'non-binary', 'other'],
          maxDistanceKm: 100,
        },
        passwordHash: r.passwordHash ?? undefined,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        lastActive: r.lastActive ? r.lastActive.toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error('[CloudSQL] Error getting user by email:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async upsertUser(user: Partial<User> & { id: string; email: string; name: string }): Promise<void> {
    try {
      const cleanEmail = user.email.trim().toLowerCase();
      await db
        .insert(users)
        .values({
          id: user.id,
          email: cleanEmail,
          name: user.name,
          age: user.age ?? 25,
          gender: user.gender ?? 'other',
          bio: user.bio ?? '',
          photos: user.photos ?? [],
          location: user.location ?? 'Buenos Aires, Argentina',
          distanceKm: user.distanceKm ?? 2,
          occupation: user.occupation ?? '',
          interests: user.interests ?? [],
          verified: user.verified ?? false,
          emailVerified: user.emailVerified ?? false,
          status: user.status ?? 'active',
          role: user.role ?? 'user',
          likesCount: user.likesCount ?? 0,
          matchesCount: user.matchesCount ?? 0,
          preferences: user.preferences ?? {
            minAge: 18,
            maxAge: 99,
            interestedIn: ['female', 'male', 'non-binary', 'other'],
            maxDistanceKm: 100,
          },
          passwordHash: user.passwordHash ?? null,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          lastActive: user.lastActive ? new Date(user.lastActive) : new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: cleanEmail,
            name: user.name,
            age: user.age ?? 25,
            gender: user.gender ?? 'other',
            bio: user.bio ?? '',
            photos: user.photos ?? [],
            location: user.location ?? 'Buenos Aires, Argentina',
            distanceKm: user.distanceKm ?? 2,
            occupation: user.occupation ?? '',
            interests: user.interests ?? [],
            verified: user.verified ?? false,
            emailVerified: user.emailVerified ?? false,
            status: user.status ?? 'active',
            role: user.role ?? 'user',
            likesCount: user.likesCount ?? 0,
            matchesCount: user.matchesCount ?? 0,
            preferences: user.preferences ?? undefined,
            passwordHash: user.passwordHash ?? undefined,
            lastActive: new Date(),
          },
        });
    } catch (error) {
      console.error('[CloudSQL] Error upserting user:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error('[CloudSQL] Error deleting user:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  // -------------------------------------------------------------
  // Swipes
  // -------------------------------------------------------------
  static async recordSwipe(swipe: SwipeRecord): Promise<void> {
    try {
      await db.insert(swipes).values({
        id: swipe.id,
        swiperId: swipe.swiperId,
        targetId: swipe.targetId,
        type: swipe.type,
        timestamp: swipe.timestamp ? new Date(swipe.timestamp) : new Date(),
      });
    } catch (error) {
      console.error('[CloudSQL] Error recording swipe:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async getSwipesForUser(swiperId: string): Promise<SwipeRecord[]> {
    try {
      const rows = await db.select().from(swipes).where(eq(swipes.swiperId, swiperId));
      return rows.map((r) => ({
        id: r.id,
        swiperId: r.swiperId,
        targetId: r.targetId,
        type: r.type as any,
        timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getting swipes:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  // -------------------------------------------------------------
  // Matches
  // -------------------------------------------------------------
  static async createMatch(match: Match): Promise<void> {
    try {
      await db.insert(matches).values({
        id: match.id,
        user1Id: match.userIds[0],
        user2Id: match.userIds[1],
        matchedAt: match.matchedAt ? new Date(match.matchedAt) : new Date(),
        lastMessage: match.lastMessage ?? null,
        lastMessageTime: match.lastMessageTime ? new Date(match.lastMessageTime) : null,
        unreadCount: match.unreadCount ?? 0,
      });
    } catch (error) {
      console.error('[CloudSQL] Error creating match:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async getMatchesForUser(userId: string): Promise<Match[]> {
    try {
      const rows = await db
        .select()
        .from(matches)
        .where(or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)));

      return rows.map((r) => ({
        id: r.id,
        userIds: [r.user1Id, r.user2Id] as [string, string],
        matchedAt: r.matchedAt ? r.matchedAt.toISOString() : new Date().toISOString(),
        lastMessage: r.lastMessage ?? undefined,
        lastMessageTime: r.lastMessageTime ? r.lastMessageTime.toISOString() : undefined,
        unreadCount: r.unreadCount,
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getting matches:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  // -------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------
  static async createMessage(msg: Message): Promise<void> {
    try {
      await db.insert(messages).values({
        id: msg.id,
        matchId: msg.matchId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        text: msg.text,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
        read: msg.read ?? false,
      });
    } catch (error) {
      console.error('[CloudSQL] Error creating message:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async getMessagesForMatch(matchId: string): Promise<Message[]> {
    try {
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.matchId, matchId))
        .orderBy(messages.createdAt);

      return rows.map((r) => ({
        id: r.id,
        matchId: r.matchId,
        senderId: r.senderId,
        receiverId: r.receiverId,
        text: r.text,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        read: r.read,
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getting messages:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  // -------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------
  static async addAuditLog(log: AuditLog): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        id: log.id,
        adminEmail: log.adminEmail,
        adminUid: log.adminUid ?? null,
        action: log.action,
        targetUserId: log.targetUserId,
        targetUserName: log.targetUserName,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        details: log.details,
      });
    } catch (error) {
      console.error('[CloudSQL] Error adding audit log:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const rows = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.timestamp))
        .limit(100);

      return rows.map((r) => ({
        id: r.id,
        adminEmail: r.adminEmail,
        adminUid: r.adminUid ?? undefined,
        action: r.action as any,
        targetUserId: r.targetUserId,
        targetUserName: r.targetUserName,
        timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
        details: r.details,
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getting audit logs:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  // -------------------------------------------------------------
  // Pending Registrations & OTP
  // -------------------------------------------------------------
  static async savePendingRegistration(reg: PendingRegistration): Promise<void> {
    try {
      await db
        .insert(pendingRegistrations)
        .values({
          id: reg.id,
          email: reg.email.toLowerCase(),
          token: reg.id,
          userData: reg.userData,
          passwordHash: reg.passwordHash ?? null,
          createdAt: reg.createdAt ? new Date(reg.createdAt) : new Date(),
        })
        .onConflictDoUpdate({
          target: pendingRegistrations.email,
          set: {
            token: reg.id,
            userData: reg.userData,
            passwordHash: reg.passwordHash ?? null,
            createdAt: new Date(),
          },
        });
    } catch (error) {
      console.error('[CloudSQL] Error saving pending registration:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async getPendingRegistration(email: string): Promise<PendingRegistration | null> {
    try {
      const rows = await db
        .select()
        .from(pendingRegistrations)
        .where(eq(pendingRegistrations.email, email.toLowerCase()))
        .limit(1);

      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.token,
        email: r.email,
        userData: r.userData as any,
        passwordHash: r.passwordHash ?? undefined,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error('[CloudSQL] Error getting pending registration:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }

  static async deletePendingRegistration(email: string): Promise<void> {
    try {
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.email, email.toLowerCase()));
    } catch (error) {
      console.error('[CloudSQL] Error deleting pending registration:', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  }
}
