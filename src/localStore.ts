import { User, Match, Message, SwipeRecord, AuditLog, AdminStats, UserCredential, OtpRecord, PendingRegistration } from './types';
import { DEFAULT_ADMIN_EMAIL, DEMO_ACCOUNTS, hashPassword, hashPasswordSync } from './utils/security';

const STORAGE_KEY_USERS = 'mv_db_users';
const STORAGE_KEY_SWIPES = 'mv_db_swipes';
const STORAGE_KEY_MATCHES = 'mv_db_matches';
const STORAGE_KEY_MESSAGES = 'mv_db_messages';
const STORAGE_KEY_LOGS = 'mv_db_logs';
const STORAGE_KEY_CREDENTIALS = 'mv_db_credentials';
const STORAGE_KEY_OTPS = 'mv_db_otps';
const STORAGE_KEY_DELETED_EMAILS = 'mv_db_deleted_emails';
const STORAGE_KEY_PENDING_REGISTRATIONS = 'mv_db_pending_registrations';

export { DEFAULT_ADMIN_EMAIL };

export const INITIAL_ADMIN: User = {
  id: 'admin-owner',
  name: 'Admin Propietario',
  email: DEFAULT_ADMIN_EMAIL,
  age: 28,
  gender: 'other',
  bio: 'Propietario y Administrador de Vulnerable. Espacio seguro y empático para personas neurodivergentes.',
  photos: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
  ],
  location: 'Buenos Aires, Argentina',
  distanceKm: 0,
  occupation: 'Altas Capacidades (AACC) & TDAH',
  interests: ['Tecnología', 'Seguridad', 'Inteligencia Artificial', 'Café de Especialidad'],
  verified: true,
  status: 'active',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastActive: new Date().toISOString(),
  likesCount: 142,
  matchesCount: 28,
  preferences: {
    minAge: 18,
    maxAge: 99,
    interestedIn: ['female', 'male', 'non-binary', 'other'],
    maxDistanceKm: 100
  }
};

export const INITIAL_SEED_USERS: User[] = [];

const INITIAL_MATCHES: Match[] = [];

const INITIAL_MESSAGES: Message[] = [];

const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    adminEmail: DEFAULT_ADMIN_EMAIL,
    action: 'SYSTEM_RESET',
    targetUserId: 'system',
    targetUserName: 'Motor Local & Servidor',
    timestamp: new Date().toISOString(),
    details: 'Inicialización de plataforma con tolerancia a fallos.'
  }
];

class LocalDatabaseStore {
  private getStored<T>(key: string, fallback: T): T {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  private setStored<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  init(): void {
    if (typeof window !== 'undefined' && localStorage.getItem('vulnerable_zero_reset_v5') !== 'true') {
      this.resetToZero();
      return;
    }

    // Auto-heal pending registrations if corrupted by previous reset
    try {
      const rawPending = localStorage.getItem(STORAGE_KEY_PENDING_REGISTRATIONS);
      if (!rawPending || rawPending === '{}' || rawPending === 'null') {
        this.setStored(STORAGE_KEY_PENDING_REGISTRATIONS, []);
      }
    } catch {}

    const deletedEmails = new Set(this.getDeletedEmails());
    const creds = this.getStored<Record<string, UserCredential>>(STORAGE_KEY_CREDENTIALS, {});
    let credsModified = false;

    // Seed default credentials for demo accounts ONLY if not deleted and not already saved
    DEMO_ACCOUNTS.forEach((acc) => {
      const emailLower = acc.email.toLowerCase();
      if (deletedEmails.has(emailLower)) return;
      if (!creds[emailLower]) {
        const syncHash = hashPasswordSync(acc.primaryPass);
        creds[emailLower] = {
          email: emailLower,
          passwordHash: syncHash,
          userId: acc.role === 'admin' ? 'admin-owner' : ('user-' + acc.name.split(' ')[0].toLowerCase()),
          updatedAt: new Date().toISOString()
        };
        credsModified = true;
      }
    });
    if (credsModified) {
      this.setStored(STORAGE_KEY_CREDENTIALS, creds);
    }

    const users = this.getStored<User[]>(STORAGE_KEY_USERS, []);
    if (users.length === 0) {
      const filteredSeed = INITIAL_SEED_USERS.filter(u => !deletedEmails.has(u.email.toLowerCase()));
      this.setStored(STORAGE_KEY_USERS, filteredSeed);
      this.setStored(STORAGE_KEY_MATCHES, INITIAL_MATCHES);
      this.setStored(STORAGE_KEY_MESSAGES, INITIAL_MESSAGES);
      this.setStored(STORAGE_KEY_LOGS, INITIAL_LOGS);
    } else {
      // Ensure seed users have updated neurodivergences if previously seeded with old professions
      let changed = false;
      const seedMap = new Map(INITIAL_SEED_USERS.map(s => [s.email.toLowerCase(), s]));
      
      users.forEach(u => {
        const seed = seedMap.get(u.email.toLowerCase());
        if (seed && (!u.occupation || u.occupation.includes('Diseñadora') || u.occupation.includes('Developer') || u.occupation.includes('Arquitecta') || u.occupation.includes('Fotógrafo') || u.occupation.includes('Medicina') || u.occupation.includes('Sommelier') || u.occupation.includes('Danza') || u.occupation.includes('Operaciones'))) {
          u.occupation = seed.occupation;
          u.bio = seed.bio;
          changed = true;
        }
      });

      // Filter out any deleted users if somehow present
      const validUsers = users.filter(u => !deletedEmails.has((u.email || '').toLowerCase()));
      if (validUsers.length !== users.length) {
        changed = true;
      }

      // Ensure admin exists with admin role
      const adminIdx = validUsers.findIndex(u => u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
      if (adminIdx === -1) {
        validUsers.unshift(INITIAL_ADMIN);
        changed = true;
      } else {
        validUsers[adminIdx].role = 'admin';
        validUsers[adminIdx].status = 'active';
        if (validUsers[adminIdx].occupation !== INITIAL_ADMIN.occupation) {
          validUsers[adminIdx].occupation = INITIAL_ADMIN.occupation;
          changed = true;
        }
      }

      if (changed) {
        this.setStored(STORAGE_KEY_USERS, validUsers);
      }
    }
  }

  getDeletedEmails(): string[] {
    const val = this.getStored<any>(STORAGE_KEY_DELETED_EMAILS, []);
    return Array.isArray(val) ? val : [];
  }

  recordDeletedEmail(email: string): void {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const deleted = this.getDeletedEmails();
    if (!deleted.includes(cleanEmail)) {
      deleted.push(cleanEmail);
      this.setStored(STORAGE_KEY_DELETED_EMAILS, deleted);
    }
    this.removeCredential(cleanEmail);
  }

  isEmailDeleted(email: string): boolean {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const deleted = this.getDeletedEmails();
    return deleted.includes(cleanEmail);
  }

  removeDeletedEmail(email: string): void {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const deleted = this.getDeletedEmails().filter(e => e.toLowerCase() !== cleanEmail);
    this.setStored(STORAGE_KEY_DELETED_EMAILS, deleted);
  }

  getUsers(): User[] {
    this.init();
    const deleted = new Set(this.getDeletedEmails());
    const users = this.getStored<any>(STORAGE_KEY_USERS, INITIAL_SEED_USERS);
    const validUsers = Array.isArray(users) ? users : [INITIAL_ADMIN];
    return validUsers.filter(u => u && !deleted.has((u.email || '').toLowerCase()));
  }

  saveUsers(users: User[]): void {
    const deleted = new Set(this.getDeletedEmails());
    const filtered = users.filter(u => !deleted.has((u.email || '').toLowerCase()));
    this.setStored(STORAGE_KEY_USERS, filtered);
  }

  removeUser(userId: string, email?: string): void {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (cleanEmail) {
      this.recordDeletedEmail(cleanEmail);
    }
    const currentUsers = this.getStored<User[]>(STORAGE_KEY_USERS, []);
    const filtered = currentUsers.filter(u => 
      u.id !== userId && (!cleanEmail || (u.email || '').trim().toLowerCase() !== cleanEmail)
    );
    this.setStored(STORAGE_KEY_USERS, filtered);

    if (cleanEmail) {
      this.removeCredential(cleanEmail);
    }
  }

  removeCredential(email: string): void {
    if (!email) return;
    const creds = this.getCredentials();
    const cleanEmail = email.trim().toLowerCase();
    if (creds[cleanEmail]) {
      delete creds[cleanEmail];
      this.setStored(STORAGE_KEY_CREDENTIALS, creds);
    }
  }

  getSwipes(): SwipeRecord[] {
    const val = this.getStored<any>(STORAGE_KEY_SWIPES, []);
    return Array.isArray(val) ? val : [];
  }

  saveSwipes(swipes: SwipeRecord[]): void {
    this.setStored(STORAGE_KEY_SWIPES, swipes);
  }

  getMatches(): Match[] {
    const val = this.getStored<any>(STORAGE_KEY_MATCHES, INITIAL_MATCHES);
    return Array.isArray(val) ? val : [];
  }

  saveMatches(matches: Match[]): void {
    this.setStored(STORAGE_KEY_MATCHES, matches);
  }

  getMessages(): Message[] {
    const val = this.getStored<any>(STORAGE_KEY_MESSAGES, INITIAL_MESSAGES);
    return Array.isArray(val) ? val : [];
  }

  saveMessages(messages: Message[]): void {
    this.setStored(STORAGE_KEY_MESSAGES, messages);
  }

  getAuditLogs(): AuditLog[] {
    const val = this.getStored<any>(STORAGE_KEY_LOGS, INITIAL_LOGS);
    return Array.isArray(val) ? val : [];
  }

  addAuditLog(log: AuditLog): void {
    const logs = this.getAuditLogs();
    logs.unshift(log);
    this.setStored(STORAGE_KEY_LOGS, logs);
  }

  getCredentials(): Record<string, UserCredential> {
    return this.getStored<Record<string, UserCredential>>(STORAGE_KEY_CREDENTIALS, {});
  }

  getCredential(email: string): UserCredential | null {
    if (!email) return null;
    const creds = this.getCredentials();
    return creds[email.trim().toLowerCase()] || null;
  }

  saveCredential(email: string, passwordHash: string, userId: string): void {
    if (!email) return;
    const creds = this.getCredentials();
    const cleanEmail = email.trim().toLowerCase();
    creds[cleanEmail] = {
      email: cleanEmail,
      passwordHash,
      userId,
      updatedAt: new Date().toISOString()
    };
    this.setStored(STORAGE_KEY_CREDENTIALS, creds);

    const users = this.getUsers();
    const idx = users.findIndex(u => (u.email || '').trim().toLowerCase() === cleanEmail || u.id === userId);
    if (idx !== -1) {
      users[idx].passwordHash = passwordHash;
      this.saveUsers(users);
    }
  }

  // OTP 6-Digit Verification & Password Reset
  getOtps(): OtpRecord[] {
    const val = this.getStored<any>(STORAGE_KEY_OTPS, []);
    return Array.isArray(val) ? val : [];
  }

  saveOtp(record: OtpRecord): void {
    const otps = this.getOtps().filter(o => 
      !(o.email.toLowerCase() === record.email.toLowerCase() && o.type === record.type)
    );
    otps.push(record);
    this.setStored(STORAGE_KEY_OTPS, otps);
  }

  generateOtp(email: string, type: 'verify_email' | 'password_reset'): string {
    const cleanEmail = (email || '').trim().toLowerCase();
    // Generate secure 6-digit random number (100000 - 999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 mins validity

    const record: OtpRecord = {
      email: cleanEmail,
      code,
      type,
      createdAt: now.toISOString(),
      expiresAt
    };

    this.saveOtp(record);
    return code;
  }

  getLatestOtp(email: string, type: 'verify_email' | 'password_reset'): OtpRecord | null {
    const cleanEmail = (email || '').trim().toLowerCase();
    const otps = this.getOtps();
    const found = otps.filter(o => o.email.toLowerCase() === cleanEmail && o.type === type);
    if (!found.length) return null;
    return found[found.length - 1];
  }

  verifyOtp(email: string, code: string, type: 'verify_email' | 'password_reset'): { valid: boolean; reason?: string } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim().replace(/\s+/g, '');
    const latest = this.getLatestOtp(cleanEmail, type);

    if (!latest) {
      return { valid: false, reason: 'No se encontró un código solicitado para este correo.' };
    }

    if (new Date().toISOString() > latest.expiresAt) {
      return { valid: false, reason: 'El código ha expirado. Por favor solicita uno nuevo.' };
    }

    if (latest.code !== cleanCode) {
      return { valid: false, reason: 'El código de 6 dígitos ingresado es incorrecto.' };
    }

    return { valid: true };
  }

  // Pending Registrations (Profiles are NOT created until email confirmation)
  getPendingRegistrations(): PendingRegistration[] {
    const raw = this.getStored<any>(STORAGE_KEY_PENDING_REGISTRATIONS, []);
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      const arr = Object.values(raw) as PendingRegistration[];
      this.setStored(STORAGE_KEY_PENDING_REGISTRATIONS, arr);
      return arr;
    }
    this.setStored(STORAGE_KEY_PENDING_REGISTRATIONS, []);
    return [];
  }

  getPendingRegistration(email: string): PendingRegistration | null {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const pendings = this.getPendingRegistrations();
    if (!Array.isArray(pendings)) return null;
    return pendings.find(p => p && p.email && p.email.toLowerCase() === cleanEmail) || null;
  }

  savePendingRegistration(pending: PendingRegistration): void {
    if (!pending || !pending.email) return;
    const cleanEmail = pending.email.trim().toLowerCase();
    const pendings = this.getPendingRegistrations();
    const current = Array.isArray(pendings) ? pendings.filter(p => p && p.email && p.email.toLowerCase() !== cleanEmail) : [];
    current.push({ ...pending, email: cleanEmail });
    this.setStored(STORAGE_KEY_PENDING_REGISTRATIONS, current);
  }

  removePendingRegistration(email: string): void {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const pendings = this.getPendingRegistrations();
    const current = Array.isArray(pendings) ? pendings.filter(p => p && p.email && p.email.toLowerCase() !== cleanEmail) : [];
    this.setStored(STORAGE_KEY_PENDING_REGISTRATIONS, current);
  }

  activatePendingRegistration(email: string): User | null {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const pending = this.getPendingRegistration(cleanEmail);
    if (!pending) return null;

    const u = pending.userData;
    const isOwnerAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
    const activatedUser: User = {
      id: pending.id || `user-${Date.now()}`,
      name: u.name?.trim() || (isOwnerAdmin ? 'Administrador' : 'Nuevo Miembro'),
      email: cleanEmail,
      age: Number(u.age) || 24,
      gender: u.gender || 'female',
      bio: u.bio?.trim() || '',
      photos: u.photos?.length ? u.photos : [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
      ],
      location: u.location?.trim() || 'Buenos Aires, Argentina',
      distanceKm: u.distanceKm || 2,
      occupation: u.occupation?.trim() || 'Neurodivergente',
      interests: u.interests?.length ? u.interests : ['Música', 'Cine', 'Café'],
      verified: false,
      emailVerified: true,
      status: 'active',
      role: isOwnerAdmin ? 'admin' : 'user',
      createdAt: pending.createdAt || new Date().toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 0,
      matchesCount: 0,
      preferences: u.preferences || {
        minAge: 18,
        maxAge: 60,
        interestedIn: ['female', 'male', 'non-binary', 'other'],
        maxDistanceKm: 50
      },
      passwordHash: pending.passwordHash
    };

    // Remove from pending
    this.removePendingRegistration(cleanEmail);

    // Save into active users
    const existingUsers = this.getUsers().filter(user => user.id !== activatedUser.id && (user.email || '').toLowerCase() !== cleanEmail);
    this.saveUsers([activatedUser, ...existingUsers]);

    return activatedUser;
  }

  resetToZero(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_USERS);
      localStorage.removeItem(STORAGE_KEY_SWIPES);
      localStorage.removeItem(STORAGE_KEY_MATCHES);
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
      localStorage.removeItem(STORAGE_KEY_CREDENTIALS);
      localStorage.removeItem(STORAGE_KEY_OTPS);
      localStorage.removeItem(STORAGE_KEY_DELETED_EMAILS);
      localStorage.removeItem(STORAGE_KEY_PENDING_REGISTRATIONS);
      localStorage.removeItem('vulnerable_auth_token');
      localStorage.removeItem('vulnerable_auth_uid');
      localStorage.removeItem('vulnerable_auth_email');
      localStorage.removeItem('vulnerable_auth_role');

      const adminCredSync = hashPasswordSync('admin1234');
      const creds: Record<string, UserCredential> = {
        [DEFAULT_ADMIN_EMAIL.toLowerCase()]: {
          email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
          passwordHash: adminCredSync,
          userId: 'admin-owner',
          updatedAt: new Date().toISOString()
        }
      };

      this.setStored(STORAGE_KEY_USERS, [INITIAL_ADMIN]);
      this.setStored(STORAGE_KEY_MATCHES, []);
      this.setStored(STORAGE_KEY_MESSAGES, []);
      this.setStored(STORAGE_KEY_SWIPES, []);
      this.setStored(STORAGE_KEY_DELETED_EMAILS, []);
      this.setStored(STORAGE_KEY_CREDENTIALS, creds);
      this.setStored(STORAGE_KEY_PENDING_REGISTRATIONS, []);
      this.setStored(STORAGE_KEY_LOGS, [
        {
          id: `log-${Date.now()}`,
          adminEmail: DEFAULT_ADMIN_EMAIL,
          action: 'SYSTEM_RESET',
          targetUserId: 'system',
          targetUserName: 'Motor Local & Servidor',
          timestamp: new Date().toISOString(),
          details: 'Reinicio total: todas las cuentas registradas fueron eliminadas para empezar la plataforma desde 0.'
        }
      ]);
      localStorage.setItem('vulnerable_zero_reset_v5', 'true');
    } catch (e) {
      console.warn('resetToZero error:', e);
    }
  }
}

export const localDb = new LocalDatabaseStore();
localDb.init();
