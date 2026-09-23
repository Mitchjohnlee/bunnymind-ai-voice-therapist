import { useState, useRef, useEffect, useCallback } from 'react';
import { AmbientSoundType } from '../types';

export function useAmbientAudio() {
  const [ambientType, setAmbientType] = useState<AmbientSoundType>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const stopCurrent = useCallback(() => {
    nodesRef.current.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    nodesRef.current = [];
    setIsPlaying(false);
  }, []);

  const playSound = useCallback(
    (type: AmbientSoundType, volume = ambientVolume) => {
      stopCurrent();
      if (type === 'none') {
        setAmbientType('none');
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = audioCtxRef.current || new AudioContextClass();
        audioCtxRef.current = ctx;

        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(volume, ctx.currentTime);
        mainGain.connect(ctx.destination);
        gainNodeRef.current = mainGain;

        const newNodes: AudioNode[] = [mainGain];

        if (type === 'rain' || type === 'pink_noise' || type === 'stream') {
          // Generate filtered white/pink noise buffer
          const bufferSize = ctx.sampleRate * 2;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);

          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
          }

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          whiteNoise.loop = true;

          // Gentle filter
          const filter = ctx.createBiquadFilter();
          if (type === 'rain') {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, ctx.currentTime);
          } else if (type === 'stream') {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(550, ctx.currentTime);
            filter.Q.setValueAtTime(1.5, ctx.currentTime);
          } else {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, ctx.currentTime);
          }

          whiteNoise.connect(filter);
          filter.connect(mainGain);
          whiteNoise.start();

          newNodes.push(whiteNoise, filter);
        } else if (type === 'zen') {
          // Zen singing bowl harmonic drone: 108Hz, 216Hz, 432Hz with soft vibrato
          const freqs = [108, 216, 324, 432];
          freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();

            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            // Subtle gentle pulse
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.setValueAtTime(0.15 + idx * 0.05, ctx.currentTime);
            lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);

            lfo.connect(lfoGain);
            lfoGain.connect(oscGain.gain);

            oscGain.gain.setValueAtTime(0.18 / (idx + 1), ctx.currentTime);
            osc.connect(oscGain);
            oscGain.connect(mainGain);

            osc.start();
            lfo.start();
            newNodes.push(osc, oscGain, lfo, lfoGain);
          });
        }

        nodesRef.current = newNodes;
        setAmbientType(type);
        setIsPlaying(true);
      } catch (err) {
        console.warn('Could not start ambient audio:', err);
      }
    },
    [ambientVolume, stopCurrent]
  );

  const updateVolume = useCallback((vol: number) => {
    setAmbientVolume(vol);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCurrent();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [stopCurrent]);

  return {
    ambientType,
    ambientVolume,
    isPlaying,
    playSound,
    updateVolume,
    stopCurrent,
  };
}
