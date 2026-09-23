import { useState, useEffect, useRef, useCallback } from 'react';

// Declarations for browser SpeechRecognition API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

interface UseSpeechRecognitionOptions {
  onFinalResult?: (transcript: string) => void;
  lang?: string;
}

export function useSpeechRecognition({ onFinalResult, lang = 'en-US' }: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasDetectedSpeech, setHasDetectedSpeech] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0); // 0 to 1 for live microphone meter
  const [statusMessage, setStatusMessage] = useState<string>('');

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // VAD state refs
  const hasSpokenRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const listenStartTimeRef = useRef<number>(0);
  const accumulatedFinalRef = useRef('');
  const stopListeningRef = useRef<() => void>(() => {});
  const isStoppingRef = useRef(false);

  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  useEffect(() => {
    const hasGetUserMedia = typeof navigator !== 'undefined' && Boolean(navigator?.mediaDevices?.getUserMedia);
    const hasSpeechRec = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    setIsSupported(hasGetUserMedia || hasSpeechRec);
  }, []);

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    setMicLevel(0);
  }, []);

  const cancelListening = useCallback(() => {
    isStoppingRef.current = true;
    setIsListening(false);
    setIsTranscribing(false);
    setHasDetectedSpeech(false);
    setStatusMessage('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }

    cleanupAudio();
  }, [cleanupAudio]);

  const stopListening = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setIsListening(false);

    // Stop SpeechRecognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
    }

    // Stop MediaRecorder if recording; its onstop will process the audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
        cleanupAudio();
      }
    } else {
      cleanupAudio();
    }
  }, [cleanupAudio]);

  stopListeningRef.current = stopListening;

  const startListening = useCallback(async () => {
    isStoppingRef.current = false;
    setErrorMessage(null);
    setTranscript('');
    setInterimTranscript('');
    setStatusMessage('Listening... Speak to Dr. Fluff');
    accumulatedFinalRef.current = '';
    audioChunksRef.current = [];
    hasSpokenRef.current = false;
    setHasDetectedSpeech(false);
    listenStartTimeRef.current = Date.now();
    lastSpeechTimeRef.current = 0;

    // 1. Explicitly activate microphone hardware via getUserMedia
    let stream: MediaStream;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No microphone device found on your device.');
      } else {
        setErrorMessage(`Microphone error: ${err.message || 'Could not start audio input'}`);
      }
      setIsListening(false);
      return;
    }

    // 2. Set up live audio analyser for real-time visual meter AND Voice Activity Detection (VAD)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      micAnalyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVADandMeter = () => {
        if (!micAnalyserRef.current || isStoppingRef.current) return;
        micAnalyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 55);
        setMicLevel(normalized);

        const now = Date.now();

        // Speech Energy Threshold
        if (normalized > 0.08) {
          if (!hasSpokenRef.current) {
            hasSpokenRef.current = true;
            setHasDetectedSpeech(true);
            setStatusMessage('Hearing you speak...');
          }
          lastSpeechTimeRef.current = now;
        }

        // Voice Activity Detection (VAD) Auto-Stop:
        // Wait for a natural 4-second pause in speech before concluding
        if (hasSpokenRef.current && lastSpeechTimeRef.current > 0) {
          const silenceDuration = now - lastSpeechTimeRef.current;
          if (silenceDuration >= 4000) {
            setStatusMessage('Pause detected. Sending to Dr. Fluff...');
            stopListeningRef.current();
            return;
          }
        }

        // Timeout check: If 15 seconds have passed without ANY voice detected, prompt user
        if (!hasSpokenRef.current && now - listenStartTimeRef.current > 15000) {
          setStatusMessage("I'm right here listening, Ashley. Tap Dr. Fluff or the mic when you're ready.");
          stopListeningRef.current();
          return;
        }

        animFrameRef.current = requestAnimationFrame(updateVADandMeter);
      };

      animFrameRef.current = requestAnimationFrame(updateVADandMeter);
    } catch (e) {
      console.warn('Could not initialize audio meter / VAD:', e);
    }

    // 3. Set up MediaRecorder for lossless backup & Gemini multimodal transcription
    let recorder: MediaRecorder | null = null;
    try {
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        '',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (!mime || MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        cleanupAudio();

        // 1) First check: Did browser SpeechRecognition already provide a solid transcript?
        const existingTranscript = accumulatedFinalRef.current.trim();
        if (existingTranscript && existingTranscript.length > 2) {
          setStatusMessage('');
          setTranscript(existingTranscript);
          onFinalResultRef.current?.(existingTranscript);
          return;
        }

        // 2) Multimodal Gemini transcription fallback
        if (audioChunksRef.current.length > 0) {
          const mimeType = recorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          // If blob is negligible (< 100 bytes), skip
          if (audioBlob.size < 150) {
            setStatusMessage('');
            return;
          }

          setIsTranscribing(true);
          setStatusMessage('Understanding your words...');

          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              try {
                const res = await fetch('/api/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
                });

                if (res.ok) {
                  const data = await res.json();
                  const finalServerText = (data.transcript || '').trim();
                  if (finalServerText) {
                    setTranscript(finalServerText);
                    onFinalResultRef.current?.(finalServerText);
                  } else {
                    setStatusMessage("Could not make out speech. Please tap the mic and try again.");
                  }
                }
              } catch (transcribeErr) {
                console.warn('Server transcription error:', transcribeErr);
              } finally {
                setIsTranscribing(false);
                setStatusMessage('');
              }
            };
          } catch (e) {
            console.warn('Error reading audio blob:', e);
            setIsTranscribing(false);
            setStatusMessage('');
          }
        } else {
          setStatusMessage('');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // 100ms slices for smooth chunk collection
    } catch (recErr) {
      console.warn('MediaRecorder could not start:', recErr);
    }

    // 4. Concurrently run browser SpeechRecognition if available for instantaneous live typing
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionConstructor) {
      try {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            const text = result[0].transcript;
            if (result.isFinal) {
              accumulatedFinalRef.current += (accumulatedFinalRef.current ? ' ' : '') + text.trim();
              setTranscript(accumulatedFinalRef.current);
            } else {
              currentInterim += text;
            }
          }
          setInterimTranscript(currentInterim);
          if (currentInterim.trim() || accumulatedFinalRef.current.trim()) {
            hasSpokenRef.current = true;
            setHasDetectedSpeech(true);
            lastSpeechTimeRef.current = Date.now();
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('SpeechRecognition browser event:', event.error);
        };

        recognition.onend = () => {
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (speechErr) {
        console.warn('Native SpeechRecognition failed to initialize:', speechErr);
      }
    }

    setIsListening(true);
  }, [cleanupAudio, lang]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    accumulatedFinalRef.current = '';
    setStatusMessage('');
  }, []);

  return {
    isListening,
    isTranscribing,
    hasDetectedSpeech,
    micLevel,
    transcript,
    interimTranscript,
    isSupported,
    errorMessage,
    statusMessage,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  };
}
