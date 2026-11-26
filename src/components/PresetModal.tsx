import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useVoiceGenStore } from "../store/useVoiceGenStore";

const ACCENT_THEMES = [
  { label: "Violeta / Cian", from: "#8B5CF6", to: "#06B6D4" },
  { label: "Carmesí / Naranja", from: "#EF4444", to: "#F97316" },
  { label: "Rosa / Violeta", from: "#EC4899", to: "#8B5CF6" },
  { label: "Esmeralda / Cian", from: "#10B981", to: "#06B6D4" },
  { label: "Índigo / Cielo", from: "#6366F1", to: "#0EA5E9" },
];

export const PresetModal: React.FC = () => {
  const isOpen = useVoiceGenStore((s) => s.isPresetModalOpen);
  const editing = useVoiceGenStore((s) => s.editingPreset);
  const closeModal = useVoiceGenStore((s) => s.closePresetModal);
  const saveCustomPreset = useVoiceGenStore((s) => s.saveCustomPreset);
  const updateCustomPreset = useVoiceGenStore((s) => s.updateCustomPreset);
  const pushToast = useVoiceGenStore((s) => s.pushToast);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [themeIdx, setThemeIdx] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description);
        const found = ACCENT_THEMES.findIndex(
          (t) => t.from.toLowerCase() === editing.accentFrom.toLowerCase()
        );
        setThemeIdx(found >= 0 ? found : 0);
      } else {
        setName("");
        setDescription("");
        setThemeIdx(0);
      }
    }
  }, [isOpen, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      pushToast({
        type: "error",
        title: "Nombre requerido",
        description: "Escribe un nombre para guardar tu preset.",
      });
      return;
    }
    const theme = ACCENT_THEMES[themeIdx] ?? ACCENT_THEMES[0];
    if (editing) {
      updateCustomPreset(editing.id, name, description, theme.from, theme.to);
      pushToast({
        type: "success",
        title: "Preset actualizado",
        description: `"${name.trim()}" ahora guarda tus parámetros actuales.`,
      });
    } else {
      saveCustomPreset(name, description, theme.from, theme.to);
      pushToast({
        type: "success",
        title: "Preset guardado",
        description: `"${name.trim()}" añadido a tu barra de presets.`,
      });
    }
    closeModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md studio-panel rounded-2xl p-5 shadow-glass space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {editing ? "Editar Preset" : "Guardar Nuevo Preset"}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Captura voz, velocidad, tono y toda la cadena DSP actual.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nombre del Preset
                </label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Mi Voz Loquendo Épica"
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B]/90 border border-white/[0.1] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Descripción corta
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Ritmo rápido con reverb leve para intros"
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B]/90 border border-white/[0.1] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Color de acento
                </label>
                <div className="flex items-center gap-2">
                  {ACCENT_THEMES.map((t, i) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setThemeIdx(i)}
                      title={t.label}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        themeIdx === i
                          ? "ring-2 ring-white scale-110"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={closeModal}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-600 shadow-glowViolet"
              >
                {editing ? "Actualizar Preset" : "Guardar Preset"}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
