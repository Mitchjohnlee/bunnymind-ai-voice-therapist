export type AvatarMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'breathing';

export type VoiceEngine = 'freetts' | 'native' | 'elevenlabs';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface FreeTtsVoice {
  id: string;
  name: string;
  gender: string;
  mood: string;
}

export interface VoiceSettings {
  engine: VoiceEngine;
  freeTtsVoice: string; // e.g. 'en-US-AvaNeural'
  freeTtsRate: string;  // e.g. '+0%', '-5%', '+5%'
  freeTtsPitch: string; // e.g. '+0Hz', '+2Hz'
  nativeVoiceURI: string;
  pitch: number;      // 0.8 - 1.8, default 1.25 for cute bunny
  rate: number;       // 0.7 - 1.3, default 0.95 for calm pace
  volume: number;     // 0 - 1, default 1
  autoListen: boolean; // Automatically re-enable mic after bunny finishes speaking
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
}

export type AmbientSoundType = 'none' | 'rain' | 'stream' | 'zen' | 'pink_noise';

export interface MoodPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
}
