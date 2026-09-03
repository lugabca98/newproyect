import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  MailCheck,
  Key,
  ArrowLeft,
  Send,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Copy,
  CheckCheck
} from 'lucide-react';
import { User, Gender } from '../types';
import { api } from '../api';
import { firebaseService } from '../firebaseService';
import { localDb } from '../localStore';
import { EmbraceHeartLogo } from './EmbraceHeartLogo';
import { compressImage } from '../utils/imageCompressor';

export type AuthMode = 'register' | 'login' | 'verify-email-pending' | 'forgot-password' | 'reset-password-sent' | 'enter-new-password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, isAdmin: boolean) => void;
  initialMode?: AuthMode;
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

// Helper Component for 6-Digit OTP Boxes
interface OtpBoxesProps {
  value: string;
  onChange: (val: string) => void;
  idPrefix?: string;
  disabled?: boolean;
}

const OtpBoxes: React.FC<OtpBoxesProps> = ({ value, onChange, idPrefix = 'otp', disabled = false }) => {
  const digits = (value || '').padEnd(6, ' ').slice(0, 6).split('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, char: string) => {
    const numeric = char.replace(/\D/g, '');
    if (!numeric) {
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join('').trim());
      return;
    }
    if (numeric.length > 1) {
      const full = numeric.slice(0, 6);
      onChange(full);
      const nextIdx = Math.min(full.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }
    const newDigits = [...digits];
    newDigits[index] = numeric[0];
    const joined = newDigits.join('').trim();
    onChange(joined);
    if (index < 5 && numeric[0]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index].trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      onChange(text);
      const targetIdx = Math.min(text.length, 5);
      inputRefs.current[targetIdx]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-3" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((idx) => {
        const val = digits[idx]?.trim() || '';
        return (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            id={`${idPrefix}-digit-${idx}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            disabled={disabled}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border transition ${
              val
                ? 'border-rose-500 bg-rose-950/40 text-rose-200 shadow-sm shadow-rose-500/20'
                : 'border-slate-800 bg-slate-950 text-white focus:border-rose-400 focus:bg-slate-900'
            } focus:outline-none`}
          />
        );
      })}
    </div>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register',
  canClose = true
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

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
  const [regInterestedIn, setRegInterestedIn] = useState<Gender[]>(['male']);
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(PRESET_AVATARS[0]);
  const [customPhotos, setCustomPhotos] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');

  // Password Recovery form
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');
  const [resetOtpInput, setResetOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [resetPasswordCompleted, setResetPasswordCompleted] = useState(false);

  // Verification Pending State (Registration OTP)
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [registeredIsAdmin, setRegisteredIsAdmin] = useState(false);
  const [resendVerificationCooldown, setResendVerificationCooldown] = useState(0);
  const [resendVerificationNotice, setResendVerificationNotice] = useState('');
  const [regOtpInput, setRegOtpInput] = useState('');
  const [generatedRegOtp, setGeneratedRegOtp] = useState('');
  const [isRealDeliveryReg, setIsRealDeliveryReg] = useState(false);
  const [copiedRegOtp, setCopiedRegOtp] = useState(false);
  const [otpVerifySuccess, setOtpVerifySuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const resetAllFormInputs = () => {
    setEmail('');
    setPassword('');
    setShowLoginPassword(false);
    setName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
    setAge(24);
    setGender('female');
    setRegInterestedIn(['male']);
    setOccupation('');
    setLocation('');
    setBio('');
    setSelectedPhoto(PRESET_AVATARS[0]);
    setCustomPhotos([]);
    setInterestInput('');
    setForgotEmail('');
    setRecoverySuccessMsg('');
    setResetOtpInput('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setShowNewPassword(false);
    setShowNewPasswordConfirm(false);
    setResetPasswordCompleted(false);
    setRegOtpInput('');
    setGeneratedRegOtp('');
    setCopiedRegOtp(false);
    setOtpVerifySuccess(false);
    setErrorMsg('');
    setResendVerificationNotice('');
  };

  useEffect(() => {
    if (isOpen) {
      // Check if URL contains query params from email links
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlMode = searchParams.get('mode');
        const urlEmail = searchParams.get('email');
        const urlCode = searchParams.get('code');

        if (urlMode === 'reset-password' || urlMode === 'resetPassword') {
          setMode('enter-new-password');
          if (urlEmail) setForgotEmail(urlEmail);
          if (urlCode) setResetOtpInput(urlCode);
          return;
        } else if (urlMode === 'verify-email' || urlMode === 'verifyEmail') {
          setMode('verify-email-pending');
          if (urlEmail) setRegEmail(urlEmail);
          if (urlCode) {
            setRegOtpInput(urlCode);
            if (urlCode.trim().length === 6 && urlEmail) {
              setTimeout(() => {
                handleVerifyRegisterOtp(undefined, urlEmail.trim(), urlCode.trim());
              }, 400);
            }
          }
          return;
        }
      } catch {}

      setMode(initialMode);
      resetAllFormInputs();
    }
  }, [initialMode, isOpen]);

  // Cooldown countdown for resending verification / reset email
  useEffect(() => {
    if (resendVerificationCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendVerificationCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendVerificationCooldown]);

  const handleClose = () => {
    resetAllFormInputs();
    onClose();
  };

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
    if (code === 'auth/user-not-found' || msg.includes('user-not-found') || msg.toLowerCase().includes('no existe una cuenta')) {
      return 'No existe una cuenta registrada con este correo';
    }
    if (code === 'auth/wrong-password') {
      return 'Contraseña incorrecta. Por favor verifícala.';
    }
    if (code === 'auth/invalid-credential' || msg.includes('invalid-credential')) {
      return 'Correo o contraseña incorrectos. Verifica tus credenciales.';
    }
    if (code === 'auth/weak-password') {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (code === 'auth/invalid-email') {
      return 'El formato de correo ingresado no es válido.';
    }
    return msg || 'Ocurrió un error inesperado al procesar la solicitud.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Por favor completa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.login(cleanEmail, password);
      
      // Strict check: if email is not verified, show verification screen
      if (!res.user.emailVerified) {
        api.setToken(null);
        setRegisteredUser(res.user);
        setRegisteredIsAdmin(res.isAdmin);
        setRegEmail(cleanEmail);
        localStorage.setItem('pending_verification_email', cleanEmail);
        setResendVerificationNotice(`Tu correo no ha sido verificado aún. Te enviamos un correo de confirmación a ${cleanEmail}. Revisá tu bandeja de entrada y también la carpeta de spam.`);
        setMode('verify-email-pending');
        setResendVerificationCooldown(60);
        return;
      }

      resetAllFormInputs();
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
          interestedIn: regInterestedIn && regInterestedIn.length > 0 ? regInterestedIn : (gender === 'female' ? ['male'] : ['female']),
          maxDistanceKm: 50
        }
      }, regPassword.trim());

      setRegisteredUser(res.user);
      setRegisteredIsAdmin(res.isAdmin);
      setRegOtpInput('');
      localStorage.setItem('pending_verification_email', regEmail.trim().toLowerCase());

      setResendVerificationNotice(`Te enviamos un correo de confirmación a ${regEmail.trim()}. Revisá tu bandeja de entrada y también la carpeta de spam.`);

      // Prompt email confirmation step immediately
      setMode('verify-email-pending');
      setResendVerificationCooldown(60);
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Automatically check verification status when on the pending screen or when returning to this tab
  useEffect(() => {
    if (mode !== 'verify-email-pending') return;

    const cleanEmail = (regEmail || registeredUser?.email || localStorage.getItem('pending_verification_email') || '').trim().toLowerCase();
    if (!cleanEmail) return;

    let isMounted = true;
    const pollStatus = async () => {
      try {
        const res = await api.checkEmailVerification(cleanEmail);
        if (isMounted && res.isVerified && res.user) {
          setOtpVerifySuccess(true);
          setResendVerificationNotice('¡Correo verificado con éxito! Activando tu cuenta...');
          localStorage.removeItem('pending_verification_email');
          setTimeout(() => {
            if (!isMounted) return;
            const verifiedUser: User = { ...res.user!, emailVerified: true };
            api.setToken(verifiedUser.id, verifiedUser.id, verifiedUser.email, registeredIsAdmin ? 'admin' : 'user');
            onSuccess(verifiedUser, registeredIsAdmin);
            resetAllFormInputs();
            onClose();
          }, 700);
        }
      } catch {}
    };

    // Auto-check periodically
    const intervalId = setInterval(pollStatus, 3000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [mode, regEmail, registeredUser, registeredIsAdmin]);

  const handleCheckEmailVerification = async () => {
    setLoading(true);
    setErrorMsg('');
    setResendVerificationNotice('');
    const cleanEmail = (regEmail || registeredUser?.email || localStorage.getItem('pending_verification_email') || '').trim().toLowerCase();
    try {
      const res = await api.checkEmailVerification(cleanEmail);
      if (res.isVerified && res.user) {
        setOtpVerifySuccess(true);
        setResendVerificationNotice(res.message);
        localStorage.removeItem('pending_verification_email');
        setTimeout(() => {
          const verifiedUser: User = { ...res.user!, emailVerified: true };
          api.setToken(verifiedUser.id, verifiedUser.id, verifiedUser.email, registeredIsAdmin ? 'admin' : 'user');
          onSuccess(verifiedUser, registeredIsAdmin);
          resetAllFormInputs();
          onClose();
        }, 700);
      } else {
        setErrorMsg(res.message || 'Tu correo todavía no figura como verificado. Por favor abrí el enlace de confirmación que te enviamos a tu casilla de correo.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al comprobar el estado de verificación.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async (e?: React.FormEvent, customEmail?: string, customCode?: string) => {
    if (e) e.preventDefault();
    const cleanOtp = (customCode || regOtpInput).trim().replace(/\s+/g, '');
    const cleanEmail = (customEmail || regEmail || registeredUser?.email || '').trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('No se detectó un correo electrónico.');
      return;
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('Por favor ingresá el código completo de 6 dígitos que recibiste por correo.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.verifyEmailOtp(cleanEmail, cleanOtp);
      setOtpVerifySuccess(true);
      setResendVerificationNotice(res.message);

      setTimeout(async () => {
        let u = res.user || registeredUser;
        if (!u) {
          u = await firebaseService.getUserByEmail(cleanEmail);
        }
        if (!u) {
          u = localDb.getUsers().find((user: User) => (user.email || '').toLowerCase() === cleanEmail) || null;
        }
        if (u) {
          const verifiedUser: User = { ...u, emailVerified: true };
          api.setToken(verifiedUser.id, verifiedUser.id, verifiedUser.email, registeredIsAdmin ? 'admin' : 'user');
          onSuccess(verifiedUser, registeredIsAdmin);
          resetAllFormInputs();
          onClose();
        } else {
          setMode('login');
        }
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'El código ingresado es incorrecto o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendVerificationCooldown > 0) return;
    setLoading(true);
    setResendVerificationNotice('');
    setErrorMsg('');
    try {
      const emailTarget = (regEmail || registeredUser?.email || '').trim().toLowerCase();
      const res = await api.sendVerificationEmail(emailTarget, registeredUser?.name);
      setResendVerificationNotice(res.message || `Te enviamos un nuevo enlace de confirmación a ${emailTarget}. Revisá tu bandeja de entrada y también la carpeta de spam.`);
      setResendVerificationCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al reenviar el correo de verificación.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteVerificationFlow = () => {
    if (registeredUser) {
      onSuccess(registeredUser, registeredIsAdmin);
      resetAllFormInputs();
      onClose();
    } else {
      setMode('login');
    }
  };

  const handleSendForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setErrorMsg('Por favor ingresá tu correo electrónico.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setRecoverySuccessMsg('');

    try {
      const res = await api.sendPasswordReset(cleanEmail);
      setRecoverySuccessMsg(res.message || `Hemos enviado un enlace de restablecimiento a ${cleanEmail}.`);
      setMode('reset-password-sent');
      setResendVerificationCooldown(45);
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const cleanCode = resetOtpInput.trim().replace(/\s+/g, '');
    const cleanNewPass = newPassword.trim();
    const cleanConfirm = newPasswordConfirm.trim();

    if (!cleanEmail) {
      setErrorMsg('Por favor ingresá tu correo electrónico.');
      return;
    }

    if (!cleanCode || cleanCode.length < 6) {
      setErrorMsg('Por favor ingresá el código de 6 dígitos que te enviamos por correo.');
      return;
    }

    if (!cleanNewPass || cleanNewPass.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (cleanNewPass !== cleanConfirm) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.resetPasswordWithOtp(cleanEmail, cleanCode, cleanNewPass);
      setResetPasswordCompleted(true);
      setRecoverySuccessMsg(res.message || '¡Tu contraseña ha sido actualizada con éxito!');
      setEmail(cleanEmail);
      setPassword(cleanNewPass);
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
            onClick={handleClose}
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
            {mode === 'register' && 'Crear cuenta • Conectá auténticamente'}
            {mode === 'login' && 'Iniciar sesión • Bienvenido de nuevo'}
            {mode === 'verify-email-pending' && 'Confirmación requerida • Verifica tu email'}
            {mode === 'forgot-password' && 'Recuperar acceso • Restablece tu contraseña'}
            {mode === 'reset-password-sent' && 'Instrucciones enviadas • Revisa tu casilla'}
            {mode === 'enter-new-password' && 'Nueva Contraseña • Elige tu clave'}
          </p>
        </div>

        {/* Tab Toggle (Only visible in login & register modes) */}
        {(mode === 'register' || mode === 'login') && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
            <button
              id="tab-register"
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition ${
                mode === 'register' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Registrarse
            </button>
            <button
              id="tab-login"
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition ${
                mode === 'login' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ingresar
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs text-center font-medium leading-relaxed animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* --- 1. EMAIL VERIFICATION PENDING SCREEN (ON REGISTER/LOGIN) --- */}
        {/* ------------------------------------------------------------- */}
        {mode === 'verify-email-pending' && (
          <div className="space-y-5 py-1 animate-in fade-in">
            <div className="text-center space-y-2.5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10 mx-auto">
                <MailCheck className="w-7 h-7" />
              </div>
              
              <h3 className="text-base sm:text-lg font-bold text-white">
                Verificá tu Correo Electrónico
              </h3>
              
              <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-200 leading-relaxed max-w-md mx-auto space-y-2.5">
                <p>
                  Te enviamos un enlace de confirmación a <strong className="text-white font-mono">{regEmail || registeredUser?.email}</strong>.
                </p>
                <p className="text-[12px] text-slate-200">
                  Para activar tu cuenta, hacé clic en el enlace o botón recibido en tu correo electrónico.
                </p>
                <p className="text-[11px] text-slate-400">
                  ¿No lo ves? Revisá tu bandeja de entrada y también tu carpeta de <strong>spam o correo no deseado</strong>.
                </p>
              </div>

              {resendVerificationNotice && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-rose-300 text-xs text-center font-medium animate-in fade-in">
                  {resendVerificationNotice}
                </div>
              )}

              {otpVerifySuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs text-center font-bold flex items-center justify-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>¡Email verificado con éxito! Activando cuenta...</span>
                </div>
              )}
            </div>

            {/* Primary Action: Check if user clicked email verification link */}
            <div className="space-y-3 pt-2">
              <button
                id="btn-check-email-verification"
                type="button"
                onClick={handleCheckEmailVerification}
                disabled={loading || otpVerifySuccess}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-500/30 transition hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Comprobando verificación...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Ya confirmé el correo</span>
                  </>
                )}
              </button>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  id="btn-resend-verification"
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading || resendVerificationCooldown > 0}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {resendVerificationCooldown > 0
                      ? `Reenviar en (${resendVerificationCooldown}s)`
                      : 'Reenviar enlace de verificación'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Volver al Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* --- 2. FORGOT PASSWORD (OLVIDÉ MI CONTRASEÑA) --- */}
        {/* ------------------------------------------------------------- */}
        {mode === 'forgot-password' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-md mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Recuperar Contraseña</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ingresá tu correo electrónico registrado. Te enviaremos un enlace seguro a tu casilla para que puedas modificarla directamente.
              </p>
            </div>

            <form onSubmit={handleSendForgotPassword} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-password-email"
                    type="email"
                    required
                    autoComplete="off"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              </div>

              <button
                id="btn-send-reset-link"
                type="submit"
                disabled={loading || !forgotEmail.trim()}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-lg shadow-rose-500/30 transition hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando enlace al correo...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Enviar Enlace al Correo</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  className="text-xs text-slate-400 hover:text-slate-200 font-semibold transition flex items-center justify-center gap-1.5 mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Iniciar Sesión</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* --- 3. RESET PASSWORD LINK SENT CONFIRMATION --- */}
        {/* ------------------------------------------------------------- */}
        {mode === 'reset-password-sent' && (
          <div className="space-y-5 py-2 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white">
                ¡Enlace Enviado a tu Correo!
              </h3>

              <p className="text-xs text-slate-300">
                Hemos enviado un enlace seguro para restablecer tu contraseña a:
              </p>

              <div className="inline-block px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-emerald-300 font-mono">
                {forgotEmail}
              </div>

              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-left space-y-2 max-w-md mx-auto">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-emerald-200">
                      Revisá tu bandeja de entrada
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Abrí el mensaje de restablecimiento y hacé clic en el enlace adjunto para ingresar tu nueva contraseña. Si no lo ves en unos minutos, revisá la carpeta de <strong>Spam / Correo no deseado</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {recoverySuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs text-center font-medium animate-in fade-in">
                {recoverySuccessMsg}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setMode('enter-new-password'); setErrorMsg(''); }}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-500/25 transition hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Ingresar Código y Crear Nueva Contraseña</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendForgotPassword()}
                disabled={loading || resendVerificationCooldown > 0}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendVerificationCooldown > 0
                    ? `Reenviar nuevo enlace en (${resendVerificationCooldown}s)`
                    : 'Reenviar enlace al correo'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                className="w-full py-2 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Iniciar Sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* --- 4. ENTER NEW PASSWORD (CREAR NUEVA CONTRASEÑA) --- */}
        {/* ------------------------------------------------------------- */}
        {mode === 'enter-new-password' && (
          <div className="space-y-5 animate-in fade-in">
            {resetPasswordCompleted ? (
              <div className="text-center space-y-4 py-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-500/10 mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">¡Contraseña Actualizada con Éxito!</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                    Tu nueva clave ha sido guardada. Ahora podés ingresar a tu cuenta de Vulnerable con tus nuevas credenciales.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); }}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-rose-500/30 transition hover:scale-[1.01] flex items-center justify-center gap-2"
                  >
                    <span>Iniciar Sesión Ahora</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center space-y-1.5 mb-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-md mx-auto">
                    <Key className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Definir Nueva Contraseña</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Ingresá el código de 6 dígitos que te enviamos al correo y escribí tu nueva contraseña.
                  </p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} autoComplete="off" className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="reset-password-email"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                      />
                    </div>
                  </div>

                  {/* 6-Digit Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                      Código de 6 dígitos del correo
                    </label>
                    <OtpBoxes
                      idPrefix="reset-otp"
                      value={resetOtpInput}
                      onChange={setResetOtpInput}
                      disabled={loading}
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nueva Contraseña (mínimo 6 caracteres)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reset-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reset-new-password-confirm"
                        type={showNewPasswordConfirm ? 'text' : 'password'}
                        required
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPasswordConfirm(!showNewPasswordConfirm)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                      >
                        {showNewPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="btn-save-new-password"
                    type="submit"
                    disabled={loading || !forgotEmail || resetOtpInput.length < 6 || !newPassword}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-lg shadow-rose-500/30 transition hover:scale-[1.01] flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando nueva contraseña...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Guardar Nueva Contraseña</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleSendForgotPassword()}
                      disabled={loading || resendVerificationCooldown > 0}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium transition"
                    >
                      {resendVerificationCooldown > 0
                        ? `Reenviar código (${resendVerificationCooldown}s)`
                        : 'Reenviar código'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrorMsg(''); }}
                      className="text-xs text-slate-400 hover:text-slate-200 font-semibold transition flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Volver al Login</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}



        {/* ------------------------------------------------------------- */}
        {/* --- 4. REGISTER FORM --- */}
        {/* ------------------------------------------------------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} autoComplete="off" className="space-y-4">
            
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
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Ubicación</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <input
                    id="reg-input-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej. Palermo, CABA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Seeking / Interested in preference */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                ¿A quién te gustaría conocer en Match?
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  id="reg-filter-women"
                  onClick={() => setRegInterestedIn(['female'])}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                    regInterestedIn.length === 1 && regInterestedIn[0] === 'female'
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-500/20 ring-1 ring-pink-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>♀</span>
                  <span>Solo Mujeres</span>
                </button>

                <button
                  type="button"
                  id="reg-filter-men"
                  onClick={() => setRegInterestedIn(['male'])}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                    regInterestedIn.length === 1 && regInterestedIn[0] === 'male'
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400 shadow-md shadow-sky-500/20 ring-1 ring-sky-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>♂</span>
                  <span>Solo Hombres</span>
                </button>

                <button
                  type="button"
                  id="reg-filter-all"
                  onClick={() => setRegInterestedIn(['female', 'male', 'non-binary', 'other'])}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                    regInterestedIn.length > 1
                      ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white border-purple-400 shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>✨</span>
                  <span>Todos</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Neurodivergencia</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                  <Briefcase className="w-3 h-3" />
                </div>
                <input
                  id="reg-input-occupation"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Ej. Bipolaridad, Depresión, Agorafobia..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bio</label>
              <textarea
                id="reg-input-bio"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Contanos sobre vos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Intereses</label>
              <input
                id="reg-input-interests"
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="Música, Anime, Lectura, Naturaleza, Videojuegos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Email verification information banner before submitting */}
            <div className="p-2.5 bg-rose-950/30 border border-rose-500/20 rounded-xl flex items-start gap-2 text-[11px] text-slate-300">
              <Mail className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
              <span>Al registrarte te enviaremos un correo para confirmar tu dirección de email y activar tu perfil de forma segura.</span>
            </div>

            <button
              id="btn-submit-register"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-rose-500/30 transition hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando cuenta y enviando confirmación...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Crear Cuenta y Confirmar Email</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* --- 5. LOGIN FORM --- */}
        {/* ------------------------------------------------------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
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
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-400">Contraseña</label>
                <button
                  id="btn-forgot-password-link"
                  type="button"
                  onClick={() => {
                    setForgotEmail('');
                    setMode('forgot-password');
                    setErrorMsg('');
                  }}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              
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
          </form>
        )}

      </div>
    </div>
  );
};
