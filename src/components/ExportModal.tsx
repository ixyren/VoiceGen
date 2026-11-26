import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Download, FolderOpen, History, Loader2, Music2, X } from "lucide-react";
import { slugifyFilename } from "../data/presets";
import { useVoiceGenStore } from "../store/useVoiceGenStore";
import { ExportBitrate, ExportMp3Result } from "../types/voicegen";
import { StudioToggle } from "./StudioToggle";

const BITRATES: { value: ExportBitrate; label: string; hint: string }[] = [
  { value: 128, label: "128 kbps", hint: "Ligero" },
  { value: 192, label: "192 kbps", hint: "Estudio" },
  { value: 320, label: "320 kbps", hint: "Máxima" },
];

export const ExportModal: React.FC = () => {
  const isOpen = useVoiceGenStore((s) => s.isExportModalOpen);
  const audioId = useVoiceGenStore((s) => s.exportTargetAudioId);
  const closeModal = useVoiceGenStore((s) => s.closeExportModal);
  const text = useVoiceGenStore((s) => s.text);
  const history = useVoiceGenStore((s) => s.history);
  const lastExportFolder = useVoiceGenStore((s) => s.lastExportFolder);
  const recentFolders = useVoiceGenStore((s) => s.recentFolders);
  const exportBitrate = useVoiceGenStore((s) => s.exportBitrate);
  const openFolderAfterExport = useVoiceGenStore((s) => s.openFolderAfterExport);
  const setLastExportFolder = useVoiceGenStore((s) => s.setLastExportFolder);
  const setExportBitrate = useVoiceGenStore((s) => s.setExportBitrate);
  const setOpenFolderAfterExport = useVoiceGenStore(
    (s) => s.setOpenFolderAfterExport
  );
  const pushToast = useVoiceGenStore((s) => s.pushToast);

  const [filename, setFilename] = useState("voicegen_audio");
  const [folder, setFolder] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const item = history.find((h) => h.id === audioId);
    const seed = item ? item.textSnippet : text;
    setFilename(slugifyFilename(seed));
    setFolder(lastExportFolder ?? "");
  }, [isOpen, audioId, history, text, lastExportFolder]);

  const handlePickFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: folder || undefined,
        title: "Seleccionar carpeta de exportación",
      });
      if (typeof selected === "string" && selected.trim()) {
        setFolder(selected);
        setLastExportFolder(selected);
      }
    } catch (err) {
      pushToast({
        type: "error",
        title: "Error abriendo selector",
        description: String(err),
      });
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioId) return;

    let targetFolder = folder.trim();
    if (!targetFolder) {
      try {
        const picked = await open({
          directory: true,
          multiple: false,
          title: "Selecciona dónde guardar el MP3",
        });
        if (typeof picked !== "string" || !picked.trim()) return;
        targetFolder = picked;
        setFolder(picked);
        setLastExportFolder(picked);
      } catch (err) {
        pushToast({
          type: "error",
          title: "No se pudo seleccionar carpeta",
          description: String(err),
        });
        return;
      }
    }

    const cleanName = (filename.trim() || "voicegen_audio")
      .replace(/[<>:"/\\|?*]+/g, "_")
      .replace(/\.mp3$/i, "");

    const sep = targetFolder.endsWith("\\") || targetFolder.endsWith("/") ? "" : "\\";
    const fullPath = `${targetFolder}${sep}${cleanName}.mp3`;

    setIsExporting(true);
    try {
      const res = await invoke<ExportMp3Result>("export_mp3", {
        req: {
          audioId,
          outputPath: fullPath,
          bitrateKbps: exportBitrate,
          openFolder: openFolderAfterExport,
        },
      });
      setLastExportFolder(targetFolder);
      pushToast({
        type: "success",
        title: "MP3 exportado correctamente",
        description: `${cleanName}.mp3 (${Math.round(res.bytesWritten / 1024)} KB · ${res.bitrateKbps} kbps)`,
        actionLabel: "Mostrar en carpeta",
        actionPath: res.path,
      });
      closeModal();
    } catch (err) {
      pushToast({
        type: "error",
        title: "Error exportando MP3",
        description: String(err),
      });
    } finally {
      setIsExporting(false);
    }
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
            onSubmit={handleExport}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg studio-panel rounded-2xl p-5 shadow-glass space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <Music2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Exportar Audio a MP3
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Codificación LAME CBR nativa en 44.1 kHz estéreo
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

            <div className="space-y-3.5">
              {/* Filename */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nombre de archivo
                </label>
                <div className="flex items-center rounded-xl bg-[#09090B]/90 border border-white/[0.1] focus-within:border-cyan-500/60 overflow-hidden">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none"
                  />
                  <span className="px-3 py-2 text-xs font-mono text-cyan-400 bg-white/[0.03] border-l border-white/[0.08]">
                    .mp3
                  </span>
                </div>
              </div>

              {/* Bitrate selector */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Calidad / Bitrate CBR
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BITRATES.map((br) => {
                    const active = exportBitrate === br.value;
                    return (
                      <button
                        key={br.value}
                        type="button"
                        onClick={() => setExportBitrate(br.value)}
                        className={`relative rounded-xl px-3 py-2 text-left border transition-colors ${
                          active
                            ? "border-cyan-400/50 text-white"
                            : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="bitratePill"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20"
                          />
                        )}
                        <div className="relative z-10 text-xs font-mono font-semibold">
                          {br.label}
                        </div>
                        <div className="relative z-10 text-[10px] text-zinc-400">
                          {br.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Destination folder */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Carpeta de destino
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={folder}
                    placeholder="Selecciona una carpeta de destino..."
                    onClick={handlePickFolder}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#09090B]/90 border border-white/[0.1] text-xs font-mono text-zinc-300 placeholder:text-zinc-600 cursor-pointer focus:outline-none"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handlePickFolder}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-zinc-200 flex items-center gap-1.5 shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    Explorar
                  </motion.button>
                </div>

                {recentFolders.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 mr-1">
                      <History className="w-3 h-3" /> Recientes:
                    </span>
                    {recentFolders.slice(0, 3).map((rf) => (
                      <button
                        key={rf}
                        type="button"
                        onClick={() => setFolder(rf)}
                        title={rf}
                        className={`max-w-[160px] truncate text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                          folder === rf
                            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                            : "border-white/[0.07] bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {rf.split(/[\\/]/).filter(Boolean).pop() || rf}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Open folder toggle */}
              <StudioToggle
                label="Abrir carpeta al exportar"
                description="Muestra el archivo MP3 en el Explorador de Windows al terminar"
                checked={openFolderAfterExport}
                onChange={setOpenFolderAfterExport}
                icon={<FolderOpen className="w-3.5 h-3.5" />}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={closeModal}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={isExporting}
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 shadow-glowCyan flex items-center gap-1.5 disabled:opacity-60"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Codificando MP3...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Exportar .mp3
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
