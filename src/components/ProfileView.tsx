import React, { useState } from 'react';
import { 
  Camera, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  MapPin, 
  Briefcase, 
  Sliders, 
  Heart, 
  Sparkles, 
  Save, 
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Lock,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, Gender } from '../types';
import { api } from '../api';

interface ProfileViewProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  onLogout
}) => {
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [age, setAge] = useState(currentUser.age);
  const [gender, setGender] = useState<Gender>(currentUser.gender);
  const [occupation, setOccupation] = useState(currentUser.occupation);
  const [location, setLocation] = useState(currentUser.location);
  const [photos, setPhotos] = useState<string[]>(currentUser.photos || []);
  const [interests, setInterests] = useState<string[]>(currentUser.interests || []);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [showPhotoUrlInput, setShowPhotoUrlInput] = useState(false);
  
  // Preferences
  const [minAge, setMinAge] = useState(currentUser.preferences?.minAge || 18);
  const [maxAge, setMaxAge] = useState(currentUser.preferences?.maxAge || 45);
  const [maxDistance, setMaxDistance] = useState(currentUser.preferences?.maxDistanceKm || 50);
  const [interestedIn, setInterestedIn] = useState<Gender[]>(currentUser.preferences?.interestedIn || ['female', 'male']);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Handle local file upload (converts to base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setPhotos(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddPhotoUrl = () => {
    if (customPhotoUrl.trim()) {
      setPhotos(prev => [...prev, customPhotoUrl.trim()]);
      setCustomPhotoUrl('');
      setShowPhotoUrlInput(false);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    if (photos.length <= 1) {
      alert('Debés tener al menos una foto en tu perfil.');
      return;
    }
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInterestInput.trim() && !interests.includes(newInterestInput.trim())) {
      setInterests(prev => [...prev, newInterestInput.trim()]);
      setNewInterestInput('');
    }
  };

  const handleRemoveInterest = (tag: string) => {
    setInterests(prev => prev.filter(t => t !== tag));
  };

  const toggleInterestedIn = (g: Gender) => {
    if (interestedIn.includes(g)) {
      if (interestedIn.length === 1) return; // Keep at least one
      setInterestedIn(prev => prev.filter(item => item !== g));
    } else {
      setInterestedIn(prev => [...prev, g]);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const updated = await api.updateProfile({
        name,
        bio,
        age: Number(age),
        gender,
        occupation,
        location,
        photos,
        interests,
        preferences: {
          minAge: Number(minAge),
          maxAge: Number(maxAge),
          maxDistanceKm: Number(maxDistance),
          interestedIn
        }
      });

      onUpdateUser(updated.user);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!newPassword.trim()) {
      setPasswordErrorMsg('Por favor ingresa la nueva contraseña.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPasswordSuccessMsg(res.message || '¡Contraseña actualizada correctamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccessMsg(''), 4000);
    } catch (err: any) {
      setPasswordErrorMsg(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Header Profile Stats Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <img
              src={photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
              alt={name}
              className="w-24 h-24 rounded-full object-cover border-4 border-rose-500/50 shadow-xl"
            />
            {currentUser.verified && (
              <span className="absolute bottom-0 right-0 p-1 bg-slate-900 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-sky-400 fill-sky-400" />
              </span>
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-white">{name}, {age}</h2>
              {currentUser.role === 'admin' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ADMINISTRADOR
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{location}</span>
            </p>

            {/* Quick stats badges */}
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="font-bold">{currentUser.likesCount || 0}</span>
                <span className="text-slate-400">Likes recibidos</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{currentUser.matchesCount || 0}</span>
                <span className="text-slate-400">Matches totales</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery & Upload Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-rose-400" />
            <span>Galería de Fotos ({photos.length}/6)</span>
          </h3>
          <span className="text-xs text-slate-400">La primera foto será tu avatar principal</span>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {photos.map((photoUrl, idx) => (
            <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 group shadow-md">
              <img
                src={photoUrl}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Top Right Always-Accessible / Hover Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePhoto(idx);
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-950/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition shadow-lg border border-slate-700/60 hover:border-rose-500 z-10"
                title="Eliminar foto del perfil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Main Badge / Set as Main action */}
              {idx === 0 ? (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/90 text-[10px] font-bold text-rose-400 border border-rose-500/40 shadow">
                  Principal
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Move this photo to front (make it primary)
                    setPhotos(prev => [photoUrl, ...prev.filter((_, i) => i !== idx)]);
                  }}
                  className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 hover:bg-slate-800 text-[10px] font-medium text-slate-300 hover:text-white border border-slate-700 transition"
                  title="Establecer como foto principal"
                >
                  Hacer principal
                </button>
              )}
            </div>
          ))}

          {/* Add Photo Button Tile */}
          {photos.length < 6 && (
            <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-700 hover:border-rose-500/60 bg-slate-950/40 hover:bg-slate-800/30 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-slate-400 hover:text-rose-400">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-center px-2">Subir Foto</span>
            </label>
          )}
        </div>

        {/* Alternative Photo URL input */}
        <div className="pt-2">
          {!showPhotoUrlInput ? (
            <button
              type="button"
              onClick={() => setShowPhotoUrlInput(true)}
              className="text-xs text-rose-400 hover:underline font-medium"
            >
              + Agregar foto mediante enlace URL web
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-foto.jpg"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddPhotoUrl}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoUrlInput(false)}
                className="px-2 py-2 text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Basic Info Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-rose-400" />
          <span>Información de Perfil</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre Completo</label>
            <input
              id="input-profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Edad</label>
              <input
                id="input-profile-age"
                type="number"
                min="18"
                max="99"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Género</label>
              <select
                id="select-profile-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="female">Mujer</option>
                <option value="male">Hombre</option>
                <option value="non-binary">No Binario</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Neurodivergencia</label>
            <input
              id="input-profile-occupation"
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Ej. Bipolaridad, depresión, TDAH, TEA, Ansiedad..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ubicación</label>
            <input
              id="input-profile-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ciudad, País"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Biografía</label>
          <textarea
            id="textarea-profile-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Contá un poco sobre ti, tus pasatiempos y lo que buscas..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
          />
        </div>

        {/* Interests Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Intereses & Pasatiempos</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {interests.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-200"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(tag)}
                  className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddInterest} className="flex gap-2">
            <input
              type="text"
              value={newInterestInput}
              onChange={(e) => setNewInterestInput(e.target.value)}
              placeholder="Añadir interés (ej. Cine, Trekking, Fotografía)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Agregar
            </button>
          </form>
        </div>
      </div>

      {/* Discovery Preferences */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-rose-400" />
          <span>Preferencias de Búsqueda</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Me interesa conocer:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Mujeres', val: 'female' as Gender },
                { label: 'Hombres', val: 'male' as Gender },
                { label: 'No Binario', val: 'non-binary' as Gender },
                { label: 'Todos', val: 'other' as Gender }
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => toggleInterestedIn(item.val)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    interestedIn.includes(item.val)
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Rango de Edad</span>
                <span className="text-white font-bold">{minAge} - {maxAge} años</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={minAge}
                  onChange={(e) => setMinAge(Math.min(Number(e.target.value), maxAge - 1))}
                  className="w-full accent-rose-500"
                />
                <input
                  type="range"
                  min="19"
                  max="80"
                  value={maxAge}
                  onChange={(e) => setMaxAge(Math.max(Number(e.target.value), minAge + 1))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Distancia Máxima</span>
                <span className="text-white font-bold">{maxDistance} km</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Change Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <span>Seguridad & Contraseña</span>
          </h3>
          <span className="text-[11px] text-slate-400">Protección de tu cuenta</span>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  id="profile-current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu clave actual"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 pr-8 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Nueva Contraseña <span className="text-slate-500 font-normal">(mín. 6)</span>
              </label>
              <div className="relative">
                <input
                  id="profile-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 pr-8 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Confirmar Nueva
              </label>
              <div className="relative">
                <input
                  id="profile-confirm-new-password"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repite la nueva"
                  className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 pr-8 text-xs text-white placeholder-slate-600 focus:outline-none ${
                    confirmNewPassword && newPassword === confirmNewPassword
                      ? 'border-emerald-500/60 focus:border-emerald-500'
                      : confirmNewPassword && newPassword !== confirmNewPassword
                      ? 'border-rose-500/60 focus:border-rose-500'
                      : 'border-slate-800 focus:border-rose-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showConfirmNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {passwordErrorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
              {passwordErrorMsg}
            </div>
          )}

          {passwordSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              id="btn-update-password"
              type="submit"
              disabled={changingPassword || !newPassword || !confirmNewPassword}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 hover:border-slate-600"
            >
              <Key className="w-3.5 h-3.5 text-rose-400" />
              <span>{changingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Save Button & Feedback Alerts */}
      <div className="sticky bottom-4 z-30 flex flex-col gap-2">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs text-center">
            {errorMsg}
          </div>
        )}
        {savedSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs text-center flex items-center justify-center gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>¡Tu perfil se ha guardado correctamente!</span>
          </div>
        )}

        <button
          id="btn-save-profile"
          type="button"
          disabled={saving}
          onClick={handleSaveProfile}
          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 transition hover:scale-[1.01]"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Guardando cambios...' : 'Guardar Perfil'}</span>
        </button>

        {onLogout && (
          <button
            id="btn-profile-logout"
            type="button"
            onClick={onLogout}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>

    </div>
  );
};
