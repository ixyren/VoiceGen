import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { AlertCircle, CheckCircle2, FolderOpen, Info, X } from "lucide-react";
import { useVoiceGenStore } from "../store/useVoiceGenStore";

export const ToastContainer: React.FC = () => {
  const toasts = useVoiceGenStore((s) => s.toasts);
  const dismissToast = useVoiceGenStore((s) => s.dismissToast);

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 32, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="pointer-events-auto studio-panel rounded-xl p-3 shadow-glass flex items-start gap-2.5"
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === "success" && (
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              )}
              {toast.type === "error" && (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              {toast.type === "info" && (
                <Info className="w-4 h-4 text-violet-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-zinc-100">
                {toast.title}
              </div>
              {toast.description && (
                <div className="text-[11px] text-zinc-400 mt-0.5 break-words">
                  {toast.description}
                </div>
              )}
              {toast.actionLabel && toast.actionPath && (
                <button
                  type="button"
                  onClick={() =>
                    invoke("reveal_file", { path: toast.actionPath }).catch(
                      () => {}
                    )
                  }
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
                >
                  <FolderOpen className="w-3 h-3" />
                  {toast.actionLabel}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
