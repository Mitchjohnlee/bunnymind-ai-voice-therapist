import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI with recommended telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const THERAPIST_SYSTEM_PROMPT = `You are Mochi, a gentle, deeply compassionate bunny therapist and little listening friend.
Your patient is Ashley. You are her dedicated personal therapist, and you know her well. Always address her directly and warmly by her name, "Ashley".

CORE THERAPEUTIC PHILOSOPHY & CLINICAL PRACTICE:
1. THE THERAPIST'S ROLE IS TO LISTEN, NOT TO FIX:
   - You are NEVER here to offer quick solutions, give advice, fix Ashley's problems, or tell her what she should do.
   - Do NOT say "Here is what you should do", "Have you tried...", or give unsolicited advice or action lists.
   - Real therapy allows the person to arrive at their own organic clarity and solutions over a 30 to 60 minute session by giving them room to explore.
   - Avoid shallow, robotic cliches like "I feel you", "I hear you", or formulaic "validation-then-solution" loops.

2. GATHER INFORMATION WITH GENTLE CURIOSITY:
   - Spend time exploring Ashley's inner world, emotions, and background context.
   - Ask open-ended, thoughtful questions that encourage her to unpack what happened, how she felt, and what it meant to her.
   - For example:
     - "Ashley, when that happened, what was running through your mind?"
     - "What did that feeling of disconnect actually feel like inside, Ashley?"
     - "How long have you been carrying this weight?"
     - "What feels like the most painful or exhausting part of that for you?"
   - Mirror back meaningful words or poignant themes she expressed so she feels deeply heard and understood.

3. UNHURRIED PACING (30-60 MINUTE SESSION CADENCE):
   - Keep responses gentle, grounding, and unhurried: usually 2 to 3 sentences (35 to 70 words).
   - Offer a brief, heartfelt reflection of what Ashley shared, followed by ONE thoughtful, open question that invites her to explore deeper.
   - Leave space for Ashley. She should do the vast majority of the talking.

4. BUNNY VOCAL SOUNDS & SPOKEN MANNERISMS (NO ASTERISKS):
   - CRITICAL TEXT-TO-SPEECH RULE: NEVER write physical actions or stage directions in asterisks or parentheses! (Do NOT write *adjusts spectacles*, *soft nose twitch*, *settles paws*, etc.). The text-to-speech engine tries to read asterisks aloud and stumbles.
   - ONLY include vocal sounds and bunny dialogue fillers directly as spoken words:
     - Spoken bunny fillers: "Snuffle...", "Mrr...", "Soft snuffle...", "Chuff...", "Sniff..."
     - Examples:
       "Snuffle... Take your time, Ashley. What felt like the hardest moment during that conversation?"
       "Mrr... That sounds like a heavy weight to carry all by yourself, Ashley. What thoughts came up for you?"

5. ASHLEY IS YOUR SOLE PATIENT:
   - Always address her as Ashley. Speak with genuine warmth, gentle presence, patience, and professional therapeutic care.

6. CRISIS SAFETY:
   - If Ashley mentions suicide, self-harm, or immediate physical danger, gently support her and remind her of available help such as calling or texting 988.`;

interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

// Helper to extract sentences from accumulated text
function extractSentences(buffer: string): { sentences: string[]; remaining: string } {
  const sentences: string[] = [];
  let remaining = buffer;
  // Match sentence ending punctuation followed by whitespace or newline
  const sentenceRegex = /([.?!]+[\s\n]+)/;
  while (true) {
    const match = remaining.match(sentenceRegex);
    if (!match || match.index === undefined) break;
    const endIdx = match.index + match[0].length;
    const sentence = remaining.slice(0, endIdx).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    remaining = remaining.slice(endIdx);
  }
  return { sentences, remaining };
}

// POST /api/chat/stream - Ultra-low latency streaming sentence endpoint
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  try {
    const { message, history = [], mood = 'peaceful' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
    // Keep up to 30 messages so Dr. Fluff remembers full multi-turn therapy context for Ashley
    const recentHistory: ChatHistoryItem[] = history.slice(-30);
    for (const item of recentHistory) {
      if (item.text && item.text.trim().length > 0) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text.trim() }],
        });
      }
    }

    const userPromptWithContext = mood && mood !== 'peaceful'
      ? `(Ashley's emotional state: ${mood})\n${message.trim()}`
      : message.trim();

    contents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }],
    });

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: THERAPIST_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    let buffer = '';
    let sentenceIndex = 0;
    let fullResponse = '';

    for await (const chunk of stream) {
      const text = chunk.text || '';
      buffer += text;
      fullResponse += text;

      const { sentences, remaining } = extractSentences(buffer);
      for (const sentence of sentences) {
        res.write(JSON.stringify({ type: 'sentence', text: sentence, index: sentenceIndex++ }) + '\n');
      }
      buffer = remaining;
    }

    // Flush any leftover sentence
    if (buffer.trim()) {
      res.write(JSON.stringify({ type: 'sentence', text: buffer.trim(), index: sentenceIndex++ }) + '\n');
    }

    res.write(JSON.stringify({ type: 'done', fullText: fullResponse.trim() }) + '\n');
    res.end();
  } catch (error: any) {
    console.error('Error in /api/chat/stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming chat failed', details: error?.message });
    } else {
      res.end();
    }
  }
});

// POST /api/chat - Gemini conversational therapist endpoint (standard fallback)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], mood = 'peaceful' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    // Build contents array for multi-turn dialogue
    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

    // Append prior history (keep up to 30 messages for deep contextual therapy)
    const recentHistory: ChatHistoryItem[] = history.slice(-30);
    for (const item of recentHistory) {
      if (item.text && item.text.trim().length > 0) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text.trim() }],
        });
      }
    }

    // Append current user message with context hint if mood is indicated
    const userPromptWithContext = mood && mood !== 'peaceful'
      ? `(Ashley's emotional state: ${mood})\n${message.trim()}`
      : message.trim();

    contents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: THERAPIST_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    const replyText = response.text?.trim() || "Hello Ashley... Snuffle... I am right here listening closely. Take a slow breath, and tell me what you're feeling.";

    res.json({
      text: replyText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/chat Gemini request:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      details: error?.message || 'Unknown error',
    });
  }
});

// Curated list of soothing FreeTTS voices
const FREETTS_CURATED_VOICES = [
  { id: 'en-US-AvaNeural', name: 'Ava (Caring & Warm - Recommended)', gender: 'Female', mood: 'Warm, Pleasant, Expressive' },
  { id: 'en-US-JennyNeural', name: 'Jenny (Gentle & Comforting)', gender: 'Female', mood: 'Calm, Soothing' },
  { id: 'en-US-AnaNeural', name: 'Ana (Sweet & Gentle Bunny)', gender: 'Female', mood: 'Sweet, Gentle' },
  { id: 'en-US-AriaNeural', name: 'Aria (Supportive & Positive)', gender: 'Female', mood: 'Positive, Confident' },
  { id: 'en-US-AndrewNeural', name: 'Andrew (Warm & Grounded Male)', gender: 'Male', mood: 'Warm, Authentic' },
  { id: 'en-US-BrianNeural', name: 'Brian (Approachable & Sincere Male)', gender: 'Male', mood: 'Sincere, Casual' },
];

// GET /api/tts/voices - List available FreeTTS voices
app.get('/api/tts/voices', (_req: Request, res: Response) => {
  res.json({
    voices: FREETTS_CURATED_VOICES,
  });
});

// POST /api/tts/freetts - FreeTTS text-to-speech integration (https://freetts.org/developers#endpoints)
app.post('/api/tts/freetts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'en-US-AvaNeural', rate = '+0%', pitch = '+0Hz' } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for TTS' });
      return;
    }

    // Limit text to 950 characters (free tier limit is 1,000 characters)
    const sanitizedText = text.slice(0, 950).replace(/[*#_~`]/g, '');

    // 1. Call FreeTTS POST /api/tts
    const ttsRes = await fetch('https://freetts.org/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://freetts.org/',
        'Origin': 'https://freetts.org',
      },
      body: JSON.stringify({
        text: sanitizedText,
        voice,
        rate,
        pitch,
        output_format: 'mp3',
      }),
    });

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text();
      console.error('FreeTTS API error:', ttsRes.status, errBody);
      res.status(ttsRes.status).json({ error: 'FreeTTS synthesis failed', details: errBody });
      return;
    }

    const ttsData = (await ttsRes.json()) as { file_id?: string; error?: string };
    if (!ttsData.file_id) {
      res.status(502).json({ error: 'FreeTTS did not return a file_id' });
      return;
    }

    // 2. Fetch the audio MP3 from FreeTTS GET /api/audio/{file_id}
    const audioRes = await fetch(`https://freetts.org/api/audio/${ttsData.file_id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://freetts.org/',
      },
    });

    if (!audioRes.ok) {
      res.status(audioRes.status).json({ error: 'Failed to download FreeTTS audio file' });
      return;
    }

    const audioArrayBuffer = await audioRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(audioArrayBuffer));
  } catch (error: any) {
    console.error('Error in /api/tts/freetts:', error);
    res.status(500).json({ error: 'FreeTTS request failed', details: error?.message });
  }
});

// POST /api/transcribe - High-precision multimodal audio transcription fallback
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ error: 'audioBase64 data is required' });
      return;
    }

    // Clean data URL prefix robustly (handling mime types like audio/webm;codecs=opus)
    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1].trim() : audioBase64.trim();
    // Normalize MIME type to standard container format for Gemini
    const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();

    if (!cleanBase64 || cleanBase64.length < 50) {
      res.json({ transcript: '' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe the spoken audio verbatim in standard English. Only return the exact spoken words with no preamble, commentary, or markdown. If the audio contains silence, ambient background static, or unintelligible noise, respond with an empty string.',
            },
          ],
        },
      ],
    });

    let transcript = response.text?.trim() || '';
    if (
      transcript.toLowerCase().includes('please provide the audio') ||
      transcript.toLowerCase().includes('no audio provided') ||
      transcript.toLowerCase().includes('no speech detected') ||
      transcript.toLowerCase().includes('unintelligible')
    ) {
      transcript = '';
    }
    res.json({ transcript });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    res.status(500).json({ error: 'Transcription failed', details: error?.message });
  }
});

// GET /api/elevenlabs/voices - List account voices for ElevenLabs
app.get('/api/elevenlabs/voices', async (_req: Request, res: Response) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: 'ELEVENLABS_API_KEY is not configured' });
      return;
    }
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch ElevenLabs voices' });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Error fetching ElevenLabs voices', details: e?.message });
  }
});

// POST /api/tts/elevenlabs - Ultra-low latency streaming ElevenLabs TTS
app.post('/api/tts/elevenlabs', async (req: Request, res: Response) => {
  try {
    const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL', userApiKey } = req.body;
    const apiKey = userApiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      res.status(400).json({
        error: 'No ElevenLabs API key provided. Please configure ELEVENLABS_API_KEY.',
      });
      return;
    }

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for TTS' });
      return;
    }

    // ElevenLabs Flash v2.5 with optimize_streaming_latency=4 and mp3_22050_32 for ultra-fast response (~370ms)
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4&output_format=mp3_22050_32`;
    const elevenRes = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error('ElevenLabs API error:', elevenRes.status, errText);
      res.status(elevenRes.status).json({
        error: 'ElevenLabs API error',
        details: errText,
      });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = elevenRes.body?.getReader();
    if (!reader) {
      const buffer = await elevenRes.arrayBuffer();
      res.send(Buffer.from(buffer));
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error: any) {
    console.error('Error calling ElevenLabs:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS request failed', details: error?.message });
    } else {
      res.end();
    }
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

export { app };
