import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Flame,
  Gauge,
  Radio,
  RotateCcw,
  Sliders,
  Sparkles,
  Waves,
} from "lucide-react";
import { useVoiceGenStore } from "../store/useVoiceGenStore";
import { SmoothScrollArea } from "./SmoothScrollArea";
import { StudioSlider } from "./StudioSlider";
import { StudioToggle } from "./StudioToggle";

export const DspRack: React.FC = () => {
  const rate = useVoiceGenStore((s) => s.rate);
  const pitch = useVoiceGenStore((s) => s.pitch);
  const volume = useVoiceGenStore((s) => s.volume);
  const dsp = useVoiceGenStore((s) => s.dsp);
  const setRate = useVoiceGenStore((s) => s.setRate);
  const setPitch = useVoiceGenStore((s) => s.setPitch);
  const setVolume = useVoiceGenStore((s) => s.setVolume);
  const updateDsp = useVoiceGenStore((s) => s.updateDsp);
  const resetDsp = useVoiceGenStore((s) => s.resetDsp);

  return (
    <aside className="w-[325px] shrink-0 h-full studio-panel rounded-2xl flex flex-col overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Rack de Síntesis & DSP
          </h2>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={resetDsp}
          title="Restablecer todos los parámetros"
          className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-[10.5px] text-zinc-300 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3 text-zinc-400" />
          Reset
        </motion.button>
      </div>

      <SmoothScrollArea
        className="flex-1 min-h-0 p-3"
        contentClassName="space-y-3.5"
      >
        {/* Native SAPI / SSML Parameters */}
        <div className="studio-card rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
            <Activity className="w-3.5 h-3.5" />
            Motor SAPI / SSML Nativo
          </div>

          <StudioSlider
            label="Velocidad (Rate)"
            value={rate}
            min={-10}
            max={10}
            step={0.5}
            defaultValue={0}
            onChange={setRate}
            accent="violet"
          />

          <StudioSlider
            label="Tono Base (Pitch)"
            hint="XML absmiddle"
            value={pitch}
            min={-10}
            max={10}
            step={1}
            defaultValue={0}
            onChange={(v) => setPitch(Math.round(v))}
            accent="cyan"
          />

          <StudioSlider
            label="Volumen"
            value={volume}
            min={0}
            max={100}
            step={1}
            defaultValue={100}
            unit="%"
            onChange={(v) => setVolume(Math.round(v))}
            accent="violet"
          />
        </div>

        {/* Rust Post-Processing DSP */}
        <div className="studio-card rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            <Waves className="w-3.5 h-3.5" />
            Post-Proceso DSP (Rust)
          </div>

          <StudioSlider
            label="Pitch / Formant Shift"
            value={dsp.pitchSemitones}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={0}
            unit=" st"
            onChange={(v) => updateDsp({ pitchSemitones: v })}
            accent="cyan"
          />

          <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
              Ecualizador 3 Bandas
            </div>

            <StudioSlider
              label="Graves"
              hint="180 Hz"
              value={dsp.eqLowDb}
              min={-12}
              max={12}
              step={0.5}
              defaultValue={0}
              unit=" dB"
              onChange={(v) => updateDsp({ eqLowDb: v })}
              accent="violet"
            />

            <StudioSlider
              label="Medios"
              hint="1.4 kHz · Nasal"
              value={dsp.eqMidDb}
              min={-12}
              max={12}
              step={0.5}
              defaultValue={0}
              unit=" dB"
              onChange={(v) => updateDsp({ eqMidDb: v })}
              accent="cyan"
            />

            <StudioSlider
              label="Agudos"
              hint="4.5 kHz"
              value={dsp.eqHighDb}
              min={-12}
              max={12}
              step={0.5}
              defaultValue={0}
              unit=" dB"
              onChange={(v) => updateDsp({ eqHighDb: v })}
              accent="violet"
            />
          </div>
        </div>

        {/* Effects Chain */}
        <div className="space-y-2">
          <div className="px-1 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
            Efectos y Masterización
          </div>

          <StudioToggle
            label="Radio / Megáfono"
            description="Filtro bandpass 420Hz–3.1kHz"
            checked={dsp.radioEnabled}
            onChange={(v) => updateDsp({ radioEnabled: v })}
            icon={<Radio className="w-3.5 h-3.5" />}
          />

          <StudioToggle
            label="Eco / Reverb de Cueva"
            description="Espacialización estéreo Schroeder"
            checked={dsp.reverbEnabled}
            onChange={(v) => updateDsp({ reverbEnabled: v })}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            <StudioSlider
              label="Profundidad Reverb"
              value={Math.round(dsp.reverbDepth * 100)}
              min={10}
              max={100}
              step={5}
              defaultValue={45}
              unit="%"
              onChange={(v) => updateDsp({ reverbDepth: v / 100 })}
              accent="cyan"
            />
          </StudioToggle>

          <StudioToggle
            label="Saturación / Micrófono Meme"
            description="Overdrive estilo micro saturado"
            checked={dsp.distortionEnabled}
            onChange={(v) => updateDsp({ distortionEnabled: v })}
            icon={<Flame className="w-3.5 h-3.5" />}
          >
            <StudioSlider
              label="Ganancia / Drive"
              value={Math.round(dsp.distortionDrive * 100)}
              min={10}
              max={100}
              step={5}
              defaultValue={55}
              unit="%"
              onChange={(v) => updateDsp({ distortionDrive: v / 100 })}
              accent="violet"
            />
          </StudioToggle>

          <StudioToggle
            label="Normalización de Picos (-1 dB)"
            description="Nivelado de estudio y limitador anti-clipping"
            checked={dsp.normalizeEnabled}
            onChange={(v) => updateDsp({ normalizeEnabled: v })}
            icon={<Gauge className="w-3.5 h-3.5" />}
          />
        </div>
      </SmoothScrollArea>
    </aside>
  );
};
