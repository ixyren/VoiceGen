use std::collections::{HashMap, VecDeque};
use std::sync::{Mutex, RwLock};

use crate::models::VoiceInfo;
use crate::tts::bridge::TtsBridgeState;

const MAX_CACHED_AUDIO: usize = 25;

pub struct CachedAudio {
    pub left: Vec<f32>,
    pub right: Vec<f32>,
    pub sample_rate: u32,
    pub wav_bytes: Vec<u8>,
}

pub struct AppState {
    pub bridge: TtsBridgeState,
    pub voices: RwLock<Vec<VoiceInfo>>,
    audio_cache: Mutex<(HashMap<String, CachedAudio>, VecDeque<String>)>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            bridge: TtsBridgeState::default(),
            voices: RwLock::new(Vec::new()),
            audio_cache: Mutex::new((HashMap::new(), VecDeque::new())),
        }
    }
}

impl AppState {
    pub fn insert_audio(&self, id: String, audio: CachedAudio) {
        if let Ok(mut guard) = self.audio_cache.lock() {
            let (map, order) = &mut *guard;
            if !map.contains_key(&id) {
                order.push_back(id.clone());
            }
            map.insert(id, audio);
            while order.len() > MAX_CACHED_AUDIO {
                if let Some(oldest) = order.pop_front() {
                    map.remove(&oldest);
                }
            }
        }
    }

    pub fn get_wav(&self, id: &str) -> Option<Vec<u8>> {
        self.audio_cache
            .lock()
            .ok()
            .and_then(|g| g.0.get(id).map(|a| a.wav_bytes.clone()))
    }

    pub fn get_pcm_for_export(&self, id: &str) -> Option<(Vec<f32>, Vec<f32>, u32)> {
        self.audio_cache
            .lock()
            .ok()
            .and_then(|g| g.0.get(id).map(|a| (a.left.clone(), a.right.clone(), a.sample_rate)))
    }

    pub fn remove_audio(&self, id: &str) {
        if let Ok(mut guard) = self.audio_cache.lock() {
            guard.0.remove(id);
            guard.1.retain(|item| item != id);
        }
    }
}
