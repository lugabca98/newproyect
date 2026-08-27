import { User, Match, Message, AdminStats, AuditLog } from './types';
import { firebaseService } from './firebaseService';
import { INITIAL_ADMIN, DEFAULT_ADMIN_EMAIL, localDb } from './localStore';

const isEmailAdmin = (email?: string | null, uid?: string | null): boolean => {
  if (uid === 'admin-owner') return true;
  if (!email) return false;
  return email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
};

class ApiService {
  private currentUserId: string | null = null;

  setToken(token: string | null, userId?: string, email?: string, role?: string) {
    if (userId) {
      this.currentUserId = userId;
      try {
        localStorage.setItem('vulnerable_auth_uid', userId);
        localStorage.setItem('vulnerable_auth_token', token || userId);
        const cleanEmail = (email || '').trim().toLowerCase();
        if (cleanEmail) localStorage.setItem('vulnerable_auth_email', cleanEmail);

        // Strictly determine role based on owner identity
        const isOwner = isEmailAdmin(cleanEmail, userId);
        localStorage.setItem('vulnerable_auth_role', isOwner ? 'admin' : 'user');
      } catch {}
    } else {
      this.currentUserId = null;
      try {
        localStorage.removeItem('vulnerable_auth_uid');
        localStorage.removeItem('vulnerable_auth_token');
        localStorage.removeItem('vulnerable_auth_email');
        localStorage.removeItem('vulnerable_auth_role');
      } catch {}
    }
  }

  getToken(): string | null {
    const authUser = firebaseService.getCurrentAuthUser();
    if (authUser?.uid) return authUser.uid;
    if (this.currentUserId) return this.currentUserId;
    try {
      const stored = localStorage.getItem('vulnerable_auth_uid');
      if (stored) {
        this.currentUserId = stored;
        return stored;
      }
    } catch {}
    return null;
  }

  getCurrentUserId(): string {
    const authUser = firebaseService.getCurrentAuthUser();
    if (authUser?.uid) return authUser.uid;
    if (this.currentUserId) return this.currentUserId;
    try {
      const stored = localStorage.getItem('vulnerable_auth_uid');
      if (stored) {
        this.currentUserId = stored;
        return stored;
      }
    } catch {}
    return 'guest';
  }

  // -------------------------------------------------------------
  // AUTHENTICATION (Firebase Auth Real Verification)
  // -------------------------------------------------------------
  async login(email: string, password: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await firebaseService.loginUser(cleanEmail, password);
    const isOwner = isEmailAdmin(cleanEmail, user.id);
    const sanitizedUser: User = { ...user, role: isOwner ? 'admin' : 'user' };
    this.setToken(sanitizedUser.id, sanitizedUser.id, sanitizedUser.email, sanitizedUser.role);
    return { user: sanitizedUser, token: sanitizedUser.id, isAdmin: isOwner };
  }

  async loginWithGoogle(): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const user = await firebaseService.loginWithGoogle();
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const isOwner = isEmailAdmin(cleanEmail, user.id);
    const sanitizedUser: User = { ...user, role: isOwner ? 'admin' : 'user' };
    this.setToken(sanitizedUser.id, sanitizedUser.id, sanitizedUser.email, sanitizedUser.role);
    return { user: sanitizedUser, token: sanitizedUser.id, isAdmin: isOwner };
  }

  async loginDirectAdmin(): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const user = await firebaseService.loginDirectAdmin();
    this.setToken(user.id, user.id, user.email, 'admin');
    return { user, token: user.id, isAdmin: true };
  }

  async loginGuest(guestName?: string, guestOccupation?: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const user = await firebaseService.loginGuest(guestName, guestOccupation);
    this.setToken(user.id, user.id, user.email, 'user');
    return { user: { ...user, role: 'user' }, token: user.id, isAdmin: false };
  }

  async register(userData: Partial<User>, password?: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    if (!password) {
      throw new Error('La contraseña es requerida para el registro.');
    }
    const newUser = await firebaseService.registerUser(userData, password);
    const cleanEmail = (newUser.email || '').trim().toLowerCase();
    const isOwner = isEmailAdmin(cleanEmail, newUser.id);
    const sanitizedUser: User = { ...newUser, role: isOwner ? 'admin' : 'user' };
    this.setToken(sanitizedUser.id, sanitizedUser.id, sanitizedUser.email, sanitizedUser.role);
    return { user: sanitizedUser, token: sanitizedUser.id, isAdmin: isOwner };
  }

  async getMe(): Promise<{ user: User; isAdmin: boolean }> {
    const currentId = this.getToken();
    if (!currentId) throw new Error('No hay sesión activa.');

    let user: User | null = await firebaseService.getUserById(currentId);
    const storedEmail = typeof window !== 'undefined' ? (localStorage.getItem('vulnerable_auth_email') || '').trim().toLowerCase() : '';

    if (!user) {
      if (storedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() || currentId === 'admin-owner') {
        user = {
          ...INITIAL_ADMIN,
          id: currentId
        };
      } else {
        const localUser = localDb.getUsers().find(u => u.id === currentId || (storedEmail && (u.email || '').toLowerCase() === storedEmail));
        if (localUser) {
          user = localUser;
        } else {
          throw new Error('Usuario no encontrado.');
        }
      }
    }

    const currentUserObj: User = user;
    const cleanEmail = (currentUserObj.email || storedEmail).trim().toLowerCase();
    const isOwner = isEmailAdmin(cleanEmail, currentUserObj.id);

    const sanitizedUser: User = {
      ...currentUserObj,
      role: isOwner ? 'admin' : 'user'
    };

    // Keep local session flags strictly in sync
    this.setToken(sanitizedUser.id, sanitizedUser.id, sanitizedUser.email, isOwner ? 'admin' : 'user');
    return { user: sanitizedUser, isAdmin: isOwner };
  }

  async logout(): Promise<void> {
    await firebaseService.logout();
    this.setToken(null);
  }

  // -------------------------------------------------------------
  // FEED & SWIPES (Mutual Match Engine)
  // -------------------------------------------------------------
  async getFeed(): Promise<{ profiles: User[] }> {
    const currentId = this.getCurrentUserId();
    const profiles = await firebaseService.getFeed(currentId);
    return { profiles };
  }

  async swipe(targetId: string, type: 'like' | 'pass' | 'superlike'): Promise<{
    isMatch: boolean;
    match: Match | null;
    partner: User | null;
  }> {
    const currentId = this.getCurrentUserId();
    return await firebaseService.recordSwipe(currentId, targetId, type);
  }

  async rewind(): Promise<{ success: boolean; restoredUser: User | null }> {
    return { success: false, restoredUser: null };
  }

  // -------------------------------------------------------------
  // MATCHES & MESSAGES
  // -------------------------------------------------------------
  async getMatches(): Promise<{ matches: Match[] }> {
    const currentId = this.getCurrentUserId();
    const matches = await firebaseService.getMatches(currentId);
    return { matches };
  }

  async getMessages(_matchId: string): Promise<{ messages: Message[] }> {
    return { messages: [] };
  }

  async sendMessage(matchId: string, text: string): Promise<{ message: Message }> {
    const currentId = this.getCurrentUserId();
    const matches = await firebaseService.getMatches(currentId);
    const match = matches.find(m => m.id === matchId);
    const receiverId = match ? match.userIds.find(id => id !== currentId) || '' : '';

    const message = await firebaseService.sendMessage(matchId, currentId, receiverId, text);
    return { message };
  }

  // -------------------------------------------------------------
  // PROFILE & SETTINGS
  // -------------------------------------------------------------
  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    const currentId = this.getCurrentUserId();
    const user = await firebaseService.updateUser(currentId, data);
    return { user };
  }

  async changePassword(currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const currentId = this.getCurrentUserId();
    if (!currentId) {
      throw new Error('No hay sesión activa.');
    }
    return await firebaseService.changeUserPassword(currentId, currentPass, newPass);
  }

  // -------------------------------------------------------------
  // ADMIN PANEL
  // -------------------------------------------------------------
  async getAdminStats(): Promise<{ stats: AdminStats }> {
    const stats = await firebaseService.getAdminStats();
    return { stats };
  }

  async getAdminMetrics(): Promise<{ stats: AdminStats }> {
    const stats = await firebaseService.getAdminStats();
    return { stats };
  }

  async getAllUsersAdmin(): Promise<{ users: User[] }> {
    const users = await firebaseService.getAllUsersAdmin();
    return { users };
  }

  async getAdminUsers(params?: { q?: string; status?: string; sortBy?: string }): Promise<{ users: User[] }> {
    let users = await firebaseService.getAllUsersAdmin();
    if (params?.q) {
      const q = params.q.toLowerCase().trim();
      users = users.filter(u => 
        (u.name || '').toLowerCase().includes(q) || 
        (u.email || '').toLowerCase().includes(q) ||
        (u.location || '').toLowerCase().includes(q) ||
        (u.occupation || '').toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== 'all') {
      users = users.filter(u => u.status === params.status);
    }
    if (params?.sortBy) {
      if (params.sortBy === 'newest') {
        users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } else if (params.sortBy === 'oldest') {
        users.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      } else if (params.sortBy === 'likes') {
        users.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      } else if (params.sortBy === 'matches') {
        users.sort((a, b) => (b.matchesCount || 0) - (a.matchesCount || 0));
      }
    }
    return { users };
  }

  async getAdminUserDetail(userId: string): Promise<{ user: User; stats: { likesSent: number; matches: number; messages: number } }> {
    const user = await firebaseService.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado');
    return { 
      user, 
      stats: { 
        likesSent: user.likesCount || 0, 
        matches: user.matchesCount || 0, 
        messages: 0 
      } 
    };
  }

  async blockUser(userId: string, _reason?: string): Promise<{ user: User; message: string }> {
    const user = await firebaseService.adminToggleUserStatus(userId);
    return { user, message: 'Usuario bloqueado exitosamente.' };
  }

  async unblockUser(userId: string): Promise<{ user: User; message: string }> {
    const user = await firebaseService.adminToggleUserStatus(userId);
    return { user, message: 'Usuario desbloqueado exitosamente.' };
  }

  async toggleVerifyUser(userId: string): Promise<{ user: User; message: string }> {
    const user = await firebaseService.adminToggleUserVerification(userId);
    return { user, message: `Insignia de verificación actualizada (${user.verified ? 'Verificado' : 'No verificado'}).` };
  }

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    await firebaseService.adminDeleteUser(userId);
    return { success: true, message: 'Usuario eliminado permanentemente de la base de datos.' };
  }

  async toggleUserStatusAdmin(targetUserId: string): Promise<{ user: User }> {
    const user = await firebaseService.adminToggleUserStatus(targetUserId);
    return { user };
  }

  async toggleUserVerificationAdmin(targetUserId: string): Promise<{ user: User }> {
    const user = await firebaseService.adminToggleUserVerification(targetUserId);
    return { user };
  }

  async deleteUserAdmin(targetUserId: string): Promise<{ success: boolean }> {
    await firebaseService.adminDeleteUser(targetUserId);
    return { success: true };
  }

  async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    const logs = await firebaseService.getAuditLogs();
    return { logs };
  }

  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    const logs = await firebaseService.getAuditLogs();
    return { logs };
  }
}

export const api = new ApiService();
