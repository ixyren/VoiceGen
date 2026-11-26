use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::ipc::Response;
use tauri::State;
use uuid::Uuid;

use crate::audio::dsp::{
    compute_waveform_peaks, process_audio, TARGET_SAMPLE_RATE, WAVEFORM_BUCKETS,
};
use crate::audio::encoder::{encode_mp3, encode_wav_stereo_16bit};
use crate::models::{
    DspParams, ExportMp3Request, ExportMp3Result, SynthesizeRequest, SynthesisResult, VoiceArch,
    VoiceInfo,
};
use crate::state::{AppState, CachedAudio};
use crate::tts::scanner::scan_system_voices;
use crate::tts::xml::{build_sapi_xml, strip_all_tags};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn ensure_voices(state: &AppState, force_refresh: bool) -> Vec<VoiceInfo> {
    if !force_refresh {
        if let Ok(guard) = state.voices.read() {
            if !guard.is_empty() {
                return guard.clone();
            }
        }
    }

    let scanned = scan_system_voices();
    if let Ok(mut guard) = state.voices.write() {
        *guard = scanned.clone();
    }
    scanned
}

fn find_voice(state: &AppState, voice_id: &str) -> Result<VoiceInfo, String> {
    let voices = ensure_voices(state, false);
    voices
        .into_iter()
        .find(|v| v.id == voice_id)
        .ok_or_else(|| format!("Voz no encontrada: {voice_id}"))
}

fn preview_sample_for_voice(voice: &VoiceInfo) -> &'static str {
    let code = voice.language_code.as_str();
    if code.starts_with("es") {
        if voice.is_loquendo {
            "Hola, soy tu voz Loquendo en VoiceGen. Vamos a grabar algo épico."
        } else {
            "Hola, esta es una prueba rápida de voz en VoiceGen."
        }
    } else if code.starts_with("en") {
        "Hello, this is a quick voice preview inside VoiceGen Studio."
    } else if code.starts_with("fr") {
        "Bonjour, ceci est un aperçu vocal rapide dans VoiceGen."
    } else if code.starts_with("pt") {
        "Olá, esta é uma prévia rápida de voz no VoiceGen."
    } else if code.starts_with("it") {
        "Ciao, questa è un'anteprima vocale rapida in VoiceGen."
    } else if code.starts_with("de") {
        "Hallo, dies ist eine schnelle Sprachvorschau in VoiceGen."
    } else if code.starts_with("ca") {
        "Hola, aquesta és una prova ràpida de veu a VoiceGen."
    } else {
        "VoiceGen Text to Speech Studio preview."
    }
}

fn reveal_in_explorer(target_path: &str) -> Result<(), String> {
    let p = Path::new(target_path);
    if p.is_dir() {
        Command::new("explorer.exe")
            .arg(target_path)
            .spawn()
            .map_err(|e| format!("No se pudo abrir la carpeta: {e}"))?;
    } else {
        let arg = format!("/select,{}", target_path);
        Command::new("explorer.exe")
            .arg(arg)
            .spawn()
            .map_err(|e| format!("No se pudo abrir el Explorador: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn list_voices(
    state: State<'_, Arc<AppState>>,
    refresh: Option<bool>,
) -> Result<Vec<VoiceInfo>, String> {
    let state = Arc::clone(&state);
    let force = refresh.unwrap_or(false);
    tauri::async_runtime::spawn_blocking(move || ensure_voices(&state, force))
        .await
        .map_err(|e| format!("Error escaneando voces: {e}"))
}

#[tauri::command]
pub async fn synthesize_speech(
    state: State<'_, Arc<AppState>>,
    req: SynthesizeRequest,
) -> Result<SynthesisResult, String> {
    if req.text.trim().is_empty() {
        return Err("Escribe un texto antes de sintetizar.".to_string());
    }

    let state = Arc::clone(&state);
    tauri::async_runtime::spawn_blocking(move || {
        let voice = find_voice(&state, &req.voice_id)?;
        let rate_clamped = req.rate.clamp(-10.0, 10.0);
        let rate_int = rate_clamped.round() as i32;
        let fractional_rate = rate_clamped - (rate_int as f32);

        let xml = build_sapi_xml(&req.text, req.pitch, voice.is_loquendo);
        let plain = strip_all_tags(&req.text);
        let fallback = if plain.is_empty() {
            " ".to_string()
        } else {
            plain.clone()
        };

        let raw_pcm = state.bridge.synthesize(
            voice.arch == VoiceArch::Sapi5x86,
            voice.arch == VoiceArch::OneCore,
            &voice.token_id,
            &xml,
            &fallback,
            rate_int,
            req.volume.clamp(0, 100),
        )?;

        let (left, right) = process_audio(&raw_pcm, fractional_rate, &req.dsp);
        let duration_ms = ((left.len() as f64 / TARGET_SAMPLE_RATE as f64) * 1000.0).round() as u64;
        let peaks = compute_waveform_peaks(&left, &right, WAVEFORM_BUCKETS);
        let wav_bytes = encode_wav_stereo_16bit(&left, &right, TARGET_SAMPLE_RATE);

        let id = Uuid::new_v4().to_string();
        let snippet_source = if plain.is_empty() {
            req.text.trim().to_string()
        } else {
            plain
        };
        let text_snippet: String = snippet_source.chars().take(90).collect();

        state.insert_audio(
            id.clone(),
            CachedAudio {
                left,
                right,
                sample_rate: TARGET_SAMPLE_RATE,
                wav_bytes,
            },
        );

        let _ = req.save_to_history;

        Ok(SynthesisResult {
            id,
            duration_ms,
            sample_rate: TARGET_SAMPLE_RATE,
            peaks,
            voice_id: voice.id,
            voice_name: voice.name,
            voice_arch: voice.arch,
            text_snippet,
            created_at_ms: now_ms(),
        })
    })
    .await
    .map_err(|e| format!("Error interno en hilo de síntesis: {e}"))?
}

#[tauri::command]
pub async fn preview_voice(
    state: State<'_, Arc<AppState>>,
    voice_id: String,
    text: Option<String>,
) -> Result<Response, String> {
    let state = Arc::clone(&state);
    tauri::async_runtime::spawn_blocking(move || {
        let voice = find_voice(&state, &voice_id)?;
        let sample = match text {
            Some(t) if !t.trim().is_empty() => t,
            _ => preview_sample_for_voice(&voice).to_string(),
        };

        let xml = build_sapi_xml(&sample, 0, voice.is_loquendo);
        let plain = strip_all_tags(&sample);
        let raw_pcm = state.bridge.synthesize(
            voice.arch == VoiceArch::Sapi5x86,
            voice.arch == VoiceArch::OneCore,
            &voice.token_id,
            &xml,
            &plain,
            0,
            100,
        )?;

        let (left, right) = process_audio(&raw_pcm, 0.0, &DspParams::default());
        let wav_bytes = encode_wav_stereo_16bit(&left, &right, TARGET_SAMPLE_RATE);
        Ok(Response::new(wav_bytes))
    })
    .await
    .map_err(|e| format!("Error interno en preview: {e}"))?
}

#[tauri::command]
pub fn get_audio_wav(state: State<'_, Arc<AppState>>, audio_id: String) -> Result<Response, String> {
    let bytes = state
        .get_wav(&audio_id)
        .ok_or_else(|| "El audio ya no está en la caché de sesión. Vuelve a generarlo.".to_string())?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub fn delete_cached_audio(state: State<'_, Arc<AppState>>, audio_id: String) -> Result<(), String> {
    state.remove_audio(&audio_id);
    Ok(())
}

#[tauri::command]
pub async fn export_mp3(
    state: State<'_, Arc<AppState>>,
    req: ExportMp3Request,
) -> Result<ExportMp3Result, String> {
    let state = Arc::clone(&state);
    tauri::async_runtime::spawn_blocking(move || {
        let (left, right, sample_rate) = state
            .get_pcm_for_export(&req.audio_id)
            .ok_or_else(|| "El audio seleccionado expiró de la memoria. Genera el audio nuevamente.".to_string())?;

        let mp3_bytes = encode_mp3(&left, &right, sample_rate, req.bitrate_kbps)?;

        let out_path = Path::new(&req.output_path);
        if let Some(parent) = out_path.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("No se pudo crear la carpeta destino: {e}"))?;
            }
        }

        fs::write(out_path, &mp3_bytes)
            .map_err(|e| format!("Error escribiendo archivo MP3: {e}"))?;

        if req.open_folder {
            let _ = reveal_in_explorer(&req.output_path);
        }

        Ok(ExportMp3Result {
            path: req.output_path,
            bytes_written: mp3_bytes.len(),
            bitrate_kbps: req.bitrate_kbps,
        })
    })
    .await
    .map_err(|e| format!("Error interno exportando MP3: {e}"))?
}

#[tauri::command]
pub fn reveal_file(path: String) -> Result<(), String> {
    reveal_in_explorer(&path)
}

#[tauri::command]
pub fn export_presets_json(path: String, json_content: String) -> Result<(), String> {
    fs::write(&path, json_content.as_bytes())
        .map_err(|e| format!("No se pudo guardar archivo JSON: {e}"))
}

#[tauri::command]
pub fn import_presets_json(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("No se pudo leer archivo JSON: {e}"))
}
