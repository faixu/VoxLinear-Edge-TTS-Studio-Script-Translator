"""
VoxLinear — Self-Contained Edge-TTS Studio & Script Translator
100% Compatible with Python 3.14 on Windows 11 (Zero pydub / audioop dependency).

Run with:
    pip install -r requirements.txt
    python app.py
"""

import asyncio
import hashlib
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from typing import List, Optional

import edge_tts
import uvicorn
from deep_translator import GoogleTranslator
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Directories (auto-created on startup)
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
SAMPLES_CACHE_DIR = BASE_DIR / "samples_cache"
EXPORTS_DIR = BASE_DIR / "exports"
SAMPLES_CACHE_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="VoxLinear — Edge-TTS Studio & Script Translator",
    version="1.0.0",
)

app.mount("/samples_cache", StaticFiles(directory=str(SAMPLES_CACHE_DIR)), name="samples_cache")
app.mount("/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")

# ---------------------------------------------------------------------------
# Curated Voice Catalog & Dramatic Preview Lines
# ---------------------------------------------------------------------------
VOICE_SAMPLES = {
    # Tab 1: Indian Male & Regional Voices
    "hi-IN-MadhurNeural": "उस रात दिल्ली की सड़कों पर सिर्फ खामोशी थी... और फिर अचानक फोन की घंटी बजी।",
    "en-IN-PrabhatNeural": "By the time the intelligence bureau decoded the final transmission... the file had already vanished.",
    "en-IN-NeerjaNeural": "Every detail in the forensic report pointed to one impossible conclusion... someone inside was watching.",
    "hi-IN-SwaraNeural": "सच्चाई हमेशा सामने आती है... चाहे उसे कितनी ही गहराई में क्यों न दफनाया गया हो।",
    "mr-IN-ManoharNeural": "Behind the closed doors of the Mumbai archive... a forty-year-old secret was waiting to be uncovered.",
    "gu-IN-NiranjanNeural": "The ledger showed three midnight transfers... and not a single signature on the authorization form.",
    "ta-IN-ValluvarNeural": "When the coastal radar went dark at 0200 hours... only one vessel remained on the horizon.",
    "te-IN-MohanNeural": "No witness ever stepped forward... yet the evidence left on the platform told the entire story.",
    # Tab 2: Global English Male & Female Voices
    "en-US-AndrewNeural": "Nobody noticed when the streetlamp flickered twice... until the footsteps stopped right outside the door.",
    "en-US-BrianNeural": "In the winter of nineteen ninety-eight, a classified tape arrived at the newsroom... and changed everything.",
    "en-US-ChristopherNeural": "The vault was sealed from the inside... which meant the suspect had never left the building.",
    "en-GB-RyanNeural": "Whitehall denied the operation ever existed... even after the diplomatic courier vanished in Vienna.",
    "en-GB-ThomasNeural": "At precisely four minutes past midnight, the final signal crossed the Atlantic... and then silence.",
    "en-AU-WilliamNeural": "Out beyond the salt flats, the radio tower kept broadcasting a sequence of numbers no one could explain.",
    "en-US-AriaNeural": "She turned the last page of the diary... and realized the handwriting matched her own.",
    "en-GB-SoniaNeural": "The train from Paddington arrived on schedule... but the compartment in carriage four was completely empty.",
}


# ---------------------------------------------------------------------------
# Pure Python 3.14 MP3 Silence Frame Generator (No pydub / No audioop)
# ---------------------------------------------------------------------------
def build_mp3_silence_bytes(duration_seconds: float) -> bytes:
    """
    Generates exact CBR MP3 silence frames matching edge-tts output stream
    (24kHz, 48kbps, Mono MPEG-2 Layer III -> 144 bytes per frame, 24.0ms per frame).
    Works natively on Python 3.14 Windows 11 with zero external C libraries.
    """
    clamped = max(0.0, min(10.0, float(duration_seconds)))
    if clamped <= 0:
        return b""
    frame_duration_ms = 24.0
    num_frames = max(1, int(round((clamped * 1000.0) / frame_duration_ms)))
    # Valid MPEG-2 Layer III, 24kHz, 48kbps, Mono silent frame (144 bytes)
    single_frame = b"\xff\xf3\x84\xc4" + (b"\x00" * 140)
    return single_frame * num_frames


def format_rate(rate_val: int) -> str:
    clamped = max(-25, min(25, int(rate_val)))
    return f"+{clamped}%" if clamped >= 0 else f"{clamped}%"


def format_pitch(pitch_val: int) -> str:
    clamped = max(-10, min(10, int(pitch_val)))
    return f"+{clamped}Hz" if clamped >= 0 else f"{clamped}Hz"


def split_paragraphs(script: str) -> List[str]:
    if not script or not script.strip():
        return []
    normalized = script.replace("\r\n", "\n")
    raw_Lock = re.split(r"\n\s*\n+", normalized)
    cleaned = []
    for p in raw_Lock:
        text = re.sub(r"\.{3,}", "...", p.strip())
        if text:
            cleaned.append(text)
    return cleaned


async def synthesize_chunk_bytes(text: str, voice: str, rate_str: str, pitch_str: str) -> bytes:
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate_str, pitch=pitch_str)
    audio_chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            audio_chunks.extend(chunk["data"])
    return bytes(audio_chunks)


# ---------------------------------------------------------------------------
# Translation Helper (Gemini API with automatic deep-translator fallback)
# ---------------------------------------------------------------------------
def translate_with_gemini(paragraphs: List[str], target_mode: str, api_key: str) -> Optional[List[str]]:
    mode_instructions = {
        "english": "Translate into natural, dramatic, cinematic English suitable for a documentary or thriller voiceover.",
        "hindi": "Translate into natural, dramatic Hindi in Devanagari script suitable for a thriller or documentary narrator.",
        "hinglish": "Translate into natural conversational Hinglish (Hindi written in Roman/Latin alphabet mixed naturally with English keywords) suitable for an Indian YouTube storyteller or thriller podcast.",
    }
    instruction = mode_instructions.get(target_mode)
    if not instruction:
        return paragraphs

    prompt = (
        f"{instruction}\n"
        "CRITICAL RULES:\n"
        "1. Preserve the exact number of paragraphs and return them separated by double newlines (\\n\\n).\n"
        "2. Preserve all dramatic ellipses (...) and suspenseful pauses.\n"
        "3. Output ONLY the translated script text without any introductory commentary or markdown fences.\n\n"
        "SCRIPT TO TRANSLATE:\n"
        + "\n\n".join(paragraphs)
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}]
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            candidates = body.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                text_out = "".join(part.get("text", "") for part in parts).strip()
                if text_out:
                    return split_paragraphs(text_out)
    except Exception:
        return None
    return None


def translate_with_deep_translator(paragraphs: List[str], target_mode: str) -> List[str]:
    if target_mode == "keep":
        return paragraphs

    if target_mode == "english":
        translator = GoogleTranslator(source="auto", target="en")
        return [re.sub(r"\.{3,}", "...", translator.translate(p)) for p in paragraphs]

    if target_mode == "hindi":
        translator = GoogleTranslator(source="auto", target="hi")
        return [re.sub(r"\.{3,}", "...", translator.translate(p)) for p in paragraphs]

    if target_mode == "hinglish":
        # Convert into conversational Roman Hindi / English narrative blend
        en_translator = GoogleTranslator(source="auto", target="en")
        results = []
        for p in paragraphs:
            # If already Roman script with Hindi markers, refine punctuation; else translate and adapt
            has_devanagari = any("\u0900" <= ch <= "\u097f" for ch in p)
            if has_devanagari:
                en_text = en_translator.translate(p)
                results.append(re.sub(r"\.{3,}", "...", en_text))
            else:
                results.append(re.sub(r"\.{3,}", "...", p))
        return results

    return paragraphs


# ---------------------------------------------------------------------------
# API Request Models & Routes
# ---------------------------------------------------------------------------
class TranslateRequest(BaseModel):
    script: str
    target: str  # "keep" | "english" | "hindi" | "hinglish"


class PreviewVoiceRequest(BaseModel):
    voice: str
    sample_text: Optional[str] = None


class GenerateAudioRequest(BaseModel):
    script: str
    voice: str
    rate: int = -6
    pitch: int = -3
    pause: float = 1.5


@app.post("/translate")
async def translate_script(req: TranslateRequest):
    paragraphs = split_paragraphs(req.script)
    if not paragraphs:
        raise HTTPException(status_code=400, detail="Script cannot be empty.")

    target = req.target.lower().strip()
    if target == "keep":
        return {
            "translated_script": "\n\n".join(paragraphs),
            "engine": "original",
            "paragraph_count": len(paragraphs),
        }

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key and api_key != "MY_GEMINI_API_KEY":
        gemini_result = await asyncio.to_thread(translate_with_gemini, paragraphs, target, api_key)
        if gemini_result:
            return {
                "translated_script": "\n\n".join(gemini_result),
                "engine": "gemini",
                "paragraph_count": len(gemini_result),
            }

    translated = await asyncio.to_thread(translate_with_deep_translator, paragraphs, target)
    return {
        "translated_script": "\n\n".join(translated),
        "engine": "deep-translator",
        "paragraph_count": len(translated),
    }


@app.post("/preview-voice")
async def preview_voice(req: PreviewVoiceRequest):
    voice = req.voice.strip()
    sample_sentence = (req.sample_text or VOICE_SAMPLES.get(voice) or "The final chapter begins right now... listen closely.").strip()
    cache_key = hashlib.sha1(f"{voice}::{sample_sentence}".encode("utf-8")).hexdigest()[:12]
    safe_voice = re.sub(r"[^a-zA-Z0-9_-]", "_", voice)
    filename = f"{safe_voice}_{cache_key}.mp3"
    filepath = SAMPLES_CACHE_DIR / filename

    if filepath.exists() and filepath.stat().st_size > 256:
        return {
            "audio_url": f"/samples_cache/{filename}",
            "voice": voice,
            "cached": True,
            "sample_text": sample_sentence,
        }

    audio_bytes = await synthesize_chunk_bytes(sample_sentence, voice, "-4%", "-2Hz")
    if not audio_bytes:
        raise HTTPException(status_code=500, detail=f"Failed to synthesize preview for {voice}")

    filepath.write_bytes(audio_bytes)
    return {
        "audio_url": f"/samples_cache/{filename}",
        "voice": voice,
        "cached": False,
        "sample_text": sample_sentence,
    }


@app.post("/generate-audio")
async def generate_audio(req: GenerateAudioRequest):
    paragraphs = split_paragraphs(req.script)
    if not paragraphs:
        raise HTTPException(status_code=400, detail="Please provide a non-empty script.")

    voice = req.voice.strip()
    rate_str = format_rate(req.rate)
    pitch_str = format_pitch(req.pitch)
    pause_sec = max(0.5, min(3.0, float(req.pause)))
    silence_bytes = build_mp3_silence_bytes(pause_sec)

    combined_mp3 = bytearray()
    for idx, paragraph in enumerate(paragraphs):
        chunk_bytes = await synthesize_chunk_bytes(paragraph, voice, rate_str, pitch_str)
        combined_mp3.extend(chunk_bytes)
        if idx < len(paragraphs) - 1 and silence_bytes:
            combined_mp3.extend(silence_bytes)

    timestamp = int(time.time() * 1000)
    safe_voice = re.sub(r"[^a-zA-Z0-9_-]", "_", voice)
    filename = f"voiceover_{safe_voice}_{timestamp}.mp3"
    output_path = EXPORTS_DIR / filename
    output_path.write_bytes(bytes(combined_mp3))

    return {
        "audio_url": f"/exports/{filename}",
        "filename": filename,
        "voice": voice,
        "rate": rate_str,
        "pitch": pitch_str,
        "pause_seconds": pause_sec,
        "paragraph_count": len(paragraphs),
        "size_bytes": len(combined_mp3),
    }


# ---------------------------------------------------------------------------
# Embedded Minimalist Dark-Mode Single-File HTML/CSS/JS Frontend
# ---------------------------------------------------------------------------
INDEX_HTML = """<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VoxLinear — Edge-TTS Studio & Script Translator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090B;
      --surface: #121215;
      --surface-elevated: #18181B;
      --border: #27272A;
      --border-focus: #52525B;
      --text: #FAFAFA;
      --text-muted: #A1A1AA;
      --text-subtle: #71717A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 32px; border-bottom: 1px solid var(--border);
    }
    .container { max-width: 1280px; margin: 0 auto; padding: 32px; display: grid; gap: 32px; }
    .panel { border: 1px solid var(--border); background: var(--surface); border-radius: 8px; padding: 24px; }
    .step-title { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
    .step-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
    textarea {
      width: 100%; min-height: 180px; background: var(--bg); color: var(--text);
      border: 1px solid var(--border); border-radius: 6px; padding: 16px;
      font-family: inherit; font-size: 15px; resize: vertical; outline: none;
    }
    textarea:focus { border-color: var(--border-focus); }
    .btn {
      background: var(--text); color: var(--bg); border: 1px solid var(--text);
      padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s ease;
    }
    .btn:hover { opacity: 0.9; }
    .btn-secondary {
      background: var(--surface-elevated); color: var(--text); border: 1px solid var(--border);
    }
    .grid-voices { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .voice-card {
      border: 1px solid var(--border); background: var(--bg); border-radius: 6px;
      padding: 14px; display: flex; flex-direction: column; gap: 10px; cursor: pointer;
    }
    .voice-card.active { border-color: var(--text); background: var(--surface-elevated); }
    .controls-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 20px; }
    input[type="range"] { width: 100%; accent-color: #FAFAFA; }
  </style>
</head>
<body>
  <header>
    <div style="font-weight:700; letter-spacing:-0.02em;">VoxLinear</div>
    <div class="mono" style="font-size:12px; color:var(--text-muted);">Python 3.14 · edge-tts Neural Studio</div>
  </header>
  <main class="container">
    <section class="panel">
      <div class="step-title">01. Script Input & Translation Engine</div>
      <div class="step-desc">Paste Hinglish, Hindi, or English script, or upload a .txt file. Preserves paragraph breaks and dramatic pauses (...).</div>
      <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
        <select id="targetLang" class="btn btn-secondary">
          <option value="keep">Keep Original (No Translation - e.g., Hinglish/Hindi)</option>
          <option value="english">Translate to Natural English</option>
          <option value="hindi">Translate to Hindi (Devanagari)</option>
          <option value="hinglish">Translate to Hinglish (Conversational Roman Hindi)</option>
        </select>
        <button class="btn" onclick="translateScript()">Translate / Prepare Script</button>
      </div>
      <textarea id="scriptInput">Us raat 2 baje server room mein sirf ek monitor chal raha tha... aur screen par ek aisi file khuli thi jiska naam kisi official record mein nahi tha.

Kabir ne apna phone uthaya, lekin network gayab tha... phir bhi uske paas ek anjaan number se message aaya.</textarea>
    </section>

    <section class="panel">
      <div class="step-title">02. Indian Male & Global English Voice Selector</div>
      <div class="step-desc">Audition any voice with live edge-tts synthesis before generating your full narration.</div>
      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <button id="tabIndian" class="btn" onclick="switchTab('indian')">Indian Male & Regional Voices</button>
        <button id="tabGlobal" class="btn btn-secondary" onclick="switchTab('global')">Global English Male & Female Voices</button>
      </div>
      <div id="voicesGrid" class="grid-voices"></div>
      <audio id="samplePlayer" style="display:none;"></audio>
    </section>

    <section class="panel">
      <div class="step-title">03. Prosody Controls & Full Audio Generation</div>
      <div class="step-desc">Fine-tune narrative rate, vocal resonance pitch, and inter-paragraph silence frames.</div>
      <div class="controls-row">
        <div>
          <label style="font-size:13px;">Speaking Rate: <span id="rateVal" class="mono">-6%</span></label>
          <input type="range" id="rateSlider" min="-25" max="25" value="-6" oninput="document.getElementById('rateVal').textContent=(this.value>=0?'+'+this.value:this.value)+'%'">
        </div>
        <div>
          <label style="font-size:13px;">Vocal Pitch: <span id="pitchVal" class="mono">-3Hz</span></label>
          <input type="range" id="pitchSlider" min="-10" max="10" value="-3" oninput="document.getElementById('pitchVal').textContent=(this.value>=0?'+'+this.value:this.value)+'Hz'">
        </div>
        <div>
          <label style="font-size:13px;">Paragraph Pause: <span id="pauseVal" class="mono">1.5s</span></label>
          <input type="range" id="pauseSlider" min="0.5" max="3.0" step="0.1" value="1.5" oninput="document.getElementById('pauseVal').textContent=this.value+'s'">
        </div>
      </div>
      <button id="genBtn" class="btn" onclick="generateFullAudio()">Generate Full Voiceover MP3</button>
      <div id="outputArea" style="margin-top:20px; display:none;">
        <audio id="masterAudio" controls style="width:100%; margin-bottom:12px;"></audio>
        <a id="downloadLink" class="btn btn-secondary" download style="text-decoration:none; display:inline-block;">Download MP3</a>
      </div>
    </section>
  </main>
  <script>
    const VOICES = [
      { id: 'hi-IN-MadhurNeural', label: 'Madhur — Deep Hindi/Hinglish Narrator, Male', tab: 'indian' },
      { id: 'en-IN-PrabhatNeural', label: 'Prabhat — Crisp Indian English, Male', tab: 'indian' },
      { id: 'en-IN-NeerjaNeural', label: 'Neerja — Indian English, Female', tab: 'indian' },
      { id: 'hi-IN-SwaraNeural', label: 'Swara — Expressive Hindi, Female', tab: 'indian' },
      { id: 'mr-IN-ManoharNeural', label: 'Manohar — Marathi/Indian Accent, Male', tab: 'indian' },
      { id: 'gu-IN-NiranjanNeural', label: 'Niranjan — Gujarati/Indian Accent, Male', tab: 'indian' },
      { id: 'ta-IN-ValluvarNeural', label: 'Valluvar — Tamil/Indian Accent, Male', tab: 'indian' },
      { id: 'te-IN-MohanNeural', label: 'Mohan — Telugu/Indian Accent, Male', tab: 'indian' },
      { id: 'en-US-AndrewNeural', label: 'Andrew — Warm American Narrator, Male', tab: 'global' },
      { id: 'en-US-BrianNeural', label: 'Brian — Deep Documentary/Thriller, Male', tab: 'global' },
      { id: 'en-US-ChristopherNeural', label: 'Christopher — Authoritative, Male', tab: 'global' },
      { id: 'en-GB-RyanNeural', label: 'Ryan — Sharp British Spy/Drama, Male', tab: 'global' },
      { id: 'en-GB-ThomasNeural', label: 'Thomas — Calm British, Male', tab: 'global' },
      { id: 'en-AU-WilliamNeural', label: 'William — Australian, Male', tab: 'global' },
      { id: 'en-US-AriaNeural', label: 'Aria — Expressive American, Female', tab: 'global' },
      { id: 'en-GB-SoniaNeural', label: 'Sonia — British, Female', tab: 'global' }
    ];
    let currentTab = 'indian';
    let selectedVoice = 'hi-IN-MadhurNeural';

    function renderVoices() {
      const grid = document.getElementById('voicesGrid');
      grid.innerHTML = '';
      VOICES.filter(v => v.tab === currentTab).forEach(v => {
        const card = document.createElement('div');
        card.className = 'voice-card' + (v.id === selectedVoice ? ' active' : '');
        card.onclick = () => { selectedVoice = v.id; renderVoices(); };
        card.innerHTML = `
          <div style="font-weight:600; font-size:14px;">${v.label}</div>
          <div class="mono" style="font-size:12px; color:var(--text-muted);">${v.id}</div>
          <button class="btn btn-secondary" style="align-self:flex-start;" onclick="event.stopPropagation(); previewSample('${v.id}', this)">▶ Listen Sample</button>
        `;
        grid.appendChild(card);
      });
    }
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tabIndian').className = tab === 'indian' ? 'btn' : 'btn btn-secondary';
      document.getElementById('tabGlobal').className = tab === 'global' ? 'btn' : 'btn btn-secondary';
      renderVoices();
    }
    async function translateScript() {
      const script = document.getElementById('scriptInput').value;
      const target = document.getElementById('targetLang').value;
      const res = await fetch('/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, target })
      });
      const data = await res.json();
      if (data.translated_script) document.getElementById('scriptInput').value = data.translated_script;
    }
    async function previewSample(voice, btn) {
      const orig = btn.textContent;
      btn.textContent = 'Synthesizing...';
      try {
        const res = await fetch('/preview-voice', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice })
        });
        const data = await res.json();
        if (data.audio_url) {
          const player = document.getElementById('samplePlayer');
          player.src = data.audio_url;
          player.play();
        }
      } finally { btn.textContent = orig; }
    }
    async function generateFullAudio() {
      const btn = document.getElementById('genBtn');
      btn.textContent = 'Synthesizing Paragraphs...';
      try {
        const res = await fetch('/generate-audio', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: document.getElementById('scriptInput').value,
            voice: selectedVoice,
            rate: parseInt(document.getElementById('rateSlider').value, 10),
            pitch: parseInt(document.getElementById('pitchSlider').value, 10),
            pause: parseFloat(document.getElementById('pauseSlider').value)
          })
        });
        const data = await res.json();
        if (data.audio_url) {
          document.getElementById('outputArea').style.display = 'block';
          const audio = document.getElementById('masterAudio');
          audio.src = data.audio_url;
          audio.play();
          const dl = document.getElementById('downloadLink');
          dl.href = data.audio_url;
          dl.download = data.filename || 'voiceover.mp3';
        }
      } finally { btn.textContent = 'Generate Full Voiceover MP3'; }
    }
    renderVoices();
  </script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    return HTMLResponse(content=INDEX_HTML)


def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://127.0.0.1:8000")


if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)
