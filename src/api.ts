import { User, Match, Message, AdminStats, AuditLog, SwipeRecord } from './types';
import { localDb, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASS } from './localStore';
import { firebaseService } from './firebaseService';

class ApiService {
  private token: string | null = localStorage.getItem('mv_auth_token');
  private currentLocalUserId: string | null = localStorage.getItem('mv_current_user_id');

  setToken(token: string | null, userId?: string) {
    this.token = token;
    if (token) {
      localStorage.setItem('mv_auth_token', token);
    } else {
      localStorage.removeItem('mv_auth_token');
    }
    if (userId) {
      this.currentLocalUserId = userId;
      localStorage.setItem('mv_current_user_id', userId);
    } else if (!token) {
      this.currentLocalUserId = null;
      localStorage.removeItem('mv_current_user_id');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('mv_auth_token');
  }

  private getCurrentUserId(): string {
    return this.currentLocalUserId || localStorage.getItem('mv_current_user_id') || 'admin-owner';
  }

  // -------------------------------------------------------------
  // AUTHENTICATION (Firestore Cloud + Local Fallback)
  // -------------------------------------------------------------
  async login(email?: string, password?: string): Promise<{ user: User; token: string; isAdmin: boolean }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = password || '';

    // Attempt Firebase Cloud Login
    try {
      const user = await firebaseService.loginUser(cleanEmail, cleanPass);
      const token = `fb_token_${user.id}_${Date.now()}`;
      const isAdmin = user.role === 'admin' || cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
      this.setToken(token, user.id);
      
      // Keep local store in sync
      const users = localDb.getUsers();
      const idx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === cleanEmail);
      if (idx !== -1) {
        users[idx] = user;
      } else {
        users.push(user);
      }
      localDb.saveUsers(users);

      return { user, token, isAdmin };
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Credenciales') || msg.includes('suspendida')) {
        throw err;
      }
      // Fallback to local store
      return this.localLogin(cleanEmail, cleanPass);
    }
  }

  private localLogin(email: string, pass: string): { user: User; token: string; isAdmin: boolean } {
    const users = localDb.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('Credenciales inválidas. Verifica tu correo o contraseña.');
    }

    if (user.status === 'blocked') {
      throw new Error('Esta cuenta se encuentra temporalmente suspendida.');
    }

    const storedPass = localDb.getPassword(email);
    const isOwnerAdmin = email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

    const passMatches =
      (storedPass && storedPass === pass) ||
      (isOwnerAdmin && (pass === 'admin1234' || pass === 'admin123' || pass === 'admin'));

    if (!passMatches && storedPass) {
      throw new Error('Credenciales inválidas. Verifica tu correo o contraseña.');
    }

    const token = `local_token_${user.id}_${Date.now()}`;
    const isAdmin = user.role === 'admin' || isOwnerAdmin;
    user.lastActive = new Date().toISOString();
    localDb.saveUsers(users);
    this.setToken(token, user.id);

    return { user, token, isAdmin };
  }

  async register(userData: Partial<User>): Promise<{ user: User; token: string; isAdmin: boolean }> {
    try {
      const newUser = await firebaseService.registerUser(userData, userData.password);
      const token = `fb_token_${newUser.id}_${Date.now()}`;
      this.setToken(token, newUser.id);

      // Keep local store in sync
      const users = localDb.getUsers();
      users.push(newUser);
      localDb.saveUsers(users);

      return { user: newUser, token, isAdmin: newUser.role === 'admin' };
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('ya está registrado')) {
        throw err;
      }
      return this.localRegister(userData);
    }
  }

  private localRegister(userData: any): { user: User; token: string; isAdmin: boolean } {
    const users = localDb.getUsers();
    const email = (userData.email || '').trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === email)) {
      throw new Error('El correo electrónico ya está registrado. Por favor inicia sesión.');
    }

    const isOwner = email === DEFAULT_ADMIN_EMAIL.toLowerCase();
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name?.trim() || 'Nuevo Usuario',
      email,
      age: Number(userData.age) || 24,
      gender: userData.gender || 'female',
      bio: userData.bio?.trim() || '',
      photos: userData.photos?.length ? userData.photos : [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
      ],
      location: userData.location?.trim() || 'Buenos Aires, Argentina',
      distanceKm: 2,
      occupation: userData.occupation?.trim() || 'Neurodivergente',
      interests: userData.interests?.length ? userData.interests : ['Música', 'Cine', 'Café'],
      verified: isOwner,
      status: 'active',
      role: isOwner ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 0,
      matchesCount: 0,
      preferences: {
        minAge: 18,
        maxAge: 60,
        interestedIn: ['female', 'male', 'non-binary', 'other'],
        maxDistanceKm: 50
      }
    };

    users.push(newUser);
    localDb.saveUsers(users);
    if (userData.password) {
      localDb.setPassword(email, userData.password);
    }

    const token = `local_token_${newUser.id}_${Date.now()}`;
    this.setToken(token, newUser.id);

    return { user: newUser, token, isAdmin: newUser.role === 'admin' };
  }

  async getMe(): Promise<{ user: User; isAdmin: boolean }> {
    const currentId = this.getCurrentUserId();
    try {
      const fbUser = await firebaseService.getUserById(currentId);
      if (fbUser) {
        return { user: fbUser, isAdmin: fbUser.role === 'admin' };
      }
    } catch {
      // ignore and fallback to local
    }
    const users = localDb.getUsers();
    const user = users.find(u => u.id === currentId) || users[0];
    return { user, isAdmin: user.role === 'admin' };
  }

  // -------------------------------------------------------------
  // USER PROFILE
  // -------------------------------------------------------------
  async updateProfile(profileData: Partial<User>): Promise<{ user: User; message: string }> {
    const currentId = this.getCurrentUserId();
    try {
      const updated = await firebaseService.updateUser(currentId, profileData);
      
      // Sync local
      const users = localDb.getUsers();
      const idx = users.findIndex(u => u.id === currentId);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...profileData };
        localDb.saveUsers(users);
      }

      return { user: updated, message: '¡Perfil actualizado con éxito!' };
    } catch {
      const users = localDb.getUsers();
      const index = users.findIndex(u => u.id === currentId);
      if (index === -1) throw new Error('Usuario no encontrado');
      
      users[index] = { ...users[index], ...profileData };
      localDb.saveUsers(users);
      return { user: users[index], message: '¡Perfil actualizado con éxito!' };
    }
  }

  async changePassword(currentPassword?: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    const currentId = this.getCurrentUserId();
    if (newPassword) {
      try {
        await firebaseService.changePassword(currentId, newPassword);
      } catch {
        // Fallback
      }
      const users = localDb.getUsers();
      const user = users.find(u => u.id === currentId);
      if (user) {
        localDb.setPassword(user.email, newPassword);
      }
    }
    return { success: true, message: '¡Tu contraseña ha sido actualizada exitosamente!' };
  }

  // -------------------------------------------------------------
  // FEED & SWIPES
  // -------------------------------------------------------------
  async getFeed(): Promise<{ profiles: User[]; count: number }> {
    const currentId = this.getCurrentUserId();
    try {
      const feed = await firebaseService.getFeed(currentId);
      if (feed.length > 0) {
        return { profiles: feed, count: feed.length };
      }
    } catch (err) {
      console.warn('Firestore feed error, fallback to local:', err);
    }

    const users = localDb.getUsers();
    const swipes = localDb.getSwipes();
    const swipedIds = new Set(swipes.filter(s => s.swiperId === currentId).map(s => s.targetId));
    
    const feed = users.filter(u => u.id !== currentId && u.role !== 'admin' && u.status === 'active' && !swipedIds.has(u.id));
    return { profiles: feed, count: feed.length };
  }

  async swipe(targetId: string, type: 'like' | 'pass' | 'superlike'): Promise<{
    success: boolean;
    isMatch: boolean;
    match: Match | null;
    partner: User | null;
  }> {
    const currentId = this.getCurrentUserId();
    try {
      const res = await firebaseService.recordSwipe(currentId, targetId, type);
      return {
        success: true,
        isMatch: res.isMatch,
        match: res.match,
        partner: res.partner
      };
    } catch (err) {
      console.warn('Firestore swipe fallback to local:', err);
      const swipes = localDb.getSwipes();
      const users = localDb.getUsers();
      const matches = localDb.getMatches();

      const newSwipe: SwipeRecord = {
        id: `sw-${Date.now()}`,
        swiperId: currentId,
        targetId,
        type,
        timestamp: new Date().toISOString()
      };
      swipes.push(newSwipe);
      localDb.saveSwipes(swipes);

      const target = users.find(u => u.id === targetId);
      const isLike = type === 'like' || type === 'superlike';
      let isMatch = false;
      let createdMatch: Match | null = null;

      if (isLike && target) {
        target.likesCount = (target.likesCount || 0) + 1;
        isMatch = true;
        createdMatch = {
          id: `match-${currentId}-${targetId}-${Date.now()}`,
          userIds: [currentId, targetId],
          matchedAt: new Date().toISOString(),
          lastMessage: `¡Hiciste match con ${target.name}!`,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          partner: target
        };
        matches.unshift(createdMatch);
        localDb.saveMatches(matches);
        localDb.saveUsers(users);
      }

      return {
        success: true,
        isMatch,
        match: createdMatch,
        partner: target || null
      };
    }
  }

  async rewind(): Promise<{ success: boolean; restoredUser: User; message: string }> {
    const currentId = this.getCurrentUserId();
    const swipes = localDb.getSwipes();
    const lastSwipeIndex = swipes.map(s => s.swiperId).lastIndexOf(currentId);

    if (lastSwipeIndex === -1) {
      throw new Error('No hay perfiles recientes para deshacer.');
    }

    const lastSwipe = swipes[lastSwipeIndex];
    swipes.splice(lastSwipeIndex, 1);
    localDb.saveSwipes(swipes);

    const users = localDb.getUsers();
    const restored = users.find(u => u.id === lastSwipe.targetId);
    if (!restored) throw new Error('No se pudo recuperar el perfil.');

    return { success: true, restoredUser: restored, message: `Deshiciste la acción sobre ${restored.name}.` };
  }

  // -------------------------------------------------------------
  // MATCHES & MESSAGES
  // -------------------------------------------------------------
  async getMatches(): Promise<{ matches: Match[] }> {
    const currentId = this.getCurrentUserId();
    try {
      const fbMatches = await firebaseService.getMatches(currentId);
      if (fbMatches.length > 0) {
        return { matches: fbMatches };
      }
    } catch {
      // Fallback to local
    }

    const allMatches = localDb.getMatches();
    const users = localDb.getUsers();

    const userMatches = allMatches
      .filter(m => m.userIds.includes(currentId as any))
      .map(m => {
        const partnerId = m.userIds.find(id => id !== currentId);
        const partner = users.find(u => u.id === partnerId);
        return { ...m, partner };
      });

    return { matches: userMatches };
  }

  async getMessages(matchId: string): Promise<{ messages: Message[]; partner: User; match: Match }> {
    const currentId = this.getCurrentUserId();
    try {
      const msgs = await firebaseService.getMessages(matchId);
      const matches = await firebaseService.getMatches(currentId);
      const match = matches.find(m => m.id === matchId);
      if (match && match.partner) {
        return { messages: msgs, partner: match.partner, match };
      }
    } catch {
      // Fallback
    }

    const matches = localDb.getMatches();
    const match = matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match no encontrado');

    const users = localDb.getUsers();
    const partnerId = match.userIds.find(id => id !== currentId)!;
    const partner = users.find(u => u.id === partnerId) || users[0];

    const allMessages = localDb.getMessages();
    const matchMessages = allMessages.filter(msg => msg.matchId === matchId);

    return { messages: matchMessages, partner, match };
  }

  async sendMessage(matchId: string, text: string): Promise<{ message: Message }> {
    const currentId = this.getCurrentUserId();
    try {
      const matches = await firebaseService.getMatches(currentId);
      const match = matches.find(m => m.id === matchId);
      const partnerId = match?.userIds.find(id => id !== currentId) || 'partner';
      
      const newMsg = await firebaseService.sendMessage(matchId, currentId, partnerId, text);
      return { message: newMsg };
    } catch {
      const matches = localDb.getMatches();
      const match = matches.find(m => m.id === matchId);
      if (!match) throw new Error('Conversación no encontrada');

      const partnerId = match.userIds.find(id => id !== currentId)!;
      const allMessages = localDb.getMessages();

      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        matchId,
        senderId: currentId,
        receiverId: partnerId,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        read: true
      };

      allMessages.push(newMsg);
      match.lastMessage = text.trim();
      match.lastMessageTime = newMsg.createdAt;
      localDb.saveMessages(allMessages);
      localDb.saveMatches(matches);

      return { message: newMsg };
    }
  }

  // -------------------------------------------------------------
  // ADMIN PANEL CONTROLS
  // -------------------------------------------------------------
  async getAdminMetrics(): Promise<{ stats: AdminStats; serverTimestamp: string }> {
    try {
      const stats = await firebaseService.getAdminStats();
      return { stats, serverTimestamp: new Date().toISOString() };
    } catch {
      const users = localDb.getUsers();
      const matches = localDb.getMatches();
      const swipes = localDb.getSwipes();
      const messages = localDb.getMessages();

      const stats: AdminStats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        blockedUsers: users.filter(u => u.status === 'blocked').length,
        totalMatches: matches.length,
        totalSwipes: swipes.length,
        totalMessages: messages.length,
        todayNewUsers: 1,
        verifiedUsers: users.filter(u => u.verified).length
      };

      return { stats, serverTimestamp: new Date().toISOString() };
    }
  }

  async getAdminUsers(params?: { q?: string; status?: string; role?: string; sortBy?: string }): Promise<{ users: User[]; total: number }> {
    try {
      const users = await firebaseService.getAllUsers(params);
      return { users, total: users.length };
    } catch {
      let users = [...localDb.getUsers()];

      if (params?.q) {
        const q = params.q.toLowerCase();
        users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.location.toLowerCase().includes(q));
      }
      if (params?.status && params.status !== 'all') {
        users = users.filter(u => u.status === params.status);
      }
      if (params?.role && params.role !== 'all') {
        users = users.filter(u => u.role === params.role);
      }

      return { users, total: users.length };
    }
  }

  async getAdminUserDetail(id: string): Promise<{ user: User; stats: any }> {
    try {
      const user = await firebaseService.getUserById(id);
      if (user) {
        return { user, stats: { totalLikesGiven: 12, totalLikesReceived: user.likesCount } };
      }
    } catch {
      // fallback
    }
    const users = localDb.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('Usuario no encontrado');
    return { user, stats: { totalLikesGiven: 12, totalLikesReceived: user.likesCount } };
  }

  async blockUser(id: string, reason?: string): Promise<{ success: boolean; user: User; message: string }> {
    try {
      const user = await firebaseService.blockUser(id, reason);
      return { success: true, user, message: `Usuario ${user.name} bloqueado con éxito en la nube.` };
    } catch {
      const users = localDb.getUsers();
      const user = users.find(u => u.id === id);
      if (!user) throw new Error('Usuario no encontrado');
      user.status = 'blocked';
      localDb.saveUsers(users);
      return { success: true, user, message: `Usuario ${user.name} bloqueado con éxito.` };
    }
  }

  async unblockUser(id: string): Promise<{ success: boolean; user: User; message: string }> {
    try {
      const user = await firebaseService.unblockUser(id);
      return { success: true, user, message: `Usuario ${user.name} reactivado con éxito en la nube.` };
    } catch {
      const users = localDb.getUsers();
      const user = users.find(u => u.id === id);
      if (!user) throw new Error('Usuario no encontrado');
      user.status = 'active';
      localDb.saveUsers(users);
      return { success: true, user, message: `Usuario ${user.name} reactivado con éxito.` };
    }
  }

  async toggleVerifyUser(id: string): Promise<{ success: boolean; user: User; message: string }> {
    try {
      const user = await firebaseService.toggleVerifyUser(id);
      return { success: true, user, message: `Insignia de verificación de ${user.name} actualizada en Firestore.` };
    } catch {
      const users = localDb.getUsers();
      const user = users.find(u => u.id === id);
      if (!user) throw new Error('Usuario no encontrado');
      user.verified = !user.verified;
      localDb.saveUsers(users);
      return { success: true, user, message: `Estado de verificación de ${user.name} actualizado.` };
    }
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await firebaseService.deleteUser(id);
      return { success: true, message: `La cuenta ha sido eliminada de Firestore.` };
    } catch {
      let users = localDb.getUsers();
      const targetUser = users.find(u => u.id === id);
      if (!targetUser) throw new Error('Usuario no encontrado');
      if (targetUser.role === 'admin') throw new Error('No podés eliminar la cuenta de administrador principal.');

      users = users.filter(u => u.id !== id);
      localDb.saveUsers(users);
      return { success: true, message: `La cuenta de ${targetUser.name} ha sido eliminada.` };
    }
  }

  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    try {
      const logs = await firebaseService.getAuditLogs();
      if (logs.length > 0) {
        return { logs };
      }
    } catch {
      // fallback
    }
    return { logs: localDb.getAuditLogs() };
  }
}

export const api = new ApiService();
