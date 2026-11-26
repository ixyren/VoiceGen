use std::f32::consts::PI;

use crate::models::DspParams;
use crate::tts::bridge::RawPcmBuffer;

pub const TARGET_SAMPLE_RATE: u32 = 44_100;
pub const WAVEFORM_BUCKETS: usize = 240;

#[derive(Clone, Copy)]
struct Biquad {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    z1: f32,
    z2: f32,
}

impl Biquad {
    fn new(b0: f32, b1: f32, b2: f32, a0: f32, a1: f32, a2: f32) -> Self {
        let inv = 1.0 / a0;
        Self {
            b0: b0 * inv,
            b1: b1 * inv,
            b2: b2 * inv,
            a1: a1 * inv,
            a2: a2 * inv,
            z1: 0.0,
            z2: 0.0,
        }
    }

    fn low_pass(sr: f32, freq: f32, q: f32) -> Self {
        let w0 = 2.0 * PI * freq / sr;
        let cos_w0 = w0.cos();
        let alpha = w0.sin() / (2.0 * q);
        let b1 = 1.0 - cos_w0;
        let b0 = b1 * 0.5;
        let b2 = b0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;
        Self::new(b0, b1, b2, a0, a1, a2)
    }

    fn high_pass(sr: f32, freq: f32, q: f32) -> Self {
        let w0 = 2.0 * PI * freq / sr;
        let cos_w0 = w0.cos();
        let alpha = w0.sin() / (2.0 * q);
        let b0 = (1.0 + cos_w0) * 0.5;
        let b1 = -(1.0 + cos_w0);
        let b2 = b0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;
        Self::new(b0, b1, b2, a0, a1, a2)
    }

    fn peaking(sr: f32, freq: f32, q: f32, gain_db: f32) -> Self {
        let a = 10.0_f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * freq / sr;
        let cos_w0 = w0.cos();
        let alpha = w0.sin() / (2.0 * q);
        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w0;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha / a;
        Self::new(b0, b1, b2, a0, a1, a2)
    }

    fn low_shelf(sr: f32, freq: f32, gain_db: f32) -> Self {
        let a = 10.0_f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * freq / sr;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 * 0.5 * ((a + 1.0 / a) * (1.0 / 0.707 - 1.0) + 2.0).max(0.001).sqrt();
        let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;

        let b0 = a * ((a + 1.0) - (a - 1.0) * cos_w0 + two_sqrt_a_alpha);
        let b1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * cos_w0);
        let b2 = a * ((a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha);
        let a0 = (a + 1.0) + (a - 1.0) * cos_w0 + two_sqrt_a_alpha;
        let a1 = -2.0 * ((a - 1.0) + (a + 1.0) * cos_w0);
        let a2 = (a + 1.0) + (a - 1.0) * cos_w0 - two_sqrt_a_alpha;
        Self::new(b0, b1, b2, a0, a1, a2)
    }

    fn high_shelf(sr: f32, freq: f32, gain_db: f32) -> Self {
        let a = 10.0_f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * freq / sr;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 * 0.5 * ((a + 1.0 / a) * (1.0 / 0.707 - 1.0) + 2.0).max(0.001).sqrt();
        let two_sqrt_a_alpha = 2.0 * a.sqrt() * alpha;

        let b0 = a * ((a + 1.0) + (a - 1.0) * cos_w0 + two_sqrt_a_alpha);
        let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cos_w0);
        let b2 = a * ((a + 1.0) + (a - 1.0) * cos_w0 - two_sqrt_a_alpha);
        let a0 = (a + 1.0) - (a - 1.0) * cos_w0 + two_sqrt_a_alpha;
        let a1 = 2.0 * ((a - 1.0) - (a + 1.0) * cos_w0);
        let a2 = (a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha;
        Self::new(b0, b1, b2, a0, a1, a2)
    }

    #[inline]
    fn process_sample(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.z1;
        self.z1 = self.b1 * x - self.a1 * y + self.z2;
        self.z2 = self.b2 * x - self.a2 * y;
        y
    }

    fn process_in_place(&mut self, buf: &mut [f32]) {
        for s in buf.iter_mut() {
            *s = self.process_sample(*s);
        }
    }
}

pub fn pcm_bytes_to_mono_f32(raw: &RawPcmBuffer) -> Vec<f32> {
    let ch = raw.channels.max(1) as usize;
    if raw.bits_per_sample == 8 {
        let frames = raw.data.len() / ch;
        let mut out = Vec::with_capacity(frames);
        for f in 0..frames {
            let mut sum = 0.0_f32;
            for c in 0..ch {
                let sample = (raw.data[f * ch + c] as f32 - 128.0) / 128.0;
                sum += sample;
            }
            out.push(sum / ch as f32);
        }
        return out;
    }

    let bytes_per_frame = ch * 2;
    let frames = raw.data.len() / bytes_per_frame;
    let mut out = Vec::with_capacity(frames);
    for f in 0..frames {
        let mut sum = 0.0_f32;
        for c in 0..ch {
            let idx = (f * ch + c) * 2;
            let sample = i16::from_le_bytes([raw.data[idx], raw.data[idx + 1]]) as f32 / 32768.0;
            sum += sample;
        }
        out.push(sum / ch as f32);
    }
    out
}

fn catmull_rom_resample_to_len(input: &[f32], out_len: usize) -> Vec<f32> {
    if input.is_empty() || out_len == 0 {
        return Vec::new();
    }
    if input.len() == out_len {
        return input.to_vec();
    }
    if input.len() == 1 {
        return vec![input[0]; out_len];
    }

    let last = (input.len() - 1) as isize;
    let mut out = Vec::with_capacity(out_len);
    let scale = (input.len() - 1) as f64 / (out_len.saturating_sub(1).max(1)) as f64;

    for i in 0..out_len {
        let pos = i as f64 * scale;
        let idx = pos.floor() as isize;
        let t = (pos - idx as f64) as f32;
        let t2 = t * t;
        let t3 = t2 * t;

        let p0 = input[(idx - 1).clamp(0, last) as usize];
        let p1 = input[idx.clamp(0, last) as usize];
        let p2 = input[(idx + 1).clamp(0, last) as usize];
        let p3 = input[(idx + 2).clamp(0, last) as usize];

        let val = 0.5
            * ((2.0 * p1)
                + (-p0 + p2) * t
                + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
                + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3);
        out.push(val.clamp(-1.5, 1.5));
    }

    out
}

pub fn resample_to_target(input: &[f32], src_rate: u32, dst_rate: u32) -> Vec<f32> {
    if input.is_empty() || src_rate == dst_rate {
        return input.to_vec();
    }
    let out_len = ((input.len() as f64) * (dst_rate as f64) / (src_rate as f64))
        .round()
        .max(1.0) as usize;
    let mut resampled = catmull_rom_resample_to_len(input, out_len);
    if src_rate < dst_rate {
        let cutoff = (src_rate as f32 * 0.45).min(16_000.0);
        let mut lpf = Biquad::low_pass(dst_rate as f32, cutoff, 0.707);
        lpf.process_in_place(&mut resampled);
    }
    resampled
}

/// WSOLA time-stretch. `speed_ratio > 1.0` makes audio faster (shorter), `< 1.0` slower (longer).
pub fn wsola_time_stretch(input: &[f32], sample_rate: u32, speed_ratio: f32) -> Vec<f32> {
    if input.len() < 2048 || (speed_ratio - 1.0).abs() < 0.004 {
        return input.to_vec();
    }

    let ratio = speed_ratio.clamp(0.35, 2.8);
    let win_size = (((sample_rate as f32 * 0.024) as usize) / 2) * 2;
    let win_size = win_size.clamp(512, 2048);
    let hs = win_size / 2;
    let max_shift = ((sample_rate as f32 * 0.006) as isize).clamp(32, 320);

    let hann: Vec<f32> = (0..win_size)
        .map(|i| 0.5 * (1.0 - (2.0 * PI * i as f32 / (win_size as f32)).cos()))
        .collect();

    let expected_len = ((input.len() as f32) / ratio).round().max(win_size as f32) as usize;
    let mut out = vec![0.0_f32; expected_len + win_size];

    // Copy initial grain
    let first_len = win_size.min(input.len());
    for i in 0..first_len {
        out[i] = input[i] * hann[i];
    }

    let mut out_pos = hs;
    let mut prev_in_pos: usize = 0;

    while out_pos < expected_len {
        let nominal_in = ((out_pos as f64) * (ratio as f64)).round() as isize;
        if nominal_in + (win_size as isize) >= input.len() as isize {
            break;
        }

        // Natural continuation target is immediately after previous grain's first half
        let target_start = prev_in_pos + hs;
        let cmp_len = hs.min(input.len().saturating_sub(target_start));

        let mut best_in = nominal_in.max(0) as usize;
        if cmp_len > 16 {
            let mut best_corr = f32::NEG_INFINITY;
            let search_lo = (nominal_in - max_shift).max(0);
            let search_hi =
                (nominal_in + max_shift).min((input.len() - win_size) as isize);

            for cand in (search_lo..=search_hi).step_by(2) {
                let c_idx = cand as usize;
                let mut dot = 0.0_f32;
                let mut norm = 1e-6_f32;
                for k in (0..cmp_len).step_by(2) {
                    let a = input[target_start + k];
                    let b = input[c_idx + k];
                    dot += a * b;
                    norm += b * b;
                }
                let score = dot / norm.sqrt();
                if score > best_corr {
                    best_corr = score;
                    best_in = c_idx;
                }
            }
        }

        for i in 0..win_size {
            if best_in + i < input.len() && out_pos + i < out.len() {
                out[out_pos + i] += input[best_in + i] * hann[i];
            }
        }

        prev_in_pos = best_in;
        out_pos += hs;
    }

    out.truncate(expected_len);
    out
}

pub fn shift_pitch_semitones(input: &[f32], sample_rate: u32, semitones: f32) -> Vec<f32> {
    if input.len() < 512 || semitones.abs() < 0.05 {
        return input.to_vec();
    }
    let pitch_factor = 2.0_f32.powf(semitones.clamp(-12.0, 12.0) / 12.0);
    // Stretch time inversely by pitch_factor, then resample back to original length
    let stretched = wsola_time_stretch(input, sample_rate, 1.0 / pitch_factor);
    catmull_rom_resample_to_len(&stretched, input.len())
}

struct CombFilter {
    buf: Vec<f32>,
    idx: usize,
    feedback: f32,
    damp1: f32,
    damp2: f32,
    filter_store: f32,
}

impl CombFilter {
    fn new(size: usize, feedback: f32, damp: f32) -> Self {
        Self {
            buf: vec![0.0; size.max(8)],
            idx: 0,
            feedback,
            damp1: damp,
            damp2: 1.0 - damp,
            filter_store: 0.0,
        }
    }

    #[inline]
    fn process(&mut self, input: f32) -> f32 {
        let output = self.buf[self.idx];
        self.filter_store = output * self.damp2 + self.filter_store * self.damp1;
        self.buf[self.idx] = input + self.filter_store * self.feedback;
        self.idx += 1;
        if self.idx >= self.buf.len() {
            self.idx = 0;
        }
        output
    }
}

struct AllPassFilter {
    buf: Vec<f32>,
    idx: usize,
    feedback: f32,
}

impl AllPassFilter {
    fn new(size: usize, feedback: f32) -> Self {
        Self {
            buf: vec![0.0; size.max(8)],
            idx: 0,
            feedback,
        }
    }

    #[inline]
    fn process(&mut self, input: f32) -> f32 {
        let buf_out = self.buf[self.idx];
        let output = -input + buf_out;
        self.buf[self.idx] = input + buf_out * self.feedback;
        self.idx += 1;
        if self.idx >= self.buf.len() {
            self.idx = 0;
        }
        output
    }
}

fn apply_cave_reverb(mono: &[f32], sample_rate: u32, depth: f32) -> (Vec<f32>, Vec<f32>) {
    let d = depth.clamp(0.0, 1.0);
    let tail_samples = ((0.70 + d * 0.90) * sample_rate as f32) as usize;
    let total_len = mono.len() + tail_samples;

    let feedback = 0.74 + d * 0.17;
    let damp = 0.30;

    let mut combs_l = [
        CombFilter::new(1557, feedback, damp),
        CombFilter::new(1617, feedback, damp),
        CombFilter::new(1491, feedback, damp),
        CombFilter::new(1422, feedback, damp),
    ];
    let mut combs_r = [
        CombFilter::new(1580, feedback, damp),
        CombFilter::new(1640, feedback, damp),
        CombFilter::new(1514, feedback, damp),
        CombFilter::new(1445, feedback, damp),
    ];

    let mut allpass_l = [
        AllPassFilter::new(556, 0.5),
        AllPassFilter::new(441, 0.5),
    ];
    let mut allpass_r = [
        AllPassFilter::new(579, 0.5),
        AllPassFilter::new(464, 0.5),
    ];

    let slap_l = (sample_rate as f32 * 0.135) as usize;
    let slap_r = (sample_rate as f32 * 0.148) as usize;

    let mut left = Vec::with_capacity(total_len);
    let mut right = Vec::with_capacity(total_len);

    let dry_gain = 1.0 - d * 0.22;
    let wet_gain = 0.16 + d * 0.44;
    let slap_gain = 0.22 * d;

    for i in 0..total_len {
        let dry = if i < mono.len() { mono[i] } else { 0.0 };
        let echo_l = if i >= slap_l && i - slap_l < mono.len() {
            mono[i - slap_l] * slap_gain
        } else {
            0.0
        };
        let echo_r = if i >= slap_r && i - slap_r < mono.len() {
            mono[i - slap_r] * slap_gain
        } else {
            0.0
        };

        let rev_in = (dry + (echo_l + echo_r) * 0.5) * 0.28;

        let mut wet_l = 0.0_f32;
        let mut wet_r = 0.0_f32;
        for c in combs_l.iter_mut() {
            wet_l += c.process(rev_in);
        }
        for c in combs_r.iter_mut() {
            wet_r += c.process(rev_in);
        }

        for ap in allpass_l.iter_mut() {
            wet_l = ap.process(wet_l);
        }
        for ap in allpass_r.iter_mut() {
            wet_r = ap.process(wet_r);
        }

        left.push(dry * dry_gain + echo_l + wet_l * wet_gain);
        right.push(dry * dry_gain + echo_r + wet_r * wet_gain);
    }

    (left, right)
}

pub fn process_audio(
    raw: &RawPcmBuffer,
    fractional_rate_offset: f32,
    dsp: &DspParams,
) -> (Vec<f32>, Vec<f32>) {
    let mono_src = pcm_bytes_to_mono_f32(raw);
    let mut mono = resample_to_target(&mono_src, raw.sample_rate, TARGET_SAMPLE_RATE);

    if mono.is_empty() {
        return (vec![0.0; 1024], vec![0.0; 1024]);
    }

    // 1. Fractional speed micro-adjustment (supports 0.5 steps smoothly on integer SAPI rate)
    if fractional_rate_offset.abs() > 0.02 {
        let frac_speed = 1.116_f32.powf(fractional_rate_offset.clamp(-0.6, 0.6));
        mono = wsola_time_stretch(&mono, TARGET_SAMPLE_RATE, frac_speed);
    }

    // 2. Pitch / Formant shift
    if dsp.pitch_semitones.abs() >= 0.05 {
        mono = shift_pitch_semitones(&mono, TARGET_SAMPLE_RATE, dsp.pitch_semitones);
    }

    let sr = TARGET_SAMPLE_RATE as f32;

    // 3. 3-Band EQ (Low 180 Hz, Nasal Mid 1.4 kHz, High 4.5 kHz)
    if dsp.eq_low_db.abs() >= 0.05 {
        let mut low = Biquad::low_shelf(sr, 180.0, dsp.eq_low_db.clamp(-12.0, 12.0));
        low.process_in_place(&mut mono);
    }
    if dsp.eq_mid_db.abs() >= 0.05 {
        let mut mid = Biquad::peaking(sr, 1400.0, 1.1, dsp.eq_mid_db.clamp(-12.0, 12.0));
        mid.process_in_place(&mut mono);
    }
    if dsp.eq_high_db.abs() >= 0.05 {
        let mut high = Biquad::high_shelf(sr, 4500.0, dsp.eq_high_db.clamp(-12.0, 12.0));
        high.process_in_place(&mut mono);
    }

    // 4. Radio / Megaphone Bandpass
    if dsp.radio_enabled {
        let mut hpf1 = Biquad::high_pass(sr, 420.0, 0.707);
        let mut hpf2 = Biquad::high_pass(sr, 420.0, 0.707);
        let mut lpf1 = Biquad::low_pass(sr, 3100.0, 0.707);
        let mut lpf2 = Biquad::low_pass(sr, 3100.0, 0.707);
        let mut horn = Biquad::peaking(sr, 1800.0, 1.2, 4.5);
        hpf1.process_in_place(&mut mono);
        hpf2.process_in_place(&mut mono);
        lpf1.process_in_place(&mut mono);
        lpf2.process_in_place(&mut mono);
        horn.process_in_place(&mut mono);
        for s in mono.iter_mut() {
            *s = (*s * 1.45).tanh() * 0.85;
        }
    }

    // 5. Saturation / Meme Mic Overdrive
    if dsp.distortion_enabled {
        let drive = dsp.distortion_drive.clamp(0.0, 1.0);
        let mut pre = Biquad::peaking(sr, 2200.0, 0.9, 4.0);
        pre.process_in_place(&mut mono);

        let gain = 2.2 + drive * 9.5;
        for s in mono.iter_mut() {
            let driven = *s * gain;
            let asym = driven + 0.08 * driven * driven;
            *s = asym.tanh().clamp(-0.88, 0.88) * 0.78;
        }
        let mut dc_block = Biquad::high_pass(sr, 60.0, 0.707);
        dc_block.process_in_place(&mut mono);
    }

    // 6. Stereo Cave Reverb / Echo
    let (mut left, mut right) = if dsp.reverb_enabled {
        apply_cave_reverb(&mono, TARGET_SAMPLE_RATE, dsp.reverb_depth)
    } else {
        (mono.clone(), mono)
    };

    // 7. Peak Normalization to -1 dBFS (~0.89125) + Soft Ceiling Safety Limiter
    let peak = left
        .iter()
        .chain(right.iter())
        .fold(0.0_f32, |acc, &s| acc.max(s.abs()));

    if dsp.normalize_enabled && peak > 1e-5 {
        let target = 10.0_f32.powf(-1.0 / 20.0); // ~0.89125
        let gain = (target / peak).min(16.0);
        for s in left.iter_mut() {
            *s *= gain;
        }
        for s in right.iter_mut() {
            *s *= gain;
        }
    }

    let soft_limit = |x: f32| -> f32 {
        let ax = x.abs();
        if ax <= 0.92 {
            x
        } else {
            let excess = ax - 0.92;
            let limited = 0.92 + 0.07 * (excess / 0.07).tanh();
            limited.copysign(x).clamp(-0.995, 0.995)
        }
    };

    for s in left.iter_mut() {
        *s = if s.is_finite() { soft_limit(*s) } else { 0.0 };
    }
    for s in right.iter_mut() {
        *s = if s.is_finite() { soft_limit(*s) } else { 0.0 };
    }

    (left, right)
}

pub fn compute_waveform_peaks(left: &[f32], right: &[f32], buckets: usize) -> Vec<f32> {
    let n = left.len().min(right.len());
    if n == 0 || buckets == 0 {
        return vec![0.0; buckets];
    }

    let mut raw_peaks = Vec::with_capacity(buckets);
    for b in 0..buckets {
        let start = (b * n) / buckets;
        let end = (((b + 1) * n) / buckets).max(start + 1).min(n);
        let mut max_v = 0.0_f32;
        let mut sum_sq = 0.0_f32;
        for i in start..end {
            let m = 0.5 * (left[i].abs() + right[i].abs());
            if m > max_v {
                max_v = m;
            }
            sum_sq += m * m;
        }
        let rms = (sum_sq / (end - start) as f32).sqrt();
        raw_peaks.push(max_v * 0.65 + rms * 0.35);
    }

    let max_bucket = raw_peaks.iter().fold(0.0_f32, |a, &b| a.max(b));
    if max_bucket > 1e-4 {
        let scale = 0.96 / max_bucket;
        for p in raw_peaks.iter_mut() {
            *p = (*p * scale).clamp(0.03, 1.0);
        }
    }

    raw_peaks
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_sine_raw(freq: f32, sample_rate: u32, secs: f32) -> RawPcmBuffer {
        let len = (sample_rate as f32 * secs) as usize;
        let mut bytes = Vec::with_capacity(len * 2);
        for i in 0..len {
            let t = i as f32 / sample_rate as f32;
            let val = (2.0 * PI * freq * t).sin() * 0.5;
            let sample = (val * 32767.0) as i16;
            bytes.extend_from_slice(&sample.to_le_bytes());
        }
        RawPcmBuffer {
            data: bytes,
            sample_rate,
            bits_per_sample: 16,
            channels: 1,
        }
    }

    #[test]
    fn dsp_pitch_shift_preserves_duration_and_normalizes() {
        let raw = make_sine_raw(220.0, 22_050, 0.8);
        let mut dsp = DspParams::default();
        dsp.pitch_semitones = 5.0;
        dsp.eq_mid_db = 4.0;
        dsp.normalize_enabled = true;

        let (l, r) = process_audio(&raw, 0.0, &dsp);
        assert_eq!(l.len(), r.len());
        let expected = (TARGET_SAMPLE_RATE as f32 * 0.8) as usize;
        let diff = (l.len() as isize - expected as isize).abs();
        assert!(
            diff < 200,
            "Pitch-shifted duration should match target ({} vs {})",
            l.len(),
            expected
        );

        let peak = l.iter().fold(0.0_f32, |a, &b| a.max(b.abs()));
        assert!(peak > 0.85 && peak <= 0.92, "Unexpected peak: {}", peak);
        assert!(l.iter().all(|s| s.is_finite()));
    }

    #[test]
    fn dsp_reverb_appends_decay_tail_and_radio_distortion_stay_finite() {
        let raw = make_sine_raw(440.0, 22_050, 0.4);
        let mut dsp = DspParams::default();
        dsp.radio_enabled = true;
        dsp.distortion_enabled = true;
        dsp.distortion_drive = 0.8;
        dsp.reverb_enabled = true;
        dsp.reverb_depth = 0.7;

        let (l, r) = process_audio(&raw, 0.5, &dsp);
        let dry_len = (TARGET_SAMPLE_RATE as f32 * 0.4) as usize;
        assert!(
            l.len() > dry_len + 10_000,
            "Reverb should append decay tail"
        );
        assert_eq!(l.len(), r.len());
        assert!(l.iter().chain(r.iter()).all(|s| s.is_finite() && s.abs() <= 0.995));
    }
}
