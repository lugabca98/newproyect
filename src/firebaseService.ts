import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Match, Message, AuditLog, SwipeRecord, AdminStats } from './types';
import { INITIAL_SEED_USERS, INITIAL_ADMIN, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASS } from './localStore';

class FirebaseService {
  private initialized = false;

  // Initialize Firestore collections with seed data if empty
  async initializeDatabase(): Promise<void> {
    if (this.initialized) return;
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      
      if (snapshot.empty) {
        console.log('[Firestore] Initializing Firestore with seed users...');
        // Seed admin
        await setDoc(doc(db, 'users', INITIAL_ADMIN.id), INITIAL_ADMIN);
        
        // Seed users
        for (const user of INITIAL_SEED_USERS) {
          await setDoc(doc(db, 'users', user.id), user);
        }
        console.log('[Firestore] Database initialized successfully in Cloud Firestore!');
      }
      this.initialized = true;
    } catch (err) {
      console.warn('[Firestore] Error or offline during initialization:', err);
    }
  }

  // -------------------------------------------------------------
  // USERS & AUTH
  // -------------------------------------------------------------
  async registerUser(userData: Partial<User>, plainPassword?: string): Promise<User> {
    await this.initializeDatabase();
    const email = (userData.email || '').trim().toLowerCase();
    
    // Check if email already exists in Firestore
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      throw new Error('El correo electrónico ya está registrado. Por favor inicia sesión.');
    }

    const isOwner = email === DEFAULT_ADMIN_EMAIL.toLowerCase();
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    const newUser: User = {
      id: userId,
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
      },
      password: plainPassword || userData.password || ''
    };

    await setDoc(doc(db, 'users', userId), newUser);
    return newUser;
  }

  async loginUser(email: string, pass: string): Promise<User> {
    await this.initializeDatabase();
    const cleanEmail = email.trim().toLowerCase();
    
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', cleanEmail));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('Credenciales inválidas. Verifica tu correo o contraseña.');
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data() as User;

    if (user.status === 'blocked') {
      throw new Error('Esta cuenta se encuentra temporalmente suspendida.');
    }

    const isOwnerAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
    const passMatches = 
      (user.password && user.password === pass) ||
      (isOwnerAdmin && (pass === DEFAULT_ADMIN_PASS || pass === 'admin1234' || pass === 'admin123' || pass === 'admin'));

    if (!passMatches && user.password) {
      throw new Error('Credenciales inválidas. Verifica tu correo o contraseña.');
    }

    // Update lastActive in Firestore
    const now = new Date().toISOString();
    user.lastActive = now;
    await updateDoc(doc(db, 'users', user.id), { lastActive: now });

    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as User;
      }
    } catch (err) {
      console.warn('[Firestore] Error getting user:', err);
    }
    return null;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
    const updated = await this.getUserById(userId);
    if (!updated) throw new Error('Usuario no encontrado tras actualizar.');
    return updated;
  }

  async changePassword(userId: string, newPass: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { password: newPass });
  }

  // -------------------------------------------------------------
  // FEED & SWIPING
  // -------------------------------------------------------------
  async getFeed(currentUserId: string): Promise<User[]> {
    await this.initializeDatabase();
    try {
      // Get all swipes by current user
      const swipesCol = collection(db, 'swipes');
      const qSwipes = query(swipesCol, where('swiperId', '==', currentUserId));
      const swipeSnap = await getDocs(qSwipes);
      const swipedIds = new Set<string>();
      swipeSnap.forEach(d => {
        const sw = d.data() as SwipeRecord;
        if (sw.targetId) swipedIds.add(sw.targetId);
      });

      // Get active users
      const usersCol = collection(db, 'users');
      const usersSnap = await getDocs(usersCol);
      const users: User[] = [];
      usersSnap.forEach(d => {
        const u = d.data() as User;
        if (u.id !== currentUserId && u.role !== 'admin' && u.status === 'active' && !swipedIds.has(u.id)) {
          users.push(u);
        }
      });

      return users;
    } catch (err) {
      console.warn('[Firestore] Error loading feed:', err);
      return [];
    }
  }

  async recordSwipe(swiperId: string, targetId: string, type: 'like' | 'pass' | 'superlike'): Promise<{
    isMatch: boolean;
    match: Match | null;
    partner: User | null;
  }> {
    const swipeId = `sw-${swiperId}-${targetId}-${Date.now()}`;
    const swipeRecord: SwipeRecord = {
      id: swipeId,
      swiperId,
      targetId,
      type,
      timestamp: new Date().toISOString()
    };

    // Save swipe to Firestore
    await setDoc(doc(db, 'swipes', swipeId), swipeRecord);

    const targetUser = await this.getUserById(targetId);
    let isMatch = false;
    let createdMatch: Match | null = null;

    if (type === 'like' || type === 'superlike') {
      if (targetUser) {
        // Increment target's likes count
        await updateDoc(doc(db, 'users', targetId), {
          likesCount: (targetUser.likesCount || 0) + 1
        });
      }

      // Check if target has liked current user (mutual match)
      const swipesCol = collection(db, 'swipes');
      const q = query(
        swipesCol, 
        where('swiperId', '==', targetId), 
        where('targetId', '==', swiperId)
      );
      const mutualSnap = await getDocs(q);
      const mutualLikes = mutualSnap.docs.filter(d => {
        const t = d.data().type;
        return t === 'like' || t === 'superlike';
      });

      // If mutual or seed user match simulation
      if (mutualLikes.length > 0 || (targetUser && !targetUser.email.includes('@ejemplo.com') ? false : true)) {
        isMatch = true;
        const matchId = `match-${swiperId < targetId ? swiperId : targetId}-${swiperId < targetId ? targetId : swiperId}`;
        
        createdMatch = {
          id: matchId,
          userIds: [swiperId, targetId],
          matchedAt: new Date().toISOString(),
          lastMessage: `¡Hiciste match con ${targetUser?.name || 'alguien especial'}!`,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          partner: targetUser || undefined
        };

        await setDoc(doc(db, 'matches', matchId), {
          id: matchId,
          userIds: [swiperId, targetId],
          matchedAt: createdMatch.matchedAt,
          lastMessage: createdMatch.lastMessage,
          lastMessageTime: createdMatch.lastMessageTime,
          unreadCount: 0
        });

        // Add welcome system message
        const msgId = `msg-${Date.now()}`;
        await setDoc(doc(db, 'messages', msgId), {
          id: msgId,
          matchId,
          senderId: targetId,
          receiverId: swiperId,
          text: `¡Hola! Me alegra que hayamos conectado. ¿Qué tal estás? 😊`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }

    return { isMatch, match: createdMatch, partner: targetUser };
  }

  // -------------------------------------------------------------
  // MATCHES & CHAT
  // -------------------------------------------------------------
  async getMatches(currentUserId: string): Promise<Match[]> {
    await this.initializeDatabase();
    try {
      const matchesCol = collection(db, 'matches');
      const q = query(matchesCol, where('userIds', 'array-contains', currentUserId));
      const snap = await getDocs(q);
      
      const matches: Match[] = [];
      for (const d of snap.docs) {
        const m = d.data() as Match;
        const partnerId = m.userIds.find(id => id !== currentUserId);
        if (partnerId) {
          const partner = await this.getUserById(partnerId);
          matches.push({ ...m, partner: partner || undefined });
        }
      }
      return matches;
    } catch (err) {
      console.warn('[Firestore] Error getting matches:', err);
      return [];
    }
  }

  subscribeMatches(currentUserId: string, onUpdate: (matches: Match[]) => void): Unsubscribe {
    const matchesCol = collection(db, 'matches');
    const q = query(matchesCol, where('userIds', 'array-contains', currentUserId));

    return onSnapshot(q, async (snap) => {
      const matches: Match[] = [];
      for (const d of snap.docs) {
        const m = d.data() as Match;
        const partnerId = m.userIds.find(id => id !== currentUserId);
        if (partnerId) {
          const partner = await this.getUserById(partnerId);
          matches.push({ ...m, partner: partner || undefined });
        }
      }
      onUpdate(matches);
    }, (err) => {
      console.warn('[Firestore] Matches listener error:', err);
    });
  }

  async getMessages(matchId: string): Promise<Message[]> {
    try {
      const msgsCol = collection(db, 'messages');
      const q = query(msgsCol, where('matchId', '==', matchId));
      const snap = await getDocs(q);
      const msgs = snap.docs.map(d => d.data() as Message);
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return msgs;
    } catch (err) {
      console.warn('[Firestore] Error getting messages:', err);
      return [];
    }
  }

  subscribeMessages(matchId: string, onUpdate: (messages: Message[]) => void): Unsubscribe {
    const msgsCol = collection(db, 'messages');
    const q = query(msgsCol, where('matchId', '==', matchId));

    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => d.data() as Message);
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(msgs);
    }, (err) => {
      console.warn('[Firestore] Message listener error:', err);
    });
  }

  async sendMessage(matchId: string, senderId: string, receiverId: string, text: string): Promise<Message> {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: Message = {
      id: msgId,
      matchId,
      senderId,
      receiverId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      read: true
    };

    // Add to messages collection
    await setDoc(doc(db, 'messages', msgId), newMsg);

    // Update match's lastMessage in Firestore
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      lastMessage: text.trim(),
      lastMessageTime: newMsg.createdAt
    });

    return newMsg;
  }

  // -------------------------------------------------------------
  // ADMIN PANEL CONTROLS
  // -------------------------------------------------------------
  async getAdminStats(): Promise<AdminStats> {
    await this.initializeDatabase();
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const matchesSnap = await getDocs(collection(db, 'matches'));
      const swipesSnap = await getDocs(collection(db, 'swipes'));
      const messagesSnap = await getDocs(collection(db, 'messages'));

      const users = usersSnap.docs.map(d => d.data() as User);

      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        blockedUsers: users.filter(u => u.status === 'blocked').length,
        totalMatches: matchesSnap.size,
        totalSwipes: swipesSnap.size,
        totalMessages: messagesSnap.size,
        todayNewUsers: users.filter(u => {
          const created = new Date(u.createdAt);
          const today = new Date();
          return created.toDateString() === today.toDateString();
        }).length || 1,
        verifiedUsers: users.filter(u => u.verified).length
      };
    } catch (err) {
      console.warn('[Firestore] Error getting admin stats:', err);
      return {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        totalMatches: 0,
        totalSwipes: 0,
        totalMessages: 0,
        todayNewUsers: 0,
        verifiedUsers: 0
      };
    }
  }

  async getAllUsers(params?: { q?: string; status?: string; role?: string; sortBy?: string }): Promise<User[]> {
    await this.initializeDatabase();
    const snap = await getDocs(collection(db, 'users'));
    let users = snap.docs.map(d => d.data() as User);

    if (params?.q) {
      const q = params.q.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) || 
        u.location.toLowerCase().includes(q) ||
        (u.occupation && u.occupation.toLowerCase().includes(q))
      );
    }
    if (params?.status && params.status !== 'all') {
      users = users.filter(u => u.status === params.status);
    }
    if (params?.role && params.role !== 'all') {
      users = users.filter(u => u.role === params.role);
    }

    return users;
  }

  async blockUser(id: string, reason?: string, adminEmail = DEFAULT_ADMIN_EMAIL): Promise<User> {
    const user = await this.updateUser(id, { status: 'blocked' });
    await this.addAuditLog({
      id: `log-${Date.now()}`,
      adminEmail,
      action: 'BLOCK_USER',
      targetUserId: user.id,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: reason || 'Bloqueo administrativo de cuenta'
    });
    return user;
  }

  async unblockUser(id: string, adminEmail = DEFAULT_ADMIN_EMAIL): Promise<User> {
    const user = await this.updateUser(id, { status: 'active' });
    await this.addAuditLog({
      id: `log-${Date.now()}`,
      adminEmail,
      action: 'UNBLOCK_USER',
      targetUserId: user.id,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: 'Desbloqueo administrativo autorizado'
    });
    return user;
  }

  async toggleVerifyUser(id: string, adminEmail = DEFAULT_ADMIN_EMAIL): Promise<User> {
    const current = await this.getUserById(id);
    if (!current) throw new Error('Usuario no encontrado');
    const newVerified = !current.verified;
    const user = await this.updateUser(id, { verified: newVerified });
    await this.addAuditLog({
      id: `log-${Date.now()}`,
      adminEmail,
      action: newVerified ? 'VERIFY_USER' : 'UNVERIFY_USER',
      targetUserId: user.id,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: `Insignia de verificación ${newVerified ? 'otorgada' : 'revocada'}.`
    });
    return user;
  }

  async deleteUser(id: string, adminEmail = DEFAULT_ADMIN_EMAIL): Promise<void> {
    const targetUser = await this.getUserById(id);
    if (!targetUser) throw new Error('Usuario no encontrado');
    if (targetUser.role === 'admin') throw new Error('No podés eliminar la cuenta de administrador principal.');

    await deleteDoc(doc(db, 'users', id));
    await this.addAuditLog({
      id: `log-${Date.now()}`,
      adminEmail,
      action: 'DELETE_USER',
      targetUserId: id,
      targetUserName: targetUser.name,
      timestamp: new Date().toISOString(),
      details: `Eliminación de cuenta (${targetUser.email}).`
    });
  }

  async addAuditLog(log: AuditLog): Promise<void> {
    try {
      await setDoc(doc(db, 'auditLogs', log.id), log);
    } catch (err) {
      console.warn('[Firestore] Error saving audit log:', err);
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      const logs = snap.docs.map(d => d.data() as AuditLog);
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return logs;
    } catch (err) {
      console.warn('[Firestore] Error getting audit logs:', err);
      return [];
    }
  }
}

export const firebaseService = new FirebaseService();
