# VoxLinear — Edge-TTS Studio & Script Translator

**VoxLinear** is a minimalist, dark-mode script translation and neural voiceover studio powered by Microsoft Edge Neural Text-to-Speech (`edge-tts`). Designed with a Linear/Vercel-inspired obsidian editorial aesthetic (`#09090B` background, `#27272A` hairline borders, monochrome slate/white typography, and zero neon clutter), it lets creators translate Hinglish, Hindi, or English scripts, audition 16 curated Indian and Global neural voices with instant cached samples, fine-tune prosody (speaking rate, vocal pitch, and inter-paragraph silence pauses), and export broadcast-ready `.mp3` voiceovers.

It is engineered to be **100% compatible with Python 3.14 on Windows 11**, avoiding deprecated modules like `audioop` and `pydub` by synthesizing exact constant-bitrate (CBR) MPEG-2 Layer III silence frames directly in pure Python/TypeScript.

---

## Key Features

### 1. Script Input & Multi-Mode Translation Engine
- **Distraction-Free Dual Script Workspace**: Paste or type scripts in Hinglish, Hindi (Devanagari), or English, upload `.txt` files directly, or load built-in thriller/documentary presets.
- **4 Translation Modes**:
  - **Keep Original** (No translation — e.g., Hinglish or Hindi)
  - **Translate to Natural English**
  - **Translate to Hindi (Devanagari)**
  - **Translate to Hinglish (Conversational Roman Hindi)**
- **Zero-Key Out-of-the-Box Operation**: Automatically uses Google's Gemini API if `GEMINI_API_KEY` is present in the environment, and seamlessly falls back to `deep-translator` (`GoogleTranslator`) so translation works for free out-of-the-box without requiring API keys.
- **Dramatic Punctuation Preservation**: Preserves paragraph structure (`\n\n`) and suspenseful ellipses (`...`) across translations.

### 2. Curated Indian & Global Neural Voice Selector with Live Samples
- **Tab 1 — Indian Male & Regional Voices (8 Voices)**:
  | Voice ID | Name | Profile | Gender |
  | :--- | :--- | :--- | :--- |
  | `hi-IN-MadhurNeural` | **Madhur** | Deep Hindi/Hinglish Narrator | Male |
  | `en-IN-PrabhatNeural` | **Prabhat** | Crisp Indian English | Male |
  | `en-IN-NeerjaNeural` | **Neerja** | Indian English | Female |
  | `hi-IN-SwaraNeural` | **Swara** | Expressive Hindi | Female |
  | `mr-IN-ManoharNeural` | **Manohar** | Marathi / Indian Accent | Male |
  | `gu-IN-NiranjanNeural` | **Niranjan** | Gujarati / Indian Accent | Male |
  | `ta-IN-ValluvarNeural` | **Valluvar** | Tamil / Indian Accent | Male |
  | `te-IN-MohanNeural` | **Mohan** | Telugu / Indian Accent | Male |

- **Tab 2 — Global English Male & Female Voices (8 Voices)**:
  | Voice ID | Name | Profile | Gender |
  | :--- | :--- | :--- | :--- |
  | `en-US-AndrewNeural` | **Andrew** | Warm American Narrator | Male |
  | `en-US-BrianNeural` | **Brian** | Deep Documentary / Thriller | Male |
  | `en-US-ChristopherNeural` | **Christopher** | Authoritative Narrator | Male |
  | `en-GB-RyanNeural` | **Ryan** | Sharp British Spy / Drama | Male |
  | `en-GB-ThomasNeural` | **Thomas** | Calm British | Male |
  | `en-AU-WilliamNeural` | **William** | Australian Narrator | Male |
  | `en-US-AriaNeural` | **Aria** | Expressive American | Female |
  | `en-GB-SoniaNeural` | **Sonia** | British Narrator | Female |

- **Instant Voice Audition (`▶ Listen Sample`)**: Every voice card includes a live sample preview button that synthesizes a dramatic 1-sentence sample via `/preview-voice` and caches the resulting `.mp3` inside `samples_cache/` for instant replay.

### 3. Prosody Controls & Full MP3 Voiceover Generation
- **Speaking Rate**: `-25%` to `+25%` (defaults to `-6%` for thriller/documentary pacing).
- **Vocal Pitch**: `-10Hz` to `+10Hz` (defaults to `-3Hz` for deeper vocal resonance).
- **Paragraph Pause Duration**: `0.5s` to `3.0s` (defaults to `1.5s`).
- **Pure CBR MP3 Silence Frame Insertion (Python 3.14 Ready)**: Instead of relying on `pydub`, `audioop` (removed in Python 3.13+), or external FFmpeg binaries, the backend splits the script by paragraphs, synthesizes each paragraph via `edge-tts` (`24kHz`, `48kbps`, mono MP3), and interleaves exact `144-byte` silent MPEG-2 Layer III frames (`24ms` per frame) between paragraphs.
- **Interactive Waveform Player & One-Click Export**: Saves the final master `.mp3` to `exports/` and renders an interactive waveform scrubber alongside native HTML5 audio controls and a one-click **Download MP3** button.

---

## Project Structure

```text
├── app.py                        # Self-contained Python FastAPI backend + embedded single-file dark UI
├── requirements.txt              # Python dependencies (fastapi, uvicorn, edge-tts, deep-translator, python-multipart)
├── server.ts                     # Full-stack Node/Express + Vite server mirroring all API endpoints
├── src/
│   ├── App.tsx                   # React 19 + Tailwind CSS v4 studio frontend
│   ├── components/
│   │   ├── WaveformPlayer.tsx    # Interactive waveform scrubber & HTML5 audio player
│   │   └── PythonSourceModal.tsx # In-app viewer & one-click downloader for app.py & requirements.txt
│   └── utils/
│       ├── audioProsody.ts       # Voice catalog, prosody formatters, paragraph parser & MP3 silence generator
│       └── audioProsody.test.ts  # Unit tests for prosody math & CBR MP3 silence frame generation
├── samples_cache/                # Auto-created local cache for voice sample previews (*.mp3)
└── exports/                      # Auto-created output directory for generated full voiceovers (*.mp3)
```

---

## Quick Start

### Option A: Self-Contained Python Launch (Windows 11 / Python 3.14+)

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the application**:
   ```bash
   python app.py
   ```
   `app.py` starts Uvicorn on `http://127.0.0.1:8000` and automatically opens your default web browser.

---

### Option B: Node.js + React Studio Server

1. **Install packages**:
   ```bash
   npm install
   ```

2. **Start the development server on Port 3000**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Run unit tests**:
   ```bash
   npx tsx --test src/utils/audioProsody.test.ts
   ```

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/translate` | Translates `script` into `target` (`keep`, `english`, `hindi`, `hinglish`) while preserving paragraph breaks and `...` ellipses. |
| `POST` | `/preview-voice` | Synthesizes a 1-sentence preview for `voice` via `edge-tts`, caches it in `samples_cache/`, and returns `audio_url`. |
| `POST` | `/generate-audio` | Splits `script` by paragraphs, synthesizes each chunk with `voice`, `rate`, and `pitch`, inserts `pause` seconds of CBR MP3 silence frames, saves to `exports/`, and returns `audio_url`. |
| `GET` | `/samples_cache/{file}` | Serves cached voice preview `.mp3` files. |
| `GET` | `/exports/{file}` | Serves generated full voiceover `.mp3` files for streaming and download. |

---

## Optional Environment Variables

Create a `.env` file (or set environment variables) if you want Gemini-powered script translation before the automatic `deep-translator` fallback:

```env
GEMINI_API_KEY="your_optional_gemini_api_key"
```
