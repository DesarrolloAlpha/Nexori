import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedTabScreen } from '@/components/AnimatedTabScreen';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import { useFocusEffect } from '@react-navigation/native';

import minuteService from '../services/minute.service';
import bikeService from '../services/bike.service';

const { colors, shadows } = designTokens;

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

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const isAdmin = user?.role === 'admin';
  const canSeeReportsAndActivity = ['admin', 'coordinator', 'supervisor'].includes(user?.role || '');

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats]   = useState({ bikesRegistered: 0, minutesCreated: 0 });

  const loadUserStats = useCallback(async () => {
    try {
      const [bikesResponse, minutesResponse] = await Promise.all([
        bikeService.getAll({}),
        minuteService.getAll({ limit: 1000 }),
      ]);
      const bikesCount = bikesResponse ? bikesResponse.length : 0;
      let minutesCount = 0;
      if (minutesResponse.success && minutesResponse.data) {
        minutesCount = minutesResponse.data.minutes.filter(
          (m: any) => m.createdBy === user?.name || m.createdBy === user?.email
        ).length;
      }
      setUserStats({ bikesRegistered: bikesCount, minutesCreated: minutesCount });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadUserStats();
  }, [loadUserStats, user]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadUserStats();
    }, [loadUserStats, user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserStats();
  }, [loadUserStats]);

  if (loading) {
    return (
      <SafeAreaView style={tw('flex-1 bg-background items-center justify-center')}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[tw('mt-4 text-base'), { color: colors.text.secondary }]}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  const personalInfo = [
    { icon: 'mail-outline',            label: 'Email',         value: user?.email || 'N/A' },
    { icon: 'shield-checkmark-outline', label: 'Rol',          value: getRoleLabel(user?.role) },
    { icon: 'checkmark-circle-outline', label: 'Estado',       value: user?.isActive ? 'Activo' : 'Inactivo', hasIndicator: true },
    { icon: 'time-outline',             label: 'Último acceso', value: formatLastLogin(user?.lastLogin) },
  ];

  const menuOptions = [
    {
      icon: 'settings-outline',
      title: 'Configuración',
      description: 'Ajustes de la aplicación',
      color: colors.accent,
      onPress: () => navigation.navigate('PanicSettings' as never),
    },
    {
      icon: 'shield-outline',
      title: 'Seguridad',
      description: 'Contraseña y privacidad',
      color: colors.status.success,
    },
    {
      icon: 'help-circle-outline',
      title: 'Ayuda',
      description: 'Soporte y documentación',
      color: colors.status.info,
    },
    {
      icon: 'information-circle-outline',
      title: 'Acerca de',
      description: 'Versión e información',
      color: colors.text.secondary,
    },
  ];

  return (
    <AnimatedTabScreen>
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <SafeAreaView style={tw('flex-1 bg-primary')} edges={['top']}>
        <View style={tw('flex-1 bg-background')}>
          {/* Header */}
          <View style={[tw('bg-primary px-6 pb-8'), { paddingTop: Platform.OS === 'android' ? 16 : 8 }]}>
            <Text style={tw('text-white text-2xl font-bold mb-6')}>Mi Perfil</Text>
            <View style={tw('items-center')}>
              <View style={tw('mb-4')}>
                <View style={[
                  tw('w-24 h-24 rounded-full items-center justify-center'),
                  { backgroundColor: getRoleColor(user?.role), borderWidth: 4, borderColor: getColorWithOpacity(colors.surface, 0.2) },
                  shadows.lg,
                ]}>
                  <Text style={tw('text-white text-4xl font-bold')}>
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </Text>
                </View>
                {user?.isActive && (
                  <View style={[
                    tw('absolute bottom-1 right-1 w-6 h-6 rounded-full items-center justify-center'),
                    { backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.primary },
                  ]}>
                    <View style={[tw('w-4 h-4 rounded-full'), { backgroundColor: colors.status.success }]} />
                  </View>
                )}
              </View>
              <Text style={tw('text-white text-xl font-bold mb-1')}>{user?.name || 'Usuario'}</Text>
              <Text style={[tw('text-sm mb-4'), { color: getColorWithOpacity(colors.text.light, 0.8) }]}>
                {user?.email || 'email@nexori.com'}
              </Text>
              <View style={[tw('px-4 py-2 rounded-xl flex-row items-center'), { backgroundColor: getColorWithOpacity(getRoleColor(user?.role), 0.2) }]}>
                <Ionicons name="shield-checkmark" size={14} color={getRoleColor(user?.role)} style={tw('mr-2')} />
                <Text style={[tw('text-xs font-bold'), { color: getRoleColor(user?.role) }]}>
                  {getRoleLabel(user?.role).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw('pb-6')}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            }
          >
            {/* Información personal */}
            <View style={tw('px-6 mt-6')}>
              <Text style={[tw('text-base font-bold mb-4'), { color: colors.primary }]}>Información Personal</Text>
              <View style={[tw('bg-surface rounded-2xl overflow-hidden'), shadows.sm]}>
                {personalInfo.map((info, index) => (
                  <View
                    key={index}
                    style={[
                      tw('flex-row items-center p-5'),
                      index < personalInfo.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.light },
                    ]}
                  >
                    <View style={[tw('w-11 h-11 rounded-xl items-center justify-center mr-4'), { backgroundColor: getColorWithOpacity(colors.accent, 0.12) }]}>
                      <Ionicons name={info.icon as any} size={20} color={colors.accent} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={[tw('text-xs font-bold mb-1 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                        {info.label}
                      </Text>
                      <View style={tw('flex-row items-center')}>
                        <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>{info.value}</Text>
                        {info.hasIndicator && user?.isActive && (
                          <View style={[tw('w-2 h-2 rounded-full ml-2'), { backgroundColor: colors.status.success }]} />
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Actividad — solo admin, coordinador y supervisor */}
            {canSeeReportsAndActivity && (
              <View style={tw('px-6 mt-6')}>
                <View style={tw('flex-row items-center justify-between mb-4')}>
                  <Text style={[tw('text-base font-bold'), { color: colors.primary }]}>Tu Actividad</Text>
                  <TouchableOpacity
                    onPress={onRefresh}
                    style={[tw('w-8 h-8 rounded-lg items-center justify-center'), { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }]}
                  >
                    <Ionicons name="refresh" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
                <View style={tw('flex-row')}>
                  {[
                    { icon: 'bicycle',       label: 'Bicicletas', value: String(userStats.bikesRegistered),  color: colors.accent },
                    { icon: 'document-text', label: 'Minutas',    value: String(userStats.minutesCreated), color: colors.status.info },
                  ].map((stat, index) => (
                    <View key={index} style={[tw('flex-1 bg-surface rounded-2xl p-5'), shadows.sm, index === 0 && tw('mr-2')]}>
                      <View style={[tw('w-14 h-14 rounded-2xl items-center justify-center mb-4'), { backgroundColor: getColorWithOpacity(stat.color, 0.15) }]}>
                        <Ionicons name={stat.icon as any} size={26} color={stat.color} />
                      </View>
                      <Text style={[tw('text-3xl font-bold mb-1'), { color: colors.primary }]}>{stat.value}</Text>
                      <Text style={[tw('text-xs font-semibold'), { color: colors.text.secondary }]}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Configuración */}
            <View style={tw('px-6 mt-6')}>
              <Text style={[tw('text-base font-bold mb-4'), { color: colors.primary }]}>Configuración</Text>
              <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>

                {/* Gestión de Usuarios — solo admin */}
                {isAdmin && (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('Users' as never)}
                      style={tw('flex-row items-center py-4')}
                    >
                      <View style={[tw('w-12 h-12 rounded-xl items-center justify-center mr-4'), { backgroundColor: getColorWithOpacity(colors.status.error, 0.15) }]}>
                        <Ionicons name="people" size={22} color={colors.status.error} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={[tw('text-base font-semibold mb-1'), { color: colors.primary }]}>Gestión de Usuarios</Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>Crear, editar y administrar usuarios del sistema</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <View style={[tw('h-px'), { backgroundColor: colors.border.light }]} />
                  </>
                )}

                {/* Reportes y Tickets — solo admin, coordinador y supervisor */}
                {canSeeReportsAndActivity && (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('Reports' as never)}
                      style={tw('flex-row items-center py-4')}
                    >
                      <View style={[tw('w-12 h-12 rounded-xl items-center justify-center mr-4'), { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }]}>
                        <Ionicons name="bar-chart" size={22} color={colors.accent} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={[tw('text-base font-semibold mb-1'), { color: colors.primary }]}>Reportes e Informes</Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>Genera reportes filtrados de minutas, bicicletas y pánico</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <View style={[tw('h-px'), { backgroundColor: colors.border.light }]} />

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('Tickets' as never)}
                      style={tw('flex-row items-center py-4')}
                    >
                      <View style={[tw('w-12 h-12 rounded-xl items-center justify-center mr-4'), { backgroundColor: getColorWithOpacity(colors.status.info, 0.15) }]}>
                        <Ionicons name="ticket" size={22} color={colors.status.info} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={[tw('text-base font-semibold mb-1'), { color: colors.primary }]}>Soporte y Tickets</Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>Reporta errores, sugiere funciones o pide ayuda</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <View style={[tw('h-px'), { backgroundColor: colors.border.light }]} />
                  </>
                )}

                {menuOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      tw('flex-row items-center py-4'),
                      index < menuOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.light },
                    ]}
                    activeOpacity={0.7}
                    onPress={option.onPress}
                  >
                    <View style={[tw('w-11 h-11 rounded-xl items-center justify-center mr-4'), { backgroundColor: getColorWithOpacity(option.color, 0.15) }]}>
                      <Ionicons name={option.icon as any} size={20} color={option.color} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={[tw('text-sm font-bold mb-0.5'), { color: colors.primary }]}>{option.title}</Text>
                      <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>{option.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text.disabled} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cerrar sesión */}
            <View style={tw('px-6 mt-2')}>
              <TouchableOpacity
                style={[tw('bg-surface rounded-2xl p-5 flex-row items-center justify-center'), { borderWidth: 2, borderColor: colors.status.error }, shadows.sm]}
                onPress={logout}
                activeOpacity={0.7}
              >
                <View style={[tw('w-10 h-10 rounded-xl items-center justify-center mr-3'), { backgroundColor: getColorWithOpacity(colors.status.error, 0.15) }]}>
                  <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
                </View>
                <Text style={[tw('text-base font-bold'), { color: colors.status.error }]}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={tw('px-6 mt-8 items-center')}>
              <View style={[tw('px-4 py-2 rounded-lg mb-2'), { backgroundColor: getColorWithOpacity(colors.backgroundAlt, 0.5) }]}>
                <Text style={[tw('text-xs font-semibold'), { color: colors.text.secondary }]}>Versión 1.0.0</Text>
              </View>
              <Text style={[tw('text-xs'), { color: colors.text.secondary, opacity: 0.7 }]}>
                © 2026 Nexori - Control de Seguridad
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
    </AnimatedTabScreen>
  );
}
