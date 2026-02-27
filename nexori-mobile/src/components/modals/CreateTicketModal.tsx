import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';
import type { TicketType, TicketPriority, CreateTicketData } from '../../types/tickets';

const { colors, shadows } = designTokens;

interface CreateTicketModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (ticket: CreateTicketData) => void;
}

export default function CreateTicketModal({ visible, onClose, onSave }: CreateTicketModalProps) {
  const [type, setType] = useState<TicketType>('bug');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const ticketTypes = [
    { 
      value: 'bug' as const, 
      label: 'Error/Bug', 
      icon: 'bug' as const, 
      color: colors.status.error,
      description: 'Reportar un error o fallo en la aplicación'
    },
    { 
      value: 'feature' as const, 
      label: 'Nueva Función', 
      icon: 'bulb' as const, 
      color: colors.accent,
      description: 'Sugerir una nueva característica'
    },
    { 
      value: 'feedback' as const, 
      label: 'Retroalimentación', 
      icon: 'chatbubbles' as const, 
      color: colors.status.info,
      description: 'Compartir opiniones y experiencias'
    },
    { 
      value: 'question' as const, 
      label: 'Pregunta', 
      icon: 'help-circle' as const, 
      color: colors.status.warning,
      description: 'Hacer una consulta sobre la app'
    },
    { 
      value: 'other' as const, 
      label: 'Otro', 
      icon: 'ellipsis-horizontal' as const, 
      color: colors.secondary,
      description: 'Otro tipo de solicitud'
    },
  ];

  const priorities = [
    { 
      value: 'low' as const, 
      label: 'Baja', 
      color: colors.status.success, 
      icon: 'arrow-down' as const,
      bgColor: getColorWithOpacity(colors.status.success, 0.15)
    },
    { 
      value: 'medium' as const, 
      label: 'Media', 
      color: colors.status.info, 
      icon: 'remove' as const,
      bgColor: getColorWithOpacity(colors.status.info, 0.15)
    },
    { 
      value: 'high' as const, 
      label: 'Alta', 
      color: colors.status.warning, 
      icon: 'arrow-up' as const,
      bgColor: getColorWithOpacity(colors.status.warning, 0.15)
    },
    { 
      value: 'urgent' as const, 
      label: 'Urgente', 
      color: colors.status.error, 
      icon: 'alert' as const,
      bgColor: getColorWithOpacity(colors.status.error, 0.15)
    },
  ];

  const selectedType = ticketTypes.find(t => t.value === type);
  const selectedPriority = priorities.find(p => p.value === priority);

  const handleSave = () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Por favor ingresa un asunto');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return;
    }

    onSave({
      type,
      priority,
      subject: subject.trim(),
      description: description.trim(),
    });

    // Reset form
    setType('bug');
    setPriority('medium');
    setSubject('');
    setDescription('');
  };

  const handleClose = () => {
    // Reset form
    setType('bug');
    setPriority('medium');
    setSubject('');
    setDescription('');
    onClose();
  };

return (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={false}
    onRequestClose={onClose}
    statusBarTranslucent={false}
  >
    {/* SOLUCIÓN: SafeAreaView como PRIMER contenedor */}
    <SafeAreaView style={[tw('flex-1'), { backgroundColor: colors.background }]}>
      <View style={tw('flex-1')}>
        {/* Header */}
        <View style={[tw('flex-row items-center justify-between px-6 py-5 bg-surface'), shadows.sm]}>
              <View style={tw('flex-row items-center flex-1')}>
                <View style={[
                  tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                  { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }
                ]}>
                  <Ionicons name="ticket" size={22} color={colors.accent} />
                </View>
                <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                  Nuevo Ticket
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
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
              {/* Tipo de Ticket */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-sm font-bold mb-3'), { color: colors.primary }]}>
                  Tipo de Solicitud *
                </Text>
                <View style={tw('gap-3')}>
                  {ticketTypes.map((ticketType) => (
                    <TouchableOpacity
                      key={ticketType.value}
                      onPress={() => setType(ticketType.value)}
                      activeOpacity={0.7}
                      style={[
                        tw('rounded-xl p-4 mb-2'),
                        {
                          backgroundColor: type === ticketType.value 
                            ? getColorWithOpacity(ticketType.color, 0.1)
                            : colors.surface,
                          borderWidth: 2,
                          borderColor: type === ticketType.value ? ticketType.color : colors.border.light,
                        }
                      ]}
                    >
                      <View style={tw('flex-row items-center')}>
                        <View style={[
                          tw('w-12 h-12 rounded-xl items-center justify-center mr-3'),
                          { backgroundColor: getColorWithOpacity(ticketType.color, 0.15) }
                        ]}>
                          <Ionicons name={ticketType.icon} size={24} color={ticketType.color} />
                        </View>
                        <View style={tw('flex-1')}>
                          <Text style={[
                            tw('text-base font-bold mb-1'),
                            { color: type === ticketType.value ? ticketType.color : colors.primary }
                          ]}>
                            {ticketType.label}
                          </Text>
                          <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                            {ticketType.description}
                          </Text>
                        </View>
                        {type === ticketType.value && (
                          <Ionicons name="checkmark-circle" size={24} color={ticketType.color} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Prioridad */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-sm font-bold mb-3'), { color: colors.primary }]}>
                  Prioridad *
                </Text>
                <View style={tw('flex-row gap-2')}>
                  {priorities.map((p, index) => (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setPriority(p.value)}
                      activeOpacity={0.7}
                      style={[
                        tw('flex-1 rounded-xl px-4 py-4 items-center'),
                        index < priorities.length - 1 && tw('mr-1'),
                        {
                          backgroundColor: priority === p.value ? p.bgColor : colors.surface,
                          borderWidth: 2,
                          borderColor: priority === p.value ? p.color : colors.border.light,
                        }
                      ]}
                    >
                      <View style={tw('items-center')}>
                        <View style={[
                          tw('w-12 h-12 rounded-xl items-center justify-center mb-2'),
                          { backgroundColor: p.bgColor }
                        ]}>
                          <Ionicons name={p.icon} size={20} color={p.color} />
                        </View>
                        <Text style={[
                          tw('text-xs font-bold'),
                          { color: priority === p.value ? p.color : colors.text.secondary }
                        ]}>
                          {p.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Asunto */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                  Asunto *
                </Text>
                <View style={[
                  tw('flex-row items-center rounded-xl px-4'),
                  {
                    backgroundColor: colors.surface,
                    height: 56,
                    borderWidth: 1,
                    borderColor: colors.border.light,
                  }
                ]}>
                  <TextInput
                    style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                    placeholder="Ej: Error al registrar bicicleta"
                    placeholderTextColor={colors.text.disabled}
                    value={subject}
                    onChangeText={setSubject}
                    maxLength={100}
                  />
                </View>
                <Text style={[tw('text-xs mt-1 ml-1'), { color: colors.text.secondary }]}>
                  {subject.length}/100 caracteres
                </Text>
              </View>

              {/* Descripción */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                  Descripción *
                </Text>
                <View style={[
                  tw('rounded-xl px-4 py-3'),
                  {
                    backgroundColor: colors.surface,
                    minHeight: 150,
                    borderWidth: 1,
                    borderColor: colors.border.light,
                  }
                ]}>
                  <TextInput
                    style={[
                      tw('text-base'),
                      {
                        color: colors.text.primary,
                        minHeight: 130,
                        textAlignVertical: 'top',
                      }
                    ]}
                    placeholder="Describe detalladamente tu solicitud, error o sugerencia..."
                    placeholderTextColor={colors.text.disabled}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={1000}
                  />
                </View>
                <Text style={[tw('text-xs mt-1 ml-1'), { color: colors.text.secondary }]}>
                  {description.length}/1000 caracteres
                </Text>
              </View>

              {/* Info adicional */}
              <View style={[
                tw('p-4 rounded-2xl mb-4'),
                { 
                  backgroundColor: getColorWithOpacity(selectedType?.color || colors.accent, 0.08), 
                  borderWidth: 1, 
                  borderColor: getColorWithOpacity(selectedType?.color || colors.accent, 0.2) 
                }
              ]}>
                <View style={tw('flex-row items-center mb-2')}>
                  <Ionicons name="information-circle" size={18} color={selectedType?.color || colors.accent} style={tw('mr-2')} />
                  <Text style={[tw('text-sm font-bold'), { color: colors.primary }]}>
                    ¿Cómo funciona?
                  </Text>
                </View>
                <Text style={[tw('text-xs mb-2'), { color: colors.text.secondary, lineHeight: 18 }]}>
                  • Tu ticket será registrado y revisado por el equipo de soporte
                </Text>
                <Text style={[tw('text-xs mb-2'), { color: colors.text.secondary, lineHeight: 18 }]}>
                  • Recibirás actualizaciones sobre el estado de tu solicitud
                </Text>
                <Text style={[tw('text-xs'), { color: colors.text.secondary, lineHeight: 18 }]}>
                  • El tiempo de respuesta depende de la prioridad seleccionada
                </Text>
              </View>
            </ScrollView>

            {/* Footer con botones */}
            <View style={[tw('px-6 py-4 bg-surface'), shadows.lg, { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
              <View style={tw('flex-row')}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    tw('flex-1 rounded-xl items-center justify-center mr-2 py-4'),
                    { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[tw('text-base font-bold'), { color: colors.text.secondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  style={[
                    tw('flex-1 rounded-xl items-center justify-center ml-2 py-4'),
                    { backgroundColor: selectedType?.color || colors.accent }
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={tw('flex-row items-center')}>
                    <Ionicons name="send" size={20} color={colors.surface} style={tw('mr-2')} />
                    <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                      Enviar Ticket
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
    </Modal>
  );
}