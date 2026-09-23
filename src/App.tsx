/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BunnyAvatar } from './components/BunnyAvatar';
import { Controls } from './components/Controls';
import { TranscriptView } from './components/TranscriptView';
import { BreathingExercise } from './components/BreathingExercise';
import { SettingsModal } from './components/SettingsModal';
import { CursorGuideModal } from './components/CursorGuideModal';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useAmbientAudio } from './hooks/useAmbientAudio';
import { ChatMessage, VoiceSettings, AvatarMood } from './types';
import { SlidersHorizontal, Wind, Music, Terminal, MessageCircleHeart } from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  engine: 'elevenlabs',
  elevenLabsVoiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica (Playful, Bright & Warm) - Default
  elevenLabsApiKey: 'sk_ce27a260858f17672c36d9aae43c6d9a57200265b06670fc',
  freeTtsVoice: 'en-US-AvaNeural',
  freeTtsRate: '+0%',
  freeTtsPitch: '+0Hz',
  nativeVoiceURI: '',
  pitch: 1.35,
  rate: 1.0,
  volume: 1,
  autoListen: false,
};

const INITIAL_GREETING = "Hello — I’m Mochi. I’m all ears whenever you want to talk. What’s been sitting with you today, Ashley?";

const SUGGESTED_PATIENT_TOPICS = [
  { label: "💔 Feeling conflicted in our relationship...", prompt: "Bunny, I've been feeling really conflicted and tired in my relationship lately, and I just needed a place to talk it through." },
  { label: "💡 We keep having the same argument, what should I do?", prompt: "Bunny, we keep having the same argument and I feel completely stuck. What practical solutions or steps should I take?" },
  { label: "🌩️ We had an argument and I felt disconnected...", prompt: "We had a really hard argument recently, and I ended up feeling shut down and hurt." },
  { label: "🥺 I find it hard to express what I really need...", prompt: "I find myself holding back my true feelings because I'm afraid of causing tension or being dismissed. How can I communicate this?" },
  { label: "🌿 I feel emotionally exhausted today...", prompt: "I'm having a very overwhelming day, Bunny, and I feel like I'm carrying everything inside." },
];

export default function App() {
  // Voice Settings & Persistence (Default to Jessica on ultra-fast ElevenLabs)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('ashley_voice_settings') || localStorage.getItem('bunnymind_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.engine || parsed.engine === 'freetts') {
          parsed.engine = 'elevenlabs';
        }
        // Ensure Jessica is default and migrate from legacy Sarah
        if (!parsed.elevenLabsVoiceId || parsed.elevenLabsVoiceId === 'EXAVITQu4vr4xnSDxMaL') {
          parsed.elevenLabsVoiceId = 'cgSgspJ2msm6clMCkdW9';
        }
        if (!parsed.elevenLabsApiKey) {
          parsed.elevenLabsApiKey = 'sk_ce27a260858f17672c36d9aae43c6d9a57200265b06670fc';
        }
        return {
          ...DEFAULT_VOICE_SETTINGS,
          ...parsed,
          elevenLabsVoiceId: parsed.elevenLabsVoiceId === 'EXAVITQu4vr4xnSDxMaL' ? 'cgSgspJ2msm6clMCkdW9' : (parsed.elevenLabsVoiceId || 'cgSgspJ2msm6clMCkdW9'),
        };
      }
      return DEFAULT_VOICE_SETTINGS;
    } catch {
      return DEFAULT_VOICE_SETTINGS;
    }
  });

  // Persistent Session State - ensures Ashley's conversation is never lost
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ashley_therapy_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'initial-greeting',
        role: 'model',
        text: INITIAL_GREETING,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  // Automatically store Ashley's full ongoing therapy conversation
  useEffect(() => {
    try {
      localStorage.setItem('ashley_therapy_chat_history', JSON.stringify(chatHistory));
    } catch (e) {
      console.warn('Failed to save therapy session history:', e);
    }
  }, [chatHistory]);

  const [activeMood, setActiveMood] = useState<string>('peaceful');
  const [lastReply, setLastReply] = useState<string>(() => {
    const lastModel = [...chatHistory].reverse().find((m) => m.role === 'model');
    return lastModel ? lastModel.text : INITIAL_GREETING;
  });
  const [isThinking, setIsThinking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modals
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCursorGuideOpen, setIsCursorGuideOpen] = useState(false);

  // Audio Hooks
  const {
    isSpeaking,
    isLoadingAudio,
    speechVolume,
    currentWord,
    voices,
    speak,
    queueSentence,
    stop: stopSpeaking,
  } = useSpeechSynthesis();

  const {
    ambientType,
    ambientVolume,
    isPlaying: isAmbientPlaying,
    playSound: playAmbient,
    updateVolume: updateAmbientVolume,
    stopCurrent: stopAmbient,
  } = useAmbientAudio();

  // Reference for auto-listen chaining to avoid stale closures
  const autoListenRef = useRef(voiceSettings.autoListen);
  autoListenRef.current = voiceSettings.autoListen;

  // Ultra-low latency streaming chat handler
  const handleSendMessage = useCallback(
    async (text: string, moodState = activeMood) => {
      if (!text.trim() || isThinking) return;

      setApiError(null);
      stopSpeaking();

      // Append Ashley's message
      const userMsg: ChatMessage = {
        id: 'user-' + Date.now(),
        role: 'user',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setChatHistory((prev) => [...prev, userMsg]);
      setIsThinking(true);

      const modelMsgId = 'model-' + Date.now();
      let accumulatedText = '';

      try {
        // Send up to 24 previous turns so Dr. Fluff keeps context over a 30-60 minute session
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            history: chatHistory.slice(-24).map((m) => ({
              role: m.role,
              text: m.text,
            })),
            mood: moodState,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream returned status ${response.status}`);
        }

        // Add model placeholder
        setChatHistory((prev) => [
          ...prev,
          {
            id: modelMsgId,
            role: 'model',
            text: '...',
            timestamp: new Date().toISOString(),
          },
        ]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line.trim());
              if (data.type === 'sentence' && data.text) {
                const sentence = data.text.trim();
                accumulatedText += (accumulatedText ? ' ' : '') + sentence;

                setIsThinking(false);
                setLastReply(accumulatedText);

                setChatHistory((prev) =>
                  prev.map((msg) =>
                    msg.id === modelMsgId ? { ...msg, text: accumulatedText } : msg
                  )
                );

                // Queue sentence into low-latency ElevenLabs audio pipeline
                queueSentence(sentence, voiceSettings);
              } else if (data.type === 'done') {
                setIsThinking(false);
              }
            } catch {
              // Ignore line parse boundary
            }
          }
        }

        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim());
            if (data.type === 'sentence' && data.text) {
              accumulatedText += (accumulatedText ? ' ' : '') + data.text.trim();
              setLastReply(accumulatedText);
              setChatHistory((prev) =>
                prev.map((msg) =>
                  msg.id === modelMsgId ? { ...msg, text: accumulatedText } : msg
                )
              );
              queueSentence(data.text.trim(), voiceSettings);
            }
          } catch {}
        }

        if (!accumulatedText) {
          const fallback = "I am right here with you, Ashley. Soft snuffle... Take your time. What are you feeling right now?";
          setChatHistory((prev) =>
            prev.map((msg) =>
              msg.id === modelMsgId ? { ...msg, text: fallback } : msg
            )
          );
          setLastReply(fallback);
          queueSentence(fallback, voiceSettings);
        }
      } catch (err: any) {
        console.warn('Streaming chat failed, falling back to /api/chat:', err);
        // Fallback to standard /api/chat
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text.trim(),
              history: chatHistory.slice(-24).map((m) => ({
                role: m.role,
                text: m.text,
              })),
              mood: moodState,
            }),
          });
          const data = await res.json();
          const replyText = data.text || "I am right here listening closely, Ashley. Take a soft breath.";

          setChatHistory((prev) => {
            const exists = prev.some((m) => m.id === modelMsgId);
            if (exists) {
              return prev.map((m) => (m.id === modelMsgId ? { ...m, text: replyText } : m));
            }
            return [
              ...prev,
              {
                id: modelMsgId,
                role: 'model',
                text: replyText,
                timestamp: new Date().toISOString(),
              },
            ];
          });

          setLastReply(replyText);
          setIsThinking(false);
          queueSentence(replyText, voiceSettings);
        } catch (fallbackErr: any) {
          setIsThinking(false);
          setApiError('Unable to connect to Dr. Fluff. Please try speaking again, Ashley.');
        }
      }
    },
    [activeMood, chatHistory, isThinking, queueSentence, voiceSettings, stopSpeaking]
  );

  // Speech Recognition (STT) Hook with VAD, mic meter & multimodal fallback
  const {
    isListening,
    isTranscribing,
    hasDetectedSpeech,
    micLevel,
    transcript,
    interimTranscript,
    isSupported: isSTTSupported,
    errorMessage: sttError,
    statusMessage,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  } = useSpeechRecognition({
    onFinalResult: (finalText) => {
      if (finalText.trim()) {
        handleSendMessage(finalText.trim());
        resetTranscript();
      }
    },
  });

  // Toggle microphone - clicking either the button or Dr. Fluff acts as mic control
  const handleToggleListen = useCallback(() => {
    if (isTranscribing) {
      cancelListening();
      resetTranscript();
    } else if (isListening) {
      stopListening();
    } else {
      if (isSpeaking) {
        stopSpeaking();
      }
      resetTranscript();
      startListening();
    }
  }, [cancelListening, isListening, isSpeaking, isTranscribing, resetTranscript, startListening, stopListening, stopSpeaking]);

  // Persist settings
  const handleUpdateSettings = (newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('bunnymind_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Test voice in settings
  const handleTestVoice = () => {
    speak("Hello Ashley... Snuffle... I am right here listening to your heart.", voiceSettings);
  };

  // Celebrate with gentle confetti
  const triggerGentleConfetti = () => {
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#FED7E2', '#DDD6FE', '#A7F3D0'],
      disableForReducedMotion: true,
    });
  };

  // Avatar Mood state
  const avatarMood: AvatarMood = isBreathingOpen ? 'breathing' : 'idle';

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col justify-between text-[#3D352E] selection:bg-[#EAE2D5] selection:text-[#2C2420]">
      {/* Top Navigation Bar Matching Screenshot 1 */}
      <header className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 flex items-start justify-between">
        {/* Brand: "Ashley's Therapist" */}
        <div className="flex flex-col">
          <h1
            onClick={triggerGentleConfetti}
            className="font-serif italic font-bold text-2xl sm:text-[32px] text-[#2C241F] tracking-tight cursor-pointer hover:opacity-90 transition-opacity"
            title="Ashley's Therapist"
          >
            Ashley's Therapist
          </h1>
          <p className="text-xs sm:text-[13px] text-[#877E75] font-normal tracking-wide mt-0.5">
            a little listening friend
          </p>
        </div>

        {/* Action Shortcuts Matching Screenshot 1 */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Calming Breath */}
          <button
            onClick={() => setIsBreathingOpen(true)}
            className="p-2 rounded-full hover:bg-[#EFE8DC] text-[#7A7167] hover:text-[#2C241F] transition-colors cursor-pointer"
            title="Guided Breath"
          >
            <Wind className="w-5 h-5" />
          </button>

          {/* Ambient Rain Sound */}
          <button
            onClick={() => {
              if (isAmbientPlaying) {
                stopAmbient();
              } else {
                playAmbient('rain');
              }
            }}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isAmbientPlaying
                ? 'text-[#4A6B5D] bg-[#EAE3D6]'
                : 'text-[#7A7167] hover:bg-[#EFE8DC] hover:text-[#2C241F]'
            }`}
            title={isAmbientPlaying ? 'Mute rain' : 'Play calming rain sound'}
          >
            <Music className="w-5 h-5" />
          </button>

          {/* Settings: Bring Mochi to life (matching Screenshot 1 top-right icon) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-[#EFE8DC] text-[#3D352E] hover:text-[#2C241F] transition-colors cursor-pointer"
            title="Bring Mochi to life"
            aria-label="Bring Mochi to life settings"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Center Stage Matching Screenshot 1 */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto px-3 sm:px-4 py-1 sm:py-2">
        {/* Centerpiece: Mochi Bunny Avatar with Circular Garden Vignette */}
        <BunnyAvatar
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking || isLoadingAudio}
          isTranscribing={isTranscribing}
          speechVolume={speechVolume}
          currentWord={currentWord}
          mood={avatarMood}
          onClick={handleToggleListen}
          micLevel={micLevel}
          hasDetectedSpeech={hasDetectedSpeech}
        />

        {/* Input Controls: Italic Prompt, Text Field Pill, Circular Mic, Warning Banner */}
        <div className="w-full mt-2 sm:mt-3">
          <Controls
            isListening={isListening}
            isSpeaking={isSpeaking}
            isThinking={isThinking || isLoadingAudio}
            isSupported={isSTTSupported}
            autoListen={voiceSettings.autoListen}
            micLevel={micLevel}
            isTranscribing={isTranscribing}
            hasDetectedSpeech={hasDetectedSpeech}
            statusMessage={statusMessage}
            errorMessage={sttError || apiError}
            onToggleListen={handleToggleListen}
            onStopSpeaking={stopSpeaking}
            onSendMessage={handleSendMessage}
            onToggleAutoListen={() =>
              handleUpdateSettings({ autoListen: !voiceSettings.autoListen })
            }
          />
        </div>

        {/* Chat / Transcript Speech Bubble Matching Screenshot 1 */}
        <div className="w-full mt-4">
          <TranscriptView
            currentTranscript={transcript}
            interimTranscript={interimTranscript}
            lastReply={lastReply}
            isListening={isListening}
            isSpeaking={isSpeaking}
            history={chatHistory}
            onClearHistory={() => {
              const freshGreeting: ChatMessage = {
                id: 'cleared-session-' + Date.now(),
                role: 'model',
                text: "Hello — I’m Mochi. I’m all ears whenever you want to talk. What’s been sitting with you today, Ashley?",
                timestamp: new Date().toISOString(),
              };
              setChatHistory([freshGreeting]);
              setLastReply("Hello — I’m Mochi. I’m all ears whenever you want to talk. What’s been sitting with you today, Ashley?");
              try {
                localStorage.setItem('ashley_therapy_chat_history', JSON.stringify([freshGreeting]));
              } catch {}
            }}
          />
        </div>

        {/* Quick Patient Discussion Starters */}
        <div className="w-full max-w-xl mx-auto mt-3 px-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[11px] font-semibold text-[#8C7A68] whitespace-nowrap flex items-center gap-1">
              <MessageCircleHeart className="w-3 h-3 text-[#4A6B5D]" /> Discuss:
            </span>
            {SUGGESTED_PATIENT_TOPICS.map((topic, i) => (
              <button
                key={i}
                disabled={isThinking || isListening || isSpeaking}
                onClick={() => handleSendMessage(topic.prompt)}
                className="text-[11px] px-3 py-1 rounded-full bg-white/80 hover:bg-white text-[#524941] hover:text-[#2C241F] border border-[#E5DFD4] hover:border-[#CFBFAB] transition-all whitespace-nowrap cursor-pointer shadow-2xs disabled:opacity-40"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Subtle Grounding Footer */}
      <footer className="w-full max-w-2xl mx-auto px-4 py-3 text-center flex flex-col items-center gap-1 mt-auto text-[11px] text-[#9E958C]">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>Ashley’s listening sanctuary with Mochi. Take all the time you need.</span>
          <span>•</span>
          <span>In crisis? Call or text <strong className="text-[#5C5248]">988</strong> anytime.</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#B0A79E]">
          <span>Sessions stored privately in your browser</span>
          <span>•</span>
          <button
            onClick={() => setIsCursorGuideOpen(true)}
            className="hover:text-[#5C5248] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Terminal className="w-2.5 h-2.5" />
            <span>Prompt Guide</span>
          </button>
        </div>
      </footer>

      {/* Guided 4-7-8 Breathing Modal */}
      <BreathingExercise isOpen={isBreathingOpen} onClose={() => setIsBreathingOpen(false)} />

      {/* Voice & Atmosphere Settings Modal matching Screenshot 2 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={voiceSettings}
        onSave={handleUpdateSettings}
        onTestVoice={handleTestVoice}
      />

      {/* Cursor Prompt & MCP Integration Guide Modal */}
      <CursorGuideModal
        isOpen={isCursorGuideOpen}
        onClose={() => setIsCursorGuideOpen(false)}
      />
    </div>
  );
}
