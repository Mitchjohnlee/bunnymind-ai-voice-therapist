import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ArrowRight, Loader2, Square, Headphones } from 'lucide-react';

interface ControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isSupported: boolean;
  autoListen: boolean;
  micLevel?: number;
  isTranscribing?: boolean;
  hasDetectedSpeech?: boolean;
  statusMessage?: string;
  errorMessage?: string | null;
  onToggleListen: () => void;
  onStopSpeaking: () => void;
  onSendMessage: (text: string) => void;
  onToggleAutoListen: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isListening,
  isSpeaking,
  isThinking,
  isSupported,
  autoListen,
  micLevel = 0,
  isTranscribing = false,
  hasDetectedSpeech = false,
  statusMessage = '',
  errorMessage,
  onToggleListen,
  onStopSpeaking,
  onSendMessage,
  onToggleAutoListen,
}) => {
  const [textMessage, setTextMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Spacebar keyboard shortcut for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space' && !e.repeat && isSupported && !isThinking && !isTranscribing) {
        e.preventDefault();
        onToggleListen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSupported, isThinking, isTranscribing, onToggleListen]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textMessage.trim() || isThinking || isTranscribing) return;
    onSendMessage(textMessage.trim());
    setTextMessage('');
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-4 px-3 sm:px-4">
      {/* 1. Elegant Italic Serif Prompt directly under Mochi (as shown in Screenshot 1) */}
      <div className="text-center py-1">
        <p className="font-serif italic text-base sm:text-[17px] text-[#786F66] tracking-wide transition-all">
          {isTranscribing ? (
            <span className="text-[#4A6B5D] font-medium flex items-center justify-center gap-1.5 not-italic font-sans text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#4A6B5D]" />
              Transcribing your words... (tap to finish)
            </span>
          ) : isListening ? (
            <span className="text-[#3D6653] font-medium flex items-center justify-center gap-1.5 not-italic font-sans text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A6B5D] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A6B5D]" />
              </span>
              {hasDetectedSpeech
                ? 'Hearing you, Ashley... (waiting for 4s pause or tap to send)'
                : 'Listening to you, Ashley... speak freely'}
            </span>
          ) : isThinking ? (
            <span className="text-[#8C7456] font-medium flex items-center justify-center gap-1.5 not-italic font-sans text-sm">
              <span className="w-2 h-2 rounded-full bg-[#C29759] animate-bounce" />
              Mochi is reflecting with you...
            </span>
          ) : isSpeaking ? (
            <span className="text-[#6D6359] not-italic font-sans text-sm flex items-center justify-center gap-2">
              <span>Mochi is speaking with you...</span>
              <button
                onClick={onStopSpeaking}
                className="text-xs px-2.5 py-0.5 rounded-full bg-[#EFE8DC] hover:bg-[#E5DCCF] text-[#423930] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Square className="w-2.5 h-2.5 fill-current" /> Pause
              </button>
            </span>
          ) : (
            'tap the mic and tell Mochi what’s on your mind'
          )}
        </p>
      </div>

      {/* 2. Unified Input Bar + Circular Mic Button (as shown in Screenshot 1) */}
      <div className="w-full flex items-center gap-3">
        {/* Pill-shaped text input */}
        <form
          onSubmit={handleTextSubmit}
          className="flex-1 flex items-center bg-white rounded-full border border-[#E5DFD4] px-4 sm:px-5 py-2 sm:py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:border-[#8FA89B] focus-within:ring-2 focus-within:ring-[#8FA89B]/30 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            disabled={isThinking || isTranscribing}
            placeholder="or type to Bunny..."
            className="w-full bg-transparent text-sm sm:text-[15px] text-[#2C241F] placeholder-[#A49C92] outline-none font-sans"
          />
          <button
            type="submit"
            disabled={!textMessage.trim() || isThinking || isTranscribing}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#4A6B5D] hover:bg-[#3D5C4F] text-white flex items-center justify-center shrink-0 ml-2 disabled:opacity-35 transition-all cursor-pointer"
            aria-label="Send message to Mochi"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Circular Microphone Button */}
        <div className="relative shrink-0 flex items-center justify-center">
          {/* Animated pulsing wave when listening */}
          {isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-[#4A6B5D]/30"
                style={{
                  transform: `scale(${1.2 + micLevel * 0.8})`,
                }}
                transition={{ duration: 0.1 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-[#4A6B5D]/20"
                animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
            </>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            onClick={onToggleListen}
            disabled={!isSupported || isThinking}
            aria-label={isListening ? 'Stop recording voice' : 'Start speaking with Mochi'}
            className={`relative z-10 w-12 h-12 sm:w-[50px] sm:h-[50px] rounded-full flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer ${
              isListening
                ? 'bg-[#3A5D4F] text-white ring-4 ring-[#8FA89B]/40'
                : isTranscribing
                ? 'bg-[#3A5D4F] text-white'
                : isThinking
                ? 'bg-[#E5DCCF] text-[#7A6F64] cursor-wait'
                : 'bg-[#4A6B5D] hover:bg-[#3E5D4F] text-white'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isListening ? (
              <Mic className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>

      {/* 3. Notification Card (Matching Screenshot 1 for microphone permission error) */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="w-full rounded-2xl bg-[#FAF6EE] border border-[#E8E0D2] border-l-4 border-l-[#DF785F] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
          >
            <div className="text-xs sm:text-[13px] text-[#4F463E] leading-relaxed">
              <strong className="text-[#2C241F] font-semibold">Mochi can’t hear you yet.</strong>{' '}
              {errorMessage.includes('permission') || errorMessage.includes('denied') || errorMessage.includes('not-allowed')
                ? 'Microphone access was declined. Allow it from the icon in your browser’s address bar (site settings → Microphone → Allow), then try again — or simply type above.'
                : errorMessage}
            </div>
            <button
              onClick={onToggleListen}
              className="px-4 py-2 rounded-full border border-[#DDD4C5] bg-white text-xs font-semibold text-[#4A6B5D] hover:bg-[#F2ECE0] shrink-0 transition-colors self-start sm:self-auto cursor-pointer"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hands-Free indicator toggle */}
      <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-[#8C8379]">
        <button
          onClick={onToggleAutoListen}
          className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
            autoListen
              ? 'bg-[#EAE4D8] border-[#CFBFAB] text-[#3D352E] font-medium'
              : 'bg-transparent hover:bg-[#EFE9DF] border-transparent text-[#8C8379]'
          }`}
          title="Automatically listens again after Mochi speaks and sends after a 4-second speech pause"
        >
          <Headphones className="w-3 h-3 text-[#6B6158]" />
          <span>Hands-Free Session: {autoListen ? 'ON (4s auto-pause)' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
};
