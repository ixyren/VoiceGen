# Changelog

Todos los cambios notables en **VoiceGen** se documentan en este archivo siguiendo [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-25

### Added
- **Arquitectura Tauri v2 + Rust + React/TypeScript/Tailwind CSS**: Estudio de escritorio TTS para Windows 11 con barra de título personalizada (`decorations: false`) y estética *Dark Studio Glass* (`#09090B` / `#121216` / `#8B5CF6` / `#06B6D4`).
- **Detección Universal de Voces (`src-tauri/src/tts/scanner.rs`)**: Escaneo del Registro de Windows para voces SAPI 5 de 32 bits (`WOW6432Node`, incluyendo motores Loquendo TTS 7), SAPI 5 de 64 bits y Windows OneCore, con parseo seguro de LCID hexadecimales, metadatos completos y botón de prueba rápida (*Preview*).
- **Bridge COM Persistente 32-bit / 64-bit / OneCore (`src-tauri/src/tts/bridge.rs`)**: Subprocesos PowerShell STA persistentes sin ventana de consola (`SysWOW64` para voces de 32 bits como Loquendo y `System32` para 64-bit/OneCore) renderizando audio PCM en memoria vía `SAPI.SpVoice` + `SAPI.SpMemoryStream` con soporte nativo de XML SAPI (`<pitch absmiddle="X"/>`, `<silence msec="X"/>`, `<emph>`) y expresiones Loquendo (`\item=Laugh`, `\item=Throat`, `\item=Sigh`, etc.).
- **Motor DSP en Rust (`src-tauri/src/audio/dsp.rs`)**: Resampling cúbico Catmull-Rom a 44.1 kHz, ajuste WSOLA para pasos fraccionales de velocidad (`0.5`), Pitch/Formant Shift (`-12` a `+12` semitonos), ecualizador RBJ biquad de 3 bandas (Graves 180 Hz, Medios nasal 1.4 kHz, Agudos 4.5 kHz), modo *Radio / Megáfono* (bandpass), *Eco / Reverb de Cueva* estéreo tipo Schroeder, *Saturación / Micrófono Meme* asimétrica y *Normalización de picos* a `-1 dBFS`.
- **Exportación MP3 Nativa (`src-tauri/src/audio/encoder.rs`)**: Codificación LAME CBR offline (`128`, `192`, `320 kbps`) vía `mp3lame-encoder`, diálogo nativo de carpetas con historial de rutas recientes en Zustand, nombrado automático inteligente y apertura directa en el Explorador de Windows.
- **7 Presets Icónicos de Loquendo + Presets Personalizados**: *El Tío Gilipollas*, *El Anticristo 2007*, *La Vieja Cotilla / Marujita*, *Narrador Creepypasta*, *Ente de Ultratumba*, *Pitufo / Ardilla Acelerada* y *Reportero Loquendo 2009*, más creación, edición, eliminación e importación/exportación JSON.
- **Reproductor Waveform e Interfaz Fluida**: Canvas interactivo con 240 picos de forma de onda, scrubbing arrastrable, bucle, atajo `Espacio` / `Ctrl+Enter`, animaciones *Framer Motion* y scroll con inercia *Lenis*.
- **Instalador Windows NSIS Tematizado**: Assets BMP 24-bit personalizados (`header.bmp`, `sidebar.bmp`), icono multi-resolución (`icon.ico`) y hooks `hooks.nsh` oscuros para Windows 11.
