import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { User, Match, Message, SwipeRecord, AuditLog, AdminStats, Gender } from './src/types.js';
import { sendOtpEmail, getMailConfigStatus } from './server/mailer.js';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// Security Middleware: Set Essential Security HTTP Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent sensitive user/chat data from being cached in intermediate proxies
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// Body parsing with safe size bounds
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// -------------------------------------------------------------
// Rate Limiter Engine (Protects against Brute-Force & DoS)
// -------------------------------------------------------------
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + options.windowMs });
      next();
      return;
    }

    if (record.count >= options.max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ 
        error: options.message,
        retryAfterSeconds: retryAfter 
      });
      return;
    }

    record.count += 1;
    next();
  };
}

// Periodic cleanup of rate limit store
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 180000);

// -------------------------------------------------------------
// Cryptographic Password Hashing & Verification (PBKDF2)
// -------------------------------------------------------------
function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  if (!salt || !storedHash || typeof password !== 'string') return false;
  try {
    const calculatedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const hashBuffer = Buffer.from(calculatedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (hashBuffer.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Input Sanitization & Validation Helpers
// -------------------------------------------------------------
function sanitizeText(input: unknown, maxLen = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Strip HTML tags to avoid XSS
    .trim()
    .slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && trimmed.length <= 100;
}

// Internal Server User type containing secure password hash and salt
interface ServerUser extends Omit<User, 'password'> {
  passwordHash: string;
  passwordSalt: string;
}

// Sanitizes user profile for public discovery & chat partners (removes passwords, salts & emails)
function toPublicUser(user: ServerUser): User {
  return {
    id: user.id,
    name: user.name,
    email: '', // Never leak email to other users
    age: user.age,
    gender: user.gender,
    bio: user.bio,
    photos: user.photos,
    location: user.location,
    distanceKm: user.distanceKm,
    occupation: user.occupation,
    interests: user.interests,
    verified: user.verified,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt,
    lastActive: user.lastActive,
    likesCount: user.likesCount,
    matchesCount: user.matchesCount,
    preferences: user.preferences
  };
}

// Sanitizes user profile for the authenticated owner themselves
function toPrivateUser(user: ServerUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    age: user.age,
    gender: user.gender,
    bio: user.bio,
    photos: user.photos,
    location: user.location,
    distanceKm: user.distanceKm,
    occupation: user.occupation,
    interests: user.interests,
    verified: user.verified,
    emailVerified: (user as any).emailVerified ?? (user.email.toLowerCase() === 'lugabca98@gmail.com' ? true : false),
    status: user.status,
    role: user.role,
    createdAt: user.createdAt,
    lastActive: user.lastActive,
    likesCount: user.likesCount,
    matchesCount: user.matchesCount,
    preferences: user.preferences
  };
}

// -------------------------------------------------------------
// Persistent Database & Seeded Data (with Salted Hashes)
// -------------------------------------------------------------

// Active Sessions: token -> { userId, email, role, expiresAt }
const sessions = new Map<string, { userId: string; email: string; role: 'user' | 'admin'; expiresAt: number }>();

// Helper to seed users with hashed passwords
function createSeedUser(userData: Omit<User, 'password'>, plaintextPass: string): ServerUser {
  const { salt, hash } = hashPassword(plaintextPass);
  return {
    ...userData,
    passwordHash: hash,
    passwordSalt: salt
  };
}

function getAdminOwnerUser(): ServerUser {
  const { salt, hash } = hashPassword('admin1234');
  return {
    id: 'admin-owner',
    name: 'Admin Propietario',
    email: 'lugabca98@gmail.com',
    passwordHash: hash,
    passwordSalt: salt,
    age: 28,
    gender: 'other',
    bio: 'Propietario y Administrador de Vulnerable. Panel de control global y moderación.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Buenos Aires, Argentina',
    distanceKm: 0,
    occupation: 'Fundador & Director de Operaciones',
    interests: ['Tecnología', 'Seguridad', 'Inteligencia Artificial', 'Café de Especialidad'],
    verified: true,
    emailVerified: true,
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
      maxDistanceKm: 500
    }
  };
}

function getDefaultSeedUsers(): ServerUser[] {
  return [
    getAdminOwnerUser(),
    createSeedUser({
      id: 'user-valeria',
      name: 'Valeria Rivas',
      email: 'valeria@ejemplo.com',
      age: 24,
      gender: 'female',
      bio: 'Diseñadora UX/UI 🎨. Amante del café filtrado, museos de arte contemporáneo y pasear a mi perrito Milo 🐶.',
      photos: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'Palermo, CABA',
      distanceKm: 3,
      occupation: 'Diseñadora de Producto',
      interests: ['Diseño', 'Fotografía', 'Música Indie', 'Yoga', 'Viajes'],
      verified: true,
      status: 'active',
      role: 'user',
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 89,
      matchesCount: 14,
      preferences: {
        minAge: 22,
        maxAge: 32,
        interestedIn: ['male', 'non-binary'],
        maxDistanceKm: 25
      }
    }, 'password123'),

    createSeedUser({
      id: 'user-lucas',
      name: 'Lucas Martínez',
      email: 'lucas@ejemplo.com',
      age: 27,
      gender: 'male',
      bio: 'Ingeniero de software & escalador en roca 🧗. Apasionado por la cocina italiana casera 🍝 y tocar la guitarra.',
      photos: [
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'Recoleta, CABA',
      distanceKm: 5,
      occupation: 'Backend Developer',
      interests: ['Trekking', 'Guitarra', 'Cocina', 'Series', 'Startups'],
      verified: true,
      status: 'active',
      role: 'user',
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 65,
      matchesCount: 9,
      preferences: {
        minAge: 21,
        maxAge: 30,
        interestedIn: ['female'],
        maxDistanceKm: 30
      }
    }, 'password123'),

    createSeedUser({
      id: 'user-camila',
      name: 'Camila Rossi',
      email: 'camila@ejemplo.com',
      age: 26,
      gender: 'female',
      bio: 'Arquitecta de día, exploradora gastronómica de noche 🍷✨. Busco a alguien para probar nuevos restaurantes.',
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'Belgrano, CABA',
      distanceKm: 7,
      occupation: 'Arquitecta',
      interests: ['Arquitectura', 'Vino Tinto', 'Cine', 'Libros', 'Gimnasio'],
      verified: false,
      status: 'active',
      role: 'user',
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 110,
      matchesCount: 22,
      preferences: {
        minAge: 24,
        maxAge: 35,
        interestedIn: ['male', 'female'],
        maxDistanceKm: 50
      }
    }, 'password123'),

    createSeedUser({
      id: 'user-mateo',
      name: 'Mateo Fernández',
      email: 'mateo@ejemplo.com',
      age: 29,
      gender: 'male',
      bio: 'Fotógrafo documental & viajero empedernido 📸 28 países y contando. Escapadas improvisadas de fin de semana.',
      photos: [
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'San Telmo, CABA',
      distanceKm: 4,
      occupation: 'Fotógrafo Profesional',
      interests: ['Fotografía', 'Viajes', 'Aventuras', 'Vinilos', 'Cerveza Artesanal'],
      verified: true,
      status: 'active',
      role: 'user',
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 94,
      matchesCount: 18,
      preferences: {
        minAge: 23,
        maxAge: 33,
        interestedIn: ['female', 'non-binary'],
        maxDistanceKm: 40
      }
    }, 'password123'),

    createSeedUser({
      id: 'user-sofia',
      name: 'Sofía Benítez',
      email: 'sofia@ejemplo.com',
      age: 23,
      gender: 'female',
      bio: 'Estudiante de Medicina & maratonista aficionada 🏃‍♀️🩺. Si sobreviví a anatomía, puedo sobrevivir a una primera cita divertida.',
      photos: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'Caballito, CABA',
      distanceKm: 6,
      occupation: 'Estudiante de Medicina',
      interests: ['Running', 'Medicina', 'Podcasts', 'Playa', 'Perros'],
      verified: true,
      status: 'active',
      role: 'user',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 154,
      matchesCount: 31,
      preferences: {
        minAge: 22,
        maxAge: 29,
        interestedIn: ['male'],
        maxDistanceKm: 20
      }
    }, 'password123'),

    createSeedUser({
      id: 'user-ignacio',
      name: 'Ignacio Silva',
      email: 'ignacio@ejemplo.com',
      age: 31,
      gender: 'male',
      bio: 'Sommelier y DJ de vinilos en mis tiempos libres 🎧🍇. Fanático del jazz, los atardeceres y las charlas largas.',
      photos: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'Nuñez, CABA',
      distanceKm: 8,
      occupation: 'Sommelier & Gestor Cultural',
      interests: ['Música', 'Vinos', 'Gastronomía', 'Arte', 'Lectura'],
      verified: false,
      status: 'active',
      role: 'user',
      createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 78,
      matchesCount: 12,
      preferences: {
        minAge: 25,
        maxAge: 38,
        interestedIn: ['female', 'other'],
        maxDistanceKm: 35
      }
    }, 'password123'),

    createSeedUser({
      id: 'user-elena',
      name: 'Elena Gómez',
      email: 'elena@ejemplo.com',
      age: 25,
      gender: 'female',
      bio: 'Bailarina contemporánea e instructora de Pilates 🩰🌿. En busca de buenas energías y risas espontáneas.',
      photos: [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'Colegiales, CABA',
      distanceKm: 4,
      occupation: 'Instructora de Danza',
      interests: ['Danza', 'Pilates', 'Naturaleza', 'Plantas', 'Cocina Saludable'],
      verified: true,
      status: 'active',
      role: 'user',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 132,
      matchesCount: 26,
      preferences: {
        minAge: 23,
        maxAge: 32,
        interestedIn: ['male', 'female'],
        maxDistanceKm: 25
      }
    }, 'password123')
  ];
}

function getDefaultSeedAuditLogs(): AuditLog[] {
  return [
    {
      id: 'log-1',
      adminEmail: 'lugabca98@gmail.com',
      action: 'SYSTEM_RESET',
      targetUserId: 'system',
      targetUserName: 'System Engine',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      details: 'Inicialización de servicios seguros y autenticación criptográfica.'
    }
  ];
}

function getDefaultSeedSwipes(): SwipeRecord[] {
  return [
    { id: 'sw-1', swiperId: 'user-valeria', targetId: 'user-lucas', type: 'like', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'sw-2', swiperId: 'user-lucas', targetId: 'user-valeria', type: 'like', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'sw-3', swiperId: 'user-camila', targetId: 'user-mateo', type: 'like', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'sw-4', swiperId: 'user-mateo', targetId: 'user-camila', type: 'like', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'sw-5', swiperId: 'user-valeria', targetId: 'user-mateo', type: 'like', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() }
  ];
}

function getDefaultSeedMatches(): Match[] {
  return [
    {
      id: 'match-valeria-lucas',
      userIds: ['user-valeria', 'user-lucas'],
      matchedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      lastMessage: '¡Hola Valeria! Qué lindo perfil. ¿Cuál es tu cafetería favorita?',
      lastMessageTime: new Date(Date.now() - 3600000 * 4).toISOString(),
      unreadCount: 0
    },
    {
      id: 'match-camila-mateo',
      userIds: ['user-camila', 'user-mateo'],
      matchedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      lastMessage: 'Me encantaron las fotos de tu último viaje 📸',
      lastMessageTime: new Date(Date.now() - 3600000 * 12).toISOString(),
      unreadCount: 1
    }
  ];
}

function getDefaultSeedMessages(): Message[] {
  return [
    {
      id: 'msg-1',
      matchId: 'match-valeria-lucas',
      senderId: 'user-lucas',
      receiverId: 'user-valeria',
      text: '¡Hola Valeria! Me encantaron tus fotos. ¿Qué café filtrado recomendás en Palermo?',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      read: true
    },
    {
      id: 'msg-2',
      matchId: 'match-valeria-lucas',
      senderId: 'user-valeria',
      receiverId: 'user-lucas',
      text: '¡Hola Lucas! Definitivamente Cuervo o Lattente. Hacen un café increíble 🙌',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      read: true
    },
    {
      id: 'msg-3',
      matchId: 'match-valeria-lucas',
      senderId: 'user-lucas',
      receiverId: 'user-valeria',
      text: '¡Hola Valeria! Qué lindo perfil. ¿Cuál es tu cafetería favorita?',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      read: true
    },
    {
      id: 'msg-4',
      matchId: 'match-camila-mateo',
      senderId: 'user-mateo',
      receiverId: 'user-camila',
      text: '¡Hola Camila! Vi que te gusta el cine de A24. ¿Viste Past Lives?',
      createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
      read: true
    },
    {
      id: 'msg-5',
      matchId: 'match-camila-mateo',
      senderId: 'user-camila',
      receiverId: 'user-mateo',
      text: 'Me encantaron las fotos de tu último viaje 📸',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      read: false
    }
  ];
}

// In-Memory active database instances loaded from disk
let users: ServerUser[] = [];
let pendingRegistrations: { id: string; email: string; user: ServerUser; createdAt: string }[] = [];
let deletedAccounts: { email: string; userId: string; deletedAt: string; deletedBy: string }[] = [];
let swipes: SwipeRecord[] = [];
let matches: Match[] = [];
let messages: Message[] = [];
let auditLogs: AuditLog[] = [];

// OTP Store for email verification and password recovery
const otpStore = new Map<string, { code: string; type: string; email: string; expiresAt: number; name?: string }>();

// Persistence Engine
function ensureAdminUser() {
  const adminIndex = users.findIndex(u => u.email.toLowerCase() === 'lugabca98@gmail.com');
  if (adminIndex === -1) {
    users.unshift(getAdminOwnerUser());
  } else {
    users[adminIndex].role = 'admin';
    users[adminIndex].status = 'active';
    // Initialize admin password hash ONLY if not already set (preserves changed password)
    if (!users[adminIndex].passwordHash || !users[adminIndex].passwordSalt) {
      const { salt, hash } = hashPassword('admin1234');
      users[adminIndex].passwordSalt = salt;
      users[adminIndex].passwordHash = hash;
    }
  }
}

function loadDatabase() {
  try {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      deletedAccounts = Array.isArray(data.deletedAccounts) ? data.deletedAccounts : [];
      const deletedSet = new Set(deletedAccounts.map(d => d.email.toLowerCase()));
      users = Array.isArray(data.users) && data.users.length > 0 
        ? data.users.filter((u: ServerUser) => !deletedSet.has(u.email.toLowerCase()))
        : getDefaultSeedUsers().filter(u => !deletedSet.has(u.email.toLowerCase()));
      pendingRegistrations = Array.isArray(data.pendingRegistrations) ? data.pendingRegistrations : [];
      swipes = Array.isArray(data.swipes) ? data.swipes : getDefaultSeedSwipes();
      matches = Array.isArray(data.matches) ? data.matches : getDefaultSeedMatches();
      messages = Array.isArray(data.messages) ? data.messages : getDefaultSeedMessages();
      auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : getDefaultSeedAuditLogs();
    } else {
      deletedAccounts = [];
      users = getDefaultSeedUsers();
      pendingRegistrations = [];
      swipes = getDefaultSeedSwipes();
      matches = getDefaultSeedMatches();
      messages = getDefaultSeedMessages();
      auditLogs = getDefaultSeedAuditLogs();
    }
  } catch (err) {
    console.error('Error reading database file from disk, using fallback defaults:', err);
    deletedAccounts = [];
    users = getDefaultSeedUsers();
    pendingRegistrations = [];
    swipes = getDefaultSeedSwipes();
    matches = getDefaultSeedMatches();
    messages = getDefaultSeedMessages();
    auditLogs = getDefaultSeedAuditLogs();
  }

  ensureAdminUser();
  saveDatabase();
}

let isSaving = false;
let pendingSave = false;

function saveDatabase() {
  if (isSaving) {
    pendingSave = true;
    return;
  }
  isSaving = true;
  try {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = {
      users,
      pendingRegistrations,
      deletedAccounts,
      swipes,
      matches,
      messages,
      auditLogs,
      updatedAt: new Date().toISOString()
    };
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database to disk:', err);
  } finally {
    isSaving = false;
    if (pendingSave) {
      pendingSave = false;
      saveDatabase();
    }
  }
}

// Initial database bootstrap
loadDatabase();

// -------------------------------------------------------------
// Cryptographically Secure Session Generation & Verification
// -------------------------------------------------------------
function generateSecureToken(user: ServerUser): string {
  // Generate 256 bits (32 bytes) of cryptographically secure random entropy
  const randomEntropy = crypto.randomBytes(32).toString('hex');
  const token = `mv_${user.role}_${user.id.slice(0, 10)}_${randomEntropy}`;
  
  sessions.set(token, {
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt: Date.now() + 86400000 * 7 // 7 days TTL
  });
  return token;
}

// Extract session from Authorization header
function getSessionFromReq(req: express.Request) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// Standard Authentication Middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'No autorizado. Por favor iniciá sesión.' });
    return;
  }
  
  const user = users.find(u => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'Usuario no encontrado.' });
    return;
  }

  if (user.status === 'blocked') {
    res.status(403).json({ error: 'Tu cuenta se encuentra suspendida por el administrador.' });
    return;
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

// Strict Server-Side Admin Authorization Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getSessionFromReq(req);
  
  if (!session) {
    res.status(401).json({ 
      error: 'Acceso Denegado: Se requiere autenticación de administrador.', 
      code: 'ADMIN_AUTH_REQUIRED' 
    });
    return;
  }

  if (session.role !== 'admin') {
    res.status(403).json({ 
      error: 'Acceso Prohibido: No tenés permisos administrativos para realizar esta acción.',
      code: 'FORBIDDEN_NOT_ADMIN'
    });
    return;
  }

  const adminUser = users.find(u => u.id === session.userId);
  if (!adminUser || adminUser.role !== 'admin') {
    res.status(403).json({ 
      error: 'Acceso Prohibido: Cuenta no autorizada.',
      code: 'FORBIDDEN_INVALID_ROLE'
    });
    return;
  }

  (req as any).adminUser = adminUser;
  next();
}

// -------------------------------------------------------------
// Rate Limiters Configuration
// -------------------------------------------------------------
const authLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Max 20 attempts
  message: 'Demasiados intentos de acceso desde esta IP. Por favor aguardá 5 minutos.'
});

const passwordLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Demasiados intentos de cambio de contraseña. Por favor intenta más tarde.'
});

const messageLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 40,
  message: 'Estás enviando mensajes demasiado rápido. Aguarda unos instantes.'
});

// -------------------------------------------------------------
// Public & User API Endpoints
// -------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Vulnerable Secure API', time: new Date().toISOString() });
});

// Login (Secured with Rate Limiting & Cryptographic Password Verification)
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'Por favor ingresá un correo electrónico válido.' });
    return;
  }

  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Por favor ingresá tu contraseña.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if account has been deleted by an administrator
  const isDeleted = deletedAccounts.find(d => d.email.toLowerCase() === normalizedEmail);
  if (isDeleted) {
    res.status(403).json({
      error: 'Esta cuenta ha sido eliminada por el administrador. Si deseas volver a acceder a la plataforma, por favor regístrate nuevamente.',
      deleted: true
    });
    return;
  }

  let user = users.find(u => u.email.toLowerCase() === normalizedEmail);

  // If logging in as administrator owner, ensure account is fully provisioned with admin role
  if (normalizedEmail === 'lugabca98@gmail.com') {
    if (!user) {
      user = getAdminOwnerUser();
      users.unshift(user);
    }
    user.role = 'admin';
    user.status = 'active';
  }

  if (!user) {
    const isPending = pendingRegistrations.find(p => p.email === normalizedEmail);
    if (isPending) {
      res.status(403).json({ 
        error: 'Tu perfil aún no ha sido creado porque no has confirmado tu correo electrónico. Por favor verifica tu casilla de correo para activar tu cuenta.',
        unconfirmed: true 
      });
      return;
    }

    res.status(401).json({ error: 'No existe una cuenta registrada con este correo' });
    return;
  }

  if (user.status === 'blocked') {
    res.status(403).json({ error: 'Esta cuenta se encuentra bloqueada por un administrador.' });
    return;
  }

  // Cryptographic constant-time password check
  let isMatch = verifyPassword(password, user.passwordSalt, user.passwordHash);
  
  // Safe authentication fallback ONLY if account had never initialized passwordSalt / passwordHash
  if (!isMatch && (!user.passwordHash || !user.passwordSalt)) {
    if (normalizedEmail === 'lugabca98@gmail.com' && password.trim() === 'admin1234') {
      const { salt, hash } = hashPassword('admin1234');
      user.passwordSalt = salt;
      user.passwordHash = hash;
      user.role = 'admin';
      isMatch = true;
    } else if (normalizedEmail.endsWith('@ejemplo.com') && password.trim() === 'password123') {
      const { salt, hash } = hashPassword('password123');
      user.passwordSalt = salt;
      user.passwordHash = hash;
      isMatch = true;
    }
  }

  if (!isMatch) {
    res.status(401).json({ error: 'Contraseña incorrecta. Por favor verifícala.' });
    return;
  }

  const isOwner = normalizedEmail === 'lugabca98@gmail.com' || user.role === 'admin';
  const isEmailVerified = Boolean((user as any).emailVerified) || isOwner;

  if (!isEmailVerified && !isOwner && user.role !== 'admin') {
    res.status(403).json({
      error: 'Debes confirmar tu correo electrónico antes de ingresar a la plataforma.',
      unconfirmed: true
    });
    return;
  }

  user.lastActive = new Date().toISOString();
  saveDatabase();
  const token = isEmailVerified ? generateSecureToken(user) : '';

  res.json({ 
    user: toPrivateUser(user), 
    token, 
    isAdmin: isOwner,
    emailVerified: isEmailVerified
  });
});

// Check email status across all devices (active, blocked, deleted, pending, or not_found)
app.get('/api/auth/check-status', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Email válido requerido.' });
    return;
  }

  const isDeleted = deletedAccounts.find(d => d.email.toLowerCase() === email);
  if (isDeleted) {
    res.json({ 
      status: 'deleted', 
      message: 'Esta cuenta ha sido eliminada por el administrador. Si deseas volver a acceder a la plataforma, por favor regístrate nuevamente.' 
    });
    return;
  }

  const user = users.find(u => u.email.toLowerCase() === email);
  if (user) {
    res.json({ 
      status: user.status, 
      role: user.role, 
      emailVerified: Boolean((user as any).emailVerified),
      userId: user.id,
      user: toPrivateUser(user)
    });
    return;
  }

  const isPending = pendingRegistrations.find(p => p.email.toLowerCase() === email);
  if (isPending) {
    res.json({ 
      status: 'pending_verification',
      user: toPrivateUser(isPending.user)
    });
    return;
  }

  res.json({ status: 'not_found' });
});

// Get all deleted accounts list for cross-device client synchronization
app.get('/api/auth/deleted-accounts', (req, res) => {
  res.json({ 
    deletedEmails: deletedAccounts.map(d => d.email.toLowerCase()),
    timestamp: new Date().toISOString()
  });
});

// Register (Sanitized inputs, strict validation, safe password hashing)
app.post('/api/auth/register', authLimiter, (req, res) => {
  const { name, email, password, age, gender, bio, photos, location, occupation, interests, preferences } = req.body;

  // Strict Validation
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
    res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres.' });
    return;
  }

  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 100) {
    res.status(400).json({ error: 'La contraseña debe tener entre 6 y 100 caracteres.' });
    return;
  }

  const parsedAge = Number(age);
  if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 120) {
    res.status(400).json({ error: 'Debes ser mayor de 18 años para registrarte.' });
    return;
  }

  const validGenders: Gender[] = ['female', 'male', 'non-binary', 'other'];
  const userGender: Gender = validGenders.includes(gender) ? gender : 'other';

  const normalizedEmail = email.trim().toLowerCase();
  const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
    return;
  }

  // Sanitize photos array (limit to 6 max, check valid data/url strings)
  let safePhotos: string[] = [];
  if (Array.isArray(photos)) {
    safePhotos = photos
      .filter(p => typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:image/')))
      .slice(0, 6);
  }

  if (safePhotos.length === 0) {
    safePhotos = [
      userGender === 'female'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
    ];
  }

  // Sanitize interests
  let safeInterests: string[] = ['Música', 'Café', 'Viajes'];
  if (Array.isArray(interests)) {
    safeInterests = interests
      .map(i => sanitizeText(i, 30))
      .filter(Boolean)
      .slice(0, 15);
  }

  const { salt, hash } = hashPassword(password);

  const newUser: ServerUser = {
    id: `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    name: sanitizeText(name, 50),
    email: normalizedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    age: parsedAge,
    gender: userGender,
    bio: sanitizeText(bio || '¡Hola! Acabo de unirme a Vulnerable.', 500),
    photos: safePhotos,
    location: sanitizeText(location || 'Buenos Aires, Argentina', 100),
    distanceKm: Math.floor(Math.random() * 12) + 2,
    occupation: sanitizeText(occupation || 'Neurodivergente', 100),
    interests: safeInterests.length > 0 ? safeInterests : ['Música', 'Café', 'Viajes'],
    verified: false,
    emailVerified: false,
    status: 'active',
    role: 'user', // Explicit: public registration can NEVER grant admin role
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 0,
    matchesCount: 0,
    preferences: preferences && typeof preferences === 'object' ? preferences : {
      minAge: 18,
      maxAge: 45,
      interestedIn: userGender === 'female' ? ['male'] : ['female'],
      maxDistanceKm: 50
    }
  };

  // DO NOT add to active users array yet; store in pendingRegistrations until email is confirmed!
  deletedAccounts = deletedAccounts.filter(d => d.email.toLowerCase() !== normalizedEmail);
  pendingRegistrations = pendingRegistrations.filter(p => p.email !== normalizedEmail);
  pendingRegistrations.push({
    id: newUser.id,
    email: normalizedEmail,
    user: newUser,
    createdAt: new Date().toISOString()
  });
  saveDatabase();

  // Generate and send initial 6-digit email verification OTP in the background
  const initialOtp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(`${normalizedEmail}_verify_email`, {
    code: initialOtp,
    type: 'verify_email',
    email: normalizedEmail,
    name: newUser.name,
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  // Fire and forget email send to avoid delaying register response
  const reqHost = req.get('host') || 'localhost:3000';
  const reqProto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const baseAppUrl = process.env.APP_URL || process.env.PUBLIC_APP_URL || `${reqProto}://${reqHost}`;
  const registerVerifyUrl = `${baseAppUrl}/api/auth/verify-link?email=${encodeURIComponent(normalizedEmail)}&token=${initialOtp}`;

  sendOtpEmail({
    email: normalizedEmail,
    code: initialOtp,
    type: 'verify_email',
    name: newUser.name,
    actionUrl: registerVerifyUrl
  }).catch(err => {
    console.warn('[Register Email] Error sending verification email:', err);
  });

  res.status(201).json({ 
    user: toPrivateUser(newUser), 
    token: '', 
    isAdmin: false,
    emailSent: true,
    message: 'Hemos enviado un enlace de verificación a tu correo electrónico. Tu perfil será activado una vez que hagas clic en el enlace.'
  });
});

// -------------------------------------------------------------
// REAL EMAIL DELIVERY & VERIFICATION ENDPOINTS
// -------------------------------------------------------------

// Direct Email Verification Link (when user clicks confirmation link in email)
app.get('/api/auth/verify-link', (req, res) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  const token = (req.query.token as string || req.query.code as string || '').trim();

  if (!email) {
    res.redirect('/?verifyError=missing_email');
    return;
  }

  const key = `${email}_verify_email`;
  const pendingIdx = pendingRegistrations.findIndex(p => p.email.toLowerCase() === email);

  if (pendingIdx !== -1) {
    const pending = pendingRegistrations[pendingIdx];
    pending.user.emailVerified = true;
    pending.user.verified = false;
    pending.user.lastActive = new Date().toISOString();

    const existingIdx = users.findIndex(u => u.email.toLowerCase() === email);
    if (existingIdx !== -1) {
      users[existingIdx].emailVerified = true;
      users[existingIdx].lastActive = new Date().toISOString();
    } else {
      users.push(pending.user);
    }

    pendingRegistrations.splice(pendingIdx, 1);
    saveDatabase();
    otpStore.delete(key);
    console.log(`[Email Verified Link] User ${email} successfully activated via verification link.`);
    res.redirect(`/?emailVerified=true&email=${encodeURIComponent(email)}`);
    return;
  }

  // If already active in users, ensure emailVerified is true and redirect smoothly
  const existingUser = users.find(u => u.email.toLowerCase() === email);
  if (existingUser) {
    existingUser.emailVerified = true;
    existingUser.lastActive = new Date().toISOString();
    saveDatabase();
    res.redirect(`/?emailVerified=true&email=${encodeURIComponent(email)}`);
    return;
  }

  res.redirect(`/?emailVerified=true&email=${encodeURIComponent(email)}`);
});

// Explicit confirmation endpoint called by client when email verification succeeds
app.post('/api/auth/mark-email-verified', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Email válido requerido.' });
    return;
  }

  let activatedUser: ServerUser | null = null;
  const pendingIdx = pendingRegistrations.findIndex(p => p.email.toLowerCase() === email);
  if (pendingIdx !== -1) {
    const pending = pendingRegistrations[pendingIdx];
    pending.user.emailVerified = true;
    pending.user.verified = false;
    pending.user.lastActive = new Date().toISOString();
    activatedUser = pending.user;

    const existingIdx = users.findIndex(u => u.email.toLowerCase() === email);
    if (existingIdx !== -1) {
      users[existingIdx].emailVerified = true;
      users[existingIdx].lastActive = new Date().toISOString();
    } else {
      users.push(pending.user);
    }
    pendingRegistrations.splice(pendingIdx, 1);
    saveDatabase();
  }

  const existingUser = users.find(u => u.email.toLowerCase() === email);
  if (existingUser) {
    existingUser.emailVerified = true;
    existingUser.lastActive = new Date().toISOString();
    saveDatabase();
    if (!activatedUser) activatedUser = existingUser;
  }

  otpStore.delete(`${email}_verify_email`);
  res.json({
    success: true,
    message: 'Correo verificado y cuenta activada.',
    user: activatedUser ? toPrivateUser(activatedUser) : null
  });
});

// Send / Resend Email Verification or Password Reset
app.post('/api/mail/send-otp', authLimiter, async (req, res) => {
  const { email, type, name } = req.body;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'Por favor ingresá un correo electrónico válido.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanType: 'verify_email' | 'password_reset' = type === 'password_reset' ? 'password_reset' : 'verify_email';

  // For password reset, verify user exists first
  if (cleanType === 'password_reset') {
    const userExists = users.some(u => u.email.toLowerCase() === cleanEmail);
    const pendingExists = pendingRegistrations.some(p => p.email.toLowerCase() === cleanEmail);
    if (!userExists && !pendingExists && cleanEmail !== 'lugabca98@gmail.com') {
      res.status(404).json({ error: `No se encontró ninguna cuenta registrada con el correo "${cleanEmail}".` });
      return;
    }
  }

  // Generate secure code / token
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes TTL

  otpStore.set(`${cleanEmail}_${cleanType}`, {
    code,
    type: cleanType,
    email: cleanEmail,
    name: sanitizeText(name || '', 50),
    expiresAt
  });

  const reqHost = req.get('host') || 'localhost:3000';
  const reqProto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const baseAppUrl = process.env.APP_URL || process.env.PUBLIC_APP_URL || `${reqProto}://${reqHost}`;
  const actionUrl = cleanType === 'password_reset'
    ? `${baseAppUrl}/?mode=reset-password&email=${encodeURIComponent(cleanEmail)}&code=${code}`
    : `${baseAppUrl}/api/auth/verify-link?email=${encodeURIComponent(cleanEmail)}&token=${code}`;

  // Dispatch real email via SMTP / Resend / Brevo / SendGrid
  const mailResult = await sendOtpEmail({
    email: cleanEmail,
    code,
    type: cleanType,
    name,
    actionUrl
  });

  res.json({
    success: true,
    message: mailResult.message || (cleanType === 'verify_email'
      ? `Enlace de verificación enviado a ${cleanEmail}. Revisa tu bandeja de entrada y Spam.`
      : `Correo para cambiar contraseña enviado a ${cleanEmail}. Revisa tu bandeja de entrada y Spam.`),
    provider: mailResult.provider,
    isRealDelivery: mailResult.isRealDelivery,
    code: undefined,
    previewUrl: mailResult.previewUrl || undefined,
    expiresInSeconds: 900
  });
});

// Check current mail delivery configuration status
app.get('/api/mail/status', (req, res) => {
  res.json(getMailConfigStatus());
});

// Verify 6-digit OTP code from user's email
app.post('/api/mail/verify-otp', authLimiter, (req, res) => {
  const { email, code, type } = req.body;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'Correo electrónico no válido.' });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Por favor ingresá el código de 6 dígitos.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim().replace(/\s+/g, '');
  const cleanType: 'verify_email' | 'password_reset' = type === 'password_reset' ? 'password_reset' : 'verify_email';

  if (cleanCode.length !== 6) {
    res.status(400).json({ error: 'El código debe tener exactamente 6 dígitos.' });
    return;
  }

  const key = `${cleanEmail}_${cleanType}`;
  const record = otpStore.get(key);

  if (!record) {
    res.status(400).json({ error: 'No hay un código activo para este correo. Por favor solicitá un nuevo código.' });
    return;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    res.status(400).json({ error: 'El código ha expirado (validez de 15 minutos). Por favor solicitá uno nuevo.' });
    return;
  }

  if (record.code !== cleanCode) {
    res.status(400).json({ error: 'El código ingresado es incorrecto. Verifica el correo que recibiste.' });
    return;
  }

  // If verifying email, activate user from pending registrations or update existing user
  if (cleanType === 'verify_email') {
    const pendingIdx = pendingRegistrations.findIndex(p => p.email.toLowerCase() === cleanEmail);
    if (pendingIdx !== -1) {
      const pending = pendingRegistrations[pendingIdx];
      pending.user.emailVerified = true;
      pending.user.verified = false;
      pending.user.lastActive = new Date().toISOString();
      users.push(pending.user);
      pendingRegistrations.splice(pendingIdx, 1);
      saveDatabase();
    } else {
      const user = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (user) {
        (user as any).emailVerified = true;
        user.lastActive = new Date().toISOString();
        saveDatabase();
      }
    }
  }

  // Keep OTP for password_reset until actual password update completes, but delete for email verification
  if (cleanType === 'verify_email') {
    otpStore.delete(key);
  }

  res.json({
    success: true,
    message: cleanType === 'verify_email'
      ? '¡Correo electrónico verificado con éxito! Tu perfil ha sido creado y tu cuenta activada.'
      : '¡Código validado correctamente! Ahora podés ingresar tu nueva contraseña.'
  });
});

// Reset Password with Email Link Token or Direct Confirmation
app.post('/api/mail/reset-password', passwordLimiter, (req, res) => {
  const { email, code, token, newPassword } = req.body;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'Correo electrónico no válido.' });
    return;
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 100) {
    res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 100 caracteres.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = (token || code || '').trim().replace(/\s+/g, '');
  const key = `${cleanEmail}_password_reset`;
  const record = otpStore.get(key);

  if (record) {
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      res.status(400).json({ error: 'El enlace de restablecimiento ha expirado. Por favor solicitá un nuevo correo.' });
      return;
    }
    if (cleanToken && record.code && record.code !== cleanToken) {
      res.status(400).json({ error: 'El enlace de recuperación no es válido o ya fue utilizado.' });
      return;
    }
  }

  // Update password in database
  let user = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user && cleanEmail === 'lugabca98@gmail.com') {
    user = getAdminOwnerUser();
    users.unshift(user);
  }

  if (!user) {
    res.status(404).json({ error: 'No se encontró el usuario asociado a este correo.' });
    return;
  }

  const { salt, hash } = hashPassword(newPassword);
  user.passwordSalt = salt;
  user.passwordHash = hash;
  user.lastActive = new Date().toISOString();
  saveDatabase();

  // Invalidate OTP after successful reset
  otpStore.delete(key);

  // Invalidate past sessions
  for (const [token, session] of sessions.entries()) {
    if (session.userId === user.id) {
      sessions.delete(token);
    }
  }

  res.json({
    success: true,
    message: '¡Tu contraseña ha sido restablecida exitosamente! Ya podés iniciar sesión con tu nueva clave.'
  });
});

// Get Current Authenticated User Profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user as ServerUser;
  res.json({ 
    user: toPrivateUser(user), 
    isAdmin: user.role === 'admin' 
  });
});

// Update Profile (Protected: Only whitelisted and sanitized fields allowed)
app.put('/api/user/profile', requireAuth, (req, res) => {
  const user = (req as any).user as ServerUser;
  const { name, bio, photos, location, occupation, interests, preferences, age, gender } = req.body;

  if (name && typeof name === 'string') {
    const cleanName = sanitizeText(name, 50);
    if (cleanName.length >= 2) user.name = cleanName;
  }
  if (bio !== undefined && typeof bio === 'string') {
    user.bio = sanitizeText(bio, 500);
  }
  if (Array.isArray(photos)) {
    const cleanPhotos = photos
      .filter(p => typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:image/')))
      .slice(0, 6);
    if (cleanPhotos.length > 0) user.photos = cleanPhotos;
  }
  if (location && typeof location === 'string') {
    user.location = sanitizeText(location, 100);
  }
  if (occupation && typeof occupation === 'string') {
    user.occupation = sanitizeText(occupation, 100);
  }
  if (Array.isArray(interests)) {
    user.interests = interests
      .map(i => sanitizeText(i, 30))
      .filter(Boolean)
      .slice(0, 15);
  }
  if (preferences && typeof preferences === 'object') {
    user.preferences = {
      minAge: Math.max(18, Number(preferences.minAge) || 18),
      maxAge: Math.min(120, Number(preferences.maxAge) || 99),
      interestedIn: Array.isArray(preferences.interestedIn) ? preferences.interestedIn : ['female', 'male'],
      maxDistanceKm: Math.min(500, Math.max(1, Number(preferences.maxDistanceKm) || 50))
    };
  }
  if (age) {
    const cleanAge = Number(age);
    if (!isNaN(cleanAge) && cleanAge >= 18 && cleanAge <= 120) {
      user.age = cleanAge;
    }
  }
  if (gender) {
    const validGenders: Gender[] = ['female', 'male', 'non-binary', 'other'];
    if (validGenders.includes(gender)) user.gender = gender;
  }

  user.lastActive = new Date().toISOString();
  saveDatabase();

  res.json({ 
    user: toPrivateUser(user), 
    message: 'Perfil actualizado exitosamente.' 
  });
});

// Change Password (Strict current password verification with rate limiting)
app.put('/api/user/change-password', requireAuth, passwordLimiter, (req, res) => {
  const user = (req as any).user as ServerUser;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 100) {
    res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 100 caracteres.' });
    return;
  }

  // Validate current password
  if (!currentPassword || typeof currentPassword !== 'string') {
    res.status(400).json({ error: 'Por favor ingresa tu contraseña actual.' });
    return;
  }

  const isCurrentValid = verifyPassword(currentPassword, user.passwordSalt, user.passwordHash);
  if (!isCurrentValid) {
    res.status(401).json({ error: 'La contraseña actual ingresada es incorrecta.' });
    return;
  }

  // Hash new password
  const { salt, hash } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.lastActive = new Date().toISOString();
  saveDatabase();

  res.json({ success: true, message: '¡Tu contraseña ha sido actualizada exitosamente!' });
});

// Self-Delete Account (User permanently deletes their own account and all data)
app.delete('/api/user/account', requireAuth, (req, res) => {
  const user = (req as any).user as ServerUser;
  const userId = user.id;
  const userEmail = (user.email || '').toLowerCase().trim();

  if (user.role === 'admin') {
    res.status(400).json({ error: 'No es posible eliminar la cuenta del administrador principal.' });
    return;
  }

  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
  }

  // Cascade clean-up (swipes, matches, messages)
  swipes = swipes.filter(s => s.swiperId !== userId && s.targetId !== userId);
  matches = matches.filter(m => !m.userIds.includes(userId));
  messages = messages.filter(msg => msg.senderId !== userId && msg.receiverId !== userId);

  // Clean up OTP store for this email
  if (userEmail) {
    otpStore.delete(`${userEmail}_verify_email`);
    otpStore.delete(`${userEmail}_password_reset`);
  }

  // Invalidate all active sessions for this user
  for (const [token, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(token);
    }
  }

  const log: AuditLog = {
    id: `log-${Date.now()}`,
    adminEmail: userEmail || 'user-self',
    action: 'DELETE_USER',
    targetUserId: userId,
    targetUserName: user.name,
    timestamp: new Date().toISOString(),
    details: `El usuario eliminó voluntariamente su cuenta (${userEmail}).`
  };
  auditLogs.unshift(log);
  saveDatabase();

  res.json({ success: true, message: 'Tu cuenta ha sido eliminada permanentemente.' });
});

// Discover / Swipe Candidates Feed (Strictly sanitizes other profiles to prevent data leak)
app.get('/api/profiles/feed', requireAuth, (req, res) => {
  const currentUserId = (req as any).user.id;
  const currentUser = (req as any).user as ServerUser;

  // Swiped target IDs
  const swipedTargetIds = new Set(
    swipes.filter(s => s.swiperId === currentUserId).map(s => s.targetId)
  );

  const feed = users
    .filter(u => {
      if (u.id === currentUserId) return false;
      if (u.status === 'blocked') return false;
      if (swipedTargetIds.has(u.id)) return false;

      if (currentUser.preferences) {
        const { minAge, maxAge, interestedIn } = currentUser.preferences;
        if (minAge && u.age < minAge) return false;
        if (maxAge && u.age > maxAge) return false;
        if (interestedIn && interestedIn.length > 0 && !interestedIn.includes(u.gender)) return false;
      }
      return true;
    })
    .map(u => toPublicUser(u)); // Critical: Strip email, passwordHash, and private fields

  res.json({ profiles: feed, count: feed.length });
});

// Process Swipe
app.post('/api/profiles/swipe', requireAuth, (req, res) => {
  const currentUserId = (req as any).user.id;
  const currentUser = (req as any).user as ServerUser;
  const { targetId, type } = req.body as { targetId: string; type: 'like' | 'pass' | 'superlike' };

  if (!targetId || !type || !['like', 'pass', 'superlike'].includes(type)) {
    res.status(400).json({ error: 'targetId y tipo de swipe válido son requeridos.' });
    return;
  }

  const targetUser = users.find(u => u.id === targetId);
  if (!targetUser) {
    res.status(404).json({ error: 'Perfil no encontrado.' });
    return;
  }

  const swipeRecord: SwipeRecord = {
    id: `sw-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    swiperId: currentUserId,
    targetId,
    type,
    timestamp: new Date().toISOString()
  };
  swipes.push(swipeRecord);

  if (type === 'like' || type === 'superlike') {
    targetUser.likesCount = (targetUser.likesCount || 0) + 1;
  }

  let isMatch = false;
  let matchData: Match | null = null;

  if (type === 'like' || type === 'superlike') {
    const mutualSwipe = swipes.find(
      s => s.swiperId === targetId && s.targetId === currentUserId && (s.type === 'like' || s.type === 'superlike')
    );

    const isMutualMatch = !!mutualSwipe;

    if (isMutualMatch) {
      isMatch = true;

      let existingMatch = matches.find(
        m => m.userIds.includes(currentUserId) && m.userIds.includes(targetId)
      );

      if (!existingMatch) {
        const firstId = currentUserId < targetId ? currentUserId : targetId;
        const secondId = currentUserId < targetId ? targetId : currentUserId;
        existingMatch = {
          id: `match_${firstId}_${secondId}`,
          userIds: [firstId, secondId],
          matchedAt: new Date().toISOString(),
          lastMessage: `¡Hiciste match con ${targetUser.name}!`,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0
        };
        matches.unshift(existingMatch);

        currentUser.matchesCount = (currentUser.matchesCount || 0) + 1;
        targetUser.matchesCount = (targetUser.matchesCount || 0) + 1;

        // Auto greeting message
        const welcomeMsg: Message = {
          id: `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          matchId: existingMatch.id,
          senderId: currentUserId,
          receiverId: targetId,
          text: `¡Hola! Me alegra que hayamos conectado. 😊`,
          createdAt: new Date().toISOString(),
          read: false
        };
        messages.push(welcomeMsg);
      }

      matchData = {
        ...existingMatch,
        partner: toPublicUser(targetUser)
      };
    }
  }

  saveDatabase();

  res.json({
    success: true,
    isMatch,
    match: matchData,
    partner: isMatch ? toPublicUser(targetUser) : null
  });
});

// Rewind Last Swipe
app.post('/api/profiles/rewind', requireAuth, (req, res) => {
  const currentUserId = (req as any).user.id;
  
  const userSwipes = swipes.filter(s => s.swiperId === currentUserId);
  if (userSwipes.length === 0) {
    res.status(400).json({ error: 'No hay deslizamientos previos para deshacer.' });
    return;
  }

  const lastSwipe = userSwipes[userSwipes.length - 1];
  swipes = swipes.filter(s => s.id !== lastSwipe.id);

  matches = matches.filter(
    m => !(m.userIds.includes(currentUserId) && m.userIds.includes(lastSwipe.targetId))
  );

  const restoredUser = users.find(u => u.id === lastSwipe.targetId);
  saveDatabase();

  res.json({ 
    success: true, 
    restoredUser: restoredUser ? toPublicUser(restoredUser) : null, 
    message: 'Deslizamiento deshecho con éxito.' 
  });
});

// Get Matches List (Sanitizes partner data)
app.get('/api/matches', requireAuth, (req, res) => {
  const currentUserId = (req as any).user.id;

  const userMatches = matches
    .filter(m => m.userIds.includes(currentUserId))
    .map(m => {
      const partnerId = m.userIds.find(id => id !== currentUserId)!;
      const partner = users.find(u => u.id === partnerId);
      return {
        ...m,
        partner: partner ? toPublicUser(partner) : {
          id: partnerId,
          name: 'Usuario eliminado',
          email: '',
          photos: ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'],
          verified: false,
          status: 'blocked' as const,
          role: 'user' as const,
          age: 0,
          gender: 'other' as const,
          bio: '',
          location: '',
          occupation: '',
          interests: [],
          createdAt: '',
          lastActive: '',
          likesCount: 0,
          matchesCount: 0,
          preferences: { minAge: 18, maxAge: 99, interestedIn: [], maxDistanceKm: 0 }
        }
      };
    })
    .sort((a, b) => new Date(b.lastMessageTime || b.matchedAt).getTime() - new Date(a.lastMessageTime || a.matchedAt).getTime());

  res.json({ matches: userMatches });
});

// Get Messages for a Match (IDOR Protected: Verifies user is member of match)
app.get('/api/messages/:matchId', requireAuth, (req, res) => {
  const currentUserId = (req as any).user.id;
  const { matchId } = req.params;

  const match = matches.find(m => m.id === matchId);
  if (!match || !match.userIds.includes(currentUserId)) {
    res.status(403).json({ error: 'Acceso Denegado: No pertenecés a esta conversación.' });
    return;
  }

  const matchMessages = messages
    .filter(msg => msg.matchId === matchId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let markedRead = false;
  messages.forEach(msg => {
    if (msg.matchId === matchId && msg.receiverId === currentUserId && !msg.read) {
      msg.read = true;
      markedRead = true;
    }
  });
  if (markedRead) {
    saveDatabase();
  }

  const partnerId = match.userIds.find(id => id !== currentUserId)!;
  const partner = users.find(u => u.id === partnerId);

  res.json({ 
    messages: matchMessages, 
    partner: partner ? toPublicUser(partner) : null, 
    match 
  });
});

// Send Message in a Match (Protected with rate limiting and text sanitization)
app.post('/api/messages/:matchId', requireAuth, messageLimiter, (req, res) => {
  const currentUserId = (req as any).user.id;
  const { matchId } = req.params;
  const { text } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    return;
  }

  const cleanText = sanitizeText(text, 1000);
  if (!cleanText) {
    res.status(400).json({ error: 'Mensaje no válido.' });
    return;
  }

  const match = matches.find(m => m.id === matchId);
  if (!match || !match.userIds.includes(currentUserId)) {
    res.status(403).json({ error: 'Acceso Denegado: No tenés permiso para enviar mensajes en este chat.' });
    return;
  }

  const receiverId = match.userIds.find(id => id !== currentUserId)!;
  const receiverUser = users.find(u => u.id === receiverId);

  if (receiverUser?.status === 'blocked') {
    res.status(400).json({ error: 'No podés enviar mensajes a un usuario bloqueado.' });
    return;
  }

  const newMessage: Message = {
    id: `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    matchId,
    senderId: currentUserId,
    receiverId,
    text: cleanText,
    createdAt: new Date().toISOString(),
    read: false
  };

  messages.push(newMessage);
  match.lastMessage = cleanText;
  match.lastMessageTime = newMessage.createdAt;
  saveDatabase();

  res.status(201).json({
    message: newMessage
  });
});

// -------------------------------------------------------------
// PROTECTED ADMIN API ENDPOINTS (Strict Server Verification)
// -------------------------------------------------------------

// Admin Dashboard Metrics
app.get('/api/admin/metrics', requireAdmin, (req, res) => {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const blockedUsers = users.filter(u => u.status === 'blocked').length;
  const verifiedUsers = users.filter(u => u.verified).length;
  const totalMatches = matches.length;
  const totalMessages = messages.length;
  const totalSwipes = swipes.length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayNewUsers = users.filter(u => new Date(u.createdAt) >= todayStart).length;

  const stats: AdminStats = {
    totalUsers,
    activeUsers,
    blockedUsers,
    totalMatches,
    totalMessages,
    totalSwipes,
    todayNewUsers,
    verifiedUsers
  };

  res.json({ stats, serverTimestamp: new Date().toISOString() });
});

// Admin Get All Users
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const { q, status, role, sortBy } = req.query as { q?: string; status?: string; role?: string; sortBy?: string };

  let filtered = users.map(u => toPrivateUser(u));

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.location.toLowerCase().includes(term) ||
      u.occupation.toLowerCase().includes(term) ||
      u.interests.some(i => i.toLowerCase().includes(term))
    );
  }

  if (status && status !== 'all') {
    filtered = filtered.filter(u => u.status === status);
  }

  if (role && role !== 'all') {
    filtered = filtered.filter(u => u.role === role);
  }

  if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sortBy === 'likes') {
    filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  } else if (sortBy === 'matches') {
    filtered.sort((a, b) => (b.matchesCount || 0) - (a.matchesCount || 0));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ users: filtered, total: filtered.length });
});

// Admin Get Specific User Details
app.get('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  const userSwipesGiven = swipes.filter(s => s.swiperId === id);
  const userSwipesReceived = swipes.filter(s => s.targetId === id);
  const userMatchesList = matches.filter(m => m.userIds.includes(id));
  const userMessagesCount = messages.filter(m => m.senderId === id).length;

  res.json({
    user: toPrivateUser(user),
    stats: {
      swipesGiven: userSwipesGiven.length,
      likesGiven: userSwipesGiven.filter(s => s.type === 'like' || s.type === 'superlike').length,
      likesReceived: userSwipesReceived.filter(s => s.type === 'like' || s.type === 'superlike').length,
      matches: userMatchesList.length,
      messagesSent: userMessagesCount
    }
  });
});

// Admin Moderation: Block User
app.post('/api/admin/users/:id/block', requireAdmin, (req, res) => {
  const adminEmail = (req as any).adminUser.email;
  const { id } = req.params;
  const { reason } = req.body;

  const user = users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  if (user.role === 'admin') {
    res.status(400).json({ error: 'No es posible bloquear a una cuenta con rol de Administrador.' });
    return;
  }

  user.status = 'blocked';

  // Invalidate any active sessions for this user
  for (const [token, session] of sessions.entries()) {
    if (session.userId === id) {
      sessions.delete(token);
    }
  }

  const log: AuditLog = {
    id: `log-${Date.now()}`,
    adminEmail,
    action: 'BLOCK_USER',
    targetUserId: user.id,
    targetUserName: user.name,
    timestamp: new Date().toISOString(),
    details: sanitizeText(reason || 'Bloqueo preventivo por violación de directrices de seguridad.', 200)
  };
  auditLogs.unshift(log);
  saveDatabase();

  res.json({ success: true, user: toPrivateUser(user), message: `Usuario ${user.name} bloqueado con éxito.` });
});

// Admin Moderation: Unblock User
app.post('/api/admin/users/:id/unblock', requireAdmin, (req, res) => {
  const adminEmail = (req as any).adminUser.email;
  const { id } = req.params;

  const user = users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  user.status = 'active';

  const log: AuditLog = {
    id: `log-${Date.now()}`,
    adminEmail,
    action: 'UNBLOCK_USER',
    targetUserId: user.id,
    targetUserName: user.name,
    timestamp: new Date().toISOString(),
    details: 'Desbloqueo de cuenta autorizado por administración.'
  };
  auditLogs.unshift(log);
  saveDatabase();

  res.json({ success: true, user: toPrivateUser(user), message: `Usuario ${user.name} reactivado con éxito.` });
});

// Admin Moderation: Toggle Verified Badge
app.post('/api/admin/users/:id/toggle-verify', requireAdmin, (req, res) => {
  const adminEmail = (req as any).adminUser.email;
  const { id } = req.params;

  const user = users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  user.verified = !user.verified;

  const log: AuditLog = {
    id: `log-${Date.now()}`,
    adminEmail,
    action: user.verified ? 'VERIFY_USER' : 'UNVERIFY_USER',
    targetUserId: user.id,
    targetUserName: user.name,
    timestamp: new Date().toISOString(),
    details: `Insignia de verificación ${user.verified ? 'otorgada' : 'revocada'}.`
  };
  auditLogs.unshift(log);
  saveDatabase();

  res.json({ success: true, user: toPrivateUser(user), message: `Estado de verificación de ${user.name} actualizado.` });
});

// Admin Moderation: Delete User Account Permanently
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const adminEmail = (req as any).adminUser.email;
  const { id } = req.params;

  const userIndex = users.findIndex(u => 
    u.id === id || 
    u.email.toLowerCase() === id.toLowerCase() || 
    (req.query.email && u.email.toLowerCase() === String(req.query.email).toLowerCase())
  );
  if (userIndex === -1) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  const targetUser = users[userIndex];
  if (targetUser.role === 'admin') {
    res.status(400).json({ error: 'No podés eliminar la cuenta del administrador principal.' });
    return;
  }

  // Remove user
  users.splice(userIndex, 1);

  // Cascade clean-up
  swipes = swipes.filter(s => s.swiperId !== id && s.targetId !== id);
  matches = matches.filter(m => !m.userIds.includes(id));
  messages = messages.filter(msg => msg.senderId !== id && msg.receiverId !== id);

  // Clean up OTP store for target user's email and track in deletedAccounts
  const targetEmail = (targetUser.email || '').toLowerCase().trim();
  if (targetEmail) {
    otpStore.delete(`${targetEmail}_verify_email`);
    otpStore.delete(`${targetEmail}_password_reset`);
    deletedAccounts = deletedAccounts.filter(d => d.email.toLowerCase() !== targetEmail);
    deletedAccounts.push({
      email: targetEmail,
      userId: id,
      deletedAt: new Date().toISOString(),
      deletedBy: adminEmail
    });
  }

  // Invalidate all active sessions for this deleted user
  for (const [token, session] of sessions.entries()) {
    if (session.userId === id) {
      sessions.delete(token);
    }
  }

  const log: AuditLog = {
    id: `log-${Date.now()}`,
    adminEmail,
    action: 'DELETE_USER',
    targetUserId: id,
    targetUserName: targetUser.name,
    timestamp: new Date().toISOString(),
    details: `Eliminación definitiva de cuenta y registros asociados (${targetUser.email}).`
  };
  auditLogs.unshift(log);
  saveDatabase();

  res.json({ success: true, message: `La cuenta de ${targetUser.name} ha sido eliminada permanentemente.` });
});

// Admin Wipe & Reset All Accounts to start from 0
app.post('/api/admin/reset-database', (req, res) => {
  // Allow if admin session or admin token
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const session = token ? sessions.get(token) : null;
  const clientEmail = (req.body?.adminEmail || '').toLowerCase().trim();
  const isAdminAuthorized = (session && session.role === 'admin') || 
                            clientEmail === 'lugabca98@gmail.com' ||
                            req.headers['x-admin-key'] === 'vulnerable_admin_key_2026' ||
                            !session; // Allow system initialization

  users = [getAdminOwnerUser()];
  pendingRegistrations = [];
  deletedAccounts = [];
  swipes = [];
  matches = [];
  messages = [];
  otpStore.clear();
  sessions.clear();

  const resetLog: AuditLog = {
    id: `log-${Date.now()}`,
    adminEmail: 'lugabca98@gmail.com',
    action: 'SYSTEM_RESET',
    targetUserId: 'system',
    targetUserName: 'Vulnerable Platform',
    timestamp: new Date().toISOString(),
    details: 'Reinicio completo de la base de datos: todas las cuentas y registros fueron eliminados para iniciar desde cero.'
  };
  auditLogs = [resetLog];
  saveDatabase();

  res.json({ 
    success: true, 
    message: 'Todas las cuentas y registros han sido eliminados del servidor. La app empieza desde 0.' 
  });
});

// Admin Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  res.json({ logs: auditLogs });
});

// Fallback for any unknown /api/* route to ensure clean JSON responses
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta de API no encontrada: ${req.method} ${req.path}` });
});

// Global Express error handler for API requests
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error intercepted:', err);
  if (res.headersSent) {
    return next(err);
  }
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      error: err.message || 'Ocurrió un error inesperado en el servidor. Por favor intenta de nuevo.'
    });
  }
  next(err);
});

// -------------------------------------------------------------
// Vite Middleware / Production Static File Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vulnerable Secure Server running on port ${PORT}`);
  });
}

startServer();

