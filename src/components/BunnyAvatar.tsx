import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarMood } from '../types';

interface BunnyAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  isTranscribing?: boolean;
  speechVolume?: number; // 0 to 1 for dynamic lip-sync
  currentWord?: string;
  mood?: AvatarMood;
  onClick?: () => void;
  micLevel?: number;
  hasDetectedSpeech?: boolean;
}

export const BunnyAvatar: React.FC<BunnyAvatarProps> = ({
  isSpeaking,
  isListening,
  isThinking = false,
  isTranscribing = false,
  speechVolume = 0,
  onClick,
  micLevel = 0,
}) => {
  // Eye blink state machine for natural realism
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 160);
      const nextBlink = Math.random() * 3500 + 2500;
      blinkTimer = setTimeout(triggerBlink, nextBlink);
    };

    blinkTimer = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(blinkTimer);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-[340px] sm:max-w-[400px] mx-auto py-2">
      {/* 
        Dynamic Calming Aura Halos (Image 1 style: completely warm, gentle and luminous, NO dark shadows)
      */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
        {/* Soft expanding aura wave during speech / listening */}
        <AnimatePresence>
          {(isListening || isSpeaking || isThinking) && (
            <>
              {/* Outer pulsing aura ripple */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{
                  scale: isListening
                    ? [1, 1.14 + micLevel * 0.25, 1]
                    : isSpeaking
                    ? [1, 1.08, 1]
                    : [1, 1.05, 1],
                  opacity: isListening ? [0.45, 0.75, 0.45] : [0.35, 0.6, 0.35],
                }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{
                  duration: isListening ? 1.6 : 2.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`absolute w-72 h-72 sm:w-82 sm:h-82 rounded-full border ${
                  isListening
                    ? 'border-[#8FA89B]/40 bg-[#8FA89B]/10 shadow-[0_0_30px_rgba(143,168,155,0.25)]'
                    : isSpeaking
                    ? 'border-[#E8B4B4]/40 bg-[#FADCDC]/15 shadow-[0_0_25px_rgba(232,180,180,0.25)]'
                    : 'border-[#E5CFA0]/40 bg-[#F7EACD]/15 shadow-[0_0_25px_rgba(229,207,160,0.25)]'
                }`}
              />

              {/* Second subtle ambient glow */}
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{
                  scale: isListening ? [1.02, 1.07 + micLevel * 0.15, 1.02] : [1, 1.04, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`absolute w-64 h-64 sm:w-74 sm:h-74 rounded-full ${
                  isListening
                    ? 'bg-[#8FA89B]/15 blur-md'
                    : isSpeaking
                    ? 'bg-[#FADCDC]/20 blur-md'
                    : 'bg-[#F7EACD]/20 blur-md'
                }`}
              />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Floating Bunny Avatar: Clicking toggles microphone */}
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={
          isListening
            ? "Your therapist is listening to you, Ashley. Click to finish and send."
            : isTranscribing
            ? "Transcribing your words. Click to cancel."
            : isSpeaking
            ? "Your therapist is speaking with you. Click to pause."
            : "Click your therapist to begin speaking."
        }
        className="relative cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#8FA89B]/30 rounded-full transition-transform"
        // Subtle natural lifelike float
        animate={
          isSpeaking
            ? {
                y: [0, -3, 0, -2, 0],
                rotate: [0, -0.6, 0.6, 0],
              }
            : isListening
            ? {
                y: [0, -3.5, 0],
                rotate: 1.2, // attentive head tilt listening to Ashley
                scale: [1, 1.018, 1],
              }
            : isThinking
            ? {
                y: [0, -4, 0],
                rotate: [-0.8, 0.8, -0.8],
              }
            : {
                y: [0, -5, 0], // slow gentle breathing float
                scale: [1, 1.01, 1],
              }
        }
        transition={
          isSpeaking
            ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
            : isListening
            ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
            : isThinking
            ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }
        }
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg
          viewBox="0 0 300 300"
          className="w-72 h-72 sm:w-80 sm:h-80 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft outer aura circle gradient */}
            <radialGradient id="outerAuraGrad" cx="150" cy="150" r="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5EFE7" />
              <stop offset="85%" stopColor="#EFE8DC" />
              <stop offset="100%" stopColor="#EAE2D4" />
            </radialGradient>

            {/* Inner garden disc gradient */}
            <radialGradient id="innerDiscGrad" cx="150" cy="150" r="122" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FAF7F2" />
              <stop offset="70%" stopColor="#EFE8DC" />
              <stop offset="100%" stopColor="#E9E0D2" />
            </radialGradient>

            {/* Inner pink ear gradient */}
            <linearGradient id="innerEarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FEE4E4" />
              <stop offset="100%" stopColor="#F5A8A8" />
            </linearGradient>

            {/* Sage collar gradient */}
            <linearGradient id="sageCollarGrad" x1="130" y1="185" x2="170" y2="210" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8FA89B" />
              <stop offset="100%" stopColor="#7B998B" />
            </linearGradient>
          </defs>

          {/* 
            1. EXACT DOUBLE CONCENTRIC CIRCLE BACKDROP FROM IMAGE 1
            No dark colors, pure soft warm oatmeal & cream
          */}
          {/* Outer Ring Circle (Image 1 outer ring) */}
          <circle
            cx="150"
            cy="150"
            r="134"
            fill="url(#outerAuraGrad)"
            stroke="#DFD5C6"
            strokeWidth="1.4"
          />

          {/* Inner Disc Circle (Image 1 inner circle) */}
          <circle
            cx="150"
            cy="150"
            r="116"
            fill="url(#innerDiscGrad)"
            stroke="#DFD5C6"
            strokeWidth="1.2"
          />

          {/* Grounding Shadow at bottom (Image 1) */}
          <ellipse
            cx="148"
            cy="255"
            rx="74"
            ry="16"
            fill="#DDD3C0"
          />

          {/* Dusty sage grass blades at bottom left */}
          <g stroke="#8BA798" strokeWidth="2.4" strokeLinecap="round">
            <line x1="94" y1="254" x2="90" y2="236" />
            <line x1="100" y1="256" x2="98" y2="238" />
            <line x1="108" y1="256" x2="114" y2="242" />
          </g>

          {/* Dusty sage grass blades at bottom right */}
          <g stroke="#8BA798" strokeWidth="2.4" strokeLinecap="round">
            <line x1="228" y1="252" x2="232" y2="235" />
            <line x1="234" y1="250" x2="236" y2="238" />
          </g>

          {/* Sweet Little White Daisy on bottom right next to bunny (Image 1) */}
          <g transform="translate(224, 240)">
            <ellipse cx="-4" cy="0" rx="3" ry="2" fill="#FFFFFF" />
            <ellipse cx="4" cy="0" rx="3" ry="2" fill="#FFFFFF" />
            <ellipse cx="0" cy="-4" rx="2" ry="3" fill="#FFFFFF" />
            <ellipse cx="0" cy="4" rx="2" ry="3" fill="#FFFFFF" />
            <ellipse cx="-2.5" cy="-2.5" rx="2" ry="2" fill="#FFFFFF" />
            <ellipse cx="2.5" cy="-2.5" rx="2" ry="2" fill="#FFFFFF" />
            <ellipse cx="-2.5" cy="2.5" rx="2" ry="2" fill="#FFFFFF" />
            <ellipse cx="2.5" cy="2.5" rx="2" ry="2" fill="#FFFFFF" />
            {/* Daisy golden center */}
            <circle cx="0" cy="0" r="2.2" fill="#E8B854" />
          </g>

          {/* 
            2. THE BUNNY (Exact proportions from Image 1)
          */}
          {/* Cotton Ball Fluffy Tail (on right) */}
          <circle
            cx="195"
            cy="222"
            r="14"
            fill="#FFFFFF"
          />

          {/* Chubby Lower Body */}
          <ellipse
            cx="150"
            cy="214"
            rx="52"
            ry="42"
            fill="#FFFFFF"
          />

          {/* Soft Paws resting on the ground */}
          <ellipse cx="135" cy="248" rx="13" ry="9" fill="#F8F4EC" />
          <ellipse cx="165" cy="248" rx="13" ry="9" fill="#F8F4EC" />

          {/* Sage Green Collar */}
          <path
            d="M 122 186 C 132 205 168 205 178 186 C 168 196 132 196 122 186 Z"
            fill="url(#sageCollarGrad)"
          />

          {/* Bunny Ears - Tall, upright, rounded reaching above the circle */}
          {/* Left Ear */}
          <motion.g
            animate={
              isListening
                ? { rotate: [-1.5, 1.5, -1.5] }
                : isSpeaking
                ? { rotate: [0, -2, 0] }
                : { rotate: [0, 1, 0] }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '135px', originY: '110px' }}
          >
            {/* White outer ear */}
            <path
              d="M 124 108 C 117 74 118 36 135 36 C 151 36 150 74 144 108 Z"
              fill="#FFFFFF"
            />
            {/* Pink inner ear */}
            <path
              d="M 128 102 C 123 74 125 45 135 45 C 145 45 144 74 140 102 Z"
              fill="url(#innerEarGrad)"
            />
          </motion.g>

          {/* Right Ear */}
          <motion.g
            animate={
              isListening
                ? { rotate: [1.5, -1.5, 1.5] }
                : isSpeaking
                ? { rotate: [0, 2, 0] }
                : { rotate: [0, -1, 0] }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
            style={{ originX: '165px', originY: '110px' }}
          >
            {/* White outer ear */}
            <path
              d="M 156 108 C 150 74 149 36 165 36 C 183 36 182 74 176 108 Z"
              fill="#FFFFFF"
            />
            {/* Pink inner ear */}
            <path
              d="M 160 102 C 156 74 155 45 165 45 C 177 45 176 74 172 102 Z"
              fill="url(#innerEarGrad)"
            />
          </motion.g>

          {/* Big Round Squishy Bunny Head */}
          <ellipse
            cx="150"
            cy="144"
            rx="70"
            ry="62"
            fill="#FFFFFF"
          />

          {/* Soft Rosy Cheek Blush (Image 1 big round pink blush) */}
          <ellipse cx="112" cy="164" rx="14" ry="9" fill="#F8B8B8" opacity="0.88" />
          <ellipse cx="188" cy="164" rx="14" ry="9" fill="#F8B8B8" opacity="0.88" />

          {/* Big Glossy Eyes with Catchlight Highlight (Image 1) */}
          <g id="eyes">
            {isBlinking ? (
              // Sweet closed happy curve when blinking
              <>
                <path d="M 120 144 Q 126 149 132 144" stroke="#362E29" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 168 144 Q 174 149 180 144" stroke="#362E29" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : (
              // Big round dark button eyes
              <>
                {/* Left Eye */}
                <ellipse cx="126" cy="144" rx="7.5" ry="8" fill="#362E29" />
                <circle cx="128.5" cy="141.5" r="2.5" fill="#FFFFFF" />

                {/* Right Eye */}
                <ellipse cx="174" cy="144" rx="7.5" ry="8" fill="#362E29" />
                <circle cx="176.5" cy="141.5" r="2.5" fill="#FFFFFF" />
              </>
            )}
          </g>

          {/* Whisker Lines (2 gentle lines on each cheek matching Image 1) */}
          <g stroke="#9C9289" strokeWidth="1.4" strokeLinecap="round" opacity="0.65">
            {/* Left Whiskers */}
            <line x1="106" y1="156" x2="88" y2="153" />
            <line x1="108" y1="163" x2="90" y2="164" />
            {/* Right Whiskers */}
            <line x1="194" y1="156" x2="212" y2="153" />
            <line x1="192" y1="163" x2="210" y2="164" />
          </g>

          {/* Cute Strawberry-Pink Rounded Nose (Image 1) */}
          <path
            d="M 146 156 C 146 154 148 152 150 154 C 152 152 154 154 154 156 C 154 159 150 162 150 162 C 150 162 146 159 146 156 Z"
            fill="#D77878"
          />

          {/* Dynamic Lip-Sync Mouth / "ω" Cleft Smile */}
          {isSpeaking ? (
            <motion.path
              d={
                speechVolume > 0.4
                  ? "M 142 163 Q 150 173 158 163 Q 150 167 142 163 Z"
                  : speechVolume > 0.15
                  ? "M 143 163 Q 150 170 157 163 Q 150 166 143 163 Z"
                  : "M 143 163 Q 146.5 167.5 150 164.5 Q 153.5 167.5 157 163"
              }
              fill={speechVolume > 0.2 ? "#E28B8B" : "none"}
              stroke="#3F332E"
              strokeWidth="2"
              strokeLinecap="round"
              animate={{
                d: [
                  "M 143 163 Q 146.5 167.5 150 164.5 Q 153.5 167.5 157 163",
                  "M 142 163 Q 150 173 158 163 Q 150 167 142 163 Z",
                  "M 143 163 Q 150 170 157 163 Q 150 166 143 163 Z",
                  "M 143 163 Q 146.5 167.5 150 164.5 Q 153.5 167.5 157 163",
                ],
              }}
              transition={{ duration: 0.26, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            // Sweet quiet cleft mouth "ω"
            <path
              d="M 143 163 Q 146.5 167.5 150 164.5 Q 153.5 167.5 157 163"
              stroke="#3F332E"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
      </motion.button>
    </div>
  );
};
