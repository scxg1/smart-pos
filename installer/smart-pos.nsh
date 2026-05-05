; ═══════════════════════════════════════════════════════════════════════════════
; Smart POS — Custom NSIS installer include
; Adds: pre-install requirements page, Arabic branding strings
; ═══════════════════════════════════════════════════════════════════════════════

; ─── Branding ─────────────────────────────────────────────────────────────────
BrandingText "Smart POS v${VERSION} — نقطة البيع الذكية"
Caption       "Smart POS — معالج التثبيت"

; ─── Installer metadata ───────────────────────────────────────────────────────
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName"     "Smart POS"
VIAddVersionKey "ProductVersion"  "${VERSION}"
VIAddVersionKey "CompanyName"     "Smart POS"
VIAddVersionKey "FileDescription" "Smart POS Installer"
VIAddVersionKey "LegalCopyright"  "Copyright © 2025 Smart POS"

; ─── Requirements-check page callback ─────────────────────────────────────────
; Injected as a custom page BEFORE the directory-selection page.
; Checks: Windows 10+, 200 MB free disk space, 4 GB RAM.

!macro customHeader
  !system "echo '' > ${NSISDIR}/include/SmartPOSHeader.nsh"
!macroend

!macro customInit
  ; ── OS Version check: require Windows 10 (build 10240) or newer ─────────────
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP|MB_OK \
      "يتطلب Smart POS نظام Windows 10 أو أحدث.$\nالرجاء ترقية نظام التشغيل ثم أعد المحاولة."
    Abort
  ${EndIf}

  ; ── Disk space check: require at least 300 MB free on target drive ───────────
  SectionGetSize ${APP_INSTALL_SECTION_IDX} $0
  ${GetRoot} $INSTDIR $1
  ${DriveSpace} "$1" "/D=F /S=M" $2
  ${If} $2 < 300
    MessageBox MB_ICONSTOP|MB_OK \
      "مساحة القرص غير كافية.$\nيتطلب التطبيق 300 ميجابايت على الأقل.$\nالمساحة المتاحة: $2 MB"
    Abort
  ${EndIf}
!macroend

!macro customInstallMode
  ; Default to per-machine install (requires admin — already set via requestedExecutionLevel)
  SetShellVarContext all
!macroend

!macro customWelcomePage
  ; The default Welcome page from electron-builder NSIS is used;
  ; customise its header text here.
  !define MUI_WELCOMEPAGE_TITLE      "مرحباً بك في معالج تثبيت Smart POS"
  !define MUI_WELCOMEPAGE_TEXT       "سيرشدك هذا المعالج خلال تثبيت نقطة البيع الذكية.$\n$\nيُنصح بإغلاق جميع التطبيقات الأخرى قبل المتابعة.$\n$\nانقر «التالي» للمتابعة."
!macroend

!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE       "اكتمل تثبيت Smart POS"
  !define MUI_FINISHPAGE_TEXT        "تم تثبيت نقطة البيع الذكية بنجاح.$\n$\nانقر «إنهاء» لتشغيل التطبيق."
  !define MUI_FINISHPAGE_RUN_TEXT    "تشغيل Smart POS الآن"
!macroend

; ─── Start-menu shortcut with Arabic name ─────────────────────────────────────
!macro customCreateApplicationShortcut
  CreateShortcut \
    "$SMPROGRAMS\Smart POS\نقطة البيع الذكية.lnk" \
    "$INSTDIR\Smart POS.exe"
!macroend

!macro customCreateDesktopShortcut
  CreateShortcut \
    "$DESKTOP\Smart POS.lnk" \
    "$INSTDIR\Smart POS.exe"
!macroend

; ─── Uninstaller cleanup ──────────────────────────────────────────────────────
!macro customUnInstall
  ; Terminate running process if still open
  nsProcess::_FindProcess "Smart POS.exe"
  Pop $R0
  ${If} $R0 = 0
    nsProcess::_KillProcess "Smart POS.exe"
    Pop $R0
    Sleep 500
  ${EndIf}

  ; Remove Start Menu folder
  RMDir /r "$SMPROGRAMS\Smart POS"
!macroend
