import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, UserCheck, UserX, Shield, 
  Users as UsersIcon, Mail, Calendar, MoreVertical, 
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { apiService } from '@/services/api';
import type { User, UserRole } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import TableSkeleton from '@/components/common/TableSkeleton';
import ToastContainer from '@/components/common/ToastContainer';
import { useToast } from '@/hooks/useToast';
import './Users.css';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning';
  } | null>(null);
  
  const { user: currentUser } = useAuth();
  const { toasts, removeToast, success, error, warning } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'guard' as UserRole,
    localName: '',
    adminName: '',
  });

  // ===== EFFECTS =====
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  // ===== DATA FETCHING =====
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Error:', err);
      error(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== FILTERS =====
  const filterUsers = () => {
    let filtered = users;
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) => u.name.toLowerCase().includes(query) || 
               u.email.toLowerCase().includes(query)
      );
    }
    
    setFilteredUsers(filtered);
    // Cerrar expansión al filtrar
    setExpandedId(null);
  };

  const getRoleCount = (role: UserRole | 'all') => {
    if (role === 'all') return users.length;
    return users.filter(u => u.role === role).length;
  };

  // ===== HANDLERS =====
  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'guard', localName: '', adminName: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      localName: user.localName || '',
      adminName: user.adminName || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (user: User, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (user.id === currentUser?.id) {
      warning('No puedes eliminar tu propio usuario');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar usuario?',
      message: `Esta acción eliminará permanentemente a ${user.name}. Esta acción no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiService.deleteUser(user.id);
          await loadUsers();
          success(`Usuario ${user.name} eliminado correctamente`);
        } catch (err: any) {
          error(err.response?.data?.message || 'Error al eliminar usuario');
        }
      },
    });
  };

  const handleToggleStatus = async (user: User, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (user.id === currentUser?.id) {
      warning('No puedes desactivar tu propio usuario');
      return;
    }

    const action = user.isActive ? 'desactivar' : 'activar';
    setConfirmDialog({
      isOpen: true,
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
      message: `¿Estás seguro de que deseas ${action} a ${user.name}?`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          await apiService.updateUser(user.id, { isActive: !user.isActive });
          await loadUsers();
          success(`Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente`);
        } catch (err: any) {
          error(err.response?.data?.message || 'Error al actualizar usuario');
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updates: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          localName: formData.localName || null,
          adminName: formData.adminName || null,
        };
        if (formData.password) updates.password = formData.password;
        await apiService.updateUser(editingUser.id, updates);
        success('Usuario actualizado correctamente');
      } else {
        const userData: any = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        };
        if (formData.role === 'locatario') {
          if (formData.localName) userData.localName = formData.localName;
          if (formData.adminName) userData.adminName = formData.adminName;
        }
        await apiService.createUser(userData);
        success('Usuario creado correctamente');
      }
      await loadUsers();
      setIsModalOpen(false);
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleToggleExpand = (userId: string) => {
    setExpandedId(expandedId === userId ? null : userId);
  };

  // ===== UTILS =====
  const getRoleBadge = (role: UserRole) => {
    const badges: Record<UserRole, string> = {
      admin: 'badge-error',
      coordinator: 'badge-warning',
      supervisor: 'badge-info',
      operator: 'badge-success',
      guard: 'badge-default',
      locatario: 'badge-locatario',
    };
    const labels: Record<UserRole, string> = {
      admin: 'Admin',
      coordinator: 'Coordinador',
      supervisor: 'Supervisor',
      operator: 'Operador',
      guard: 'Guardia',
      locatario: 'Locatario',
    };
    return <span className={`badge ${badges[role] ?? 'badge-default'}`}>{labels[role] ?? role}</span>;
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: 'Administrador',
      coordinator: 'Coordinador',
      supervisor: 'Supervisor',
      operator: 'Operador',
      guard: 'Guardia',
      locatario: 'Locatario',
    };
    return labels[role] ?? role;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div className="users-page">
        <div className="users-header-compact">
          <div className="header-top">
            <div className="header-title-section">
              <div className="header-icon">
                <UsersIcon size={24} />
              </div>
              <div>
                <h1 className="page-title">Usuarios</h1>
                <p className="page-subtitle">Cargando...</p>
              </div>
            </div>
          </div>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="users-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ===== HEADER COMPACTO ===== */}
      <div className="users-header-compact">
        <div className="header-top">
          <div className="header-title-section">
            <div className="header-icon">
              <UsersIcon size={24} />
            </div>
            <div>
              <h1 className="page-title">Usuarios</h1>
              <p className="page-subtitle">{users.length} registros</p>
            </div>
          </div>
          
          <button 
            className="btn-create-mobile"
            onClick={handleCreate}
            aria-label="Crear nuevo usuario"
          >
            <Plus size={20} />
            <span>Nuevo</span>
          </button>
        </div>

        {/* ===== BUSCADOR COMPACTO ===== */}
        <div className="search-box-compact">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar usuarios"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {/* ===== FILTROS EN CHIPS ===== */}
        <div className="filters-compact">
          <div className="filter-chips">
            <button
              className={`filter-chip ${roleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRoleFilter('all')}
            >
              Todos
              <span className="count">{getRoleCount('all')}</span>
            </button>
            <button
              className={`filter-chip ${roleFilter === 'admin' ? 'active' : ''}`}
              onClick={() => setRoleFilter('admin')}
            >
              Admins
              <span className="count">{getRoleCount('admin')}</span>
            </button>
            <button
              className={`filter-chip ${roleFilter === 'coordinator' ? 'active' : ''}`}
              onClick={() => setRoleFilter('coordinator')}
            >
              Coord.
              <span className="count">{getRoleCount('coordinator')}</span>
            </button>
            <button
              className={`filter-chip ${roleFilter === 'supervisor' ? 'active' : ''}`}
              onClick={() => setRoleFilter('supervisor')}
            >
              Superv.
              <span className="count">{getRoleCount('supervisor')}</span>
            </button>
            <button
              className={`filter-chip ${roleFilter === 'operator' ? 'active' : ''}`}
              onClick={() => setRoleFilter('operator')}
            >
              Oper.
              <span className="count">{getRoleCount('operator')}</span>
            </button>
            <button
              className={`filter-chip ${roleFilter === 'guard' ? 'active' : ''}`}
              onClick={() => setRoleFilter('guard')}
            >
              Guardias
              <span className="count">{getRoleCount('guard')}</span>
            </button>
            <button
              className={`filter-chip ${roleFilter === 'locatario' ? 'active' : ''}`}
              onClick={() => setRoleFilter('locatario')}
            >
              Locatarios
              <span className="count">{getRoleCount('locatario')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== VISTA DESKTOP (TABLA) ===== */}
      <div className="desktop-view">
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            description={searchQuery ? 'Intenta con otros términos' : 'Comienza creando tu primer usuario'}
            action={!searchQuery ? { label: 'Crear Usuario', onClick: handleCreate } : undefined}
          />
        ) : (
          <div className="users-table-container">
            <table className="users-table" role="table">
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Email</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Usuario">
                      <div className="user-info-desktop">
                        <div className="user-avatar">
                          <Shield size={16} />
                        </div>
                        <div>
                          <span className="user-name">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <span className="badge badge-info badge-sm">Tú</span>
                          )}
                          {user.localName && (
                            <span className="user-local-name">{user.localName}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Rol">{getRoleBadge(user.role)}</td>
                    <td data-label="Estado">
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-default'}`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="Último acceso">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                    </td>
                    <td data-label="Acciones">
                      <div className="action-buttons">
                        <button 
                          className={`btn-action ${user.isActive ? 'btn-action-deactivate' : 'btn-action-activate'}`}
                          onClick={() => handleToggleStatus(user)} 
                          disabled={user.id === currentUser?.id}
                          aria-label={user.isActive ? 'Desactivar' : 'Activar'}
                          title={user.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button 
                          className="btn-action btn-action-edit" 
                          onClick={() => handleEdit(user)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-action btn-action-delete" 
                          onClick={() => handleDelete(user)} 
                          disabled={user.id === currentUser?.id}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== VISTA MÓVIL (LISTA COMPACTA) ===== */}
      <div className="mobile-view">
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios'}
            description={searchQuery ? 'Prueba con otra búsqueda' : 'Crea tu primer usuario'}
            action={!searchQuery ? { label: 'Crear', onClick: handleCreate } : undefined}
          />
        ) : (
          <div className="user-list">
            {filteredUsers.map((user) => {
              const isExpanded = expandedId === user.id;
              
              return (
                <div
                  key={user.id}
                  className={`user-list-item ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => handleToggleExpand(user.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  {/* Estado visual */}
                  <div className={`user-status-indicator ${user.isActive ? 'active' : 'inactive'}`} />
                  
                  <div className="user-item-content">
                    {/* Header siempre visible */}
                    <div className="user-item-header">
                      <div className="user-item-title">
                        <div className="user-avatar-small">
                          <Shield size={14} />
                        </div>
                        <div>
                          <span className="user-item-name">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <span className="badge badge-info badge-xs">Tú</span>
                          )}
                        </div>
                      </div>
                      <div className="user-item-expand">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {/* Meta información siempre visible */}
                    <div className="user-item-meta">
                      {getRoleBadge(user.role)}
                      <span className={`status-dot ${user.isActive ? 'active' : 'inactive'}`} />
                      <span className="status-text">
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    {/* Contenido expandido */}
                    {isExpanded && (
                      <div className="user-item-expanded">
                        <div className="expanded-divider" />
                        
                        <div className="expanded-info">
                          <div className="expanded-row">
                            <Mail size={14} />
                            <span className="expanded-label">Email:</span>
                            <span className="expanded-value">{user.email}</span>
                          </div>
                          
                          <div className="expanded-row">
                            <Calendar size={14} />
                            <span className="expanded-label">Rol:</span>
                            <span className="expanded-value">
                              {getRoleLabel(user.role)}
                            </span>
                          </div>
                          
                          <div className="expanded-row">
                            <Clock size={14} />
                            <span className="expanded-label">Último acceso:</span>
                            <span className="expanded-value">
                              {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                            </span>
                          </div>
                          {user.localName && (
                            <div className="expanded-row">
                              <Shield size={14} />
                              <span className="expanded-label">Local:</span>
                              <span className="expanded-value">{user.localName}</span>
                            </div>
                          )}
                        </div>

                        {/* Acciones expandidas */}
                        <div className="expanded-actions">
                          <button
                            className="action-button status"
                            onClick={(e) => handleToggleStatus(user, e)}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.isActive ? (
                              <>
                                <UserX size={16} />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck size={16} />
                                Activar
                              </>
                            )}
                          </button>
                          
                          <button
                            className="action-button edit"
                            onClick={(e) => handleEdit(user, e)}
                          >
                            <Edit2 size={16} />
                            Editar
                          </button>
                          
                          <button
                            className="action-button delete"
                            onClick={(e) => handleDelete(user, e)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acción rápida (solo visible en colapsado) */}
                  {!isExpanded && (
                    <div className="user-item-quick-action">
                      <button
                        className="quick-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpand(user.id);
                        }}
                        aria-label="Más opciones"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== MODAL DE CREAR/EDITAR ===== */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'} 
        size="md"
      >
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Nombre completo <span className="required">*</span>
            </label>
            <input 
              id="name"
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              className="input" 
              placeholder="Ej: Juan Pérez"
              required 
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico <span className="required">*</span>
            </label>
            <input 
              id="email"
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              className="input"
              placeholder="usuario@nexori.com"
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña {editingUser && <span className="form-hint">(opcional)</span>}
              {!editingUser && <span className="required">*</span>}
            </label>
            <input 
              id="password"
              type="password" 
              value={formData.password} 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              className="input"
              placeholder={editingUser ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
              required={!editingUser} 
              minLength={6} 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="role" className="form-label">
              Rol del sistema <span className="required">*</span>
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, localName: '', adminName: '' })}
              className="input"
              required
            >
              <option value="guard">Guardia — Acceso básico</option>
              <option value="operator">Operador — Gestión de operaciones</option>
              <option value="supervisor">Supervisor — Supervisión y reportes</option>
              <option value="coordinator">Coordinador — Coordinación de equipos</option>
              <option value="admin">Administrador — Acceso total</option>
              <option value="locatario">Locatario — Solo botón de pánico</option>
            </select>
          </div>

          {formData.role === 'locatario' && (
            <>
              <div className="form-group">
                <label htmlFor="localName" className="form-label">Nombre del local</label>
                <input
                  id="localName"
                  type="text"
                  value={formData.localName}
                  onChange={(e) => setFormData({ ...formData, localName: e.target.value })}
                  className="input"
                  placeholder="Ej: Tienda Ropa Centro"
                />
              </div>
              <div className="form-group">
                <label htmlFor="adminName" className="form-label">Administrador responsable</label>
                <input
                  id="adminName"
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  className="input"
                  placeholder="Nombre del administrador"
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== CONFIRMACIÓN ===== */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.variant === 'danger' ? 'Eliminar' : 'Confirmar'}
        />
      )}
    </div>
  );
};

export default Users;