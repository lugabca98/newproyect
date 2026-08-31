import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  UserX, 
  Flame, 
  MessageCircle, 
  Search, 
  Filter, 
  Eye, 
  Ban, 
  CheckCircle, 
  Trash2, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  MapPin, 
  Briefcase, 
  Calendar,
  AlertTriangle,
  X,
  Lock,
  Unlock,
  BadgeCheck,
  LogOut
} from 'lucide-react';
import { User, AdminStats, AuditLog } from '../types';
import { api } from '../api';

interface AdminPanelProps {
  currentAdminUser: User;
  onLogoutAdmin: () => void;
  onCloseAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentAdminUser,
  onLogoutAdmin,
  onCloseAdmin
}) => {
  const isAuthorizedAdmin = (currentAdminUser?.email || '').toLowerCase().trim() === 'lugabca98@gmail.com' || currentAdminUser?.id === 'admin-owner';

  useEffect(() => {
    if (!isAuthorizedAdmin) {
      onCloseAdmin();
    }
  }, [isAuthorizedAdmin, onCloseAdmin]);

  if (!isAuthorizedAdmin) {
    return null;
  }

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'security'>('users');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Selected User Modal for deep profile inspection
  const [inspectedUser, setInspectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Block Modal
  const [userToBlock, setUserToBlock] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Notification message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchAdminData();
  }, [searchQuery, statusFilter, sortBy]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Parallel fetch metrics, users, and audit logs with resilient fallbacks
      const [metricsRes, usersRes, logsRes] = await Promise.allSettled([
        api.getAdminMetrics(),
        api.getAdminUsers({ q: searchQuery, status: statusFilter, sortBy }),
        api.getAdminAuditLogs()
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.users);
      } else {
        console.warn('getAdminUsers error, fetching fallback:', usersRes.reason);
        const fallback = await api.getAllUsersAdmin();
        setUsers(fallback.users);
      }

      if (metricsRes.status === 'fulfilled') {
        setStats(metricsRes.value.stats);
      }

      if (logsRes.status === 'fulfilled') {
        setAuditLogs(logsRes.value.logs);
      }
    } catch (err: any) {
      console.warn('Error in fetchAdminData:', err);
      try {
        const fallback = await api.getAllUsersAdmin();
        setUsers(fallback.users);
      } catch {}
      showToast(err?.message || 'Error al sincronizar datos administrativos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectUser = async (user: User) => {
    setInspectedUser(user);
    setInspectLoading(true);
    try {
      const detail = await api.getAdminUserDetail(user.id);
      setUserStats(detail.stats);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setInspectLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!userToBlock) return;
    try {
      const res = await api.blockUser(userToBlock.id, blockReason || 'Violación de directrices de seguridad.');
      showToast(res.message, 'success');
      setUserToBlock(null);
      setBlockReason('');
      if (inspectedUser?.id === userToBlock.id) {
        setInspectedUser(res.user);
      }
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const res = await api.unblockUser(userId);
      showToast(res.message, 'success');
      if (inspectedUser?.id === userId) {
        setInspectedUser(res.user);
      }
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleVerify = async (userId: string) => {
    try {
      const res = await api.toggleVerifyUser(userId);
      showToast(res.message, 'success');
      if (inspectedUser?.id === userId) {
        setInspectedUser(res.user);
      }
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await api.deleteUser(userToDelete.id, userToDelete.email);
      showToast(res.message, 'success');
      setUserToDelete(null);
      if (inspectedUser?.id === userToDelete.id) {
        setInspectedUser(null);
      }
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      
      {/* Top Banner: Authenticated Owner Notice */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Panel Administrativo del Propietario
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                AUTORIZADO EN SERVIDOR
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sesión activa: <strong className="text-slate-200">{currentAdminUser.email}</strong> • Protección mediante tokens y middleware Express
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            id="btn-admin-refresh"
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            id="btn-admin-close"
            onClick={onCloseAdmin}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Volver a la vista de usuario para seguir deslizando"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>Volver a la App</span>
          </button>

          <button
            id="btn-admin-logout"
            onClick={onLogoutAdmin}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition"
            title="Cerrar sesión completamente"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950 border border-rose-500/50 text-rose-200'
        }`}>
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Total Usuarios</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-2xl font-black text-white">{stats.totalUsers}</span>
            <span className="text-[10px] text-emerald-400 mt-1 font-medium">+{stats.todayNewUsers} hoy</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Activos</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-400">{stats.activeUsers}</span>
            <span className="text-[10px] text-slate-500 mt-1">Disponibles en swipe</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Bloqueados</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-400">{stats.blockedUsers}</span>
            <span className="text-[10px] text-rose-400/80 mt-1">Acceso revocado</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Matches</span>
              <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
            </div>
            <span className="text-2xl font-black text-white">{stats.totalMatches}</span>
            <span className="text-[10px] text-slate-500 mt-1">Conexiones mutuas</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Mensajes</span>
              <MessageCircle className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-2xl font-black text-white">{stats.totalMessages}</span>
            <span className="text-[10px] text-slate-500 mt-1">Chats en tiempo real</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold">Verificados</span>
              <BadgeCheck className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-2xl font-black text-sky-400">{stats.verifiedUsers}</span>
            <span className="text-[10px] text-sky-400/80 mt-1">Insignia azul</span>
          </div>

        </div>
      )}

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestión de Usuarios ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'logs'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Registro de Auditoría ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'security'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Seguridad del Servidor</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Filters and Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="input-admin-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, email, ciudad..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['all', 'active', 'blocked'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                      statusFilter === st
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'Todos' : st === 'active' ? 'Activos' : 'Bloqueados'}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <select
                id="select-admin-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="likes">Más Likes</option>
                <option value="matches">Más Matches</option>
              </select>

            </div>
          </div>

          {/* Users View: Responsive Cards for Mobile & Table for Desktop */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            
            {/* MOBILE CARDS LIST (Visible on screens < md) */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {loading && (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Sincronizando usuarios con la base de datos...</p>
                </div>
              )}

              {!loading && users.map(user => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={user.photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                        alt={user.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md"
                      />
                      {user.verified && (
                        <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400 absolute -bottom-1 -right-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-sm text-white truncate">{user.name}, {user.age}</h4>
                        {user.status === 'active' ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>Activo</span>
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <Ban className="w-2.5 h-2.5" />
                            <span>Bloqueado</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-rose-300 font-medium truncate">{user.occupation || 'Neurodivergente'}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="truncate">{user.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-mono text-[11px] truncate max-w-[170px]">{user.email || 'Perfil público'}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                        <Flame className="w-3 h-3" />
                        {user.likesCount || 0}
                      </span>
                      <span className="text-blue-400 font-bold flex items-center gap-1 text-[11px]">
                        <Users className="w-3 h-3" />
                        {user.matchesCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      id={`btn-admin-mobile-inspect-${user.id}`}
                      onClick={() => handleInspectUser(user)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-300" />
                      <span>Inspeccionar</span>
                    </button>

                    <button
                      id={`btn-admin-mobile-verify-${user.id}`}
                      onClick={() => handleToggleVerify(user.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition ${
                        user.verified
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title="Verificar usuario"
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                    </button>

                    {user.role !== 'admin' && (
                      user.status === 'active' ? (
                        <button
                          id={`btn-admin-mobile-block-${user.id}`}
                          onClick={() => setUserToBlock(user)}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center"
                          title="Bloquear usuario"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          id={`btn-admin-mobile-unblock-${user.id}`}
                          onClick={() => handleUnblockUser(user.id)}
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center"
                          title="Desbloquear usuario"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}

                    {user.role !== 'admin' && (
                      <button
                        id={`btn-admin-mobile-delete-${user.id}`}
                        onClick={() => setUserToDelete(user)}
                        className="px-3 py-2 rounded-xl bg-red-950/60 text-red-400 border border-red-800/40 text-xs font-semibold flex items-center justify-center"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!loading && users.length === 0 && (
                <div className="text-center py-12 px-4 space-y-3">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No se encontraron usuarios en la lista.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); fetchAdminData(); }}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow"
                  >
                    Restablecer y recargar
                  </button>
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW (Visible on screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Usuario</th>
                    <th className="px-4 py-4">Email & Rol</th>
                    <th className="px-4 py-4">Ubicación & Edad</th>
                    <th className="px-4 py-4">Estado</th>
                    <th className="px-4 py-4 text-center">Likes / Matches</th>
                    <th className="px-5 py-4 text-right">Acciones de Moderación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">Sincronizando usuarios con la base de datos...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Avatar & Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={user.photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-700"
                            />
                            {user.verified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400 absolute -bottom-0.5 -right-0.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{user.name}</span>
                            <span className="text-[11px] text-rose-300/90 font-medium">{user.occupation || 'Neurodivergente'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email & Role */}
                      <td className="px-4 py-3.5">
                        <span className="text-slate-300 font-mono text-[11px] block">{user.email}</span>
                        {user.role === 'admin' ? (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Propietario / Admin
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Usuario Regular</span>
                        )}
                      </td>

                      {/* Location & Age */}
                      <td className="px-4 py-3.5">
                        <span className="text-slate-200 block">{user.age} años • {user.gender}</span>
                        <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{user.location}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            <span>Activo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <Ban className="w-3 h-3" />
                            <span>Bloqueado</span>
                          </span>
                        )}
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-rose-400 font-bold flex items-center gap-0.5 text-xs">
                            <Flame className="w-3.5 h-3.5" />
                            {user.likesCount || 0}
                          </span>
                          <span className="text-slate-300 font-bold flex items-center gap-0.5 text-xs">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            {user.matchesCount || 0}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View Profile */}
                          <button
                            id={`btn-admin-inspect-${user.id}`}
                            onClick={() => handleInspectUser(user)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Ver Perfil Completo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Toggle Verify */}
                          <button
                            id={`btn-admin-verify-${user.id}`}
                            onClick={() => handleToggleVerify(user.id)}
                            className={`p-1.5 rounded-lg border transition ${
                              user.verified
                                ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-sky-400'
                            }`}
                            title={user.verified ? 'Revocar Verificación' : 'Verificar Perfil'}
                          >
                            <BadgeCheck className="w-4 h-4" />
                          </button>

                          {/* Block / Unblock */}
                          {user.role !== 'admin' && (
                            user.status === 'active' ? (
                              <button
                                id={`btn-admin-block-${user.id}`}
                                onClick={() => setUserToBlock(user)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                                title="Bloquear Usuario"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                id={`btn-admin-unblock-${user.id}`}
                                onClick={() => handleUnblockUser(user.id)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                                title="Desbloquear Usuario"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {/* Delete Account Permanently */}
                          {user.role !== 'admin' && (
                            <button
                              id={`btn-admin-delete-${user.id}`}
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-200 border border-red-800/40 transition"
                              title="Eliminar Cuenta Definitivamente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  ))}

                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        No se encontraron usuarios que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Registro de Eventos de Moderación</span>
              </h2>
              <p className="text-xs text-slate-400">Historial inmutable de acciones administrativas en el servidor</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
              {auditLogs.length} registros
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action === 'BLOCK_USER' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      log.action === 'UNBLOCK_USER' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      log.action === 'DELETE_USER' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-xs font-bold text-white">{log.targetUserName}</span>
                    <span className="text-[11px] text-slate-500">ID: {log.targetUserId}</span>
                  </div>
                  <p className="text-xs text-slate-400">{log.details}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] text-slate-300 block font-mono">{log.adminEmail}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SERVER SECURITY INFO */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Arquitectura de Autorización en Servidor</h2>
              <p className="text-xs text-slate-400">Verificación estricta de privilegios administrativos en Express backend</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>Rutas Protegidas</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Todas las rutas bajo <code className="text-rose-300">/api/admin/*</code> son interceptadas por el middleware <code className="text-amber-300">requireAdmin</code> antes de ejecutar cualquier lectura o modificación.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>Rechazo de Usuarios Normales</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Si un usuario con rol regular intenta enviar solicitudes a endpoints administrativos, el servidor responde con <code className="text-rose-400">HTTP 403 Forbidden</code> y rechaza la operación.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Auditoría en Tiempo Real</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada bloqueo, desbloqueo y eliminación genera un registro persistente con timestamp y correo del administrador actuante.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: DEEP USER PROFILE INSPECTION --- */}
      {inspectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Inspección de Perfil</h3>
                {inspectedUser.status === 'blocked' && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                    BLOQUEADO
                  </span>
                )}
              </div>
              <button
                onClick={() => setInspectedUser(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photos Gallery */}
            <div className="grid grid-cols-3 gap-2">
              {inspectedUser.photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  alt={`Foto ${i + 1}`}
                  className="w-full aspect-[3/4] object-cover rounded-xl border border-slate-700"
                />
              ))}
            </div>

            {/* Profile Info */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                  {inspectedUser.name}, {inspectedUser.age}
                  {inspectedUser.verified && <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400" />}
                </h4>
                <span className="text-slate-400">{inspectedUser.email}</span>
              </div>

              <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 italic">
                "{inspectedUser.bio}"
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-400">
                <div><strong>Neurodivergencia:</strong> {inspectedUser.occupation}</div>
                <div><strong>Ubicación:</strong> {inspectedUser.location}</div>
                <div><strong>Registro:</strong> {new Date(inspectedUser.createdAt).toLocaleDateString()}</div>
                <div><strong>Última actividad:</strong> {new Date(inspectedUser.lastActive).toLocaleDateString()}</div>
              </div>

              {/* Interests */}
              <div className="pt-2">
                <strong className="text-slate-300 block mb-1">Intereses declarados:</strong>
                <div className="flex flex-wrap gap-1">
                  {inspectedUser.interests.map((it, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                      {it}
                    </span>
                  ))}
                </div>
              </div>

              {/* Activity Stats */}
              {userStats && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Likes Dados</span>
                    <span className="text-sm font-bold text-rose-400">{userStats.likesGiven}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Matches</span>
                    <span className="text-sm font-bold text-emerald-400">{userStats.matches}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Msgs Enviados</span>
                    <span className="text-sm font-bold text-purple-400">{userStats.messagesSent}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Moderation Controls within Inspector */}
            <div className="flex gap-2 pt-3 border-t border-slate-800">
              {inspectedUser.role !== 'admin' && (
                inspectedUser.status === 'active' ? (
                  <button
                    onClick={() => {
                      setUserToBlock(inspectedUser);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-bold transition"
                  >
                    Bloquear Cuenta
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnblockUser(inspectedUser.id)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold transition"
                  >
                    Desbloquear Cuenta
                  </button>
                )
              )}

              {inspectedUser.role !== 'admin' && (
                <button
                  onClick={() => setUserToDelete(inspectedUser)}
                  className="py-2.5 px-4 rounded-xl bg-red-950 text-red-400 hover:bg-red-900 border border-red-800 text-xs font-bold transition"
                >
                  Eliminar
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL 2: BLOCK USER REASON CONFIRMATION --- */}
      {userToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Ban className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Bloquear a {userToBlock.name}</h3>
            </div>
            
            <p className="text-xs text-slate-300">
              El usuario será suspendido inmediatamente, sus sesiones serán cerradas y no podrá acceder a la app ni aparecer en la sección de descubrimiento.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Motivo del bloqueo</label>
              <textarea
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ej. Comportamiento inapropiado, perfil falso, fotos explícitas..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setUserToBlock(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-block-user"
                type="button"
                onClick={handleBlockUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
              >
                Confirmar Bloqueo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: DELETE USER CONFIRMATION --- */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-600/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">¿Eliminar cuenta permanentemente?</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Estás a punto de borrar definitivamente la cuenta de <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email}). 
              Todos sus fotos, likes, matches y conversaciones se borrarán de forma irreversible.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-user"
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/30"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
