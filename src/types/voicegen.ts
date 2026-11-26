export type VoiceArch = "32-bit" | "64-bit" | "OneCore";

export interface VoiceInfo {
  id: string;
  tokenKey: string;
  tokenId: string;
  name: string;
  description: string;
  languageCode: string;
  languageLabel: string;
  gender: string;
  vendor: string;
  arch: VoiceArch;
  isLoquendo: boolean;
}

export interface DspParams {
  pitchSemitones: number;
  eqLowDb: number;
  eqMidDb: number;
  eqHighDb: number;
  radioEnabled: boolean;
  reverbEnabled: boolean;
  reverbDepth: number;
  distortionEnabled: boolean;
  distortionDrive: number;
  normalizeEnabled: boolean;
}

export interface SynthesizeRequest {
  voiceId: string;
  text: string;
  rate: number;
  pitch: number;
  volume: number;
  dsp: DspParams;
  saveToHistory: boolean;
}

export interface SynthesisResult {
  id: string;
  durationMs: number;
  sampleRate: number;
  peaks: number[];
  voiceId: string;
  voiceName: string;
  voiceArch: VoiceArch;
  textSnippet: string;
  createdAtMs: number;
}

export interface ExportMp3Request {
  audioId: string;
  outputPath: string;
  bitrateKbps: ExportBitrate;
  openFolder: boolean;
}

export interface ExportMp3Result {
  path: string;
  bytesWritten: number;
  bitrateKbps: number;
}

export type ExportBitrate = 128 | 192 | 320;

export type PresetCategory = "all" | "classic" | "tiktok" | "custom";

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: "classic" | "tiktok" | "custom";
  featuredVoiceLabel: string;
  isBuiltin: boolean;
  accentFrom: string;
  accentTo: string;
  preferredVoices: string[];
  preferredGender?: "Male" | "Female";
  preferredLangPrefix?: string;
  sampleText: string;
  rate: number;
  pitch: number;
  volume: number;
  dsp: DspParams;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
  actionLabel?: string;
  actionPath?: string;
}
