// src/services/alarmSound.worker.ts
// Web Worker para generar audio en segundo plano

self.onmessage = function(e) {
  const { action, duration = 2.0, sampleRate = 44100, usePanicAlarm = true } = e.data;
  
  if (action === 'generate') {
    // Generar audio en el worker
    const audioData = generateAlarmWAV(duration, sampleRate, usePanicAlarm);
    self.postMessage({ action: 'generated', audioData });
  }
};

function generateAlarmWAV(duration: number, sampleRate: number, usePanicAlarm: boolean): ArrayBuffer {
  const numSamples = Math.floor(sampleRate * duration);
  
  // Crear buffer para el audio (misma lógica que la versión móvil)
  const buffer = new ArrayBuffer(44 + numSamples * 2);
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
  
  // Generar datos de audio (igual que tu versión móvil)
  let dataOffset = 44;
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let value = 0;
    
    if (usePanicAlarm) {
      // Lógica de alarma de pánico (igual que tu código)
      const riseTime = 0.8;
      const baseFreq = 300 + (t < riseTime ? (t / riseTime) * 1700 : 0);
      const sawtooth = 2 * (t * baseFreq % 1) - 1;
      const am = 1 - 0.7 + 0.7 * Math.sin(2 * Math.PI * 30 * t);
      const hiss = Math.sin(2 * Math.PI * 5000 * t) * 0.2;
      const beep = Math.sin(2 * Math.PI * 3000 * t) * 
                   Math.max(0, Math.sin(2 * Math.PI * 4 * t)) * 0.3;
      
      value = (sawtooth * am) + hiss + beep;
    } else {
      // Lógica de alarma industrial (igual que tu código)
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
    
    // Aplicar volumen y limitar
    let volume = 0.9;
    const fastPulse = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 8 * t));
    volume *= fastPulse;
    
    if (t < 0.02) volume *= t / 0.02;
    if (t > duration - 0.02) volume *= (duration - t) / 0.02;
    
    value = Math.max(-1, Math.min(1, value * volume));
    
    view.setInt16(dataOffset, value * 32767, true);
    dataOffset += 2;
  }
  
  return buffer;
}