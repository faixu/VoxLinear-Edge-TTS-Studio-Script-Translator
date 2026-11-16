import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Languages,
  Loader2,
  RotateCcw,
  Sliders,
  Upload,
  Volume2,
} from 'lucide-react';
import {
  CURATED_VOICES,
  DEFAULT_SAMPLE_SCRIPT,
  TranslationMode,
  VoiceOption,
  VoiceTab,
  clampPauseDuration,
  estimateAudioDurationSeconds,
  formatEdgePitch,
  formatEdgeRate,
  splitScriptIntoParagraphs,
} from './utils/audioProsody';
import { WaveformPlayer } from './components/WaveformPlayer';
import { PythonSourceModal } from './components/PythonSourceModal';

interface GeneratedMasterAudio {
  audio_url: string;
  filename: string;
  voice: string;
  rate: string;
  pitch: string;
  pause_seconds: number;
  paragraph_count: number;
  size_bytes: number;
  paragraphs?: Array<{ index: number; preview: string; bytes: number }>;
}

const SCRIPT_PRESETS: Array<{ label: string; script: string }> = [
  {
    label: 'Hinglish Cyber Thriller',
    script: DEFAULT_SAMPLE_SCRIPT,
  },
  {
    label: 'Hindi Noir Mystery',
    script: `उस रात दिल्ली के पुराने आर्काइव रूम में सिर्फ एक घड़ी टिक-टिक कर रही थी... और मेज पर रखी लाल फाइल अचानक गायब थी।

इंस्पेक्टर राठौड़ ने खिड़की की तरफ देखा... बाहर कोहरे में कोई चुपचाप खड़ा उन्हें ही देख रहा था।`,
  },
  {
    label: 'Global Documentary Intro',
    script: `At 03:14 UTC, every deep-space receiver across the northern hemisphere locked onto the exact same frequency... a signal repeating every fourteen seconds.

When analysts finally decoded the first frame of telemetry... they found a message recorded in nineteen seventy-seven.`,
  },
];

export default function App() {
  // Step 1: Script & Translation State
  const [sourceScript, setSourceScript] = useState<string>(DEFAULT_SAMPLE_SCRIPT);
  const [finalScript, setFinalScript] = useState<string>(DEFAULT_SAMPLE_SCRIPT);
  const [translationMode, setTranslationMode] = useState<TranslationMode>('keep');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationEngineUsed, setTranslationEngineUsed] = useState<string>('original');
  const [translationError, setTranslationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2: Voice Selector & Live Sample Preview State
  const [activeVoiceTab, setActiveVoiceTab] = useState<VoiceTab>('indian');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('hi-IN-MadhurNeural');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [playingSampleVoiceId, setPlayingSampleVoiceId] = useState<string | null>(null);
  const [cachedSampleVoices, setCachedSampleVoices] = useState<Record<string, string>>({});
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Step 3: Prosody Controls & Full Audio Generation State
  const [ratePercent, setRatePercent] = useState<number>(-6);
  const [pitchHz, setPitchHz] = useState<number>(-3);
  const [pauseSeconds, setPauseSeconds] = useState<number>(1.5);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [masterAudio, setMasterAudio] = useState<GeneratedMasterAudio | null>(null);

  // Self-Contained Python Bundle Modal State
  const [isPythonModalOpen, setIsPythonModalOpen] = useState<boolean>(false);
  const [pythonFiles, setPythonFiles] = useState<{ appPy: string; requirementsTxt: string }>({
    appPy: '',
    requirementsTxt: '',
  });

  useEffect(() => {
    fetch('/api/source-files')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.appPy) {
          setPythonFiles({
            appPy: data.appPy,
            requirementsTxt: data.requirementsTxt || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = typeof event.target?.result === 'string' ? event.target.result : '';
      if (content.trim()) {
        setSourceScript(content);
        setFinalScript(content);
        setTranslationError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTranslate = async (modeOverride?: TranslationMode) => {
    const modeToUse = modeOverride ?? translationMode;
    if (!sourceScript.trim()) {
      setTranslationError('Please enter or upload a script first.');
      return;
    }

    setTranslationError(null);
    if (modeToUse === 'keep') {
      const cleaned = splitScriptIntoParagraphs(sourceScript).join('\n\n');
      setFinalScript(cleaned);
      setTranslationEngineUsed('original');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: sourceScript,
          target: modeToUse,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Translation failed');
      }
      setFinalScript(data.translated_script || sourceScript);
      setTranslationEngineUsed(data.engine || 'deep-translator');
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : 'Translation request failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePreviewVoice = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    const audioEl = sampleAudioRef.current;

    // If this exact voice is currently playing, stop it
    if (playingSampleVoiceId === voice.id && audioEl && !audioEl.paused) {
      audioEl.pause();
      audioEl.currentTime = 0;
      setPlayingSampleVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    try {
      const response = await fetch('/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voice.id,
          sample_text: voice.sampleText,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audio_url) {
        throw new Error(data.error || 'Voice sample failed');
      }

      setCachedSampleVoices((prev) => ({ ...prev, [voice.id]: data.audio_url }));

      if (audioEl) {
        audioEl.pause();
        audioEl.src = data.audio_url;
        setPlayingSampleVoiceId(voice.id);
        audioEl.play().catch(() => {
          setPlayingSampleVoiceId(null);
        });
      }
    } catch {
      setPlayingSampleVoiceId(null);
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const handleGenerateFullVoiceover = async () => {
    const activeScript = finalScript.trim() || sourceScript.trim();
    if (!activeScript) {
      setGenerationError('Script cannot be empty. Enter or translate a script in Step 1.');
      return;
    }

    setGenerationError(null);
    setIsGeneratingAudio(true);

    try {
      const response = await fetch('/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: activeScript,
          voice: selectedVoiceId,
          rate: ratePercent,
          pitch: pitchHz,
          pause: pauseSeconds,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audio_url) {
        throw new Error(data.error || data.detail || 'Voiceover generation failed');
      }
      setMasterAudio(data);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate voiceover MP3');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const resetProsodyDefaults = () => {
    setRatePercent(-6);
    setPitchHz(-3);
    setPauseSeconds(1.5);
  };

  const activeParagraphs = splitScriptIntoParagraphs(finalScript);
  const wordCount = finalScript.trim() ? finalScript.trim().split(/\s+/).length : 0;
  const estimatedSeconds = estimateAudioDurationSeconds(finalScript, ratePercent, pauseSeconds);
  const selectedVoiceObj =
    CURATED_VOICES.find((v) => v.id === selectedVoiceId) || CURATED_VOICES[0];
  const visibleVoices = CURATED_VOICES.filter((v) => v.tab === activeVoiceTab);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col">
      {/* Hidden audio element for instant sample auditioning */}
      <audio
        ref={sampleAudioRef}
        onEnded={() => setPlayingSampleVoiceId(null)}
        onPause={() => setPlayingSampleVoiceId(null)}
        className="hidden"
      />

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-10 py-4 border-b border-[#27272A] bg-[#09090B]">
        <a
          href="#top"
          className="text-base font-bold tracking-tight text-[#FAFAFA] whitespace-nowrap shrink-0"
        >
          VoxLinear
        </a>

        <nav
          aria-label="Studio Workflow Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400"
        >
          <a
            href="#step-1-script"
            className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
          >
            01. Script &amp; Translation
          </a>
          <a
            href="#step-2-voices"
            className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
          >
            02. Voice Selector
          </a>
          <a
            href="#step-3-prosody"
            className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
          >
            03. Prosody &amp; Audio
          </a>
          <button
            type="button"
            onClick={() => setIsPythonModalOpen(true)}
            className="hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
          >
            Python 3.14 Source
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsPythonModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-[#FAFAFA] text-[#09090B] rounded hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
          >
            Get Python Bundle
          </button>
        </div>
      </header>

      {/* Main Editorial Workspace */}
      <main id="top" className="flex-1 max-w-[1360px] w-full mx-auto px-6 lg:px-10 py-8 space-y-10">
        {/* Intro Editorial Header */}
        <section className="pb-6 border-b border-[#27272A] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-zinc-400 mb-2">
              Edge-TTS Neural Synthesis · Python 3.14 Windows 11 Compatible · Zero pydub/audioop
            </p>
            <h1
              className="text-2xl lg:text-3xl font-bold tracking-tight text-[#FAFAFA]"
              style={{ textWrap: 'balance' }}
            >
              Script Translation &amp; Neural Voiceover Studio
            </h1>
          </div>
          <div className="text-xs font-mono tabular-nums text-zinc-400 flex flex-wrap items-center gap-2">
            <span>{ activeParagraphs.length } Paragraphs</span>
            <span aria-hidden="true">·</span>
            <span>{ wordCount } Words</span>
            <span aria-hidden="true">·</span>
            <span>~{ estimatedSeconds }s Est. Runtime</span>
            <span aria-hidden="true">·</span>
            <span className="text-zinc-200">{ selectedVoiceObj.name } ({ selectedVoiceObj.id })</span>
          </div>
        </section>

        {/* STEP 1 — SCRIPT INPUT & TRANSLATION ENGINE */}
        <section id="step-1-script" className="pt-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#27272A]">
            <div>
              <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span>01. Script Input &amp; Translation Engine</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Paste or type your Hinglish, Hindi, or English script, or upload a .txt file. Preserves paragraph breaks and dramatic punctuation (...).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {SCRIPT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSourceScript(preset.script);
                    setFinalScript(preset.script);
                    setTranslationError(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium text-zinc-300 border border-[#27272A] bg-[#0E0E11] hover:border-zinc-500 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {preset.label}
                </button>
              ))}

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload .txt script file"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#FAFAFA] border border-[#27272A] bg-[#16161A] hover:border-zinc-500 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .txt</span>
              </button>
            </div>
          </div>

          {/* Target Language / Script Translation Bar */}
          <div className="py-4 border-b border-[#27272A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <label
                htmlFor="translation-target-select"
                className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Languages className="w-3.5 h-3.5 text-zinc-400" />
                <span>Target Language / Script Translation:</span>
              </label>

              <select
                id="translation-target-select"
                value={translationMode}
                onChange={(e) => {
                  const nextMode = e.target.value as TranslationMode;
                  setTranslationMode(nextMode);
                  handleTranslate(nextMode);
                }}
                className="flex-1 max-w-md bg-[#0E0E11] text-[#FAFAFA] text-xs font-medium border border-[#27272A] rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
              >
                <option value="keep">
                  Keep Original (No Translation - e.g., Hinglish/Hindi)
                </option>
                <option value="english">Translate to Natural English</option>
                <option value="hindi">Translate to Hindi (Devanagari)</option>
                <option value="hinglish">
                  Translate to Hinglish (Conversational Roman Hindi)
                </option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">
                Engine: {translationEngineUsed}
              </span>
              <button
                type="button"
                onClick={() => handleTranslate()}
                disabled={isTranslating}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#FAFAFA] text-[#09090B] rounded hover:bg-zinc-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating Script...</span>
                  </>
                ) : (
                  <span>Translate Script</span>
                )}
              </button>
            </div>
          </div>

          {translationError && (
            <div
              role="alert"
              className="mt-4 px-4 py-2.5 border border-red-900/60 bg-red-950/30 text-red-200 text-xs rounded"
            >
              {translationError}
            </div>
          )}

          {/* Dual / Synchronized Distraction-Free Script Editors */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="source-script-textarea"
                  className="text-xs font-medium text-zinc-300"
                >
                  Source Script Input (Hinglish, Hindi, or English)
                </label>
                <span className="text-xs font-mono tabular-nums text-zinc-500">
                  {splitScriptIntoParagraphs(sourceScript).length} paragraphs
                </span>
              </div>
              <textarea
                id="source-script-textarea"
                value={sourceScript}
                onChange={(e) => {
                  const val = e.target.value;
                  setSourceScript(val);
                  if (translationMode === 'keep') {
                    setFinalScript(val);
                  }
                }}
                rows={8}
                placeholder="Paste your Hinglish, Hindi, or English script here..."
                className="w-full flex-1 bg-[#0E0E11] text-[#FAFAFA] border border-[#27272A] focus:border-zinc-500 rounded p-4 text-sm leading-relaxed focus:outline-none resize-y"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="final-script-textarea"
                  className="text-xs font-medium text-[#FAFAFA]"
                >
                  Translated / Final Editable Script (Sent to Voiceover Generator)
                </label>
                <span className="text-xs font-mono tabular-nums text-zinc-400">
                  {activeParagraphs.length} paragraphs · {wordCount} words
                </span>
              </div>
              <textarea
                id="final-script-textarea"
                value={finalScript}
                onChange={(e) => setFinalScript(e.target.value)}
                rows={8}
                placeholder="Translated or final editable narration script..."
                className="w-full flex-1 bg-[#0E0E11] text-[#FAFAFA] border border-[#27272A] focus:border-zinc-400 rounded p-4 text-sm leading-relaxed focus:outline-none resize-y"
              />
            </div>
          </div>
        </section>

        {/* STEP 2 — INDIAN MALE & GLOBAL ENGLISH VOICE SELECTOR WITH LIVE SAMPLES */}
        <section id="step-2-voices" className="pt-8 border-t border-[#27272A]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#27272A]">
            <div>
              <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                <span>02. Indian Male &amp; Global English Voice Selector</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Select a neural narrator or click &ldquo;▶ Listen Sample&rdquo; on any voice card to audition a cached 1-sentence thriller preview.
              </p>
            </div>

            {/* Two Curated Category Tabs */}
            <div
              role="tablist"
              aria-label="Voice Regional Categories"
              className="inline-flex p-1 bg-[#0E0E11] border border-[#27272A] rounded"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeVoiceTab === 'indian'}
                onClick={() => setActiveVoiceTab('indian')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeVoiceTab === 'indian'
                    ? 'bg-[#FAFAFA] text-[#09090B]'
                    : 'text-zinc-400 hover:text-[#FAFAFA]'
                }`}
              >
                Indian Male &amp; Regional Voices (8)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeVoiceTab === 'global'}
                onClick={() => setActiveVoiceTab('global')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeVoiceTab === 'global'
                    ? 'bg-[#FAFAFA] text-[#09090B]'
                    : 'text-zinc-400 hover:text-[#FAFAFA]'
                }`}
              >
                Global English Male &amp; Female Voices (8)
              </button>
            </div>
          </div>

          {/* 8-Voice Curated Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {visibleVoices.map((voice) => {
              const isSelected = voice.id === selectedVoiceId;
              const isPreviewLoading = previewingVoiceId === voice.id;
              const isPlayingThis = playingSampleVoiceId === voice.id;
              const isCached = Boolean(cachedSampleVoices[voice.id]);

              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoiceId(voice.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedVoiceId(voice.id);
                    }
                  }}
                  className={`flex flex-col justify-between p-4 rounded border transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'border-[#FAFAFA] bg-[#141418]'
                      : 'border-[#27272A] bg-[#0E0E11] hover:border-zinc-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#FAFAFA] truncate">
                        {voice.name}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                        {voice.gender} · {voice.region}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-300 mt-1 truncate">{voice.role}</div>

                    <div className="text-[11px] font-mono text-zinc-500 mt-1 truncate">
                      {voice.id}
                    </div>

                    <p className="text-xs text-zinc-400 mt-3 line-clamp-2 italic">
                      &ldquo;{voice.sampleText}&rdquo;
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => handlePreviewVoice(voice, e)}
                      disabled={isPreviewLoading}
                      aria-label={`Listen sample for ${voice.name} (${voice.id})`}
                      className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 ${
                        isPlayingThis
                          ? 'bg-[#FAFAFA] text-[#09090B] border-[#FAFAFA]'
                          : 'bg-[#09090B] text-zinc-200 border-[#27272A] hover:border-zinc-500'
                      }`}
                    >
                      {isPreviewLoading
                        ? 'Synthesizing...'
                        : isPlayingThis
                        ? '■ Stop Sample'
                        : '▶ Listen Sample'}
                    </button>

                    <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                      {isSelected ? 'Selected' : isCached ? 'Cached' : 'Ready'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* STEP 3 — PROSODY CONTROLS & FULL AUDIO GENERATION */}
        <section id="step-3-prosody" className="pt-8 border-t border-[#27272A]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#27272A]">
            <div>
              <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-zinc-400" />
                <span>03. Prosody Controls &amp; Full Audio Generation</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure speaking rate, vocal resonance pitch, and exact CBR MP3 silence duration between paragraphs.
              </p>
            </div>

            <button
              type="button"
              onClick={resetProsodyDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-[#27272A] bg-[#0E0E11] hover:border-zinc-500 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Thriller Defaults (-6% · -3Hz · 1.5s)</span>
            </button>
          </div>

          {/* Three Prosody Sliders */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Speaking Rate (-25% to +25%, default -6%) */}
            <div className="p-4 border border-[#27272A] bg-[#0E0E11] rounded">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="rate-slider"
                  className="text-xs font-semibold text-[#FAFAFA]"
                >
                  Speaking Rate
                </label>
                <span
                  data-testid="rate-display"
                  className="text-xs font-mono tabular-nums text-[#FAFAFA] font-semibold"
                >
                  {formatEdgeRate(ratePercent)}
                </span>
              </div>
              <input
                id="rate-slider"
                type="range"
                min={-25}
                max={25}
                step={1}
                value={ratePercent}
                onChange={(e) => setRatePercent( Number(e.target.value) )}
                className="w-full my-2"
              />
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-zinc-500 mt-1">
                <span>-25% (Slow)</span>
                <span>-6% Default</span>
                <span>+25% (Fast)</span>
              </div>
            </div>

            {/* Vocal Pitch (-10Hz to +10Hz, default -3Hz) */}
            <div className="p-4 border border-[#27272A] bg-[#0E0E11] rounded">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="pitch-slider"
                  className="text-xs font-semibold text-[#FAFAFA]"
                >
                  Vocal Pitch
                </label>
                <span
                  data-testid="pitch-display"
                  className="text-xs font-mono tabular-nums text-[#FAFAFA] font-semibold"
                >
                  {formatEdgePitch(pitchHz)}
                </span>
              </div>
              <input
                id="pitch-slider"
                type="range"
                min={-10}
                max={10}
                step={1}
                value={pitchHz}
                onChange={(e) => setPitchHz(Number(e.target.value))}
                className="w-full my-2"
              />
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-zinc-500 mt-1">
                <span>-10Hz (Deep)</span>
                <span>-3Hz Default</span>
                <span>+10Hz (Bright)</span>
              </div>
            </div>

            {/* Paragraph Pause Duration (0.5s to 3.0s, default 1.5s) */}
            <div className="p-4 border border-[#27272A] bg-[#0E0E11] rounded">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="pause-slider"
                  className="text-xs font-semibold text-[#FAFAFA]"
                >
                  Paragraph Pause Duration
                </label>
                <span
                  data-testid="pause-display"
                  className="text-xs font-mono tabular-nums text-[#FAFAFA] font-semibold"
                >
                  {clampPauseDuration(pauseSeconds).toFixed(1)}s
                </span>
              </div>
              <input
                id="pause-slider"
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={pauseSeconds}
                onChange={(e) => setPauseSeconds( Number(e.target.value) )}
                className="w-full my-2"
              />
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-zinc-500 mt-1">
                <span>0.5s (Tight)</span>
                <span>1.5s Default</span>
                <span>3.0s (Dramatic)</span>
              </div>
            </div>
          </div>

          {/* Primary Action Bar */}
          <div className="mt-6 pt-5 border-t border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-zinc-400 font-mono tabular-nums">
              <span>Selected Voice: {selectedVoiceObj.label}</span>
              <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
              <span>Rate {formatEdgeRate(ratePercent)}</span>
              <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
              <span>Pitch {formatEdgePitch(pitchHz)}</span>
              <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
              <span>Pause {clampPauseDuration(pauseSeconds).toFixed(1)}s</span>
            </div>

            <button
              type="button"
              onClick={handleGenerateFullVoiceover}
              disabled={isGeneratingAudio}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold bg-[#FAFAFA] text-[#09090B] rounded hover:bg-zinc-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {isGeneratingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing {activeParagraphs.length} Paragraphs...</span>
                </>
              ) : (
                <span>Generate Full Voiceover MP3</span>
              )}
            </button>
          </div>

          {generationError && (
            <div
              role="alert"
              className="mt-4 px-4 py-2.5 border border-red-900/60 bg-red-950/30 text-red-200 text-xs rounded"
            >
              {generationError}
            </div>
          )}

          {/* Interactive HTML5 Waveform Player & Download MP3 */}
          {masterAudio && (
            <WaveformPlayer
              audioUrl={masterAudio.audio_url}
              filename={masterAudio.filename}
              voiceId={masterAudio.voice}
              rate={masterAudio.rate}
              pitch={masterAudio.pitch}
              pauseSeconds={masterAudio.pause_seconds}
              paragraphCount={masterAudio.paragraph_count}
              sizeBytes={masterAudio.size_bytes}
              paragraphs={masterAudio.paragraphs}
            />
          )}
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#27272A] px-6 lg:px-10 py-5 mt-12 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          VoxLinear Studio · Built for Python 3.14 &amp; Windows 11 with edge-tts and deep-translator
        </div>
        <button
          type="button"
          onClick={() => setIsPythonModalOpen(true)}
          className="text-zinc-400 hover:text-[#FAFAFA] underline underline-offset-4 transition-colors"
        >
          View &amp; Download app.py + requirements.txt
        </button>
      </footer>

      <PythonSourceModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        appPyContent={pythonFiles.appPy}
        requirementsTxtContent={pythonFiles.requirementsTxt}
      />
    </div>
  );
}
