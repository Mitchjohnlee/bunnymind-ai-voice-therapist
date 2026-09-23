import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '../types';
import { Copy, Check, Trash2, ChevronDown, ChevronUp, History, Volume2, User } from 'lucide-react';

interface TranscriptViewProps {
  currentTranscript: string;
  interimTranscript: string;
  lastReply: string;
  isListening: boolean;
  isSpeaking: boolean;
  history: ChatMessage[];
  onClearHistory: () => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  currentTranscript,
  interimTranscript,
  lastReply,
  isListening,
  isSpeaking,
  history,
  onClearHistory,
}) => {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showFullHistory && historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
    }
  }, [history, showFullHistory]);

  const handleCopyHistory = () => {
    if (history.length === 0) return;
    const formatted = history
      .map((m) => `[${m.role === 'user' ? 'Ashley' : 'Mochi'}]: ${m.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeUserSpeech = (currentTranscript + (interimTranscript ? ` ${interimTranscript}` : '')).trim();

  // The latest reply to show in the primary speech bubble
  const displayedMessage = activeUserSpeech
    ? `“${activeUserSpeech}”`
    : lastReply || "Hello — I’m Mochi. I’m all ears whenever you want to talk. What’s been sitting with you today?";

  return (
    <div className="w-full max-w-xl mx-auto px-2 sm:px-4 mt-1">
      {/* Primary Speech Bubble matching Screenshot 1 */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Adorable Mochi bunny outline icon on left */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#E8DFD3] flex items-center justify-center shrink-0 mt-1 shadow-2xs">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 sm:w-5 sm:h-5 text-[#8C8278]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Left ear */}
            <path d="M 8.5 9 C 7.5 5 7.5 2 9.5 2 C 11 2 11 5 10.5 9" />
            {/* Right ear */}
            <path d="M 13.5 9 C 13 5 13 2 14.5 2 C 16.5 2 16.5 5 15.5 9" />
            {/* Head outline */}
            <ellipse cx="12" cy="14" rx="6.5" ry="5.8" />
            {/* Eyes */}
            <circle cx="10" cy="13.5" r="0.75" fill="currentColor" />
            <circle cx="14" cy="13.5" r="0.75" fill="currentColor" />
            {/* Nose */}
            <path d="M 11.5 15.2 Q 12 15.8 12.5 15.2" />
          </svg>
        </div>

        {/* Speech Bubble */}
        <div
          className={`flex-1 rounded-2xl rounded-tl-sm p-4 sm:p-4.5 border shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all ${
            activeUserSpeech
              ? 'bg-[#F2F7F4] border-[#CFDFD7] text-[#294A3B]'
              : 'bg-white border-[#EBE3D7] text-[#3A322C]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm sm:text-[14.5px] leading-relaxed font-sans">
              {displayedMessage}
            </p>
            {isSpeaking && (
              <span className="shrink-0 p-1 text-[#4A6B5D] animate-pulse">
                <Volume2 className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* History and Session Persistence Controls */}
      <div className="flex items-center justify-between mt-2.5 px-1 text-xs text-[#857B72]">
        <button
          onClick={() => setShowFullHistory((prev) => !prev)}
          className="flex items-center gap-1.5 hover:text-[#2C241F] font-medium transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-[#4A6B5D]" />
          <span>Session Conversation ({history.length})</span>
          {showFullHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyHistory}
              className="flex items-center gap-1 hover:text-[#2C241F] transition-colors cursor-pointer"
              title="Copy session transcript"
            >
              {copied ? <Check className="w-3 h-3 text-[#4A6B5D]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <span>•</span>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 hover:text-[#C8523A] transition-colors cursor-pointer"
              title="Clear current session transcript"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Expandable History Drawer */}
      <AnimatePresence>
        {showFullHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3 sm:p-4 rounded-2xl bg-white border border-[#EAE2D5] shadow-sm overflow-hidden"
          >
            <div
              ref={historyScrollRef}
              className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#DDD4C5]"
            >
              {history.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8C8379] mb-1">
                      {isUser ? (
                        <>
                          <span>Ashley</span>
                          <User className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B5D]" />
                          <span>Mochi</span>
                        </>
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#4A6B5D] text-white rounded-tr-xs'
                          : 'bg-[#F7F4EE] border border-[#EAE2D5] text-[#332A25] rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
