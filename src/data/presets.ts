import { DspParams, Preset, VoiceInfo } from "../types/voicegen";

export const DEFAULT_DSP: DspParams = {
  pitchSemitones: 0,
  eqLowDb: 0,
  eqMidDb: 0,
  eqHighDb: 0,
  radioEnabled: false,
  reverbEnabled: false,
  reverbDepth: 0.45,
  distortionEnabled: false,
  distortionDrive: 0.55,
  normalizeEnabled: true,
};

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: "builtin-tio-gilipollas",
    name: "El Tío Gilipollas (Clásico)",
    description: "Voz Jorge clásica, ritmo ágil y realce nasal Loquendo 2008.",
    isBuiltin: true,
    accentFrom: "#8B5CF6",
    accentTo: "#06B6D4",
    preferredVoices: ["Jorge"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Hola a todos hijos de fruta, <silence msec="300"/> hoy os traigo un tutorial espectacular de cómo usar VoiceGen. \\item=Laugh',
    rate: 1.5,
    pitch: -2,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: 1.0,
      eqMidDb: 4.5,
      eqHighDb: 0.5,
      normalizeEnabled: true,
    },
  },
  {
    id: "builtin-anticristo-2007",
    name: "El Anticristo 2007 (Rant Rápido)",
    description: "Rant acelerado con presencia agresiva y pegada saturada.",
    isBuiltin: true,
    accentFrom: "#EF4444",
    accentTo: "#F97316",
    preferredVoices: ["Jorge", "Carlos"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Buenas tardes a todos, <silence msec="200"/> estoy harto de que la gente no sepa configurar un maldito micrófono en pleno 2007.',
    rate: 4,
    pitch: -1,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: 2.0,
      eqMidDb: 5.0,
      eqHighDb: 2.0,
      distortionEnabled: true,
      distortionDrive: 0.32,
      normalizeEnabled: true,
    },
  },
  {
    id: "builtin-vieja-cotilla",
    name: "La Vieja Cotilla / Marujita",
    description: "Voz femenina aguda, rápida y mordaz con medios brillantes.",
    isBuiltin: true,
    accentFrom: "#EC4899",
    accentTo: "#8B5CF6",
    preferredVoices: ["Carmen", "Esperanza", "Helena", "Laura"],
    preferredGender: "Female",
    preferredLangPrefix: "es",
    sampleText:
      '¡Ay Virgen santísima! <silence msec="300"/> ¿Te has enterado de lo que hizo el vecino del cuarto ayer por la noche?',
    rate: 2,
    pitch: 4,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: -2.0,
      eqMidDb: 3.5,
      eqHighDb: 2.0,
      normalizeEnabled: true,
    },
  },
  {
    id: "builtin-creepypasta",
    name: "Narrador Creepypasta / Misterio",
    description: "Pausado, grave y con leve eco atmosférico de terror nocturno.",
    isBuiltin: true,
    accentFrom: "#6366F1",
    accentTo: "#0EA5E9",
    preferredVoices: ["Diego", "Jorge"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Eran las tres de la madrugada cuando encontré aquel archivo sin nombre... <silence msec="700"/> No debí darle a reproducir.',
    rate: -2,
    pitch: -3,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: -0.5,
      eqLowDb: 3.5,
      eqMidDb: -1.0,
      eqHighDb: -1.5,
      reverbEnabled: true,
      reverbDepth: 0.32,
      normalizeEnabled: true,
    },
  },
  {
    id: "builtin-ultratumba",
    name: "Ente de Ultratumba",
    description: "Voz cavernosa ultra grave con reverb profunda de abismo.",
    isBuiltin: true,
    accentFrom: "#7C3AED",
    accentTo: "#10B981",
    preferredVoices: [],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Mortales... <silence msec="600"/> habéis invocado una frecuencia que no pertenece a este plano.',
    rate: -3.5,
    pitch: -8,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: -4.5,
      eqLowDb: 6.0,
      eqMidDb: -2.0,
      eqHighDb: -4.0,
      reverbEnabled: true,
      reverbDepth: 0.85,
      normalizeEnabled: true,
    },
  },
  {
    id: "builtin-pitufo-ardilla",
    name: "Pitufo / Ardilla Acelerada",
    description: "Velocidad disparada y tono agudo caricaturesco.",
    isBuiltin: true,
    accentFrom: "#06B6D4",
    accentTo: "#3B82F6",
    preferredVoices: [],
    sampleText:
      '¡Oye oye oye! ¡Tengo muchísima prisa porque me he tomado cuatro cafés cargados en cinco minutos!',
    rate: 3.5,
    pitch: 8,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: 5.5,
      eqLowDb: -4.0,
      eqMidDb: 2.0,
      eqHighDb: 3.5,
      normalizeEnabled: true,
    },
  },
  {
    id: "builtin-reportero-2009",
    name: "Reportero Loquendo 2009",
    description: "Dicción clara tipo informativo YouTube con EQ balanceada.",
    isBuiltin: true,
    accentFrom: "#10B981",
    accentTo: "#06B6D4",
    preferredVoices: ["Carlos", "Jorge"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Bienvenidos a este nuevo vídeo informativo. <silence msec="350"/> Hoy analizaremos paso a paso las novedades del estudio.',
    rate: 1,
    pitch: 0,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: 0.5,
      eqMidDb: 2.0,
      eqHighDb: 1.5,
      normalizeEnabled: true,
    },
  },
];

export interface InsertSnippet {
  id: string;
  label: string;
  snippet: string;
  wrapSelection?: { prefix: string; suffix: string };
  hint: string;
}

export const SAPI_QUICK_SNIPPETS: InsertSnippet[] = [
  {
    id: "silence-300",
    label: "Pausa 300ms",
    snippet: '<silence msec="300"/>',
    hint: "Pausa breve natural",
  },
  {
    id: "silence-500",
    label: "Pausa 500ms",
    snippet: '<silence msec="500"/>',
    hint: "Pausa dramática media",
  },
  {
    id: "silence-1000",
    label: "Pausa 1s",
    snippet: '<silence msec="1000"/>',
    hint: "Silencio largo (1 segundo)",
  },
  {
    id: "pitch-up",
    label: "+Tono frase",
    snippet: '<pitch absmiddle="+5">texto agudo</pitch>',
    wrapSelection: { prefix: '<pitch absmiddle="+5">', suffix: "</pitch>" },
    hint: "Sube el tono SAPI en un fragmento",
  },
  {
    id: "pitch-down",
    label: "-Tono frase",
    snippet: '<pitch absmiddle="-5">texto grave</pitch>',
    wrapSelection: { prefix: '<pitch absmiddle="-5">', suffix: "</pitch>" },
    hint: "Baja el tono SAPI en un fragmento",
  },
  {
    id: "emph",
    label: "Énfasis",
    snippet: "<emph>palabra clave</emph>",
    wrapSelection: { prefix: "<emph>", suffix: "</emph>" },
    hint: "Acentúa una palabra o frase",
  },
];

export const LOQUENDO_EXPRESSIONS: InsertSnippet[] = [
  { id: "lq-laugh", label: "Risa", snippet: "\\item=Laugh", hint: "Risa clásica Loquendo" },
  { id: "lq-throat", label: "Carraspeo", snippet: "\\item=Throat", hint: "Aclarar garganta" },
  { id: "lq-sigh", label: "Suspiro", snippet: "\\item=Sigh", hint: "Suspiro dramático" },
  { id: "lq-cough", label: "Tos", snippet: "\\item=Cough", hint: "Golpe de tos" },
  { id: "lq-gasp", label: "Jadeo", snippet: "\\item=Gasp", hint: "Sorpresa / jadeo" },
  { id: "lq-yawn", label: "Bostezo", snippet: "\\item=Yawn", hint: "Bostezo cansado" },
  { id: "lq-whistle", label: "Silbido", snippet: "\\item=Whistle", hint: "Silbido Loquendo" },
];

export function findBestVoiceForPreset(
  preset: Preset,
  voices: VoiceInfo[],
  currentVoiceId: string | null
): VoiceInfo | null {
  if (voices.length === 0) return null;

  // 1. Preferred voice names (prioritizing Loquendo engines)
  for (const preferred of preset.preferredVoices) {
    const target = preferred.toLowerCase();
    const loquendoMatch = voices.find(
      (v) => v.isLoquendo && v.name.toLowerCase().includes(target)
    );
    if (loquendoMatch) return loquendoMatch;

    const anyMatch = voices.find((v) => v.name.toLowerCase().includes(target));
    if (anyMatch) return anyMatch;
  }

  // 2. Gender + language hint (e.g. Ente de Ultratumba -> any male voice)
  if (preset.preferredGender) {
    const lang = preset.preferredLangPrefix || "es";
    const lqGender = voices.find(
      (v) =>
        v.isLoquendo &&
        v.gender === preset.preferredGender &&
        v.languageCode.startsWith(lang)
    );
    if (lqGender) return lqGender;

    const langGender = voices.find(
      (v) => v.gender === preset.preferredGender && v.languageCode.startsWith(lang)
    );
    if (langGender) return langGender;

    const anyGender = voices.find((v) => v.gender === preset.preferredGender);
    if (anyGender) return anyGender;
  }

  // 3. Keep current voice if valid (e.g. Pitufo / Ardilla works on any selected voice)
  if (currentVoiceId) {
    const current = voices.find((v) => v.id === currentVoiceId);
    if (current) return current;
  }

  return voices.find((v) => v.isLoquendo) ?? voices[0];
}

export function slugifyFilename(rawText: string): string {
  const withoutTags = rawText
    .replace(/<[^>]+>/g, " ")
    .replace(/\\(item|pause|pitch|speed|volume)=\S+/gi, " ");
  const normalized = withoutTags
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .trim();

  if (!normalized) return "voicegen_audio";
  const words = normalized.split(/\s+/).slice(0, 5);
  return words.join("_").slice(0, 48) || "voicegen_audio";
}
