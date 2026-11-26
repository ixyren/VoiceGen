import React from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  FileDown,
  FileUp,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { BUILTIN_PRESETS } from "../data/presets";
import { useVoiceGenStore } from "../store/useVoiceGenStore";
import { Preset } from "../types/voicegen";
import { SmoothScrollArea } from "./SmoothScrollArea";

export const PresetBar: React.FC = () => {
  const activePresetId = useVoiceGenStore((s) => s.activePresetId);
  const customPresets = useVoiceGenStore((s) => s.customPresets);
  const applyPreset = useVoiceGenStore((s) => s.applyPreset);
  const deleteCustomPreset = useVoiceGenStore((s) => s.deleteCustomPreset);
  const importCustomPresets = useVoiceGenStore((s) => s.importCustomPresets);
  const openPresetModal = useVoiceGenStore((s) => s.openPresetModal);
  const pushToast = useVoiceGenStore((s) => s.pushToast);

  const allPresets = [...customPresets, ...BUILTIN_PRESETS];

  const handleSelectPreset = (preset: Preset) => {
    const matched = applyPreset(preset, false);
    pushToast({
      type: "info",
      title: `Preset: ${preset.name}`,
      description: matched
        ? `Voz asignada: ${matched.name} (${matched.arch})`
        : "Parámetros aplicados al estudio.",
    });
  };

  const handleExportPresetsJson = async () => {
    try {
      const path = await save({
        title: "Exportar presets personalizados en JSON",
        defaultPath: "voicegen_presets.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return;
      const payload = customPresets.length > 0 ? customPresets : BUILTIN_PRESETS;
      await invoke("export_presets_json", {
        path,
        jsonContent: JSON.stringify(payload, null, 2),
      });
      pushToast({
        type: "success",
        title: "Presets exportados",
        description: `Guardados ${payload.length} presets en JSON.`,
        actionLabel: "Mostrar en carpeta",
        actionPath: path,
      });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Error exportando JSON",
        description: String(err),
      });
    }
  };

  const handleImportPresetsJson = async () => {
    try {
      const path = await open({
        title: "Importar presets desde JSON",
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (typeof path !== "string") return;
      const content = await invoke<string>("import_presets_json", { path });
      const parsed = JSON.parse(content);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const added = importCustomPresets(list);
      if (added > 0) {
        pushToast({
          type: "success",
          title: "Presets importados",
          description: `Se añadieron ${added} presets personalizados.`,
        });
      } else {
        pushToast({
          type: "error",
          title: "JSON sin presets válidos",
          description: "El archivo no contiene presets compatibles con VoiceGen.",
        });
      }
    } catch (err) {
      pushToast({
        type: "error",
        title: "Error importando JSON",
        description: String(err),
      });
    }
  };

  return (
    <section className="studio-panel rounded-2xl p-3 flex flex-col gap-2.5 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Presets Rápidos Loquendo & Custom
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleImportPresetsJson}
            title="Importar presets desde JSON"
            className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[11px] text-zinc-300 flex items-center gap-1"
          >
            <FileUp className="w-3 h-3 text-zinc-400" />
            Importar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleExportPresetsJson}
            title="Exportar presets en JSON"
            className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[11px] text-zinc-300 flex items-center gap-1"
          >
            <FileDown className="w-3 h-3 text-zinc-400" />
            JSON
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => openPresetModal(null)}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500/20 to-cyan-500/20 hover:from-violet-500/30 hover:to-cyan-500/30 border border-violet-400/35 text-[11px] font-medium text-zinc-100 flex items-center gap-1"
          >
            <Plus className="w-3 h-3 text-cyan-300" />
            Guardar Preset
          </motion.button>
        </div>
      </div>

      <SmoothScrollArea
        orientation="horizontal"
        className="w-full pb-1"
        contentClassName="flex items-stretch gap-2"
      >
        {allPresets.map((preset) => {
          const active = activePresetId === preset.id;
          return (
            <motion.div
              key={preset.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectPreset(preset)}
              className={`group relative w-[206px] shrink-0 rounded-xl p-2.5 border cursor-pointer transition-colors ${
                active
                  ? "bg-white/[0.06] border-cyan-400/55"
                  : "bg-[#09090B]/70 border-white/[0.07] hover:border-white/[0.15]"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activePresetGlow"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-cyan-400/40 shadow-glowCyan"
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${preset.accentFrom}, ${preset.accentTo})`,
                  }}
                />
                <span className="text-[11.5px] font-semibold text-zinc-100 truncate flex-1">
                  {preset.name}
                </span>
                {!preset.isBuiltin && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPresetModal(preset);
                      }}
                      title="Editar preset"
                      className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCustomPreset(preset.id);
                      }}
                      title="Eliminar preset"
                      className="p-0.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <p className="relative z-10 mt-1 text-[10.5px] text-zinc-400 line-clamp-1">
                {preset.description}
              </p>

              <div className="relative z-10 mt-1.5 flex items-center gap-1.5 text-[9.5px] font-mono text-zinc-500">
                <span>Vel {preset.rate > 0 ? `+${preset.rate}` : preset.rate}</span>
                <span>·</span>
                <span>Tono {preset.pitch > 0 ? `+${preset.pitch}` : preset.pitch}</span>
                {preset.dsp.reverbEnabled && (
                  <span className="text-cyan-400">· Reverb</span>
                )}
                {preset.dsp.distortionEnabled && (
                  <span className="text-amber-400">· Sat</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </SmoothScrollArea>
    </section>
  );
};
