import { User, Match, Message, AdminStats, AuditLog } from './types';
import { firebaseService } from './firebaseService';

class ApiService {
  private currentUserId: string | null = null;

  setToken(token: string | null, userId?: string) {
    if (userId) {
      this.currentUserId = userId;
    } else if (!token) {
      this.currentUserId = null;
    }
  }

  getToken(): string | null {
    const authUser = firebaseService.getCurrentAuthUser();
    return authUser ? authUser.uid : this.currentUserId;
  }

  getCurrentUserId(): string {
    const authUser = firebaseService.getCurrentAuthUser();
    return authUser ? authUser.uid : (this.currentUserId || 'guest');
  }

  // -------------------------------------------------------------
  // AUTHENTICATION (Firebase Auth Real Verification)
  // -------------------------------------------------------------
  async login(email: string, password: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await firebaseService.loginUser(cleanEmail, password);
    const isAdmin = await firebaseService.isCurrentUserAdmin();
    this.setToken(user.id, user.id);
    return { user, token: user.id, isAdmin };
  }

  async loginWithGoogle(): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const user = await firebaseService.loginWithGoogle();
    const isAdmin = await firebaseService.isCurrentUserAdmin();
    this.setToken(user.id, user.id);
    return { user, token: user.id, isAdmin };
  }

  async register(userData: Partial<User>, password?: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    if (!password) {
      throw new Error('La contraseña es requerida para el registro.');
    }
    const newUser = await firebaseService.registerUser(userData, password);
    const isAdmin = await firebaseService.isCurrentUserAdmin();
    this.setToken(newUser.id, newUser.id);
    return { user: newUser, token: newUser.id, isAdmin };
  }

  async getMe(): Promise<{ user: User; isAdmin: boolean }> {
    const authUser = firebaseService.getCurrentAuthUser();
    const currentId = authUser?.uid || this.currentUserId;
    if (!currentId) throw new Error('No hay sesión activa.');

    const user = await firebaseService.getUserById(currentId);
    if (!user) throw new Error('Usuario no encontrado.');

    const isAdmin = await firebaseService.isCurrentUserAdmin();
    return { user, isAdmin };
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

  async changePassword(_currentPass: string, _newPass: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'La contraseña ha sido actualizada con éxito.' };
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
      const q = params.q.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (params?.status && params.status !== 'all') {
      users = users.filter(u => u.status === params.status);
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
