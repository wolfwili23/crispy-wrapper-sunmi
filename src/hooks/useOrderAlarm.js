import { useEffect, useRef } from 'react';

// Suono stile Glovo/Deliveroo: sequenza di toni forti e urgenti
function playAlertSequence(audioCtx) {
  const now = audioCtx.currentTime;

  // Pattern: 4 beep urgenti con volume alto
  const pattern = [
    { freq: 1046, start: 0,    duration: 0.12 },
    { freq: 1318, start: 0.15, duration: 0.12 },
    { freq: 1046, start: 0.30, duration: 0.12 },
    { freq: 1567, start: 0.45, duration: 0.22 },
  ];

  pattern.forEach(({ freq, start, duration }) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);

    // Volume molto alto (0.9)
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.9, now + start + 0.01);
    gain.gain.setValueAtTime(0.9, now + start + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, now + start + duration);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });
}

export function useOrderAlarm(hasPendingOrders) {
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (hasPendingOrders) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Resume se sospeso (policy browser)
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const beep = () => {
        try {
          playAlertSequence(audioCtxRef.current);
        } catch (e) {
          console.warn('Audio non disponibile', e);
        }
      };

      beep();
      // Ripeti ogni 4 secondi come Glovo
      intervalRef.current = setInterval(beep, 4000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasPendingOrders]);
}