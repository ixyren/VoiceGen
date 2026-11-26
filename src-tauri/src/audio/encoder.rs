use mp3lame_encoder::{Bitrate, Builder, DualPcm, FlushNoGap, Id3Tag, Quality, VbrMode};

pub fn encode_wav_stereo_16bit(left: &[f32], right: &[f32], sample_rate: u32) -> Vec<u8> {
    let n = left.len().min(right.len());
    let data_bytes = (n * 4) as u32;
    let riff_size = 36 + data_bytes;

    let mut out = Vec::with_capacity(44 + data_bytes as usize);
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&riff_size.to_le_bytes());
    out.extend_from_slice(b"WAVE");

    // fmt chunk
    out.extend_from_slice(b"fmt ");
    out.extend_from_slice(&16_u32.to_le_bytes()); // PCM
    out.extend_from_slice(&1_u16.to_le_bytes()); // format = PCM
    out.extend_from_slice(&2_u16.to_le_bytes()); // channels = 2
    out.extend_from_slice(&sample_rate.to_le_bytes());
    out.extend_from_slice(&(sample_rate * 4).to_le_bytes()); // byte rate
    out.extend_from_slice(&4_u16.to_le_bytes()); // block align
    out.extend_from_slice(&16_u16.to_le_bytes()); // bits per sample

    // data chunk
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_bytes.to_le_bytes());

    for i in 0..n {
        let l = (left[i].clamp(-1.0, 1.0) * 32767.0).round() as i16;
        let r = (right[i].clamp(-1.0, 1.0) * 32767.0).round() as i16;
        out.extend_from_slice(&l.to_le_bytes());
        out.extend_from_slice(&r.to_le_bytes());
    }

    out
}

pub fn encode_mp3(
    left: &[f32],
    right: &[f32],
    sample_rate: u32,
    bitrate_kbps: u32,
) -> Result<Vec<u8>, String> {
    let n = left.len().min(right.len());
    if n == 0 {
        return Err("No hay muestras de audio para codificar en MP3.".to_string());
    }

    let brate = match bitrate_kbps {
        128 => Bitrate::Kbps128,
        192 => Bitrate::Kbps192,
        320 => Bitrate::Kbps320,
        other => {
            return Err(format!(
                "Bitrate no soportado ({other} kbps). Usa 128, 192 o 320."
            ))
        }
    };

    let id3 = Id3Tag {
        title: b"VoiceGen Export",
        artist: b"VoiceGen TTS Studio",
        album: &[],
        album_art: &[],
        year: &[],
        comment: b"Generated with VoiceGen",
    };

    let mut encoder = Builder::new()
        .ok_or_else(|| "No se pudo inicializar LAME MP3 encoder.".to_string())?
        .with_num_channels(2)
        .map_err(|e| format!("Error configurando canales LAME: {e}"))?
        .with_sample_rate(sample_rate)
        .map_err(|e| format!("Error configurando sample rate LAME: {e}"))?
        .with_brate(brate)
        .map_err(|e| format!("Error configurando bitrate LAME: {e}"))?
        .with_vbr_mode(VbrMode::Off)
        .map_err(|e| format!("Error configurando CBR LAME: {e}"))?
        .with_quality(Quality::Best)
        .map_err(|e| format!("Error configurando calidad LAME: {e}"))?
        .with_id3_tag(id3)
        .map_err(|e| format!("Error configurando etiquetas ID3: {e:?}"))?
        .build()
        .map_err(|e| format!("Error construyendo LAME encoder: {e}"))?;

    let left_i16: Vec<i16> = left[..n]
        .iter()
        .map(|&s| (s.clamp(-1.0, 1.0) * 32767.0).round() as i16)
        .collect();
    let right_i16: Vec<i16> = right[..n]
        .iter()
        .map(|&s| (s.clamp(-1.0, 1.0) * 32767.0).round() as i16)
        .collect();

    let input = DualPcm {
        left: &left_i16,
        right: &right_i16,
    };

    let mut mp3_out = Vec::new();
    mp3_out.reserve(mp3lame_encoder::max_required_buffer_size(n) + 8192);

    let encoded_size = encoder
        .encode(input, mp3_out.spare_capacity_mut())
        .map_err(|e| format!("Error codificando PCM a MP3: {e}"))?;
    unsafe {
        mp3_out.set_len(mp3_out.len().wrapping_add(encoded_size));
    }

    mp3_out.reserve(8192);
    let flushed_size = encoder
        .flush::<FlushNoGap>(mp3_out.spare_capacity_mut())
        .map_err(|e| format!("Error finalizando stream MP3: {e}"))?;
    unsafe {
        mp3_out.set_len(mp3_out.len().wrapping_add(flushed_size));
    }

    Ok(mp3_out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::PI;

    #[test]
    fn encodes_wav_and_mp3_at_all_cbr_bitrates() {
        let len = 44_100 / 2;
        let samples: Vec<f32> = (0..len)
            .map(|i| (2.0 * PI * 330.0 * i as f32 / 44_100.0).sin() * 0.4)
            .collect();

        let wav = encode_wav_stereo_16bit(&samples, &samples, 44_100);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(wav.len(), 44 + len * 4);

        for br in [128_u32, 192, 320] {
            let mp3 = encode_mp3(&samples, &samples, 44_100, br)
                .unwrap_or_else(|e| panic!("MP3 encoding failed at {br} kbps: {e}"));
            assert!(mp3.len() > 2000, "MP3 too short at {br} kbps");
            assert_eq!(&mp3[0..3], b"ID3", "Expected ID3v2 header in MP3");
        }
    }
}
