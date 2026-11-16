import React, { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';

interface ParagraphMetric {
  index: number;
  preview: string;
  bytes: number;
}

interface WaveformPlayerProps {
  audioUrl: string;
  filename: string;
  voiceId: string;
  rate: string;
  pitch: string;
  pauseSeconds: number;
  paragraphCount: number;
  sizeBytes: number;
  paragraphs?: ParagraphMetric[];
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  filename,
  voiceId,
  rate,
  pitch,
  pauseSeconds,
  paragraphCount,
  sizeBytes,
  paragraphs = [],
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState<number[]>([]);

  // Generate deterministic editorial waveform profile based on filename + paragraph metrics
  useEffect(() => {
    const totalBars = 72;
    const generated: number[] = [];
    let seed = 0;
    for (let i = 0; i < filename.length; i++) {
      seed = (seed * 31 + filename.charCodeAt(i)) % 100000;
    }
    for (let i = 0; i < totalBars; i++) {
      // Insert quiet troughs representing paragraph silence frames
      const isSilenceGap =
        paragraphCount > 1 &&
        i > 6 &&
        i < totalBars - 6 &&
        i % Math.max(8, Math.floor(totalBars / paragraphCount)) === 0;
      if (isSilenceGap) {
        generated.push(0.12);
      } else {
        const wave =
          0.28 +
          0.45 * Math.abs(Math.sin((i + seed) * 0.43)) +
          0.22 * Math.abs(Math.cos((i * 1.7 + seed) * 0.29));
        generated.push(Math.min(0.96, Math.max(0.18, wave)));
      }
    }
    setBars(generated);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [audioUrl, filename, paragraphCount]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const restartAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().catch(() => {});
  };

  const handleScrub = (index: number) => {
    const audio = audioRef.current;
    if (!audio || !bars.length) return;
    const targetRatio = index / bars.length;
    const effectiveDuration = duration > 0 && Number.isFinite(duration) ? duration : 12;
    audio.currentTime = targetRatio * effectiveDuration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (sec: number): string => {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const effectiveDuration = duration > 0 && Number.isFinite(duration) ? duration : 0;
  const progressRatio = effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;
  const formattedSizeKb = Math.max(1, Math.round(sizeBytes / 1024));

  return (
    <div
      data-testid="master-audio-player"
      className="mt-6 border border-[#27272A] bg-[#0E0E11] rounded-md p-5"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
        <div>
          <div className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <span>Master Voiceover Output</span>
          </div>
          <div className="text-xs text-zinc-400 font-mono tabular-nums mt-1">
            <span>{voiceId}</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
            <span>Rate {rate}</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
            <span>Pitch {pitch}</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
            <span>Pause {pauseSeconds.toFixed(1)}s</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
            <span>{paragraphCount} {paragraphCount === 1 ? 'Paragraph' : 'Paragraphs'}</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
            <span>{formattedSizeKb} KB</span>
          </div>
        </div>

        <a
          href={audioUrl}
          download={filename}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#FAFAFA] text-[#09090B] rounded hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download MP3</span>
        </a>
      </div>

      {/* Interactive Waveform Scrubber */}
      <div className="py-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause master voiceover' : 'Play master voiceover'}
            className="w-10 h-10 rounded border border-[#27272A] bg-[#141417] hover:border-zinc-500 flex items-center justify-center text-[#FAFAFA] transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={restartAudio}
            aria-label="Restart playback"
            className="w-9 h-9 rounded border border-[#27272A] bg-[#09090B] hover:border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-[#FAFAFA] transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div
            role="slider"
            aria-label="Audio waveform scrubber"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressRatio * 100)}
            tabIndex={0}
            className="flex-1 h-14 flex items-center gap-[3px] px-3 py-2 border border-[#27272A] bg-[#0E0E11] rounded cursor-pointer select-none overflow-hidden"
          >
            {bars.map((amp, idx) => {
              const isPassed = idx / bars.length <= progressRatio;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleScrub(idx)}
                  aria-label={`Seek to ${Math.round((idx / bars.length) * 100)}%`}
                  className="flex-1 h-full flex items-center justify-center group focus:outline-none"
                >
                  <span
                    className={`w-full rounded-xs transition-colors ${
                      isPassed
                        ? 'bg-[#FAFAFA]'
                        : 'bg-zinc-700 group-hover:bg-zinc-500'
                    }`}
                    style={{ height: `${Math.round(amp * 100)}%` }}
                  />
                </button>
              );
            })}
          </div>

          <div className="text-xs font-mono tabular-nums text-zinc-300 shrink-0 min-w-[88px] text-right">
            <span>{formatTime(currentTime)}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-400">{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        {/* Native HTML5 Audio Element for direct browser scrubbing & accessibility */}
        <div className="mt-4">
          <audio
            controls
            src={audioUrl}
            className="w-full h-9 opacity-90"
            aria-label="HTML5 Master Voiceover Audio Player"
          />
        </div>
      </div>

      {paragraphs.length > 0 && (
        <div className="pt-3 border-t border-[#27272A]">
          <div className="text-xs text-zinc-400 mb-2 font-medium">
            Synthesized Paragraph Segments (with {pauseSeconds.toFixed(1)}s CBR MP3 silence frames inserted)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {paragraphs.map((p) => (
              <div
                key={p.index}
                className="text-xs text-zinc-400 font-mono tabular-nums truncate py-1 px-2.5 border border-[#27272A] rounded bg-[#0E0E11]"
              >
                <span className="text-zinc-200 mr-2">P{String(p.index).padStart(2, '0')}</span>
                <span className="text-zinc-500 mr-2">·</span>
                <span className="font-sans text-zinc-300">{p.preview}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
