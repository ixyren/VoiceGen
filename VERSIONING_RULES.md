# VoiceGen — Reglas Permanentes de Versionado y Publicación

Este repositorio sigue **Semantic Versioning (`MAJOR.MINOR.PATCH`)** de forma estricta y obligatoria en cada cambio realizado sobre el proyecto.

## Regla de Incremento Automático

Cada vez que se implemente una corrección, ajuste visual, mejora de rendimiento o nueva funcionalidad:

1. **Determinar el incremento SemVer:**
   - **`PATCH` (`0.1.x`)**: Correcciones de bugs, ajustes visuales, mejoras de estilo/UI o refactorizaciones sin nueva funcionalidad.
   - **`MINOR` (`0.x.0`)**: Nuevas características, nuevos efectos DSP, nuevos presets integrados o nuevas capacidades del backend/frontend.
   - **`MAJOR` (`x.0.0`)**: Cambios arquitectónicos mayores o incompatibles.

2. **Sincronizar la versión en los tres manifiestos del proyecto:**
   - `package.json` → campo `"version"`
   - `src-tauri/Cargo.toml` → campo `version` bajo `[package]`
   - `src-tauri/tauri.conf.json` → campo `"version"`

3. **Documentar en `CHANGELOG.md`:**
   - Agregar una entrada bajo `## [X.Y.Z] - YYYY-MM-DD` con el detalle técnico preciso de los cambios realizados.

4. **Commit, Tag y Push automático a GitHub:**
   ```bash
   git add .
   git commit -m "chore(release): vX.Y.Z - <resumen conciso del cambio>"
   git tag vX.Y.Z
   git push origin main --tags
   ```

> **Nota para agentes IA:** Esta regla es permanente. No esperes a que el usuario la recuerde en turnos futuros; ejecútala automáticamente tras verificar que los tests y builds pasan.
