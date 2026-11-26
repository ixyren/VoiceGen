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
  // ==========================================
  // ÉPOCA DORADA DE YOUTUBE (CLÁSICOS 2007-2015)
  // ==========================================
  {
    id: "classic-jorge-loquendero",
    name: "Jorge — El Loquendero Clásico",
    description: "Voz protagonista por excelencia de tutoriales y YouTube Poop 2008.",
    category: "classic",
    featuredVoiceLabel: "Jorge (España)",
    isBuiltin: true,
    accentFrom: "#8B5CF6",
    accentTo: "#06B6D4",
    preferredVoices: ["Jorge"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Hola a todos amigos de YouTube, hoy les traigo un tutorial definitivo de cómo descargar el GTA San Andreas full español un link por Mega. \\item=Laugh',
    rate: 1,
    pitch: 0,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: 1.0,
      eqMidDb: 4.0,
      eqHighDb: 1.0,
      normalizeEnabled: true,
    },
  },
  {
    id: "classic-carlos-antagonista",
    name: "Carlos — El Antagonista / CJ / Policía",
    description: "Voz colombiana firme y ruda para discusiones, machinimas y GTA.",
    category: "classic",
    featuredVoiceLabel: "Carlos (Colombia)",
    isBuiltin: true,
    accentFrom: "#EF4444",
    accentTo: "#F97316",
    preferredVoices: ["Carlos"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Oye Jorge, cállate ya la boca y deja de decir estupideces, que la policía nos viene persiguiendo desde Los Santos y no traes ni una pistola.',
    rate: 0.5,
    pitch: -2,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: -0.5,
      eqLowDb: 2.5,
      eqMidDb: 2.0,
      eqHighDb: -0.5,
      normalizeEnabled: true,
    },
  },
  {
    id: "classic-diego-che-boludo",
    name: "Diego — El Amigo Argentino / Misterios GTA",
    description: "Marcado acento porteño, narraciones de creepypastas y mitos de CJ.",
    category: "classic",
    featuredVoiceLabel: "Diego (Argentina)",
    isBuiltin: true,
    accentFrom: "#0284C7",
    accentTo: "#38BDF8",
    preferredVoices: ["Diego"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Che boludo, mirá fijamente esa cabaña abandonada en el monte Chiliad... <silence msec="400"/> te juro que vi pasar la sombra de Leatherface.',
    rate: 1.5,
    pitch: -1,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: 2.0,
      eqMidDb: 3.5,
      eqHighDb: 1.0,
      reverbEnabled: true,
      reverbDepth: 0.18,
      normalizeEnabled: true,
    },
  },
  {
    id: "classic-esperanza-novia",
    name: "Esperanza — La Novia / Telenovela / Denise",
    description: "Voz femenina mexicana icónica para dramas, madres y parodias.",
    category: "classic",
    featuredVoiceLabel: "Esperanza (México)",
    isBuiltin: true,
    accentFrom: "#EC4899",
    accentTo: "#F43F5E",
    preferredVoices: ["Esperanza"],
    preferredGender: "Female",
    preferredLangPrefix: "es",
    sampleText:
      '¡Ay por Dios santísimo! <silence msec="350"/> ¿Se puede saber por qué siempre que salimos terminas explotando una gasolinera entera con tus amigos?',
    rate: 1,
    pitch: 2,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: -1.0,
      eqMidDb: 3.0,
      eqHighDb: 2.5,
      normalizeEnabled: true,
    },
  },
  {
    id: "classic-juan-critico",
    name: "Juan — El Co-Host Sarcástico / Sabio",
    description: "Voz española templada, moderador de debates y tops retro.",
    category: "classic",
    featuredVoiceLabel: "Juan (España)",
    isBuiltin: true,
    accentFrom: "#10B981",
    accentTo: "#059669",
    preferredVoices: ["Juan"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Pues sinceramente yo opino que el video estuvo entretenido, pero tu ortografía en los títulos deja muchísimo que desear, querido amigo.',
    rate: 1,
    pitch: -1,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: 1.5,
      eqMidDb: 2.5,
      eqHighDb: 1.0,
      normalizeEnabled: true,
    },
  },
  {
    id: "classic-francisca-chilena",
    name: "Francisca — La Crítica Chilena / Rant Rápido",
    description: "Acento chileno enérgico para quejas rápidas y disputas en foros.",
    category: "classic",
    featuredVoiceLabel: "Francisca (Chile)",
    isBuiltin: true,
    accentFrom: "#F59E0B",
    accentTo: "#D97706",
    preferredVoices: ["Francisca"],
    preferredGender: "Female",
    preferredLangPrefix: "es",
    sampleText:
      'Oigan cabros, pónganse las pilas y escuchen bien, que no pienso repetir dos veces cómo configurar esta cuestión en la computadora.',
    rate: 2.5,
    pitch: 2,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: -1.5,
      eqMidDb: 3.5,
      eqHighDb: 2.0,
      normalizeEnabled: true,
    },
  },
  {
    id: "classic-carmen-madre",
    name: "Carmen — Doña Carmen / Profesora / Madre",
    description: "Voz española autoritaria y formal, perfecta para regaños épicos.",
    category: "classic",
    featuredVoiceLabel: "Carmen (España)",
    isBuiltin: true,
    accentFrom: "#8B5CF6",
    accentTo: "#7C3AED",
    preferredVoices: ["Carmen", "Helena"],
    preferredGender: "Female",
    preferredLangPrefix: "es",
    sampleText:
      '¡Jorge! <silence msec="400"/> Deja esa computadora inmediatamente y ven a cenar antes de que se enfríe, que llevas cinco horas pegado a la pantalla.',
    rate: 1,
    pitch: 1,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: -0.5,
      eqMidDb: 3.5,
      eqHighDb: 1.5,
      normalizeEnabled: true,
    },
  },

  // ==========================================
  // TENDENCIAS VIRALES TIKTOK & SHORTS (2023-2026)
  // ==========================================
  {
    id: "tiktok-brainrot-gameplay",
    name: "TikTok Brainrot / Subway Surfers Acelerado",
    description: "Ritmo frenético 1.3x optimizado para retención y subtítulos palabra por palabra.",
    category: "tiktok",
    featuredVoiceLabel: "Jorge / Carlos Acelerado",
    isBuiltin: true,
    accentFrom: "#6366F1",
    accentTo: "#EC4899",
    preferredVoices: ["Jorge", "Carlos"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'POV: Te despiertas a las 3 de la mañana recordando un momento vergonzoso de la primaria y de repente tu gato te mira fijamente desde la esquina de la habitación.',
    rate: 4,
    pitch: 2,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: 1.5,
      eqLowDb: -2.0,
      eqMidDb: 4.5,
      eqHighDb: 3.0,
      normalizeEnabled: true,
    },
  },
  {
    id: "tiktok-storytime-express",
    name: "TikTok Storytime Express (Chisme Rápido)",
    description: "Voz femenina ágil y envolvente para anécdotas virales que enganchan.",
    category: "tiktok",
    featuredVoiceLabel: "Esperanza / Francisca",
    isBuiltin: true,
    accentFrom: "#F43F5E",
    accentTo: "#FB923C",
    preferredVoices: ["Esperanza", "Francisca", "Carmen"],
    preferredGender: "Female",
    preferredLangPrefix: "es",
    sampleText:
      'Storytime de la vez que mi mejor amiga fingió ser su propia hermana gemela para no devolverme los cincuenta dólares que le presté en la secundaria.',
    rate: 3,
    pitch: 2,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: 0.5,
      eqLowDb: -1.0,
      eqMidDb: 3.0,
      eqHighDb: 2.5,
      normalizeEnabled: true,
    },
  },
  {
    id: "tiktok-shitpost-mic-roto",
    name: "TikTok Shitpost / Micro Roto 2000 (Ear-Rape)",
    description: "Saturación agresiva estilo audio ultra comprimido de meme absurdo.",
    category: "tiktok",
    featuredVoiceLabel: "Jorge / Diego Saturado",
    isBuiltin: true,
    accentFrom: "#EAB308",
    accentTo: "#EF4444",
    preferredVoices: ["Jorge", "Diego", "Carlos"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'TOP 5 MOMENTOS MÁS HUMILDES DE LA HUMANIDAD. <silence msec="250"/> NÚMERO 1: CREER QUE POR PONER EN EL BLOC DE NOTAS MATRIX ERAS HACKER.',
    rate: 2.5,
    pitch: -1,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      eqLowDb: 3.0,
      eqMidDb: 6.0,
      eqHighDb: 3.0,
      radioEnabled: true,
      distortionEnabled: true,
      distortionDrive: 0.78,
      normalizeEnabled: true,
    },
  },
  {
    id: "tiktok-dark-iceberg",
    name: "Iceberg & Creepypasta TikTok (Voz de Misterio)",
    description: "Tono cavernoso profundo con reverb atmosférica para videos conspirativos.",
    category: "tiktok",
    featuredVoiceLabel: "Carlos / Diego Profundo",
    isBuiltin: true,
    accentFrom: "#8B5CF6",
    accentTo: "#3B82F6",
    preferredVoices: ["Carlos", "Diego", "Jorge"],
    preferredGender: "Male",
    preferredLangPrefix: "es",
    sampleText:
      'Nivel 6 del iceberg de internet: <silence msec="600"/> la frecuencia de audio eliminada que fue transmitida en vivo durante apenas cuarenta segundos.',
    rate: -1.5,
    pitch: -4,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: -2.5,
      eqLowDb: 4.5,
      eqMidDb: -1.5,
      eqHighDb: -2.0,
      reverbEnabled: true,
      reverbDepth: 0.42,
      normalizeEnabled: true,
    },
  },
  {
    id: "tiktok-npc-speedup",
    name: "TikTok NPC / Live Spammer (Speedup Meme)",
    description: "Tono agudo súper acelerado emulando directos de NPCs y audios de ardilla.",
    category: "tiktok",
    featuredVoiceLabel: "Francisca / Esperanza Speedup",
    isBuiltin: true,
    accentFrom: "#06B6D4",
    accentTo: "#3B82F6",
    preferredVoices: ["Francisca", "Esperanza"],
    preferredGender: "Female",
    preferredLangPrefix: "es",
    sampleText:
      '¡Gracias por la rosa! <silence msec="200"/> ¡Gracias por el corazoncito! ¡Mmm qué rico! ¡Tac tac a la pantalla muchachos, tac tac a la pantalla!',
    rate: 4.5,
    pitch: 8,
    volume: 100,
    dsp: {
      ...DEFAULT_DSP,
      pitchSemitones: 6.0,
      eqLowDb: -4.0,
      eqMidDb: 2.5,
      eqHighDb: 4.0,
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

  // 1. Try preferred voice names (prioritizing Loquendo engines first)
  for (const preferred of preset.preferredVoices) {
    const target = preferred.toLowerCase();
    const loquendoMatch = voices.find(
      (v) => v.isLoquendo && v.name.toLowerCase().includes(target)
    );
    if (loquendoMatch) return loquendoMatch;

    const anyMatch = voices.find((v) => v.name.toLowerCase().includes(target));
    if (anyMatch) return anyMatch;
  }

  // 2. Gender + language hint (prioritizing Loquendo)
  if (preset.preferredGender) {
    const lang = preset.preferredLangPrefix || "es";
    const lqGender = voices.find(
      (v) =>
        v.isLoquendo &&
        v.gender === preset.preferredGender &&
        v.languageCode.startsWith(lang)
    );
    if (lqGender) return lqGender;

    const anyGenderLang = voices.find(
      (v) => v.gender === preset.preferredGender && v.languageCode.startsWith(lang)
    );
    if (anyGenderLang) return anyGenderLang;

    const anyGender = voices.find((v) => v.gender === preset.preferredGender);
    if (anyGender) return anyGender;
  }

  // 3. Fallback to current voice if valid
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
