use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::Mutex;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const PS_X86_EXE: &str = r"C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe";
const PS_X64_EXE: &str = r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe";

const WORKER_SCRIPT: &str = r#"
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$voice = New-Object -ComObject SAPI.SpVoice
$tokenCache = @{}

function Resolve-VoiceToken([string]$tokenId, [bool]$isOneCore) {
    if ($tokenCache.ContainsKey($tokenId)) {
        return $tokenCache[$tokenId]
    }
    if ($isOneCore) {
        $cat = New-Object -ComObject SAPI.SpObjectTokenCategory
        $cat.SetId('HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices', $false)
        $tokens = $cat.EnumerateTokens()
        for ($i = 0; $i -lt $tokens.Count; $i++) {
            $t = $tokens.Item($i)
            $tokenCache[$t.Id] = $t
        }
    } else {
        $tokens = $voice.GetVoices()
        for ($i = 0; $i -lt $tokens.Count; $i++) {
            $t = $tokens.Item($i)
            $tokenCache[$t.Id] = $t
        }
    }
    if ($tokenCache.ContainsKey($tokenId)) {
        return $tokenCache[$tokenId]
    }
    foreach ($k in $tokenCache.Keys) {
        if ($k -ieq $tokenId) { return $tokenCache[$k] }
    }
    return $null
}

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    try {
        $req = $line | ConvertFrom-Json
        if ($req.cmd -eq 'ping') {
            [Console]::Out.WriteLine('{"ok":true}')
            [Console]::Out.Flush()
            continue
        }

        $token = Resolve-VoiceToken ([string]$req.token_id) ([bool]$req.is_onecore)
        if ($null -eq $token) {
            $errObj = @{ ok = $false; error = ("Voz no encontrada en COM: " + $req.token_id) }
            [Console]::Out.WriteLine(($errObj | ConvertTo-Json -Compress))
            [Console]::Out.Flush()
            continue
        }

        $voice.Voice = $token
        $voice.Rate = [int]$req.rate
        $voice.Volume = [int]$req.volume

        $stream = New-Object -ComObject SAPI.SpMemoryStream
        $voice.AudioOutputStream = $stream

        try {
            $null = $voice.Speak([string]$req.xml, 8)
        } catch {
            if (-not [string]::IsNullOrWhiteSpace([string]$req.plain_fallback)) {
                $stream = New-Object -ComObject SAPI.SpMemoryStream
                $voice.AudioOutputStream = $stream
                $null = $voice.Speak([string]$req.plain_fallback, 0)
            } else {
                throw
            }
        }

        $rawBytes = [byte[]]$stream.GetData()
        $fmt = $stream.Format.GetWaveFormatEx()
        $sr = [int]$fmt.SamplesPerSec
        $bits = [int]$fmt.BitsPerSample
        $ch = [int]$fmt.Channels

        $voice.AudioOutputStream = $null
        try { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($stream) } catch {}

        if ($null -eq $rawBytes -or $rawBytes.Length -eq 0) {
            $errObj = @{ ok = $false; error = 'El motor TTS generó un buffer de audio vacío.' }
            [Console]::Out.WriteLine(($errObj | ConvertTo-Json -Compress))
            [Console]::Out.Flush()
            continue
        }

        $resp = @{
            ok = $true
            sample_rate = $sr
            bits_per_sample = $bits
            channels = $ch
            pcm_base64 = [Convert]::ToBase64String($rawBytes)
        }
        [Console]::Out.WriteLine(($resp | ConvertTo-Json -Compress))
        [Console]::Out.Flush()
    } catch {
        $errObj = @{ ok = $false; error = $_.Exception.Message }
        [Console]::Out.WriteLine(($errObj | ConvertTo-Json -Compress))
        [Console]::Out.Flush()
    }
}
"#;

#[derive(Serialize)]
struct WorkerRequest<'a> {
    cmd: &'a str,
    token_id: &'a str,
    is_onecore: bool,
    xml: &'a str,
    plain_fallback: &'a str,
    rate: i32,
    volume: u32,
}

#[derive(Deserialize)]
struct WorkerResponse {
    ok: bool,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    sample_rate: u32,
    #[serde(default)]
    bits_per_sample: u16,
    #[serde(default)]
    channels: u16,
    #[serde(default)]
    pcm_base64: String,
}

pub struct RawPcmBuffer {
    pub data: Vec<u8>,
    pub sample_rate: u32,
    pub bits_per_sample: u16,
    pub channels: u16,
}

struct PsWorker {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl PsWorker {
    fn spawn(exe_path: &str) -> Result<Self, String> {
        let utf16: Vec<u8> = WORKER_SCRIPT
            .encode_utf16()
            .flat_map(|u| u.to_le_bytes())
            .collect();
        let encoded_script = BASE64.encode(utf16);

        let mut cmd = Command::new(exe_path);
        cmd.args([
            "-NoProfile",
            "-NonInteractive",
            "-STA",
            "-ExecutionPolicy",
            "Bypass",
            "-EncodedCommand",
            &encoded_script,
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("No se pudo iniciar worker PowerShell ({exe_path}): {e}"))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "No se pudo abrir stdin del worker TTS".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "No se pudo abrir stdout del worker TTS".to_string())?;

        Ok(Self {
            child,
            stdin,
            stdout: BufReader::new(stdout),
        })
    }

    fn execute(&mut self, json_line: &str) -> Result<WorkerResponse, String> {
        self.stdin
            .write_all(json_line.as_bytes())
            .and_then(|_| self.stdin.write_all(b"\n"))
            .and_then(|_| self.stdin.flush())
            .map_err(|e| format!("Error escribiendo al worker TTS: {e}"))?;

        let mut line = String::new();
        let bytes = self
            .stdout
            .read_line(&mut line)
            .map_err(|e| format!("Error leyendo respuesta del worker TTS: {e}"))?;

        if bytes == 0 {
            return Err("El worker TTS cerró la tubería inesperadamente".to_string());
        }

        let trimmed = line.trim().trim_start_matches('\u{feff}');
        serde_json::from_str::<WorkerResponse>(trimmed)
            .map_err(|e| format!("Respuesta inválida del worker TTS ({e}): {trimmed}"))
    }

    fn terminate(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Drop for PsWorker {
    fn drop(&mut self) {
        self.terminate();
    }
}

pub struct TtsBridgeState {
    worker_x86: Mutex<Option<PsWorker>>,
    worker_x64: Mutex<Option<PsWorker>>,
}

impl Default for TtsBridgeState {
    fn default() -> Self {
        Self {
            worker_x86: Mutex::new(None),
            worker_x64: Mutex::new(None),
        }
    }
}

impl TtsBridgeState {
    pub fn synthesize(
        &self,
        use_32bit: bool,
        is_onecore: bool,
        token_id: &str,
        xml: &str,
        plain_fallback: &str,
        rate: i32,
        volume: u32,
    ) -> Result<RawPcmBuffer, String> {
        let payload = WorkerRequest {
            cmd: "speak",
            token_id,
            is_onecore,
            xml,
            plain_fallback,
            rate: rate.clamp(-10, 10),
            volume: volume.clamp(0, 100),
        };
        let json_line = serde_json::to_string(&payload)
            .map_err(|e| format!("Error serializando petición TTS: {e}"))?;

        let (slot, exe) = if use_32bit {
            (&self.worker_x86, PS_X86_EXE)
        } else {
            (&self.worker_x64, PS_X64_EXE)
        };

        let mut guard = slot
            .lock()
            .map_err(|_| "Lock envenenado en worker TTS".to_string())?;

        // Try active worker, respawn once on broken pipe
        let resp = {
            if guard.is_none() {
                *guard = Some(PsWorker::spawn(exe)?);
            }
            match guard.as_mut().unwrap().execute(&json_line) {
                Ok(r) => r,
                Err(_) => {
                    *guard = None;
                    *guard = Some(PsWorker::spawn(exe)?);
                    guard.as_mut().unwrap().execute(&json_line)?
                }
            }
        };

        if !resp.ok {
            return Err(resp
                .error
                .unwrap_or_else(|| "Error desconocido en motor SAPI".to_string()));
        }

        let pcm = BASE64
            .decode(resp.pcm_base64.trim())
            .map_err(|e| format!("Error decodificando PCM base64: {e}"))?;

        Ok(RawPcmBuffer {
            data: pcm,
            sample_rate: resp.sample_rate.max(8000),
            bits_per_sample: if resp.bits_per_sample == 8 { 8 } else { 16 },
            channels: resp.channels.max(1),
        })
    }

    pub fn shutdown_all(&self) {
        if let Ok(mut g) = self.worker_x86.lock() {
            if let Some(mut w) = g.take() {
                w.terminate();
            }
        }
        if let Ok(mut g) = self.worker_x64.lock() {
            if let Some(mut w) = g.take() {
                w.terminate();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::VoiceArch;
    use crate::tts::scanner::scan_system_voices;

    #[test]
    fn synthesizes_32bit_loquendo_and_onecore_live() {
        let voices = scan_system_voices();
        let bridge = TtsBridgeState::default();

        if let Some(lq) = voices.iter().find(|v| v.is_loquendo) {
            let pcm = bridge
                .synthesize(
                    lq.arch == VoiceArch::Sapi5x86,
                    lq.arch == VoiceArch::OneCore,
                    &lq.token_id,
                    r#"<pitch absmiddle="-2">Hola mundo desde VoiceGen.</pitch>"#,
                    "Hola mundo desde VoiceGen.",
                    1,
                    100,
                )
                .expect("Loquendo 32-bit synthesis should succeed");
            assert!(pcm.data.len() > 4000, "Expected non-empty Loquendo PCM");
        }

        if let Some(oc) = voices.iter().find(|v| v.arch == VoiceArch::OneCore) {
            let pcm = bridge
                .synthesize(
                    false,
                    true,
                    &oc.token_id,
                    r#"<pitch absmiddle="0">Prueba OneCore.</pitch>"#,
                    "Prueba OneCore.",
                    0,
                    100,
                )
                .expect("OneCore synthesis should succeed");
            assert!(pcm.data.len() > 4000, "Expected non-empty OneCore PCM");
        }

        bridge.shutdown_all();
    }
}
