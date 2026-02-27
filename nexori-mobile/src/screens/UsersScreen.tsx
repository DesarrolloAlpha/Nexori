import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import { UserRole } from '../types';
import api from '../services/api';

const { colors, shadows } = designTokens;

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  localName?: string;
  adminName?: string;
  lastLogin?: string;
}

interface UserForm {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  localName: string;
  adminName: string;
}

const EMPTY_FORM: UserForm = {
  email: '',
  password: '',
  name: '',
  role: 'guard',
  localName: '',
  adminName: '',
};

const ALL_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin',       label: 'Administrador', description: 'Acceso total al sistema' },
  { value: 'coordinator', label: 'Coordinador',   description: 'Coordinación de equipos' },
  { value: 'supervisor',  label: 'Supervisor',    description: 'Supervisión y reportes' },
  { value: 'operator',    label: 'Operador',      description: 'Gestión de operaciones' },
  { value: 'guard',       label: 'Guardia',       description: 'Acceso básico de seguridad' },
  { value: 'locatario',   label: 'Locatario',     description: 'Solo botón de pánico' },
];

const ROLE_FILTERS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all',         label: 'Todos' },
  { value: 'admin',       label: 'Admin' },
  { value: 'coordinator', label: 'Coordinador' },
  { value: 'supervisor',  label: 'Supervisor' },
  { value: 'operator',    label: 'Operador' },
  { value: 'guard',       label: 'Guardia' },
  { value: 'locatario',   label: 'Locatario' },
];

const getRoleLabel = (role?: string) => {
  const map: Record<string, string> = {
    admin: 'Administrador', coordinator: 'Coordinador', supervisor: 'Supervisor',
    operator: 'Operador', guard: 'Guardia', locatario: 'Locatario',
  };
  return map[role || ''] || 'Usuario';
};

const getRoleColor = (role?: string) => {
  const map: Record<string, string> = {
    admin:       colors.status.error,
    coordinator: colors.status.warning,
    supervisor:  colors.status.info,
    operator:    colors.accent,
    guard:       colors.status.success,
    locatario:   colors.text.secondary,
  };
  return map[role || ''] || colors.accent;
};

const formatLastLogin = (lastLogin?: string) => {
  if (!lastLogin) return 'Nunca';
  const now = new Date();
  const loginDate = new Date(lastLogin);
  const diffMs = now.getTime() - loginDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 5) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hoy, ${loginDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return loginDate.toLocaleDateString('es-CO');
};

export default function UsersScreen() {
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();

  const [users, setUsers]         = useState<ManagedUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter]   = useState<UserRole | 'all'>('all');

  // Modal state
  const [showModal, setShowModal]       = useState(false);
  const [editingUser, setEditingUser]   = useState<ManagedUser | null>(null);
  const [form, setForm]                 = useState<UserForm>(EMPTY_FORM);
  const [submitting, setSubmitting]     = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      const list: ManagedUser[] = res.data?.data?.users ?? res.data?.users ?? [];
      setUsers(list);
    } catch (err) {
      console.error('Error loading users:', err);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  // Client-side filtering
  const filteredUsers = users.filter((u) => {
    const matchesRole   = roleFilter === 'all' || u.role === roleFilter;
    const q             = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.localName?.toLowerCase().includes(q) ?? false);
    return matchesRole && matchesSearch;
  });

  // ── Modal helpers ──────────────────────────────────────
  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setForm({
      email: u.email, password: '', name: u.name, role: u.role,
      localName: u.localName || '', adminName: u.adminName || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!form.email || !form.name) {
      Alert.alert('Campos requeridos', 'Email y nombre son obligatorios.');
      return;
    }
    if (!editingUser && !form.password) {
      Alert.alert('Campos requeridos', 'La contraseña es obligatoria para nuevos usuarios.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        const body: Record<string, any> = {
          name: form.name, email: form.email, role: form.role,
          localName: form.localName || null, adminName: form.adminName || null,
        };
        if (form.password) body.password = form.password;
        await api.put(`/users/${editingUser.id}`, body);
        closeModal();
        await loadUsers();
        Alert.alert('Éxito', `${form.name} actualizado correctamente.`);
      } else {
        const body: Record<string, any> = {
          email: form.email, password: form.password, name: form.name, role: form.role,
        };
        if (form.localName) body.localName = form.localName;
        if (form.adminName) body.adminName = form.adminName;
        await api.post('/users', body);
        closeModal();
        await loadUsers();
        Alert.alert('Éxito', `${form.name} creado correctamente.`);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo guardar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (u: ManagedUser) => {
    if (u.id === currentUser?.id) {
      Alert.alert('Aviso', 'No puedes desactivar tu propio usuario.');
      return;
    }
    const action = u.isActive ? 'desactivar' : 'activar';
    Alert.alert(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
      `¿Estás seguro de que deseas ${action} a ${u.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: u.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.patch(`/users/${u.id}/toggle-status`);
              await loadUsers();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo cambiar el estado.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (u: ManagedUser) => {
    if (u.id === currentUser?.id) {
      Alert.alert('Aviso', 'No puedes eliminar tu propio usuario.');
      return;
    }
    Alert.alert(
      '¿Eliminar usuario?',
      `Esta acción eliminará permanentemente a ${u.name}. No se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/users/${u.id}`);
              await loadUsers();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo eliminar el usuario.');
            }
          },
        },
      ]
    );
  };

  // ── User row ───────────────────────────────────────────
  const renderUser = ({ item: u }: { item: ManagedUser }) => (
    <View style={[tw('flex-row items-center px-4 py-3 bg-surface rounded-2xl mb-2'), shadows.sm]}>
      {/* Avatar */}
      <View style={[
        tw('w-11 h-11 rounded-full items-center justify-center mr-3'),
        { backgroundColor: getColorWithOpacity(getRoleColor(u.role), 0.15) },
      ]}>
        <Text style={[tw('text-base font-bold'), { color: getRoleColor(u.role) }]}>
          {u.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={tw('flex-1 min-w-0')}>
        <View style={tw('flex-row items-center')}>
          <Text style={[tw('text-sm font-semibold mr-2'), { color: colors.primary }]} numberOfLines={1}>
            {u.name}
          </Text>
          {u.id === currentUser?.id && (
            <View style={[tw('px-1.5 py-0.5 rounded'), { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }]}>
              <Text style={[tw('text-xs font-bold'), { color: colors.accent }]}>Tú</Text>
            </View>
          )}
        </View>
        <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]} numberOfLines={1}>
          {u.email}
        </Text>
        <View style={tw('flex-row items-center flex-wrap')}>
          <View style={[tw('px-2 py-0.5 rounded-full mr-2'), { backgroundColor: getColorWithOpacity(getRoleColor(u.role), 0.12) }]}>
            <Text style={[tw('text-xs font-semibold'), { color: getRoleColor(u.role) }]}>
              {getRoleLabel(u.role)}
            </Text>
          </View>
          <View style={[tw('w-1.5 h-1.5 rounded-full mr-1'), { backgroundColor: u.isActive ? colors.status.success : colors.text.disabled }]} />
          <Text style={[tw('text-xs mr-2'), { color: colors.text.secondary }]}>
            {u.isActive ? 'Activo' : 'Inactivo'}
          </Text>
          <Text style={[tw('text-xs'), { color: colors.text.disabled }]}>
            {formatLastLogin(u.lastLogin)}
          </Text>
          {u.localName ? (
            <Text style={[tw('text-xs ml-1'), { color: colors.text.secondary }]} numberOfLines={1}>
              · {u.localName}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Acciones */}
      <View style={tw('flex-row items-center ml-2')}>
        <TouchableOpacity
          onPress={() => openEdit(u)}
          style={[tw('w-8 h-8 rounded-lg items-center justify-center mr-1'), { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }]}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={15} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleToggleStatus(u)}
          disabled={u.id === currentUser?.id}
          style={[
            tw('w-8 h-8 rounded-lg items-center justify-center mr-1'),
            { backgroundColor: u.isActive
              ? getColorWithOpacity(colors.status.warning, 0.1)
              : getColorWithOpacity(colors.status.success, 0.1)
            },
            u.id === currentUser?.id && { opacity: 0.3 },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={u.isActive ? 'person-remove-outline' : 'person-add-outline'}
            size={15}
            color={u.isActive ? colors.status.warning : colors.status.success}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(u)}
          disabled={u.id === currentUser?.id}
          style={[
            tw('w-8 h-8 rounded-lg items-center justify-center'),
            { backgroundColor: getColorWithOpacity(colors.status.error, 0.1) },
            u.id === currentUser?.id && { opacity: 0.3 },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color={colors.status.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Form modal styles ──────────────────────────────────
  const inputStyle = [
    tw('rounded-xl px-4 py-3 mb-1 text-sm'),
    { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border.light, color: colors.primary },
  ] as const;
  const labelStyle = [
    tw('text-xs font-bold mb-1.5 uppercase tracking-wide'),
    { color: colors.text.secondary },
  ] as const;

  if (loading) {
    return (
      <View style={[tw('flex-1 items-center justify-center'), { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[tw('mt-4 text-base'), { color: colors.text.secondary }]}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={[tw('flex-1'), { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <SafeAreaView style={tw('flex-1')} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={[tw('px-6 pt-4 pb-4'), { backgroundColor: colors.surface, ...shadows.sm }]}>
          <View style={tw('flex-row items-center justify-between mb-4')}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={tw('mr-3 p-1')}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={tw('flex-1')}>
              <Text style={[tw('text-xl font-bold'), { color: colors.primary }]}>Gestión de Usuarios</Text>
              <Text style={[tw('text-xs mt-0.5'), { color: colors.text.secondary }]}>
                {filteredUsers.length === users.length
                  ? `${users.length} usuarios`
                  : `${filteredUsers.length} de ${users.length} usuarios`
                }
              </Text>
            </View>
            <TouchableOpacity
              onPress={openCreate}
              style={[tw('flex-row items-center px-4 py-2.5 rounded-xl'), { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={16} color={colors.surface} style={tw('mr-1.5')} />
              <Text style={[tw('text-sm font-bold'), { color: colors.surface }]}>Nuevo</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de búsqueda */}
          <View style={[
            tw('flex-row items-center rounded-xl px-4 mb-3'),
            { backgroundColor: colors.background, height: 46, borderWidth: 1, borderColor: colors.border.light }
          ]}>
            <Ionicons name="search" size={18} color={colors.text.secondary} style={tw('mr-3')} />
            <TextInput
              style={[tw('flex-1 text-sm'), { color: colors.text.primary }]}
              placeholder="Buscar por nombre, email o local..."
              placeholderTextColor={colors.text.disabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtro por rol */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw('gap-2')}>
            {ROLE_FILTERS.map(({ value, label }) => {
              const isActive = roleFilter === value;
              const chipColor = value === 'all' ? colors.accent : getRoleColor(value);
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setRoleFilter(value)}
                  activeOpacity={0.7}
                  style={[
                    tw('px-3 py-2 rounded-lg'),
                    {
                      backgroundColor: isActive ? chipColor : colors.surface,
                      borderWidth: 1,
                      borderColor: isActive ? chipColor : colors.border.light,
                    }
                  ]}
                >
                  <Text style={[tw('text-xs font-bold'), { color: isActive ? colors.surface : colors.text.secondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista */}
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={tw('px-4 pt-4 pb-6')}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={tw('items-center justify-center py-16')}>
              <View style={[
                tw('w-20 h-20 rounded-full items-center justify-center mb-4'),
                { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }
              ]}>
                <Ionicons name="people-outline" size={40} color={colors.text.secondary} />
              </View>
              <Text style={[tw('text-lg font-bold mb-2'), { color: colors.primary }]}>
                {searchQuery || roleFilter !== 'all' ? 'Sin resultados' : 'No hay usuarios'}
              </Text>
              <Text style={[tw('text-sm text-center px-8'), { color: colors.text.secondary }]}>
                {searchQuery || roleFilter !== 'all'
                  ? 'Intenta ajustar la búsqueda o los filtros'
                  : 'No hay usuarios registrados en el sistema'
                }
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* Modal crear/editar */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[tw('flex-1 justify-end'), { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[tw('bg-surface rounded-t-3xl'), { maxHeight: '94%' }]}>
              {/* Header del modal */}
              <View style={[
                tw('flex-row items-center justify-between px-6 py-5'),
                { borderBottomWidth: 1, borderBottomColor: colors.border.light }
              ]}>
                <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                  {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
                </Text>
                <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={tw('px-6 py-5')}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Nombre */}
                <Text style={labelStyle}>Nombre completo *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Juan Pérez"
                  placeholderTextColor={colors.text.disabled}
                  value={form.name}
                  onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
                />
                <View style={tw('mb-4')} />

                {/* Email */}
                <Text style={labelStyle}>Email *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="usuario@nexori.com"
                  placeholderTextColor={colors.text.disabled}
                  value={form.email}
                  onChangeText={(v) => setForm(f => ({ ...f, email: v }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={tw('mb-4')} />

                {/* Contraseña */}
                <Text style={labelStyle}>
                  {editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                </Text>
                <TextInput
                  style={inputStyle}
                  placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                  placeholderTextColor={colors.text.disabled}
                  value={form.password}
                  onChangeText={(v) => setForm(f => ({ ...f, password: v }))}
                  secureTextEntry
                />
                <View style={tw('mb-4')} />

                {/* Selector de rol */}
                <Text style={labelStyle}>Rol</Text>
                <View style={[tw('rounded-xl overflow-hidden mb-4'), { borderWidth: 1, borderColor: colors.border.light }]}>
                  {ALL_ROLES.map((r, idx) => (
                    <TouchableOpacity
                      key={r.value}
                      activeOpacity={0.7}
                      onPress={() => setForm(f => ({ ...f, role: r.value, localName: '', adminName: '' }))}
                      style={[
                        tw('flex-row items-center px-4 py-3'),
                        form.role === r.value && { backgroundColor: getColorWithOpacity(colors.accent, 0.08) },
                        idx < ALL_ROLES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.light },
                      ]}
                    >
                      <View style={[
                        tw('w-5 h-5 rounded-full mr-3 items-center justify-center'),
                        { borderWidth: 2, borderColor: form.role === r.value ? colors.accent : colors.border.medium },
                      ]}>
                        {form.role === r.value && (
                          <View style={[tw('w-2.5 h-2.5 rounded-full'), { backgroundColor: colors.accent }]} />
                        )}
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={[tw('text-sm font-semibold'), { color: form.role === r.value ? colors.accent : colors.primary }]}>
                          {r.label}
                        </Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>{r.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Campos extra para locatario */}
                {form.role === 'locatario' && (
                  <View style={[
                    tw('rounded-xl p-4 mb-4'),
                    { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.06), borderWidth: 1, borderColor: colors.border.light }
                  ]}>
                    <Text style={[tw('text-xs font-bold mb-3'), { color: colors.text.secondary }]}>
                      INFORMACIÓN DEL LOCAL
                    </Text>
                    <Text style={labelStyle}>Nombre del local</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="Tienda / Restaurante / Local..."
                      placeholderTextColor={colors.text.disabled}
                      value={form.localName}
                      onChangeText={(v) => setForm(f => ({ ...f, localName: v }))}
                    />
                    <View style={tw('mb-3')} />
                    <Text style={labelStyle}>Administrador responsable</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="Nombre del administrador"
                      placeholderTextColor={colors.text.disabled}
                      value={form.adminName}
                      onChangeText={(v) => setForm(f => ({ ...f, adminName: v }))}
                    />
                  </View>
                )}

                {/* Botones */}
                <View style={tw('flex-row mt-2 mb-4')}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={closeModal}
                    style={[
                      tw('flex-1 rounded-xl py-4 items-center justify-center mr-3'),
                      { borderWidth: 1.5, borderColor: colors.border.light }
                    ]}
                  >
                    <Text style={[tw('text-sm font-bold'), { color: colors.text.secondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={[
                      tw('flex-1 rounded-xl py-4 items-center justify-center'),
                      { backgroundColor: submitting ? getColorWithOpacity(colors.accent, 0.5) : colors.accent }
                    ]}
                  >
                    {submitting
                      ? <ActivityIndicator size="small" color={colors.surface} />
                      : <Text style={[tw('text-sm font-bold'), { color: colors.surface }]}>
                          {editingUser ? 'Guardar' : 'Crear'}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
