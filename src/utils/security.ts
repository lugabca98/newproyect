export const DEFAULT_ADMIN_EMAIL = 'lugabca98@gmail.com';

export interface DemoAccountConfig {
  email: string;
  name: string;
  primaryPass: string;
  role: 'admin' | 'user';
  description?: string;
}

export const DEMO_ACCOUNTS: DemoAccountConfig[] = [
  {
    email: 'lugabca98@gmail.com',
    name: 'Admin Propietario',
    primaryPass: 'admin1234',
    role: 'admin',
    description: 'Cuenta Propietario (Acceso total al Panel de Control)'
  },
  {
    email: 'valeria@ejemplo.com',
    name: 'Valeria Rivas',
    primaryPass: 'password123',
    role: 'user',
    description: 'TDAH creativa • Diseño & Café'
  },
  {
    email: 'lucas@ejemplo.com',
    name: 'Lucas Martínez',
    primaryPass: 'password123',
    role: 'user',
    description: 'TEA / Autismo • Programación & Escalada'
  },
  {
    email: 'camila@ejemplo.com',
    name: 'Camila Rossi',
    primaryPass: 'password123',
    role: 'user',
    description: 'Bipolaridad • Cine & Arquitectura'
  },
  {
    email: 'mateo@ejemplo.com',
    name: 'Mateo Fernández',
    primaryPass: 'password123',
    role: 'user',
    description: 'Depresión & TDAH • Fotografía'
  },
  {
    email: 'sofia@ejemplo.com',
    name: 'Sofía Benítez',
    primaryPass: 'password123',
    role: 'user',
    description: 'Altas Capacidades (AACC) • Running'
  },
  {
    email: 'ignacio@ejemplo.com',
    name: 'Ignacio Silva',
    primaryPass: 'password123',
    role: 'user',
    description: 'TOC & Bipolaridad • Música Jazz'
  },
  {
    email: 'elena@ejemplo.com',
    name: 'Elena Gómez',
    primaryPass: 'password123',
    role: 'user',
    description: 'Depresión & Ansiedad • Danza'
  }
];

export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode('vulnerable_auth_salt_2026_' + normalized);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  // Deterministic fallback
  let hash = 0;
  const str = 'vulnerable_auth_salt_2026_' + normalized;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

export function isPasswordValidForDemoAccount(email: string, plainPass: string): boolean {
  const cleanEmail = email.toLowerCase().trim();
  const cleanPass = plainPass.trim();

  // Strict verification for administrator owner account: requires the complete full password with numbers
  if (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
    return cleanPass === 'admin1234';
  }

  const demo = DEMO_ACCOUNTS.find(d => d.email.toLowerCase() === cleanEmail);
  if (!demo) return false;
  return demo.primaryPass === cleanPass;
}
