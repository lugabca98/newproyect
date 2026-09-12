import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  age: integer('age').notNull().default(25),
  gender: text('gender').notNull().default('other'),
  bio: text('bio').notNull().default(''),
  photos: jsonb('photos').$type<string[]>().notNull().default([]),
  location: text('location').notNull().default('Buenos Aires, Argentina'),
  distanceKm: integer('distance_km').default(2),
  occupation: text('occupation').notNull().default(''),
  interests: jsonb('interests').$type<string[]>().notNull().default([]),
  verified: boolean('verified').notNull().default(false),
  emailVerified: boolean('email_verified').notNull().default(false),
  status: text('status').notNull().default('active'),
  role: text('role').notNull().default('user'),
  likesCount: integer('likes_count').notNull().default(0),
  matchesCount: integer('matches_count').notNull().default(0),
  preferences: jsonb('preferences'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow(),
  lastActive: timestamp('last_active').defaultNow(),
});

export const swipes = pgTable('swipes', {
  id: text('id').primaryKey(),
  swiperId: text('swiper_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  user1Id: text('user1_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  user2Id: text('user2_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  matchedAt: timestamp('matched_at').defaultNow(),
  lastMessage: text('last_message'),
  lastMessageTime: timestamp('last_message_time'),
  unreadCount: integer('unread_count').notNull().default(0),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  read: boolean('read').notNull().default(false),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  adminEmail: text('admin_email').notNull(),
  adminUid: text('admin_uid'),
  action: text('action').notNull(),
  targetUserId: text('target_user_id').notNull(),
  targetUserName: text('target_user_name').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  details: text('details').notNull(),
});

export const pendingRegistrations = pgTable('pending_registrations', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  token: text('token').notNull(),
  userData: jsonb('user_data').notNull(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const otpRecords = pgTable('otp_records', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  swipesGiven: many(swipes, { relationName: 'swipesGiven' }),
  swipesReceived: many(swipes, { relationName: 'swipesReceived' }),
  sentMessages: many(messages, { relationName: 'sentMessages' }),
  receivedMessages: many(messages, { relationName: 'receivedMessages' }),
}));

export const swipesRelations = relations(swipes, ({ one }) => ({
  swiper: one(users, {
    fields: [swipes.swiperId],
    references: [users.id],
    relationName: 'swipesGiven',
  }),
  target: one(users, {
    fields: [swipes.targetId],
    references: [users.id],
    relationName: 'swipesReceived',
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  match: one(matches, {
    fields: [messages.matchId],
    references: [matches.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: 'receivedMessages',
  }),
}));
