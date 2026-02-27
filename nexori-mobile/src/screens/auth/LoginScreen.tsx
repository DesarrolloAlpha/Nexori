import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';

const { width, height } = Dimensions.get('window');
const { colors, shadows } = designTokens;

  // Componente de burbuja flotante
  const FloatingBubble = ({ delay = 0, duration = 4000, size = 60 }) => {
    const translateY = useRef(new Animated.Value(height)).current;
    const initialX = useRef(Math.random() * width).current; // Guardar valor inicial
    const translateX = useRef(new Animated.Value(initialX)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animate = () => {
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(translateY, {
              toValue: -size,
              duration: duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.loop(
              Animated.sequence([
                Animated.timing(translateX, {
                  toValue: initialX + 50, // Usar valor inicial guardado
                  duration: duration / 2,
                  easing: Easing.inOut(Easing.ease),
                  useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                  toValue: initialX, // Usar valor inicial guardado
                  duration: duration / 2,
                  easing: Easing.inOut(Easing.ease),
                  useNativeDriver: true,
                }),
              ])
            ),
          ]),
        ]).start(() => {
          translateY.setValue(height);
          opacity.setValue(0);
          translateX.setValue(initialX); // Reset a valor inicial
          animate();
        });
      };

      animate();
    }, []);

    return (
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accent,
          opacity: opacity,
          transform: [{ translateY }, { translateX }],
        }}
      />
    );
  };

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  
  const { login } = useAuth();

  // Animaciones
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación continua del logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    // Validación mejorada de campos
    if (!email.trim()) {
      Alert.alert(
        'Campo requerido', 
        'Por favor ingresa tu correo electrónico',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    if (!password.trim()) {
      Alert.alert(
        'Campo requerido', 
        'Por favor ingresa tu contraseña',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    // Validación de formato de email robusta
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailValid(false);
      Alert.alert(
        'Email inválido', 
        'Por favor ingresa un correo electrónico válido (ejemplo@empresa.com)',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    // Resetear estado de validación
    setEmailValid(true);

    // Verificar que no esté ya cargando
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Usar el servicio real de autenticación
      const credentials = { 
        email: email.trim().toLowerCase(), 
        password: password.trim() 
      };
      
      await login(credentials);
      
      // Si login es exitoso, el AuthContext manejará la navegación
      // No necesitamos hacer nada más aquí
      
    } catch (error: any) {
      console.error('Login error details:', error);
      
      // Manejo específico de errores
      let errorTitle = 'Error de autenticación';
      let errorMessage = 'No se pudo iniciar sesión. Por favor intenta de nuevo.';
      
      if (error.message) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('credenciales') || errorMsg.includes('incorrect') || errorMsg.includes('invalid')) {
          errorTitle = 'Credenciales incorrectas';
          errorMessage = 'El email o la contraseña son incorrectos. Por favor verifica tus datos.';
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('connect')) {
          errorTitle = 'Error de conexión';
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        } else if (errorMsg.includes('server') || errorMsg.includes('internal')) {
          errorTitle = 'Error del servidor';
          errorMessage = 'El servidor está experimentando problemas. Por favor intenta más tarde.';
        } else if (errorMsg.includes('inactive') || errorMsg.includes('desactivada')) {
          errorTitle = 'Cuenta inactiva';
          errorMessage = 'Tu cuenta está desactivada. Contacta al administrador.';
        }
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [{ text: 'OK', style: 'cancel' }]
      );
      
      // Opcional: Limpiar contraseña en caso de error
      // setPassword('');
      
    } finally {
      // Solo detener carga si aún estamos en este componente
      setIsLoading(false);
    }
  };
  
  const validateEmail = (text: string) => {
    setEmail(text);
    setEmailValid(text.includes('@') || text.length === 0);
  };

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={tw('flex-1')}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Background con degradado */}
      <LinearGradient
        colors={[colors.primary, colors.secondary, colors.primary]}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Burbujas flotantes animadas */}
      {[...Array(8)].map((_, i) => (
        <FloatingBubble 
          key={i} 
          delay={i * 500} 
          duration={4000 + i * 500}
          size={40 + Math.random() * 60}
        />
      ))}

      <SafeAreaView style={tw('flex-1')} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1')}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={{ 
              flexGrow: 1, 
              paddingHorizontal: 24,
              paddingBottom: Platform.OS === 'ios' ? 20 : 20 
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Espaciador superior */}
            <View style={{ height: Platform.OS === 'ios' ? 20 : 20 }} />

            {/* Logo animado */}
            <View style={tw('items-center mb-6')}>
                <LinearGradient
                  colors={[colors.accent, '#00D4F5', colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    tw('rounded-3xl items-center justify-center'),
                    {
                      width: 80,
                      height: 80,
                    },
                    shadows.xl,
                  ]}
                >
                  <Text style={tw('text-white text-4xl font-black')}>N</Text>
                </LinearGradient>

              <Text style={tw('text-white text-2xl font-bold text-center mt-5 mb-1')}>
                Control de Seguridad
              </Text>
              <Text style={[tw('text-center text-sm'), { color: getColorWithOpacity(colors.text.light, 0.8) }]}>
                Sistema Integral de Gestión
              </Text>
            </View>

            {/* Card con glassmorphism */}
            <Animated.View
              style={{
                transform: [{ translateY: cardTranslateY }],
                opacity: cardOpacity,
                flex: 1,
              }}
            >
              <BlurView
                intensity={20}
                tint="light"
                style={[
                  tw('rounded-3xl p-6 overflow-hidden'),
                  {
                    backgroundColor: getColorWithOpacity(colors.surface, 0.95),
                    borderWidth: 1,
                    borderColor: getColorWithOpacity(colors.surface, 0.3),
                  },
                  shadows.xl,
                ]}
              >
                {/* Gradient overlay sutil */}
                <LinearGradient
                  colors={[
                    getColorWithOpacity(colors.accent, 0.05),
                    'transparent',
                    getColorWithOpacity(colors.accent, 0.05),
                  ]}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />

                <Text style={tw('text-xl font-bold text-primary mb-5 text-center')}>
                  Iniciar Sesión
                </Text>

                {/* Campo Email con validación visual */}
                <View style={tw('mb-4')}>
                  <Text style={tw('text-sm font-bold text-primary mb-2')}>
                    Correo Electrónico
                  </Text>
                  <View
                    style={[
                      tw('flex-row items-center rounded-xl px-4'),
                      {
                        backgroundColor: emailFocused 
                          ? getColorWithOpacity(colors.accent, 0.08) 
                          : colors.background,
                        height: 54,
                        borderWidth: 2,
                        borderColor: emailFocused
                          ? colors.accent
                          : !emailValid
                          ? colors.status.error
                          : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        tw('w-9 h-9 rounded-xl items-center justify-center mr-3'),
                        { backgroundColor: getColorWithOpacity(colors.accent, 0.15) },
                      ]}
                    >
                      <Ionicons
                        name="mail"
                        size={18}
                        color={emailFocused ? colors.accent : colors.text.secondary}
                      />
                    </View>
                    <TextInput
                      style={[tw('flex-1 text-base font-medium'), { color: colors.text.primary }]}
                      placeholder="ejemplo@empresa.com"
                      placeholderTextColor={colors.text.disabled}
                      value={email}
                      onChangeText={validateEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!isLoading}
                      returnKeyType="next"
                      selectionColor={colors.accent}
                      autoComplete="email"
                      textContentType="emailAddress"
                    />
                    {email.length > 0 && (
                      <Ionicons
                        name={emailValid ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={emailValid ? colors.status.success : colors.status.error}
                      />
                    )}
                  </View>
                  {!emailValid && email.length > 0 && (
                    <Text style={[tw('text-xs mt-1 ml-1'), { color: colors.status.error }]}>
                      Ingresa un email válido
                    </Text>
                  )}
                </View>

                {/* Campo Contraseña */}
                <View style={tw('mb-4')}>
                  <Text style={tw('text-sm font-bold text-primary mb-2')}>
                    Contraseña
                  </Text>
                  <View
                    style={[
                      tw('flex-row items-center rounded-xl px-4'),
                      {
                        backgroundColor: passwordFocused
                          ? getColorWithOpacity(colors.accent, 0.08)
                          : colors.background,
                        height: 54,
                        borderWidth: 2,
                        borderColor: passwordFocused ? colors.accent : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        tw('w-9 h-9 rounded-xl items-center justify-center mr-3'),
                        { backgroundColor: getColorWithOpacity(colors.accent, 0.15) },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={18}
                        color={passwordFocused ? colors.accent : colors.text.secondary}
                      />
                    </View>
                    <TextInput
                      style={[tw('flex-1 text-base font-medium'), { color: colors.text.primary }]}
                      placeholder="Ingresa tu contraseña"
                      placeholderTextColor={colors.text.disabled}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                      editable={!isLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      selectionColor={colors.accent}
                      autoComplete="password"
                      textContentType="password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={tw('w-10 h-10 items-center justify-center')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.accent}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botón de Login Premium */}
                <TouchableOpacity
                  style={[
                    tw('rounded-xl items-center justify-center mb-4'),
                    { height: 54 },
                    isLoading && { opacity: 0.8 },
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.accent, '#00D4F5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      tw('w-full h-full rounded-xl items-center justify-center'),
                      shadows.accent,
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.surface} size="small" />
                    ) : (
                      <View style={tw('flex-row items-center')}>
                        <Text style={tw('text-white text-base font-bold mr-2')}>
                          Iniciar Sesión
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.surface} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

              </BlurView>
            </Animated.View>

            {/* Footer con espacio garantizado */}
            <View style={{ marginTop: 16, marginBottom: 8, alignItems: 'center' }}>
              <Text style={[tw('text-xs mb-1'), { color: getColorWithOpacity(colors.text.light, 0.7) }]}>
                Versión 1.0.0
              </Text>
              <Text style={[{ fontSize: 11, color: getColorWithOpacity(colors.text.light, 0.5) }]}>
                © 2024 Nexori - Control de Seguridad
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}