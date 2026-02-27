import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';
import type { Ticket } from '../../types/tickets';

const { colors, shadows } = designTokens;

interface TicketDetailModalProps {
  visible: boolean;
  ticket: Ticket | null;
  onClose: () => void;
}

export default function TicketDetailModal({ visible, ticket, onClose }: TicketDetailModalProps) {
  if (!ticket) return null;

  const getTypeConfig = (type: string) => {
    const configs = {
      bug: { label: 'Error/Bug', icon: 'bug' as const, color: colors.status.error },
      feature: { label: 'Nueva Función', icon: 'bulb' as const, color: colors.accent },
      feedback: { label: 'Retroalimentación', icon: 'chatbubbles' as const, color: colors.status.info },
      question: { label: 'Pregunta', icon: 'help-circle' as const, color: colors.status.warning },
      other: { label: 'Otro', icon: 'ellipsis-horizontal' as const, color: colors.secondary },
    };
    return configs[type as keyof typeof configs];
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { label: 'BAJA', color: colors.status.success, icon: 'arrow-down' as const },
      medium: { label: 'MEDIA', color: colors.status.info, icon: 'remove' as const },
      high: { label: 'ALTA', color: colors.status.warning, icon: 'arrow-up' as const },
      urgent: { label: 'URGENTE', color: colors.status.error, icon: 'alert' as const },
    };
    return configs[priority as keyof typeof configs];
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      open: {
        label: 'ABIERTO',
        color: colors.status.info,
        bgColor: colors.status.infoLight,
        icon: 'radio-button-on' as const,
      },
      in_progress: {
        label: 'EN PROGRESO',
        color: colors.status.warning,
        bgColor: colors.status.warningLight,
        icon: 'time' as const,
      },
      resolved: {
        label: 'RESUELTO',
        color: colors.status.success,
        bgColor: colors.status.successLight,
        icon: 'checkmark-done' as const,
      },
      closed: {
        label: 'CERRADO',
        color: colors.text.secondary,
        bgColor: getColorWithOpacity(colors.text.secondary, 0.15),
        icon: 'close-circle' as const,
      },
    };
    return configs[status as keyof typeof configs];
  };

  const typeConfig = getTypeConfig(ticket.type);
  const priorityConfig = getPriorityConfig(ticket.priority);
  const statusConfig = getStatusConfig(ticket.status);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <View style={[tw('flex-1'), { backgroundColor: colors.background }]}>
        <SafeAreaView style={tw('flex-1')}>
          <View style={tw('flex-1')}>
            {/* Header */}
            <View style={[tw('flex-row items-center justify-between px-6 py-5 bg-surface'), shadows.sm]}>
              <View style={tw('flex-row items-center flex-1')}>
                <View style={[
                  tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                  { backgroundColor: statusConfig.bgColor }
                ]}>
                  <Ionicons name={statusConfig.icon} size={22} color={statusConfig.color} />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                    Ticket #{ticket.id.slice(0, 8)}
                  </Text>
                  <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                    {typeConfig.label}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  tw('w-10 h-10 rounded-xl items-center justify-center'),
                  { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw('px-6 py-6')}
            >
              {/* Badges de estado, tipo y prioridad */}
              <View style={tw('flex-row flex-wrap mb-5')}>
                {/* Estado */}
                <View style={[tw('px-3 py-2 rounded-lg mr-2 mb-2'), { backgroundColor: statusConfig.bgColor }]}>
                  <Text style={[tw('text-xs font-bold'), { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>

                {/* Tipo */}
                <View style={[
                  tw('px-3 py-2 rounded-lg flex-row items-center mr-2 mb-2'), 
                  { backgroundColor: getColorWithOpacity(typeConfig.color, 0.15) }
                ]}>
                  <Ionicons name={typeConfig.icon} size={12} color={typeConfig.color} style={tw('mr-1')} />
                  <Text style={[tw('text-xs font-bold'), { color: typeConfig.color }]}>
                    {typeConfig.label}
                  </Text>
                </View>

                {/* Prioridad */}
                <View style={[
                  tw('px-3 py-2 rounded-lg flex-row items-center mb-2'), 
                  { backgroundColor: getColorWithOpacity(priorityConfig.color, 0.15) }
                ]}>
                  <Ionicons name={priorityConfig.icon} size={12} color={priorityConfig.color} style={tw('mr-1')} />
                  <Text style={[tw('text-xs font-bold'), { color: priorityConfig.color }]}>
                    {priorityConfig.label}
                  </Text>
                </View>
              </View>

              {/* Asunto */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Asunto
                </Text>
                <Text style={[tw('text-xl font-bold'), { color: colors.primary }]}>
                  {ticket.subject}
                </Text>
              </View>

              {/* Descripción */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Descripción
                </Text>
                <View style={[
                  tw('px-4 py-3 rounded-xl'),
                  { backgroundColor: getColorWithOpacity(colors.backgroundAlt, 0.3) }
                ]}>
                  <Text style={[tw('text-sm'), { color: colors.text.primary, lineHeight: 20 }]}>
                    {ticket.description}
                  </Text>
                </View>
              </View>

              {/* Información del ticket */}
              <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Información del Ticket
                </Text>

                {/* Creado por */}
                <View style={tw('flex-row items-center mb-3')}>
                  <View style={[
                    tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(colors.secondary, 0.15) }
                  ]}>
                    <Ionicons name="person" size={18} color={colors.secondary} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                      Creado por
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {ticket.createdBy}
                    </Text>
                  </View>
                </View>

                {/* Fecha de creación */}
                <View style={tw('flex-row items-center mb-3')}>
                  <View style={[
                    tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }
                  ]}>
                    <Ionicons name="calendar" size={18} color={colors.accent} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                      Fecha de creación
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {new Date(ticket.createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                {/* Última actualización */}
                <View style={tw('flex-row items-center')}>
                  <View style={[
                    tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(colors.status.info, 0.15) }
                  ]}>
                    <Ionicons name="time" size={18} color={colors.status.info} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                      Última actualización
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {new Date(ticket.updatedAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Comentarios */}
              {ticket.comments && ticket.comments.length > 0 && (
                <View style={[tw('bg-surface rounded-2xl p-5'), shadows.sm]}>
                  <View style={tw('flex-row items-center justify-between mb-4')}>
                    <Text style={[tw('text-xs font-bold uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Comentarios ({ticket.comments.length})
                    </Text>
                  </View>

                  {ticket.comments.map((comment, index) => (
                    <View
                      key={comment.id}
                      style={[
                        tw('mb-3 p-3 rounded-xl'),
                        {
                          backgroundColor: comment.isStaff 
                            ? getColorWithOpacity(colors.accent, 0.08)
                            : getColorWithOpacity(colors.backgroundAlt, 0.3),
                          borderLeftWidth: 3,
                          borderLeftColor: comment.isStaff ? colors.accent : colors.border.light,
                        },
                        index === ticket.comments!.length - 1 && tw('mb-0')
                      ]}
                    >
                      <View style={tw('flex-row items-center mb-2')}>
                        <View style={[
                          tw('w-6 h-6 rounded-full items-center justify-center mr-2'),
                          { backgroundColor: comment.isStaff ? colors.accent : colors.secondary }
                        ]}>
                          <Ionicons 
                            name={comment.isStaff ? 'shield-checkmark' : 'person'} 
                            size={12} 
                            color={colors.surface} 
                          />
                        </View>
                        <Text style={[tw('text-xs font-bold flex-1'), { color: colors.primary }]}>
                          {comment.author}
                          {comment.isStaff && (
                            <Text style={[tw('text-xs font-normal'), { color: colors.accent }]}>
                              {' • Soporte'}
                            </Text>
                          )}
                        </Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                          {new Date(comment.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                      <Text style={[tw('text-sm'), { color: colors.text.primary, lineHeight: 18 }]}>
                        {comment.message}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={[tw('px-6 py-4 bg-surface'), shadows.lg, { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  tw('rounded-xl items-center justify-center py-4'),
                  { backgroundColor: colors.accent }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}