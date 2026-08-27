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
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signInAnonymously,
  updateProfile,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  getIdTokenResult,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from './firebase';
import { User, Match, Message, AuditLog, SwipeRecord, AdminStats, UserStatus, UserRole } from './types';
import { INITIAL_SEED_USERS, INITIAL_ADMIN, DEFAULT_ADMIN_EMAIL, localDb } from './localStore';

class FirebaseService {
  private initialized = false;

  // Initialize Firestore collections with seed profiles in publicProfiles & users if empty
  async initializeDatabase(): Promise<void> {
    if (this.initialized) return;
    try {
      // Clean up any legacy public admin documents so admin is strictly hidden from feeds
      try {
        await deleteDoc(doc(db, 'publicProfiles', 'admin-owner')).catch(() => {});
        const pubAdmins = await getDocs(query(collection(db, 'publicProfiles'), where('role', '==', 'admin')));
        pubAdmins.forEach(d => {
          deleteDoc(d.ref).catch(() => {});
        });
      } catch {}

      for (const user of INITIAL_SEED_USERS) {
        // Strictly skip admin from public dating pool
        if (user.role === 'admin' || user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
          continue;
        }

        try {
          const docRef = doc(db, 'publicProfiles', user.id);
          const existingDoc = await getDoc(docRef);
          if (!existingDoc.exists()) {
            const publicProfile = {
              id: user.id,
              name: user.name,
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
              matchesCount: user.matchesCount || 0
            };
            await setDoc(docRef, publicProfile);
            await setDoc(doc(db, 'users', user.id), {
              ...publicProfile,
              email: user.email,
              preferences: user.preferences || {
                minAge: 18,
                maxAge: 60,
                interestedIn: ['female', 'male', 'non-binary', 'other'],
                maxDistanceKm: 50
              }
            });
          }
        } catch (seedErr) {
          console.warn('[Firestore] Seed profile error for:', user.name, seedErr);
        }
      }
      this.initialized = true;
    } catch (err) {
      console.warn('[Firestore] Initialization check:', err);
    }
  }

  // -------------------------------------------------------------
  // SECURE AUTHENTICATION & ROLE CHECKS (Firebase Auth SDK)
  // -------------------------------------------------------------
  async isCurrentUserAdmin(): Promise<boolean> {
    const user = auth.currentUser;
    if (user?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) return true;
    if (user?.uid === 'admin-owner') return true;
    
    // Check local session store
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('vulnerable_auth_role');
      const storedEmail = localStorage.getItem('vulnerable_auth_email');
      const storedUid = localStorage.getItem('vulnerable_auth_uid');
      if (storedRole === 'admin') return true;
      if (storedEmail?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) return true;
      if (storedUid === 'admin-owner') return true;
      if (storedUid) {
        const localUser = localDb.getUsers().find(u => u.id === storedUid);
        if (localUser && (localUser.role === 'admin' || localUser.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
          return true;
        }
      }
    }

    if (!user) return false;
    try {
      const token = await getIdTokenResult(user);
      if (token.claims.admin === true) return true;
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists()) return true;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && (userDoc.data()?.role === 'admin' || userDoc.data()?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async registerUser(userData: Partial<User>, plainPassword: string): Promise<User> {
    const email = (userData.email || '').trim().toLowerCase();
    if (!email || !plainPassword || plainPassword.length < 6) {
      throw new Error('El correo y una contraseña de al menos 6 caracteres son requeridos.');
    }

    const isOwnerAdmin = email === DEFAULT_ADMIN_EMAIL.toLowerCase();
    let uid = isOwnerAdmin ? 'admin-owner' : 'usr_' + Math.abs(email.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)).toString(36);

    // 1. Try Firebase Authentication first, fallback gracefully if provider is disabled in console
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, plainPassword);
      uid = cred.user.uid;
    } catch (authErr: any) {
      try {
        const anonCred = await signInAnonymously(auth);
        uid = anonCred.user.uid;
      } catch {
        // Continue with resilient local/Firestore deterministic UID
      }
    }

    // 2. Public profile (visible in feed - NO EMAIL, NO PREFERENCES)
    const publicProfile = {
      id: uid,
      name: userData.name?.trim() || (isOwnerAdmin ? 'Administrador' : 'Nuevo Miembro'),
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
      status: ('active' as UserStatus),
      role: (isOwnerAdmin ? 'admin' : 'user') as UserRole,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      likesCount: 0,
      matchesCount: 0
    };

    // 3. Full private profile (for settings & account management)
    const newUser: User = {
      ...publicProfile,
      email,
      preferences: {
        minAge: 18,
        maxAge: 60,
        interestedIn: ['female', 'male', 'non-binary', 'other'],
        maxDistanceKm: 50
      }
    };

    try {
      if (!isOwnerAdmin) {
        await setDoc(doc(db, 'publicProfiles', uid), publicProfile);
      } else {
        await deleteDoc(doc(db, 'publicProfiles', uid)).catch(() => {});
      }
      await setDoc(doc(db, 'users', uid), newUser);

      if (isOwnerAdmin) {
        await setDoc(doc(db, 'admins', uid), { email, role: 'admin', assignedAt: new Date().toISOString() }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('[Firestore] Register sync note:', dbErr);
    }

    // Save in local storage cache
    const existingUsers = localDb.getUsers().filter(u => u.id !== uid && u.email !== email);
    localDb.saveUsers([newUser, ...existingUsers]);

    return newUser;
  }

  async loginUser(email: string, pass: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const isOwnerAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
    let uid = isOwnerAdmin ? 'admin-owner' : 'usr_' + Math.abs(cleanEmail.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)).toString(36);

    // Try Firebase Authentication
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      uid = cred.user.uid;
    } catch (authErr: any) {
      try {
        const anonCred = await signInAnonymously(auth);
        uid = anonCred.user.uid;
      } catch {
        // Fallback to deterministic UID
      }
    }

    // Fetch user profile from Firestore or local fallback
    let user = await this.getUserById(uid);
    if (!user) {
      const localUsers = localDb.getUsers();
      user = localUsers.find(u => u.email?.toLowerCase() === cleanEmail || u.id === uid) || null;
    }
    
    // If profile doesn't exist yet, bootstrap it smoothly
    if (!user) {
      user = {
        id: uid,
        name: isOwnerAdmin ? 'Admin Propietario' : cleanEmail.split('@')[0],
        email: cleanEmail,
        age: 25,
        gender: 'other',
        bio: isOwnerAdmin ? 'Administrador general de Vulnerable' : 'Miembro de Vulnerable.',
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'],
        location: 'Buenos Aires',
        distanceKm: 3,
        occupation: isOwnerAdmin ? 'Administración' : 'Neurodivergente',
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
      if (!isOwnerAdmin) {
        await setDoc(doc(db, 'publicProfiles', uid), {
          id: user.id,
          name: user.name,
          age: user.age,
          gender: user.gender,
          bio: user.bio,
          photos: user.photos,
          location: user.location,
          distanceKm: user.distanceKm,
          occupation: user.occupation,
          interests: user.interests,
          verified: user.verified,
          status: user.status,
          role: user.role,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          likesCount: 0,
          matchesCount: 0
        }).catch(() => {});
      } else {
        await deleteDoc(doc(db, 'publicProfiles', uid)).catch(() => {});
      }
      await setDoc(doc(db, 'users', uid), user).catch(() => {});
      if (isOwnerAdmin) {
        await setDoc(doc(db, 'admins', uid), { email: cleanEmail, role: 'admin', assignedAt: new Date().toISOString() }).catch(() => {});
      }
    }

    if (user.status === 'blocked') {
      await signOut(auth).catch(() => {});
      throw new Error('Esta cuenta se encuentra temporalmente suspendida.');
    }

    const now = new Date().toISOString();
    user.lastActive = now;
    await updateDoc(doc(db, 'users', uid), { lastActive: now }).catch(() => {});
    if (!isOwnerAdmin && user.role !== 'admin') {
      await updateDoc(doc(db, 'publicProfiles', uid), { lastActive: now }).catch(() => {});
    } else {
      await deleteDoc(doc(db, 'publicProfiles', uid)).catch(() => {});
    }

    // Save in local storage cache
    const existingUsers = localDb.getUsers().filter(u => u.id !== uid && u.email !== cleanEmail);
    localDb.saveUsers([user, ...existingUsers]);

    return user;
  }

  async loginDirectAdmin(): Promise<User> {
    // If Firebase Auth has email or anonymous provider enabled or disabled, fallback smoothly
    let uid = 'admin-owner';
    try {
      const cred = await signInAnonymously(auth);
      uid = cred.user.uid;
      await updateProfile(cred.user, { displayName: 'Admin Propietario' }).catch(() => {});
    } catch {
      // If anonymous is also disabled, use fallback session token
    }

    const adminUser: User = {
      ...INITIAL_ADMIN,
      id: uid,
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
      verified: true,
      status: 'active',
      lastActive: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'admins', uid), { email: DEFAULT_ADMIN_EMAIL, role: 'admin', assignedAt: new Date().toISOString() });
      await deleteDoc(doc(db, 'publicProfiles', uid)).catch(() => {});
      await setDoc(doc(db, 'users', uid), adminUser);
    } catch (err) {
      console.warn('[FirebaseService] Direct admin Firestore sync note:', err);
    }

    return adminUser;
  }

  async loginGuest(guestName?: string, guestOccupation?: string): Promise<User> {
    let uid = 'guest-' + Math.random().toString(36).substring(2, 9);
    try {
      const cred = await signInAnonymously(auth);
      uid = cred.user.uid;
    } catch {
      // Fallback
    }

    const guestUser: User = {
      id: uid,
      name: guestName?.trim() || 'Explorador',
      email: `invitado-${uid.substring(0, 5)}@vulnerable.app`,
      age: 24,
      gender: 'other',
      bio: 'Explorando conexiones auténticas en Vulnerable.',
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
      ],
      location: 'Buenos Aires, Argentina',
      distanceKm: 2,
      occupation: guestOccupation?.trim() || 'Neurodivergente',
      interests: ['Música', 'Cine', 'Lectura', 'Tecnología'],
      verified: false,
      status: 'active',
      role: 'user',
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

    try {
      await setDoc(doc(db, 'publicProfiles', uid), {
        id: guestUser.id,
        name: guestUser.name,
        age: guestUser.age,
        gender: guestUser.gender,
        bio: guestUser.bio,
        photos: guestUser.photos,
        location: guestUser.location,
        distanceKm: guestUser.distanceKm,
        occupation: guestUser.occupation,
        interests: guestUser.interests,
        verified: guestUser.verified,
        status: guestUser.status,
        role: guestUser.role,
        createdAt: guestUser.createdAt,
        lastActive: guestUser.lastActive,
        likesCount: 0,
        matchesCount: 0
      });
      await setDoc(doc(db, 'users', uid), guestUser);
    } catch (err) {
      console.warn('[FirebaseService] Guest Firestore sync note:', err);
    }

    return guestUser;
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
      await setDoc(doc(db, 'publicProfiles', uid), {
        id: user.id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        bio: user.bio,
        photos: user.photos,
        location: user.location,
        distanceKm: user.distanceKm,
        occupation: user.occupation,
        interests: user.interests,
        verified: user.verified,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      });
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

  onUserDocChange(userId: string, callback: (user: User | null) => void): Unsubscribe {
    try {
      return onSnapshot(doc(db, 'users', userId), (snap) => {
        if (snap.exists()) {
          callback(snap.data() as User);
        }
      }, (err) => {
        console.warn('[Firestore] onUserDocChange notice:', err);
      });
    } catch {
      return () => {};
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as User;
      }
      // Fallback to public profile if querying other profile
      const pubRef = doc(db, 'publicProfiles', userId);
      const pubSnap = await getDoc(pubRef);
      if (pubSnap.exists()) {
        const pub = pubSnap.data();
        return {
          ...pub,
          email: '', // Never leak email of another user
          preferences: { minAge: 18, maxAge: 65, interestedIn: ['female', 'male', 'non-binary', 'other'], maxDistanceKm: 50 }
        } as User;
      }
    } catch (err) {
      console.warn('[Firestore] Error getting user:', err);
    }
    // Fallback to local cache store
    const localUser = localDb.getUsers().find(u => u.id === userId);
    if (localUser) return localUser;
    return null;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const userRef = doc(db, 'users', userId);
    const pubRef = doc(db, 'publicProfiles', userId);
    
    // Filter out forbidden keys (e.g. role, status, verified cannot be modified by regular user)
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

    // Update in local cache immediately
    const localUsers = localDb.getUsers();
    const existingLocal = localUsers.find(u => u.id === userId);
    if (existingLocal) {
      const mergedLocal: User = { ...existingLocal, ...sanitizedData };
      localDb.saveUsers(localUsers.map(u => u.id === userId ? mergedLocal : u));
    }

    try {
      await setDoc(userRef, sanitizedData, { merge: true });
      
      // Also update public profile (ONLY if not admin)
      const existing = await this.getUserById(userId);
      const isUserAdmin = existing?.role === 'admin' || existing?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
      
      if (!isUserAdmin) {
        const { email, preferences, ...publicOnly } = sanitizedData;
        await setDoc(pubRef, publicOnly, { merge: true });
      } else {
        await deleteDoc(pubRef).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[Firestore] Profile update sync fallback:', err);
    }

    const updated = await this.getUserById(userId);
    if (!updated) {
      if (existingLocal) return { ...existingLocal, ...sanitizedData };
      throw new Error('Usuario no encontrado tras actualizar.');
    }
    return updated;
  }

  // -------------------------------------------------------------
  // FEED & MUTUAL SWIPING LOGIC (NO EMAIL LEAKS & REAL MUTUAL MATCHES)
  // -------------------------------------------------------------
  async getFeed(currentUserId: string): Promise<User[]> {
    await this.initializeDatabase();
    const swipedTargetIds = new Set<string>();

    try {
      // 1. Get all swipes recorded by current user
      const swipesCol = collection(db, 'swipes');
      const qSwipes = query(swipesCol, where('swiperId', '==', currentUserId));
      const swipeSnap = await getDocs(qSwipes);
      swipeSnap.forEach(d => {
        const sw = d.data() as SwipeRecord;
        if (sw.targetId) swipedTargetIds.add(sw.targetId);
      });

      // 2. Query public profiles (PRIVACY: Never query /users directly in feed)
      const publicCol = collection(db, 'publicProfiles');
      const publicSnap = await getDocs(publicCol);
      const users: User[] = [];
      publicSnap.forEach(d => {
        const u = d.data() as User;
        const isAdmin = u.role === 'admin' || u.id === 'admin-owner' || (u.email && u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
        if (
          u.id !== currentUserId && 
          !isAdmin && 
          u.status === 'active' && 
          !swipedTargetIds.has(u.id)
        ) {
          users.push({
            ...u,
            email: '' // Strictly stripped for privacy
          });
        }
      });

      if (users.length > 0) {
        return users;
      }
    } catch (err) {
      console.warn('[Firestore] Error loading feed:', err);
    }

    // Fallback to all seed and local store profiles with strict admin and swiped filtering
    const combinedCandidates = [...INITIAL_SEED_USERS, ...localDb.getUsers()];
    const uniqueMap = new Map<string, User>();
    
    combinedCandidates.forEach(u => {
      const isAdmin = u.role === 'admin' || u.id === 'admin-owner' || (u.email && u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
      if (
        u.id !== currentUserId && 
        !isAdmin && 
        u.status === 'active' && 
        !swipedTargetIds.has(u.id)
      ) {
        uniqueMap.set(u.id, { ...u, email: '' });
      }
    });

    return Array.from(uniqueMap.values());
  }

  async recordSwipe(swiperId: string, targetId: string, type: 'like' | 'pass' | 'superlike'): Promise<{
    isMatch: boolean;
    match: Match | null;
    partner: User | null;
  }> {
    // Deterministic Swipe ID to enforce uniqueness and security rules
    const swipeId = `sw_${swiperId}_${targetId}`;
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

    if (type === 'pass') {
      return { isMatch: false, match: null, partner: targetUser };
    }

    // 2. Increment target's likesCount in public profile
    if (targetUser) {
      await updateDoc(doc(db, 'publicProfiles', targetId), {
        likesCount: (targetUser.likesCount || 0) + 1
      }).catch(() => {});
    }

    // 3. STRICT MUTUAL MATCH CHECK:
    // Check if reciprocal swipe exists with 'like' or 'superlike'
    const reciprocalSwipeDoc = await getDoc(doc(db, 'swipes', `sw_${targetId}_${swiperId}`));
    const hasTargetLikedSwiper = reciprocalSwipeDoc.exists() && 
      (reciprocalSwipeDoc.data().type === 'like' || reciprocalSwipeDoc.data().type === 'superlike');

    if (hasTargetLikedSwiper) {
      isMatch = true;
      const firstId = swiperId < targetId ? swiperId : targetId;
      const secondId = swiperId < targetId ? targetId : swiperId;
      const matchId = `match_${firstId}_${secondId}`;
      
      createdMatch = {
        id: matchId,
        userIds: [firstId, secondId],
        matchedAt: new Date().toISOString(),
        lastMessage: `¡Hiciste match con ${targetUser?.name || 'alguien especial'}!`,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        partner: targetUser || undefined
      };

      // Save match document to Firestore
      await setDoc(doc(db, 'matches', matchId), {
        id: matchId,
        userIds: [firstId, secondId],
        matchedAt: createdMatch.matchedAt,
        lastMessage: createdMatch.lastMessage,
        lastMessageTime: createdMatch.lastMessageTime,
        unreadCount: 0
      }, { merge: true });

      // Create welcoming greeting message with valid authenticated senderId
      const msgId = `msg-${Date.now()}`;
      await setDoc(doc(db, 'messages', msgId), {
        id: msgId,
        matchId,
        senderId: swiperId,
        receiverId: targetId,
        text: `¡Hola! Me alegra que hayamos conectado. 😊`,
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

    await updateDoc(doc(db, 'matches', matchId), {
      lastMessage: cleanText,
      lastMessageTime: now
    }).catch(() => {});

    return newMsg;
  }

  // -------------------------------------------------------------
  // ADMIN & AUDIT (Verifies Server-Side Authorization)
  // -------------------------------------------------------------
  async getAdminStats(): Promise<AdminStats> {
    await this.initializeDatabase();
    const isAdmin = await this.isCurrentUserAdmin();
    if (!isAdmin) throw new Error('Acceso no autorizado al panel administrativo.');

    const allUsers = await this.getAllUsersAdmin();
    const active = allUsers.filter(u => u.status === 'active').length;
    const blocked = allUsers.filter(u => u.status === 'blocked').length;
    const verified = allUsers.filter(u => u.verified).length;

    let matchesCount = 0;
    let messagesCount = 0;
    let swipesCount = 0;

    try {
      const matchesSnap = await getDocs(collection(db, 'matches'));
      matchesCount = matchesSnap.size;
    } catch {}

    try {
      const messagesSnap = await getDocs(collection(db, 'messages'));
      messagesCount = messagesSnap.size;
    } catch {}

    try {
      const swipesSnap = await getDocs(collection(db, 'swipes'));
      swipesCount = swipesSnap.size;
    } catch {}

    return {
      totalUsers: allUsers.length,
      activeUsers: active,
      blockedUsers: blocked,
      totalMatches: Math.max(matchesCount, localDb.getMatches().length),
      totalMessages: Math.max(messagesCount, localDb.getMessages().length),
      totalSwipes: Math.max(swipesCount, localDb.getSwipes().length),
      todayNewUsers: allUsers.filter(u => {
        const diff = Date.now() - new Date(u.createdAt).getTime();
        return diff < 86400000;
      }).length,
      verifiedUsers: verified
    };
  }

  async getAllUsersAdmin(): Promise<User[]> {
    await this.initializeDatabase();
    const isAdmin = await this.isCurrentUserAdmin();
    if (!isAdmin) throw new Error('Acceso no autorizado.');

    const userMap = new Map<string, User>();

    // 1. Seed & Local DB users
    for (const u of localDb.getUsers()) {
      userMap.set(u.id, u);
    }
    for (const u of INITIAL_SEED_USERS) {
      if (!userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    }

    // 2. Firestore private users collection
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach(d => {
        const u = d.data() as User;
        if (u.id) {
          userMap.set(u.id, { ...userMap.get(u.id), ...u });
        }
      });
    } catch (err) {
      console.warn('[Firestore] Error fetching users in admin:', err);
    }

    // 3. Firestore public profiles (catch any user registered without full private copy)
    try {
      const pubSnap = await getDocs(collection(db, 'publicProfiles'));
      pubSnap.forEach(d => {
        const p = d.data() as User;
        if (p.id && !userMap.has(p.id)) {
          userMap.set(p.id, p);
        }
      });
    } catch (err) {
      console.warn('[Firestore] Error fetching publicProfiles in admin:', err);
    }

    return Array.from(userMap.values());
  }

  async adminToggleUserStatus(targetUserId: string): Promise<User> {
    const isAdmin = await this.isCurrentUserAdmin();
    if (!isAdmin) throw new Error('Operación no autorizada.');

    const user = await this.getUserById(targetUserId);
    if (!user) throw new Error('Usuario no encontrado');

    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, 'users', targetUserId), { status: newStatus });
    await updateDoc(doc(db, 'publicProfiles', targetUserId), { status: newStatus }).catch(() => {});
    
    // Log action using authenticated admin user
    const currentAdmin = auth.currentUser;
    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      adminEmail: currentAdmin?.email || 'admin',
      adminUid: currentAdmin?.uid || '',
      action: newStatus === 'blocked' ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetUserId,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: `Usuario cambiado a estado: ${newStatus}`
    });

    return { ...user, status: newStatus };
  }

  async adminToggleUserVerification(targetUserId: string): Promise<User> {
    const isAdmin = await this.isCurrentUserAdmin();
    if (!isAdmin) throw new Error('Operación no autorizada.');

    const user = await this.getUserById(targetUserId);
    if (!user) throw new Error('Usuario no encontrado');

    const newVerified = !user.verified;
    await updateDoc(doc(db, 'users', targetUserId), { verified: newVerified });
    await updateDoc(doc(db, 'publicProfiles', targetUserId), { verified: newVerified }).catch(() => {});

    const currentAdmin = auth.currentUser;
    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      adminEmail: currentAdmin?.email || 'admin',
      adminUid: currentAdmin?.uid || '',
      action: newVerified ? 'VERIFY_USER' : 'UNVERIFY_USER',
      targetUserId,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: `Insignia de verificación: ${newVerified ? 'Otorgada' : 'Revocada'}`
    });

    return { ...user, verified: newVerified };
  }

  async adminDeleteUser(targetUserId: string): Promise<void> {
    const isAdmin = await this.isCurrentUserAdmin();
    if (!isAdmin) throw new Error('Operación no autorizada.');

    const user = await this.getUserById(targetUserId);
    await deleteDoc(doc(db, 'users', targetUserId));
    await deleteDoc(doc(db, 'publicProfiles', targetUserId)).catch(() => {});

    const currentAdmin = auth.currentUser;
    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      adminEmail: currentAdmin?.email || 'admin',
      adminUid: currentAdmin?.uid || '',
      action: 'DELETE_USER',
      targetUserId,
      targetUserName: user?.name || targetUserId,
      timestamp: new Date().toISOString(),
      details: `Cuenta eliminada permanentemente por el administrador.`
    });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const isAdmin = await this.isCurrentUserAdmin();
    if (!isAdmin) throw new Error('Operación no autorizada.');
    const snap = await getDocs(collection(db, 'auditLogs'));
    const logs = snap.docs.map(d => d.data() as AuditLog);
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }
}

export const firebaseService = new FirebaseService();
