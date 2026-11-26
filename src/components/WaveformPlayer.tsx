import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import {
  Download,
  Loader2,
  Pause,
  Play,
  Repeat,
  Volume2,
  Waves,
} from "lucide-react";
import { useVoiceGenStore } from "../store/useVoiceGenStore";

function formatTime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return "0:00.0";
  const m = Math.floor(secs / 60);
  const rem = secs % 60;
  const s = Math.floor(rem);
  const tenths = Math.floor((rem - s) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${tenths}`;
}

export const WaveformPlayer: React.FC = () => {
  const currentAudio = useVoiceGenStore((s) => s.currentAudio);
  const playerVolume = useVoiceGenStore((s) => s.playerVolume);
  const exportBitrate = useVoiceGenStore((s) => s.exportBitrate);
  const setPlayerVolume = useVoiceGenStore((s) => s.setPlayerVolume);
  const openExportModal = useVoiceGenStore((s) => s.openExportModal);
  const pushToast = useVoiceGenStore((s) => s.pushToast);

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startOffsetRef = useRef(0);
  const startTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isLoopingRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const loadedAudioIdRef = useRef<string | null>(null);

  isLoopingRef.current = isLooping;

  const stopSourceNode = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.onended = null;
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch {
        // already stopped
      }
      sourceRef.current = null;
    }
  }, []);

  const ensureAudioGraph = useCallback(async () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = useVoiceGenStore.getState().playerVolume;
    }
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 128;
      gainRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    }
    return ctx;
  }, []);

  const getElapsedSeconds = useCallback((): number => {
    const buf = audioBufferRef.current;
    const ctx = audioCtxRef.current;
    if (!buf) return 0;
    if (!isPlayingRef.current || !ctx) {
      return Math.min(buf.duration, Math.max(0, startOffsetRef.current));
    }
    const raw = startOffsetRef.current + (ctx.currentTime - startTimeRef.current);
    if (isLoopingRef.current && buf.duration > 0) {
      return raw % buf.duration;
    }
    return Math.min(buf.duration, Math.max(0, raw));
  }, []);

  const playFromOffset = useCallback(
    async (offsetSec: number) => {
      const buf = audioBufferRef.current;
      if (!buf) return;
      const ctx = await ensureAudioGraph();
      stopSourceNode();

      const safeOffset =
        offsetSec >= buf.duration - 0.02
          ? 0
          : Math.max(0, Math.min(offsetSec, buf.duration));

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = isLoopingRef.current;
      src.connect(gainRef.current!);

      startOffsetRef.current = safeOffset;
      startTimeRef.current = ctx.currentTime;
      isPlayingRef.current = true;
      setIsPlaying(true);

      src.onended = () => {
        if (sourceRef.current === src && !isLoopingRef.current) {
          sourceRef.current = null;
          isPlayingRef.current = false;
          startOffsetRef.current = 0;
          setIsPlaying(false);
          setCurrentTime(0);
        }
      };

      sourceRef.current = src;
      src.start(0, safeOffset);
    },
    [ensureAudioGraph, stopSourceNode]
  );

  const pausePlayback = useCallback(() => {
    const elapsed = getElapsedSeconds();
    stopSourceNode();
    startOffsetRef.current = elapsed;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(elapsed);
  }, [getElapsedSeconds, stopSourceNode]);

  const togglePlayPause = useCallback(() => {
    if (!audioBufferRef.current || isLoadingAudio) return;
    if (isPlayingRef.current) {
      pausePlayback();
    } else {
      playFromOffset(startOffsetRef.current);
    }
  }, [isLoadingAudio, pausePlayback, playFromOffset]);

  // Sync output volume
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = playerVolume;
    }
  }, [playerVolume]);

  // Sync loop flag live while playing
  useEffect(() => {
    if (sourceRef.current) {
      sourceRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // Load WAV bytes whenever currentAudio changes
  useEffect(() => {
    if (!currentAudio) {
      stopSourceNode();
      audioBufferRef.current = null;
      loadedAudioIdRef.current = null;
      isPlayingRef.current = false;
      startOffsetRef.current = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (loadedAudioIdRef.current === currentAudio.id) return;
    loadedAudioIdRef.current = currentAudio.id;

    let cancelled = false;
    stopSourceNode();
    isPlayingRef.current = false;
    startOffsetRef.current = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(currentAudio.durationMs / 1000);
    setIsLoadingAudio(true);

    (async () => {
      try {
        const wavArrayBuf = await invoke<ArrayBuffer>("get_audio_wav", {
          audioId: currentAudio.id,
        });
        if (cancelled) return;
        const ctx = await ensureAudioGraph();
        const decoded = await ctx.decodeAudioData(wavArrayBuf.slice(0));
        if (cancelled) return;
        audioBufferRef.current = decoded;
        setDuration(decoded.duration);
        setIsLoadingAudio(false);
        await playFromOffset(0);
      } catch (err) {
        if (!cancelled) {
          setIsLoadingAudio(false);
          pushToast({
            type: "error",
            title: "No se pudo reproducir el audio",
            description: String(err),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentAudio, ensureAudioGraph, playFromOffset, pushToast, stopSourceNode]);

  // Global Spacebar shortcut (when not typing)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!audioBufferRef.current) return;
      e.preventDefault();
      togglePlayPause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlayPause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSourceNode();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [stopSourceNode]);

  // 60fps Canvas waveform + timer loop
  useEffect(() => {
    let rafId = 0;
    const freqData = new Uint8Array(64);

    const draw = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(100, Math.floor(rect.width));
        const h = Math.max(36, Math.floor(rect.height));

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }

        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          ctx2d.save();
          ctx2d.scale(dpr, dpr);
          ctx2d.clearRect(0, 0, w, h);

          const elapsed = getElapsedSeconds();
          if (isPlayingRef.current && !isScrubbingRef.current) {
            setCurrentTime(elapsed);
          }

          let energy = 0;
          if (isPlayingRef.current && analyserRef.current) {
            analyserRef.current.getByteFrequencyData(freqData);
            let sum = 0;
            for (let i = 0; i < 20; i++) sum += freqData[i];
            energy = sum / (20 * 255);
          }

          const peaks = currentAudio?.peaks ?? [];
          const totalDuration =
            audioBufferRef.current?.duration ??
            (currentAudio ? currentAudio.durationMs / 1000 : 0);
          const progress =
            totalDuration > 0 ? Math.min(1, Math.max(0, elapsed / totalDuration)) : 0;

          if (peaks.length === 0) {
            // Idle subtle baseline bars
            const idleBars = 72;
            const gap = w / idleBars;
            const bw = Math.max(2, gap * 0.45);
            ctx2d.fillStyle = "rgba(255, 255, 255, 0.08)";
            for (let i = 0; i < idleBars; i++) {
              const bh = 4 + Math.sin(i * 0.35) * 2.5;
              const x = i * gap + (gap - bw) * 0.5;
              const y = (h - bh) * 0.5;
              ctx2d.beginPath();
              ctx2d.roundRect(x, y, bw, bh, bw / 2);
              ctx2d.fill();
            }
          } else {
            const targetBars = Math.min(peaks.length, Math.max(48, Math.floor(w / 4)));
            const slot = w / targetBars;
            const bw = Math.max(1.8, Math.min(4, slot * 0.58));
            const maxBarH = h - 8;

            const activeGrad = ctx2d.createLinearGradient(0, 0, w, 0);
            activeGrad.addColorStop(0, "#8B5CF6");
            activeGrad.addColorStop(1, "#06B6D4");

            for (let i = 0; i < targetBars; i++) {
              const srcIdx = Math.min(
                peaks.length - 1,
                Math.floor((i / targetBars) * peaks.length)
              );
              const barPct = (i + 0.5) / targetBars;
              const pulseBoost =
                isPlayingRef.current && Math.abs(barPct - progress) < 0.04
                  ? 1 + energy * 0.25
                  : 1;
              const amp = Math.min(1, peaks[srcIdx] * pulseBoost);
              const bh = Math.max(4, amp * maxBarH);
              const x = i * slot + (slot - bw) * 0.5;
              const y = (h - bh) * 0.5;

              ctx2d.fillStyle =
                barPct <= progress ? activeGrad : "rgba(255, 255, 255, 0.16)";
              ctx2d.beginPath();
              ctx2d.roundRect(x, y, bw, bh, bw / 2);
              ctx2d.fill();
            }

            // Playhead line
            const px = Math.max(1, Math.min(w - 1, progress * w));
            ctx2d.strokeStyle = "rgba(34, 211, 238, 0.9)";
            ctx2d.lineWidth = 1.5;
            ctx2d.beginPath();
            ctx2d.moveTo(px, 2);
            ctx2d.lineTo(px, h - 2);
            ctx2d.stroke();

            // Hover scrub cursor
            if (hoverPct !== null) {
              const hx = hoverPct * w;
              ctx2d.strokeStyle = "rgba(255, 255, 255, 0.3)";
              ctx2d.lineWidth = 1;
              ctx2d.beginPath();
              ctx2d.moveTo(hx, 4);
              ctx2d.lineTo(hx, h - 4);
              ctx2d.stroke();
            }
          }

          ctx2d.restore();
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [currentAudio, getElapsedSeconds, hoverPct]);

  const scrubToClientX = (clientX: number, commitPlay: boolean) => {
    const el = containerRef.current;
    const buf = audioBufferRef.current;
    if (!el || !buf) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetSec = pct * buf.duration;
    startOffsetRef.current = targetSec;
    setCurrentTime(targetSec);
    if (commitPlay && isPlayingRef.current) {
      playFromOffset(targetSec);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!audioBufferRef.current) return;
    isScrubbingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubToClientX(e.clientX, false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setHoverPct(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
    }
    if (isScrubbingRef.current) {
      scrubToClientX(e.clientX, false);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    scrubToClientX(e.clientX, true);
  };

  return (
    <footer className="h-[86px] shrink-0 studio-panel rounded-2xl px-4 flex items-center gap-4">
      {/* Left: Transport & Track info */}
      <div className="flex items-center gap-3 w-[235px] shrink-0">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          type="button"
          disabled={!currentAudio || isLoadingAudio}
          onClick={togglePlayPause}
          title="Play / Pause (Espacio)"
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white flex items-center justify-center shadow-glowViolet disabled:opacity-35 disabled:cursor-not-allowed shrink-0"
        >
          {isLoadingAudio ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </motion.button>

        <div className="min-w-0 flex-1">
          {currentAudio ? (
            <>
              <div className="text-xs font-semibold text-zinc-100 truncate">
                {currentAudio.voiceName}
              </div>
              <div className="text-[10.5px] font-mono text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span className="text-cyan-300">{formatTime(currentTime)}</span>
                <span className="text-zinc-600">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Waves className="w-4 h-4 text-zinc-600" />
              <span className="text-xs">Sin audio generado</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Interactive Waveform Canvas */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setHoverPct(null);
          if (isScrubbingRef.current) {
            isScrubbingRef.current = false;
          }
        }}
        className={`relative flex-1 h-14 rounded-xl bg-[#09090B]/80 border border-white/[0.07] px-2 flex items-center overflow-hidden ${
          currentAudio ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {hoverPct !== null && currentAudio && duration > 0 && (
          <div
            className="pointer-events-none absolute top-1 px-1.5 py-0.5 rounded bg-zinc-900/95 border border-white/10 text-[9.5px] font-mono text-cyan-300 -translate-x-1/2"
            style={{ left: `${Math.min(94, Math.max(6, hoverPct * 100))}%` }}
          >
            {formatTime(hoverPct * duration)}
          </div>
        )}
      </div>

      {/* Right: Loop, Volume & Export */}
      <div className="flex items-center gap-2.5 shrink-0">
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => setIsLooping((l) => !l)}
          title="Bucle continuo"
          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
            isLooping
              ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-glowCyan"
              : "bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
        </motion.button>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
          <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={playerVolume}
            onChange={(e) => setPlayerVolume(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400 cursor-pointer"
            title={`Volumen reproductor: ${Math.round(playerVolume * 100)}%`}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          disabled={!currentAudio}
          onClick={() => currentAudio && openExportModal(currentAudio.id)}
          className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.12] text-xs font-medium text-zinc-100 flex items-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>MP3</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300">
            {exportBitrate}k
          </span>
        </motion.button>
      </div>
    </footer>
  );
};
