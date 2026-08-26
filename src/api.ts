import { User, Match, Message, AdminStats, AuditLog } from './types';

class ApiService {
  private token: string | null = localStorage.getItem('mv_auth_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('mv_auth_token', token);
    } else {
      localStorage.removeItem('mv_auth_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('mv_auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async login(email?: string, password?: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    this.setToken(data.token);
    return data;
  }

  async register(userData: Partial<User>): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrarse');
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ user: User; isAdmin: boolean }> {
    const res = await fetch('/api/auth/me', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al obtener perfil');
    return data;
  }

  async updateProfile(profileData: Partial<User>): Promise<{ user: User; message: string }> {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');
    return data;
  }

  async changePassword(currentPassword?: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/user/change-password', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
    return data;
  }

  async getFeed(): Promise<{ profiles: User[]; count: number }> {
    const res = await fetch('/api/profiles/feed', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar candidatos');
    return data;
  }

  async swipe(targetId: string, type: 'like' | 'pass' | 'superlike'): Promise<{
    success: boolean;
    isMatch: boolean;
    match: Match | null;
    partner: User | null;
  }> {
    const res = await fetch('/api/profiles/swipe', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ targetId, type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al procesar deslizamiento');
    return data;
  }

  async rewind(): Promise<{ success: boolean; restoredUser: User; message: string }> {
    const res = await fetch('/api/profiles/rewind', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al deshacer');
    return data;
  }

  async getMatches(): Promise<{ matches: Match[] }> {
    const res = await fetch('/api/matches', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar matches');
    return data;
  }

  async getMessages(matchId: string): Promise<{ messages: Message[]; partner: User; match: Match }> {
    const res = await fetch(`/api/messages/${matchId}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar mensajes');
    return data;
  }

  async sendMessage(matchId: string, text: string): Promise<{ message: Message; automatedReply?: Message }> {
    const res = await fetch(`/api/messages/${matchId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar mensaje');
    return data;
  }

  // --- ADMIN ENDPOINTS (PROTECTED ON SERVER VIA TOKEN) ---
  async getAdminMetrics(): Promise<{ stats: AdminStats; serverTimestamp: string }> {
    const res = await fetch('/api/admin/metrics', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No autorizado para acceder a métricas de administración');
    return data;
  }

  async getAdminUsers(params?: { q?: string; status?: string; role?: string; sortBy?: string }): Promise<{ users: User[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.role) query.set('role', params.role);
    if (params?.sortBy) query.set('sortBy', params.sortBy);

    const res = await fetch(`/api/admin/users?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No autorizado para gestionar usuarios');
    return data;
  }

  async getAdminUserDetail(id: string): Promise<{ user: User; stats: any }> {
    const res = await fetch(`/api/admin/users/${id}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar detalles de usuario');
    return data;
  }

  async blockUser(id: string, reason?: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`/api/admin/users/${id}/block`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al bloquear usuario');
    return data;
  }

  async unblockUser(id: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`/api/admin/users/${id}/unblock`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason: 'Desbloqueo de cuenta' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al desbloquear usuario');
    return data;
  }

  async toggleVerifyUser(id: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`/api/admin/users/${id}/toggle-verify`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al alternar verificación');
    return data;
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
    return data;
  }

  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    const res = await fetch('/api/admin/audit-logs', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar registros de auditoría');
    return data;
  }
}

export const api = new ApiService();
