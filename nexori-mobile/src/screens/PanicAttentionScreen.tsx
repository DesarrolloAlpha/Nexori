import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { API_BASE_URL } from '../config/api.config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedTabScreen } from '@/components/AnimatedTabScreen';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
// ✅ CAMBIO 1: Importar usePanic
import { usePanic } from '../hooks/usePanic';
import { PanicEvent } from '../types/panic';
import PanicAlertModal from '../components/modals/PanicAlertModal';
import panicService from '../services/panic.service';
import { useFocusEffect } from '@react-navigation/native';


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

type TabType = 'active' | 'history';

export default function PanicAttentionScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedAlert, setSelectedAlert] = useState<PanicEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // ✅ CAMBIO 2: Usar el hook usePanic
  const {
    events: panicEvents,
    activeAlerts,
    inProgressAlerts,
    resolvedAlerts,
    loading,
    isConnected,
    updateStatus,
    refresh,
  } = usePanic();
  
  const [refreshing, setRefreshing] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasActiveAlerts = activeAlerts.length > 0;

  // ===== ESTADÍSTICAS COMPACTAS =====
  const stats = useMemo(() => ({
    active: activeAlerts.length,
    inProgress: inProgressAlerts.length,
    resolved: resolvedAlerts.length,
    total: panicEvents.length,
  }), [activeAlerts, inProgressAlerts, resolvedAlerts, panicEvents]);

  // ===== ANIMACIÓN DE ALERTA =====
  useEffect(() => {
    if (hasActiveAlerts) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [hasActiveAlerts]);

  // ===== FOCUS EFFECT =====
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      refresh();
      
      return () => {
        setIsScreenFocused(false);
      };
    }, [refresh])
  );

  // ===== POLLING =====
  useEffect(() => {
    if (isScreenFocused && hasActiveAlerts) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      pollingIntervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refresh: Checking for new panic alerts...');
        refresh();
      }, 15000);
      
      console.log('✅ Polling activado');
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [panicEvents, isScreenFocused, hasActiveAlerts, refresh]);

  // ===== FUNCIONES DE REFRESH =====
  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // ===== FUNCIONES DE MODAL =====
  const handleOpenModal = (alert: PanicEvent) => {
    setSelectedAlert(alert);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedAlert(null);
  };

  // ===== ACCIONES DE ALERTA =====
  
  // ✅ CAMBIO 3: Usar updateStatus del hook
  const handleAttend = async (alertId: string, images?: string[]) => {
    try {
      const result = await updateStatus(alertId, 'attended');

      if (result && images && images.length > 0) {
        for (const imageUri of images) {
          await panicService.uploadImage(alertId, imageUri);
        }
      }

      if (result) {
        Alert.alert('✅ Éxito', 'Alerta marcada como atendida');
      }
    } catch (error) {
      console.error('Error attending panic alert:', error);
      Alert.alert('Error', 'No se pudo atender la alerta');
    }
  };

  const handleHold = async (alertId: string, notes: string) => {
    handleCloseModal();
  };

  // ✅ CAMBIO 4: Usar updateStatus del hook
  const handleResolve = async (alertId: string, notes: string, images?: string[]) => {
    try {
      const result = await updateStatus(alertId, 'resolved', notes);

      if (result && images && images.length > 0) {
        for (const imageUri of images) {
          await panicService.uploadImage(alertId, imageUri);
        }
      }

      if (result) {
        Alert.alert('✅ Éxito', 'Alerta resuelta correctamente');
        handleCloseModal();
      }
    } catch (error) {
      console.error('Error resolving panic alert:', error);
      Alert.alert('Error', 'No se pudo resolver la alerta');
    }
  };

  // ✅ CAMBIO 5: Usar updateStatus del hook
  const handleQuickResolve = async (id: string, e: any) => {
    e.stopPropagation();
    
    Alert.alert(
      'Confirmar',
      '¿Marcar esta alerta como resuelta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          style: 'default',
          onPress: async () => {
            try {
              const result = await updateStatus(id, 'resolved');
              
              if (result) {
                Alert.alert('✅ Éxito', 'Alerta resuelta');
              }
            } catch (error) {
              console.error('Error quick resolving:', error);
              Alert.alert('Error', 'No se pudo resolver la alerta');
            }
          },
        },
      ]
    );
  };

  // ===== FUNCIONES DE UI =====
  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      active: {
        icon: 'alert-circle' as const,
        label: 'Activa',
        color: colors.status.error,
        bgColor: getColorWithOpacity(colors.status.error, 0.1),
      },
      attended: {
        icon: 'eye' as const,
        label: 'Atendida',
        color: colors.status.warning,
        bgColor: getColorWithOpacity(colors.status.warning, 0.1),
      },
      resolved: {
        icon: 'checkmark-circle' as const,
        label: 'Resuelta',
        color: colors.status.success,
        bgColor: getColorWithOpacity(colors.status.success, 0.1),
      },
    };
    return configs[status as keyof typeof configs] || configs.active;
  };

  const renderDetailButton = (alert: PanicEvent) => (
    <TouchableOpacity
      style={[
        tw('flex-row items-center rounded-full px-3 py-1'),
        { backgroundColor: getColorWithOpacity(colors.status.error, 0.15) },
      ]}
      activeOpacity={0.85}
      onPress={(e) => {
        e.stopPropagation();
        handleOpenModal(alert);
      }}
    >
      <Ionicons name="document-text" size={14} color={colors.status.error} />
      <Text style={[tw('text-xs font-bold ml-1'), { color: colors.status.error }]}>
        Ver detalle
      </Text>
    </TouchableOpacity>
  );

  const renderLocalInfo = (alert: PanicEvent) => {
    const hasLocalInfo = alert.localName || alert.adminName || alert.localNumber;
    if (!hasLocalInfo) return null;

    return (
      <View style={tw('mt-2')}>
        {alert.localName && (
          <View style={tw('flex-row items-center')}>
            <Ionicons name="business" size={12} color={colors.text.secondary} />
            <Text style={[tw('text-xs font-semibold ml-1'), { color: colors.text.primary }]}>
              {alert.localName}
            </Text>
          </View>
        )}

        {(alert.adminName || alert.localNumber) && (
          <View style={tw('flex-row items-center flex-wrap mt-1')}>
            {alert.adminName && (
              <Text style={[tw('text-2xs font-semibold'), { color: colors.text.secondary, fontSize: 11 }]}>
                Responsable: {alert.adminName}
              </Text>
            )}
            {alert.adminName && alert.localNumber && (
              <Text style={[tw('text-2xs mx-1'), { color: colors.text.disabled }]}>•</Text>
            )}
            {alert.localNumber && (
              <Text style={[tw('text-2xs font-semibold'), { color: colors.text.secondary, fontSize: 11 }]}>
                Local #{alert.localNumber}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatElapsedTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return formatDate(timestamp);
  };

  return (
    <AnimatedTabScreen>
      <>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={hasActiveAlerts ? colors.status.error : colors.primary}
          animated
        />

        <SafeAreaView 
          style={[
            tw('flex-1'),
            { backgroundColor: hasActiveAlerts ? colors.status.error : colors.primary }
          ]}
          edges={['top']}
        >
          <View style={tw('flex-1 bg-background')}>
            {/* ===== HEADER COMPACTO ===== */}
            <View style={[
              tw('px-4 pb-4 pt-3'),
              { backgroundColor: hasActiveAlerts ? colors.status.error : colors.primary }
            ]}>
              <View style={tw('flex-row items-center justify-between mb-3')}>
                <View>
                  <Text style={tw('text-white text-2xl font-bold')}>
                    {hasActiveAlerts ? '🚨 ALERTAS ACTIVAS' : 'Monitor'}
                  </Text>
                  <Text style={[tw('text-sm mt-0.5'), { color: colors.surface, opacity: 0.9 }]}>
                    {hasActiveAlerts ? `${stats.active} alerta${stats.active !== 1 ? 's' : ''} pendiente${stats.active !== 1 ? 's' : ''}` : 'Centro de atención'}
                  </Text>
                </View>
                
                {hasActiveAlerts && (
                  <Animated.View style={[
                    tw('w-12 h-12 rounded-full items-center justify-center'),
                    { 
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      opacity: fadeAnim,
                    }
                  ]}>
                    <Ionicons name="notifications" size={24} color="white" />
                  </Animated.View>
                )}
              </View>

              {/* Tabs compactos */}
              <View style={tw('flex-row')}>
                <TouchableOpacity
                  style={[
                    tw('flex-1 py-2 rounded-lg mr-1'),
                    activeTab === 'active' && { backgroundColor: 'rgba(255,255,255,0.25)' }
                  ]}
                  onPress={() => setActiveTab('active')}
                >
                  <Text style={[
                    tw('text-center font-bold'),
                    { color: colors.surface, opacity: activeTab === 'active' ? 1 : 0.7 }
                  ]}>
                    Activas ({stats.active + stats.inProgress})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    tw('flex-1 py-2 rounded-lg ml-1'),
                    activeTab === 'history' && { backgroundColor: 'rgba(255,255,255,0.25)' }
                  ]}
                  onPress={() => setActiveTab('history')}
                >
                  <Text style={[
                    tw('text-center font-bold'),
                    { color: colors.surface, opacity: activeTab === 'history' ? 1 : 0.7 }
                  ]}>
                    Historial ({stats.resolved})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ===== CONTENIDO ===== */}
            <ScrollView 
              style={tw('flex-1 px-4')} 
              contentContainerStyle={tw('pt-4 pb-6')}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
            >
              {loading && panicEvents.length === 0 ? (
                <View style={tw('items-center py-12')}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[tw('text-sm mt-4'), { color: colors.text.secondary }]}>
                    Cargando alertas...
                  </Text>
                </View>
              ) : activeTab === 'active' ? (
                /* ===== ALERTAS ACTIVAS ===== */
                <>
                  {/* Estadísticas rápidas */}
                  <View style={tw('flex-row mb-4')}>
                    <View style={[
                      tw('flex-1 bg-surface rounded-xl p-3 mr-1'),
                      shadows.sm
                    ]}>
                      <View style={tw('flex-row items-center justify-between')}>
                        <View>
                          <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                            Activas
                          </Text>
                          <Text style={[tw('text-xl font-bold'), { color: colors.status.error }]}>
                            {stats.active}
                          </Text>
                        </View>
                        <View style={[
                          tw('w-10 h-10 rounded-lg items-center justify-center'),
                          { backgroundColor: getColorWithOpacity(colors.status.error, 0.1) }
                        ]}>
                          <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                        </View>
                      </View>
                    </View>

                    <View style={[
                      tw('flex-1 bg-surface rounded-xl p-3 ml-1'),
                      shadows.sm
                    ]}>
                      <View style={tw('flex-row items-center justify-between')}>
                        <View>
                          <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                            En Proceso
                          </Text>
                          <Text style={[tw('text-xl font-bold'), { color: colors.status.warning }]}>
                            {stats.inProgress}
                          </Text>
                        </View>
                        <View style={[
                          tw('w-10 h-10 rounded-lg items-center justify-center'),
                          { backgroundColor: getColorWithOpacity(colors.status.warning, 0.1) }
                        ]}>
                          <Ionicons name="eye" size={18} color={colors.status.warning} />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Lista de alertas activas */}
                  {activeAlerts.length === 0 && inProgressAlerts.length === 0 ? (
                    <View style={tw('items-center py-12')}>
                      <View style={[
                        tw('w-20 h-20 rounded-full items-center justify-center mb-4'),
                        { backgroundColor: getColorWithOpacity(colors.status.success, 0.1) }
                      ]}>
                        <Ionicons name="shield-checkmark" size={40} color={colors.status.success} />
                      </View>
                      <Text style={[tw('text-base font-bold'), { color: colors.text.primary }]}>
                        Sistema Estable
                      </Text>
                      <Text style={[tw('text-sm mt-1'), { color: colors.text.secondary }]}>
                        No hay alertas activas
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {/* Alertas activas */}
                      {activeAlerts.length > 0 && (
                        <View style={tw('mb-4')}>
                          <View style={tw('flex-row items-center mb-2')}>
                            <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                            <Text style={[tw('text-sm font-bold ml-2'), { color: colors.status.error }]}>
                              Alertas Activas ({activeAlerts.length})
                            </Text>
                          </View>
                          
                          {activeAlerts.map((alert) => {
                            const isExpanded = expandedId === alert.id;
                            const statusConfig = getStatusConfig(alert.status);
                            
                            return (
                              <TouchableWithoutFeedback
                                key={alert.id}
                                onPress={() => toggleExpand(alert.id)}
                                onLongPress={() => handleOpenModal(alert)}
                                delayLongPress={500}
                              >
                                <View style={[
                                  tw('bg-surface rounded-xl p-3 mb-2'),
                          { 
                            ...shadows.sm,
                            borderLeftWidth: 4,
                            borderLeftColor: statusConfig.color,
                          }
                        ]}>
                          <View style={tw('flex-row items-center')}>
                            <View style={[
                              tw('w-10 h-10 rounded-lg items-center justify-center mr-3'),
                              { backgroundColor: statusConfig.bgColor }
                            ]}>
                              <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                            </View>
                            
                            <View style={tw('flex-1')}>
                              <View style={tw('flex-row items-center justify-between')}>
                                <Text style={[tw('text-xs font-bold'), { color: colors.text.primary }]}>
                                  {alert.userName}
                                </Text>
                                <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                  {formatElapsedTime(alert.timestamp)}
                                </Text>
                              </View>
                              
                              {renderLocalInfo(alert)}

                              {renderLocalInfo(alert)}

                              <View style={tw('flex-row items-end justify-between mt-1')}>
                                <View style={tw('flex-row items-center')}>
                                  <Ionicons name="time" size={12} color={colors.text.secondary} />
                                  <Text style={[tw('text-xs ml-1'), { color: colors.text.secondary }]}>
                                    {formatTime(alert.timestamp)}
                                  </Text>
                                </View>

                                {renderDetailButton(alert)}
                              </View>
                            </View>

                            <View style={tw('ml-1')}>
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={colors.text.secondary}
                              />
                            </View>
                          </View>

                                  {isExpanded && (
                                    <View style={tw('mt-3 pt-3 border-t border-light')}>
                                      <TouchableOpacity
                                        style={[
                                          tw('py-2 rounded-lg flex-row items-center justify-center'),
                                          { backgroundColor: getColorWithOpacity(colors.status.warning, 0.1) }
                                        ]}
                                        onPress={(e) => {
                                          e.stopPropagation();
                                          handleOpenModal(alert);
                                        }}
                                      >
                                        <Ionicons name="eye" size={14} color={colors.status.warning} />
                                        <Text style={[tw('text-xs font-bold ml-2'), { color: colors.status.warning }]}>
                                          Atender alerta
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              </TouchableWithoutFeedback>
                            );
                          })}
                        </View>
                      )}

                      {/* Alertas en proceso */}
                      {inProgressAlerts.length > 0 && (
                        <View>
                          <View style={tw('flex-row items-center mb-2')}>
                            <Ionicons name="eye" size={16} color={colors.status.warning} />
                            <Text style={[tw('text-sm font-bold ml-2'), { color: colors.status.warning }]}>
                              En Proceso ({inProgressAlerts.length})
                            </Text>
                          </View>
                          
                          {inProgressAlerts.map((alert) => {
                            const isExpanded = expandedId === alert.id;
                            const statusConfig = getStatusConfig(alert.status);
                            
                            return (
                              <TouchableWithoutFeedback
                                key={alert.id}
                                onPress={() => toggleExpand(alert.id)}
                                onLongPress={() => handleOpenModal(alert)}
                                delayLongPress={500}
                              >
                                <View style={[
                                  tw('bg-surface rounded-xl p-3 mb-2'),
                          { 
                            ...shadows.sm,
                            borderLeftWidth: 4,
                            borderLeftColor: statusConfig.color,
                          }
                        ]}>
                          <View style={tw('flex-row items-center')}>
                            <View style={[
                              tw('w-10 h-10 rounded-lg items-center justify-center mr-3'),
                              { backgroundColor: statusConfig.bgColor }
                            ]}>
                              <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                            </View>
                            
                            <View style={tw('flex-1')}>
                              <View style={tw('flex-row items-center justify-between')}>
                                <Text style={[tw('text-xs font-bold'), { color: colors.text.primary }]}>
                                  {alert.userName}
                                </Text>
                                <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                  {formatElapsedTime(alert.timestamp)}
                                </Text>
                              </View>
                              
                              <View style={tw('flex-row items-end justify-between mt-1')}>
                                <View style={tw('flex-row items-center')}>
                                  <Ionicons name="time" size={12} color={colors.text.secondary} />
                                  <Text style={[tw('text-xs ml-1'), { color: colors.text.secondary }]}>
                                    {formatTime(alert.timestamp)}
                                  </Text>
                                </View>

                                {renderDetailButton(alert)}
                              </View>
                            </View>

                            <View style={tw('ml-1')}>
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={colors.text.secondary}
                              />
                            </View>
                          </View>

                                  {isExpanded && (
                                    <View style={tw('mt-3 pt-3 border-t border-light')}>
                                      {alert.attendedBy && (
                                        <View style={tw('flex-row items-center mb-2')}>
                                          <Ionicons name="person" size={14} color={colors.text.secondary} />
                                          <Text style={[tw('text-xs ml-2'), { color: colors.text.secondary }]}>
                                            Atendida por: <Text style={tw('font-bold')}>{alert.attendedBy}</Text>
                                          </Text>
                                        </View>
                                      )}
                                      
                                      <TouchableOpacity
                                        style={[
                                          tw('py-2 rounded-lg flex-row items-center justify-center'),
                                          { backgroundColor: getColorWithOpacity(colors.status.success, 0.1) }
                                        ]}
                                        onPress={(e) => handleQuickResolve(alert.id, e)}
                                      >
                                        <Ionicons name="checkmark-circle" size={14} color={colors.status.success} />
                                        <Text style={[tw('text-xs font-bold ml-2'), { color: colors.status.success }]}>
                                          Marcar como resuelta
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              </TouchableWithoutFeedback>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </>
              ) : (
                /* ===== HISTORIAL ===== */
                <View>
                  <View style={tw('flex-row items-center justify-between mb-4')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.text.primary }]}>
                      📋 Historial de Alertas
                    </Text>
                    <View style={[
                      tw('px-2 py-1 rounded-full'),
                      { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                    ]}>
                      <Text style={[tw('text-xs font-bold'), { color: colors.accent }]}>
                        {resolvedAlerts.length} resueltas
                      </Text>
                    </View>
                  </View>

                  {resolvedAlerts.length === 0 ? (
                    <View style={tw('items-center py-8')}>
                      <Text style={[tw('text-sm'), { color: colors.text.secondary }]}>
                        No hay alertas resueltas
                      </Text>
                    </View>
                  ) : (
                    resolvedAlerts.map((alert) => {
                      const isExpanded = expandedId === alert.id;
                      const statusConfig = getStatusConfig(alert.status);
                      
                      return (
                        <TouchableWithoutFeedback
                          key={alert.id}
                          onPress={() => toggleExpand(alert.id)}
                          onLongPress={() => handleOpenModal(alert)}
                          delayLongPress={500}
                        >
                          <View style={[
                            tw('bg-surface rounded-xl p-3 mb-2'),
                          { 
                            ...shadows.sm,
                            borderLeftWidth: 3,
                            borderLeftColor: statusConfig.color,
                          }
                        ]}>
                          <View style={tw('flex-row items-center')}>
                            <View style={[
                              tw('w-10 h-10 rounded-lg items-center justify-center mr-3'),
                              { backgroundColor: statusConfig.bgColor }
                            ]}>
                              <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                            </View>
                             
                            <View style={tw('flex-1 mr-2')}>
                              <View style={tw('flex-row items-center justify-between')}>
                                <Text style={[tw('text-xs font-bold'), { color: colors.text.primary }]}>
                                  {alert.userName}
                                </Text>
                                <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                  {formatDate(alert.timestamp)}
                                </Text>
                              </View>
                              
                            {renderLocalInfo(alert)}

                            <View style={tw('flex-row items-end justify-between mt-1')}>
                              <View style={tw('flex-row items-center flex-wrap')}>
                                <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                  {formatTime(alert.timestamp)}
                                </Text>
                                {alert.resolvedAt && (
                                  <>
                                    <Text style={[tw('text-xs mx-1'), { color: colors.text.secondary }]}>•</Text>
                                    <Ionicons name="checkmark-circle" size={10} color={colors.status.success} />
                                    <Text style={[tw('text-xs ml-1'), { color: colors.status.success }]}>
                                      Resuelta
                                    </Text>
                                  </>
                                )}
                              </View>

                              {renderDetailButton(alert)}
                            </View>
                          </View>

                          <View style={tw('ml-1')}>
                            <Ionicons 
                              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                              size={18} 
                              color={colors.text.secondary} 
                              />
                            </View>
                          </View>

                            {isExpanded && (alert.notes || (alert.attachments && alert.attachments.length > 0)) && (
                              <View style={tw('mt-3 pt-3 border-t border-light')}>
                                {alert.notes && (
                                  <>
                                    <Text style={[tw('text-xs font-bold mb-1'), { color: colors.text.secondary }]}>
                                      Notas de resolución:
                                    </Text>
                                    <Text style={[tw('text-xs mb-3'), { color: colors.text.primary }]}>
                                      {alert.notes}
                                    </Text>
                                  </>
                                )}
                                {alert.attachments && alert.attachments.length > 0 && (
                                  <>
                                    <Text style={[tw('text-xs font-bold mb-2'), { color: colors.text.secondary }]}>
                                      Evidencia fotográfica:
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                      {alert.attachments.map((imgPath, idx) => {
                                        const imgUrl = imgPath.startsWith('http')
                                          ? imgPath
                                          : `${API_BASE_URL.replace('/api', '')}${imgPath}`;
                                        return (
                                          <Image
                                            key={idx}
                                            source={{ uri: imgUrl }}
                                            style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8 }}
                                            resizeMode="cover"
                                          />
                                        );
                                      })}
                                    </ScrollView>
                                  </>
                                )}
                              </View>
                            )}
                          </View>
                        </TouchableWithoutFeedback>
                      );
                    })
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>

        {/* ===== MODAL DE GESTIÓN ===== */}
        <PanicAlertModal
          visible={modalVisible}
          panicAlert={selectedAlert}
          onClose={handleCloseModal}
          onAttend={handleAttend}
          onHold={handleHold}
          onResolve={handleResolve}
        />
      </>
    </AnimatedTabScreen>
  );
}
