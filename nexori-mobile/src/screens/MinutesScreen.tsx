import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  RefreshControl,
  Animated,
  LayoutAnimation,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import { AnimatedTabScreen } from '../components/AnimatedTabScreen';
import CreateMinuteModal from '../components/modals/CreateMinuteModal';
import MinuteDetailModal from '../components/modals/MinuteDetailModal';
import type { Minute, Category, Status, Priority } from '../types/minutes';
import { useMinutes } from '../hooks/useMinutes';
import { useAuth } from '../contexts/AuthContext';


const { colors, shadows } = designTokens;

// Configuración de animación
const ANIMATION_CONFIG = {
  duration: 200,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.scaleXY,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

type ExpandedState = {
  [key: string]: boolean;
};

export default function MinutesScreen() {
  const { token } = useAuth();
  
  // Estados para modales
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);

  // Estados para filtros y búsqueda - COMPACTOS
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<Status | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');

  // Estado para expandir minutas
  const [expandedMinutes, setExpandedMinutes] = useState<ExpandedState>({});
  
  // Referencias para animaciones
  const scrollViewRef = useRef<ScrollView>(null);
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Usar el hook de minutas
  const {
    minutes,
    loading,
    refreshing,
    isOnline,
    pendingCount,
    stats,
    refreshMinutes,
    updateMinuteStatus,
    deleteMinute
  } = useMinutes({
    search: searchQuery,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    priority: selectedPriority !== 'all' ? selectedPriority : undefined,
  });

  // ===== CONFIGURACIONES =====
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { 
        label: 'PENDIENTE', 
        color: colors.status.warning, 
        bgColor: colors.status.warningLight,
        icon: 'time-outline' as const
      },
      reviewed: { 
        label: 'REVISADA', 
        color: colors.status.info, 
        bgColor: colors.status.infoLight,
        icon: 'eye-outline' as const
      },
      closed: { 
        label: 'CERRADA', 
        color: colors.status.success, 
        bgColor: colors.status.successLight,
        icon: 'checkmark-circle-outline' as const
      },
    };
    
    // ✅ Retornar configuración por defecto si no se encuentra el status
    return configs[status as keyof typeof configs] || {
      label: 'DESCONOCIDO',
      color: colors.text.secondary,
      bgColor: colors.states.disabled,
      icon: 'help-circle-outline' as const
    };
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      high: { 
        label: 'ALTA', 
        color: colors.status.error, 
        bgColor: getColorWithOpacity(colors.status.error, 0.15),
        icon: 'warning' as const
      },
      medium: { 
        label: 'MEDIA', 
        color: colors.status.warning, 
        bgColor: getColorWithOpacity(colors.status.warning, 0.15),
        icon: 'alert-circle' as const
      },
      low: { 
        label: 'BAJA', 
        color: colors.status.success, 
        bgColor: getColorWithOpacity(colors.status.success, 0.15),
        icon: 'information-circle' as const
      },
    };
    
    // ✅ Retornar configuración por defecto si no se encuentra la prioridad
    return configs[priority as keyof typeof configs] || {
      label: 'MEDIA',
      color: colors.text.secondary,
      bgColor: getColorWithOpacity(colors.text.secondary, 0.15),
      icon: 'alert-circle' as const
    };
  };

  const getCategoryConfig = (category: string) => {
    const configs = {
      anotacion: { label: 'Anotación', icon: 'document-text' as const, color: colors.status.info },
      hurto: { label: 'Hurto', icon: 'alert-circle' as const, color: colors.status.error },
      novedad_vehiculo: { label: 'Vehículo', icon: 'car' as const, color: colors.status.warning },
      objetos_abandonados: { label: 'Objetos', icon: 'cube' as const, color: colors.status.info },
      novedad: { label: 'Novedad', icon: 'megaphone' as const, color: colors.accent },
      observacion: { label: 'Observación', icon: 'eye' as const, color: colors.status.info },
      recomendacion: { label: 'Recomendación', icon: 'bulb' as const, color: colors.status.success },
      nueva_marca: { label: 'Nueva Marca', icon: 'star' as const, color: colors.accent },
      incidente: { label: 'Incidente', icon: 'warning' as const, color: colors.status.warning },
      emergencia: { label: 'Emergencia', icon: 'alert' as const, color: colors.status.error },
      mantenimiento: { label: 'Mantenimiento', icon: 'construct' as const, color: colors.secondary },
      persona_sospechosa: { label: 'Persona', icon: 'person-circle' as const, color: colors.status.error },
    };
    
    // ✅ Retornar configuración por defecto si no se encuentra la categoría
    return configs[category as keyof typeof configs] || {
      label: 'Otro',
      icon: 'document-text' as const,
      color: colors.text.secondary
    };
  };

  // ===== MANEJADORES DE EXPANSIÓN =====
  const toggleExpand = useCallback((minuteId: string) => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExpandedMinutes(prev => ({
      ...prev,
      [minuteId]: !prev[minuteId]
    }));
  }, []);

  const collapseAll = useCallback(() => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExpandedMinutes({});
  }, []);

  // ===== MANEJADORES DE ACCIONES =====
  // El modal maneja internamente la creación + subida de imágenes.
  // Al terminar llama onSave() y aquí cerramos el modal y recargamos.
  // Para el modo offline, refreshMinutes() fusiona los items pendientes de la cola.
  const handleCreateMinute = () => {
    setCreateModalVisible(false);
    refreshMinutes();
  };

  const handleOpenDetail = (minute: Minute) => {
    setSelectedMinute(minute);
    setDetailModalVisible(true);
  };

  // ✅ FUNCIONES ADAPTADORAS PARA EL MODAL - FIRMA CORRECTA (id: string) => void
  const handleMarkAsReviewed = useCallback((id: string) => {
    updateMinuteStatus(id, 'reviewed');
  }, [updateMinuteStatus]);

  const handleCloseMinute = useCallback((id: string) => {
    updateMinuteStatus(id, 'closed');
  }, [updateMinuteStatus]);

  // ✅ FUNCIÓN PARA ACCIONES RÁPIDAS EN EXPANDIDO
  const handleQuickStatusChange = useCallback(async (id: string, newStatus: Status, e?: any) => {
    e?.stopPropagation();
    const success = await updateMinuteStatus(id, newStatus);
    if (success) {
      LayoutAnimation.configureNext(ANIMATION_CONFIG);
      setExpandedMinutes(prev => ({ ...prev, [id]: false }));
    }
  }, [updateMinuteStatus]);

  // ===== FILTROS CON ANIMACIÓN =====
  const toggleFilters = useCallback(() => {
    Animated.timing(filterAnim, {
      toValue: showFilters ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start();
    setShowFilters(!showFilters);
  }, [showFilters]);

  // ===== FILTRADO =====
  const filteredMinutes = useMemo(() => {
    return minutes.filter(minute => {
      const matchesSearch = searchQuery === '' || 
        minute.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        minute.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        minute.createdBy.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || minute.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || minute.status === selectedStatus;
      const matchesPriority = selectedPriority === 'all' || minute.priority === selectedPriority;

      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });
  }, [minutes, searchQuery, selectedCategory, selectedStatus, selectedPriority]);

  const hasActiveFilters = selectedCategory !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedPriority('all');
    setShowFilters(false);
  };

  // ===== FORMATO DE FECHA =====
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      });
    }
  };

  // ===== LOADING =====
  if (loading && minutes.length === 0) {
    return (
      <AnimatedTabScreen>
        <View style={[tw('flex-1 justify-center items-center'), { backgroundColor: colors.background }]}>
          <View style={[
            tw('w-16 h-16 rounded-2xl items-center justify-center mb-4'),
            { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
          ]}>
            <Ionicons name="document-text" size={32} color={colors.accent} />
          </View>
          <Text style={[tw('text-base font-semibold'), { color: colors.text.primary }]}>
            Cargando minutas...
          </Text>
        </View>
      </AnimatedTabScreen>
    );
  }

  return (
    <AnimatedTabScreen>
      <>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={colors.primary}
        />
        
        <SafeAreaView style={tw('flex-1 bg-primary')} edges={['top']}>
          <View style={tw('flex-1 bg-background')}>
            {/* ===== HEADER COMPACTO ===== */}
            <View style={[
              tw('bg-primary px-4 pt-4 pb-3'),
              { 
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
                ...shadows.md
              }
            ]}>
              {/* Título y estadísticas en una línea */}
              <View style={tw('flex-row items-center justify-between mb-3')}>
                <View style={tw('flex-row items-center')}>
                  <View style={[
                    tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(colors.surface, 0.15) }
                  ]}>
                    <Ionicons name="document-text" size={22} color={colors.surface} />
                  </View>
                  <View>
                    <Text style={tw('text-white text-lg font-bold')}>
                      Minutas
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.text.light, 0.7) }]}>
                      {filteredMinutes.length} registros
                    </Text>
                  </View>
                </View>

                {/* Stats compactos */}
                <View style={tw('flex-row')}>
                  <View style={tw('items-center mx-2')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.status.warning }]}>
                      {stats.pending}
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.7) }]}>
                      Pend.
                    </Text>
                  </View>
                  <View style={tw('items-center mx-2')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.status.info }]}>
                      {stats.reviewed}
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.7) }]}>
                      Rev.
                    </Text>
                  </View>
                  <View style={tw('items-center mx-2')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.status.success }]}>
                      {stats.closed}
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.7) }]}>
                      Cer.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Buscador compacto */}
              <View style={tw('flex-row items-center')}>
                <View style={[
                  tw('flex-1 flex-row items-center rounded-xl px-3'),
                  {
                    backgroundColor: getColorWithOpacity(colors.surface, 0.15),
                    height: 44,
                    borderWidth: 1,
                    borderColor: showFilters ? colors.accent : 'transparent',
                  }
                ]}>
                  <Ionicons name="search" size={18} color={getColorWithOpacity(colors.surface, 0.7)} />
                  <TextInput
                    style={[tw('flex-1 text-sm ml-2'), { color: colors.surface }]}
                    placeholder="Buscar minutas..."
                    placeholderTextColor={getColorWithOpacity(colors.surface, 0.5)}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={18} color={getColorWithOpacity(colors.surface, 0.7)} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Botón de filtros compacto */}
                <TouchableOpacity
                  onPress={toggleFilters}
                  activeOpacity={0.7}
                  style={[
                    tw('w-11 h-11 rounded-xl items-center justify-center ml-2'),
                    { 
                      backgroundColor: showFilters 
                        ? colors.surface 
                        : getColorWithOpacity(colors.surface, 0.15)
                    }
                  ]}
                >
                  <Ionicons 
                    name="options" 
                    size={20} 
                    color={showFilters ? colors.primary : colors.surface} 
                  />
                  {hasActiveFilters && !showFilters && (
                    <View style={[
                      tw('absolute -top-1 -right-1 w-3 h-3 rounded-full'),
                      { backgroundColor: colors.accent }
                    ]} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Filtros animados */}
              {showFilters && (
                <Animated.View style={[
                  tw('mt-3 p-3 rounded-xl'),
                  {
                    backgroundColor: getColorWithOpacity(colors.surface, 0.15),
                    opacity: filterAnim,
                    transform: [{
                      translateY: filterAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0]
                      })
                    }]
                  }
                ]}>
                  {/* Filtro rápido de estado en chips */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw('mb-2')}
                  >
                    {[
                      { value: 'all', label: 'Todas', color: colors.surface },
                      { value: 'pending', label: 'Pendientes', color: colors.status.warning },
                      { value: 'reviewed', label: 'Revisadas', color: colors.status.info },
                      { value: 'closed', label: 'Cerradas', color: colors.status.success },
                    ].map((status, index) => (
                      <TouchableOpacity
                        key={status.value}
                        onPress={() => setSelectedStatus(status.value as any)}
                        style={[
                          tw('px-3 py-1.5 rounded-full mr-2'),
                          {
                            backgroundColor: selectedStatus === status.value
                              ? status.color
                              : getColorWithOpacity(colors.surface, 0.2),
                          }
                        ]}
                      >
                        <Text style={[
                          tw('text-xs font-semibold'),
                          { color: selectedStatus === status.value ? colors.primary : colors.surface }
                        ]}>
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Filtro rápido de prioridad */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw('mb-2')}
                  >
                    {[
                      { value: 'all', label: 'Todas', color: colors.surface },
                      { value: 'high', label: 'Alta', color: colors.status.error },
                      { value: 'medium', label: 'Media', color: colors.status.warning },
                      { value: 'low', label: 'Baja', color: colors.status.success },
                    ].map((priority, index) => (
                      <TouchableOpacity
                        key={priority.value}
                        onPress={() => setSelectedPriority(priority.value as any)}
                        style={[
                          tw('px-3 py-1.5 rounded-full mr-2'),
                          {
                            backgroundColor: selectedPriority === priority.value
                              ? priority.color
                              : getColorWithOpacity(colors.surface, 0.2),
                          }
                        ]}
                      >
                        <Text style={[
                          tw('text-xs font-semibold'),
                          { color: selectedPriority === priority.value ? colors.primary : colors.surface }
                        ]}>
                          {priority.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Botón limpiar */}
                  {hasActiveFilters && (
                    <TouchableOpacity
                      onPress={clearFilters}
                      style={[
                        tw('mt-2 py-2 rounded-lg flex-row items-center justify-center'),
                        { backgroundColor: getColorWithOpacity(colors.surface, 0.2) }
                      ]}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.surface} style={tw('mr-2')} />
                      <Text style={[tw('text-xs font-bold'), { color: colors.surface }]}>
                        Limpiar filtros
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
            </View>

            {/* ===== BANNER OFFLINE ===== */}
            {!isOnline && (
              <View style={[
                tw('flex-row items-center justify-center px-4 py-2'),
                { backgroundColor: colors.status.warning }
              ]}>
                <Ionicons name="cloud-offline-outline" size={14} color="white" style={tw('mr-2')} />
                <Text style={[tw('text-xs font-bold'), { color: 'white' }]}>
                  Sin conexión{pendingCount > 0 ? ` · ${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}` : ''}
                </Text>
              </View>
            )}

            {/* ===== LISTA DE MINUTAS ===== */}
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={tw('pb-24 px-4 pt-4')}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    collapseAll();
                    refreshMinutes();
                  }}
                  colors={[colors.accent]}
                  tintColor={colors.accent}
                />
              }
            >
              {filteredMinutes.length === 0 ? (
                <View style={[
                  tw('bg-surface rounded-2xl p-8 items-center'),
                  { ...shadows.sm }
                ]}>
                  <View style={[
                    tw('w-20 h-20 rounded-2xl items-center justify-center mb-4'),
                    { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                  ]}>
                    <Ionicons name="document-text" size={40} color={colors.accent} />
                  </View>
                  <Text style={[tw('text-base font-bold mb-2'), { color: colors.text.primary }]}>
                    {hasActiveFilters ? 'Sin resultados' : 'No hay minutas'}
                  </Text>
                  <Text style={[tw('text-sm text-center'), { color: colors.text.secondary }]}>
                    {hasActiveFilters 
                      ? 'Prueba con otros filtros'
                      : 'Crea tu primera minuta con el botón +'}
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity
                      onPress={clearFilters}
                      style={[
                        tw('mt-5 px-5 py-3 rounded-xl'),
                        { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                      ]}
                    >
                      <Text style={[tw('text-sm font-bold'), { color: colors.accent }]}>
                        Limpiar filtros
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* Encabezado compacto */}
                  <View style={tw('flex-row items-center justify-between mb-3 px-1')}>
                    <Text style={[tw('text-xs font-semibold uppercase'), { color: colors.text.secondary }]}>
                      {hasActiveFilters ? 'Resultados' : 'Recientes'}
                    </Text>
                    {Object.keys(expandedMinutes).filter(id => expandedMinutes[id]).length > 0 && (
                      <TouchableOpacity onPress={collapseAll}>
                        <Text style={[tw('text-xs font-bold'), { color: colors.accent }]}>
                          Colapsar todo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {filteredMinutes.map((minute) => {
                    const isExpanded = expandedMinutes[minute.id];
                    const statusConfig = getStatusConfig(minute.status);
                    const priorityConfig = getPriorityConfig(minute.priority);
                    const categoryConfig = getCategoryConfig(minute.category);
                    
                    return (
                      <TouchableWithoutFeedback
                        key={minute.id}
                        onPress={() => toggleExpand(minute.id)}
                        onLongPress={() => handleOpenDetail(minute)}
                        delayLongPress={500}
                      >
                        <Animated.View style={[
                          tw('bg-surface rounded-2xl p-4 mb-3'),
                          { 
                            ...shadows.sm,
                            borderLeftWidth: 4,
                            borderLeftColor: statusConfig.color,
                          }
                        ]}>
                          {/* ===== ESTADO COLAPSADO (SIEMPRE VISIBLE) ===== */}
                          <View style={tw('flex-row items-center')}>
                            {/* Icono de categoría */}
                            <View style={[
                              tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                              { backgroundColor: getColorWithOpacity(categoryConfig.color, 0.1) }
                            ]}>
                              <Ionicons
                                name={categoryConfig.icon}
                                size={20}
                                color={categoryConfig.color}
                              />
                            </View>

                            {/* Información principal */}
                            <View style={tw('flex-1')}>
                              <View style={tw('flex-row items-center mb-1')}>
                                <Text
                                  style={[tw('text-sm font-bold flex-1 mr-2'), { color: colors.text.primary }]}
                                  numberOfLines={1}
                                >
                                  {minute.title}
                                </Text>
                                {minute.id.startsWith('TEMP_') ? (
                                  <View style={[
                                    tw('flex-row items-center px-2 py-0.5 rounded-full'),
                                    { backgroundColor: getColorWithOpacity(colors.status.info, 0.15) }
                                  ]}>
                                    <Ionicons name="cloud-upload-outline" size={10} color={colors.status.info} />
                                    <Text style={[tw('ml-1'), { fontSize: 10, fontWeight: 'bold', color: colors.status.info }]}>
                                      SYNC
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                    {formatTime(minute.date)}
                                  </Text>
                                )}
                              </View>

                              <View style={tw('flex-row items-center')}>
                                {/* Badge de estado - pequeño */}
                                <View style={[
                                  tw('px-2 py-0.5 rounded-full mr-2'),
                                  { backgroundColor: statusConfig.bgColor }
                                ]}>
                                  <Text style={[tw('text-xs font-bold'), { color: statusConfig.color, fontSize: 10 }]}>
                                    {statusConfig.label}
                                  </Text>
                                </View>

                                {/* Prioridad - solo icono */}
                                <Ionicons
                                  name={priorityConfig.icon}
                                  size={14}
                                  color={priorityConfig.color}
                                />

                                {/* Preview de descripción */}
                                <Text
                                  style={[tw('text-xs ml-2 flex-1'), { color: colors.text.secondary }]}
                                  numberOfLines={1}
                                >
                                  {minute.description}
                                </Text>
                              </View>
                            </View>

                            {/* Icono de expand */}
                            <View style={tw('ml-2')}>
                              <Ionicons 
                                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                                size={20} 
                                color={colors.text.secondary} 
                              />
                            </View>
                          </View>

                          {/* ===== ESTADO EXPANDIDO (OPCIONAL) ===== */}
                          {isExpanded && (
                            <Animated.View style={[
                              tw('mt-4 pt-3'),
                              {
                                borderTopWidth: 1,
                                borderTopColor: colors.border.light,
                              }
                            ]}>
                              {/* Descripción completa */}
                              <View style={tw('mb-4')}>
                                <Text style={[tw('text-xs font-bold mb-2 uppercase'), { color: colors.text.secondary }]}>
                                  Descripción
                                </Text>
                                <Text style={[tw('text-sm'), { color: colors.text.primary, lineHeight: 20 }]}>
                                  {minute.description}
                                </Text>
                              </View>

                              {/* Metadatos */}
                              <View style={tw('flex-row items-center justify-between mb-4')}>
                                <View style={tw('flex-row items-center')}>
                                  <View style={[
                                    tw('w-8 h-8 rounded-full items-center justify-center mr-2'),
                                    { backgroundColor: getColorWithOpacity(colors.secondary, 0.1) }
                                  ]}>
                                    <Ionicons name="person" size={14} color={colors.secondary} />
                                  </View>
                                  <View>
                                    <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                      Creado por
                                    </Text>
                                    <Text style={[tw('text-xs font-bold'), { color: colors.text.primary }]}>
                                      {minute.createdBy}
                                    </Text>
                                  </View>
                                </View>
                                
                                <View style={tw('flex-row items-center')}>
                                  <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
                                  <Text style={[tw('text-xs ml-1'), { color: colors.text.secondary }]}>
                                    {formatDate(minute.date)}
                                  </Text>
                                </View>
                              </View>

                              {/* Acciones rápidas */}
                              <View style={tw('flex-row')}>
                                {minute.status === 'pending' && (
                                  <TouchableOpacity
                                    style={[
                                      tw('flex-1 py-2.5 rounded-lg mr-2 flex-row items-center justify-center'),
                                      { backgroundColor: getColorWithOpacity(colors.status.info, 0.1) }
                                    ]}
                                    onPress={(e) => handleQuickStatusChange(minute.id, 'reviewed', e)}
                                  >
                                    <Ionicons name="eye-outline" size={16} color={colors.status.info} />
                                    <Text style={[tw('text-xs font-bold ml-2'), { color: colors.status.info }]}>
                                      Revisar
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                
                                {minute.status === 'reviewed' && (
                                  <TouchableOpacity
                                    style={[
                                      tw('flex-1 py-2.5 rounded-lg mr-2 flex-row items-center justify-center'),
                                      { backgroundColor: getColorWithOpacity(colors.status.success, 0.1) }
                                    ]}
                                    onPress={(e) => handleQuickStatusChange(minute.id, 'closed', e)}
                                  >
                                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.status.success} />
                                    <Text style={[tw('text-xs font-bold ml-2'), { color: colors.status.success }]}>
                                      Cerrar
                                    </Text>
                                  </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                  style={[
                                    tw('py-2.5 px-4 rounded-lg flex-row items-center'),
                                    { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                                  ]}
                                  onPress={() => handleOpenDetail(minute)}
                                >
                                  <Ionicons name="open-outline" size={16} color={colors.accent} />
                                </TouchableOpacity>
                              </View>
                            </Animated.View>
                          )}
                        </Animated.View>
                      </TouchableWithoutFeedback>
                    );
                  })}
                </>
              )}
            </ScrollView>

            {/* ===== FAB MEJORADO ===== */}
            <TouchableOpacity
              style={[
                tw('absolute bottom-6 right-6 w-14 h-14 rounded-2xl items-center justify-center'),
                { 
                  backgroundColor: colors.accent,
                  ...shadows.xl
                }
              ]}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={28} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Modales */}
        <CreateMinuteModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSave={handleCreateMinute}
        />

        <MinuteDetailModal
          visible={detailModalVisible}
          minute={selectedMinute}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedMinute(null);
          }}
          onMarkAsReviewed={handleMarkAsReviewed}
          onCloseMinute={handleCloseMinute}
        />
      </>
    </AnimatedTabScreen>
  );
}