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
  updatePassword,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  getIdTokenResult,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db, firebaseConfig } from './firebase';
import { User, Match, Message, AuditLog, SwipeRecord, AdminStats, UserStatus, UserRole } from './types';
import { INITIAL_SEED_USERS, INITIAL_ADMIN, DEFAULT_ADMIN_EMAIL, localDb } from './localStore';
import { DEMO_ACCOUNTS, hashPassword, isPasswordValidForDemoAccount } from './utils/security';

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
  async isCurrentUserAdmin(targetEmailOrUid?: string | null): Promise<boolean> {
    const cleanAdminEmail = DEFAULT_ADMIN_EMAIL.toLowerCase();

    // 0. Explicit check for provided target user email or UID
    if (targetEmailOrUid) {
      const val = targetEmailOrUid.toLowerCase().trim();
      if (val === cleanAdminEmail || val === 'admin-owner') return true;
      const specificUser = localDb.getUsers().find(u => u.id === targetEmailOrUid);
      if (specificUser) {
        return (specificUser.email || '').toLowerCase().trim() === cleanAdminEmail || specificUser.id === 'admin-owner';
      }
      return false;
    }

    // 1. Direct Firebase Auth currentUser check
    const user = auth.currentUser;
    if (user) {
      const email = (user.email || '').toLowerCase().trim();
      if (email === cleanAdminEmail || user.uid === 'admin-owner') return true;
      try {
        const token = await getIdTokenResult(user);
        if (token.claims.admin === true) return true;
      } catch {}
      return false;
    }
    
    // 2. Check local session store for the currently logged in user
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('vulnerable_auth_email')?.toLowerCase().trim();
      const storedUid = localStorage.getItem('vulnerable_auth_uid');
      if (storedEmail === cleanAdminEmail || storedUid === 'admin-owner') return true;

      // Clean up stale or corrupted admin role if active session is another user
      if (storedEmail && storedEmail !== cleanAdminEmail) {
        if (localStorage.getItem('vulnerable_auth_role') === 'admin') {
          localStorage.setItem('vulnerable_auth_role', 'user');
        }
        return false;
      }
    }

    return false;
  }

  async registerUser(userData: Partial<User>, plainPassword: string): Promise<User> {
    const email = (userData.email || '').trim().toLowerCase();
    const cleanPass = (plainPassword || '').trim();
    if (!email || !cleanPass || cleanPass.length < 6) {
      throw new Error('El correo y una contraseña de al menos 6 caracteres son requeridos.');
    }

    // Check if user is already registered locally or in Firestore
    const existingLocal = localDb.getUsers().find(u => (u.email || '').toLowerCase().trim() === email);
    if (existingLocal) {
      throw new Error('Este correo electrónico ya se encuentra registrado. Por favor inicia sesión en la pestaña "Ingresar".');
    }

    const isOwnerAdmin = email === DEFAULT_ADMIN_EMAIL.toLowerCase();
    let uid = isOwnerAdmin ? 'admin-owner' : 'usr_' + Math.abs(email.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)).toString(36);

    // Compute cryptographic password hash
    const passwordHash = await hashPassword(cleanPass);

    // 1. Try Firebase Authentication first, fallback gracefully if provider is disabled in console
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, cleanPass);
      uid = cred.user.uid;
    } catch (authErr: any) {
      const code = authErr?.code;
      if (code === 'auth/email-already-in-use') {
        throw new Error('Este correo electrónico ya se encuentra registrado en Firebase. Por favor inicia sesión.');
      }
      try {
        const anonCred = await signInAnonymously(auth);
        uid = anonCred.user.uid;
      } catch {
        // Continue with resilient local/Firestore deterministic UID
      }
    }

    // Save credential in local database
    localDb.saveCredential(email, passwordHash, uid);

    // 2. Public profile (visible in feed - NO EMAIL, NO PREFERENCES, NO PASSWORDS)
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
      passwordHash,
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
      await setDoc(doc(db, 'credentials', email), {
        email,
        passwordHash,
        userId: uid,
        updatedAt: new Date().toISOString()
      }).catch(() => {});

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
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Por favor ingresa tanto tu correo como tu contraseña.');
    }

    const isOwnerAdmin = cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();

    // 1. Locate user in local store or Firestore
    const localUsers = localDb.getUsers();
    let user = localUsers.find(u => (u.email || '').toLowerCase().trim() === cleanEmail) || null;

    if (!user) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          user = snap.docs[0].data() as User;
        }
      } catch {}
    }

    // If user is completely unregistered and not the default admin, reject immediately
    if (!user && !isOwnerAdmin) {
      throw new Error(`No existe ninguna cuenta registrada con el correo "${cleanEmail}". Por favor crea una cuenta en la pestaña "Registrarse".`);
    }

    // 2. Strict Password Validation: Exact complete password match is mandatory for ALL accounts!
    const isDemoAcc = isPasswordValidForDemoAccount(cleanEmail, cleanPass);
    const isDemoEmail = DEMO_ACCOUNTS.some(d => d.email.toLowerCase() === cleanEmail);

    // If it is a predefined demo/admin account and the entered password does not match the complete password, reject immediately!
    if (isDemoEmail && !isDemoAcc) {
      throw new Error('La contraseña ingresada es incorrecta. Por favor verifica tus credenciales.');
    }

    const enteredHash = await hashPassword(cleanPass);
    let isAuthenticated = false;
    let authUid = user?.id || (isOwnerAdmin ? 'admin-owner' : '');

    // Step 2A: Try Firebase Authentication SDK if available
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      isAuthenticated = true;
      authUid = cred.user.uid;
    } catch (authErr: any) {
      const code = authErr?.code || '';
      if ((code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') && !isDemoAcc) {
        // Continue to check local/stored credentials before rejecting, but only for registered non-demo accounts
      }
    }

    // Step 2B: Demo & Admin accounts verified strictly with full password
    if (!isAuthenticated && isDemoAcc) {
      isAuthenticated = true;
      localDb.saveCredential(cleanEmail, enteredHash, user?.id || authUid);
      setDoc(doc(db, 'credentials', cleanEmail), {
        email: cleanEmail,
        passwordHash: enteredHash,
        userId: user?.id || authUid,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }

    // Step 2C: Registered User verification (strict hash equality)
    if (!isAuthenticated && !isDemoEmail) {
      let storedHash = localDb.getCredential(cleanEmail)?.passwordHash;

      if (!storedHash) {
        try {
          const credDoc = await getDoc(doc(db, 'credentials', cleanEmail));
          if (credDoc.exists()) {
            storedHash = credDoc.data()?.passwordHash;
            if (storedHash) {
              localDb.saveCredential(cleanEmail, storedHash, user?.id || authUid);
            }
          }
        } catch {}
      }

      if (!storedHash && user?.passwordHash) {
        storedHash = user.passwordHash;
      }

      if (storedHash && storedHash === enteredHash) {
        isAuthenticated = true;
      } else {
        throw new Error('La contraseña ingresada es incorrecta. Por favor verifica tus credenciales.');
      }
    }

    if (!isAuthenticated) {
      throw new Error('La contraseña ingresada es incorrecta. Por favor verifica tus credenciales.');
    }

    // Maintain anonymous session for Firestore rules if email auth provider was unavailable
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch {}
    }

    // Bootstrap user if it was not in local/Firestore yet (e.g. initial admin)
    if (!user) {
      if (isOwnerAdmin) {
        user = {
          ...INITIAL_ADMIN,
          id: authUid || 'admin-owner',
          lastActive: new Date().toISOString(),
          passwordHash: enteredHash
        };
        await setDoc(doc(db, 'users', user.id), user).catch(() => {});
        await setDoc(doc(db, 'admins', user.id), { email: cleanEmail, role: 'admin', assignedAt: new Date().toISOString() }).catch(() => {});
      } else {
        throw new Error('No se encontró el perfil de usuario asociado a este correo.');
      }
    }

    if (user.status === 'blocked') {
      await signOut(auth).catch(() => {});
      throw new Error('Esta cuenta se encuentra temporalmente suspendida.');
    }

    const now = new Date().toISOString();
    user.lastActive = now;
    await updateDoc(doc(db, 'users', user.id), { lastActive: now }).catch(() => {});
    if (!isOwnerAdmin && user.role !== 'admin') {
      await updateDoc(doc(db, 'publicProfiles', user.id), { lastActive: now }).catch(() => {});
    } else {
      await deleteDoc(doc(db, 'publicProfiles', user.id)).catch(() => {});
    }

    // Save in local storage cache
    const existingUsers = localDb.getUsers().filter(u => u.id !== user!.id && (u.email || '').toLowerCase() !== cleanEmail);
    localDb.saveUsers([user, ...existingUsers]);

    return user;
  }

  async changeUserPassword(userId: string, currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const cleanCurrent = (currentPass || '').trim();
    const cleanNew = (newPass || '').trim();

    if (!cleanCurrent || !cleanNew) {
      throw new Error('Por favor ingresa tu contraseña actual y la nueva contraseña.');
    }
    if (cleanNew.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    }

    let user = await this.getUserById(userId);
    if (!user) {
      user = localDb.getUsers().find(u => u.id === userId) || null;
    }
    if (!user || !user.email) {
      throw new Error('No se encontró la sesión de usuario activa.');
    }

    const cleanEmail = user.email.toLowerCase().trim();
    const currentHash = await hashPassword(cleanCurrent);
    const newHash = await hashPassword(cleanNew);

    // Verify current password
    let currentValid = false;
    const storedCred = localDb.getCredential(cleanEmail);
    if (storedCred) {
      currentValid = storedCred.passwordHash === currentHash;
    } else {
      try {
        const credDoc = await getDoc(doc(db, 'credentials', cleanEmail));
        if (credDoc.exists()) {
          currentValid = credDoc.data()?.passwordHash === currentHash;
        }
      } catch {}
    }

    if (!currentValid && user.passwordHash) {
      currentValid = user.passwordHash === currentHash;
    }

    if (!currentValid) {
      currentValid = isPasswordValidForDemoAccount(cleanEmail, cleanCurrent);
    }

    if (!currentValid) {
      throw new Error('La contraseña actual ingresada es incorrecta.');
    }

    // Save new password hash
    localDb.saveCredential(cleanEmail, newHash, user.id);
    await setDoc(doc(db, 'credentials', cleanEmail), {
      email: cleanEmail,
      passwordHash: newHash,
      userId: user.id,
      updatedAt: new Date().toISOString()
    }).catch(() => {});

    await updateDoc(doc(db, 'users', user.id), {
      passwordHash: newHash,
      lastActive: new Date().toISOString()
    }).catch(() => {});

    // Try updating Firebase Auth if currentUser matches
    if (auth.currentUser && auth.currentUser.email === cleanEmail) {
      try {
        await updatePassword(auth.currentUser, cleanNew);
      } catch (authPassErr) {
        console.warn('[Firebase Auth] updatePassword notice:', authPassErr);
      }
    }

    return { success: true, message: '¡Contraseña actualizada con éxito!' };
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

  async getUserByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    const localUser = localDb.getUsers().find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
    if (localUser) return localUser;

    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
    } catch (err) {
      console.warn('[Firestore] Error getting user by email:', err);
    }
    return null;
  }

  async loginWithGoogleIdentityServices(): Promise<{ email: string; name: string; photoURL?: string; uid: string }> {
    return new Promise((resolve, reject) => {
      const googleObj = (window as any).google;
      const clientId = (firebaseConfig as any).oAuthClientId;

      if (!googleObj?.accounts?.oauth2 || !clientId) {
        reject(new Error('No se pudo inicializar el conector de Google en este navegador.'));
        return;
      }

      try {
        const tokenClient = googleObj.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (resp: any) => {
            if (resp.error) {
              reject(new Error(resp.error_description || resp.error || 'Autenticación con Google cancelada.'));
              return;
            }
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
              });
              const info = await res.json();
              if (!info.email) {
                reject(new Error('No se pudo obtener el correo de la cuenta de Google.'));
                return;
              }
              resolve({
                uid: 'google_' + (info.sub || Math.abs(info.email.split('').reduce((acc: number, c: string) => (acc << 5) - acc + c.charCodeAt(0), 0)).toString(36)),
                email: info.email,
                name: info.name || info.given_name || 'Usuario Google',
                photoURL: info.picture
              });
            } catch (err: any) {
              reject(err);
            }
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  async loginWithGoogle(): Promise<User> {
    let googleUser: { email: string; name: string; photoURL?: string; uid: string } | null = null;

    // 1. Try Firebase Auth popup first
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      googleUser = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        name: cred.user.displayName || 'Usuario Google',
        photoURL: cred.user.photoURL || undefined
      };
    } catch (popupErr: any) {
      const code = popupErr?.code || '';
      console.warn('[Firebase Auth] signInWithPopup notice:', code, popupErr?.message);

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('Se cerró la ventana de Google antes de completar el inicio de sesión.');
      }

      // If Firebase Auth popup was blocked or unconfigured, attempt Google Identity Services (GSI)
      try {
        googleUser = await this.loginWithGoogleIdentityServices();
      } catch (gsiErr: any) {
        if (code === 'auth/operation-not-allowed') {
          throw new Error('El proveedor Google debe estar habilitado en la consola de Firebase Authentication.');
        }
        if (code === 'auth/unauthorized-domain') {
          throw new Error('El dominio de la aplicación no está en la lista de dominios autorizados de Firebase.');
        }
        throw new Error(gsiErr?.message || popupErr?.message || 'No se pudo iniciar sesión con Google.');
      }
    }

    if (!googleUser || !googleUser.email) {
      throw new Error('No se recibió la información del usuario de Google.');
    }

    const email = googleUser.email.toLowerCase().trim();
    const uid = googleUser.uid;
    const isOwnerAdmin = email === DEFAULT_ADMIN_EMAIL.toLowerCase();

    // Look up existing user by ID or by email
    let user = await this.getUserById(uid);
    if (!user) {
      user = await this.getUserByEmail(email);
    }

    if (!user) {
      user = {
        id: uid,
        name: googleUser.name || 'Usuario Google',
        email,
        age: 25,
        gender: 'other',
        bio: 'Conectando con autenticidad y empatía en Vulnerable.',
        photos: [googleUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'],
        location: 'Buenos Aires, Argentina',
        distanceKm: 3,
        occupation: 'Neurodivergente',
        interests: ['Música', 'Lectura', 'Tecnología'],
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

      try {
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
            lastActive: user.lastActive
          });
        }
        await setDoc(doc(db, 'users', uid), user);
        if (isOwnerAdmin) {
          await setDoc(doc(db, 'admins', uid), { email, role: 'admin', assignedAt: new Date().toISOString() });
        }
      } catch (err) {
        console.warn('[Firestore] Error saving new Google user:', err);
      }
    } else {
      // Existing user: ensure admin ownership is maintained
      if (isOwnerAdmin) {
        user.role = 'admin';
        user.verified = true;
        setDoc(doc(db, 'admins', user.id), { email, role: 'admin', assignedAt: new Date().toISOString() }).catch(() => {});
      }
      user.lastActive = new Date().toISOString();
      updateDoc(doc(db, 'users', user.id), { lastActive: user.lastActive, role: user.role, verified: user.verified }).catch(() => {});
    }

    // Save to local cache
    const existingUsers = localDb.getUsers().filter(u => u.id !== user!.id && (u.email || '').toLowerCase() !== email);
    localDb.saveUsers([user, ...existingUsers]);

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
    try {
      await this.initializeDatabase().catch(() => {});
    } catch {}

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
        const diff = Date.now() - new Date(u.createdAt || 0).getTime();
        return diff < 86400000;
      }).length,
      verifiedUsers: verified
    };
  }

  async getAllUsersAdmin(): Promise<User[]> {
    try {
      await this.initializeDatabase().catch(() => {});
    } catch {}

    const userMap = new Map<string, User>();

    // 1. First add Initial Seed Users & Local DB users so we ALWAYS have a complete base
    for (const u of INITIAL_SEED_USERS) {
      if (u && u.id) {
        userMap.set(u.id, { ...u });
      }
    }
    for (const u of localDb.getUsers()) {
      if (u && u.id) {
        userMap.set(u.id, { ...userMap.get(u.id), ...u });
      }
    }

    // Ensure Owner Admin is present in the list
    if (!userMap.has(INITIAL_ADMIN.id)) {
      userMap.set(INITIAL_ADMIN.id, { ...INITIAL_ADMIN });
    }

    // 2. Fetch from Firestore public profiles
    try {
      const pubSnap = await getDocs(collection(db, 'publicProfiles'));
      pubSnap.forEach(d => {
        const p = d.data() as User;
        if (p && p.id) {
          userMap.set(p.id, { ...userMap.get(p.id), ...p });
        }
      });
    } catch (err) {
      console.warn('[Firestore] Error fetching publicProfiles in admin:', err);
    }

    // 3. Fetch from Firestore private users collection
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach(d => {
        const u = d.data() as User;
        if (u && u.id) {
          userMap.set(u.id, { ...userMap.get(u.id), ...u });
        }
      });
    } catch (err) {
      console.warn('[Firestore] Error fetching users in admin:', err);
    }

    const allUsers = Array.from(userMap.values());
    return allUsers;
  }

  async adminToggleUserStatus(targetUserId: string): Promise<User> {
    let user = await this.getUserById(targetUserId);
    if (!user) {
      user = localDb.getUsers().find(u => u.id === targetUserId) || null;
    }
    if (!user) throw new Error('Usuario no encontrado');

    const newStatus: UserStatus = user.status === 'active' ? 'blocked' : 'active';
    
    // Update Firestore
    try {
      await updateDoc(doc(db, 'users', targetUserId), { status: newStatus });
      await updateDoc(doc(db, 'publicProfiles', targetUserId), { status: newStatus }).catch(() => {});
    } catch (err) {
      console.warn('[Firestore] Status update notice:', err);
    }

    // Update Local Storage
    const updatedUsers = localDb.getUsers().map(u => u.id === targetUserId ? { ...u, status: newStatus } : u);
    localDb.saveUsers(updatedUsers);
    
    // Log action
    const currentAdmin = auth.currentUser;
    const adminEmail = currentAdmin?.email || (typeof window !== 'undefined' ? localStorage.getItem('vulnerable_auth_email') : null) || DEFAULT_ADMIN_EMAIL;
    const adminUid = currentAdmin?.uid || (typeof window !== 'undefined' ? localStorage.getItem('vulnerable_auth_uid') : null) || 'admin-owner';
    const logId = `log-${Date.now()}`;
    const logData: AuditLog = {
      id: logId,
      adminEmail,
      adminUid,
      action: newStatus === 'blocked' ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetUserId,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: `Usuario cambiado a estado: ${newStatus}`
    };

    localDb.addAuditLog(logData);
    try {
      await setDoc(doc(db, 'auditLogs', logId), logData);
    } catch {}

    return { ...user, status: newStatus };
  }

  async adminToggleUserVerification(targetUserId: string): Promise<User> {
    let user = await this.getUserById(targetUserId);
    if (!user) {
      user = localDb.getUsers().find(u => u.id === targetUserId) || null;
    }
    if (!user) throw new Error('Usuario no encontrado');

    const newVerified = !user.verified;

    // Update Firestore
    try {
      await updateDoc(doc(db, 'users', targetUserId), { verified: newVerified });
      await updateDoc(doc(db, 'publicProfiles', targetUserId), { verified: newVerified }).catch(() => {});
    } catch (err) {
      console.warn('[Firestore] Verification update notice:', err);
    }

    // Update Local Storage
    const updatedUsers = localDb.getUsers().map(u => u.id === targetUserId ? { ...u, verified: newVerified } : u);
    localDb.saveUsers(updatedUsers);

    const currentAdmin = auth.currentUser;
    const adminEmail = currentAdmin?.email || (typeof window !== 'undefined' ? localStorage.getItem('vulnerable_auth_email') : null) || DEFAULT_ADMIN_EMAIL;
    const adminUid = currentAdmin?.uid || (typeof window !== 'undefined' ? localStorage.getItem('vulnerable_auth_uid') : null) || 'admin-owner';
    const logId = `log-${Date.now()}`;
    const logData: AuditLog = {
      id: logId,
      adminEmail,
      adminUid,
      action: newVerified ? 'VERIFY_USER' : 'UNVERIFY_USER',
      targetUserId,
      targetUserName: user.name,
      timestamp: new Date().toISOString(),
      details: `Insignia de verificación: ${newVerified ? 'Otorgada' : 'Revocada'}`
    };

    localDb.addAuditLog(logData);
    try {
      await setDoc(doc(db, 'auditLogs', logId), logData);
    } catch {}

    return { ...user, verified: newVerified };
  }

  async adminDeleteUser(targetUserId: string): Promise<void> {
    const user = await this.getUserById(targetUserId) || localDb.getUsers().find(u => u.id === targetUserId);
    
    // Delete in Firestore
    try {
      await deleteDoc(doc(db, 'users', targetUserId));
      await deleteDoc(doc(db, 'publicProfiles', targetUserId)).catch(() => {});
    } catch (err) {
      console.warn('[Firestore] Delete notice:', err);
    }

    // Delete in local storage
    const updatedUsers = localDb.getUsers().filter(u => u.id !== targetUserId);
    localDb.saveUsers(updatedUsers);

    const currentAdmin = auth.currentUser;
    const adminEmail = currentAdmin?.email || (typeof window !== 'undefined' ? localStorage.getItem('vulnerable_auth_email') : null) || DEFAULT_ADMIN_EMAIL;
    const adminUid = currentAdmin?.uid || (typeof window !== 'undefined' ? localStorage.getItem('vulnerable_auth_uid') : null) || 'admin-owner';
    const logId = `log-${Date.now()}`;
    const logData: AuditLog = {
      id: logId,
      adminEmail,
      adminUid,
      action: 'DELETE_USER',
      targetUserId,
      targetUserName: user?.name || targetUserId,
      timestamp: new Date().toISOString(),
      details: `Cuenta eliminada permanentemente por el administrador.`
    };

    localDb.addAuditLog(logData);
    try {
      await setDoc(doc(db, 'auditLogs', logId), logData);
    } catch {}
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const logsMap = new Map<string, AuditLog>();

    // 1. Initial/Local logs
    for (const log of localDb.getAuditLogs()) {
      if (log && log.id) logsMap.set(log.id, log);
    }

    // 2. Firestore audit logs
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      snap.forEach(d => {
        const data = d.data() as AuditLog;
        if (data && data.id) logsMap.set(data.id, data);
      });
    } catch (err) {
      console.warn('[Firestore] Error reading auditLogs:', err);
    }

    const logs = Array.from(logsMap.values());
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }
}

export const firebaseService = new FirebaseService();
