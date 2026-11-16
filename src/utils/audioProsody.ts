export type VoiceTab = 'indian' | 'global';

export type TranslationMode = 'keep' | 'english' | 'hindi' | 'hinglish';

export interface VoiceOption {
  id: string;
  name: string;
  label: string;
  role: string;
  gender: 'Male' | 'Female';
  region: string;
  tab: VoiceTab;
  sampleText: string;
}

export const CURATED_VOICES: VoiceOption[] = [
  // Tab 1: Indian Male & Regional Voices (All 8 mandatory voices)
  {
    id: 'hi-IN-MadhurNeural',
    name: 'Madhur',
    label: 'Madhur — Deep Hindi/Hinglish Narrator, Male',
    role: 'Deep Hindi/Hinglish Narrator',
    gender: 'Male',
    region: 'Hindi (India)',
    tab: 'indian',
    sampleText: 'उस रात दिल्ली की सड़कों पर सिर्फ खामोशी थी... और फिर अचानक फोन की घंटी बजी।',
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat',
    label: 'Prabhat — Crisp Indian English, Male',
    role: 'Crisp Indian English',
    gender: 'Male',
    region: 'English (India)',
    tab: 'indian',
    sampleText: 'By the time the intelligence bureau decoded the final transmission... the file had already vanished.',
  },
  {
    id: 'en-IN-NeerjaNeural',
    name: 'Neerja',
    label: 'Neerja — Indian English, Female',
    role: 'Indian English',
    gender: 'Female',
    region: 'English (India)',
    tab: 'indian',
    sampleText: 'Every detail in the forensic report pointed to one impossible conclusion... someone inside was watching.',
  },
  {
    id: 'hi-IN-SwaraNeural',
    name: 'Swara',
    label: 'Swara — Expressive Hindi, Female',
    role: 'Expressive Hindi',
    gender: 'Female',
    region: 'Hindi (India)',
    tab: 'indian',
    sampleText: 'सच्चाई हमेशा सामने आती है... चाहे उसे कितनी ही गहराई में क्यों न दफनाया गया हो।',
  },
  {
    id: 'mr-IN-ManoharNeural',
    name: 'Manohar',
    label: 'Manohar — Marathi/Indian Accent, Male',
    role: 'Marathi/Indian Accent',
    gender: 'Male',
    region: 'Marathi / Indian',
    tab: 'indian',
    sampleText: 'Behind the closed doors of the Mumbai archive... a forty-year-old secret was waiting to be uncovered.',
  },
  {
    id: 'gu-IN-NiranjanNeural',
    name: 'Niranjan',
    label: 'Niranjan — Gujarati/Indian Accent, Male',
    role: 'Gujarati/Indian Accent',
    gender: 'Male',
    region: 'Gujarati / Indian',
    tab: 'indian',
    sampleText: 'The ledger showed three midnight transfers... and not a single signature on the authorization form.',
  },
  {
    id: 'ta-IN-ValluvarNeural',
    name: 'Valluvar',
    label: 'Valluvar — Tamil/Indian Accent, Male',
    role: 'Tamil/Indian Accent',
    gender: 'Male',
    region: 'Tamil / Indian',
    tab: 'indian',
    sampleText: 'When the coastal radar went dark at 0200 hours... only one vessel remained on the horizon.',
  },
  {
    id: 'te-IN-MohanNeural',
    name: 'Mohan',
    label: 'Mohan — Telugu/Indian Accent, Male',
    role: 'Telugu/Indian Accent',
    gender: 'Male',
    region: 'Telugu / Indian',
    tab: 'indian',
    sampleText: 'No witness ever stepped forward... yet the evidence left on the platform told the entire story.',
  },

  // Tab 2: Global English Male & Female Voices (All 8 mandatory voices)
  {
    id: 'en-US-AndrewNeural',
    name: 'Andrew',
    label: 'Andrew — Warm American Narrator, Male',
    role: 'Warm American Narrator',
    gender: 'Male',
    region: 'English (US)',
    tab: 'global',
    sampleText: 'Nobody noticed when the streetlamp flickered twice... until the footsteps stopped right outside the door.',
  },
  {
    id: 'en-US-BrianNeural',
    name: 'Brian',
    label: 'Brian — Deep Documentary/Thriller, Male',
    role: 'Deep Documentary/Thriller',
    gender: 'Male',
    region: 'English (US)',
    tab: 'global',
    sampleText: 'In the winter of nineteen ninety-eight, a classified tape arrived at the newsroom... and changed everything.',
  },
  {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher',
    label: 'Christopher — Authoritative, Male',
    role: 'Authoritative',
    gender: 'Male',
    region: 'English (US)',
    tab: 'global',
    sampleText: 'The vault was sealed from the inside... which meant the suspect had never left the building.',
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan',
    label: 'Ryan — Sharp British Spy/Drama, Male',
    role: 'Sharp British Spy/Drama',
    gender: 'Male',
    region: 'English (UK)',
    tab: 'global',
    sampleText: 'Whitehall denied the operation ever existed... even after the diplomatic courier vanished in Vienna.',
  },
  {
    id: 'en-GB-ThomasNeural',
    name: 'Thomas',
    label: 'Thomas — Calm British, Male',
    role: 'Calm British',
    gender: 'Male',
    region: 'English (UK)',
    tab: 'global',
    sampleText: 'At precisely four minutes past midnight, the final signal crossed the Atlantic... and then silence.',
  },
  {
    id: 'en-AU-WilliamNeural',
    name: 'William',
    label: 'William — Australian, Male',
    role: 'Australian',
    gender: 'Male',
    region: 'English (AU)',
    tab: 'global',
    sampleText: 'Out beyond the salt flats, the radio tower kept broadcasting a sequence of numbers no one could explain.',
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria',
    label: 'Aria — Expressive American, Female',
    role: 'Expressive American',
    gender: 'Female',
    region: 'English (US)',
    tab: 'global',
    sampleText: 'She turned the last page of the diary... and realized the handwriting matched her own.',
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia',
    label: 'Sonia — British, Female',
    role: 'British',
    gender: 'Female',
    region: 'English (UK)',
    tab: 'global',
    sampleText: 'The train from Paddington arrived on schedule... but the compartment in carriage four was completely empty.',
  },
];

export const DEFAULT_SAMPLE_SCRIPT = `Us raat 2 baje server room mein sirf ek monitor chal raha tha... aur screen par ek aisi file khuli thi jiska naam kisi official record mein nahi tha.

Kabir ne apna phone uthaya, lekin network पूरी तरह गायब था... फिर भी उसके पास एक अनजान नंबर से मैसेज आया: "Darwaza mat kholna. Woh log pehle hi andar aa chuke hain."

Sometimes the most dangerous truth isn't hidden in the dark... it is waiting right in front of your eyes, disguised as a coincidence.`;

/**
 * Formats numeric rate (-25 to +25) into edge-tts prosody rate string (e.g., "-6%" or "+10%")
 */
export function formatEdgeRate(ratePercent: number): string {
  const clamped = Math.max(-25, Math.min(25, Math.round(ratePercent)));
  return clamped >= 0 ? `+${clamped}%` : `${clamped}%`;
}

/**
 * Formats numeric pitch (-10 to +10) into edge-tts prosody pitch string (e.g., "-3Hz" or "+4Hz")
 */
export function formatEdgePitch(pitchHz: number): string {
  const clamped = Math.max(-10, Math.min(10, Math.round(pitchHz)));
  return clamped >= 0 ? `+${clamped}Hz` : `${clamped}Hz`;
}

/**
 * Clamps paragraph pause duration between 0.5s and 3.0s
 */
export function clampPauseDuration(pauseSeconds: number): number {
  const clamped = Math.max(0.5, Math.min(3.0, Number(pauseSeconds) || 1.5));
  return Math.round(clamped * 10) / 10;
}

/**
 * Splits a script into clean paragraphs while preserving dramatic ellipses (...)
 */
export function splitScriptIntoParagraphs(script: string): string[] {
  if (!script || !script.trim()) return [];
  return script
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((p) =>
      p
        .trim()
        .replace(/\.{3,}/g, '...')
    )
    .filter((p) => p.length > 0);
}

/**
 * Generates exact CBR MP3 silence frames compatible with edge-tts output
 * (24kHz, 48kbps, Mono MPEG-2 Layer III -> 144 bytes per frame, 24.0ms per frame)
 * Zero pydub or audioop dependency — 100% Python 3.14 & Node.js compatible.
 */
export function createMp3SilenceBuffer(durationSeconds: number): Uint8Array {
  const clamped = Math.max(0, Math.min(10, durationSeconds));
  const frameDurationMs = 24.0;
  const numFrames = Math.max(1, Math.round((clamped * 1000) / frameDurationMs));
  const frameSize = 144;
  const header = [0xff, 0xf3, 0x84, 0xc4];
  const buffer = new Uint8Array(numFrames * frameSize);

  for (let i = 0; i < numFrames; i++) {
    const offset = i * frameSize;
    buffer[offset] = header[0];
    buffer[offset + 1] = header[1];
    buffer[offset + 2] = header[2];
    buffer[offset + 3] = header[3];
  }
  return buffer;
}

/**
 * Estimates voiceover duration in seconds from word count, rate, and paragraph pauses
 */
export function estimateAudioDurationSeconds(
  script: string,
  ratePercent: number,
  pauseSeconds: number
): number {
  const paragraphs = splitScriptIntoParagraphs(script);
  if (paragraphs.length === 0) return 0;
  const words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  const baseWordsPerSecond = 2.4;
  const rateMultiplier = 1 + Math.max(-25, Math.min(25, ratePercent)) / 100;
  const speechSeconds = words / (baseWordsPerSecond * rateMultiplier);
  const totalPauseSeconds = Math.max(0, paragraphs.length - 1) * clampPauseDuration(pauseSeconds);
  return Math.max(1, Math.round((speechSeconds + totalPauseSeconds) * 10) / 10);
}
