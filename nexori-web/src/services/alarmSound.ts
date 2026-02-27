// src/services/alarmSound.ts
// Réplica 100% exacta usando Base64 como tu app móvil

class AlarmSoundService {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private loopInterval: number | null = null;

  /**
   * Generar Base64 WAV IDÉNTICO al de tu app móvil
   */
  private generateAlarmBase64(usePanicAlarm: boolean = true): string {
    const sampleRate = 44100;
    const duration = 2.0;
    const numSamples = Math.floor(sampleRate * duration);
    
    // Crear ArrayBuffer para WAV
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // Header WAV (IDÉNTICO A TU APP MÓVIL)
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
    
    // Generar datos de audio (ALGORITMO IDÉNTICO)
    let dataOffset = 44;
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let value = 0;
      
      if (usePanicAlarm) {
        // **ALARMA DE PÁNICO (IDÉNTICO)**
        const riseTime = 0.8;
        const baseFreq = 300 + (t < riseTime ? (t / riseTime) * 1700 : 0);
        const sawtooth = 2 * (t * baseFreq % 1) - 1;
        const am = 1 - 0.7 + 0.7 * Math.sin(2 * Math.PI * 30 * t);
        const hiss = Math.sin(2 * Math.PI * 5000 * t) * 0.2;
        const beep = Math.sin(2 * Math.PI * 3000 * t) * 
                     Math.max(0, Math.sin(2 * Math.PI * 4 * t)) * 0.3;
        value = (sawtooth * am) + hiss + beep;
      } else {
        // **ALARMA INDUSTRIAL (IDÉNTICO)**
        const pulseRate = 10;
        const pulse = Math.sin(2 * Math.PI * pulseRate * t);
        const freq1 = 800 + Math.sin(2 * Math.PI * 5 * t) * 200;
        const freq2 = 1200 + Math.sin(2 * Math.PI * 3 * t) * 300;
        const frequency = pulse > 0 ? freq1 : freq2;
        
        let sample = 0;
        for (let harmonic = 1; harmonic <= 8; harmonic += 2) {
          sample += (1 / harmonic) * Math.sin(2 * Math.PI * frequency * harmonic * t);
        }
        sample = Math.sign(sample) * 0.7;
        
        const whiteNoise = (Math.random() - 0.5) * 0.3;
        const chirpFreq = 2000 + Math.sin(2 * Math.PI * 20 * t) * 500;
        const chirp = Math.sin(2 * Math.PI * chirpFreq * t) * 
                      Math.max(0, Math.sin(2 * Math.PI * 2 * t)) * 0.4;
        const distortedSample = Math.tanh(sample * 1.5) * 0.8;
        
        value = distortedSample + whiteNoise + chirp;
      }
      
      // Aplicar volumen (IDÉNTICO)
      let volume = 0.9;
      const fastPulse = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 8 * t));
      volume *= fastPulse;
      
      if (t < 0.02) volume *= t / 0.02;
      if (t > duration - 0.02) volume *= (duration - t) / 0.02;
      
      value = Math.max(-1, Math.min(1, value * volume));
      
      view.setInt16(dataOffset, value * 32767, true);
      dataOffset += 2;
    }
    
    // Convertir a Base64 (IDÉNTICO)
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Reproducir usando audio HTML (más compatible)
   */
  play(usePanicAlarm: boolean = true): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    console.log(`🚨 ALARMA ${usePanicAlarm ? 'DE PÁNICO' : 'INDUSTRIAL'} - Base64 (igual que móvil)`);

    // Generar Base64
    const base64Audio = this.generateAlarmBase64(usePanicAlarm);
    const dataUrl = `data:audio/wav;base64,${base64Audio}`;

    // Crear elemento de audio
    this.audioElement = new Audio(dataUrl);
    this.audioElement.loop = false;
    this.audioElement.volume = 0.9;

    // Reproducir
    this.audioElement.play().catch(e => {
      console.error('Error reproduciendo audio:', e);
      this.stop();
    });

    // Configurar loop manual (igual que tu móvil)
    this.loopInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.audioElement) return;
      
      // Regenerar y reproducir
      const newBase64 = this.generateAlarmBase64(usePanicAlarm);
      const newDataUrl = `data:audio/wav;base64,${newBase64}`;
      
      this.audioElement.src = newDataUrl;
      this.audioElement.play().catch(e => {
        console.error('Error en loop:', e);
      });
    }, 2000); // Loop cada 2 segundos
  }

  /**
   * Detener alarma
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    
    console.log('✅ ALARMA DETENIDA');
  }

  /**
   * Verificar si está sonando
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Cambiar volumen
   */
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

export const alarmSound = new AlarmSoundService();