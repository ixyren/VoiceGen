import React, { useState } from "react";
import { motion } from "framer-motion";

interface StudioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  formatValue?: (val: number) => string;
  hint?: string;
  onChange: (val: number) => void;
  accent?: "violet" | "cyan";
}

export const StudioSlider: React.FC<StudioSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  unit = "",
  formatValue,
  hint,
  onChange,
  accent = "violet",
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const clamped = Math.min(max, Math.max(min, value));
  const pct = ((clamped - min) / (max - min)) * 100;

  const isBipolar = min < 0 && max > 0;
  const zeroPct = isBipolar ? ((0 - min) / (max - min)) * 100 : 0;
  const fillLeft = isBipolar ? Math.min(zeroPct, pct) : 0;
  const fillWidth = isBipolar ? Math.abs(pct - zeroPct) : pct;

  const displayText = formatValue
    ? formatValue(clamped)
    : `${clamped > 0 && isBipolar ? "+" : ""}${
        Number.isInteger(step) ? clamped.toFixed(0) : clamped.toFixed(1)
      }${unit}`;

  const isModified = Math.abs(clamped - defaultValue) > 0.001;

  return (
    <div
      className="group space-y-1.5"
      onDoubleClick={() => onChange(defaultValue)}
      title="Doble clic para restablecer"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] font-medium text-zinc-300 truncate">
            {label}
          </span>
          {hint && (
            <span className="text-[10px] text-zinc-500 truncate">{hint}</span>
          )}
        </div>
        <motion.span
          animate={{ scale: isDragging ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className={`text-[11px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
            isModified
              ? accent === "cyan"
                ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/30"
                : "text-violet-300 bg-violet-500/10 border-violet-500/30"
              : "text-zinc-400 bg-white/[0.03] border-white/[0.06]"
          }`}
        >
          {displayText}
        </motion.span>
      </div>

      <div className="relative h-5 flex items-center">
        {/* Track Background */}
        <div className="w-full h-1.5 rounded-full bg-zinc-800/90 border border-white/[0.05] overflow-hidden relative">
          {isBipolar && (
            <div
              className="absolute top-0 bottom-0 w-px bg-zinc-600/70"
              style={{ left: `${zeroPct}%` }}
            />
          )}
          <div
            className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[left,width] duration-75"
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
        </div>

        {/* Visual Thumb */}
        <motion.div
          animate={{
            scale: isDragging ? 1.25 : 1,
            boxShadow: isDragging
              ? "0 0 14px rgba(6, 182, 212, 0.75)"
              : "0 0 8px rgba(139, 92, 246, 0.45)",
          }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="pointer-events-none absolute w-3.5 h-3.5 -ml-[7px] rounded-full bg-zinc-100 border-2 border-cyan-400 group-hover:scale-110 transition-transform"
          style={{ left: `${pct}%` }}
        />

        {/* Native Range Input overlay */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamped}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onBlur={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
