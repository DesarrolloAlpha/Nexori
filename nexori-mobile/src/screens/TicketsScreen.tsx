import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import type { Ticket, TicketType, TicketStatus, TicketStats } from '../types/tickets';
import CreateTicketModal from '../components/modals/CreateTicketModal';
import TicketDetailModal from '../components/modals/TicketDetailModal';
import ticketService from '../services/ticket.service';

const { colors, shadows } = designTokens;

export default function TicketsScreen() {
  // Estados
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    urgent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TicketType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');

  // Configuraciones
  const typeConfigs = {
    bug: { label: 'Errores', icon: 'bug' as const, color: colors.status.error },
    feature: { label: 'Funciones', icon: 'bulb' as const, color: colors.accent },
    feedback: { label: 'Feedback', icon: 'chatbubbles' as const, color: colors.status.info },
    question: { label: 'Preguntas', icon: 'help-circle' as const, color: colors.status.warning },
    other: { label: 'Otros', icon: 'ellipsis-horizontal' as const, color: colors.secondary },
  };

  const statusConfigs = {
    open: { label: 'Abiertos', color: colors.status.info, bgColor: colors.status.infoLight, icon: 'radio-button-on' as const },
    in_progress: { label: 'En Progreso', color: colors.status.warning, bgColor: colors.status.warningLight, icon: 'time' as const },
    resolved: { label: 'Resueltos', color: colors.status.success, bgColor: colors.status.successLight, icon: 'checkmark-done' as const },
    closed: { label: 'Cerrados', color: colors.text.secondary, bgColor: getColorWithOpacity(colors.text.secondary, 0.15), icon: 'close-circle' as const },
  };

  const priorityConfigs = {
    low: { label: 'Baja', color: colors.status.success, icon: 'arrow-down' as const },
    medium: { label: 'Media', color: colors.status.info, icon: 'remove' as const },
    high: { label: 'Alta', color: colors.status.warning, icon: 'arrow-up' as const },
    urgent: { label: 'Urgente', color: colors.status.error, icon: 'alert' as const },
  };

  // Cargar tickets
  const loadTickets = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [ticketsResponse, statsResponse] = await Promise.all([
        ticketService.getAll({
          search: searchQuery,
          type: filterType !== 'all' ? filterType : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
        }),
        ticketService.getStatistics(),
      ]);

      if (ticketsResponse.success && ticketsResponse.data) {
        setTickets(ticketsResponse.data.tickets || []);
      } else {
        Alert.alert('Error', ticketsResponse.error || 'No se pudieron cargar los tickets');
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filterType, filterStatus]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTickets(false);
  }, [loadTickets]);

  // Crear ticket
  const handleCreateTicket = async (ticketData: any) => {
    try {
      const response = await ticketService.create(ticketData);

      if (response.success) {
        setShowCreateModal(false);
        Alert.alert(
          '¡Ticket Creado!',
          'Tu ticket ha sido registrado exitosamente. Recibirás actualizaciones sobre su estado.',
          [{ 
            text: 'Entendido',
            onPress: () => loadTickets(false)
          }]
        );
      } else {
        Alert.alert('Error', response.error || 'No se pudo crear el ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Ocurrió un error al crear el ticket');
    }
  };

  // Abrir detalle
  const handleTicketPress = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
    loadTickets(false);
  };

  const activeFiltersCount = 
    (filterType !== 'all' ? 1 : 0) + 
    (filterStatus !== 'all' ? 1 : 0);

  if (loading) {
    return (
      <View style={[tw('flex-1 items-center justify-center'), { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[tw('mt-4 text-base'), { color: colors.text.secondary }]}>
          Cargando tickets...
        </Text>
      </View>
    );
  }

  return (
    <View style={[tw('flex-1'), { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <SafeAreaView style={tw('flex-1')} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={[tw('px-6 pt-6 pb-4 bg-surface'), shadows.sm]}>
          <View style={tw('flex-row items-center justify-between mb-4')}>
            <View>
              <Text style={[tw('text-2xl font-bold'), { color: colors.primary }]}>
                Soporte y Tickets
              </Text>
              <Text style={[tw('text-sm mt-1'), { color: colors.text.secondary }]}>
                {stats.total} tickets registrados
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={[
                tw('w-14 h-14 rounded-2xl items-center justify-center'),
                { backgroundColor: colors.accent }
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color={colors.surface} />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw('pr-4')} // Padding derecho para la última card
          >
            <View style={[
              tw('px-4 py-3 rounded-xl mr-3'),  // 👈 AÑADE 'mr-3' AQUÍ
              { backgroundColor: colors.status.infoLight, minWidth: 100 }
            ]}>
              <Text style={[tw('text-2xl font-bold'), { color: colors.status.info }]}>
                {stats.open}
              </Text>
              <Text style={[tw('text-xs font-semibold'), { color: colors.status.info }]}>
                ABIERTOS
              </Text>
            </View>

            <View style={[
              tw('px-4 py-3 rounded-xl mr-3'),  // 👈 AÑADE 'mr-3' AQUÍ
              { backgroundColor: colors.status.warningLight, minWidth: 100 }
            ]}>
              <Text style={[tw('text-2xl font-bold'), { color: colors.status.warning }]}>
                {stats.inProgress}
              </Text>
              <Text style={[tw('text-xs font-semibold'), { color: colors.status.warning }]}>
                EN PROGRESO
              </Text>
            </View>

            <View style={[
              tw('px-4 py-3 rounded-xl mr-3'),  // 👈 AÑADE 'mr-3' AQUÍ
              { backgroundColor: colors.status.successLight, minWidth: 100 }
            ]}>
              <Text style={[tw('text-2xl font-bold'), { color: colors.status.success }]}>
                {stats.resolved}
              </Text>
              <Text style={[tw('text-xs font-semibold'), { color: colors.status.success }]}>
                RESUELTOS
              </Text>
            </View>

            {stats.urgent > 0 && (
              <View style={[
                tw('px-4 py-3 rounded-xl'), // 👈 A LA ÚLTIMA NO LE PONGAS 'mr-3'
                { backgroundColor: colors.status.errorLight, minWidth: 100 }
              ]}>
                <Text style={[tw('text-2xl font-bold'), { color: colors.status.error }]}>
                  {stats.urgent}
                </Text>
                <Text style={[tw('text-xs font-semibold'), { color: colors.status.error }]}>
                  URGENTES
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Search and Filters */}
        <View style={tw('px-6 py-4')}>
          {/* Search Bar */}
          <View style={[
            tw('flex-row items-center rounded-xl px-4 mb-3'),
            {
              backgroundColor: colors.surface,
              height: 50,
              borderWidth: 1,
              borderColor: colors.border.light,
            }
          ]}>
            <Ionicons name="search" size={20} color={colors.text.secondary} style={tw('mr-3')} />
            <TextInput
              style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
              placeholder="Buscar por asunto, descripción o ID..."
              placeholderTextColor={colors.text.disabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => loadTickets(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                loadTickets(false);
              }}>
                <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <View style={tw('gap-2')}>
            {/* Tipo chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw('gap-2')}
            >
              <TouchableOpacity
                onPress={() => setFilterType('all')}
                style={[
                  tw('px-3 py-2 rounded-lg'),
                  {
                    backgroundColor: filterType === 'all' ? colors.accent : colors.surface,
                    borderWidth: 1,
                    borderColor: filterType === 'all' ? colors.accent : colors.border.light,
                  }
                ]}
              >
                <Text style={[tw('text-xs font-bold'), { color: filterType === 'all' ? colors.surface : colors.text.secondary }]}>
                  Todos
                </Text>
              </TouchableOpacity>
              {(Object.entries(typeConfigs) as [TicketType, { label: string; icon: any; color: string }][]).map(([type, config]) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setFilterType(type)}
                  style={[
                    tw('px-3 py-2 rounded-lg flex-row items-center'),
                    {
                      backgroundColor: filterType === type ? config.color : colors.surface,
                      borderWidth: 1,
                      borderColor: filterType === type ? config.color : colors.border.light,
                    }
                  ]}
                >
                  <Ionicons name={config.icon} size={12} color={filterType === type ? colors.surface : config.color} style={tw('mr-1')} />
                  <Text style={[tw('text-xs font-bold'), { color: filterType === type ? colors.surface : colors.text.secondary }]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Estado chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw('gap-2')}
            >
              <TouchableOpacity
                onPress={() => setFilterStatus('all')}
                style={[
                  tw('px-3 py-2 rounded-lg'),
                  {
                    backgroundColor: filterStatus === 'all' ? colors.accent : colors.surface,
                    borderWidth: 1,
                    borderColor: filterStatus === 'all' ? colors.accent : colors.border.light,
                  }
                ]}
              >
                <Text style={[tw('text-xs font-bold'), { color: filterStatus === 'all' ? colors.surface : colors.text.secondary }]}>
                  Todos
                </Text>
              </TouchableOpacity>
              {(Object.entries(statusConfigs) as [TicketStatus, { label: string; color: string; bgColor: string; icon: any }][]).map(([status, config]) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setFilterStatus(status)}
                  style={[
                    tw('px-3 py-2 rounded-lg flex-row items-center'),
                    {
                      backgroundColor: filterStatus === status ? config.color : colors.surface,
                      borderWidth: 1,
                      borderColor: filterStatus === status ? config.color : colors.border.light,
                    }
                  ]}
                >
                  <Ionicons name={config.icon} size={12} color={filterStatus === status ? colors.surface : config.color} style={tw('mr-1')} />
                  <Text style={[tw('text-xs font-bold'), { color: filterStatus === status ? colors.surface : colors.text.secondary }]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Acciones */}
            <View style={tw('flex-row items-center')}>
              <TouchableOpacity
                onPress={() => loadTickets(false)}
                style={[
                  tw('px-3 py-2 rounded-lg flex-row items-center'),
                  { backgroundColor: colors.accent }
                ]}
              >
                <Ionicons name="search" size={14} color={colors.surface} style={tw('mr-1')} />
                <Text style={[tw('text-xs font-bold'), { color: colors.surface }]}>
                  Buscar
                </Text>
              </TouchableOpacity>
              {activeFiltersCount > 0 && (
                <TouchableOpacity
                  onPress={clearFilters}
                  style={[
                    tw('ml-2 px-3 py-2 rounded-lg'),
                    { backgroundColor: getColorWithOpacity(colors.status.error, 0.1) }
                  ]}
                >
                  <Text style={[tw('text-xs font-bold'), { color: colors.status.error }]}>
                    Limpiar ({activeFiltersCount})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Tickets List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw('px-6 pb-6')}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        >
          {tickets.length === 0 ? (
            <View style={tw('items-center justify-center py-12')}>
              <View style={[
                tw('w-20 h-20 rounded-full items-center justify-center mb-4'),
                { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }
              ]}>
                <Ionicons name="ticket-outline" size={40} color={colors.text.secondary} />
              </View>
              <Text style={[tw('text-lg font-bold mb-2'), { color: colors.primary }]}>
                {searchQuery || activeFiltersCount > 0 ? 'Sin resultados' : 'No hay tickets'}
              </Text>
              <Text style={[tw('text-sm text-center'), { color: colors.text.secondary }]}>
                {searchQuery || activeFiltersCount > 0 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Crea tu primer ticket para reportar errores o sugerencias'
                }
              </Text>
              {!searchQuery && activeFiltersCount === 0 && (
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  style={[
                    tw('mt-4 px-6 py-3 rounded-xl'),
                    { backgroundColor: colors.accent }
                  ]}
                >
                  <Text style={[tw('text-sm font-bold'), { color: colors.surface }]}>
                    Crear Primer Ticket
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            tickets.map((ticket) => {
              const typeConfig = typeConfigs[ticket.type];
              const statusConfig = statusConfigs[ticket.status];
              const priorityConfig = priorityConfigs[ticket.priority];

              return (
                <TouchableOpacity
                  key={ticket.id}
                  onPress={() => handleTicketPress(ticket)}
                  activeOpacity={0.7}
                  style={[
                    tw('rounded-2xl p-4 mb-3'),
                    { backgroundColor: colors.surface },
                    shadows.sm
                  ]}
                >
                  {/* Header con badges */}
                  <View style={tw('flex-row items-center justify-between mb-3')}>
                    <View style={tw('flex-row items-center flex-1')}>
                      <View style={[tw('px-2 py-1 rounded-md mr-2'), { backgroundColor: statusConfig.bgColor }]}>
                        <Text style={[tw('text-xs font-bold'), { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                      <View style={[
                        tw('px-2 py-1 rounded-md flex-row items-center'),
                        { backgroundColor: getColorWithOpacity(priorityConfig.color, 0.15) }
                      ]}>
                        <Ionicons name={priorityConfig.icon} size={10} color={priorityConfig.color} style={tw('mr-1')} />
                        <Text style={[tw('text-xs font-bold'), { color: priorityConfig.color }]}>
                          {priorityConfig.label}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      tw('w-8 h-8 rounded-lg items-center justify-center'),
                      { backgroundColor: getColorWithOpacity(typeConfig.color, 0.15) }
                    ]}>
                      <Ionicons name={typeConfig.icon} size={16} color={typeConfig.color} />
                    </View>
                  </View>

                  {/* Subject */}
                  <Text style={[tw('text-base font-bold mb-2'), { color: colors.primary }]}>
                    {ticket.subject}
                  </Text>

                  {/* Description Preview */}
                  <Text 
                    style={[tw('text-sm mb-3'), { color: colors.text.secondary }]} 
                    numberOfLines={2}
                  >
                    {ticket.description}
                  </Text>

                  {/* Footer */}
                  <View style={tw('flex-row items-center justify-between')}>
                    <View style={tw('flex-row items-center')}>
                      <Ionicons name="person" size={12} color={colors.text.secondary} style={tw('mr-1')} />
                      <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                        {ticket.createdBy}
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center')}>
                      <Ionicons name="calendar-outline" size={12} color={colors.text.secondary} style={tw('mr-1')} />
                      <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                        {new Date(ticket.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Comments indicator */}
                  {ticket.comments && ticket.comments.length > 0 && (
                    <View style={[
                      tw('flex-row items-center mt-3 pt-3'),
                      { borderTopWidth: 1, borderTopColor: colors.border.light }
                    ]}>
                      <Ionicons name="chatbubble" size={12} color={colors.accent} style={tw('mr-1')} />
                      <Text style={[tw('text-xs font-semibold'), { color: colors.accent }]}>
                        {ticket.comments.length} {ticket.comments.length === 1 ? 'comentario' : 'comentarios'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      <CreateTicketModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateTicket}
      />

      <TicketDetailModal
        visible={showDetailModal}
        ticket={selectedTicket}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTicket(null);
          loadTickets(false);
        }}
      />
    </View>
  );
}