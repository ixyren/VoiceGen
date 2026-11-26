import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface StudioToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const StudioToggle: React.FC<StudioToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  icon,
  children,
}) => {
  return (
    <div
      className={`rounded-xl border transition-colors p-2.5 ${
        checked
          ? "bg-gradient-to-br from-violet-500/[0.09] to-cyan-500/[0.06] border-violet-500/35"
          : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="w-full flex items-center justify-between gap-2.5 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                checked
                  ? "bg-violet-500/20 text-cyan-300 border border-cyan-400/30"
                  : "bg-white/[0.04] text-zinc-400 border border-white/[0.06]"
              }`}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-zinc-200 truncate">
              {label}
            </div>
            {description && (
              <div className="text-[10.5px] text-zinc-500 truncate">
                {description}
              </div>
            )}
          </div>
        </div>

        <div
          className={`w-9 h-5 rounded-full p-0.5 shrink-0 transition-colors flex items-center ${
            checked
              ? "bg-gradient-to-r from-violet-500 to-cyan-500 justify-end shadow-glowCyan"
              : "bg-zinc-800 justify-start border border-white/10"
          }`}
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="w-4 h-4 rounded-full bg-white shadow"
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {checked && children && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="overflow-hidden pt-2 border-t border-white/[0.07]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
