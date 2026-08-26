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
  Unsubscribe 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from './firebase';
import { User, Match, Message, AuditLog, SwipeRecord, AdminStats } from './types';
import { INITIAL_SEED_USERS, INITIAL_ADMIN, DEFAULT_ADMIN_EMAIL } from './localStore';

class FirebaseService {
  private initialized = false;

  // Initialize Firestore collections with seed profiles if empty
  async initializeDatabase(): Promise<void> {
    if (this.initialized) return;
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      
      if (snapshot.empty) {
        console.log('[Firestore] Seeding sample neurodivergent profiles...');
        for (const user of INITIAL_SEED_USERS) {
          // Exclude admin or dummy passwords
          await setDoc(doc(db, 'users', user.id), {
            id: user.id,
            name: user.name,
            email: user.email,
            age: user.age,
            gender: user.gender,
            bio: user.bio,
            photos: user.photos,
            location: user.location,
            distanceKm: user.distanceKm || 5,
            occupation: user.occupation,
            interests: user.interests,
            verified: user.verified || false,
            status: user.status || 'active',
            role: user.role || 'user',
            createdAt: user.createdAt || new Date().toISOString(),
            lastActive: new Date().toISOString(),
            likesCount: user.likesCount || 0,
            matchesCount: user.matchesCount || 0,
            preferences: user.preferences || {
              minAge: 18,
              maxAge: 60,
              interestedIn: ['female', 'male', 'non-binary', 'other'],
              maxDistanceKm: 50
            }
          });
        }
      }
      this.initialized = true;
    } catch (err) {
      console.warn('[Firestore] Initialization check:', err);
    }
  }

  // -------------------------------------------------------------
  // SECURE AUTHENTICATION (Firebase Auth SDK)
  // -------------------------------------------------------------
  async registerUser(userData: Partial<User>, plainPassword: string): Promise<User> {
    const email = (userData.email || '').trim().toLowerCase();
    if (!email || !plainPassword || plainPassword.length < 6) {
      throw new Error('El correo y una contraseña de al menos 6 caracteres son requeridos.');
    }

    // 1. Create account in Firebase Authentication (Password is hashed & handled securely by Firebase Auth)
    const cred = await createUserWithEmailAndPassword(auth, email, plainPassword);
    const uid = cred.user.uid;
    const isOwnerAdmin = email === DEFAULT_ADMIN_EMAIL.toLowerCase();

    // 2. Create public user profile in Firestore (/users/{uid})
    const newUser: User = {
      id: uid,
      name: userData.name?.trim() || 'Nuevo Miembro',
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
      verified: isOwnerAdmin,
      status: 'active',
      role: isOwnerAdmin ? 'admin' : 'user',
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

    // Storing ONLY profile attributes, NO password attribute!
    await setDoc(doc(db, 'users', uid), newUser);

    // If owner admin, also write to admin registry
    if (isOwnerAdmin) {
      try {
        await setDoc(doc(db, 'admins', uid), { email, role: 'admin', assignedAt: new Date().toISOString() });
      } catch (e) {
        console.warn('Could not set admin record:', e);
      }
    }

    return newUser;
  }

  async loginUser(email: string, pass: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    
    // Authenticate securely with Firebase Authentication
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const uid = cred.user.uid;

    // Fetch user profile from Firestore
    let user = await this.getUserById(uid);
    
    // If profile doesn't exist yet (e.g. newly authenticated), create profile
    if (!user) {
      const isOwnerAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
      user = {
        id: uid,
        name: cred.user.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        age: 25,
        gender: 'other',
        bio: 'Miembro de Vulnerable.',
        photos: [cred.user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'],
        location: 'Buenos Aires',
        distanceKm: 3,
        occupation: 'Neurodivergente',
        interests: ['Tecnología', 'Música'],
        verified: isOwnerAdmin,
        status: 'active',
        role: isOwnerAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        likesCount: 0,
        matchesCount: 0,
        preferences: {
          minAge: 18,
          maxAge: 65,
          interestedIn: ['female', 'male', 'non-binary', 'other'],
          maxDistanceKm: 50
        }
      };
      await setDoc(doc(db, 'users', uid), user);
    }

    if (user.status === 'blocked') {
      await signOut(auth);
      throw new Error('Esta cuenta se encuentra temporalmente suspendida.');
    }

    // Update lastActive timestamp
    const now = new Date().toISOString();
    user.lastActive = now;
    await updateDoc(doc(db, 'users', uid), { lastActive: now }).catch(() => {});

    return user;
  }

  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const uid = cred.user.uid;
    const email = cred.user.email || '';
    const isOwnerAdmin = email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

    let user = await this.getUserById(uid);
    if (!user) {
      user = {
        id: uid,
        name: cred.user.displayName || 'Usuario Google',
        email,
        age: 25,
        gender: 'other',
        bio: 'Conectando en Vulnerable.',
        photos: [cred.user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'],
        location: 'Buenos Aires, Argentina',
        distanceKm: 3,
        occupation: 'Neurodivergente',
        interests: ['Música', 'Lectura'],
        verified: isOwnerAdmin,
        status: 'active',
        role: isOwnerAdmin ? 'admin' : 'user',
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
      await setDoc(doc(db, 'users', uid), user);
    }

    return user;
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  getCurrentAuthUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  onAuthChange(callback: (user: FirebaseUser | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
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
    
    // Filter out forbidden keys (e.g. role, status, verified cannot be modified by user)
    const sanitizedData: Partial<User> = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.photos !== undefined && { photos: data.photos }),
      ...(data.age !== undefined && { age: Number(data.age) }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.occupation !== undefined && { occupation: data.occupation }),
      ...(data.interests !== undefined && { interests: data.interests }),
      ...(data.preferences !== undefined && { preferences: data.preferences }),
      lastActive: new Date().toISOString()
    };

    await setDoc(userRef, sanitizedData, { merge: true });
    const updated = await this.getUserById(userId);
    if (!updated) throw new Error('Usuario no encontrado tras actualizar.');
    return updated;
  }

  // -------------------------------------------------------------
  // FEED & MUTUAL SWIPING LOGIC (Fixing Issue #6)
  // -------------------------------------------------------------
  async getFeed(currentUserId: string): Promise<User[]> {
    await this.initializeDatabase();
    try {
      // 1. Get all swipes recorded by current user
      const swipesCol = collection(db, 'swipes');
      const qSwipes = query(swipesCol, where('swiperId', '==', currentUserId));
      const swipeSnap = await getDocs(qSwipes);
      const swipedTargetIds = new Set<string>();
      swipeSnap.forEach(d => {
        const sw = d.data() as SwipeRecord;
        if (sw.targetId) swipedTargetIds.add(sw.targetId);
      });

      // 2. Query available candidate profiles
      const usersCol = collection(db, 'users');
      const usersSnap = await getDocs(usersCol);
      const users: User[] = [];
      usersSnap.forEach(d => {
        const u = d.data() as User;
        if (
          u.id !== currentUserId && 
          u.role !== 'admin' && 
          u.status === 'active' && 
          !swipedTargetIds.has(u.id)
        ) {
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

    // 1. Record the swipe in Firestore
    await setDoc(doc(db, 'swipes', swipeId), swipeRecord);

    const targetUser = await this.getUserById(targetId);
    let isMatch = false;
    let createdMatch: Match | null = null;

    // If it's a pass, no match can occur
    if (type === 'pass') {
      return { isMatch: false, match: null, partner: targetUser };
    }

    // 2. Increment target's likesCount
    if (targetUser) {
      await updateDoc(doc(db, 'users', targetId), {
        likesCount: (targetUser.likesCount || 0) + 1
      }).catch(() => {});
    }

    // 3. MUTUAL MATCH CHECK:
    // Check if targetUser has ALREADY swiped 'like' or 'superlike' on current user
    const swipesCol = collection(db, 'swipes');
    const mutualQuery = query(
      swipesCol, 
      where('swiperId', '==', targetId), 
      where('targetId', '==', swiperId)
    );
    const mutualSnap = await getDocs(mutualQuery);
    const hasTargetLikedSwiper = mutualSnap.docs.some(d => {
      const t = d.data().type;
      return t === 'like' || t === 'superlike';
    });

    // If target is a seeded demo profile, simulate realistic reciprocal interest
    const isSeedProfile = targetUser && (targetUser.email.includes('@ejemplo.com') || targetId.startsWith('user-'));
    const isReciprocal = hasTargetLikedSwiper || (isSeedProfile && (type === 'superlike' || Math.random() > 0.3));

    if (isReciprocal) {
      isMatch = true;
      const firstId = swiperId < targetId ? swiperId : targetId;
      const secondId = swiperId < targetId ? targetId : swiperId;
      const matchId = `match-${firstId}-${secondId}`;
      
      createdMatch = {
        id: matchId,
        userIds: [swiperId, targetId],
        matchedAt: new Date().toISOString(),
        lastMessage: `¡Hiciste match con ${targetUser?.name || 'alguien especial'}!`,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        partner: targetUser || undefined
      };

      // Save match document to Firestore
      await setDoc(doc(db, 'matches', matchId), {
        id: matchId,
        userIds: [swiperId, targetId],
        matchedAt: createdMatch.matchedAt,
        lastMessage: createdMatch.lastMessage,
        lastMessageTime: createdMatch.lastMessageTime,
        unreadCount: 0
      }, { merge: true });

      // Update matches count for both
      await updateDoc(doc(db, 'users', swiperId), {
        matchesCount: ((await this.getUserById(swiperId))?.matchesCount || 0) + 1
      }).catch(() => {});

      if (targetUser) {
        await updateDoc(doc(db, 'users', targetId), {
          matchesCount: (targetUser.matchesCount || 0) + 1
        }).catch(() => {});
      }

      // Automatically create a welcoming greeting message from the match
      const msgId = `msg-${Date.now()}`;
      await setDoc(doc(db, 'messages', msgId), {
        id: msgId,
        matchId,
        senderId: targetId,
        receiverId: swiperId,
        text: `¡Hola! Me alegra mucho que hayamos conectado. ¿Cómo va tu día? 😊`,
        createdAt: new Date().toISOString(),
        read: false
      });
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

  subscribeMatches(currentUserId: string, callback: (matches: Match[]) => void): Unsubscribe {
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
      callback(matches);
    }, (err) => {
      console.warn('[Firestore] Matches subscription error:', err);
    });
  }

  subscribeMessages(matchId: string, currentUserId: string, callback: (messages: Message[]) => void): Unsubscribe {
    const messagesCol = collection(db, 'messages');
    const q = query(
      messagesCol, 
      where('matchId', '==', matchId)
    );

    return onSnapshot(q, (snap) => {
      const messages: Message[] = [];
      snap.forEach(d => {
        const msg = d.data() as Message;
        // Verify current user belongs to the message exchange
        if (msg.senderId === currentUserId || msg.receiverId === currentUserId) {
          messages.push(msg);
        }
      });
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(messages);
    }, (err) => {
      console.warn('[Firestore] Messages subscription error:', err);
    });
  }

  async sendMessage(matchId: string, senderId: string, receiverId: string, text: string): Promise<Message> {
    const cleanText = text.trim();
    if (!cleanText) throw new Error('El mensaje no puede estar vacío.');

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    
    const newMsg: Message = {
      id: msgId,
      matchId,
      senderId,
      receiverId,
      text: cleanText,
      createdAt: now,
      read: false
    };

    await setDoc(doc(db, 'messages', msgId), newMsg);

    // Update match summary in Firestore
    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: cleanText,
      lastMessageTime: now
    }).catch(() => {});

    return newMsg;
  }

  // -------------------------------------------------------------
  // ADMIN & AUDIT
  // -------------------------------------------------------------
  async getAdminStats(): Promise<AdminStats> {
    const usersSnap = await getDocs(collection(db, 'users'));
    const matchesSnap = await getDocs(collection(db, 'matches'));
    const messagesSnap = await getDocs(collection(db, 'messages'));
    const swipesSnap = await getDocs(collection(db, 'swipes'));

    const users = usersSnap.docs.map(d => d.data() as User);
    const active = users.filter(u => u.status === 'active').length;
    const blocked = users.filter(u => u.status === 'blocked').length;
    const verified = users.filter(u => u.verified).length;

    return {
      totalUsers: users.length,
      activeUsers: active,
      blockedUsers: blocked,
      totalMatches: matchesSnap.size,
      totalMessages: messagesSnap.size,
      totalSwipes: swipesSnap.size,
      todayNewUsers: users.filter(u => {
        const diff = Date.now() - new Date(u.createdAt).getTime();
        return diff < 86400000;
      }).length,
      verifiedUsers: verified
    };
  }

  async getAllUsersAdmin(): Promise<User[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as User);
  }

  async adminToggleUserStatus(targetUserId: string, adminEmail: string): Promise<User> {
    const user = await this.getUserById(targetUserId);
    if (!user) throw new Error('Usuario no encontrado');

    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, 'users', targetUserId), { status: newStatus });
    
    // Log action to auditLogs collection
    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      adminEmail,
      action: newStatus === 'blocked' ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetUserId,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: `Usuario cambiado a estado: ${newStatus}`
    });

    return { ...user, status: newStatus };
  }

  async adminToggleUserVerification(targetUserId: string, adminEmail: string): Promise<User> {
    const user = await this.getUserById(targetUserId);
    if (!user) throw new Error('Usuario no encontrado');

    const newVerified = !user.verified;
    await updateDoc(doc(db, 'users', targetUserId), { verified: newVerified });

    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      adminEmail,
      action: newVerified ? 'VERIFY_USER' : 'UNVERIFY_USER',
      targetUserId,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: `Insignia de verificación: ${newVerified ? 'Otorgada' : 'Revocada'}`
    });

    return { ...user, verified: newVerified };
  }

  async adminDeleteUser(targetUserId: string, adminEmail: string): Promise<void> {
    const user = await this.getUserById(targetUserId);
    await deleteDoc(doc(db, 'users', targetUserId));

    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      adminEmail,
      action: 'DELETE_USER',
      targetUserId,
      targetUserName: user?.name || targetUserId,
      timestamp: new Date().toISOString(),
      details: `Cuenta eliminada permanentemente por el administrador.`
    });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const snap = await getDocs(collection(db, 'auditLogs'));
    const logs = snap.docs.map(d => d.data() as AuditLog);
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }
}

export const firebaseService = new FirebaseService();
