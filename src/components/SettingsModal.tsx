import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Volume2 } from 'lucide-react';
import { VoiceSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSave: (settings: Partial<VoiceSettings>) => void;
  onTestVoice: () => void;
}

const VOICE_OPTIONS = [
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica (Playful, Bright & Warm) — ElevenLabs Default', engine: 'elevenlabs' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Mature, Reassuring & Calm) — ElevenLabs', engine: 'elevenlabs' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella (Gentle & Soothing) — ElevenLabs', engine: 'elevenlabs' },
  { id: 'en-US-AvaNeural', name: 'Ava (Gentle & Expressive) — Browser Neural', engine: 'freetts' },
  { id: 'en-US-JennyNeural', name: 'Jenny (Clear & Warm) — Browser Neural', engine: 'freetts' },
  { id: 'en-US-EmmaNeural', name: 'Emma (Caring & Soft) — Browser Neural', engine: 'freetts' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onTestVoice,
}) => {
  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });
  const [showKey, setShowKey] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(
    settings.elevenLabsVoiceId || 'cgSgspJ2msm6clMCkdW9'
  );
  const [pitch, setPitch] = useState<number>(settings.pitch || 1.35);

  const handleSave = () => {
    localStorage.setItem('user_gemini_api_key', geminiKey.trim());
    const isEleven = selectedVoice.length > 15;
    onSave({
      engine: isEleven ? 'elevenlabs' : 'freetts',
      elevenLabsVoiceId: isEleven ? selectedVoice : settings.elevenLabsVoiceId,
      freeTtsVoice: !isEleven ? selectedVoice : settings.freeTtsVoice,
      pitch,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl p-6 sm:p-7 shadow-xl border border-[#EBE3D7]"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <h2 className="font-serif text-2xl sm:text-[26px] font-bold text-[#2C2420] tracking-tight">
              Bring Mochi to life
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-[#8C8278] hover:text-[#2C2420] hover:bg-[#EFE8DC] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs sm:text-[13px] text-[#786E65] leading-relaxed mb-6">
            Mochi listens and speaks with your browser’s own voice engine, and thinks with the Google Gemini API. Paste a free API key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold text-[#4A6B5D] hover:text-[#385448]"
            >
              Google AI Studio
            </a>{' '}
            — it is stored only in this browser, never sent anywhere else.
          </p>

          <div className="space-y-4">
            {/* Gemini API Key */}
            <div>
              <label className="block text-xs font-semibold text-[#3D352E] mb-1.5">
                Gemini API key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-2.5 pr-11 bg-white border border-[#DDD5C7] rounded-xl text-sm text-[#2C2420] placeholder-[#AFA79D] focus:outline-none focus:ring-2 focus:ring-[#8FA89B] focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8278] hover:text-[#3D352E] p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#91877E] mt-1">
                Optional: If left blank, the app uses the built-in server proxy.
              </p>
            </div>

            {/* Mochi's Voice */}
            <div>
              <label className="block text-xs font-semibold text-[#3D352E] mb-1.5">
                Mochi’s voice
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#DDD5C7] rounded-xl text-sm text-[#2C2420] focus:outline-none focus:ring-2 focus:ring-[#8FA89B] focus:border-transparent transition-all cursor-pointer"
              >
                {VOICE_OPTIONS.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Pitch */}
            <div>
              <label className="block text-xs font-semibold text-[#3D352E] mb-2">
                Voice pitch — {pitch.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.8"
                max="1.8"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#DDD5C7] rounded-lg appearance-none cursor-pointer accent-[#2C2420]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-7 pt-4 border-t border-[#EFE7DC]">
            <button
              type="button"
              onClick={onTestVoice}
              className="px-5 py-2 rounded-full border border-[#DDD5C7] bg-white text-xs sm:text-sm font-medium text-[#3D352E] hover:bg-[#F2ECE0] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#6D635A]" />
              <span>Hear Mochi</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 rounded-full bg-[#4A6B5D] hover:bg-[#3D5A4E] text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              Save
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
