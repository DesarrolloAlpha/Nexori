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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';
import ImagePicker from '../ImagePicker.component';
import minuteService from '../../services/minute.service';
import { offlineQueue } from '../../services/offlineQueue.service';

const { colors, shadows } = designTokens;

type Category = 'anotacion' | 'hurto' | 'novedad_vehiculo' | 'objetos_abandonados' | 'novedad' | 'observacion' | 'recomendacion' | 'nueva_marca' | 'incidente' | 'emergencia' | 'mantenimiento' | 'persona_sospechosa';

interface CreateMinuteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function CreateMinuteModal({ visible, onClose, onSave }: CreateMinuteModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState<Category>('novedad');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const priorities = [
    { 
      value: 'high' as const, 
      label: 'Alta', 
      color: colors.status.error, 
      icon: 'warning' as const,
      bgColor: getColorWithOpacity(colors.status.error, 0.15)
    },
    { 
      value: 'medium' as const, 
      label: 'Media', 
      color: colors.status.warning, 
      icon: 'alert-circle' as const,
      bgColor: getColorWithOpacity(colors.status.warning, 0.15)
    },
    { 
      value: 'low' as const, 
      label: 'Baja', 
      color: colors.status.success, 
      icon: 'information-circle' as const,
      bgColor: getColorWithOpacity(colors.status.success, 0.15)
    },
  ];

  const categories = [
    { value: 'anotacion' as const, label: 'Anotación', icon: 'document-text' as const, color: colors.status.info },
    { value: 'hurto' as const, label: 'Hurto', icon: 'alert-circle' as const, color: colors.status.error },
    { value: 'novedad_vehiculo' as const, label: 'Novedad en Vehículo', icon: 'car' as const, color: colors.status.warning },
    { value: 'objetos_abandonados' as const, label: 'Objetos Abandonados', icon: 'cube' as const, color: colors.status.info },
    { value: 'novedad' as const, label: 'Novedad', icon: 'megaphone' as const, color: colors.accent },
    { value: 'observacion' as const, label: 'Observación', icon: 'eye' as const, color: colors.status.info },
    { value: 'recomendacion' as const, label: 'Recomendación', icon: 'bulb' as const, color: colors.status.success },
    { value: 'nueva_marca' as const, label: 'Nueva Marca', icon: 'star' as const, color: colors.accent },
    { value: 'incidente' as const, label: 'Incidente', icon: 'warning' as const, color: colors.status.warning },
    { value: 'emergencia' as const, label: 'Emergencia', icon: 'alert' as const, color: colors.status.error },
    { value: 'mantenimiento' as const, label: 'Mantenimiento', icon: 'construct' as const, color: colors.secondary },
    { value: 'persona_sospechosa' as const, label: 'Persona Sospechosa', icon: 'person-circle' as const, color: colors.status.error },
  ];

  const selectedCategoryInfo = categories.find(c => c.value === category);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return;
    }

    try {
      setLoading(true);

      // ── Sin conexión: encolar y cerrar ──────────────────────────────────
      if (!offlineQueue.isOnline) {
        await offlineQueue.enqueue({
          entity: 'minute',
          op: 'create',
          payload: {
            title: title.trim(),
            description: description.trim(),
            type: category,
            priority,
          },
          tempId: `TEMP_${Date.now()}`,
        });

        setTitle('');
        setDescription('');
        setPriority('medium');
        setCategory('novedad');
        setCategoryExpanded(false);
        setImages([]);

        onSave();

        Alert.alert(
          'Guardado sin conexión',
          'La minuta se sincronizará automáticamente cuando se restaure la conexión.',
          [{ text: 'Entendido' }]
        );
        return;
      }

      // Crear la minuta una sola vez
      const result = await minuteService.create({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
      });

      if (!result.success || !result.data) {
        Alert.alert('Error', result.error || 'Error al crear la minuta');
        return;
      }

      const minuteId = result.data.id;

      // Subir imágenes si las hay (al mismo ID de minuta)
      if (images.length > 0) {
        for (const imageUri of images) {
          await minuteService.uploadImage(minuteId, imageUri);
        }
      }

      Alert.alert('Éxito', 'Minuta creada exitosamente');

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('novedad');
      setCategoryExpanded(false);
      setImages([]);

      // Notificar al padre (que cierre el modal)
      onSave();
    } catch (error) {
      console.error('Error al crear minuta:', error);
      Alert.alert('Error', 'No se pudo crear la minuta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('novedad');
    setCategoryExpanded(false);
    setImages([]);
    onClose();
  };

  const handleSelectCategory = (cat: Category) => {
    setCategory(cat);
    setCategoryExpanded(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
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
                  { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }
                ]}>
                  <Ionicons name="document-text" size={22} color={colors.accent} />
                </View>
                <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                  Nueva Minuta
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={[
                  tw('w-10 h-10 rounded-xl items-center justify-center'),
                  { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }
                ]}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw('px-6 py-6')}
              keyboardShouldPersistTaps="handled"
            >
              {/* Categoría con Acordeón */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-sm font-bold mb-3'), { color: colors.primary }]}>
                  Categoría *
                </Text>

                {/* Header del acordeón - Categoría seleccionada */}
                <TouchableOpacity
                  onPress={() => setCategoryExpanded(!categoryExpanded)}
                  activeOpacity={0.7}
                  disabled={loading}
                  style={[
                    tw('flex-row items-center justify-between rounded-xl p-4'),
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 2,
                      borderColor: categoryExpanded ? colors.accent : colors.border.light,
                    }
                  ]}
                >
                  <View style={tw('flex-row items-center flex-1')}>
                    <View style={[
                      tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                      { backgroundColor: getColorWithOpacity(selectedCategoryInfo?.color || colors.accent, 0.15) }
                    ]}>
                      <Ionicons 
                        name={selectedCategoryInfo?.icon || 'list'} 
                        size={20} 
                        color={selectedCategoryInfo?.color || colors.accent} 
                      />
                    </View>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {selectedCategoryInfo?.label}
                    </Text>
                  </View>
                  <Ionicons
                    name={categoryExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>

                {/* Contenido desplegable - Lista de categorías */}
                {categoryExpanded && (
                  <View style={[
                    tw('mt-2 rounded-xl overflow-hidden'),
                    { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border.light }
                  ]}>
                    {categories.map((cat, index) => (
                      <TouchableOpacity
                        key={cat.value}
                        onPress={() => handleSelectCategory(cat.value)}
                        activeOpacity={0.7}
                        style={[
                          tw('flex-row items-center p-4'),
                          {
                            backgroundColor: category === cat.value 
                              ? getColorWithOpacity(cat.color, 0.08)
                              : 'transparent',
                            borderBottomWidth: index < categories.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border.light,
                          }
                        ]}
                      >
                        <View style={[
                          tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                          { backgroundColor: getColorWithOpacity(cat.color, 0.15) }
                        ]}>
                          <Ionicons name={cat.icon} size={20} color={cat.color} />
                        </View>
                        <Text style={[
                          tw('text-sm font-semibold flex-1'),
                          { color: category === cat.value ? cat.color : colors.text.primary }
                        ]}>
                          {cat.label}
                        </Text>
                        {category === cat.value && (
                          <Ionicons name="checkmark-circle" size={22} color={cat.color} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Título */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                  Título *
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
                    placeholder="Ej: Inspección de ronda nocturna"
                    placeholderTextColor={colors.text.disabled}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                    editable={!loading}
                  />
                </View>
                <Text style={[tw('text-xs mt-1 ml-1'), { color: colors.text.secondary }]}>
                  {title.length}/100 caracteres
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
                    minHeight: 120,
                    borderWidth: 1,
                    borderColor: colors.border.light,
                  }
                ]}>
                  <TextInput
                    style={[
                      tw('text-base'),
                      {
                        color: colors.text.primary,
                        minHeight: 100,
                        textAlignVertical: 'top',
                      }
                    ]}
                    placeholder="Describe la novedad, incidente o información relevante..."
                    placeholderTextColor={colors.text.disabled}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={500}
                    editable={!loading}
                  />
                </View>
                <Text style={[tw('text-xs mt-1 ml-1'), { color: colors.text.secondary }]}>
                  {description.length}/500 caracteres
                </Text>
              </View>

              {/* 🆕 SOLO ESTO SE AGREGÓ */}
              <ImagePicker
                images={images}
                onImagesChange={setImages}
                maxImages={5}
                disabled={loading}
              />

              {/* Prioridad */}
              <View style={tw('mb-6')}>
                <Text style={[tw('text-sm font-bold mb-3'), { color: colors.primary }]}>
                  Prioridad *
                </Text>
                <View style={tw('flex-row')}>
                  {priorities.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setPriority(p.value)}
                      activeOpacity={0.7}
                      disabled={loading}
                      style={[
                        tw('flex-1 rounded-xl p-4 mr-2'),
                        {
                          backgroundColor: priority === p.value ? p.bgColor : colors.surface,
                          borderWidth: 2,
                          borderColor: priority === p.value ? p.color : colors.border.light,
                        },
                        p.value === 'low' && tw('mr-0')
                      ]}
                    >
                      <View style={tw('items-center')}>
                        <View style={[
                          tw('w-12 h-12 rounded-xl items-center justify-center mb-2'),
                          { backgroundColor: p.bgColor }
                        ]}>
                          <Ionicons name={p.icon} size={24} color={p.color} />
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

              {/* Info adicional */}
              <View style={[
                tw('p-4 rounded-2xl mb-4'),
                { backgroundColor: getColorWithOpacity(colors.status.info, 0.08), borderWidth: 1, borderColor: getColorWithOpacity(colors.status.info, 0.2) }
              ]}>
                <View style={tw('flex-row items-center mb-2')}>
                  <Ionicons name="information-circle" size={18} color={colors.status.info} style={tw('mr-2')} />
                  <Text style={[tw('text-sm font-bold'), { color: colors.primary }]}>
                    Información
                  </Text>
                </View>
                <Text style={[tw('text-xs'), { color: colors.text.secondary, lineHeight: 18 }]}>
                  Esta minuta será registrada con tu usuario y la fecha/hora actual. La categoría permitirá filtrar y generar reportes específicos.
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
                  disabled={loading}
                >
                  <Text style={[tw('text-base font-bold'), { color: colors.text.secondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  style={[
                    tw('flex-1 rounded-xl items-center justify-center ml-2 py-4'),
                    { backgroundColor: loading ? colors.border.light : colors.accent }
                  ]}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <View style={tw('flex-row items-center')}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.surface} style={tw('mr-2')} />
                      <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                        Guardar Minuta
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}