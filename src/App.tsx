import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DspRack } from "./components/DspRack";
import { ExportModal } from "./components/ExportModal";
import { PresetBar } from "./components/PresetBar";
import { PresetModal } from "./components/PresetModal";
import { ScriptEditor } from "./components/ScriptEditor";
import { TitleBar } from "./components/TitleBar";
import { ToastContainer } from "./components/ToastContainer";
import { VoiceSidebar } from "./components/VoiceSidebar";
import { WaveformPlayer } from "./components/WaveformPlayer";
import { useVoiceGenStore } from "./store/useVoiceGenStore";
import { SynthesisResult, VoiceInfo } from "./types/voicegen";

export function App() {
  const setVoices = useVoiceGenStore((s) => s.setVoices);
  const setIsScanningVoices = useVoiceGenStore((s) => s.setIsScanningVoices);
  const setIsSynthesizing = useVoiceGenStore((s) => s.setIsSynthesizing);
  const addHistoryItem = useVoiceGenStore((s) => s.addHistoryItem);
  const setCurrentAudio = useVoiceGenStore((s) => s.setCurrentAudio);
  const pushToast = useVoiceGenStore((s) => s.pushToast);

  const loadVoices = useCallback(
    async (refresh = false) => {
      setIsScanningVoices(true);
      try {
        const list = await invoke<VoiceInfo[]>("list_voices", { refresh });
        setVoices(list);
        if (refresh) {
          pushToast({
            type: "info",
            title: "Escaneo completado",
            description: `${list.length} voces disponibles en Windows.`,
          });
        }
      } catch (err) {
        pushToast({
          type: "error",
          title: "Error detectando voces",
          description: String(err),
        });
      } finally {
        setIsScanningVoices(false);
      }
    },
    [pushToast, setIsScanningVoices, setVoices]
  );

  useEffect(() => {
    loadVoices(false);
  }, [loadVoices]);

  const handleSynthesize = useCallback(async () => {
    const state = useVoiceGenStore.getState();
    if (!state.selectedVoiceId) {
      pushToast({
        type: "error",
        title: "Selecciona una voz",
        description: "Elige una voz en el panel izquierdo para sintetizar.",
      });
      return;
    }
    if (!state.text.trim()) {
      pushToast({
        type: "error",
        title: "Guión vacío",
        description: "Escribe el texto que quieres convertir a voz.",
      });
      return;
    }
    if (state.isSynthesizing) return;

    setIsSynthesizing(true);
    try {
      const result = await invoke<SynthesisResult>("synthesize_speech", {
        req: {
          voiceId: state.selectedVoiceId,
          text: state.text,
          rate: state.rate,
          pitch: state.pitch,
          volume: state.volume,
          dsp: state.dsp,
          saveToHistory: true,
        },
      });
      addHistoryItem(result);
    } catch (err) {
      pushToast({
        type: "error",
        title: "Error en síntesis TTS",
        description: String(err),
      });
    } finally {
      setIsSynthesizing(false);
    }
  }, [addHistoryItem, pushToast, setIsSynthesizing]);

  const handleSelectHistory = useCallback(
    (item: SynthesisResult) => {
      setCurrentAudio(item);
    },
    [setCurrentAudio]
  );

  return (
    <div className="relative h-screen w-screen flex flex-col bg-[#09090B] text-zinc-100 overflow-hidden">
      {/* Subtle Ambient Studio Glass Backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-24 w-[480px] h-[480px] rounded-full bg-violet-600/[0.08] blur-[120px]" />
        <div className="absolute -bottom-36 -right-24 w-[520px] h-[520px] rounded-full bg-cyan-500/[0.07] blur-[130px]" />
      </div>

      {/* Custom Frameless Titlebar */}
      <TitleBar />

      {/* Main Studio Workspace */}
      <main className="relative z-10 flex-1 min-h-0 p-3 flex flex-col gap-3">
        <div className="flex-1 min-h-0 flex gap-3">
          {/* Left: Voice Scanner & Session History */}
          <VoiceSidebar
            onRefreshVoices={() => loadVoices(true)}
            onSelectHistoryItem={handleSelectHistory}
          />

          {/* Center: Iconic Presets + Script Editor */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3">
            <PresetBar />
            <ScriptEditor onSynthesize={handleSynthesize} />
          </div>

          {/* Right: Native SAPI + Rust DSP Rack */}
          <DspRack />
        </div>

        {/* Bottom Dock: Waveform Player */}
        <WaveformPlayer />
      </main>

      {/* Modals & Toasts */}
      <ExportModal />
      <PresetModal />
      <ToastContainer />
    </div>
  );
}

export default App;
