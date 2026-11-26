use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VoiceArch {
    #[serde(rename = "32-bit")]
    Sapi5x86,
    #[serde(rename = "64-bit")]
    Sapi5x64,
    #[serde(rename = "OneCore")]
    OneCore,
}

impl VoiceArch {
    pub fn as_str(&self) -> &'static str {
        match self {
            VoiceArch::Sapi5x86 => "32-bit",
            VoiceArch::Sapi5x64 => "64-bit",
            VoiceArch::OneCore => "OneCore",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceInfo {
    pub id: String,
    pub token_key: String,
    pub token_id: String,
    pub name: String,
    pub description: String,
    pub language_code: String,
    pub language_label: String,
    pub gender: String,
    pub vendor: String,
    pub arch: VoiceArch,
    pub is_loquendo: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DspParams {
    pub pitch_semitones: f32,
    pub eq_low_db: f32,
    pub eq_mid_db: f32,
    pub eq_high_db: f32,
    pub radio_enabled: bool,
    pub reverb_enabled: bool,
    pub reverb_depth: f32,
    pub distortion_enabled: bool,
    pub distortion_drive: f32,
    pub normalize_enabled: bool,
}

impl Default for DspParams {
    fn default() -> Self {
        Self {
            pitch_semitones: 0.0,
            eq_low_db: 0.0,
            eq_mid_db: 0.0,
            eq_high_db: 0.0,
            radio_enabled: false,
            reverb_enabled: false,
            reverb_depth: 0.45,
            distortion_enabled: false,
            distortion_drive: 0.55,
            normalize_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeRequest {
    pub voice_id: String,
    pub text: String,
    pub rate: f32,
    pub pitch: i32,
    pub volume: u32,
    #[serde(default)]
    pub dsp: DspParams,
    #[serde(default = "default_true")]
    pub save_to_history: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesisResult {
    pub id: String,
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub peaks: Vec<f32>,
    pub voice_id: String,
    pub voice_name: String,
    pub voice_arch: VoiceArch,
    pub text_snippet: String,
    pub created_at_ms: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportMp3Request {
    pub audio_id: String,
    pub output_path: String,
    pub bitrate_kbps: u32,
    #[serde(default)]
    pub open_folder: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportMp3Result {
    pub path: String,
    pub bytes_written: usize,
    pub bitrate_kbps: u32,
}
