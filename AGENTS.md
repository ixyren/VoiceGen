# AGENTS.md — VoiceGen Project Rules

## Permanent Versioning & Release Rule (CRITICAL)
Before finishing ANY task that modifies code, styling, configuration, or assets in this repository, you MUST automatically follow `VERSIONING_RULES.md`:

1. Bump the version using **Semantic Versioning**:
   - `PATCH` (`0.1.x`) for fixes, visual/UI tweaks, or refactoring.
   - `MINOR` (`0.x.0`) for new features or capabilities.
2. Synchronize the exact new version string across ALL THREE files:
   - `package.json` (`"version"`)
   - `src-tauri/Cargo.toml` (`version`)
   - `src-tauri/tauri.conf.json` (`"version"`)
3. Prepend a dated technical entry in `CHANGELOG.md` (`## [X.Y.Z] - YYYY-MM-DD`).
4. Verify tests (`cargo test --manifest-path src-tauri/Cargo.toml`, `npx.cmd tsc --noEmit`, `npm.cmd run build`).
5. Commit, tag, and push automatically:
   - `git add .`
   - `git commit -m "chore(release): vX.Y.Z - <resumen>"`
   - `git tag vX.Y.Z`
   - `git push origin main --tags`

## Windows Environment Notes
- PowerShell ExecutionPolicy blocks bare `npm` and `npx` (`npm.ps1`). Always invoke `npm.cmd` and `npx.cmd` in scripts, terminal commands, and `src-tauri/tauri.conf.json`.
- Loquendo 32-bit SAPI 5 voices live in `HKLM\SOFTWARE\WOW6432Node\Microsoft\Speech\Voices\Tokens` and their `Attributes\Language` registry strings can contain trailing garbage bytes; only parse leading ASCII hex digits.
- Synthesize 32-bit COM voices via `C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe` (`CREATE_NO_WINDOW`) and OneCore / 64-bit SAPI voices via 64-bit PowerShell `SAPI.SpVoice` + `SAPI.SpMemoryStream`.
