import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, Terminal, Cpu, Sparkles, Key, CheckCircle2, BookOpen } from 'lucide-react';

interface CursorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CursorGuideModal: React.FC<CursorGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const MASTER_CURSOR_PROMPT = `# Role & Project Goal
You are a senior full-stack creative engineer and design architect. Build "BunnyMind", a real-time AI therapist web application featuring a programmatic SVG bunny avatar that lip-syncs to text-to-speech audio.

# Tech Stack & Ingredients
- Framework: Next.js (App Router) or Vite + React SPA with Express full-stack server
- Language: TypeScript (strict types)
- Styling: TailwindCSS (calming pastel palette: soft mint #ECFDF5, lavender #F3E8FF, warm cream #FAF7F5, blush rose #FCE7F3, slate-800 text)
- Animations: Framer Motion (floating breathing cycle, ear wiggles, mouth lip-sync morphs)
- STT (Speech-to-Text): Free browser-native SpeechRecognition or webkitSpeechRecognition API
- TTS (Text-to-Speech): Browser-native window.speechSynthesis (pitch 1.25x for sweet bunny tone, rate 0.95x for therapist cadence), plus optional ElevenLabs proxy route
- LLM: Gemini 3 series via @google/genai SDK on server-side route /api/chat with empathetic therapist system prompt

# Step-by-Step Vibe Coding Plan
1. Phase 1 - Programmatic SVG Bunny:
   - Create BunnyAvatar.tsx with pure inline SVG (zero external raster images).
   - Features: Big curved floppy ears, sweet dot eyes with periodic natural blinking, soft cheek blush, floor shadow.
   - Idle animation: Gentle vertical breathing float (y: [0, -8, 0], scale: [1, 1.015, 1]).
   - Speaking state: Ears wiggle gently in counter-rhythm, and mouth path dynamically morphs between open and closed shapes simulating talking.
   - Listening state: Attentive ear tilt and soft green halo glow.

2. Phase 2 - Web Speech API Hooks:
   - useSpeechRecognition: Robust browser STT with continuous listening, interim transcript accumulation, silence detection, and mic permission error handling.
   - useSpeechSynthesis: TTS with boundary tracking, pitch tuning, and an isSpeaking boolean accurately tied to audio playback.

3. Phase 3 - Gemini Server API:
   - Create /api/chat using @google/genai.
   - Persona: Dr. Fluff, gentle and warm AI therapist.
   - Guardrails: 2 to 4 sentences max (perfect for spoken audio), no markdown asterisks or bullets, empathetic validation first, and compassionate crisis lifeline notices if self-harm is mentioned.

4. Phase 4 - Calming UI & Controls:
   - Push-to-talk mic button with pulsing emerald/rose rings.
   - Hands-free auto-conversation toggle.
   - Live transcript subtitle pill below the bunny.
   - Built-in 4-7-8 breathing relaxation tool.
   - Web Audio API procedural ambient soundscape (rain, stream, zen chime).`;

  const CURSORRULES_CONTENT = `# .cursorrules for BunnyMind Vibe-Coding

# Design Constitution
- Aesthetic: Calming pastel minimalism (warm creams, gentle lavenders, soft mints).
- Zero external raster images: The avatar MUST be 100% programmatic SVG with Framer Motion.
- Typography: Rounded, approachable sans-serif (Plus Jakarta Sans or Inter).

# Code Quality & Architecture
- Server-Side Gemini API: Never call GenAI directly from the browser; route through /api/chat.
- Speech Recognition: Always wrap SpeechRecognition with fallback error handling for browsers where mic permission is denied or unsupported.
- Lip-Sync Precision: Tie the bunny's mouth animation strictly to the isSpeaking state and utterance boundary events.
- Safety: Maintain compassionate boundaries. If the user mentions suicidal ideation, respond with warm empathy and explicitly encourage dialing 988 or local emergency services.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-violet-100 to-rose-100 text-violet-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Cursor Vibe-Coding Blueprint</h2>
              <p className="text-xs text-slate-500">
                Ingredients, MCPs, API Keys & the Master Prompt for Cursor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Section 1: The Ingredients & API Keys */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Ingredients & Keys Checklist Before Starting
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>GEMINI_API_KEY</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Required for Dr. Fluff's brain. Get free from Google AI Studio.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Free Web Speech API</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Zero keys needed! Built into Chrome/Edge/Safari for 100% free STT and TTS.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ELEVENLABS_API_KEY (Optional)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Only if you want ultra-realistic voice cloning. Free tier works.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Framer Motion & Tailwind</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  npm install framer-motion lucide-react canvas-confetti
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Recommended MCPs */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-violet-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Recommended MCPs (Model Context Protocol) for Cursor
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Configure these in Cursor Settings &gt; MCP to empower the AI to build autonomously:
            </p>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <Terminal className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Brave Search MCP</strong> or <strong>Fetch MCP</strong>: Enables Cursor to look up current Web Speech API browser quirks and speech synthesis options.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <Terminal className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">ElevenLabs MCP</strong> (Optional): Allows Cursor to test and fetch your ElevenLabs voice IDs and sample audio directly.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <Terminal className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Filesystem / Git MCP</strong>: Standard in Cursor for pristine atomic file creation and edits.
                </div>
              </li>
            </ul>
          </div>

          {/* Section 3: Master Cursor Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Master Vibe-Coding Prompt for Cursor
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(MASTER_CURSOR_PROMPT, 'prompt')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                {copiedSection === 'prompt' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-52 leading-relaxed border border-slate-800">
              {MASTER_CURSOR_PROMPT}
            </pre>
          </div>

          {/* Section 4: .cursorrules file */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  4. Recommended `.cursorrules` File
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(CURSORRULES_CONTENT, 'rules')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                {copiedSection === 'rules' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy .cursorrules</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-40 leading-relaxed border border-slate-800">
              {CURSORRULES_CONTENT}
            </pre>
          </div>

          {/* Section 5: Golden Rules for Cursor Vibe-Coding */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900">
            <h4 className="font-bold mb-1.5 flex items-center gap-1.5">
              💡 The 3 Secrets to Flawless Vibe-Coding in Cursor:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-amber-800">
              <li>
                <strong>Always ask Cursor to plan first:</strong> Tell it "Review the architecture and list the 4 files you will build before writing code."
              </li>
              <li>
                <strong>Keep the Bunny SVG programmatic:</strong> Never ask it to load an image URL. Pure inline SVG ensures crisp rendering at any resolution and 60fps Framer Motion lip-sync.
              </li>
              <li>
                <strong>One-shot audio pipeline:</strong> Let it build STT (user mic) &rarr; Gemini backend &rarr; TTS (bunny voice) in sequence so state transitions are clean.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </motion.div>
    </div>
  );
};
