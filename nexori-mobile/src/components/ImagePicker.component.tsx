import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';

const { colors, shadows } = designTokens;

interface ImagePickerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export default function ImagePicker({
  images,
  onImagesChange,
  maxImages = 5,
  disabled = false,
}: ImagePickerProps) {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu galería para seleccionar imágenes'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (disabled || images.length >= maxImages) {
      Alert.alert(
        'Límite alcanzado',
        `Solo puedes agregar hasta ${maxImages} imágenes`
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setLoading(true);

      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = [...images, result.assets[0].uri];
        onImagesChange(newImages);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    if (disabled || images.length >= maxImages) {
      Alert.alert(
        'Límite alcanzado',
        `Solo puedes agregar hasta ${maxImages} imágenes`
      );
      return;
    }

    const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu cámara para tomar fotos'
      );
      return;
    }

    try {
      setLoading(true);

      const result = await ExpoImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = [...images, result.assets[0].uri];
        onImagesChange(newImages);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Eliminar imagen',
      '¿Estás seguro de que deseas eliminar esta imagen?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const newImages = images.filter((_, i) => i !== index);
            onImagesChange(newImages);
          },
        },
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Agregar imagen',
      'Selecciona una opción',
      [
        {
          text: 'Tomar foto',
          onPress: takePhoto,
        },
        {
          text: 'Seleccionar de galería',
          onPress: pickImage,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={tw('mb-5')}>
      <Text style={[tw('text-xs font-bold mb-3 uppercase tracking-wide'), { color: colors.text.secondary }]}>
        Imágenes {images.length > 0 && `(${images.length}/${maxImages})`}
      </Text>

      {/* Imágenes seleccionadas */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw('mb-3')}
          contentContainerStyle={tw('pr-4')}
        >
          {images.map((uri, index) => (
            <View key={index} style={tw('mr-3 relative')}>
              {/* ✅ CORREGIDO: Usar objeto directo sin tw() */}
              <Image
                source={{ uri }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 12,
                  backgroundColor: colors.backgroundAlt,
                } as ImageStyle}
                resizeMode="cover"
              />
              
              {/* Botón eliminar */}
              <TouchableOpacity
                onPress={() => removeImage(index)}
                style={[
                  tw('absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center'),
                  { backgroundColor: colors.status.error },
                  shadows.md
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color={colors.surface} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Botón agregar imagen */}
      {images.length < maxImages && (
        <TouchableOpacity
          onPress={showImageOptions}
          disabled={disabled || loading}
          style={[
            tw('rounded-xl p-4 flex-row items-center justify-center border-2 border-dashed'),
            {
              borderColor: disabled 
                ? colors.border.light 
                : getColorWithOpacity(colors.primary, 0.3),
              backgroundColor: disabled
                ? colors.backgroundAlt
                : getColorWithOpacity(colors.primary, 0.05),
            }
          ]}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name="camera"
                size={20}
                color={disabled ? colors.text.secondary : colors.primary}
                style={tw('mr-2')}
              />
              <Text
                style={[
                  tw('text-sm font-semibold'),
                  { color: disabled ? colors.text.secondary : colors.primary }
                ]}
              >
                Agregar imagen
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Nota informativa */}
      {images.length === 0 && (
        <Text style={[tw('text-xs mt-2 text-center'), { color: colors.text.secondary }]}>
          Las imágenes se comprimen automáticamente
        </Text>
      )}
    </View>
  );
}