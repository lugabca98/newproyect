import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  Camera, 
  User as UserIcon, 
  Mail, 
  Lock, 
  Eye,
  EyeOff, 
  MapPin, 
  Briefcase, 
  X, 
  Trash2, 
  Check, 
  Loader2 
} from 'lucide-react';
import { User, Gender } from '../types';
import { api } from '../api';
import { EmbraceHeartLogo } from './EmbraceHeartLogo';
import { compressImage } from '../utils/imageCompressor';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, isAdmin: boolean) => void;
  initialMode?: 'login' | 'register';
  canClose?: boolean;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register',
  canClose = true
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
    }
  }, [initialMode, isOpen]);
  
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<Gender>('female');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('Buenos Aires, Argentina');
  const [bio, setBio] = useState('¡Hola! Me gusta viajar, la música y probar buena comida.');
  const [selectedPhoto, setSelectedPhoto] = useState(PRESET_AVATARS[0]);
  const [customPhotos, setCustomPhotos] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('Música, Café, Viajes, Cine');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file, 900, 0.82);
      setSelectedPhoto(compressed);
      setCustomPhotos(prev => [compressed, ...prev.filter(p => p !== compressed)].slice(0, 5));
    } catch (err) {
      console.error('Error compressing registration photo:', err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';

    // If message is a custom application error message, display it directly
    if (msg && !msg.startsWith('Firebase:') && !msg.includes('(auth/')) {
      return msg;
    }
    
    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
      if (msg.toLowerCase().includes('google') || (err as any)?.providerId === 'google.com') {
        return 'El proveedor de Google aún no está activo en Firebase Authentication. En Firebase Console > Authentication > Sign-in method, habilita "Google" y presiona Guardar.';
      }
      return 'El método de autenticación aún no está activo en Firebase Authentication. En Firebase Console > Authentication > Sign-in method, habilítalo y presiona Guardar.';
    }
    if (code === 'auth/popup-blocked') {
      return 'El navegador bloqueó la ventana emergente de Google. Por favor habilita los pop-ups en tu navegador para continuar.';
    }
    if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
      return 'Este correo electrónico ya está registrado. Por favor ve a la pestaña "Ingresar".';
    }
    if (code === 'auth/wrong-password') {
      return 'La contraseña ingresada no coincide con este correo electrónico. Por favor verifícala.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || msg.includes('invalid-credential')) {
      return 'Correo o contraseña incorrectos. Verifica tus credenciales.';
    }
    if (code === 'auth/weak-password') {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (code === 'auth/invalid-email') {
      return 'El formato de correo ingresado no es válido.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Se cerró la ventana de inicio de sesión con Google.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'El dominio actual no está autorizado en Firebase Authentication. Agrégalo en Authorized Domains.';
    }
    return msg || 'Ocurrió un error inesperado al procesar la solicitud.';
  };

  const handleGoogleLoginAction = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.loginWithGoogle();
      onSuccess(res.user, res.isAdmin);
      onClose();
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Por favor completa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.login(cleanEmail, password);
      onSuccess(res.user, res.isAdmin);
      onClose();
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos, incluyendo tu contraseña.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const interestsArray = interestInput.split(',').map(s => s.trim()).filter(Boolean);
      const allPhotos = customPhotos.length > 0 ? [selectedPhoto, ...customPhotos.filter(p => p !== selectedPhoto)] : [selectedPhoto];

      const res = await api.register({
        name: name.trim(),
        email: regEmail.trim(),
        age: Number(age),
        gender,
        occupation: occupation.trim() || 'Neurodivergente',
        location: location.trim(),
        bio: bio.trim(),
        photos: allPhotos,
        interests: interestsArray,
        preferences: {
          minAge: 18,
          maxAge: 45,
          interestedIn: gender === 'female' ? ['male'] : ['female'],
          maxDistanceKm: 50
        }
      }, regPassword.trim());

      onSuccess(res.user, res.isAdmin);
      onClose();
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/30 mb-2.5">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center p-1.5">
              <EmbraceHeartLogo className="w-9 h-9" glow={true} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 uppercase">
            VULNERABLE
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {mode === 'register' ? 'Crear cuenta • Conectá auténticamente' : 'Iniciar sesión • Bienvenido de nuevo'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-xs font-bold transition ${
              mode === 'register' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registrarse
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`py-2.5 rounded-xl text-xs font-bold transition ${
              mode === 'login' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ingresar
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* --- REGISTER FORM --- */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Photo Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Elegí o subí tu foto de perfil
              </label>
              
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={selectedPhoto}
                  alt="Avatar seleccionado"
                  className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 shadow-md flex-shrink-0"
                />
                
                <label className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-slate-700 hover:border-rose-500 bg-slate-950/60 text-slate-300 hover:text-rose-400 flex items-center justify-center gap-2 text-xs font-medium cursor-pointer transition">
                  <Camera className="w-4 h-4" />
                  <span>Subir foto desde dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Avatar Presets Grid & Custom Photos */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                {customPhotos.map((url, i) => (
                  <div key={`custom-${i}`} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Foto subida ${i + 1}`}
                      onClick={() => setSelectedPhoto(url)}
                      className={`w-11 h-11 rounded-full object-cover cursor-pointer transition border-2 ${
                        selectedPhoto === url ? 'border-rose-500 scale-105 shadow' : 'border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomPhotos(prev => prev.filter((_, idx) => idx !== i));
                        if (selectedPhoto === url) {
                          setSelectedPhoto(PRESET_AVATARS[0]);
                        }
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] shadow"
                      title="Eliminar foto subida"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}

                {PRESET_AVATARS.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Preset ${i}`}
                    onClick={() => setSelectedPhoto(url)}
                    className={`w-11 h-11 rounded-full object-cover cursor-pointer transition flex-shrink-0 border-2 ${
                      selectedPhoto === url ? 'border-rose-500 scale-105 shadow' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nombre</label>
                <input
                  id="reg-input-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
                <input
                  id="reg-input-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Crear Contraseña <span className="text-slate-500 font-normal">(mín. 6)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="reg-input-password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                    title={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="reg-input-confirm-password"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-slate-950 border rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none ${
                      regConfirmPassword && regPassword === regConfirmPassword
                        ? 'border-emerald-500/60 focus:border-emerald-500'
                        : regConfirmPassword && regPassword !== regConfirmPassword
                        ? 'border-rose-500/60 focus:border-rose-500'
                        : 'border-slate-800 focus:border-rose-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                    title={showRegConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {regConfirmPassword && (
                  <p className={`text-[10px] mt-0.5 ${regPassword === regConfirmPassword ? 'text-emerald-400 font-medium' : 'text-rose-400'}`}>
                    {regPassword === regConfirmPassword ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Edad</label>
                  <input
                    id="reg-input-age"
                    type="number"
                    min="18"
                    max="99"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Género</label>
                  <select
                    id="reg-select-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="female">Mujer</option>
                    <option value="male">Hombre</option>
                    <option value="non-binary">No Binario</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Neurodivergencia</label>
                <input
                  id="reg-input-occupation"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Ej. Bipolaridad, depresión, TDAH, TEA..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Ubicación</label>
              <input
                id="reg-input-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ciudad, País"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Biografía</label>
              <textarea
                id="reg-textarea-bio"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Escribe algo sobre tus gustos..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Intereses (separados por coma)</label>
              <input
                id="reg-input-interests"
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="Cine, Música, Café, Yoga"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              id="btn-submit-register"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-rose-500/30 transition hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 text-white" />
              <span>{loading ? 'Creando tu cuenta...' : 'Crear Cuenta y Empezar a Hacer Match'}</span>
            </button>

            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-bold tracking-wider absolute">O</span>
            </div>

            <button
              id="btn-google-register"
              type="button"
              onClick={handleGoogleLoginAction}
              disabled={loading}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Registrarse con Google</span>
            </button>
          </form>
        )}

        {/* --- LOGIN FORM --- */}
        {mode === 'login' && (
          <div className="space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico</label>
                <input
                  id="login-input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    id="login-input-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-rose-500/30 transition hover:scale-[1.01]"
              >
                {loading ? 'Iniciando sesión...' : 'Ingresar a Vulnerable'}
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-bold tracking-wider absolute">O</span>
              </div>

              <button
                id="btn-google-login"
                type="button"
                onClick={handleGoogleLoginAction}
                disabled={loading}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continuar con Google</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
