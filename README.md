# VoiceGen — Estudio TTS para Loquendo, SAPI 5 y OneCore

**VoiceGen** es una aplicación de escritorio moderna para Windows 11 construida con **Rust + Tauri v2 + React + TypeScript + Tailwind CSS + Framer Motion + Lenis**, diseñada como estudio de generación de voz Text-to-Speech (TTS) con soporte universal para voces **SAPI 5 de 32 bits** (como *Loquendo TTS 7*: Jorge, Carmen, Carlos, Diego, Esperanza, etc.), **SAPI 5 de 64 bits** y **Windows OneCore**.

## Características Principales

- **Detección Universal de Voces**: Escaneo directo del Registro de Windows (`WOW6432Node`, SAPI 5 x64 y `Speech_OneCore`) con parseo seguro de códigos de idioma LCID, etiquetas de arquitectura y prueba rápida (*Preview*).
- **Bridge COM Persistente sin Ventanas**: Subprocesos PowerShell STA silenciosos (`CREATE_NO_WINDOW`) en `SysWOW64` (32 bits) y `System32` (64 bits / OneCore) que renderizan WAV en memoria vía `SAPI.SpVoice` + `SAPI.SpMemoryStream` preservando XML SAPI (`<pitch absmiddle="X"/>`, `<silence msec="X"/>`, `<emph>`) y expresiones clásicas de Loquendo (`\item=Laugh`, `\item=Throat`, `\item=Sigh`, etc.).
- **Post-Procesamiento DSP en Rust**:
  - Resampling cúbico Catmull-Rom a `44.1 kHz` estéreo + micro-ajuste temporal WSOLA para pasos fraccionales de velocidad (`0.5`).
  - Pitch / Formant Shift (`-12` a `+12` semitonos) sin alterar duración.
  - Ecualizador RBJ biquad de 3 bandas (*Graves 180 Hz*, *Medios nasal 1.4 kHz*, *Agudos 4.5 kHz*).
  - Toggles de *Radio / Megáfono*, *Eco / Reverb de Cueva* estéreo, *Saturación / Micrófono Meme* y *Normalización de picos* a `-1 dBFS`.
- **7 Presets Icónicos + Presets Personalizados**: *El Tío Gilipollas*, *El Anticristo 2007*, *La Vieja Cotilla*, *Narrador Creepypasta*, *Ente de Ultratumba*, *Pitufo / Ardilla Acelerada* y *Reportero Loquendo 2009*, con guardado en local (Zustand) e importación/exportación JSON.
- **Reproductor Waveform y Exportación MP3 Offline**: Canvas interactivo con scrubbing arrastrable, bucle, atajo `Espacio` / `Ctrl+Enter`, historial de sesión y codificación LAME CBR (`128`, `192`, `320 kbps`) vía `mp3lame-encoder`.

## Comandos de Desarrollo y Compilación

> En Windows con `ExecutionPolicy` restrictiva para scripts `.ps1`, utiliza `npm.cmd` y `npx.cmd`.

```powershell
# Instalar dependencias
npm.cmd install

# Ejecutar en modo desarrollo (Tauri + Vite)
npm.cmd run tauri dev

# Ejecutar tests del backend en Rust
cargo test --manifest-path src-tauri/Cargo.toml

# Verificar tipos TypeScript y build web
npx.cmd tsc --noEmit
npm.cmd run build

# Generar binario de release e instalador NSIS (.exe)
npm.cmd run tauri build
```

## Control de Versiones

Este proyecto sigue estrictamente las reglas definidas en [`VERSIONING_RULES.md`](./VERSIONING_RULES.md) y documenta cada lanzamiento en [`CHANGELOG.md`](./CHANGELOG.md).
