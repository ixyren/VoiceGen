import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  FileDown,
  FileUp,
  Flame,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Tv,
  User,
  Zap,
} from "lucide-react";
import { BUILTIN_PRESETS } from "../data/presets";
import { useVoiceGenStore } from "../store/useVoiceGenStore";
import { Preset, PresetCategory } from "../types/voicegen";
import { SmoothScrollArea } from "./SmoothScrollArea";

export const PresetBar: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>("all");

  const activePresetId = useVoiceGenStore((s) => s.activePresetId);
  const customPresets = useVoiceGenStore((s) => s.customPresets);
  const applyPreset = useVoiceGenStore((s) => s.applyPreset);
  const deleteCustomPreset = useVoiceGenStore((s) => s.deleteCustomPreset);
  const importCustomPresets = useVoiceGenStore((s) => s.importCustomPresets);
  const openPresetModal = useVoiceGenStore((s) => s.openPresetModal);
  const pushToast = useVoiceGenStore((s) => s.pushToast);

  const allPresets = useMemo(
    () => [...customPresets, ...BUILTIN_PRESETS],
    [customPresets]
  );

  const filteredPresets = useMemo(() => {
    if (selectedCategory === "all") return allPresets;
    return allPresets.filter((p) => p.category === selectedCategory);
  }, [allPresets, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const classic = allPresets.filter((p) => p.category === "classic").length;
    const tiktok = allPresets.filter((p) => p.category === "tiktok").length;
    const custom = customPresets.length;
    return { all: allPresets.length, classic, tiktok, custom };
  }, [allPresets, customPresets]);

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

  const categories: {
    id: PresetCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }[] = [
    { id: "all", label: "Todos", icon: Sparkles, count: categoryCounts.all },
    {
      id: "classic",
      label: "Clásicos YouTube",
      icon: Tv,
      count: categoryCounts.classic,
    },
    {
      id: "tiktok",
      label: "TikTok & Virales",
      icon: Zap,
      count: categoryCounts.tiktok,
    },
    {
      id: "custom",
      label: "Personalizados",
      icon: User,
      count: categoryCounts.custom,
    },
  ];

  return (
    <section className="studio-panel rounded-2xl p-3 flex flex-col gap-2.5 shrink-0">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-violet-400/40 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Presets de Voces Loquendo
            </h2>
            <p className="text-[10px] text-zinc-400">
              Personajes icónicos de YouTube (Jorge, Carlos, Diego, Esperanza, Juan, Francisca) y tendencias TikTok
            </p>
          </div>
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
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500/25 to-cyan-500/25 hover:from-violet-500/35 hover:to-cyan-500/35 border border-violet-400/40 text-[11px] font-medium text-zinc-100 flex items-center gap-1"
          >
            <Plus className="w-3 h-3 text-cyan-300" />
            Guardar Preset
          </motion.button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2">
        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`relative px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                active
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="presetCategoryPill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/25 to-cyan-500/25 border border-white/10"
                />
              )}
              <Icon className="w-3 h-3 relative z-10 text-cyan-400" />
              <span className="relative z-10">{cat.label}</span>
              <span className="relative z-10 text-[9.5px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontal Carousel of Presets */}
      <SmoothScrollArea
        orientation="horizontal"
        className="w-full pb-1"
        contentClassName="flex items-stretch gap-2.5"
      >
        {filteredPresets.map((preset) => {
          const active = activePresetId === preset.id;
          const isTiktok = preset.category === "tiktok";
          const isClassic = preset.category === "classic";

          return (
            <motion.div
              key={preset.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectPreset(preset)}
              className={`group relative w-[240px] shrink-0 rounded-xl p-3 border cursor-pointer transition-colors flex flex-col justify-between ${
                active
                  ? "bg-white/[0.07] border-cyan-400/60 shadow-glowCyan"
                  : "bg-[#09090B]/75 border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.035]"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activePresetGlow"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-cyan-400/50"
                />
              )}

              <div>
                {/* Voice Character & Category Badges */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${preset.accentFrom}, ${preset.accentTo})`,
                      }}
                    />
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-cyan-300 border border-cyan-500/25 truncate">
                      {preset.featuredVoiceLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isClassic && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        Retro YT
                      </span>
                    )}
                    {isTiktok && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-pink-500/15 text-pink-300 border border-pink-500/25">
                        TikTok
                      </span>
                    )}
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
                </div>

                {/* Preset Name */}
                <h3 className="text-[12px] font-semibold text-zinc-100 truncate leading-snug">
                  {preset.name}
                </h3>

                {/* Description */}
                <p className="mt-1 text-[10.5px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              {/* Param Badges Footer */}
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-300">
                    Vel {preset.rate > 0 ? `+${preset.rate}` : preset.rate}
                  </span>
                  <span>·</span>
                  <span className="text-zinc-300">
                    Tono {preset.pitch > 0 ? `+${preset.pitch}` : preset.pitch}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {preset.dsp.reverbEnabled && (
                    <span className="text-cyan-400 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Eco
                    </span>
                  )}
                  {preset.dsp.distortionEnabled && (
                    <span className="text-rose-400 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> Sat
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </SmoothScrollArea>
    </section>
  );
};
