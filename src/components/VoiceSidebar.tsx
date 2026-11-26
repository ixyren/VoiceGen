import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import {
  Clock,
  Download,
  History,
  Loader2,
  Mic2,
  Play,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { useVoiceGenStore } from "../store/useVoiceGenStore";
import { SynthesisResult, VoiceArch, VoiceInfo } from "../types/voicegen";
import { SmoothScrollArea } from "./SmoothScrollArea";

type SidebarTab = "voices" | "history";
type ArchFilter = "all" | "loquendo" | VoiceArch;

interface VoiceSidebarProps {
  onRefreshVoices: () => void;
  onSelectHistoryItem: (item: SynthesisResult) => void;
}

function formatDuration(ms: number): string {
  const secs = Math.max(0, ms / 1000);
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const VoiceSidebar: React.FC<VoiceSidebarProps> = ({
  onRefreshVoices,
  onSelectHistoryItem,
}) => {
  const [tab, setTab] = useState<SidebarTab>("voices");
  const [search, setSearch] = useState("");
  const [archFilter, setArchFilter] = useState<ArchFilter>("all");

  const voices = useVoiceGenStore((s) => s.voices);
  const selectedVoiceId = useVoiceGenStore((s) => s.selectedVoiceId);
  const setSelectedVoiceId = useVoiceGenStore((s) => s.setSelectedVoiceId);
  const isScanningVoices = useVoiceGenStore((s) => s.isScanningVoices);
  const previewingVoiceId = useVoiceGenStore((s) => s.previewingVoiceId);
  const setPreviewingVoiceId = useVoiceGenStore((s) => s.setPreviewingVoiceId);
  const history = useVoiceGenStore((s) => s.history);
  const currentAudio = useVoiceGenStore((s) => s.currentAudio);
  const removeHistoryItem = useVoiceGenStore((s) => s.removeHistoryItem);
  const openExportModal = useVoiceGenStore((s) => s.openExportModal);
  const pushToast = useVoiceGenStore((s) => s.pushToast);

  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewSrcRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPreview = () => {
    if (previewSrcRef.current) {
      try {
        previewSrcRef.current.stop();
        previewSrcRef.current.disconnect();
      } catch {
        // ignore already stopped
      }
      previewSrcRef.current = null;
    }
    setPreviewingVoiceId(null);
  };

  const handlePreviewVoice = async (e: React.MouseEvent, voice: VoiceInfo) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) {
      stopPreview();
      return;
    }
    stopPreview();
    setPreviewingVoiceId(voice.id);

    try {
      const buf = await invoke<ArrayBuffer>("preview_voice", {
        voiceId: voice.id,
        text: null,
      });
      if (!previewCtxRef.current || previewCtxRef.current.state === "closed") {
        previewCtxRef.current = new AudioContext();
      }
      if (previewCtxRef.current.state === "suspended") {
        await previewCtxRef.current.resume();
      }
      const audioBuf = await previewCtxRef.current.decodeAudioData(
        buf.slice(0)
      );
      const src = previewCtxRef.current.createBufferSource();
      src.buffer = audioBuf;
      src.connect(previewCtxRef.current.destination);
      src.onended = () => {
        if (useVoiceGenStore.getState().previewingVoiceId === voice.id) {
          setPreviewingVoiceId(null);
        }
      };
      previewSrcRef.current = src;
      src.start();
    } catch (err) {
      setPreviewingVoiceId(null);
      pushToast({
        type: "error",
        title: `Error probando ${voice.name}`,
        description: String(err),
      });
    }
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeHistoryItem(id);
    invoke("delete_cached_audio", { audioId: id }).catch(() => {});
  };

  const filteredVoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return voices.filter((v) => {
      if (archFilter === "loquendo" && !v.isLoquendo) return false;
      if (
        archFilter !== "all" &&
        archFilter !== "loquendo" &&
        v.arch !== archFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.languageLabel.toLowerCase().includes(q) ||
        v.languageCode.toLowerCase().includes(q) ||
        v.vendor.toLowerCase().includes(q)
      );
    });
  }, [voices, search, archFilter]);

  const filterChips: { id: ArchFilter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "loquendo", label: "Loquendo" },
    { id: "32-bit", label: "32-bit" },
    { id: "64-bit", label: "64-bit" },
    { id: "OneCore", label: "OneCore" },
  ];

  return (
    <aside className="w-[295px] shrink-0 h-full studio-panel rounded-2xl flex flex-col overflow-hidden">
      {/* Top Tabs */}
      <div className="p-2.5 border-b border-white/[0.08] flex items-center gap-1.5">
        {(
          [
            { id: "voices", label: "Voces", icon: Mic2, count: voices.length },
            {
              id: "history",
              label: "Historial",
              icon: History,
              count: history.length,
            },
          ] as const
        ).map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative flex-1 py-1.5 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebarTab"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-white/10"
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10 text-cyan-400" />
              <span className="relative z-10">{item.label}</span>
              <span className="relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.07] text-zinc-300">
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "voices" ? (
        <>
          {/* Search & Filters */}
          <div className="p-2.5 space-y-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar voz o idioma..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-[#09090B]/90 border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={onRefreshVoices}
                disabled={isScanningVoices}
                title="Volver a escanear voces del sistema"
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isScanningVoices ? "animate-spin text-cyan-400" : ""
                  }`}
                />
              </motion.button>
            </div>

            <div className="flex flex-wrap gap-1">
              {filterChips.map((chip) => {
                const active = archFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setArchFilter(chip.id)}
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium border transition-colors ${
                      active
                        ? "bg-violet-500/20 border-violet-400/50 text-violet-200"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice List */}
          <SmoothScrollArea className="flex-1 min-h-0 p-2" contentClassName="space-y-1.5">
            {isScanningVoices && voices.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                <span className="text-xs">Escaneando registro SAPI 5 / OneCore...</span>
              </div>
            ) : filteredVoices.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500 px-3">
                No se encontraron voces con este filtro.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredVoices.map((voice) => {
                  const selected = selectedVoiceId === voice.id;
                  const previewing = previewingVoiceId === voice.id;

                  return (
                    <motion.div
                      key={voice.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedVoiceId(voice.id)}
                      className={`group relative rounded-xl p-2.5 border cursor-pointer transition-colors ${
                        selected
                          ? "bg-gradient-to-br from-violet-500/[0.16] to-cyan-500/[0.09] border-violet-400/50 shadow-glowViolet"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.045] hover:border-white/[0.12]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-semibold text-zinc-100 truncate">
                              {voice.name}
                            </span>
                            {voice.isLoquendo && (
                              <span className="shrink-0 text-[9.5px] font-mono uppercase px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-400/30">
                                Loquendo
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                            <span
                              className={`font-mono px-1.5 py-0.2 rounded border ${
                                voice.arch === "32-bit"
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                                  : voice.arch === "OneCore"
                                  ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
                                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                              }`}
                            >
                              {voice.arch}
                            </span>
                            <span className="text-zinc-400 truncate max-w-[125px]">
                              {voice.languageLabel}
                            </span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-zinc-400">
                              {voice.gender === "Male"
                                ? "Masc."
                                : voice.gender === "Female"
                                ? "Fem."
                                : voice.gender}
                            </span>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          type="button"
                          onClick={(e) => handlePreviewVoice(e, voice)}
                          title="Escuchar prueba rápida"
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            previewing
                              ? "bg-cyan-500 text-zinc-950 border-cyan-300 shadow-glowCyan"
                              : "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/40"
                          }`}
                        >
                          {previewing ? (
                            <Square className="w-3 h-3 fill-current" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </SmoothScrollArea>
        </>
      ) : (
        /* Session History */
        <SmoothScrollArea className="flex-1 min-h-0 p-2" contentClassName="space-y-1.5">
          {history.length === 0 ? (
            <div className="py-14 px-4 text-center space-y-2">
              <Clock className="w-6 h-6 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">
                Aún no has generado audios en esta sesión.
              </p>
              <p className="text-[11px] text-zinc-600">
                Cada síntesis aparecerá aquí para re-escuchar o exportar a MP3 al instante.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {history.map((item) => {
                const isActive = currentAudio?.id === item.id;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => onSelectHistoryItem(item)}
                    className={`rounded-xl p-2.5 border cursor-pointer transition-colors ${
                      isActive
                        ? "bg-gradient-to-br from-cyan-500/[0.14] to-violet-500/[0.12] border-cyan-400/50"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-semibold text-zinc-100 truncate">
                        {item.voiceName}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 shrink-0">
                        {formatDuration(item.durationMs)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                      {item.textSnippet}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(item.createdAtMs).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectHistoryItem(item);
                          }}
                          title="Reproducir"
                          className="p-1 rounded-md bg-white/[0.05] hover:bg-violet-500/25 text-zinc-300 hover:text-white"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openExportModal(item.id);
                          }}
                          title="Exportar a MP3"
                          className="p-1 rounded-md bg-white/[0.05] hover:bg-cyan-500/25 text-zinc-300 hover:text-cyan-200"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistory(e, item.id)}
                          title="Eliminar de sesión"
                          className="p-1 rounded-md bg-white/[0.04] hover:bg-rose-500/25 text-zinc-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </SmoothScrollArea>
      )}
    </aside>
  );
};
