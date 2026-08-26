import { User, Match, Message, SwipeRecord, AuditLog, AdminStats } from './types';

const STORAGE_KEY_USERS = 'mv_db_users';
const STORAGE_KEY_SWIPES = 'mv_db_swipes';
const STORAGE_KEY_MATCHES = 'mv_db_matches';
const STORAGE_KEY_MESSAGES = 'mv_db_messages';
const STORAGE_KEY_LOGS = 'mv_db_logs';
const STORAGE_KEY_PASSWORDS = 'mv_db_passwords'; // email -> password

export const DEFAULT_ADMIN_EMAIL = 'lugabca98@gmail.com';
export const DEFAULT_ADMIN_PASS = 'admin1234';

const INITIAL_ADMIN: User = {
  id: 'admin-owner',
  name: 'Admin Propietario',
  email: DEFAULT_ADMIN_EMAIL,
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

const INITIAL_SEED_USERS: User[] = [
  INITIAL_ADMIN,
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
    const users = this.getStored<User[]>(STORAGE_KEY_USERS, []);
    if (users.length === 0) {
      this.setStored(STORAGE_KEY_USERS, INITIAL_SEED_USERS);
      this.setStored(STORAGE_KEY_MATCHES, INITIAL_MATCHES);
      this.setStored(STORAGE_KEY_MESSAGES, INITIAL_MESSAGES);
      this.setStored(STORAGE_KEY_LOGS, INITIAL_LOGS);
      
      const passwords: Record<string, string> = {
        [DEFAULT_ADMIN_EMAIL.toLowerCase()]: DEFAULT_ADMIN_PASS,
        'valeria@ejemplo.com': 'password123',
        'lucas@ejemplo.com': 'password123',
        'camila@ejemplo.com': 'password123',
        'mateo@ejemplo.com': 'password123',
        'sofia@ejemplo.com': 'password123',
        'ignacio@ejemplo.com': 'password123',
        'elena@ejemplo.com': 'password123'
      };
      this.setStored(STORAGE_KEY_PASSWORDS, passwords);
    } else {
      // Ensure admin exists with admin role
      const adminIdx = users.findIndex(u => u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
      if (adminIdx === -1) {
        users.unshift(INITIAL_ADMIN);
        this.setStored(STORAGE_KEY_USERS, users);
      } else {
        users[adminIdx].role = 'admin';
        users[adminIdx].status = 'active';
        this.setStored(STORAGE_KEY_USERS, users);
      }
      const passwords = this.getStored<Record<string, string>>(STORAGE_KEY_PASSWORDS, {});
      passwords[DEFAULT_ADMIN_EMAIL.toLowerCase()] = DEFAULT_ADMIN_PASS;
      this.setStored(STORAGE_KEY_PASSWORDS, passwords);
    }
  }

  getUsers(): User[] {
    this.init();
    return this.getStored<User[]>(STORAGE_KEY_USERS, INITIAL_SEED_USERS);
  }

  saveUsers(users: User[]): void {
    this.setStored(STORAGE_KEY_USERS, users);
  }

  getPassword(email: string): string | null {
    const passwords = this.getStored<Record<string, string>>(STORAGE_KEY_PASSWORDS, {});
    return passwords[email.toLowerCase()] || null;
  }

  setPassword(email: string, pass: string): void {
    const passwords = this.getStored<Record<string, string>>(STORAGE_KEY_PASSWORDS, {});
    passwords[email.toLowerCase()] = pass;
    this.setStored(STORAGE_KEY_PASSWORDS, passwords);
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
}

export const localDb = new LocalDatabaseStore();
localDb.init();
