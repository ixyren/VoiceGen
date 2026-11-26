import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Sparkles, Square, X } from "lucide-react";
import { motion } from "framer-motion";
import { useVoiceGenStore } from "../store/useVoiceGenStore";

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const voices = useVoiceGenStore((s) => s.voices);
  const loquendoCount = voices.filter((v) => v.isLoquendo).length;

  useEffect(() => {
    const win = getCurrentWindow();
    let active = true;
    win.isMaximized().then((m) => active && setIsMaximized(m)).catch(() => {});
    const unlistenPromise = win.onResized(() => {
      win.isMaximized().then((m) => active && setIsMaximized(m)).catch(() => {});
    });
    return () => {
      active = false;
      unlistenPromise.then((u) => u()).catch(() => {});
    };
  }, []);

  const handleMinimize = () => {
    getCurrentWindow().minimize().catch(() => {});
  };

  const handleToggleMax = () => {
    getCurrentWindow().toggleMaximize().catch(() => {});
  };

  const handleClose = () => {
    getCurrentWindow().close().catch(() => {});
  };

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={handleToggleMax}
      className="h-10 shrink-0 px-3 flex items-center justify-between bg-[#09090B]/95 border-b border-white/[0.08] select-none z-40"
    >
      {/* Left: Brand Identity */}
      <div data-tauri-drag-region className="flex items-center gap-2.5 pointer-events-none">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shadow-glowViolet">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <defs>
              <linearGradient id="vgBarGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <rect x="2.5" y="9" width="2.4" height="6" rx="1.2" fill="url(#vgBarGrad)" />
            <rect x="6.5" y="5.5" width="2.4" height="13" rx="1.2" fill="url(#vgBarGrad)" />
            <rect x="10.8" y="3" width="2.4" height="18" rx="1.2" fill="url(#vgBarGrad)" />
            <rect x="15.1" y="6.5" width="2.4" height="11" rx="1.2" fill="url(#vgBarGrad)" />
            <rect x="19.1" y="9.5" width="2.4" height="5" rx="1.2" fill="url(#vgBarGrad)" />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold tracking-tight text-zinc-100">
            VoiceGen
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-cyan-400 border border-cyan-500/20">
            Studio v0.2.0
          </span>
        </div>
      </div>

      {/* Center: Live Engine Pill */}
      <div
        data-tauri-drag-region
        className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] pointer-events-none"
      >
        <Sparkles className="w-3 h-3 text-violet-400" />
        <span className="text-[11px] font-mono text-zinc-400">
          {voices.length} voces detectadas
          {loquendoCount > 0 && (
            <span className="text-cyan-400"> · {loquendoCount} Loquendo 32-bit</span>
          )}
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          whileTap={{ scale: 0.94 }}
          onClick={handleMinimize}
          aria-label="Minimizar"
          className="w-8 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          whileTap={{ scale: 0.94 }}
          onClick={handleToggleMax}
          aria-label={isMaximized ? "Restaurar" : "Maximizar"}
          className="w-8 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          {isMaximized ? (
            <Copy className="w-3 h-3" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </motion.button>
        <motion.button
          whileHover={{ backgroundColor: "rgba(239,68,68,0.85)", color: "#ffffff" }}
          whileTap={{ scale: 0.94 }}
          onClick={handleClose}
          aria-label="Cerrar"
          className="w-8 h-7 rounded-md flex items-center justify-center text-zinc-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </header>
  );
};
