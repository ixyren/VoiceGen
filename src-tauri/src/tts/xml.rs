const ALLOWED_SAPI_TAGS: &[&str] = &[
    "silence", "pitch", "rate", "volume", "emph", "spell", "pron", "partofsp", "context",
];

fn escape_xml_text(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            _ => out.push(ch),
        }
    }
    out
}

fn is_allowed_sapi_tag(tag_content: &str) -> bool {
    let trimmed = tag_content.trim();
    if trimmed.is_empty() {
        return false;
    }
    let inner = trimmed.strip_prefix('/').unwrap_or(trimmed).trim_start();
    let name: String = inner
        .chars()
        .take_while(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_ascii_lowercase();

    ALLOWED_SAPI_TAGS.contains(&name.as_str())
}

/// Strips Loquendo-only inline backslash directives (like `\item=Laugh` or `\pause=300`)
/// when targeting non-Loquendo voices so Microsoft voices do not read them literally.
fn strip_loquendo_directives(input: &str) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut out = String::with_capacity(input.len());
    let mut i = 0;

    while i < chars.len() {
        if chars[i] == '\\' {
            let rest: String = chars[i + 1..].iter().take(24).collect();
            let lower = rest.to_ascii_lowercase();
            let prefixes = ["item=", "pause=", "pitch=", "speed=", "volume="];
            if prefixes.iter().any(|p| lower.starts_with(p)) {
                i += 1;
                while i < chars.len() && !chars[i].is_whitespace() && chars[i] != '<' {
                    i += 1;
                }
                if !out.ends_with(' ') {
                    out.push(' ');
                }
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }

    out
}

/// Preserves valid SAPI 5 XML tags while escaping stray `<`, `>`, `&` in prose,
/// stripping Loquendo backslash directives for non-Loquendo engines, and wrapping
/// the payload in `<pitch absmiddle="X">...</pitch>`.
pub fn build_sapi_xml(raw_text: &str, pitch: i32, is_loquendo: bool) -> String {
    let preprocessed = if is_loquendo {
        raw_text.to_string()
    } else {
        strip_loquendo_directives(raw_text)
    };

    let mut body = String::with_capacity(preprocessed.len() + 32);
    let mut cursor = 0;

    while cursor < preprocessed.len() {
        let rest = &preprocessed[cursor..];
        if let Some(lt_rel) = rest.find('<') {
            if lt_rel > 0 {
                body.push_str(&escape_xml_text(&rest[..lt_rel]));
            }
            let after_lt = &rest[lt_rel + 1..];
            if let Some(gt_rel) = after_lt.find('>') {
                let inside = &after_lt[..gt_rel];
                if !inside.contains('<') && is_allowed_sapi_tag(inside) {
                    body.push('<');
                    body.push_str(inside.trim());
                    body.push('>');
                    cursor += lt_rel + 1 + gt_rel + 1;
                    continue;
                }
            }
            body.push_str("&lt;");
            cursor += lt_rel + 1;
        } else {
            body.push_str(&escape_xml_text(rest));
            break;
        }
    }

    let clamped_pitch = pitch.clamp(-10, 10);
    format!(
        r#"<pitch absmiddle="{}">{}</pitch>"#,
        clamped_pitch,
        body.trim()
    )
}

/// Removes XML and Loquendo tags for plain-text previews, snippets, and COM fallback.
pub fn strip_all_tags(raw_text: &str) -> String {
    let no_lq = strip_loquendo_directives(raw_text);
    let mut out = String::with_capacity(no_lq.len());
    let mut in_tag = false;
    for ch in no_lq.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                if !out.ends_with(' ') {
                    out.push(' ');
                }
            }
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_sapi_tags_and_escapes_stray_chars() {
        let input = r#"Hola <silence msec="500"/> 3 < 5 & 8 > 2 <emph>genial</emph> \item=Laugh"#;
        let lq_xml = build_sapi_xml(input, -2, true);
        assert_eq!(
            lq_xml,
            r#"<pitch absmiddle="-2">Hola <silence msec="500"/> 3 &lt; 5 &amp; 8 &gt; 2 <emph>genial</emph> \item=Laugh</pitch>"#
        );

        let ms_xml = build_sapi_xml(input, 4, false);
        assert!(!ms_xml.contains(r"\item=Laugh"));
        assert!(ms_xml.starts_with(r#"<pitch absmiddle="4">"#));
        assert!(ms_xml.contains(r#"<silence msec="500"/>"#));
    }

    #[test]
    fn strips_tags_cleanly_for_snippets() {
        let plain = strip_all_tags(r#"Hola <silence msec="300"/> mundo \item=Throat fin"#);
        assert_eq!(plain, "Hola mundo fin");
    }
}
