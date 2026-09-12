import fs from 'fs';
import path from 'path';
import { DbService } from './dbService.ts';
import { db } from './index.ts';
import { users as usersTable } from './schema.ts';
import { sql } from 'drizzle-orm';
import { SEED_PROFILES_WITH_DISTANCES } from '../seedUsers.ts';

export async function runMigrationToCloudSql(): Promise<{
  success: boolean;
  usersMigrated: number;
  matchesMigrated: number;
  messagesMigrated: number;
  swipesMigrated: number;
  auditLogsMigrated: number;
  details: string;
}> {
  console.log('[Migration] Starting migration to Cloud SQL PostgreSQL...');
  let usersCount = 0;
  let matchesCount = 0;
  let messagesCount = 0;
  let swipesCount = 0;
  let auditLogsCount = 0;

  try {
    // 1. Load data from local database.json if available
    const dbFile = path.join(process.cwd(), 'data', 'database.json');
    let localData: any = null;
    if (fs.existsSync(dbFile)) {
      try {
        localData = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      } catch (e) {
        console.warn('[Migration] Error parsing data/database.json:', e);
      }
    }

    // 2. Ensure initial Admin user exists in migration
    const adminUser = {
      id: 'admin-owner',
      name: 'Admin Propietario',
      email: 'lugabca98@gmail.com',
      age: 28,
      gender: 'other' as const,
      bio: 'Propietario y Administrador de Vulnerable. Panel de control global y moderación.',
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Buenos Aires, Argentina',
      distanceKm: 0,
      occupation: 'Fundador & Director de Operaciones',
      interests: ['Tecnología', 'Seguridad', 'Inteligencia Artificial', 'Café de Especialidad'],
      verified: true,
      emailVerified: true,
      status: 'active' as const,
      role: 'admin' as const,
      likesCount: 142,
      matchesCount: 28,
      preferences: {
        minAge: 18,
        maxAge: 99,
        interestedIn: ['female', 'male', 'non-binary', 'other'] as ('female' | 'male' | 'non-binary' | 'other')[],
        maxDistanceKm: 500,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      lastActive: new Date().toISOString(),
    };
    await DbService.upsertUser(adminUser);
    usersCount++;

    // 3. Migrate Users from localData or Seed Profiles
    const rawUsers: any[] = localData?.users?.length ? localData.users : SEED_PROFILES_WITH_DISTANCES;
    for (const u of rawUsers) {
      if (!u.id || !u.email) continue;
      await DbService.upsertUser({
        id: u.id,
        email: u.email,
        name: u.name || 'Usuario',
        age: u.age ?? 25,
        gender: u.gender ?? 'other',
        bio: u.bio ?? '',
        photos: u.photos || [],
        location: u.location || 'Buenos Aires, Argentina',
        distanceKm: u.distanceKm ?? 2,
        occupation: u.occupation ?? '',
        interests: u.interests || [],
        verified: u.verified ?? false,
        emailVerified: u.emailVerified ?? false,
        status: u.status ?? 'active',
        role: u.role ?? 'user',
        likesCount: u.likesCount ?? 0,
        matchesCount: u.matchesCount ?? 0,
        preferences: u.preferences,
        passwordHash: u.passwordHash,
        createdAt: u.createdAt,
        lastActive: u.lastActive,
      });
      usersCount++;
    }

    // 4. Migrate Swipes
    if (Array.isArray(localData?.swipes)) {
      for (const s of localData.swipes) {
        if (s.id && s.swiperId && s.targetId) {
          try {
            await DbService.recordSwipe(s);
            swipesCount++;
          } catch {}
        }
      }
    }

    // 5. Migrate Matches
    if (Array.isArray(localData?.matches)) {
      for (const m of localData.matches) {
        if (m.id && Array.isArray(m.userIds) && m.userIds.length === 2) {
          try {
            await DbService.createMatch(m);
            matchesCount++;
          } catch {}
        }
      }
    }

    // 6. Migrate Messages
    if (Array.isArray(localData?.messages)) {
      for (const msg of localData.messages) {
        if (msg.id && msg.matchId && msg.senderId && msg.receiverId) {
          try {
            await DbService.createMessage(msg);
            messagesCount++;
          } catch {}
        }
      }
    }

    // 7. Migrate Audit Logs
    if (Array.isArray(localData?.auditLogs)) {
      for (const log of localData.auditLogs) {
        if (log.id && log.adminEmail && log.action) {
          try {
            await DbService.addAuditLog(log);
            auditLogsCount++;
          } catch {}
        }
      }
    }

    // Record migration audit log
    await DbService.addAuditLog({
      id: `migration-${Date.now()}`,
      adminEmail: 'lugabca98@gmail.com',
      action: 'SYSTEM_RESET',
      targetUserId: 'system-cloudsql',
      targetUserName: 'Cloud SQL PostgreSQL',
      timestamp: new Date().toISOString(),
      details: `Migración exitosa a Cloud SQL PostgreSQL: ${usersCount} usuarios, ${matchesCount} matches, ${messagesCount} mensajes, ${swipesCount} swipes.`,
    });
    auditLogsCount++;

    const summary = `Migración completada con éxito. Usuarios: ${usersCount}, Matches: ${matchesCount}, Mensajes: ${messagesCount}, Swipes: ${swipesCount}, Logs: ${auditLogsCount}.`;
    console.log(`[Migration] ${summary}`);

    return {
      success: true,
      usersMigrated: usersCount,
      matchesMigrated: matchesCount,
      messagesMigrated: messagesCount,
      swipesMigrated: swipesCount,
      auditLogsMigrated: auditLogsCount,
      details: summary,
    };
  } catch (err: any) {
    console.error('[Migration] Migration error:', err);
    return {
      success: false,
      usersMigrated: usersCount,
      matchesMigrated: matchesCount,
      messagesMigrated: messagesCount,
      swipesMigrated: swipesCount,
      auditLogsMigrated: auditLogsCount,
      details: err.message || 'Error desconocido durante la migración.',
    };
  }
}
