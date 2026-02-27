// AlarmSound.ts - Generador de sonido de alarma molesto usando Web Audio API
// No requiere archivos externos - 100% generado por código

import { Audio } from 'expo-av';

class AlarmSound {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  // Configurar audio
  async setup() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  }

  // Generar WAV de alarma en memoria
  private generateAlarmWAV(): string {
    const sampleRate = 44100;
    const duration = 2; // 2 segundos de patrón que se repetirá en loop
    const numSamples = sampleRate * duration;
    
    // Crear buffer para el audio
    const buffer = new ArrayBuffer(44 + numSamples * 2); // Header WAV + datos
    const view = new DataView(buffer);
    
    // Header WAV
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Generar sonido de alarma MÁS molesto
    let dataOffset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // **OPCIÓN 1: Alarma industrial molesta (como maquinaria defectuosa)**
      // Frecuencias agresivas que se alternan rápidamente
      const pulseRate = 10; // Hz - pulsos por segundo
      const pulse = Math.sin(2 * Math.PI * pulseRate * t);
      
      // Dos frecuencias muy discordantes
      const freq1 = 800 + Math.sin(2 * Math.PI * 5 * t) * 200; // 600-1000Hz variando
      const freq2 = 1200 + Math.sin(2 * Math.PI * 3 * t) * 300; // 900-1500Hz variando
      
      // Alternar entre las dos frecuencias basado en el pulso
      const frequency = pulse > 0 ? freq1 : freq2;
      
      // **OPCIÓN 2: Alarma estridente con múltiples armónicos**
      // Onda cuadrada con múltiples armónicos para sonido más áspero
      let sample = 0;
      for (let harmonic = 1; harmonic <= 8; harmonic += 2) {
        sample += (1 / harmonic) * Math.sin(2 * Math.PI * frequency * harmonic * t);
      }
      sample = Math.sign(sample) * 0.7; // Hacerla más cuadrada
      
      // **Añadir ruido blanco agresivo**
      const whiteNoise = (Math.random() - 0.5) * 0.3;
      
      // **Añadir chirrido agudo intermitente**
      const chirpFreq = 2000 + Math.sin(2 * Math.PI * 20 * t) * 500;
      const chirp = Math.sin(2 * Math.PI * chirpFreq * t) * 
                    Math.max(0, Math.sin(2 * Math.PI * 2 * t)) * 0.4; // Chirp que aparece cada 0.5s
      
      // **Añadir distorsión**
      const distortedSample = Math.tanh(sample * 1.5) * 0.8;
      
      // **Combinar todo**
      let value = distortedSample + whiteNoise + chirp;
      
      // **Patrón de volumen más agresivo (pulsante rápido)**
      let volume = 0.9;
      
      // Pulsaciones rápidas adicionales
      const fastPulse = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 8 * t));
      volume *= fastPulse;
      
      // Fade in/out para evitar clicks
      if (t < 0.02) volume *= t / 0.02;
      if (t > duration - 0.02) volume *= (duration - t) / 0.02;
      
      // Limitar
      value = Math.max(-1, Math.min(1, value * volume));
      
      view.setInt16(dataOffset, value * 32767, true);
      dataOffset += 2;
    }
    
    // Convertir a base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // **ALTERNATIVA: Alarma tipo "pánico" con múltiples efectos**
  private generatePanicAlarmWAV(): string {
    const sampleRate = 44100;
    const duration = 2; // 2 segundos de patrón
    const numSamples = sampleRate * duration;
    
    // Crear buffer para el audio
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // Header WAV (igual que antes)
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Generar sonido de pánico
    let dataOffset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // **Efecto principal: Frecuencia que sube rápidamente**
      const riseTime = 0.8; // segundos para subir
      const baseFreq = 300 + (t < riseTime ? (t / riseTime) * 1700 : 0);
      
      // **Onda diente de sierra (muy estridente)**
      const sawtooth = 2 * (t * baseFreq % 1) - 1;
      
      // **Modulación AM rápida (para vibrato molesto)**
      const amDepth = 0.7;
      const amFreq = 30;
      const am = 1 - amDepth + amDepth * Math.sin(2 * Math.PI * amFreq * t);
      
      // **Ruido de frecuencias altas (silbido)**
      const hissFreq = 5000;
      const hiss = Math.sin(2 * Math.PI * hissFreq * t) * 0.2;
      
      // **Pulsos intermitentes agudos**
      const beepFreq = 3000;
      const beepRate = 4;
      const beep = Math.sin(2 * Math.PI * beepFreq * t) * 
                   Math.max(0, Math.sin(2 * Math.PI * beepRate * t)) * 0.3;
      
      // **Combinar todo**
      let value = (sawtooth * am) + hiss + beep;
      
      // **Volumen con patrón irregular**
      let volume = 0.9;
      
      // Ataque rápido, decaimiento más lento
      if (t < 0.05) volume *= t / 0.05;
      
      // Pequeñas pausas para hacerlo más irritante
      const microPause = (Math.sin(2 * Math.PI * 15 * t) > 0.5) ? 1 : 0.7;
      volume *= microPause;
      
      // Limitar
      value = Math.max(-1, Math.min(1, value * volume));
      
      view.setInt16(dataOffset, value * 32767, true);
      dataOffset += 2;
    }
    
    // Convertir a base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Reproducir alarma en loop
  async play(usePanicAlarm: boolean = true) {
    try {
      if (this.isPlaying) return;

      // Generar el WAV (elegir cual usar)
      const base64Audio = usePanicAlarm ? 
        this.generatePanicAlarmWAV() : 
        this.generateAlarmWAV();
      
      const uri = `data:audio/wav;base64,${base64Audio}`;

      // Cargar y reproducir
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          isLooping: true, // Loop infinito
          volume: 1.0,
          shouldPlay: true,
        }
      );

      this.sound = sound;
      this.isPlaying = true;
      
      console.log(`🚨 ALARMA ${usePanicAlarm ? 'DE PÁNICO' : 'INDUSTRIAL'} - Sonando en loop`);
    } catch (error) {
      console.error('Error playing alarm:', error);
    }
  }

  // Detener alarma
  async stop() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.isPlaying = false;
        console.log('✅ ALARMA DETENIDA');
      }
    } catch (error) {
      console.error('Error stopping alarm:', error);
    }
  }

  // Verificar si está sonando
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export default new AlarmSound();