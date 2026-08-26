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

  private async parseResponse<T = any>(res: Response, defaultErrorMsg: string): Promise<T> {
    const contentType = res.headers.get('content-type') || '';
    let parsedData: any = null;

    if (contentType.includes('application/json')) {
      try {
        parsedData = await res.json();
      } catch {
        parsedData = null;
      }
    } else {
      try {
        const text = await res.text();
        // If response is HTML or text, don't expose raw HTML tags to the user
        if (text && !text.trim().startsWith('<')) {
          parsedData = { error: text.slice(0, 150) };
        }
      } catch {
        parsedData = null;
      }
    }

    if (!res.ok) {
      const errorMessage =
        parsedData?.error ||
        parsedData?.message ||
        (res.status === 404
          ? 'El servicio solicitado no está disponible en este momento.'
          : res.status === 429
          ? 'Demasiados intentos. Por favor aguardá unos minutos.'
          : res.status === 401
          ? 'Credenciales inválidas. Verifica tu correo o contraseña.'
          : defaultErrorMsg);
      throw new Error(errorMessage);
    }

    if (parsedData === null) {
      throw new Error(defaultErrorMsg);
    }

    return parsedData as T;
  }

  private async request<T = any>(url: string, options: RequestInit = {}, defaultErrorMsg = 'Error en la solicitud'): Promise<T> {
    try {
      const res = await fetch(url, options);
      return await this.parseResponse<T>(res, defaultErrorMsg);
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        throw new Error('Error de conexión con el servidor. Verifica tu conexión.');
      }
      throw err;
    }
  }

  async login(email?: string, password?: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const data = await this.request<{ user: User; token: string; isAdmin: boolean }>(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email?.trim(), password }),
      },
      'Error al iniciar sesión'
    );
    this.setToken(data.token);
    return data;
  }

  async register(userData: Partial<User>): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const data = await this.request<{ user: User; token: string; isAdmin: boolean }>(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      },
      'Error al registrarse'
    );
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ user: User; isAdmin: boolean }> {
    return this.request<{ user: User; isAdmin: boolean }>(
      '/api/auth/me',
      { headers: this.getHeaders() },
      'Error al obtener perfil'
    );
  }

  async updateProfile(profileData: Partial<User>): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>(
      '/api/user/profile',
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(profileData),
      },
      'Error al actualizar perfil'
    );
  }

  async changePassword(currentPassword?: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      '/api/user/change-password',
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      },
      'Error al cambiar contraseña'
    );
  }

  async getFeed(): Promise<{ profiles: User[]; count: number }> {
    return this.request<{ profiles: User[]; count: number }>(
      '/api/profiles/feed',
      { headers: this.getHeaders() },
      'Error al cargar candidatos'
    );
  }

  async swipe(targetId: string, type: 'like' | 'pass' | 'superlike'): Promise<{
    success: boolean;
    isMatch: boolean;
    match: Match | null;
    partner: User | null;
  }> {
    return this.request<{
      success: boolean;
      isMatch: boolean;
      match: Match | null;
      partner: User | null;
    }>(
      '/api/profiles/swipe',
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ targetId, type }),
      },
      'Error al procesar deslizamiento'
    );
  }

  async rewind(): Promise<{ success: boolean; restoredUser: User; message: string }> {
    return this.request<{ success: boolean; restoredUser: User; message: string }>(
      '/api/profiles/rewind',
      {
        method: 'POST',
        headers: this.getHeaders(),
      },
      'Error al deshacer'
    );
  }

  async getMatches(): Promise<{ matches: Match[] }> {
    return this.request<{ matches: Match[] }>(
      '/api/matches',
      { headers: this.getHeaders() },
      'Error al cargar matches'
    );
  }

  async getMessages(matchId: string): Promise<{ messages: Message[]; partner: User; match: Match }> {
    return this.request<{ messages: Message[]; partner: User; match: Match }>(
      `/api/messages/${matchId}`,
      { headers: this.getHeaders() },
      'Error al cargar mensajes'
    );
  }

  async sendMessage(matchId: string, text: string): Promise<{ message: Message }> {
    return this.request<{ message: Message }>(
      `/api/messages/${matchId}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ text }),
      },
      'Error al enviar mensaje'
    );
  }

  // --- ADMIN ENDPOINTS (PROTECTED ON SERVER VIA TOKEN) ---
  async getAdminMetrics(): Promise<{ stats: AdminStats; serverTimestamp: string }> {
    return this.request<{ stats: AdminStats; serverTimestamp: string }>(
      '/api/admin/metrics',
      { headers: this.getHeaders() },
      'No autorizado para acceder a métricas de administración'
    );
  }

  async getAdminUsers(params?: { q?: string; status?: string; role?: string; sortBy?: string }): Promise<{ users: User[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    if (params?.role) query.set('role', params.role);
    if (params?.sortBy) query.set('sortBy', params.sortBy);

    return this.request<{ users: User[]; total: number }>(
      `/api/admin/users?${query.toString()}`,
      { headers: this.getHeaders() },
      'No autorizado para gestionar usuarios'
    );
  }

  async getAdminUserDetail(id: string): Promise<{ user: User; stats: any }> {
    return this.request<{ user: User; stats: any }>(
      `/api/admin/users/${id}`,
      { headers: this.getHeaders() },
      'Error al cargar detalles de usuario'
    );
  }

  async blockUser(id: string, reason?: string): Promise<{ success: boolean; user: User; message: string }> {
    return this.request<{ success: boolean; user: User; message: string }>(
      `/api/admin/users/${id}/block`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason }),
      },
      'Error al bloquear usuario'
    );
  }

  async unblockUser(id: string): Promise<{ success: boolean; user: User; message: string }> {
    return this.request<{ success: boolean; user: User; message: string }>(
      `/api/admin/users/${id}/unblock`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason: 'Desbloqueo de cuenta' }),
      },
      'Error al desbloquear usuario'
    );
  }

  async toggleVerifyUser(id: string): Promise<{ success: boolean; user: User; message: string }> {
    return this.request<{ success: boolean; user: User; message: string }>(
      `/api/admin/users/${id}/toggle-verify`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      },
      'Error al alternar verificación'
    );
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/admin/users/${id}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      },
      'Error al eliminar usuario'
    );
  }

  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return this.request<{ logs: AuditLog[] }>(
      `/api/admin/audit-logs`,
      { headers: this.getHeaders() },
      'Error al cargar registros de auditoría'
    );
  }
}

export const api = new ApiService();

