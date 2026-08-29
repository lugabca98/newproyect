import { User, Match, Message, SwipeRecord, AuditLog, AdminStats, UserCredential } from './types';
import { DEFAULT_ADMIN_EMAIL, DEMO_ACCOUNTS, hashPassword, hashPasswordSync } from './utils/security';

const STORAGE_KEY_USERS = 'mv_db_users';
const STORAGE_KEY_SWIPES = 'mv_db_swipes';
const STORAGE_KEY_MATCHES = 'mv_db_matches';
const STORAGE_KEY_MESSAGES = 'mv_db_messages';
const STORAGE_KEY_LOGS = 'mv_db_logs';
const STORAGE_KEY_CREDENTIALS = 'mv_db_credentials';

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

export const INITIAL_SEED_USERS: User[] = [
  {
    id: 'user-valeria',
    name: 'Valeria Rivas',
    email: 'valeria@ejemplo.com',
    age: 24,
    gender: 'female',
    bio: 'TDAH creativa 🎨. Amante del café filtrado, hiperfoco en diseño, museos de arte contemporáneo y pasear a mi perrito Milo 🐶.',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Palermo, CABA',
    distanceKm: 3,
    occupation: 'TDAH & Ansiedad',
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
  },
  {
    id: 'user-lucas',
    name: 'Lucas Martínez',
    email: 'lucas@ejemplo.com',
    age: 27,
    gender: 'male',
    bio: 'En el espectro autista (TEA) & apasionado por la programación y la escalada en roca 🧗. Valoro la comunicación directa y honesta.',
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Recoleta, CABA',
    distanceKm: 5,
    occupation: 'Autismo / TEA & Hiperfoco',
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
  },
  {
    id: 'user-camila',
    name: 'Camila Rossi',
    email: 'camila@ejemplo.com',
    age: 26,
    gender: 'female',
    bio: 'Bipolar tipo II & mente creativa 🍷✨. Busco conexiones genuinas sin máscaras, charlas profundas y explorar nuevos restaurantes.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Belgrano, CABA',
    distanceKm: 7,
    occupation: 'Bipolaridad',
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
  },
  {
    id: 'user-mateo',
    name: 'Mateo Fernández',
    email: 'mateo@ejemplo.com',
    age: 29,
    gender: 'male',
    bio: 'Fotógrafo & navegando la depresión y el TDAH 📸. Los viajes y capturar luces me ayudan a reconectar con el presente.',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'San Telmo, CABA',
    distanceKm: 4,
    occupation: 'Depresión & TDAH',
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
  },
  {
    id: 'user-sofia',
    name: 'Sofía Benítez',
    email: 'sofia@ejemplo.com',
    age: 23,
    gender: 'female',
    bio: 'Altas capacidades (AACC) & maratonista aficionada 🏃‍♀️🩺. Curiosidad insaciable por aprender todo sobre el mundo.',
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Caballito, CABA',
    distanceKm: 6,
    occupation: 'Altas Capacidades (AACC)',
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
  },
  {
    id: 'user-ignacio',
    name: 'Ignacio Silva',
    email: 'ignacio@ejemplo.com',
    age: 31,
    gender: 'male',
    bio: 'TOC & Bipolaridad. Coleccionista de vinilos 🎧🍇. Fanático del jazz, los atardeceres y los entornos tranquilos con buena música.',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Nuñez, CABA',
    distanceKm: 8,
    occupation: 'TOC & Bipolaridad',
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
  },
  {
    id: 'user-elena',
    name: 'Elena Gómez',
    email: 'elena@ejemplo.com',
    age: 25,
    gender: 'female',
    bio: 'Navegando episodios de depresión & ansiedad social a través del movimiento y la danza contemporánea 🩰🌿. Empatía ante todo.',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Colegiales, CABA',
    distanceKm: 4,
    occupation: 'Depresión & Ansiedad',
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
  }
];

const INITIAL_MATCHES: Match[] = [
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

const INITIAL_MESSAGES: Message[] = [
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
    const creds = this.getStored<Record<string, UserCredential>>(STORAGE_KEY_CREDENTIALS, {});
    let credsModified = false;

    // Seed default credentials for demo accounts ONLY if not already saved (preserves user-changed passwords)
    DEMO_ACCOUNTS.forEach((acc) => {
      const emailLower = acc.email.toLowerCase();
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
      this.setStored(STORAGE_KEY_USERS, INITIAL_SEED_USERS);
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

      // Ensure admin exists with admin role
      const adminIdx = users.findIndex(u => u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
      if (adminIdx === -1) {
        users.unshift(INITIAL_ADMIN);
        changed = true;
      } else {
        users[adminIdx].role = 'admin';
        users[adminIdx].status = 'active';
        if (users[adminIdx].occupation !== INITIAL_ADMIN.occupation) {
          users[adminIdx].occupation = INITIAL_ADMIN.occupation;
          changed = true;
        }
      }

      if (changed) {
        this.setStored(STORAGE_KEY_USERS, users);
      }
    }
  }

  getUsers(): User[] {
    this.init();
    return this.getStored<User[]>(STORAGE_KEY_USERS, INITIAL_SEED_USERS);
  }

  saveUsers(users: User[]): void {
    this.setStored(STORAGE_KEY_USERS, users);
  }

  getSwipes(): SwipeRecord[] {
    return this.getStored<SwipeRecord[]>(STORAGE_KEY_SWIPES, []);
  }

  saveSwipes(swipes: SwipeRecord[]): void {
    this.setStored(STORAGE_KEY_SWIPES, swipes);
  }

  getMatches(): Match[] {
    return this.getStored<Match[]>(STORAGE_KEY_MATCHES, INITIAL_MATCHES);
  }

  saveMatches(matches: Match[]): void {
    this.setStored(STORAGE_KEY_MATCHES, matches);
  }

  getMessages(): Message[] {
    return this.getStored<Message[]>(STORAGE_KEY_MESSAGES, INITIAL_MESSAGES);
  }

  saveMessages(messages: Message[]): void {
    this.setStored(STORAGE_KEY_MESSAGES, messages);
  }

  getAuditLogs(): AuditLog[] {
    return this.getStored<AuditLog[]>(STORAGE_KEY_LOGS, INITIAL_LOGS);
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
}

export const localDb = new LocalDatabaseStore();
localDb.init();
