import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceSettings } from '../types';

interface QueuedSentence {
  text: string;
  audioPromise: Promise<AudioBuffer | null>;
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechVolume, setSpeechVolume] = useState(0); // 0 to 1 for dynamic lip-sync mouth shape
  const [currentWord, setCurrentWord] = useState<string>('');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  // Queue state for low-latency streaming sentences
  const sentenceQueueRef = useRef<QueuedSentence[]>([]);
  const isPlayingQueueRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Initialize and load available system voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    isPlayingQueueRef.current = false;
    sentenceQueueRef.current = [];

    // Stop native speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Stop Web Audio playback if active
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // ignore
      }
      audioSourceRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setIsSpeaking(false);
    setIsLoadingAudio(false);
    setSpeechVolume(0);
    setCurrentWord('');
    if (onCompleteRef.current) {
      const cb = onCompleteRef.current;
      onCompleteRef.current = null;
      cb();
    }
  }, []);

  // Set up lip sync analyser loop
  const attachAnalyser = useCallback((source: AudioBufferSourceNode, ctx: AudioContext) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.35;
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let mouthWiggle = 0;

    const checkVolume = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      // Real frequency energy normalized from 0 to 1
      const realVolume = Math.min(1, avg / 45);

      mouthWiggle += 0.3;
      const naturalSyllablePulse = Math.sin(mouthWiggle) * 0.18;
      const finalVolume = realVolume > 0.04
        ? Math.min(1, Math.max(0.2, realVolume + naturalSyllablePulse))
        : Math.max(0, realVolume);

      setSpeechVolume(finalVolume);
      animFrameRef.current = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }, []);

  // Fetch audio buffer from ElevenLabs
  const fetchElevenLabsBuffer = useCallback(
    async (text: string, settings: VoiceSettings, ctx: AudioContext): Promise<AudioBuffer | null> => {
      try {
        const response = await fetch('/api/tts/elevenlabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId: settings.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL',
            userApiKey: settings.elevenLabsApiKey || 'sk_ce27a260858f17672c36d9aae43c6d9a57200265b06670fc',
          }),
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) return null;
        return await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn('ElevenLabs fetch failed:', e);
        return null;
      }
    },
    []
  );

  // Fetch audio buffer from FreeTTS
  const fetchFreeTtsBuffer = useCallback(
    async (text: string, settings: VoiceSettings, ctx: AudioContext): Promise<AudioBuffer | null> => {
      try {
        const response = await fetch('/api/tts/freetts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: settings.freeTtsVoice || 'en-US-AvaNeural',
            rate: settings.freeTtsRate || '+0%',
            pitch: settings.freeTtsPitch || '+0Hz',
          }),
        });

        if (!response.ok) {
          throw new Error(`FreeTTS error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) return null;
        return await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn('FreeTTS fetch failed:', e);
        return null;
      }
    },
    []
  );

  // Play a single AudioBuffer with lipsync
  const playAudioBuffer = useCallback(
    (buffer: AudioBuffer, onEnded: () => void) => {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      audioSourceRef.current = source;

      attachAnalyser(source, ctx);

      source.onended = () => {
        audioSourceRef.current = null;
        onEnded();
      };

      source.start(0);
      setIsSpeaking(true);
      setIsLoadingAudio(false);
    },
    [attachAnalyser, getAudioContext]
  );

  // Process sentence queue sequentially
  const processQueue = useCallback(async () => {
    if (isPlayingQueueRef.current || isCancelledRef.current) return;
    if (sentenceQueueRef.current.length === 0) {
      setIsSpeaking(false);
      setSpeechVolume(0);
      return;
    }

    isPlayingQueueRef.current = true;
    setIsSpeaking(true);

    while (sentenceQueueRef.current.length > 0) {
      if (isCancelledRef.current) break;

      const nextItem = sentenceQueueRef.current.shift();
      if (!nextItem) break;

      const buffer = await nextItem.audioPromise;
      if (isCancelledRef.current) break;

      if (buffer) {
        await new Promise<void>((resolve) => {
          playAudioBuffer(buffer, () => {
            resolve();
          });
        });
      }
    }

    isPlayingQueueRef.current = false;
    if (sentenceQueueRef.current.length === 0) {
      setIsSpeaking(false);
      setSpeechVolume(0);
      if (onCompleteRef.current) {
        const cb = onCompleteRef.current;
        onCompleteRef.current = null;
        cb();
      }
    }
  }, [playAudioBuffer]);

  // Helper to remove visual stage actions (*adjusts tiny spectacles*, parentheses, brackets) so TTS speaks purely dialogue
  const cleanForSpeech = useCallback((rawText: string) => {
    return rawText
      .replace(/\*[^*]*\*/g, '') // strip visual asterisk actions completely
      .replace(/\([^\)]*\)/g, '') // strip parenthetical descriptions
      .replace(/\[[^\]]*\]/g, '') // strip bracketed tags
      .replace(/[*#_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Queue a sentence for instant, pipelined low-latency speech
  const queueSentence = useCallback(
    (sentence: string, settings: VoiceSettings) => {
      const cleanText = cleanForSpeech(sentence);
      if (!cleanText) return;

      isCancelledRef.current = false;
      const ctx = getAudioContext();

      // Begin pre-fetching audio immediately in background!
      const audioPromise =
        settings.engine === 'elevenlabs' || !settings.engine
          ? fetchElevenLabsBuffer(cleanText, settings, ctx)
          : settings.engine === 'freetts'
          ? fetchFreeTtsBuffer(cleanText, settings, ctx)
          : Promise.resolve(null);

      sentenceQueueRef.current.push({ text: cleanText, audioPromise });

      if (!isPlayingQueueRef.current) {
        setIsLoadingAudio(true);
        processQueue();
      }
    },
    [cleanForSpeech, fetchElevenLabsBuffer, fetchFreeTtsBuffer, getAudioContext, processQueue]
  );

  // Native Speech Synthesis fallback
  const speakNative = useCallback(
    (text: string, settings: VoiceSettings, onComplete?: () => void) => {
      const clean = cleanForSpeech(text);
      if (!clean || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onComplete?.();
        return;
      }

      stop();
      onCompleteRef.current = onComplete || null;

      const utterance = new SpeechSynthesisUtterance(clean);
      utteranceRef.current = utterance;

      if (settings.nativeVoiceURI) {
        const selected = voices.find((v) => v.voiceURI === settings.nativeVoiceURI);
        if (selected) utterance.voice = selected;
      } else {
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Samantha') ||
              v.name.includes('Victoria') ||
              v.name.includes('Google US English') ||
              v.name.includes('Natural'))
        );
        if (preferred) utterance.voice = preferred;
      }

      utterance.pitch = settings.pitch ?? 1.15;
      utterance.rate = settings.rate ?? 0.95;
      utterance.volume = settings.volume ?? 1;

      let mouthCycle = 0;
      const animateMouth = () => {
        mouthCycle += 0.28;
        const pseudoAmp = Math.abs(Math.sin(mouthCycle)) * 0.75 + Math.random() * 0.25;
        setSpeechVolume(pseudoAmp);
        animFrameRef.current = requestAnimationFrame(animateMouth);
      };

      utterance.onstart = () => {
        setIsSpeaking(true);
        animateMouth();
      };

      utterance.onend = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setIsSpeaking(false);
        setSpeechVolume(0);
        setCurrentWord('');
        if (onCompleteRef.current) {
          const cb = onCompleteRef.current;
          onCompleteRef.current = null;
          cb();
        }
      };

      utterance.onerror = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setIsSpeaking(false);
        setSpeechVolume(0);
        setCurrentWord('');
        if (onCompleteRef.current) {
          const cb = onCompleteRef.current;
          onCompleteRef.current = null;
          cb();
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [stop, voices]
  );

  // Speak full text (useful for test buttons and single phrases)
  const speak = useCallback(
    async (text: string, settings: VoiceSettings, onComplete?: () => void) => {
      const clean = cleanForSpeech(text);
      if (!clean) return;

      stop();
      onCompleteRef.current = onComplete || null;

      if (settings.engine === 'native') {
        speakNative(clean, settings, onComplete);
        return;
      }

      setIsLoadingAudio(true);
      const ctx = getAudioContext();

      let buffer: AudioBuffer | null = null;
      if (settings.engine === 'elevenlabs' || !settings.engine) {
        buffer = await fetchElevenLabsBuffer(clean, settings, ctx);
      }
      if (!buffer && (settings.engine === 'freetts' || settings.engine === 'elevenlabs')) {
        buffer = await fetchFreeTtsBuffer(clean, settings, ctx);
      }

      if (buffer) {
        playAudioBuffer(buffer, () => {
          setIsSpeaking(false);
          setSpeechVolume(0);
          if (onCompleteRef.current) {
            const cb = onCompleteRef.current;
            onCompleteRef.current = null;
            cb();
          }
        });
      } else {
        speakNative(clean, settings, onComplete);
      }
    },
    [fetchElevenLabsBuffer, fetchFreeTtsBuffer, getAudioContext, playAudioBuffer, speakNative, stop]
  );

  return {
    isSpeaking,
    isLoadingAudio,
    speechVolume,
    currentWord,
    voices,
    speak,
    queueSentence,
    stop,
  };
}
