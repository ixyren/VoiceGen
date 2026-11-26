import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUILTIN_PRESETS,
  DEFAULT_DSP,
  findBestVoiceForPreset,
} from "../data/presets";
import {
  DspParams,
  ExportBitrate,
  Preset,
  SynthesisResult,
  ToastMessage,
  VoiceInfo,
} from "../types/voicegen";

interface VoiceGenState {
  // Persisted workspace settings
  selectedVoiceId: string | null;
  text: string;
  rate: number;
  pitch: number;
  volume: number;
  dsp: DspParams;
  activePresetId: string | null;
  customPresets: Preset[];
  lastExportFolder: string | null;
  recentFolders: string[];
  exportBitrate: ExportBitrate;
  openFolderAfterExport: boolean;
  playerVolume: number;

  // Runtime state
  voices: VoiceInfo[];
  isScanningVoices: boolean;
  isSynthesizing: boolean;
  previewingVoiceId: string | null;
  currentAudio: SynthesisResult | null;
  history: SynthesisResult[];
  toasts: ToastMessage[];
  isExportModalOpen: boolean;
  exportTargetAudioId: string | null;
  isPresetModalOpen: boolean;
  editingPreset: Preset | null;

  // Setters & Actions
  setVoices: (voices: VoiceInfo[]) => void;
  setIsScanningVoices: (scanning: boolean) => void;
  setSelectedVoiceId: (id: string | null) => void;
  setText: (text: string) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  updateDsp: (patch: Partial<DspParams>) => void;
  resetDsp: () => void;
  applyPreset: (preset: Preset, alsoLoadSampleIfEmpty?: boolean) => VoiceInfo | null;
  saveCustomPreset: (name: string, description: string, accentFrom: string, accentTo: string) => Preset;
  updateCustomPreset: (id: string, name: string, description: string, accentFrom: string, accentTo: string) => void;
  deleteCustomPreset: (id: string) => void;
  importCustomPresets: (presets: Preset[]) => number;
  setIsSynthesizing: (busy: boolean) => void;
  setPreviewingVoiceId: (id: string | null) => void;
  setCurrentAudio: (audio: SynthesisResult | null) => void;
  addHistoryItem: (item: SynthesisResult) => void;
  removeHistoryItem: (id: string) => void;
  setLastExportFolder: (folder: string) => void;
  setExportBitrate: (bitrate: ExportBitrate) => void;
  setOpenFolderAfterExport: (open: boolean) => void;
  setPlayerVolume: (vol: number) => void;
  openExportModal: (audioId: string) => void;
  closeExportModal: () => void;
  openPresetModal: (editing?: Preset | null) => void;
  closePresetModal: () => void;
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const DEFAULT_SCRIPT =
  'Hola a todos hijos de fruta, <silence msec="300"/> bienvenidos a VoiceGen, el estudio definitivo para voces Loquendo y SAPI 5.';

export const useVoiceGenStore = create<VoiceGenState>()(
  persist(
    (set, get) => ({
      selectedVoiceId: null,
      text: DEFAULT_SCRIPT,
      rate: 1.5,
      pitch: -2,
      volume: 100,
      dsp: { ...BUILTIN_PRESETS[0].dsp },
      activePresetId: BUILTIN_PRESETS[0].id,
      customPresets: [],
      lastExportFolder: null,
      recentFolders: [],
      exportBitrate: 192,
      openFolderAfterExport: true,
      playerVolume: 1.0,

      voices: [],
      isScanningVoices: false,
      isSynthesizing: false,
      previewingVoiceId: null,
      currentAudio: null,
      history: [],
      toasts: [],
      isExportModalOpen: false,
      exportTargetAudioId: null,
      isPresetModalOpen: false,
      editingPreset: null,

      setVoices: (voices) =>
        set((state) => {
          const validCurrent =
            state.selectedVoiceId &&
            voices.some((v) => v.id === state.selectedVoiceId);
          if (validCurrent) return { voices };
          const jorge =
            voices.find(
              (v) => v.isLoquendo && v.name.toLowerCase() === "jorge"
            ) ??
            voices.find((v) => v.isLoquendo) ??
            voices[0] ??
            null;
          return {
            voices,
            selectedVoiceId: jorge ? jorge.id : null,
          };
        }),

      setIsScanningVoices: (isScanningVoices) => set({ isScanningVoices }),
      setSelectedVoiceId: (selectedVoiceId) => set({ selectedVoiceId }),
      setText: (text) => set({ text }),
      setRate: (rate) => set({ rate, activePresetId: null }),
      setPitch: (pitch) => set({ pitch, activePresetId: null }),
      setVolume: (volume) => set({ volume, activePresetId: null }),

      updateDsp: (patch) =>
        set((state) => ({
          dsp: { ...state.dsp, ...patch },
          activePresetId: null,
        })),

      resetDsp: () =>
        set({
          rate: 0,
          pitch: 0,
          volume: 100,
          dsp: { ...DEFAULT_DSP },
          activePresetId: null,
        }),

      applyPreset: (preset, alsoLoadSample = false) => {
        const { voices, selectedVoiceId, text } = get();
        const matched = findBestVoiceForPreset(preset, voices, selectedVoiceId);
        set({
          rate: preset.rate,
          pitch: preset.pitch,
          volume: preset.volume,
          dsp: { ...preset.dsp },
          activePresetId: preset.id,
          selectedVoiceId: matched ? matched.id : selectedVoiceId,
          text:
            alsoLoadSample || !text.trim()
              ? preset.sampleText
              : text,
        });
        return matched;
      },

      saveCustomPreset: (name, description, accentFrom, accentTo) => {
        const state = get();
        const selectedVoice = state.voices.find(
          (v) => v.id === state.selectedVoiceId
        );
        const created: Preset = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: name.trim(),
          description: description.trim() || "Preset personalizado de estudio",
          isBuiltin: false,
          accentFrom,
          accentTo,
          preferredVoices: selectedVoice ? [selectedVoice.name] : [],
          sampleText: state.text,
          rate: state.rate,
          pitch: state.pitch,
          volume: state.volume,
          dsp: { ...state.dsp },
        };
        set({
          customPresets: [created, ...state.customPresets],
          activePresetId: created.id,
        });
        return created;
      },

      updateCustomPreset: (id, name, description, accentFrom, accentTo) =>
        set((state) => ({
          customPresets: state.customPresets.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: name.trim(),
                  description: description.trim() || p.description,
                  accentFrom,
                  accentTo,
                  rate: state.rate,
                  pitch: state.pitch,
                  volume: state.volume,
                  dsp: { ...state.dsp },
                }
              : p
          ),
        })),

      deleteCustomPreset: (id) =>
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== id),
          activePresetId:
            state.activePresetId === id ? null : state.activePresetId,
        })),

      importCustomPresets: (incoming) => {
        const clean = incoming
          .filter((p) => p && typeof p.name === "string" && p.dsp)
          .map((p) => ({
            ...p,
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            isBuiltin: false,
            accentFrom: p.accentFrom || "#8B5CF6",
            accentTo: p.accentTo || "#06B6D4",
            preferredVoices: Array.isArray(p.preferredVoices)
              ? p.preferredVoices
              : [],
            sampleText: p.sampleText || "",
            dsp: { ...DEFAULT_DSP, ...p.dsp },
          }));
        if (clean.length === 0) return 0;
        set((state) => ({
          customPresets: [...clean, ...state.customPresets],
        }));
        return clean.length;
      },

      setIsSynthesizing: (isSynthesizing) => set({ isSynthesizing }),
      setPreviewingVoiceId: (previewingVoiceId) => set({ previewingVoiceId }),
      setCurrentAudio: (currentAudio) => set({ currentAudio }),

      addHistoryItem: (item) =>
        set((state) => ({
          currentAudio: item,
          history: [item, ...state.history.filter((h) => h.id !== item.id)].slice(
            0,
            25
          ),
        })),

      removeHistoryItem: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
          currentAudio:
            state.currentAudio?.id === id ? null : state.currentAudio,
        })),

      setLastExportFolder: (folder) =>
        set((state) => ({
          lastExportFolder: folder,
          recentFolders: [
            folder,
            ...state.recentFolders.filter((f) => f !== folder),
          ].slice(0, 6),
        })),

      setExportBitrate: (exportBitrate) => set({ exportBitrate }),
      setOpenFolderAfterExport: (openFolderAfterExport) =>
        set({ openFolderAfterExport }),
      setPlayerVolume: (playerVolume) => set({ playerVolume }),

      openExportModal: (audioId) =>
        set({ isExportModalOpen: true, exportTargetAudioId: audioId }),
      closeExportModal: () =>
        set({ isExportModalOpen: false, exportTargetAudioId: null }),

      openPresetModal: (editing = null) =>
        set({ isPresetModalOpen: true, editingPreset: editing }),
      closePresetModal: () =>
        set({ isPresetModalOpen: false, editingPreset: null }),

      pushToast: (toast) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        set((state) => ({
          toasts: [...state.toasts.slice(-3), { ...toast, id }],
        }));
        setTimeout(() => {
          get().dismissToast(id);
        }, 4500);
      },

      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "voicegen-studio-v1",
      partialize: (state) => ({
        selectedVoiceId: state.selectedVoiceId,
        text: state.text,
        rate: state.rate,
        pitch: state.pitch,
        volume: state.volume,
        dsp: state.dsp,
        activePresetId: state.activePresetId,
        customPresets: state.customPresets,
        lastExportFolder: state.lastExportFolder,
        recentFolders: state.recentFolders,
        exportBitrate: state.exportBitrate,
        openFolderAfterExport: state.openFolderAfterExport,
        playerVolume: state.playerVolume,
      }),
    }
  )
);
