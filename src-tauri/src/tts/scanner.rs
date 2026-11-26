use std::collections::HashSet;
use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_64KEY};
use winreg::RegKey;

use crate::models::{VoiceArch, VoiceInfo};

const KEY_SAPI_64: &str = r"SOFTWARE\Microsoft\Speech\Voices\Tokens";
const KEY_SAPI_32: &str = r"SOFTWARE\WOW6432Node\Microsoft\Speech\Voices\Tokens";
const KEY_ONECORE: &str = r"SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens";

/// Extracts leading ASCII hex digits from a Windows Registry LCID string
/// (Loquendo entries frequently contain trailing garbage bytes like `"40a  \rz"`).
pub fn parse_lcid_to_locale(raw: &str) -> (String, String) {
    let hex_digits: String = raw
        .trim()
        .chars()
        .take_while(|c| c.is_ascii_hexdigit())
        .collect();

    if hex_digits.is_empty() {
        return ("und".to_string(), "Idioma desconocido".to_string());
    }

    let lcid = u32::from_str_radix(&hex_digits, 16).unwrap_or(0);
    let mapped = match lcid {
        0x040A | 0x0C0A => ("es-ES", "Español (España)"),
        0x080A => ("es-MX", "Español (México)"),
        0x100A => ("es-GT", "Español (Guatemala)"),
        0x140A => ("es-CR", "Español (Costa Rica)"),
        0x180A => ("es-PA", "Español (Panamá)"),
        0x1C0A => ("es-DO", "Español (Rep. Dominicana)"),
        0x200A => ("es-VE", "Español (Venezuela)"),
        0x240A => ("es-CO", "Español (Colombia)"),
        0x280A => ("es-PE", "Español (Perú)"),
        0x2C0A => ("es-AR", "Español (Argentina)"),
        0x300A => ("es-EC", "Español (Ecuador)"),
        0x340A => ("es-CL", "Español (Chile)"),
        0x380A => ("es-UY", "Español (Uruguay)"),
        0x3C0A => ("es-PY", "Español (Paraguay)"),
        0x400A => ("es-BO", "Español (Bolivia)"),
        0x440A => ("es-SV", "Español (El Salvador)"),
        0x480A => ("es-HN", "Español (Honduras)"),
        0x4C0A => ("es-NI", "Español (Nicaragua)"),
        0x500A => ("es-PR", "Español (Puerto Rico)"),
        0x540A => ("es-US", "Español (EE. UU.)"),
        0x0409 => ("en-US", "Inglés (EE. UU.)"),
        0x0809 => ("en-GB", "Inglés (Reino Unido)"),
        0x0C09 => ("en-AU", "Inglés (Australia)"),
        0x1009 => ("en-CA", "Inglés (Canadá)"),
        0x040C => ("fr-FR", "Francés (Francia)"),
        0x0C0C => ("fr-CA", "Francés (Canadá)"),
        0x0416 => ("pt-BR", "Portugués (Brasil)"),
        0x0816 => ("pt-PT", "Portugués (Portugal)"),
        0x0403 => ("ca-ES", "Catalán (España)"),
        0x0410 => ("it-IT", "Italiano (Italia)"),
        0x0407 => ("de-DE", "Alemán (Alemania)"),
        0x0411 => ("ja-JP", "Japonés (Japón)"),
        0x0804 => ("zh-CN", "Chino (Simplificado)"),
        0x0419 => ("ru-RU", "Ruso (Rusia)"),
        0x0413 => ("nl-NL", "Neerlandés"),
        0x0415 => ("pl-PL", "Polaco"),
        _ => match lcid & 0x03FF {
            0x0A => ("es", "Español"),
            0x09 => ("en", "Inglés"),
            0x0C => ("fr", "Francés"),
            0x16 => ("pt", "Portugués"),
            0x03 => ("ca", "Catalán"),
            0x10 => ("it", "Italiano"),
            0x07 => ("de", "Alemán"),
            0x11 => ("ja", "Japonés"),
            0x04 => ("zh", "Chino"),
            0x19 => ("ru", "Ruso"),
            _ => ("und", "Otro idioma"),
        },
    };

    (mapped.0.to_string(), mapped.1.to_string())
}

fn normalize_gender(raw: &str) -> String {
    match raw.trim().to_ascii_lowercase().as_str() {
        "male" | "m" | "masculino" => "Male".to_string(),
        "female" | "f" | "femenino" => "Female".to_string(),
        "neutral" => "Neutral".to_string(),
        "" => "Unknown".to_string(),
        other => other.to_string(),
    }
}

fn read_tokens_from_key(
    hklm: &RegKey,
    subkey_path: &str,
    arch: VoiceArch,
    token_id_prefix: &str,
    skip_keys: Option<&HashSet<String>>,
) -> Vec<VoiceInfo> {
    let mut results = Vec::new();
    let Ok(tokens_key) = hklm.open_subkey_with_flags(subkey_path, KEY_READ | KEY_WOW64_64KEY) else {
        return results;
    };

    let arch_tag = match arch {
        VoiceArch::Sapi5x86 => "x86",
        VoiceArch::Sapi5x64 => "x64",
        VoiceArch::OneCore => "onecore",
    };

    for key_name in tokens_key.enum_keys().flatten() {
        if let Some(skip) = skip_keys {
            if skip.contains(&key_name) {
                continue;
            }
        }

        let Ok(voice_key) = tokens_key.open_subkey_with_flags(&key_name, KEY_READ | KEY_WOW64_64KEY) else {
            continue;
        };

        let description: String = voice_key.get_value("").unwrap_or_else(|_| key_name.clone());

        let (attr_name, attr_lang, attr_gender, attr_vendor) =
            if let Ok(attrs) = voice_key.open_subkey_with_flags("Attributes", KEY_READ | KEY_WOW64_64KEY) {
                let n: String = attrs.get_value("Name").unwrap_or_default();
                let l: String = attrs.get_value("Language").unwrap_or_default();
                let g: String = attrs.get_value("Gender").unwrap_or_default();
                let v: String = attrs.get_value("Vendor").unwrap_or_default();
                (n, l, g, v)
            } else {
                (String::new(), String::new(), String::new(), String::new())
            };

        let name = if attr_name.trim().is_empty() {
            if description.trim().is_empty() {
                key_name.clone()
            } else {
                description.trim().to_string()
            }
        } else {
            attr_name.trim().to_string()
        };

        let vendor = if attr_vendor.trim().is_empty() {
            if key_name.starts_with("LQ") {
                "Loquendo".to_string()
            } else if key_name.starts_with("MSTTS_") || key_name.starts_with("TTS_MS_") {
                "Microsoft".to_string()
            } else {
                "SAPI 5".to_string()
            }
        } else {
            attr_vendor.trim().to_string()
        };

        let is_loquendo = vendor.to_ascii_lowercase().contains("loquendo")
            || key_name.to_ascii_uppercase().starts_with("LQ");

        let (language_code, language_label) = parse_lcid_to_locale(&attr_lang);
        let gender = normalize_gender(&attr_gender);
        let token_id = format!(r"{}\{}", token_id_prefix, key_name);
        let id = format!("{}:{}", arch_tag, key_name);

        results.push(VoiceInfo {
            id,
            token_key: key_name,
            token_id,
            name,
            description: description.trim().to_string(),
            language_code,
            language_label,
            gender,
            vendor,
            arch,
            is_loquendo,
        });
    }

    results
}

fn voice_sort_rank(v: &VoiceInfo) -> (u8, u8, String) {
    let is_es = v.language_code.starts_with("es");
    let lower_name = v.name.to_ascii_lowercase();

    let tier = if v.is_loquendo && is_es {
        0
    } else if v.is_loquendo {
        1
    } else if is_es {
        2
    } else {
        3
    };

    let loquendo_order = match lower_name.as_str() {
        "jorge" => 0,
        "carlos" => 1,
        "carmen" => 2,
        "diego" => 3,
        "esperanza" => 4,
        "juan" => 5,
        "francisca" => 6,
        _ => 50,
    };

    (tier, loquendo_order, lower_name)
}

/// Scans Windows Registry for all SAPI 5 (64-bit, 32-bit WOW6432Node) and OneCore voices.
pub fn scan_system_voices() -> Vec<VoiceInfo> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    let sapi64 = read_tokens_from_key(
        &hklm,
        KEY_SAPI_64,
        VoiceArch::Sapi5x64,
        r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices\Tokens",
        None,
    );

    let sapi64_keys: HashSet<String> = sapi64.iter().map(|v| v.token_key.clone()).collect();

    let sapi32 = read_tokens_from_key(
        &hklm,
        KEY_SAPI_32,
        VoiceArch::Sapi5x86,
        r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices\Tokens",
        Some(&sapi64_keys),
    );

    let onecore = read_tokens_from_key(
        &hklm,
        KEY_ONECORE,
        VoiceArch::OneCore,
        r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens",
        None,
    );

    let mut all = Vec::with_capacity(sapi64.len() + sapi32.len() + onecore.len());
    all.extend(sapi32);
    all.extend(sapi64);
    all.extend(onecore);
    all.sort_by_key(voice_sort_rank);
    all
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_dirty_loquendo_lcid_strings() {
        assert_eq!(
            parse_lcid_to_locale("40a  \rz"),
            ("es-ES".to_string(), "Español (España)".to_string())
        );
        assert_eq!(
            parse_lcid_to_locale("240a \rz"),
            ("es-CO".to_string(), "Español (Colombia)".to_string())
        );
        assert_eq!(
            parse_lcid_to_locale("40c à\rz"),
            ("fr-FR".to_string(), "Francés (Francia)".to_string())
        );
        assert_eq!(
            parse_lcid_to_locale("C0A"),
            ("es-ES".to_string(), "Español (España)".to_string())
        );
        assert_eq!(
            parse_lcid_to_locale("409;9"),
            ("en-US".to_string(), "Inglés (EE. UU.)".to_string())
        );
        assert_eq!(
            parse_lcid_to_locale(""),
            ("und".to_string(), "Idioma desconocido".to_string())
        );
    }

    #[test]
    fn scans_windows_voices_across_architectures() {
        let voices = scan_system_voices();
        assert!(
            !voices.is_empty(),
            "Expected at least one Windows TTS voice"
        );
        let has_x64 = voices.iter().any(|v| v.arch == VoiceArch::Sapi5x64);
        let has_onecore = voices.iter().any(|v| v.arch == VoiceArch::OneCore);
        assert!(has_x64 || has_onecore, "Expected 64-bit or OneCore voices");

        for v in &voices {
            if v.is_loquendo {
                assert_ne!(
                    v.language_code, "und",
                    "Loquendo voice {} should have a valid parsed locale",
                    v.name
                );
            }
        }
    }
}
