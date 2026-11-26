import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Download,
  Eraser,
  Laugh,
  Loader2,
  Play,
  SlidersHorizontal,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  BUILTIN_PRESETS,
  InsertSnippet,
  LOQUENDO_EXPRESSIONS,
  SAPI_QUICK_SNIPPETS,
} from "../data/presets";
import { useVoiceGenStore } from "../store/useVoiceGenStore";

interface ScriptEditorProps {
  onSynthesize: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ onSynthesize }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showExpressions, setShowExpressions] = useState(false);

  const text = useVoiceGenStore((s) => s.text);
  const setText = useVoiceGenStore((s) => s.setText);
  const voices = useVoiceGenStore((s) => s.voices);
  const selectedVoiceId = useVoiceGenStore((s) => s.selectedVoiceId);
  const activePresetId = useVoiceGenStore((s) => s.activePresetId);
  const customPresets = useVoiceGenStore((s) => s.customPresets);
  const isSynthesizing = useVoiceGenStore((s) => s.isSynthesizing);
  const currentAudio = useVoiceGenStore((s) => s.currentAudio);
  const openExportModal = useVoiceGenStore((s) => s.openExportModal);

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) ?? null;

  const insertAtCursor = (item: InsertSnippet) => {
    const el = textareaRef.current;
    if (!el) {
      setText(text + (text.endsWith(" ") || !text ? "" : " ") + item.snippet);
      return;
    }

    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const selected = text.slice(start, end);

    let inserted = item.snippet;
    if (item.wrapSelection && selected.length > 0) {
      inserted = `${item.wrapSelection.prefix}${selected}${item.wrapSelection.suffix}`;
    } else if (start > 0 && !/\s/.test(text[start - 1])) {
      inserted = ` ${inserted}`;
    }

    const next = text.slice(0, start) + inserted + text.slice(end);
    setText(next);

    requestAnimationFrame(() => {
      el.focus();
      const pos = start + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleLoadSample = () => {
    const all = [...customPresets, ...BUILTIN_PRESETS];
    const active = all.find((p) => p.id === activePresetId) ?? BUILTIN_PRESETS[0];
    setText(active.sampleText);
    textareaRef.current?.focus();
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <section className="flex-1 min-h-0 studio-panel rounded-2xl p-3.5 flex flex-col gap-3">
      {/* Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-glowCyan" />
          <span className="text-xs font-semibold text-zinc-200 truncate">
            Guión & Etiquetas SAPI / Loquendo
          </span>
          {selectedVoice && (
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 truncate max-w-[230px]">
              {selectedVoice.name} · {selectedVoice.arch}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] flex items-center gap-1"
            title="Cargar frase de ejemplo del preset activo"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            Ejemplo
          </button>
          <button
            type="button"
            onClick={() => setText("")}
            className="px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1"
            title="Limpiar editor"
          >
            <Eraser className="w-3 h-3" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Quick Insert Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {SAPI_QUICK_SNIPPETS.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => insertAtCursor(item)}
            title={`${item.hint} (${item.snippet})`}
            className="px-2 py-1 rounded-lg bg-white/[0.035] hover:bg-violet-500/20 border border-white/[0.08] hover:border-violet-400/40 text-[11px] font-mono text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            {item.id.startsWith("silence") ? (
              <Timer className="w-3 h-3 text-cyan-400" />
            ) : (
              <SlidersHorizontal className="w-3 h-3 text-violet-400" />
            )}
            {item.label}
          </motion.button>
        ))}

        {/* Loquendo Expressions Dropdown */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setShowExpressions((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-colors ${
              showExpressions
                ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                : "bg-white/[0.04] border-white/[0.09] text-zinc-200 hover:border-cyan-400/40"
            }`}
          >
            <Laugh className="w-3 h-3 text-cyan-400" />
            Expresiones Loquendo
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                showExpressions ? "rotate-180" : ""
              }`}
            />
          </motion.button>

          <AnimatePresence>
            {showExpressions && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="absolute left-0 top-full mt-1.5 z-30 w-64 studio-panel rounded-xl p-1.5 shadow-glass grid grid-cols-2 gap-1"
              >
                {LOQUENDO_EXPRESSIONS.map((expr) => (
                  <button
                    key={expr.id}
                    type="button"
                    onClick={() => {
                      insertAtCursor(expr);
                      setShowExpressions(false);
                    }}
                    title={expr.hint}
                    className="px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="text-[11px] font-medium text-zinc-100">
                      {expr.label}
                    </div>
                    <div className="text-[9.5px] font-mono text-cyan-400">
                      {expr.snippet}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Script Textarea */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              onSynthesize();
            }
          }}
          placeholder='Escribe aquí tu guión... Puedes insertar pausas (<silence msec="500"/>), cambios de tono o expresiones Loquendo (\item=Laugh).'
          className="flex-1 w-full resize-none rounded-xl bg-[#09090B]/85 border border-white/[0.08] focus:border-violet-500/55 focus:outline-none p-3.5 text-[13.5px] leading-relaxed font-mono text-zinc-100 placeholder:text-zinc-600"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
            <span>{text.length} caracteres</span>
            <span>·</span>
            <span>{wordCount} palabras</span>
            <span className="hidden sm:inline text-zinc-600">
              · Ctrl+Enter para sintetizar
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentAudio && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => openExportModal(currentAudio.id)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-zinc-100 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Exportar .mp3
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={isSynthesizing || !selectedVoiceId || !text.trim()}
              onClick={onSynthesize}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-500 shadow-glowViolet hover:shadow-glowCyan flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sintetizando...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Generar / Escuchar
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
};
