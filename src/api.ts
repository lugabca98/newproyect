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
    const isVerified = Boolean(user.emailVerified);
    const sanitizedUser: User = { ...user, role: isOwner ? 'admin' : 'user', emailVerified: isVerified };

    if (isVerified) {
      this.setToken(sanitizedUser.id, sanitizedUser.id, sanitizedUser.email, sanitizedUser.role);
    } else {
      this.setToken(null);
    }
    return { user: sanitizedUser, token: isVerified ? sanitizedUser.id : '', isAdmin: isOwner };
  }

  async loginWithGoogle(customGoogleUser?: { email: string; name?: string; photoURL?: string; uid?: string }): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const user = await firebaseService.loginWithGoogle(customGoogleUser);
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const isOwner = isEmailAdmin(cleanEmail, user.id);
    const isVerified = Boolean(user.emailVerified);
    const sanitizedUser: User = { ...user, role: isOwner ? 'admin' : 'user', emailVerified: isVerified };
    
    if (isVerified) {
      this.setToken(sanitizedUser.id, sanitizedUser.id, sanitizedUser.email, sanitizedUser.role);
    } else {
      this.setToken(null);
    }
    return { user: sanitizedUser, token: isVerified ? sanitizedUser.id : '', isAdmin: isOwner };
  }

  async loginDirectAdmin(): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const user = await firebaseService.loginDirectAdmin();
    this.setToken(user.id, user.id, user.email, 'admin');
    return { user: { ...user, emailVerified: true }, token: user.id, isAdmin: true };
  }

  async loginGuest(guestName?: string, guestOccupation?: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const user = await firebaseService.loginGuest(guestName, guestOccupation);
    this.setToken(user.id, user.id, user.email, 'user');
    return { user: { ...user, role: 'user', emailVerified: true }, token: user.id, isAdmin: false };
  }

  async register(userData: Partial<User>, password?: string): Promise<{ user: User; token: string; isAdmin: boolean; message?: string }> {
    if (!password) {
      throw new Error('La contraseña es requerida para el registro.');
    }
    const newUser = await firebaseService.registerUser(userData, password);
    const cleanEmail = (newUser.email || '').trim().toLowerCase();
    const isOwner = isEmailAdmin(cleanEmail, newUser.id);
    const sanitizedUser: User = { ...newUser, role: isOwner ? 'admin' : 'user', emailVerified: false };
    
    // Explicitly do not grant token for unverified registrations under any circumstances
    this.setToken(null);

    // Ensure confirmation email with verification link is sent
    await this.sendVerificationEmail(cleanEmail, newUser.name).catch(err => {
      console.warn('[Register] Verification email trigger note:', err);
    });

    return { 
      user: sanitizedUser, 
      token: '', 
      isAdmin: isOwner,
      message: `Cuenta creada. Hemos enviado un enlace de confirmación a ${cleanEmail}.` 
    };
  }

  async getMe(): Promise<{ user: User; isAdmin: boolean }> {
    const currentId = this.getToken();
    if (!currentId) throw new Error('No hay sesión activa.');

    const storedEmail = typeof window !== 'undefined' ? (localStorage.getItem('vulnerable_auth_email') || '').trim().toLowerCase() : '';

    // If marked as deleted locally or in deleted accounts, strictly terminate session
    if (storedEmail && (localDb.isEmailDeleted(storedEmail))) {
      this.setToken(null);
      throw new Error('Esta cuenta ha sido eliminada por el administrador.');
    }

    let user: User | null = await firebaseService.getUserById(currentId);

    if (!user && storedEmail) {
      user = await firebaseService.getUserByEmail(storedEmail);
    }

    if (!user) {
      if (storedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() || currentId === 'admin-owner') {
        user = {
          ...INITIAL_ADMIN,
          id: currentId
        };
      } else {
        const isLocallyDeleted = storedEmail ? localDb.isEmailDeleted(storedEmail) : false;
        if (!isLocallyDeleted) {
          const localUser = localDb.getUsers().find(u => u.id === currentId || (storedEmail && (u.email || '').toLowerCase() === storedEmail));
          if (localUser && localUser.status !== 'deleted' && !localDb.isEmailDeleted(localUser.email)) {
            user = localUser;
          }
        }
        if (!user) {
          this.setToken(null);
          throw new Error('Usuario no encontrado o cuenta eliminada.');
        }
      }
    }

    const currentUserObj: User = user;
    const cleanEmail = (currentUserObj.email || storedEmail).trim().toLowerCase();
    const isOwner = isEmailAdmin(cleanEmail, currentUserObj.id);
    
    // Strict block if user was deleted or blocked
    if (currentUserObj.status === 'deleted' || (cleanEmail && localDb.isEmailDeleted(cleanEmail))) {
      this.setToken(null);
      throw new Error('Esta cuenta ha sido eliminada por el administrador.');
    }
    if (currentUserObj.status === 'blocked') {
      this.setToken(null);
      throw new Error('Esta cuenta se encuentra suspendida.');
    }

    // Strict block: unverified users cannot retain active sessions
    if (!currentUserObj.emailVerified && !isOwner && currentUserObj.role !== 'admin') {
      this.setToken(null);
      throw new Error('Debes confirmar tu correo electrónico antes de ingresar a la plataforma.');
    }

    const sanitizedUser: User = {
      ...currentUserObj,
      role: isOwner ? 'admin' : 'user',
      emailVerified: Boolean(currentUserObj.emailVerified)
    };

    // Keep local session flags strictly in sync
    this.setToken(sanitizedUser.id, sanitizedUser.id, sanitizedUser.email, isOwner ? 'admin' : 'user');
    return { user: sanitizedUser, isAdmin: isOwner };
  }

  async logout(): Promise<void> {
    await firebaseService.logout();
    this.setToken(null);
  }

  async sendVerificationEmail(email?: string, name?: string): Promise<{ success: boolean; code?: string; message: string; previewUrl?: string; isRealDelivery?: boolean; provider?: string }> {
    const targetEmail = (email || '').trim().toLowerCase();
    
    // 1. Try server mailer endpoint first (delivers actual email to user's inbox)
    try {
      const response = await fetch('/api/mail/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, type: 'verify_email', name })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Also keep client Firebase service in sync
        firebaseService.sendVerificationEmail(targetEmail).catch(() => {});
        return {
          success: true,
          message: data.message || `Hemos enviado un código de 6 dígitos a ${targetEmail}.`,
          code: data.code,
          isRealDelivery: data.isRealDelivery,
          provider: data.provider,
          previewUrl: data.previewUrl
        };
      }
    } catch (err) {
      console.warn('[Api] Server mail send fallback to Firebase:', err);
    }

    // 2. Fallback to Firebase client service
    const fbRes = await firebaseService.sendVerificationEmail(targetEmail);
    return {
      success: fbRes.success,
      message: fbRes.message,
      isRealDelivery: false
    };
  }

  async verifyEmailOtp(email: string, code: string): Promise<{ success: boolean; message: string; user?: User }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim().replace(/\s+/g, '');

    // 1. Try server verification first
    let serverOk = false;
    let serverMessage = '';
    try {
      const response = await fetch('/api/mail/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode, type: 'verify_email' })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        serverOk = true;
        serverMessage = data.message;
      } else if (!response.ok && data.error && !data.error.includes('No hay un código activo')) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
    }

    // 2. Also run Firebase verification to activate Firestore & localDb
    try {
      const fbRes = await firebaseService.verifyOtpCode(cleanEmail, cleanCode, 'verify_email');
      if (!serverMessage) serverMessage = fbRes.message;
    } catch (fbErr: any) {
      if (!serverOk) {
        throw fbErr;
      }
    }

    // 3. Ensure local state has the activated user
    let user = await firebaseService.activatePendingUser(cleanEmail);
    if (!user) {
      user = await firebaseService.getUserByEmail(cleanEmail);
    }
    if (!user) {
      user = localDb.getUsers().find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
    }

    return {
      success: true,
      message: serverMessage || '¡Correo electrónico verificado con éxito! Tu perfil ha sido activado.',
      user: user || undefined
    };
  }

  async checkEmailVerification(email?: string): Promise<{ isVerified: boolean; user?: User | null; message: string }> {
    return firebaseService.checkEmailVerification(email);
  }

  async sendPasswordReset(email: string): Promise<{ 
    success: boolean; 
    message: string; 
    code?: string; 
    isRealDelivery?: boolean; 
    provider?: string; 
    previewUrl?: string 
  }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Por favor ingresá tu correo electrónico.');
    }

    let serverData: any = null;
    let serverError: string | null = null;

    // 1. Send password reset email via server mailer endpoint (SMTP / Resend / Brevo / SendGrid / Gmail)
    try {
      const response = await fetch('/api/mail/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, type: 'password_reset' })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        serverData = data;
      } else if (!response.ok && data.error) {
        serverError = data.error;
      }
    } catch (err: any) {
      console.warn('[Api] Server mail send-otp network error:', err);
    }

    // 2. Also trigger Firebase Auth password reset email & generate client OTP record
    let fbMessage = '';
    try {
      const fbRes = await firebaseService.sendPasswordReset(cleanEmail);
      fbMessage = fbRes.message;
    } catch (fbErr: any) {
      console.warn('[Firebase Auth] sendPasswordReset notice:', fbErr);
      if (!serverData && serverError) {
        throw new Error(serverError);
      }
    }

    await firebaseService.generateOtp(cleanEmail, 'password_reset').catch(() => {});

    if (serverData) {
      return {
        success: true,
        message: serverData.message || `Hemos enviado un correo de recuperación a ${cleanEmail}. Revisá tu bandeja de entrada y la carpeta de spam.`,
        code: serverData.code,
        isRealDelivery: serverData.isRealDelivery,
        provider: serverData.provider,
        previewUrl: serverData.previewUrl
      };
    }

    return {
      success: true,
      message: fbMessage || `Hemos enviado un correo con instrucciones para restablecer tu contraseña a ${cleanEmail}. Revisá tu bandeja de entrada y spam.`
    };
  }

  async getMailConfigStatus(): Promise<{ isConfigured: boolean; activeProvider: string; providers: Record<string, boolean> }> {
    try {
      const res = await fetch('/api/mail/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { isConfigured: false, activeProvider: 'sandbox', providers: {} };
  }

  async resetPassword(email: string, newPass: string, token?: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (token || '').trim();

    // 1. Try server password reset
    try {
      const response = await fetch('/api/mail/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, token: cleanToken, code: cleanToken, newPassword: newPass })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await firebaseService.resetPasswordDirect(cleanEmail, newPass).catch(() => {});
        return { success: true, message: data.message };
      } else if (!response.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
    }

    // 2. Direct password update
    return firebaseService.resetPasswordDirect(cleanEmail, newPass);
  }

  async resetPasswordWithOtp(email: string, code: string, newPass: string): Promise<{ success: boolean; message: string }> {
    return this.resetPassword(email, newPass, code);
  }

  async resetPasswordDirect(email: string, newPass: string): Promise<{ success: boolean; message: string }> {
    return firebaseService.resetPasswordDirect(email, newPass);
  }

  getLatestOtp(email: string, type: 'verify_email' | 'password_reset') {
    return localDb.getLatestOtp(email, type);
  }

  // -------------------------------------------------------------
  // FEED & SWIPES (Mutual Match Engine)
  // -------------------------------------------------------------
  async getFeed(): Promise<{ profiles: User[] }> {
    const currentId = this.getCurrentUserId();
    const profiles = await firebaseService.getFeed(currentId);
    return { profiles };
  }

  async swipe(targetId: string, type: 'like' | 'pass' | 'superlike', targetUser?: User): Promise<{
    isMatch: boolean;
    match: Match | null;
    partner: User | null;
  }> {
    const currentId = this.getCurrentUserId();
    return await firebaseService.recordSwipe(currentId, targetId, type, targetUser);
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

  async deleteOwnAccount(): Promise<{ success: boolean; message: string }> {
    await firebaseService.deleteCurrentUser();
    this.setToken(null);
    return { success: true, message: 'Tu cuenta ha sido eliminada exitosamente.' };
  }

  async deleteUser(userId: string, email?: string): Promise<{ success: boolean; message: string }> {
    await firebaseService.adminDeleteUser(userId, email);
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

  async deleteUserAdmin(targetUserId: string, email?: string): Promise<{ success: boolean }> {
    await firebaseService.adminDeleteUser(targetUserId, email);
    return { success: true };
  }

  async resetDatabaseToZero(): Promise<{ success: boolean; message: string }> {
    await firebaseService.wipeAllRegisteredAccounts();
    return { success: true, message: 'La base de datos y todas las cuentas han sido eliminadas. La app empieza desde 0.' };
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
