; VoiceGen Dark Studio Glass NSIS Installer Theme & Hooks

!define MUI_FORCECLASSICCONTROLS
!define MUI_BGCOLOR "09090B"
!define MUI_TEXTCOLOR "FFFFFF"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_INSTFILESPAGE_COLORS "22D3EE 09090B"
!define MUI_CUSTOMFUNCTION_GUIINIT VoiceGenDarkGuiInit
!define MUI_CUSTOMFUNCTION_UNGUIINIT un.VoiceGenDarkGuiInit

Function VoiceGenDarkGuiInit
  ; Activa la barra de título oscura nativa de Windows 11 desde el inicio del instalador
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 20, *i 1, i 4)'
FunctionEnd

Function un.VoiceGenDarkGuiInit
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 20, *i 1, i 4)'
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 20, *i 1, i 4)'
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Garantiza acceso directo en el escritorio apuntando a voicegen.exe
  CreateShortCut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\${PRODUCTNAME}.lnk"
!macroend
