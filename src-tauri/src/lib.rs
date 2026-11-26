pub mod audio;
pub mod commands;
pub mod models;
pub mod state;
pub mod tts;

use std::sync::Arc;
use tauri::RunEvent;

use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = Arc::new(AppState::default());
    let exit_state = Arc::clone(&app_state);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::list_voices,
            commands::synthesize_speech,
            commands::preview_voice,
            commands::get_audio_wav,
            commands::delete_cached_audio,
            commands::export_mp3,
            commands::reveal_file,
            commands::export_presets_json,
            commands::import_presets_json,
        ])
        .build(tauri::generate_context!())
        .expect("Error inicializando aplicación Tauri VoiceGen");

    app.run(move |app_handle, event| {
        if let RunEvent::Exit = event {
            exit_state.bridge.shutdown_all();
            let _ = app_handle;
        }
    });
}
