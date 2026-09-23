import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, X, Play, RotateCcw } from 'lucide-react';

interface BreathingExerciseProps {
  isOpen: boolean;
  onClose: () => void;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export const BreathingExercise: React.FC<BreathingExerciseProps> = ({ isOpen, onClose }) => {
  const [isActive, setIsActive] = useState(true);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [counter, setCounter] = useState(4);
  const [cycleCount, setCycleCount] = useState(1);

  // 4-7-8 Breathing Technique:
  // Inhale: 4s, Hold: 7s, Exhale: 8s
  useEffect(() => {
    if (!isOpen || !isActive) return;

    const timer = setInterval(() => {
      setCounter((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Transition phases
        if (phase === 'inhale') {
          setPhase('hold');
          return 7;
        } else if (phase === 'hold') {
          setPhase('exhale');
          return 8;
        } else {
          // exhale finished
          setPhase('inhale');
          setCycleCount((c) => c + 1);
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isActive, phase]);

  if (!isOpen) return null;

  const phaseDetails = {
    inhale: {
      label: 'Gently Inhale',
      sub: 'Breathe in peace through your nose...',
      scale: 1.45,
      color: 'bg-emerald-300/40 text-emerald-900 border-emerald-400',
      ringColor: 'border-emerald-300',
    },
    hold: {
      label: 'Softly Hold',
      sub: 'Let your body rest in the stillness...',
      scale: 1.45,
      color: 'bg-amber-200/40 text-amber-900 border-amber-300',
      ringColor: 'border-amber-300',
    },
    exhale: {
      label: 'Slow Exhale',
      sub: 'Release all tension through parted lips...',
      scale: 1.0,
      color: 'bg-rose-200/40 text-rose-900 border-rose-300',
      ringColor: 'border-rose-300',
    },
    rest: {
      label: 'Pause',
      sub: 'Be present...',
      scale: 1.0,
      color: 'bg-slate-200/40 text-slate-800 border-slate-300',
      ringColor: 'border-slate-300',
    },
  };

  const current = phaseDetails[phase];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col items-center text-center overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-rose-500 font-semibold text-sm">
          <Wind className="w-4 h-4" />
          <span>4-7-8 Calming Breath</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">
          Regulate Your Nervous System
        </h2>
        <p className="text-xs text-slate-500 mb-8">
          Follow the breathing orb with Dr. Fluff. Cycle {cycleCount}
        </p>

        {/* Breathing Orb Visualization */}
        <div className="relative w-52 h-52 flex items-center justify-center mb-8">
          {/* Animated Expanding Ripple */}
          <motion.div
            className={`absolute inset-0 rounded-full border-2 ${current.ringColor}`}
            animate={{
              scale: phase === 'inhale' ? [1, 1.45] : phase === 'exhale' ? [1.45, 1] : 1.45,
              opacity: [0.6, 0.2, 0.6],
            }}
            transition={{
              duration: phase === 'inhale' ? 4 : phase === 'hold' ? 7 : 8,
              ease: 'easeInOut',
            }}
          />

          {/* Core Orb */}
          <motion.div
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-2 backdrop-blur-sm transition-all duration-700 ${current.color}`}
            animate={{
              scale: current.scale,
            }}
            transition={{
              duration: phase === 'inhale' ? 4 : phase === 'hold' ? 0.3 : 8,
              ease: 'easeInOut',
            }}
          >
            <span className="text-3xl font-extrabold">{counter}</span>
            <span className="text-xs uppercase tracking-wider font-semibold mt-1">
              {current.label}
            </span>
          </motion.div>
        </div>

        <p className="text-sm font-medium text-slate-700 h-6 mb-6">
          {current.sub}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsActive((prev) => !prev)}
            className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${isActive ? 'rotate-90' : ''}`} />
            <span>{isActive ? 'Pause' : 'Resume'}</span>
          </button>
          <button
            onClick={() => {
              setPhase('inhale');
              setCounter(4);
              setCycleCount(1);
            }}
            className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
