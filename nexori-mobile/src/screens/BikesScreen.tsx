import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  RefreshControl,
  LayoutAnimation,
  TouchableWithoutFeedback,
} from 'react-native';
import bikeService from '../services/bike.service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import { AnimatedTabScreen } from '../components/AnimatedTabScreen';
import RegisterBikeModal from '../components/modals/RegisterBikeModal';
import QRScannerModal from '../components/modals/QRScannerModal';
import BikeDetailModal from '../components/modals/BikeDetailModal';
import type { Bike, BikeHistoryEntry, BikeStatus } from '../types/bikes';
import { offlineQueue } from '../services/offlineQueue.service';


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

export default function BikesScreen() {
  const { user } = useAuth();

  // Estados para modales
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);

  // Estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BikeStatus | 'all'>('all');
  const [history, setHistory] = useState<BikeHistoryEntry[]>([]);

  // Estado de bicicletas
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Estado offline ──────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(offlineQueue.isOnline);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    const count = await offlineQueue.pendingCount();
    setPendingCount(count);
  }, []);

  // ── Merge bikes del servidor con pendientes de la cola ──────────────────────
  const mergeWithPending = useCallback(async (serverBikes: Bike[]): Promise<Bike[]> => {
    const pendingOps = await offlineQueue.getQueueByEntity('bike');
    const pendingCreates = pendingOps.filter(op => op.op === 'create');
    if (pendingCreates.length === 0) return serverBikes;

    const existingIds = new Set(serverBikes.map(b => b.id));
    const tempBikes: Bike[] = pendingCreates
      .filter(op => op.tempId && !existingIds.has(op.tempId))
      .map(op => ({
        id: op.tempId!,
        serialNumber: 'PENDIENTE',
        brand: op.payload.brand,
        model: op.payload.model || '',
        color: op.payload.color || '',
        ownerName: op.payload.ownerName,
        ownerDocument: op.payload.ownerDocument,
        ownerPhone: op.payload.ownerPhone,
        location: op.payload.location || '',
        status: 'outside' as const,
        createdAt: new Date(op.timestamp).toISOString(),
        updatedAt: new Date(op.timestamp).toISOString(),
      }));

    return [...tempBikes, ...serverBikes];
  }, []);

  // ── Inicializar offlineQueue + listeners ────────────────────────────────────
  useEffect(() => {
    offlineQueue.init();

    // Cuando la cola se sincroniza → recargar desde servidor
    const unsubSync = offlineQueue.onSync(entity => {
      if (entity === 'bike') loadBikes();
    });

    // Cambios de red
    const NetInfo = require('@react-native-community/netinfo').default;
    const unsubNet = NetInfo.addEventListener((state: any) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
      refreshPending();
    });

    refreshPending();
    return () => { unsubSync(); unsubNet(); };
  }, []);

  // Cargar bicicletas al inicio
  useEffect(() => {
    loadBikes();
  }, []);

  const loadBikes = async () => {
    setLoading(true);
    try {
      if (!offlineQueue.isOnline) {
        // Sin conexión: mostrar caché + pendientes
        const cached = await offlineQueue.getCache<Bike[]>('bike');
        if (cached) {
          const merged = await mergeWithPending(cached);
          setBikes(merged);
        }
        return;
      }

      const data = await bikeService.getAll({
        search: searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      await offlineQueue.setCache('bike', data);
      const merged = await mergeWithPending(data);
      setBikes(merged);
    } catch {
      // Error de red: caer al caché
      const cached = await offlineQueue.getCache<Bike[]>('bike');
      if (cached) {
        const merged = await mergeWithPending(cached);
        setBikes(merged);
      } else {
        Alert.alert('Error', 'No se pudieron cargar las bicicletas');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBikes();
    await refreshPending();
    setRefreshing(false);
    setExpandedId(null);
  };

  // ===== FUNCIONES DE EXPANSIÓN =====
  const toggleExpand = useCallback((bikeId: string) => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExpandedId(expandedId === bikeId ? null : bikeId);
  }, [expandedId]);

  const collapseAll = useCallback(() => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExpandedId(null);
  }, []);

  // ===== FUNCIONES CRUD =====
  const handleRegisterBike = async (newBike: {
    brand: string;
    model: string;
    color: string;
    ownerName: string;
    ownerDocument: string;
    ownerPhone: string;
    location: string;
  }) => {
    // ── Sin conexión: encolar + item temporal ──────────────────────────────
    if (!offlineQueue.isOnline) {
      const tempId = `TEMP_${Date.now()}`;
      await offlineQueue.enqueue({
        entity: 'bike',
        op: 'create',
        payload: newBike,
        tempId,
      });

      const tempBike: Bike = {
        id: tempId,
        serialNumber: 'PENDIENTE',
        brand: newBike.brand,
        model: newBike.model,
        color: newBike.color,
        ownerName: newBike.ownerName,
        ownerDocument: newBike.ownerDocument,
        ownerPhone: newBike.ownerPhone,
        location: newBike.location,
        status: 'outside',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setBikes(prev => [tempBike, ...prev]);
      await refreshPending();
      // Devolvemos datos ficticios para que el modal muestre la pantalla de éxito
      return { serialNumber: 'PENDIENTE', qrCode: '', _offline: true } as any;
    }

    // ── Con conexión: flujo normal ─────────────────────────────────────────
    const createdBike = await bikeService.create(newBike);
    setBikes(prev => [createdBike, ...prev]);
    return createdBike;
  };

  const handleBikeScanned = (qrCode: string) => {
    const bike = bikes.find(b => b.qrCode === qrCode);
    if (bike) {
      setSelectedBike(bike);
      setDetailModalVisible(true);
    }
  };

  const handleOpenDetail = (bike: Bike) => {
    setSelectedBike(bike);
    setDetailModalVisible(true);
  };

  const handleCheckIn = async (bikeId: string) => {
    // ── Sin conexión ────────────────────────────────────────────────────────
    if (!offlineQueue.isOnline) {
      if (bikeId.startsWith('TEMP_')) {
        Alert.alert('Sin conexión', 'Esta bicicleta aún no se ha sincronizado con el servidor.');
        return;
      }
      Alert.alert(
        'Registrar Entrada',
        '¿Confirmas el ingreso? Se guardará para sincronizar cuando haya conexión.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              await offlineQueue.enqueue({ entity: 'bike', op: 'checkIn', payload: { id: bikeId } });
              setBikes(prev => prev.map(b => b.id === bikeId ? { ...b, status: 'inside' as const } : b));
              await refreshPending();
              setDetailModalVisible(false);
            },
          },
        ]
      );
      return;
    }

    // ── Con conexión ─────────────────────────────────────────────────────────
    Alert.alert(
      'Registrar Entrada',
      '¿Confirmas el ingreso de esta bicicleta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            const performCheckIn = async () => {
              try {
                const updatedBike = await bikeService.checkIn(bikeId);
                setBikes(prev => prev.map(b => b.id === bikeId ? updatedBike : b));
                setDetailModalVisible(false);
                Alert.alert('Entrada Registrada', 'La bicicleta ha ingresado al establecimiento');
              } catch (error) {
                console.error('Error checking in:', error);
                Alert.alert('Error', 'No se pudo registrar la entrada');
              }
            };
            performCheckIn();
          },
        },
      ]
    );
  };

  const handleCheckOut = async (bikeId: string) => {
    // ── Sin conexión ────────────────────────────────────────────────────────
    if (!offlineQueue.isOnline) {
      if (bikeId.startsWith('TEMP_')) {
        Alert.alert('Sin conexión', 'Esta bicicleta aún no se ha sincronizado con el servidor.');
        return;
      }
      Alert.alert(
        'Registrar Salida',
        '¿Confirmas la salida? Se guardará para sincronizar cuando haya conexión.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              await offlineQueue.enqueue({ entity: 'bike', op: 'checkOut', payload: { id: bikeId } });
              setBikes(prev => prev.map(b => b.id === bikeId ? { ...b, status: 'outside' as const } : b));
              await refreshPending();
              setDetailModalVisible(false);
            },
          },
        ]
      );
      return;
    }

    // ── Con conexión ─────────────────────────────────────────────────────────
    Alert.alert(
      'Registrar Salida',
      '¿Confirmas la salida de esta bicicleta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            const performCheckOut = async () => {
              try {
                const updatedBike = await bikeService.checkOut(bikeId);
                setBikes(prev => prev.map(b => b.id === bikeId ? updatedBike : b));
                setDetailModalVisible(false);
                Alert.alert('Salida Registrada', 'La bicicleta ha salido del establecimiento');
              } catch (error) {
                console.error('Error checking out:', error);
                Alert.alert('Error', 'No se pudo registrar la salida');
              }
            };
            performCheckOut();
          },
        },
      ]
    );
  };

  // ===== FILTRADO (MISMA LÓGICA) =====
  const filteredBikes = useMemo(() => {
    return bikes.filter(bike => {
      const matchesSearch = searchQuery === '' || 
        bike.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bike.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bike.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bike.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bike.ownerDocument.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || bike.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bikes, searchQuery, statusFilter]);

  // ===== ESTADÍSTICAS (MISMA LÓGICA) =====
  const stats = {
    total: bikes.length,
    inside: bikes.filter(b => b.status === 'inside').length,
    outside: bikes.filter(b => b.status === 'outside').length,
    today: bikes.filter(b => {
      if (!b.lastCheckIn) return false;
      const today = new Date().toDateString();
      return new Date(b.lastCheckIn).toDateString() === today;
    }).length,
  };

  // ===== LOADING =====
  if (loading && bikes.length === 0) {
    return (
      <AnimatedTabScreen>
        <View style={[tw('flex-1 justify-center items-center'), { backgroundColor: colors.background }]}>
          <View style={[
            tw('w-16 h-16 rounded-2xl items-center justify-center mb-4'),
            { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
          ]}>
            <Ionicons name="bicycle" size={32} color={colors.accent} />
          </View>
          <Text style={[tw('text-base font-semibold'), { color: colors.text.primary }]}>
            Cargando bicicletas...
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
                    <Ionicons name="bicycle" size={22} color={colors.surface} />
                  </View>
                  <View>
                    <Text style={tw('text-white text-lg font-bold')}>
                      Bicicletas
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.text.light, 0.7) }]}>
                      {stats.total} registradas
                    </Text>
                  </View>
                </View>

                {/* Stats compactos */}
                <View style={tw('flex-row')}>
                  <View style={tw('items-center mx-1')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.status.success }]}>
                      {stats.inside}
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.7) }]}>
                      Dentro
                    </Text>
                  </View>
                  <View style={tw('items-center mx-1')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.status.warning }]}>
                      {stats.outside}
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.7) }]}>
                      Fuera
                    </Text>
                  </View>
                  <View style={tw('items-center mx-1')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.status.info }]}>
                      {stats.today}
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.7) }]}>
                      Hoy
                    </Text>
                  </View>
                </View>
              </View>

              {/* Buscador compacto */}
              <View style={tw('flex-row items-center mb-2')}>
                <View style={[
                  tw('flex-1 flex-row items-center rounded-xl px-3'),
                  {
                    backgroundColor: getColorWithOpacity(colors.surface, 0.15),
                    height: 44,
                  }
                ]}>
                  <Ionicons name="search" size={18} color={getColorWithOpacity(colors.surface, 0.7)} />
                  <TextInput
                    style={[tw('flex-1 text-sm ml-2'), { color: colors.surface }]}
                    placeholder="Buscar por serie, marca..."
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

                {/* Botón de escanear QR */}
                <TouchableOpacity
                  onPress={() => setScannerModalVisible(true)}
                  style={[
                    tw('w-11 h-11 rounded-xl items-center justify-center ml-2'),
                    { backgroundColor: getColorWithOpacity(colors.surface, 0.15) }
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="qr-code" size={20} color={colors.surface} />
                </TouchableOpacity>
              </View>

              {/* Filtros de estado en chips */}
              <View style={tw('flex-row')}>
                <TouchableOpacity
                  onPress={() => setStatusFilter('all')}
                  style={[
                    tw('px-3 py-2 rounded-lg mr-2'),
                    {
                      backgroundColor: statusFilter === 'all' 
                        ? colors.surface
                        : getColorWithOpacity(colors.surface, 0.15),
                    }
                  ]}
                >
                  <Text style={[
                    tw('text-xs font-bold'),
                    { color: statusFilter === 'all' ? colors.primary : colors.surface }
                  ]}>
                    Todas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStatusFilter('inside')}
                  style={[
                    tw('px-3 py-2 rounded-lg mr-2 flex-row items-center'),
                    {
                      backgroundColor: statusFilter === 'inside' 
                        ? colors.status.success
                        : getColorWithOpacity(colors.surface, 0.15),
                    }
                  ]}
                >
                  <Ionicons 
                    name="checkmark-circle" 
                    size={14} 
                    color={statusFilter === 'inside' ? colors.surface : colors.status.success} 
                    style={tw('mr-1')}
                  />
                  <Text style={[
                    tw('text-xs font-bold'),
                    { color: statusFilter === 'inside' ? colors.surface : colors.status.success }
                  ]}>
                    Dentro
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStatusFilter('outside')}
                  style={[
                    tw('px-3 py-2 rounded-lg flex-row items-center'),
                    {
                      backgroundColor: statusFilter === 'outside' 
                        ? colors.status.warning
                        : getColorWithOpacity(colors.surface, 0.15),
                    }
                  ]}
                >
                  <Ionicons 
                    name="exit" 
                    size={14} 
                    color={statusFilter === 'outside' ? colors.surface : colors.status.warning} 
                    style={tw('mr-1')}
                  />
                  <Text style={[
                    tw('text-xs font-bold'),
                    { color: statusFilter === 'outside' ? colors.surface : colors.status.warning }
                  ]}>
                    Fuera
                  </Text>
                </TouchableOpacity>
              </View>
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

            {/* ===== LISTA DE BICICLETAS ===== */}
            <ScrollView
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={tw('pb-24 px-4 pt-4')}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.accent]}
                  tintColor={colors.accent}
                />
              }
            >
              {filteredBikes.length === 0 ? (
                <View style={[
                  tw('bg-surface rounded-2xl p-8 items-center'),
                  shadows.sm
                ]}>
                  <View style={[
                    tw('w-20 h-20 rounded-2xl items-center justify-center mb-4'),
                    { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                  ]}>
                    <Ionicons name="bicycle" size={40} color={colors.accent} />
                  </View>
                  <Text style={[tw('text-base font-bold mb-2'), { color: colors.primary }]}>
                    {searchQuery || statusFilter !== 'all' ? 'Sin resultados' : 'No hay bicicletas'}
                  </Text>
                  <Text style={[tw('text-sm text-center'), { color: colors.text.secondary }]}>
                    {searchQuery || statusFilter !== 'all'
                      ? 'Prueba con otros filtros'
                      : 'Registra tu primera bicicleta'
                    }
                  </Text>
                </View>
              ) : (
                <>
                  {/* Encabezado compacto */}
                  <View style={tw('flex-row items-center justify-between mb-3 px-1')}>
                    <Text style={[tw('text-xs font-semibold uppercase'), { color: colors.text.secondary }]}>
                      {statusFilter !== 'all' ? 'Resultados' : 'Registradas'}
                    </Text>
                    <View style={[
                      tw('px-2 py-1 rounded-full'),
                      { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                    ]}>
                      <Text style={[tw('text-xs font-bold'), { color: colors.accent }]}>
                        {filteredBikes.length} {filteredBikes.length === 1 ? 'BIKE' : 'BIKES'}
                      </Text>
                    </View>
                  </View>

                  {filteredBikes.map((bike) => {
                    const isExpanded = expandedId === bike.id;
                    
                    return (
                      <TouchableWithoutFeedback
                        key={bike.id}
                        onPress={() => toggleExpand(bike.id)}
                        onLongPress={() => handleOpenDetail(bike)}
                        delayLongPress={500}
                      >
                        <View style={[
                          tw('bg-surface rounded-2xl p-4 mb-3'),
                          {
                            ...shadows.sm,
                            borderLeftWidth: 4,
                            borderLeftColor: bike.id.startsWith('TEMP_')
                              ? colors.status.info
                              : (bike.status === 'inside' ? colors.status.success : colors.status.warning),
                          }
                        ]}>
                          {/* ===== ESTADO COLAPSADO ===== */}
                          <View style={tw('flex-row items-center')}>
                            {/* Icono de estado */}
                            <View style={[
                              tw('w-12 h-12 rounded-xl items-center justify-center mr-3'),
                              { backgroundColor: bike.status === 'inside' 
                                ? colors.status.successLight 
                                : colors.status.warningLight 
                              }
                            ]}>
                              <Ionicons 
                                name={bike.status === 'inside' ? 'checkmark-circle' : 'exit'} 
                                size={24} 
                                color={bike.status === 'inside' ? colors.status.success : colors.status.warning} 
                              />
                            </View>

                            {/* Información principal */}
                            <View style={tw('flex-1')}>
                              <View style={tw('flex-row items-center mb-1')}>
                                <Text 
                                  style={[tw('text-sm font-bold flex-1 mr-2'), { color: colors.primary }]}
                                  numberOfLines={1}
                                >
                                  {bike.serialNumber}
                                </Text>
                                <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                  {bike.brand}
                                </Text>
                              </View>
                              
                              <View style={tw('flex-row items-center')}>
                                <Text
                                  style={[tw('text-xs flex-1'), { color: colors.text.secondary }]}
                                  numberOfLines={1}
                                >
                                  {bike.ownerName}
                                </Text>
                                {bike.id.startsWith('TEMP_') && (
                                  <View style={[
                                    tw('flex-row items-center px-2 py-0.5 rounded-full mx-2'),
                                    { backgroundColor: getColorWithOpacity(colors.status.info, 0.15) }
                                  ]}>
                                    <Ionicons name="cloud-upload-outline" size={10} color={colors.status.info} />
                                    <Text style={[tw('ml-1'), { fontSize: 10, fontWeight: 'bold', color: colors.status.info }]}>
                                      SYNC
                                    </Text>
                                  </View>
                                )}
                                <View style={tw('ml-2')}>
                                  <Ionicons
                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color={colors.text.secondary}
                                  />
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* ===== EXPANDIDO ===== */}
                          {isExpanded && (
                            <View style={tw('mt-4 pt-3 border-t border-light')}>
                              {/* Detalles del propietario */}
                              <View style={tw('flex-row items-center mb-3')}>
                                <View style={[
                                  tw('w-8 h-8 rounded-full items-center justify-center mr-3'),
                                  { backgroundColor: getColorWithOpacity(colors.secondary, 0.1) }
                                ]}>
                                  <Ionicons name="person" size={14} color={colors.secondary} />
                                </View>
                                <View style={tw('flex-1')}>
                                  <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                    Propietario
                                  </Text>
                                  <Text style={[tw('text-sm font-bold'), { color: colors.text.primary }]}>
                                    {bike.ownerName}
                                  </Text>
                                  <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                                    Doc: {bike.ownerDocument}
                                  </Text>
                                </View>
                              </View>

                              {/* Ubicación */}
                              {bike.location && (
                                <View style={tw('flex-row items-center mb-3')}>
                                  <Ionicons name="location" size={14} color={colors.text.secondary} />
                                  <Text style={[tw('text-xs ml-2'), { color: colors.text.secondary }]}>
                                    {bike.location}
                                  </Text>
                                </View>
                              )}

                              {/* Acciones rápidas */}
                              <View style={tw('flex-row mt-2')}>
                                {bike.status === 'outside' && (
                                  <TouchableOpacity
                                    style={[
                                      tw('flex-1 py-3 rounded-lg mr-2 flex-row items-center justify-center'),
                                      { backgroundColor: getColorWithOpacity(colors.status.success, 0.1) }
                                    ]}
                                    onPress={() => handleCheckIn(bike.id)}
                                  >
                                    <Ionicons name="enter" size={16} color={colors.status.success} />
                                    <Text style={[tw('text-xs font-bold ml-2'), { color: colors.status.success }]}>
                                      Registrar Entrada
                                    </Text>
                                  </TouchableOpacity>
                                )}

                                {bike.status === 'inside' && (
                                  <TouchableOpacity
                                    style={[
                                      tw('flex-1 py-3 rounded-lg mr-2 flex-row items-center justify-center'),
                                      { backgroundColor: getColorWithOpacity(colors.status.warning, 0.1) }
                                    ]}
                                    onPress={() => handleCheckOut(bike.id)}
                                  >
                                    <Ionicons name="exit" size={16} color={colors.status.warning} />
                                    <Text style={[tw('text-xs font-bold ml-2'), { color: colors.status.warning }]}>
                                      Registrar Salida
                                    </Text>
                                  </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                  style={[
                                    tw('py-3 px-4 rounded-lg flex-row items-center'),
                                    { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                                  ]}
                                  onPress={() => handleOpenDetail(bike)}
                                >
                                  <Ionicons name="open-outline" size={16} color={colors.accent} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      </TouchableWithoutFeedback>
                    );
                  })}
                </>
              )}
            </ScrollView>

            {/* ===== FAB ===== */}
            <TouchableOpacity
              style={[
                tw('absolute bottom-6 right-6 w-14 h-14 rounded-2xl items-center justify-center'), 
                { backgroundColor: colors.accent }, 
                shadows.xl
              ]}
              onPress={() => setRegisterModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={28} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* ===== MODALES ===== */}
        <RegisterBikeModal
          visible={registerModalVisible}
          onClose={() => setRegisterModalVisible(false)}
          onSave={handleRegisterBike}
        />

        <QRScannerModal
          visible={scannerModalVisible}
          onClose={() => setScannerModalVisible(false)}
          onBikeScanned={handleBikeScanned}
          bikes={bikes}
        />

        <BikeDetailModal
          visible={detailModalVisible}
          bike={selectedBike}
          history={history}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedBike(null);
          }}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
      </>
    </AnimatedTabScreen>
  );
}