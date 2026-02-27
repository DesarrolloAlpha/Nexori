import { ViewStyle, TextStyle, ImageStyle, Platform, Dimensions, StatusBar } from 'react-native';



type Style = ViewStyle | TextStyle | ImageStyle;

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const spacing = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80,
  24: 96, 32: 128, 40: 160, 48: 192,
};

const colors = {
  // Paleta principal según especificación
  primary: '#191E2B',        // Color base principal
  secondary: '#253045',      // Color secundario
  accent: '#00C6E6',         // Único color de acento
  surface: '#FFFFFF',        // Superficies blancas
  background: '#BFC0D1',     // Fondo general
  backgroundAlt: '#C4CFD6',  // Fondos alternos claros
  
  // Sistema de texto
  text: { 
    primary: '#191E2B',      // Texto principal
    secondary: '#5A6374',    // Texto secundario
    light: '#FFFFFF',        // Texto claro
    accent: '#00C6E6',       // Texto acento
    disabled: '#94A3B8',     // Texto deshabilitado
  },
  
  // Bordes y divisiones
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
    dark: '#94A3B8',
  },
  
  // Estados y semántica
  status: {
    success: '#10B981', 
    warning: '#F59E0B', 
    error: '#EF4444', 
    info: '#3B82F6',
    successLight: '#D1FAE5', 
    warningLight: '#FEF3C7', 
    errorLight: '#FEE2E2', 
    infoLight: '#DBEAFE',
  },
  
  // Estados de interacción
  states: {
    hover: '#F1F5F9',
    pressed: '#E2E8F0',
    focus: '#00C6E620',
    disabled: '#F1F5F9',
  },
  
  // Gradientes y overlays
  overlay: {
    dark: '#00000080',
    light: '#FFFFFF80',
    primary: '#191E2B80',
  }
};

// Sistema de sombras consistente
const shadows = {
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  accent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }
};

const tailwindMap: Record<string, any> = {
  // === FONDOS ===
  'bg-primary': { backgroundColor: colors.primary },
  'bg-secondary': { backgroundColor: colors.secondary },
  'bg-accent': { backgroundColor: colors.accent },
  'bg-surface': { backgroundColor: colors.surface },
  'bg-background': { backgroundColor: colors.background },
  'bg-background-alt': { backgroundColor: colors.backgroundAlt },
  'bg-transparent': { backgroundColor: 'transparent' },
  'bg-overlay-dark': { backgroundColor: colors.overlay.dark },
  'bg-overlay-light': { backgroundColor: colors.overlay.light },
  
  // Fondos de estado
  'bg-success-light': { backgroundColor: colors.status.successLight },
  'bg-warning-light': { backgroundColor: colors.status.warningLight },
  'bg-error-light': { backgroundColor: colors.status.errorLight },
  'bg-info-light': { backgroundColor: colors.status.infoLight },
  'bg-hover': { backgroundColor: colors.states.hover },
  'bg-pressed': { backgroundColor: colors.states.pressed },
  'bg-disabled': { backgroundColor: colors.states.disabled },
  'bg-focus': { backgroundColor: colors.states.focus },
  
  // === TEXTOS ===
  'text-primary': { color: colors.text.primary },
  'text-secondary': { color: colors.text.secondary },
  'text-light': { color: colors.text.light },
  'text-accent': { color: colors.text.accent },
  'text-disabled': { color: colors.text.disabled },
  'text-white': { color: colors.surface },
  'text-success': { color: colors.status.success },
  'text-warning': { color: colors.status.warning },
  'text-error': { color: colors.status.error },
  'text-info': { color: colors.status.info },
  
  // === LAYOUT Y FLEXBOX ===
  'flex-1': { flex: 1 },
  'flex-row': { flexDirection: 'row' },
  'flex-col': { flexDirection: 'column' },
  'flex-row-reverse': { flexDirection: 'row-reverse' },
  'flex-col-reverse': { flexDirection: 'column-reverse' },
  
  // Alineación
  'items-center': { alignItems: 'center' },
  'items-start': { alignItems: 'flex-start' },
  'items-end': { alignItems: 'flex-end' },
  'items-stretch': { alignItems: 'stretch' },
  'items-baseline': { alignItems: 'baseline' },
  
  // Justificación
  'justify-center': { justifyContent: 'center' },
  'justify-between': { justifyContent: 'space-between' },
  'justify-around': { justifyContent: 'space-around' },
  'justify-evenly': { justifyContent: 'space-evenly' },
  'justify-start': { justifyContent: 'flex-start' },
  'justify-end': { justifyContent: 'flex-end' },
  
  // Flex
  'flex-grow': { flexGrow: 1 },
  'flex-grow-0': { flexGrow: 0 },
  'flex-shrink': { flexShrink: 1 },
  'flex-shrink-0': { flexShrink: 0 },
  'flex-wrap': { flexWrap: 'wrap' },
  'flex-nowrap': { flexWrap: 'nowrap' },
  
  // === ESPACIADO (PADDING) ===
  // Padding general
  'p-0': { padding: spacing[0] }, 'p-1': { padding: spacing[1] },
  'p-2': { padding: spacing[2] }, 'p-3': { padding: spacing[3] },
  'p-4': { padding: spacing[4] }, 'p-5': { padding: spacing[5] },
  'p-6': { padding: spacing[6] }, 'p-8': { padding: spacing[8] },
  
  // Padding horizontal
  'px-0': { paddingHorizontal: spacing[0] }, 'px-1': { paddingHorizontal: spacing[1] },
  'px-2': { paddingHorizontal: spacing[2] }, 'px-3': { paddingHorizontal: spacing[3] },
  'px-4': { paddingHorizontal: spacing[4] }, 'px-5': { paddingHorizontal: spacing[5] },
  'px-6': { paddingHorizontal: spacing[6] }, 'px-8': { paddingHorizontal: spacing[8] },
  
  // Padding vertical
  'py-0': { paddingVertical: spacing[0] }, 'py-1': { paddingVertical: spacing[1] },
  'py-2': { paddingVertical: spacing[2] }, 'py-3': { paddingVertical: spacing[3] },
  'py-4': { paddingVertical: spacing[4] }, 'py-5': { paddingVertical: spacing[5] },
  'py-6': { paddingVertical: spacing[6] }, 'py-8': { paddingVertical: spacing[8] },
  
  // Padding top
  'pt-0': { paddingTop: spacing[0] }, 'pt-1': { paddingTop: spacing[1] },
  'pt-2': { paddingTop: spacing[2] }, 'pt-3': { paddingTop: spacing[3] },
  'pt-4': { paddingTop: spacing[4] }, 'pt-5': { paddingTop: spacing[5] },
  'pt-6': { paddingTop: spacing[6] }, 'pt-8': { paddingTop: spacing[8] },
  
  // Padding bottom
  'pb-0': { paddingBottom: spacing[0] }, 'pb-1': { paddingBottom: spacing[1] },
  'pb-2': { paddingBottom: spacing[2] }, 'pb-3': { paddingBottom: spacing[3] },
  'pb-4': { paddingBottom: spacing[4] }, 'pb-5': { paddingBottom: spacing[5] },
  'pb-6': { paddingBottom: spacing[6] }, 'pb-8': { paddingBottom: spacing[8] },
  'pb-16': { paddingBottom: spacing[16] }, 'pb-20': { paddingBottom: spacing[20] },
  
  // Padding left/right
  'pl-0': { paddingLeft: spacing[0] }, 'pr-0': { paddingRight: spacing[0] },
  'pl-2': { paddingLeft: spacing[2] }, 'pr-2': { paddingRight: spacing[2] },
  'pl-4': { paddingLeft: spacing[4] }, 'pr-4': { paddingRight: spacing[4] },
  'pl-6': { paddingLeft: spacing[6] }, 'pr-6': { paddingRight: spacing[6] },
  
  // === ESPACIADO (MARGIN) ===
  // Margin general
  'm-0': { margin: spacing[0] }, 'm-1': { margin: spacing[1] },
  'm-2': { margin: spacing[2] }, 'm-3': { margin: spacing[3] },
  'm-4': { margin: spacing[4] }, 'm-5': { margin: spacing[5] },
  'm-6': { margin: spacing[6] }, 'm-8': { margin: spacing[8] },
  
  // Margin horizontal
  'mx-0': { marginHorizontal: spacing[0] }, 'mx-1': { marginHorizontal: spacing[1] },
  'mx-2': { marginHorizontal: spacing[2] }, 'mx-3': { marginHorizontal: spacing[3] },
  'mx-4': { marginHorizontal: spacing[4] }, 'mx-5': { marginHorizontal: spacing[5] },
  'mx-6': { marginHorizontal: spacing[6] }, 'mx-8': { marginHorizontal: spacing[8] },
  
  // Margin vertical
  'my-0': { marginVertical: spacing[0] }, 'my-1': { marginVertical: spacing[1] },
  'my-2': { marginVertical: spacing[2] }, 'my-3': { marginVertical: spacing[3] },
  'my-4': { marginVertical: spacing[4] }, 'my-5': { marginVertical: spacing[5] },
  'my-6': { marginVertical: spacing[6] }, 'my-8': { marginVertical: spacing[8] },
  
  // Margin top
  'mt-0': { marginTop: spacing[0] }, 'mt-1': { marginTop: spacing[1] },
  'mt-2': { marginTop: spacing[2] }, 'mt-3': { marginTop: spacing[3] },
  'mt-4': { marginTop: spacing[4] }, 'mt-5': { marginTop: spacing[5] },
  'mt-6': { marginTop: spacing[6] }, 'mt-8': { marginTop: spacing[8] },
  'mt-10': { marginTop: spacing[10] }, 'mt-12': { marginTop: spacing[12] },
  
  // Margin bottom
  'mb-0': { marginBottom: spacing[0] }, 'mb-1': { marginBottom: spacing[1] },
  'mb-2': { marginBottom: spacing[2] }, 'mb-3': { marginBottom: spacing[3] },
  'mb-4': { marginBottom: spacing[4] }, 'mb-5': { marginBottom: spacing[5] },
  'mb-6': { marginBottom: spacing[6] }, 'mb-8': { marginBottom: spacing[8] },
  'mb-10': { marginBottom: spacing[10] }, 'mb-12': { marginBottom: spacing[12] },
  
  // Margin left/right
  'ml-0': { marginLeft: spacing[0] }, 'mr-0': { marginRight: spacing[0] },
  'ml-1': { marginLeft: spacing[1] }, 'mr-1': { marginRight: spacing[1] },
  'ml-2': { marginLeft: spacing[2] }, 'mr-2': { marginRight: spacing[2] },
  'ml-3': { marginLeft: spacing[3] }, 'mr-3': { marginRight: spacing[3] },
  'ml-4': { marginLeft: spacing[4] }, 'mr-4': { marginRight: spacing[4] },
  'ml-6': { marginLeft: spacing[6] }, 'mr-6': { marginRight: spacing[6] },
  'ml-auto': { marginLeft: 'auto' }, 'mr-auto': { marginRight: 'auto' },
  
  // Espaciado entre elementos
  'space-y-1': { marginTop: spacing[1] },
  'space-y-2': { marginTop: spacing[2] },
  'space-y-3': { marginTop: spacing[3] },
  'space-y-4': { marginTop: spacing[4] },
  'space-y-6': { marginTop: spacing[6] },
  'space-x-2': { marginLeft: spacing[2] },
  'space-x-3': { marginLeft: spacing[3] },
  'space-x-4': { marginLeft: spacing[4] },
  
  // === BORDES ===
  // Ancho de borde
  'border-0': { borderWidth: 0 },
  'border': { borderWidth: 1, borderColor: colors.border.light },
  'border-2': { borderWidth: 2, borderColor: colors.border.light },
  
  // Color de borde
  'border-primary': { borderColor: colors.primary },
  'border-secondary': { borderColor: colors.secondary },
  'border-accent': { borderColor: colors.accent },
  'border-light': { borderColor: colors.border.light },
  'border-medium': { borderColor: colors.border.medium },
  'border-dark': { borderColor: colors.border.dark },
  'border-success': { borderColor: colors.status.success },
  'border-warning': { borderColor: colors.status.warning },
  'border-error': { borderColor: colors.status.error },
  'border-info': { borderColor: colors.status.info },
  'border-white': { borderColor: colors.surface },
  'border-transparent': { borderColor: 'transparent' },
  
  // Bordes específicos
  'border-t': { borderTopWidth: 1, borderTopColor: colors.border.light },
  'border-b': { borderBottomWidth: 1, borderBottomColor: colors.border.light },
  'border-l': { borderLeftWidth: 1, borderLeftColor: colors.border.light },
  'border-r': { borderRightWidth: 1, borderRightColor: colors.border.light },
  
  // Radio de borde
  'rounded-none': { borderRadius: 0 },
  'rounded-sm': { borderRadius: spacing[1] },
  'rounded': { borderRadius: spacing[2] },
  'rounded-md': { borderRadius: spacing[3] },
  'rounded-lg': { borderRadius: spacing[4] },
  'rounded-xl': { borderRadius: spacing[5] },
  'rounded-2xl': { borderRadius: spacing[6] },
  'rounded-3xl': { borderRadius: spacing[8] },
  'rounded-full': { borderRadius: 9999 },
  
  // === POSICIONAMIENTO ===
  'absolute': { position: 'absolute' },
  'relative': { position: 'relative' },
  'fixed': { position: 'absolute' },
  
  // Top/Right/Bottom/Left
  'top-0': { top: 0 }, 'top-2': { top: spacing[2] },
  'top-4': { top: spacing[4] }, 'top-6': { top: spacing[6] },
  'top-8': { top: spacing[8] }, 'top-10': { top: spacing[10] },
  'top-1/2': { top: '50%' },
  
  'right-0': { right: 0 }, 'right-2': { right: spacing[2] },
  'right-4': { right: spacing[4] }, 'right-6': { right: spacing[6] },
  'right-8': { right: spacing[8] },
  
  'bottom-0': { bottom: 0 }, 'bottom-2': { bottom: spacing[2] },
  'bottom-4': { bottom: spacing[4] }, 'bottom-6': { bottom: spacing[6] },
  'bottom-8': { bottom: spacing[8] }, 'bottom-10': { bottom: spacing[10] },
  'bottom-16': { bottom: spacing[16] }, 'bottom-20': { bottom: spacing[20] },
  
  'left-0': { left: 0 }, 'left-2': { left: spacing[2] },
  'left-4': { left: spacing[4] }, 'left-6': { left: spacing[6] },
  'left-8': { left: spacing[8] },
  
  'inset-0': { top: 0, right: 0, bottom: 0, left: 0 },
  
  // Transformaciones
  'translate-y-1/2': { transform: [{ translateY: -50 }] },
  'translate-x-1/2': { transform: [{ translateX: -50 }] },
  
  // Z-index
  'z-0': { zIndex: 0 }, 'z-10': { zIndex: 10 },
  'z-20': { zIndex: 20 }, 'z-30': { zIndex: 30 },
  'z-40': { zIndex: 40 }, 'z-50': { zIndex: 50 },
  
  // === TAMAÑOS (WIDTH/HEIGHT) ===
  // Width
  'w-0': { width: 0 }, 'w-1': { width: spacing[1] },
  'w-2': { width: spacing[2] }, 'w-3': { width: spacing[3] },
  'w-4': { width: spacing[4] }, 'w-5': { width: spacing[5] },
  'w-6': { width: spacing[6] }, 'w-8': { width: spacing[8] },
  'w-10': { width: spacing[10] }, 'w-12': { width: spacing[12] },
  'w-14': { width: 56 }, 'w-16': { width: spacing[16] },
  'w-20': { width: spacing[20] }, 'w-24': { width: spacing[24] },
  'w-32': { width: spacing[32] }, 'w-40': { width: spacing[40] },
  'w-48': { width: spacing[48] },
  'w-auto': { width: 'auto' },
  'w-full': { width: '100%' },
  'w-screen': { width: screenWidth },
  'w-1/2': { width: '50%' }, 'w-1/3': { width: '33.333333%' },
  'w-2/3': { width: '66.666667%' }, 'w-1/4': { width: '25%' },
  'w-3/4': { width: '75%' }, 'w-1/5': { width: '20%' },
  'w-[30%]': { width: '30%' }, 'w-[40%]': { width: '40%' },
  'w-[48%]': { width: '48%' }, 'w-[70%]': { width: '70%' },
  'w-[90%]': { width: '90%' }, 'w-[95%]': { width: '95%' },
  
  // Height
  'h-0': { height: 0 }, 'h-1': { height: spacing[1] },
  'h-2': { height: spacing[2] }, 'h-3': { height: spacing[3] },
  'h-4': { height: spacing[4] }, 'h-5': { height: spacing[5] },
  'h-6': { height: spacing[6] }, 'h-8': { height: spacing[8] },
  'h-10': { height: spacing[10] }, 'h-12': { height: spacing[12] },
  'h-14': { height: 56 }, 'h-16': { height: spacing[16] },
  'h-20': { height: spacing[20] }, 'h-24': { height: spacing[24] },
  'h-32': { height: spacing[32] }, 'h-40': { height: spacing[40] },
  'h-48': { height: spacing[48] },
  'h-auto': { height: 'auto' },
  'h-full': { height: '100%' },
  'h-screen': { height: screenHeight },
  'h-1/2': { height: '50%' }, 'h-1/3': { height: '33.333333%' },
  'h-2/3': { height: '66.666667%' },
  
  // Min/Max dimensions
  'min-w-0': { minWidth: 0 },
  'min-h-0': { minHeight: 0 },
  'min-h-10': { minHeight: spacing[10] },
  'min-h-12': { minHeight: spacing[12] },
  'min-h-16': { minHeight: spacing[16] },
  'max-w-full': { maxWidth: '100%' },
  'max-w-screen': { maxWidth: screenWidth },
  
  // === TIPOGRAFÍA ===
  // Tamaños de texto
  'text-xs': { fontSize: 12, lineHeight: 16 },
  'text-sm': { fontSize: 14, lineHeight: 20 },
  'text-base': { fontSize: 16, lineHeight: 24 },
  'text-lg': { fontSize: 18, lineHeight: 28 },
  'text-xl': { fontSize: 20, lineHeight: 28 },
  'text-2xl': { fontSize: 24, lineHeight: 32 },
  'text-3xl': { fontSize: 30, lineHeight: 36 },
  'text-4xl': { fontSize: 36, lineHeight: 40 },
  'text-5xl': { fontSize: 48, lineHeight: 48 },
  
  // Pesos de fuente
  'font-thin': { fontWeight: '100' },
  'font-extralight': { fontWeight: '200' },
  'font-light': { fontWeight: '300' },
  'font-normal': { fontWeight: '400' },
  'font-medium': { fontWeight: '500' },
  'font-semibold': { fontWeight: '600' },
  'font-bold': { fontWeight: '700' },
  'font-extrabold': { fontWeight: '800' },
  'font-black': { fontWeight: '900' },
  
  // Alineación de texto
  'text-center': { textAlign: 'center' },
  'text-left': { textAlign: 'left' },
  'text-right': { textAlign: 'right' },
  'text-justify': { textAlign: 'justify' },
  
  // Transformación de texto
  'uppercase': { textTransform: 'uppercase' },
  'lowercase': { textTransform: 'lowercase' },
  'capitalize': { textTransform: 'capitalize' },
  'normal-case': { textTransform: 'none' },
  
  // Decoración de texto
  'underline': { textDecorationLine: 'underline' },
  'line-through': { textDecorationLine: 'line-through' },
  'no-underline': { textDecorationLine: 'none' },
  
  // Espaciado de texto
  'tracking-tight': { letterSpacing: -0.5 },
  'tracking-normal': { letterSpacing: 0 },
  'tracking-wide': { letterSpacing: 0.5 },
  
  // Altura de línea
  'leading-none': { lineHeight: 1 },
  'leading-tight': { lineHeight: 1.25 },
  'leading-normal': { lineHeight: 1.5 },
  'leading-relaxed': { lineHeight: 1.625 },
  
  // === SOMBRAS Y ELEVACIÓN ===
  'shadow-none': { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  'shadow-sm': shadows.sm,
  'shadow': shadows.md,
  'shadow-md': shadows.md,
  'shadow-lg': shadows.lg,
  'shadow-xl': shadows.xl,
  'shadow-accent': shadows.accent,
  
  // === OVERFLOW ===
  'overflow-visible': { overflow: 'visible' },
  'overflow-hidden': { overflow: 'hidden' },
  'overflow-scroll': { overflow: 'scroll' },
  
  // === OPACIDAD ===
  'opacity-0': { opacity: 0 },
  'opacity-25': { opacity: 0.25 },
  ' opacity-50': { opacity: 0.5 },
  'opacity-75': { opacity: 0.75 },
  'opacity-100': { opacity: 1 },
  
  // === COMPONENTES ESPECÍFICOS ===
  // Botones
  'btn-primary': { 
    backgroundColor: colors.accent,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: spacing[4],
  },
  'btn-secondary': { 
    backgroundColor: colors.secondary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: spacing[4],
  },
  
  // Inputs
  'input': {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    fontSize: 16,
  },
  'input-focus': {
    borderColor: colors.accent,
    backgroundColor: colors.states.focus,
  },
  
  // Tarjetas
  'card': {
    backgroundColor: colors.surface,
    borderRadius: spacing[4],
    padding: spacing[4],
    ...shadows.sm,
  },
  'card-lg': {
    backgroundColor: colors.surface,
    borderRadius: spacing[6],
    padding: spacing[6],
    ...shadows.md,
  },
  
  // Badges
  'badge-success': {
    backgroundColor: colors.status.successLight,
    color: colors.status.success,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: spacing[1],
    fontSize: 12,
    fontWeight: '500',
  },
  'badge-warning': {
    backgroundColor: colors.status.warningLight,
    color: colors.status.warning,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: spacing[1],
    fontSize: 12,
    fontWeight: '500',
  },
  'badge-error': {
    backgroundColor: colors.status.errorLight,
    color: colors.status.error,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: spacing[1],
    fontSize: 12,
    fontWeight: '500',
  },
  'badge-info': {
    backgroundColor: colors.status.infoLight,
    color: colors.status.info,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: spacing[1],
    fontSize: 12,
    fontWeight: '500',
  },
};

export const tw = (classNames: string): Style => {
  const classes = classNames.split(' ').filter(c => c.trim() !== '');
  const styles: Style = {};
  
  classes.forEach(className => {
    if (tailwindMap[className]) {
      Object.assign(styles, tailwindMap[className]);
    }
  });
  
  return styles;
};

export const twMerge = (...classNames: string[]): Style => {
  return tw(classNames.join(' '));
};

// Funciones de utilidad para componentes comunes
export const designTokens = {
  colors,
  spacing,
  shadows,
  
  // Componentes predefinidos
  components: {
    header: {
      height: 56,
      paddingHorizontal: spacing[4],
      backgroundColor: colors.primary,
    },
    tabBar: {
      height: 60,
      backgroundColor: colors.surface,
      borderTopColor: colors.border.light,
      borderTopWidth: 1,
    },
    button: {
      primary: {
        backgroundColor: colors.accent,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[6],
        borderRadius: spacing[4],
        minHeight: 48,
      },
      secondary: {
        backgroundColor: colors.secondary,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[6],
        borderRadius: spacing[4],
        minHeight: 48,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.accent,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[6],
        borderRadius: spacing[4],
        minHeight: 48,
      },
    },
    card: {
      base: {
        backgroundColor: colors.surface,
        borderRadius: spacing[4],
        padding: spacing[4],
        ...shadows.sm,
      },
      elevated: {
        backgroundColor: colors.surface,
        borderRadius: spacing[6],
        padding: spacing[6],
        ...shadows.md,
      },
    },
  },
};

// Helper functions
export const getBottomSafeArea = () => {
  if (Platform.OS === 'ios') {
    return 0;
  }
  return 8;
};

export const getColorWithOpacity = (color: string, opacity: number = 0.15) => {
  return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
};

export default tw;
